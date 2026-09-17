const { response } = require('express');

const { dbConnection } = require('../database/config');

// Taller cancelado = solo lectura (analisis/022). Se valida en la ruta,
// antes del controller, para no repetir la guarda en cada endpoint de
// taller. Cada endpoint identifica el taller con un campo distinto
// (el folio, el idTaller, o el id del renglón de la sección), así que se
// resuelve a partir del primer campo conocido que venga en el body.
// Para uploads va DESPUÉS de multer (antes el body no está parseado).

const ID_TALLER_STATUS_CANCELADO = 7;

const _CAMPOS = [
    { key: 'idTaller',                 sql: `SELECT idTallerStatus FROM taller WHERE idTaller = :v` },
    { key: 'idTallerOrigen',           sql: `SELECT idTallerStatus FROM taller WHERE idTaller = :v` },
    { key: 'idSale',                   sql: `SELECT idTallerStatus FROM taller WHERE idSale = :v` },
    { key: 'idRefaccion',              sql: `SELECT T.idTallerStatus FROM taller_refacciones AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idRefaccion = :v` },
    { key: 'idServicioExternoDetalle', sql: `SELECT T.idTallerStatus FROM taller_servicios_externos AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idServicioExternoDetalle = :v` },
    { key: 'idManoObra',               sql: `SELECT T.idTallerStatus FROM taller_mano_obra AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idManoObra = :v` },
    { key: 'idMetalAgranel',           sql: `SELECT T.idTallerStatus FROM taller_metal_agranel AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idMetalAgranel = :v` },
    { key: 'idMetalCliente',           sql: `SELECT T.idTallerStatus FROM taller_metal_cliente AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idMetalCliente = :v` },
    { key: 'idMetalFinal',             sql: `SELECT T.idTallerStatus FROM taller_metal_final AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idMetalFinal = :v` },
    { key: 'keyX',                     sql: `SELECT T.idTallerStatus FROM taller_metal_cliente_img AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.keyx = :v` },
    { key: 'idResponsablesDevolucion', sql: `SELECT T.idTallerStatus FROM taller_responsables_devolucion AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idResponsablesDevolucion = :v` }
];

const _fn_esCancelado = async(sql, v) => {
    const rows = await dbConnection.query(sql, { replacements: { v }, type: dbConnection.QueryTypes.SELECT });
    return rows.some(r => Number(r.idTallerStatus) === ID_TALLER_STATUS_CANCELADO);
};

const validarTallerNoCancelado = async(req, res = response, next) => {

    const body = req.body || {};

    try {

        const consultas = [];

        for (const c of _CAMPOS) {
            const v = body[c.key];
            if (v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0') {
                consultas.push({ sql: c.sql, v });
            }
        }

        // Endpoints por lote: firmas masivas (idTaller por renglón) y
        // abonos (paymentList[].idRelation es el folio de la venta).
        if (Array.isArray(body.firmas)) {
            for (const f of body.firmas) {
                if (f && f.idTaller) consultas.push({ sql: _CAMPOS[0].sql, v: f.idTaller });
            }
        }
        if (Array.isArray(body.paymentList)) {
            for (const p of body.paymentList) {
                if (p && p.idRelation) consultas.push({ sql: _CAMPOS[2].sql, v: p.idRelation });
            }
        }

        for (const q of consultas) {
            if (await _fn_esCancelado(q.sql, q.v)) {
                return res.json({ status: 1, message: 'El taller está cancelado, solo se puede consultar.' });
            }
        }

        next();

    } catch (error) {

        res.json({
            status: 2,
            message: 'Sucedió un error inesperado',
            data: error.message
        });

    }

};

module.exports = {
    validarTallerNoCancelado
};
