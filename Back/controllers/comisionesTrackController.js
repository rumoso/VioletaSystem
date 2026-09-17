const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { TIPO_ROL } = require('../helpers/constantes');

// Bitácora de comisiones por empleado (analisis/008). Append-only,
// mismo patrón que metal_inventario_track: cada renglón es una
// comisión (o una deducción en negativo), nunca se edita — solo se
// cancela o se compensa con un renglón nuevo. Reemplaza al módulo
// `comisiones` de solo ventas como fuente para la nómina. Queries
// directas sobre `dbConnection` compartida — nunca createConexion();
// multi-statement siempre con `dbConnection.transaction()`.

// Resumen por empleado: total PENDIENTE (sin cobrar) dentro del rango
// de fechas, un renglón por empleado con al menos un movimiento en el
// rango. El detalle/tracking se consulta aparte (getComisionesTrackList
// filtrado por idUser).
const getComisionesResumen = async(req, res = response) => {

    const {
        startDate = ''
        , endDate = ''
        , pageSize = 10
        , pageIndex = 0
    } = req.body;

    try{

        const sStart = startDate ? startDate.substring(0, 10) : null;
        const sEnd = endDate ? endDate.substring(0, 10) : null;
        const iLimit = Number(pageSize);
        const iOffset = Number(pageIndex) * iLimit;

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(DISTINCT C.idUser) AS iRows
             FROM comisiones_track AS C
             WHERE C.estatus <> 'CANCELADA'
             AND ( :startDate IS NULL OR C.fecha >= :startDate )
             AND ( :endDate IS NULL OR C.fecha <= :endDate )`,
            { replacements: { startDate: sStart, endDate: sEnd }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                C.idUser,
                U.name AS nombreEmpleado,
                SUM( CASE WHEN C.estatus = 'PENDIENTE' THEN C.monto ELSE 0 END ) AS totalPendiente,
                SUM( CASE WHEN C.estatus = 'PENDIENTE' THEN 1 ELSE 0 END ) AS iPendientes,
                COUNT(*) AS iMovimientos
             FROM comisiones_track AS C
             INNER JOIN users AS U ON U.idUser = C.idUser
             WHERE C.estatus <> 'CANCELADA'
             AND ( :startDate IS NULL OR C.fecha >= :startDate )
             AND ( :endDate IS NULL OR C.fecha <= :endDate )
             GROUP BY C.idUser, U.name
             ORDER BY totalPendiente DESC, U.name ASC
             LIMIT :offset, :limit`,
            { replacements: { startDate: sStart, endDate: sEnd, offset: iOffset, limit: iLimit }, type: dbConnection.QueryTypes.SELECT }
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
        , auth_idUser = 0

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        // Acción especial (nSpecial): exige el idUser del autorizador que
        // el Front obtiene con ActionAuthorizationComponent (código o
        // rostro) al momento de la acción — igual que cancelar ventas.
        if (auth_idUser == 0) {
            return res.json({ status: 1, message: "No se pudo registrar la comisión porque no fue autorizada la acción." });
        }

        if (Number(monto) === 0) {
            return res.json({ status: 1, message: "El monto no puede ser cero." });
        }

        // Quién autorizó se guarda con NOMBRE y usuario, no con el id:
        // la bitácora la lee gente, y un "idUser 3" obliga a ir a buscar
        // a quién corresponde. Se resuelve al insertar y queda congelado
        // en el renglón — es un registro de auditoría de lo que pasó en
        // ese momento, no una referencia viva.
        const [autorizador] = await dbConnection.query(
            `SELECT name, userName FROM users WHERE idUser = :auth_idUser LIMIT 1`,
            { replacements: { auth_idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        const sAutorizo = autorizador
            ? `${ autorizador.name }${ autorizador.userName ? ` (${ autorizador.userName })` : '' }`
            : `idUser ${ auth_idUser }`;

        // porcentajeAplicado y montoBase quedan NULL: en una captura
        // manual el monto se decide directo, no sale de aplicar un % a
        // una base.
        await dbConnection.query(
            `INSERT INTO comisiones_track
                (idUser, tipo, concepto, monto, fecha, referencia, auth_idUser, estatus, createDate, idCreateUser)
             VALUES
                (:idUser, :tipo, :concepto, :monto, :fecha, :referencia, :auth_idUser, 'PENDIENTE', :createDate, :idCreateUser)`,
            { replacements: { idUser, tipo, concepto, monto, fecha: fecha.substring(0, 10), referencia: `Captura manual — autorizó: ${ sAutorizo }`, auth_idUser, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT }
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
        , auth_idUser = 0

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        // Acción especial (nSpecial): exige autorización al momento
        if (auth_idUser == 0) {
            return res.json({ status: 1, message: "No se pudo cancelar la comisión porque no fue autorizada la acción." });
        }

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

    // GARANTÍAS (analisis/016): una garantía NO paga comisión — el
    // taller original ya la pagó una vez, y la garantía es
    // responsabilidad de la casa, no un servicio nuevo.
    //
    // La excepción vive AQUÍ y no en el `if (idTallerStatus === 4)` que
    // llama a esta función: así cualquier ruta futura que dispare
    // destajo la hereda sin tener que acordarse de repetirla. Es una
    // consulta más, pero de una sola fila por índice primario.
    //
    // Ojo: esto NO exime a la garantía de descontar el metal final del
    // inventario del técnico — eso sigue pasando en el caller. No pagar
    // comisión no vuelve gratis el material.
    const [oFolio] = await dbConnection.query(
        `SELECT idTallerOrigen FROM taller WHERE idTaller = :idTaller LIMIT 1`,
        { replacements: { idTaller }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (oFolio && oFolio.idTallerOrigen) {
        return;
    }

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

        // % destajo del técnico: users.destajo (analisis/018).
        const [tecnico] = await dbConnection.query(
            `SELECT destajo AS destajoPorcentaje FROM users WHERE idUser = :idUser LIMIT 1`,
            { replacements: { idUser: fila.idUserTecnico }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        const destajoPorcentaje = parseFloat(tecnico?.destajoPorcentaje) || 0;

        if (destajoPorcentaje <= 0) {
            continue;
        }

        const monto = Math.round(totalManoObra * destajoPorcentaje / 100 * 100) / 100;

        await dbConnection.query(
            `INSERT INTO comisiones_track
                (idUser, tipo, concepto, monto, fecha, idTaller, referencia, montoBase, porcentajeAplicado, estatus, createDate, idCreateUser)
             VALUES
                (:idUser, 'DESTAJO', :concepto, :monto, :fecha, :idTaller, :referencia, :montoBase, :porcentajeAplicado, 'PENDIENTE', :createDate, :idCreateUser)`,
            {
                replacements: {
                    idUser: fila.idUserTecnico,
                    concepto: `Destajo taller #${ idTaller }`,
                    monto,
                    fecha: oGetDateNow.substring(0, 10),
                    idTaller,
                    referencia: `Mano de obra $${ totalManoObra } x ${ destajoPorcentaje }%`,
                    montoBase: totalManoObra,
                    porcentajeAplicado: destajoPorcentaje,
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
const fn_reversarComisionByOrigen = async(idSale, idUserLogON, referenciaCancelacion, transaction = null) => {

    const renglones = await dbConnection.query(
        `SELECT idComisionTrack, idUser, tipo, monto, estatus, montoBase, porcentajeAplicado, idSale, idTaller FROM comisiones_track
         WHERE idSale = :idSale AND tipo = 'VENTA' AND estatus IN ('PENDIENTE', 'INCLUIDA_EN_NOMINA')`,
        { replacements: { idSale }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    await _fn_reversarRenglonesComision(renglones, `Devolución venta #${ idSale } (comisión ya pagada)`, referenciaCancelacion, idUserLogON, transaction);

};

// Reversa del destajo de un taller cancelado (analisis/022). Mismo
// criterio que la de venta, pero corre DENTRO de la transacción de la
// cancelación del taller: o se cancela todo, o nada.
const fn_reversarDestajoByTaller = async(idTaller, idUserLogON, referenciaCancelacion, transaction) => {

    const renglones = await dbConnection.query(
        `SELECT CT.idComisionTrack, CT.idUser, CT.tipo, CT.monto, CT.estatus, CT.montoBase, CT.porcentajeAplicado, CT.idSale, CT.idTaller
         FROM comisiones_track AS CT
         WHERE CT.idTaller = :idTaller AND CT.tipo = 'DESTAJO' AND CT.estatus IN ('PENDIENTE', 'INCLUIDA_EN_NOMINA')
           AND CT.monto > 0
           AND NOT EXISTS ( SELECT 1 FROM comisiones_track AS R WHERE R.idComisionTrackOrigen = CT.idComisionTrack )`,
        { replacements: { idTaller }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    await _fn_reversarRenglonesComision(renglones, `Devolución destajo taller #${ idTaller } (ya pagado)`, referenciaCancelacion, idUserLogON, transaction);

};

// Si el renglón sigue PENDIENTE, se cancela directo (el dinero nunca
// salió). Si ya está INCLUIDA_EN_NOMINA, se genera un renglón NUEVO en
// negativo referido al original — nunca se toca la nómina ya pagada.
const _fn_reversarRenglonesComision = async(renglones, conceptoReversa, referenciaCancelacion, idUserLogON, transaction) => {

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    for (const r of renglones) {

        if (r.estatus === 'PENDIENTE') {

            await dbConnection.query(
                `UPDATE comisiones_track
                 SET estatus = 'CANCELADA', motivoCancelacion = :motivo, cancelDate = :cancelDate, idCancelUser = :idCancelUser
                 WHERE idComisionTrack = :id`,
                { replacements: { motivo: referenciaCancelacion, cancelDate: oGetDateNow, idCancelUser: idUserLogON, id: r.idComisionTrack }, type: dbConnection.QueryTypes.UPDATE, transaction }
            );

        } else {

            // La reversa hereda la trazabilidad del origen: mismo % y la
            // misma base pero en negativo, para que al sumar el origen y
            // su reversa las bases también se cancelen.
            await dbConnection.query(
                `INSERT INTO comisiones_track
                    (idUser, tipo, concepto, monto, fecha, idSale, idTaller, referencia, montoBase, porcentajeAplicado, estatus, idComisionTrackOrigen, createDate, idCreateUser)
                 VALUES
                    (:idUser, :tipo, :concepto, :monto, :fecha, :idSale, :idTaller, :referencia, :montoBase, :porcentajeAplicado, 'PENDIENTE', :idOrigen, :createDate, :idCreateUser)`,
                {
                    replacements: {
                        idUser: r.idUser,
                        tipo: r.tipo,
                        concepto: conceptoReversa,
                        monto: -Math.abs(r.monto),
                        fecha: oGetDateNow.substring(0, 10),
                        idSale: r.idSale ?? null,
                        idTaller: r.idTaller ?? null,
                        referencia: referenciaCancelacion,
                        montoBase: r.montoBase === null || r.montoBase === undefined ? null : -Math.abs(Number(r.montoBase)),
                        porcentajeAplicado: r.porcentajeAplicado ?? null,
                        idOrigen: r.idComisionTrack,
                        createDate: oGetDateNow,
                        idCreateUser: idUserLogON
                    },
                    transaction
                }
            );

        }
    }

};

// Comisión de venta AUTOMÁTICA sobre la utilidad (analisis/010): se
// llama después de cada pago (insertPayments) y después de entregar
// un apartado (entregarApartado) — cualquiera de los dos eventos
// puede ser el que finalmente cumpla la regla, así que ambos disparan
// la misma verificación. Reglas:
//   - Contado/Crédito (idSaleType 1/2): se genera en cuanto la venta
//     queda pagada al 100%.
//   - Apartado (idSaleType 3): se genera solo cuando está pagada al
//     100% Y entregada (fechaEntrega) — lo que pase después dispara.
// Utilidad = importe vendido - costo (SUM(SD.importe) - SUM(SD.cost *
// SD.cantidad) de las líneas activas), mismo criterio que ya usa el
// reporte de utilidades (rep_getUtilidades). Comisión = utilidad x
// vendedores.comisionPorcentaje. Anti-duplicado: un renglón VENTA no
// cancelado ya existente para ese idSale detiene la generación — así
// no importa cuántas veces se dispare el evento (pagos parciales
// múltiples, reintentos), solo se genera una vez.
// No corre dentro de la transacción del pago/entrega — se llama
// después de confirmado (mismo criterio que fn_reversarComisionByOrigen):
// si falla, no debe tumbar el pago/entrega que ya se guardó.
const fn_registrarComisionVentaSiPagada = async(idSale, idUserLogON) => {

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    const [sale] = await dbConnection.query(
        `SELECT idSaleType, idSeller_idUser, fechaEntrega, active FROM sales WHERE idSale = :idSale LIMIT 1`,
        { replacements: { idSale }, type: dbConnection.QueryTypes.SELECT }
    );

    if (!sale || !sale.active || ![1, 2, 3].includes(sale.idSaleType)) {
        return;
    }

    if (sale.idSaleType === 3 && !sale.fechaEntrega) {
        return;
    }

    const [yaGenerado] = await dbConnection.query(
        `SELECT 1 AS ok FROM comisiones_track
         WHERE idSale = :idSale AND tipo = 'VENTA' AND estatus <> 'CANCELADA'
         LIMIT 1`,
        { replacements: { idSale }, type: dbConnection.QueryTypes.SELECT }
    );

    if (yaGenerado) {
        return;
    }

    const [totales] = await dbConnection.query(
        `SELECT
            ROUND(IFNULL(SUM(SD.importe), 0), 2) AS total,
            ROUND(IFNULL(SUM(SD.cost * SD.cantidad), 0), 2) AS costoTotal
         FROM salesdetail AS SD WHERE SD.idSale = :idSale AND SD.active = 1`,
        { replacements: { idSale }, type: dbConnection.QueryTypes.SELECT }
    );

    const total = parseFloat(totales.total) || 0;

    if (total <= 0) {
        return;
    }

    const [abonadoRow] = await dbConnection.query(
        `SELECT ROUND(IFNULL(SUM(pago), 0), 2) AS abonado FROM payments
         WHERE idRelation = :idSale AND active = 1 AND relationType IN ('V', 'A')`,
        { replacements: { idSale }, type: dbConnection.QueryTypes.SELECT }
    );

    const abonado = parseFloat(abonadoRow.abonado) || 0;

    // Tolerancia de un centavo por redondeos de precio/descuento
    if (abonado + 0.01 < total) {
        return;
    }

    // % comisión del vendedor: users.comision, solo si sigue activo y con
    // un puesto activo de tipo VENDEDOR (analisis/018).
    const [vendedor] = await dbConnection.query(
        `SELECT U.comision AS comisionPorcentaje
         FROM users AS U
         WHERE U.idUser = :idUser AND U.active = 1
           AND EXISTS (
               SELECT 1 FROM rolesconfig AS RC INNER JOIN roles AS R ON R.idRol = RC.idRol
               WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = :idTipoVendedor
           )
         LIMIT 1`,
        { replacements: { idUser: sale.idSeller_idUser, idTipoVendedor: TIPO_ROL.VENDEDOR }, type: dbConnection.QueryTypes.SELECT }
    );

    const comisionPorcentaje = parseFloat(vendedor?.comisionPorcentaje) || 0;

    if (comisionPorcentaje <= 0) {
        return;
    }

    const costoTotal = parseFloat(totales.costoTotal) || 0;
    const utilidad = total - costoTotal;

    if (utilidad <= 0) {
        return;
    }

    const monto = Math.round(utilidad * comisionPorcentaje / 100 * 100) / 100;

    if (monto <= 0) {
        return;
    }

    await dbConnection.query(
        `INSERT INTO comisiones_track
            (idUser, tipo, concepto, monto, fecha, idSale, referencia, montoBase, porcentajeAplicado, estatus, createDate, idCreateUser)
         VALUES
            (:idUser, 'VENTA', :concepto, :monto, :fecha, :idSale, :referencia, :montoBase, :porcentajeAplicado, 'PENDIENTE', :createDate, :idCreateUser)`,
        {
            replacements: {
                idUser: sale.idSeller_idUser,
                concepto: `Venta #${ idSale }`,
                monto,
                fecha: oGetDateNow.substring(0, 10),
                idSale,
                referencia: `Utilidad $${ utilidad.toFixed(2) } x ${ comisionPorcentaje }%`,
                montoBase: utilidad,
                porcentajeAplicado: comisionPorcentaje,
                createDate: oGetDateNow,
                idCreateUser: idUserLogON
            }
        }
    );

};

module.exports = {
    getComisionesResumen
    , getComisionesTrackList
    , insertComisionManual
    , cancelarComisionTrack
    , generarComisionesVenta
    , fn_registrarDestajoByTaller
    , fn_reversarComisionByOrigen
    , fn_reversarDestajoByTaller
    , fn_registrarComisionVentaSiPagada
}
