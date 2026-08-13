const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// Pago de nómina (analisis/007-pago-nomina.md). Registro histórico en
// tres niveles (nomina, nomina_recibos, nomina_recibo_detalle) como
// COPIA CONGELADA — no referencian en vivo el listado base ni el
// catálogo de conceptos. Queries directas sobre `dbConnection`
// compartida — nunca createConexion(); toda operación multi-statement
// va con `dbConnection.transaction()` y COMMIT/ROLLBACK estricto.

// Totales de un recibo a partir de sus líneas de detalle. "Comisiones"
// es la única línea cuyo monto puede venir en negativo (bEsComisiones);
// en ese caso se suma tal cual al neto aunque esté tipada PERCEPCION.
// Para las demás líneas, el monto siempre es positivo y el signo lo
// da el tipo (PERCEPCION suma, DEDUCCION resta).
const _fn_calcularTotales = (rows) => {

    let totalPercepciones = 0;
    let totalDeducciones = 0;

    for (const r of rows) {
        const monto = parseFloat(r.monto) || 0;

        if (r.bEsComisiones) {
            if (monto >= 0) {
                totalPercepciones += monto;
            } else {
                totalDeducciones += Math.abs(monto);
            }
        } else if (r.tipo === 'PERCEPCION') {
            totalPercepciones += monto;
        } else {
            totalDeducciones += monto;
        }
    }

    totalPercepciones = Math.round(totalPercepciones * 100) / 100;
    totalDeducciones = Math.round(totalDeducciones * 100) / 100;

    return {
        totalPercepciones,
        totalDeducciones,
        neto: Math.round((totalPercepciones - totalDeducciones) * 100) / 100
    };
};

const _fn_recalcularRecibo = async(idNominaRecibo, transaction) => {

    const rows = await dbConnection.query(
        `SELECT tipo, monto, bEsComisiones FROM nomina_recibo_detalle WHERE idNominaRecibo = :idNominaRecibo`,
        { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    const totales = _fn_calcularTotales(rows);

    await dbConnection.query(
        `UPDATE nomina_recibos
         SET totalPercepciones = :totalPercepciones, totalDeducciones = :totalDeducciones, neto = :neto
         WHERE idNominaRecibo = :idNominaRecibo`,
        { replacements: { ...totales, idNominaRecibo }, type: dbConnection.QueryTypes.UPDATE, transaction }
    );

    return totales;
};

const _fn_recalcularNomina = async(idNomina, transaction) => {

    const [totales] = await dbConnection.query(
        `SELECT
            IFNULL(SUM(totalPercepciones), 0) AS totalPercepciones,
            IFNULL(SUM(totalDeducciones), 0) AS totalDeducciones,
            IFNULL(SUM(neto), 0) AS totalNeto
         FROM nomina_recibos WHERE idNomina = :idNomina`,
        { replacements: { idNomina }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    await dbConnection.query(
        `UPDATE nomina
         SET totalPercepciones = :totalPercepciones, totalDeducciones = :totalDeducciones, totalNeto = :totalNeto
         WHERE idNomina = :idNomina`,
        { replacements: { totalPercepciones: totales.totalPercepciones, totalDeducciones: totales.totalDeducciones, totalNeto: totales.totalNeto, idNomina }, type: dbConnection.QueryTypes.UPDATE, transaction }
    );
};

const _fn_validarBorrador = async(idNomina, transaction) => {

    const [row] = await dbConnection.query(
        `SELECT estatus FROM nomina WHERE idNomina = :idNomina LIMIT 1`,
        { replacements: { idNomina }, type: dbConnection.QueryTypes.SELECT, transaction }
    );

    if (!row) {
        return 'La nómina no existe.';
    }
    if (row.estatus !== 'BORRADOR') {
        return 'La nómina ya no está en borrador — no se puede editar.';
    }
    return null;
};

// --------------------------------------------------------------

const generarNomina = async(req, res = response) => {

    const {
        tipoPeriodo
        , fechaInicio
        , fechaFin
        , idsEmpleados = []

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const sFechaInicio = fechaInicio.substring(0, 10);
    const sFechaFin = fechaFin.substring(0, 10);

    const transaction = await dbConnection.transaction();

    try{

        await dbConnection.query(
            `INSERT INTO nomina (tipoPeriodo, fechaInicio, fechaFin, estatus, createDate, idCreateUser)
             VALUES (:tipoPeriodo, :fechaInicio, :fechaFin, 'BORRADOR', :createDate, :idCreateUser)`,
            { replacements: { tipoPeriodo, fechaInicio: sFechaInicio, fechaFin: sFechaFin, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT, transaction }
        );

        const [idResult] = await dbConnection.query(`SELECT LAST_INSERT_ID() AS id`, { type: dbConnection.QueryTypes.SELECT, transaction });
        const idNomina = idResult.id;

        // Sin empleados elegidos = todos los activos (comportamiento
        // default, ya avisado en el Front antes de generar). Con
        // empleados elegidos, la corrida se limita a esos.
        const bFiltrarEmpleados = Array.isArray(idsEmpleados) && idsEmpleados.length > 0;

        const empleados = await dbConnection.query(
            bFiltrarEmpleados
                ? `SELECT idEmpleado, idUser, nombre FROM empleados WHERE active = 1 AND idEmpleado IN (:idsEmpleados)`
                : `SELECT idEmpleado, idUser, nombre FROM empleados WHERE active = 1`,
            { replacements: bFiltrarEmpleados ? { idsEmpleados } : {}, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        for (const emp of empleados) {

            await dbConnection.query(
                `INSERT INTO nomina_recibos (idNomina, idEmpleado, idUser, nombreEmpleado, createDate, idCreateUser)
                 VALUES (:idNomina, :idEmpleado, :idUser, :nombreEmpleado, :createDate, :idCreateUser)`,
                { replacements: { idNomina, idEmpleado: emp.idEmpleado, idUser: emp.idUser, nombreEmpleado: emp.nombre, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT, transaction }
            );

            const [idReciboResult] = await dbConnection.query(`SELECT LAST_INSERT_ID() AS id`, { type: dbConnection.QueryTypes.SELECT, transaction });
            const idNominaRecibo = idReciboResult.id;

            // Copia congelada del listado base — un solo INSERT...SELECT, sin loop de conceptos
            await dbConnection.query(
                `INSERT INTO nomina_recibo_detalle (idNominaRecibo, idNominaConcepto, conceptoDesc, tipo, monto, bEsComisiones, createDate, idCreateUser)
                 SELECT :idNominaRecibo, B.idNominaConcepto, C.name, C.tipo, B.monto, 0, :createDate, :idCreateUser
                 FROM empleado_conceptos_base AS B
                 INNER JOIN nomina_conceptos AS C ON C.idNominaConcepto = B.idNominaConcepto
                 WHERE B.idEmpleado = :idEmpleado`,
                { replacements: { idNominaRecibo, idEmpleado: emp.idEmpleado, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT, transaction }
            );

            const [conteoDetalle] = await dbConnection.query(
                `SELECT COUNT(*) AS n FROM nomina_recibo_detalle WHERE idNominaRecibo = :idNominaRecibo`,
                { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.SELECT, transaction }
            );

            if (conteoDetalle.n === 0) {
                await dbConnection.query(
                    `UPDATE nomina_recibos SET bSinListadoBase = 1 WHERE idNominaRecibo = :idNominaRecibo`,
                    { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.UPDATE, transaction }
                );
            }

            // Comisiones pendientes del periodo (bitácora analisis/008) — puede resultar negativa
            const [comisionesRow] = await dbConnection.query(
                `SELECT IFNULL(SUM(monto), 0) AS total FROM comisiones_track
                 WHERE idUser = :idUser AND estatus = 'PENDIENTE' AND fecha BETWEEN :fechaInicio AND :fechaFin`,
                { replacements: { idUser: emp.idUser, fechaInicio: sFechaInicio, fechaFin: sFechaFin }, type: dbConnection.QueryTypes.SELECT, transaction }
            );

            const totalComisiones = parseFloat(comisionesRow.total) || 0;

            if (totalComisiones !== 0) {
                await dbConnection.query(
                    `INSERT INTO nomina_recibo_detalle (idNominaRecibo, conceptoDesc, tipo, monto, bEsComisiones, createDate, idCreateUser)
                     VALUES (:idNominaRecibo, 'Comisiones', 'PERCEPCION', :monto, 1, :createDate, :idCreateUser)`,
                    { replacements: { idNominaRecibo, monto: totalComisiones, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT, transaction }
                );
            }

            await _fn_recalcularRecibo(idNominaRecibo, transaction);
        }

        await _fn_recalcularNomina(idNomina, transaction);

        await transaction.commit();

        res.json({
            status: 0,
            message: `Nómina generada con ${ empleados.length } empleado(s).`,
            data: { id: idNomina }
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

const getNominasList = async(req, res = response) => {

    const {
        estatus = ''
        , pageSize = 10
        , pageIndex = 0
    } = req.body;

    try{

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows FROM nomina WHERE ( :estatus = '' OR estatus = :estatus )`,
            { replacements: { estatus }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                N.idNomina AS id, N.tipoPeriodo, N.fechaInicio, N.fechaFin, N.estatus,
                DATE_FORMAT(N.fechaInicio, '%d-%m-%Y') AS fechaInicioDesc,
                DATE_FORMAT(N.fechaFin, '%d-%m-%Y') AS fechaFinDesc,
                N.totalPercepciones, N.totalDeducciones, N.totalNeto,
                ( SELECT COUNT(*) FROM nomina_recibos WHERE idNomina = N.idNomina ) AS iEmpleados
             FROM nomina AS N
             WHERE ( :estatus = '' OR N.estatus = :estatus )
             ORDER BY N.idNomina DESC
             LIMIT :offset, :limit`,
            { replacements: { estatus, offset: Number(pageIndex) * Number(pageSize), limit: Number(pageSize) }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { count: countRow.iRows, rows }
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const getNominaDetalle = async(req, res = response) => {

    const { id } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT * FROM nomina WHERE idNomina = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "La nómina no existe." });
        }

        const recibos = await dbConnection.query(
            `SELECT idNominaRecibo AS id, idEmpleado, nombreEmpleado, totalPercepciones, totalDeducciones, neto, bSinListadoBase
             FROM nomina_recibos WHERE idNomina = :id ORDER BY nombreEmpleado ASC`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { nomina: row[0], recibos }
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const getRecibo = async(req, res = response) => {

    const { idNominaRecibo } = req.body;

    try{

        const cabecera = await dbConnection.query(
            `SELECT R.*, N.estatus AS estatusNomina
             FROM nomina_recibos AS R INNER JOIN nomina AS N ON N.idNomina = R.idNomina
             WHERE R.idNominaRecibo = :idNominaRecibo LIMIT 1`,
            { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.SELECT }
        );

        if (cabecera.length === 0) {
            return res.json({ status: 1, message: "El recibo no existe." });
        }

        const detalle = await dbConnection.query(
            `SELECT idNominaReciboDetalle AS id, idNominaConcepto, conceptoDesc, tipo, monto, bEsComisiones
             FROM nomina_recibo_detalle WHERE idNominaRecibo = :idNominaRecibo
             ORDER BY bEsComisiones ASC, tipo ASC, conceptoDesc ASC`,
            { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: { recibo: cabecera[0], detalle }
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ---- Edición de borrador ----

const insertUpdateReciboDetalle = async(req, res = response) => {

    const {
        id = 0
        , idNominaRecibo
        , idNominaConcepto = null
        , conceptoDesc
        , tipo
        , monto

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try{

        const [recibo] = await dbConnection.query(
            `SELECT idNomina FROM nomina_recibos WHERE idNominaRecibo = :idNominaRecibo LIMIT 1`,
            { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!recibo) {
            await transaction.rollback();
            return res.json({ status: 1, message: "El recibo no existe." });
        }

        const sError = await _fn_validarBorrador(recibo.idNomina, transaction);
        if (sError) {
            await transaction.rollback();
            return res.json({ status: 1, message: sError });
        }

        // La línea "Comisiones" es la única excepción al monto siempre
        // positivo (analisis/007) — se detecta por el registro existente,
        // nunca por lo que mande el cliente, para que no se pueda crear
        // una línea nueva en negativo desde este endpoint.
        let bEsLineaComisiones = false;

        if (id > 0) {
            const [actual] = await dbConnection.query(
                `SELECT bEsComisiones FROM nomina_recibo_detalle WHERE idNominaReciboDetalle = :id LIMIT 1`,
                { replacements: { id }, type: dbConnection.QueryTypes.SELECT, transaction }
            );
            if (!actual) {
                await transaction.rollback();
                return res.json({ status: 1, message: "El concepto no existe." });
            }
            bEsLineaComisiones = !!actual.bEsComisiones;
        }

        if (bEsLineaComisiones ? Number(monto) === 0 : Number(monto) <= 0) {
            await transaction.rollback();
            return res.json({ status: 1, message: bEsLineaComisiones ? "El monto no puede ser cero." : "El monto debe ser mayor a cero." });
        }

        if (id > 0) {
            await dbConnection.query(
                `UPDATE nomina_recibo_detalle
                 SET conceptoDesc = :conceptoDesc, tipo = :tipo, monto = :monto, updateDate = :updateDate
                 WHERE idNominaReciboDetalle = :id`,
                { replacements: { conceptoDesc, tipo, monto, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE, transaction }
            );
        } else {
            await dbConnection.query(
                `INSERT INTO nomina_recibo_detalle (idNominaRecibo, idNominaConcepto, conceptoDesc, tipo, monto, bEsComisiones, createDate, idCreateUser)
                 VALUES (:idNominaRecibo, :idNominaConcepto, :conceptoDesc, :tipo, :monto, 0, :createDate, :idCreateUser)`,
                { replacements: { idNominaRecibo, idNominaConcepto, conceptoDesc, tipo, monto, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT, transaction }
            );
        }

        await _fn_recalcularRecibo(idNominaRecibo, transaction);
        await _fn_recalcularNomina(recibo.idNomina, transaction);

        await transaction.commit();

        res.json({ status: 0, message: "Concepto guardado con éxito." });

    }catch(error){

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const deleteReciboDetalle = async(req, res = response) => {

    const { id } = req.body;

    const transaction = await dbConnection.transaction();

    try{

        const [detalle] = await dbConnection.query(
            `SELECT idNominaRecibo FROM nomina_recibo_detalle WHERE idNominaReciboDetalle = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!detalle) {
            await transaction.rollback();
            return res.json({ status: 1, message: "El concepto no existe." });
        }

        const [recibo] = await dbConnection.query(
            `SELECT idNomina FROM nomina_recibos WHERE idNominaRecibo = :idNominaRecibo LIMIT 1`,
            { replacements: { idNominaRecibo: detalle.idNominaRecibo }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        const sError = await _fn_validarBorrador(recibo.idNomina, transaction);
        if (sError) {
            await transaction.rollback();
            return res.json({ status: 1, message: sError });
        }

        await dbConnection.query(
            `DELETE FROM nomina_recibo_detalle WHERE idNominaReciboDetalle = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        await _fn_recalcularRecibo(detalle.idNominaRecibo, transaction);
        await _fn_recalcularNomina(recibo.idNomina, transaction);

        await transaction.commit();

        res.json({ status: 0, message: "Concepto quitado del recibo." });

    }catch(error){

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const excluirRecibo = async(req, res = response) => {

    const { idNominaRecibo } = req.body;

    const transaction = await dbConnection.transaction();

    try{

        const [recibo] = await dbConnection.query(
            `SELECT idNomina FROM nomina_recibos WHERE idNominaRecibo = :idNominaRecibo LIMIT 1`,
            { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!recibo) {
            await transaction.rollback();
            return res.json({ status: 1, message: "El recibo no existe." });
        }

        const sError = await _fn_validarBorrador(recibo.idNomina, transaction);
        if (sError) {
            await transaction.rollback();
            return res.json({ status: 1, message: sError });
        }

        await dbConnection.query(
            `DELETE FROM nomina_recibo_detalle WHERE idNominaRecibo = :idNominaRecibo`,
            { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        await dbConnection.query(
            `DELETE FROM nomina_recibos WHERE idNominaRecibo = :idNominaRecibo`,
            { replacements: { idNominaRecibo }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        await _fn_recalcularNomina(recibo.idNomina, transaction);

        await transaction.commit();

        res.json({ status: 0, message: "Empleado excluido de la nómina." });

    }catch(error){

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ---- Pagar / cancelar ----

const pagarNomina = async(req, res = response) => {

    const {
        id

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try{

        const [nomina] = await dbConnection.query(
            `SELECT estatus FROM nomina WHERE idNomina = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!nomina) {
            await transaction.rollback();
            return res.json({ status: 1, message: "La nómina no existe." });
        }
        if (nomina.estatus !== 'BORRADOR') {
            await transaction.rollback();
            return res.json({ status: 1, message: "La nómina ya no está en borrador." });
        }

        await dbConnection.query(
            `UPDATE nomina SET estatus = 'PAGADA', pagadaDate = :pagadaDate, idPagoUser = :idPagoUser WHERE idNomina = :id`,
            { replacements: { pagadaDate: oGetDateNow, idPagoUser: idUserLogON, id }, type: dbConnection.QueryTypes.UPDATE, transaction }
        );

        // Liga (set-based, sin loop) los renglones PENDIENTE de la
        // bitácora de comisiones cuyo idUser tenga recibo en esta
        // nómina y cuya fecha caiga dentro del rango del periodo.
        await dbConnection.query(
            `UPDATE comisiones_track AS CT
             INNER JOIN nomina_recibos AS R ON R.idUser = CT.idUser AND R.idNomina = :id
             INNER JOIN nomina AS N ON N.idNomina = R.idNomina
             SET CT.estatus = 'INCLUIDA_EN_NOMINA', CT.idNomina = :id
             WHERE CT.estatus = 'PENDIENTE' AND CT.fecha BETWEEN N.fechaInicio AND N.fechaFin`,
            { replacements: { id }, type: dbConnection.QueryTypes.UPDATE, transaction }
        );

        await transaction.commit();

        res.json({ status: 0, message: "Nómina pagada con éxito." });

    }catch(error){

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const cancelarNomina = async(req, res = response) => {

    const {
        id
        , motivo

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try{

        if (!motivo || !motivo.trim()) {
            await transaction.rollback();
            return res.json({ status: 1, message: "El motivo es obligatorio." });
        }

        const [nomina] = await dbConnection.query(
            `SELECT estatus FROM nomina WHERE idNomina = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!nomina) {
            await transaction.rollback();
            return res.json({ status: 1, message: "La nómina no existe." });
        }
        if (nomina.estatus !== 'PAGADA') {
            await transaction.rollback();
            return res.json({ status: 1, message: "Solo se puede cancelar una nómina pagada." });
        }

        await dbConnection.query(
            `UPDATE nomina
             SET estatus = 'CANCELADA', canceladaDate = :canceladaDate, idCancelUser = :idCancelUser, motivoCancelacion = :motivo
             WHERE idNomina = :id`,
            { replacements: { canceladaDate: oGetDateNow, idCancelUser: idUserLogON, motivo, id }, type: dbConnection.QueryTypes.UPDATE, transaction }
        );

        await dbConnection.query(
            `UPDATE comisiones_track SET estatus = 'PENDIENTE', idNomina = NULL WHERE idNomina = :id AND estatus = 'INCLUIDA_EN_NOMINA'`,
            { replacements: { id }, type: dbConnection.QueryTypes.UPDATE, transaction }
        );

        await transaction.commit();

        res.json({ status: 0, message: "Nómina cancelada con éxito." });

    }catch(error){

        await transaction.rollback();

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Eliminación física de una nómina completa (permiso nomina_Eliminar,
// separado y más restringido que Generar). Solo se permite en
// BORRADOR — nada se pagó ni se ligó comisiones todavía, así que
// borrarla no destruye ningún historial. Una PAGADA/CANCELADA nunca se
// borra (se sugiere cancelar en su lugar); ese registro es el
// comprobante permanente.
const deleteNomina = async(req, res = response) => {

    const { id } = req.body;

    const transaction = await dbConnection.transaction();

    try{

        const [nomina] = await dbConnection.query(
            `SELECT estatus FROM nomina WHERE idNomina = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT, transaction }
        );

        if (!nomina) {
            await transaction.rollback();
            return res.json({ status: 1, message: "La nómina no existe." });
        }
        if (nomina.estatus !== 'BORRADOR') {
            await transaction.rollback();
            return res.json({
                status: 1,
                message: nomina.estatus === 'PAGADA'
                    ? "No se puede eliminar: ya está pagada. Cancélala en su lugar."
                    : "No se puede eliminar: es historial de una nómina cancelada."
            });
        }

        await dbConnection.query(
            `DELETE FROM nomina_recibo_detalle
             WHERE idNominaRecibo IN ( SELECT idNominaRecibo FROM nomina_recibos WHERE idNomina = :id )`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        await dbConnection.query(
            `DELETE FROM nomina_recibos WHERE idNomina = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        await dbConnection.query(
            `DELETE FROM nomina WHERE idNomina = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE, transaction }
        );

        await transaction.commit();

        res.json({
            status: 0,
            message: "Nómina eliminada por completo."
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

const getNominasByEmpleado = async(req, res = response) => {

    const { idEmpleado } = req.body;

    try{

        const rows = await dbConnection.query(
            `SELECT
                N.idNomina AS id, N.tipoPeriodo, N.fechaInicio, N.fechaFin, N.estatus,
                DATE_FORMAT(N.fechaInicio, '%d-%m-%Y') AS fechaInicioDesc,
                DATE_FORMAT(N.fechaFin, '%d-%m-%Y') AS fechaFinDesc,
                R.idNominaRecibo, R.neto
             FROM nomina_recibos AS R
             INNER JOIN nomina AS N ON N.idNomina = R.idNomina
             WHERE R.idEmpleado = :idEmpleado
             ORDER BY N.fechaInicio DESC`,
            { replacements: { idEmpleado }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: rows
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

module.exports = {
    generarNomina
    , getNominasList
    , getNominaDetalle
    , getRecibo
    , deleteNomina
    , insertUpdateReciboDetalle
    , deleteReciboDetalle
    , excluirRecibo
    , pagarNomina
    , cancelarNomina
    , getNominasByEmpleado
}
