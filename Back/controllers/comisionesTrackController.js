const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// Bitácora de comisiones por empleado (analisis/008). Append-only,
// mismo patrón que metal_inventario_track: cada renglón es una
// comisión (o una deducción en negativo), nunca se edita — solo se
// cancela o se compensa con un renglón nuevo. Reemplaza al módulo
// `comisiones` de solo ventas como fuente para la nómina. Queries
// directas sobre `dbConnection` compartida — nunca createConexion();
// multi-statement siempre con `dbConnection.transaction()`.

const getComisionesTrackList = async(req, res = response) => {

    const {
        idUser = 0
        , tipo = ''
        , estatus = ''
        , startDate = ''
        , endDate = ''
        , pageSize = 10
        , pageIndex = 0
    } = req.body;

    try{

        // NULL en vez de '' para las fechas: MySQL rechaza comparar una
        // columna DATE contra '' (error "Incorrect DATE value") aunque
        // esté detrás de un OR — con NULL la comparación simplemente da
        // NULL/false y el OR jala del lado de "sin filtro" sin tronar.
        const sStart = startDate ? startDate.substring(0, 10) : null;
        const sEnd = endDate ? endDate.substring(0, 10) : null;
        const iLimit = Number(pageSize);
        const iOffset = Number(pageIndex) * iLimit;

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM comisiones_track AS C
             WHERE ( :idUser = 0 OR C.idUser = :idUser )
             AND ( :tipo = '' OR C.tipo = :tipo )
             AND ( :estatus = '' OR C.estatus = :estatus )
             AND ( :startDate IS NULL OR C.fecha >= :startDate )
             AND ( :endDate IS NULL OR C.fecha <= :endDate )`,
            { replacements: { idUser, tipo, estatus, startDate: sStart, endDate: sEnd }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                C.idComisionTrack AS id,
                C.idUser,
                U.name AS nombreEmpleado,
                C.tipo,
                C.concepto,
                C.monto,
                C.fecha,
                DATE_FORMAT( C.fecha, '%d-%m-%Y' ) AS fechaDesc,
                C.idTaller,
                C.idSale,
                C.referencia,
                C.estatus,
                C.idNomina,
                C.motivoCancelacion
             FROM comisiones_track AS C
             INNER JOIN users AS U ON U.idUser = C.idUser
             WHERE ( :idUser = 0 OR C.idUser = :idUser )
             AND ( :tipo = '' OR C.tipo = :tipo )
             AND ( :estatus = '' OR C.estatus = :estatus )
             AND ( :startDate IS NULL OR C.fecha >= :startDate )
             AND ( :endDate IS NULL OR C.fecha <= :endDate )
             ORDER BY C.fecha DESC, C.idComisionTrack DESC
             LIMIT :offset, :limit`,
            { replacements: { idUser, tipo, estatus, startDate: sStart, endDate: sEnd, offset: iOffset, limit: iLimit }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                count: countRow.iRows,
                rows
            }
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const insertComisionManual = async(req, res = response) => {

    const {
        idUser
        , tipo = 'MANUAL'
        , concepto
        , monto
        , fecha

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if (Number(monto) === 0) {
            return res.json({ status: 1, message: "El monto no puede ser cero." });
        }

        await dbConnection.query(
            `INSERT INTO comisiones_track
                (idUser, tipo, concepto, monto, fecha, referencia, estatus, createDate, idCreateUser)
             VALUES
                (:idUser, :tipo, :concepto, :monto, :fecha, 'Captura manual', 'PENDIENTE', :createDate, :idCreateUser)`,
            { replacements: { idUser, tipo, concepto, monto, fecha: fecha.substring(0, 10), createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT }
        );

        res.json({
            status: 0,
            message: "Comisión registrada con éxito."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const cancelarComisionTrack = async(req, res = response) => {

    const {
        id
        , motivo

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if (!motivo || !motivo.trim()) {
            return res.json({ status: 1, message: "El motivo es obligatorio." });
        }

        const row = await dbConnection.query(
            `SELECT estatus FROM comisiones_track WHERE idComisionTrack = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El renglón no existe." });
        }
        if (row[0].estatus !== 'PENDIENTE') {
            return res.json({
                status: 1,
                message: row[0].estatus === 'INCLUIDA_EN_NOMINA'
                    ? "No se puede cancelar: ya está incluida en una nómina. Cancela la nómina para liberarla primero."
                    : "El renglón ya está cancelado."
            });
        }

        await dbConnection.query(
            `UPDATE comisiones_track
             SET estatus = 'CANCELADA', motivoCancelacion = :motivo, cancelDate = :cancelDate, idCancelUser = :idCancelUser
             WHERE idComisionTrack = :id`,
            { replacements: { motivo, cancelDate: oGetDateNow, idCancelUser: idUserLogON, id }, type: dbConnection.QueryTypes.UPDATE }
        );

        res.json({
            status: 0,
            message: "Comisión cancelada con éxito."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// --------------------------------------------------------------
// Helpers internos (no son endpoints): otros controllers los llaman
// dentro de SU MISMA transacción para que la comisión y su evento de
// negocio de origen sean atómicos — o pasan juntos, o no pasa ninguno.
// --------------------------------------------------------------

// Destajo de taller: se llama cuando el taller llega a status 4
// (Finalizado/Mostrador), mismo punto donde ya se descuenta el metal
// final del técnico. Un renglón por cada técnico con mano de obra en
// el folio y % de destajo > 0. Anti-duplicado: si ese taller+técnico
// ya generó un renglón DESTAJO no cancelado, no se repite.
const fn_registrarDestajoByTaller = async(idTaller, oGetDateNow, idUserLogON, transaction) => {

    const manoObraPorTecnico = await dbConnection.query(
        `SELECT idUserTecnico, SUM(precio) AS totalManoObra
         FROM taller_mano_obra
         WHERE idTaller = :idTaller
         GROUP BY idUserTecnico`,
        { replacements: { idTaller }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    for (const fila of manoObraPorTecnico) {

        const totalManoObra = parseFloat(fila.totalManoObra) || 0;

        if (totalManoObra <= 0) {
            continue;
        }

        const [yaGenerado] = await dbConnection.query(
            `SELECT 1 AS ok FROM comisiones_track
             WHERE idTaller = :idTaller AND idUser = :idUser AND tipo = 'DESTAJO' AND estatus <> 'CANCELADA'
             LIMIT 1`,
            { replacements: { idTaller, idUser: fila.idUserTecnico }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (yaGenerado) {
            continue;
        }

        const [tecnico] = await dbConnection.query(
            `SELECT destajoPorcentaje FROM tecnicos WHERE idUser = :idUser LIMIT 1`,
            { replacements: { idUser: fila.idUserTecnico }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        const destajoPorcentaje = parseFloat(tecnico?.destajoPorcentaje) || 0;

        if (destajoPorcentaje <= 0) {
            continue;
        }

        const monto = Math.round(totalManoObra * destajoPorcentaje / 100 * 100) / 100;

        await dbConnection.query(
            `INSERT INTO comisiones_track
                (idUser, tipo, concepto, monto, fecha, idTaller, referencia, estatus, createDate, idCreateUser)
             VALUES
                (:idUser, 'DESTAJO', :concepto, :monto, :fecha, :idTaller, :referencia, 'PENDIENTE', :createDate, :idCreateUser)`,
            {
                replacements: {
                    idUser: fila.idUserTecnico,
                    concepto: `Destajo taller #${ idTaller }`,
                    monto,
                    fecha: oGetDateNow.substring(0, 10),
                    idTaller,
                    referencia: `Mano de obra $${ totalManoObra } x ${ destajoPorcentaje }%`,
                    createDate: oGetDateNow,
                    idCreateUser: idUserLogON
                },
                transaction
            }
        );
    }

};

// Comisión de venta: acción manual por rango de fechas + vendedor,
// igual UX que el módulo `comisiones` viejo (ahí también era una
// generación explícita, no automática por cada pago). Reutiliza el
// mismo SP `comis_getPendingPayments` y el mismo cálculo del módulo
// viejo (preserva la fórmula) — internamente sigue alimentando las
// tablas legacy `comisiones`/`comisionesDetail`/`comisionesPagosDetail`
// porque `comis_getPendingPayments` usa esas tablas para saber qué
// pagos ya se comisionaron y evitar duplicar; además de eso, refleja
// el resultado en `comisiones_track`, que es la fuente que consume la
// nómina y la pantalla nueva.
const generarComisionesVenta = async(req, res = response) => {

    const {
        startDate = ''
        , endDate = ''
        , idSeller_idUser

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try{

        const pendientes = await dbConnection.query(
            `call comis_getPendingPayments('${ startDate.substring(0, 10) }', '${ endDate.substring(0, 10) }', ${ idSeller_idUser })`,
            { transaction }
        );

        const ventasAgrupadas = Object.values(pendientes.reduce((acc, payment) => {
            const idSale = payment.idSale;
            if (!acc[idSale]) {
                acc[idSale] = { idSale, costoTotal: payment.costoTotal, pagos: [] };
            }
            acc[idSale].pagos.push({ idPayment: payment.idPayment, pago: payment.pago, abonadoHist: payment.abonadoHist, bRange: payment.bRange });
            return acc;
        }, {}));

        if (ventasAgrupadas.length === 0) {
            await transaction.rollback();
            return res.json({ status: 1, message: "No hay comisiones de venta pendientes en ese rango." });
        }

        const [insertComisionesResult] = await dbConnection.query(
            `call insertComisiones('${ oGetDateNow }', ${ idSeller_idUser }, ${ idUserLogON }, ${ idSucursalLogON })`,
            { transaction }
        );
        const idComision = insertComisionesResult.out_id;

        let iGenerados = 0;

        for (const oSale of ventasAgrupadas) {

            let fComision = 0;
            let AComision = 0;
            let pAcomulados = 0;
            const idsPayments = [];

            for (const oPayment of oSale.pagos) {
                if (oPayment.bRange == 1) {
                    fComision = oPayment.abonadoHist + pAcomulados - oSale.costoTotal + oPayment.pago;
                    AComision += fComision < 0 ? 0 : ( fComision < oPayment.pago ? fComision : oPayment.pago );
                    pAcomulados += oPayment.pago;
                    idsPayments.push(oPayment.idPayment);
                }
            }

            if (AComision <= 0) {
                continue;
            }

            const [detailResult] = await dbConnection.query(
                `call insertComisionesDetail(${ idSeller_idUser }, '${ idComision }', '${ oSale.idSale }', '', '${ AComision }', ${ idUserLogON }, ${ idSucursalLogON })`,
                { transaction }
            );
            const idComisionDetail = detailResult.out_id;

            for (const idPayment of idsPayments) {
                await dbConnection.query(
                    `call insertComisionesPagosDetail('${ idComisionDetail }', '${ idPayment }', ${ idUserLogON }, ${ idSucursalLogON })`,
                    { transaction }
                );
            }

            await dbConnection.query(
                `INSERT INTO comisiones_track
                    (idUser, tipo, concepto, monto, fecha, idSale, referencia, estatus, createDate, idCreateUser)
                 VALUES
                    (:idUser, 'VENTA', :concepto, :monto, :fecha, :idSale, :referencia, 'PENDIENTE', :createDate, :idCreateUser)`,
                {
                    replacements: {
                        idUser: idSeller_idUser,
                        concepto: `Venta #${ oSale.idSale }`,
                        monto: AComision,
                        fecha: oGetDateNow.substring(0, 10),
                        idSale: oSale.idSale,
                        referencia: `Comisión #${ idComision } / detalle #${ idComisionDetail }`,
                        createDate: oGetDateNow,
                        idCreateUser: idUserLogON
                    },
                    transaction
                }
            );

            iGenerados++;
        }

        await transaction.commit();

        res.json({
            status: iGenerados > 0 ? 0 : 1,
            message: iGenerados > 0 ? `Se generaron ${ iGenerados } comisión(es) de venta.` : "No hubo comisión que generar en ese rango (montos en cero)."
        });

    }catch(error){

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Reversa por cancelación del origen (venta). Se llama DESPUÉS de que
// la cancelación de la venta ya se confirmó (la SP de cancelación de
// venta no expone una transacción JS para anidar). Si el renglón sigue
// PENDIENTE, se cancela directo (el dinero nunca salió). Si ya está
// INCLUIDA_EN_NOMINA (ya se pagó), se genera un renglón NUEVO en
// negativo referido al original — nunca se toca la nómina ya pagada.
const fn_reversarComisionByOrigen = async(idSale, idUserLogON, referenciaCancelacion) => {

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    const renglones = await dbConnection.query(
        `SELECT idComisionTrack, idUser, monto, estatus FROM comisiones_track
         WHERE idSale = :idSale AND tipo = 'VENTA' AND estatus IN ('PENDIENTE', 'INCLUIDA_EN_NOMINA')`,
        { replacements: { idSale }, type: dbConnection.QueryTypes.SELECT }
    );

    for (const r of renglones) {

        if (r.estatus === 'PENDIENTE') {

            await dbConnection.query(
                `UPDATE comisiones_track
                 SET estatus = 'CANCELADA', motivoCancelacion = :motivo, cancelDate = :cancelDate, idCancelUser = :idCancelUser
                 WHERE idComisionTrack = :id`,
                { replacements: { motivo: referenciaCancelacion, cancelDate: oGetDateNow, idCancelUser: idUserLogON, id: r.idComisionTrack }, type: dbConnection.QueryTypes.UPDATE }
            );

        } else {

            await dbConnection.query(
                `INSERT INTO comisiones_track
                    (idUser, tipo, concepto, monto, fecha, idSale, referencia, estatus, idComisionTrackOrigen, createDate, idCreateUser)
                 VALUES
                    (:idUser, 'VENTA', :concepto, :monto, :fecha, :idSale, :referencia, 'PENDIENTE', :idOrigen, :createDate, :idCreateUser)`,
                {
                    replacements: {
                        idUser: r.idUser,
                        concepto: `Devolución venta #${ idSale } (comisión ya pagada)`,
                        monto: -Math.abs(r.monto),
                        fecha: oGetDateNow.substring(0, 10),
                        idSale,
                        referencia: referenciaCancelacion,
                        idOrigen: r.idComisionTrack,
                        createDate: oGetDateNow,
                        idCreateUser: idUserLogON
                    }
                }
            );

        }
    }

};

module.exports = {
    getComisionesTrackList
    , insertComisionManual
    , cancelarComisionTrack
    , generarComisionesVenta
    , fn_registrarDestajoByTaller
    , fn_reversarComisionByOrigen
}
