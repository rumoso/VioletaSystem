const { response } = require('express');

const { dbConnection } = require('../database/config');
const { TIPO_ROL } = require('../helpers/constantes');
const { ESTATUS, fn_estaBloqueado, fn_esEditablePorEncargado } = require('../helpers/tallerEstatus');

// Guardas de escritura del taller, en la ruta y no en cada controller.
// Cada endpoint identifica el taller con un campo distinto (el folio, el
// idTaller, o el id del renglón de la sección), así que se resuelve a
// partir del primer campo conocido que venga en el body. Para uploads va
// DESPUÉS de multer (antes el body no está parseado).
//
//   validarTallerNoCancelado → solo frena folios cancelados. Es la que
//     usan los endpoints que SÍ trabajan sobre un folio bloqueado:
//     pagos, cambio de estatus, firmas y responsables de devolución.
//   validarTallerEditable → además frena los folios BLOQUEADOS
//     (de Finalizado/Mostrador en adelante) y, mientras el folio está con
//     el encargado, deja escribir solo a él (analisis/029). Es la que usan
//     los endpoints que capturan datos del taller.

const _CAMPOS = [
    { key: 'idTaller',                 sql: `SELECT idTallerStatus, idSucursal FROM taller WHERE idTaller = :v` },
    { key: 'idTallerOrigen',           sql: `SELECT idTallerStatus, idSucursal FROM taller WHERE idTaller = :v` },
    { key: 'idSale',                   sql: `SELECT idTallerStatus, idSucursal FROM taller WHERE idSale = :v` },
    { key: 'idRefaccion',              sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_refacciones AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idRefaccion = :v` },
    { key: 'idServicioExternoDetalle', sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_servicios_externos AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idServicioExternoDetalle = :v` },
    { key: 'idManoObra',               sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_mano_obra AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idManoObra = :v` },
    { key: 'idMetalAgranel',           sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_metal_agranel AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idMetalAgranel = :v` },
    { key: 'idMetalCliente',           sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_metal_cliente AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idMetalCliente = :v` },
    { key: 'idMetalFinal',             sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_metal_final AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idMetalFinal = :v` },
    { key: 'keyX',                     sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_metal_cliente_img AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.keyx = :v` },
    { key: 'idResponsablesDevolucion', sql: `SELECT T.idTallerStatus, T.idSucursal FROM taller_responsables_devolucion AS X INNER JOIN taller AS T ON T.idTaller = X.idTaller WHERE X.idResponsablesDevolucion = :v` }
];

// Todos los talleres que toca la petición, con su estatus y su sucursal.
const _fn_getTalleres = async(body) => {

    const consultas = [];

    for (const c of _CAMPOS) {
        const v = body[c.key];
        if (v !== undefined && v !== null && v !== '' && v !== 0 && v !== '0') {
            consultas.push({ sql: c.sql, v });
        }
    }

    // Endpoints por lote: firmas masivas (idTaller por renglón) y abonos
    // (paymentList[].idRelation es el folio de la venta).
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

    const talleres = [];

    for (const q of consultas) {
        const rows = await dbConnection.query(q.sql, { replacements: { v: q.v }, type: dbConnection.QueryTypes.SELECT });
        talleres.push(...rows);
    }

    return talleres;

};

// ¿Quien pide es encargado de esa sucursal, o trae la autorización
// especial? Misma definición que usa el controller de taller.
const _fn_puedeComoEncargado = async(idSucursal, idUserLogON, auth_idUser) => {

    const rows = await dbConnection.query(
        `SELECT 1 AS ok
         FROM users AS U
         WHERE U.idUser = :idUser AND U.active = 1
           AND EXISTS ( SELECT 1 FROM rolesconfig AS RC
                        INNER JOIN roles AS R ON R.idRol = RC.idRol
                        WHERE RC.idUser = U.idUser AND R.active = 1 AND R.idTipoRol = :idTipoRol )
           AND EXISTS ( SELECT 1 FROM sucursalesconfig AS SC
                        WHERE SC.idUser = U.idUser AND SC.idSucursal = :idSucursal )
         LIMIT 1`,
        {
            replacements: { idUser: idUserLogON, idTipoRol: TIPO_ROL.ENCARGADO_TALLER, idSucursal },
            type: dbConnection.QueryTypes.SELECT
        }
    );

    if (rows.length > 0) {
        return true;
    }

    if (!auth_idUser || Number(auth_idUser) <= 0) {
        return false;
    }

    const aut = await dbConnection.query(
        `SELECT 1 AS ok
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON AC.idAction = A.idAction AND AC.active = 1
         LEFT JOIN rolesconfig AS RC ON AC.relationType = 'R' AND RC.idRol = AC.idRelation AND RC.idUser = :idUser
         WHERE A.name = 'tall_AceptarComoEncargado' AND A.active = 1
           AND ( ( AC.relationType = 'R' AND RC.idRolConfig IS NOT NULL )
                 OR ( AC.relationType = 'U' AND AC.idRelation = :idUser ) )
         LIMIT 1`,
        { replacements: { idUser: auth_idUser }, type: dbConnection.QueryTypes.SELECT }
    );

    return aut.length > 0;

};

const validarTallerNoCancelado = async(req, res = response, next) => {

    try {

        const talleres = await _fn_getTalleres(req.body || {});

        if (talleres.some(t => Number(t.idTallerStatus) === ESTATUS.CANCELADO)) {
            return res.json({ status: 1, message: 'El taller está cancelado, solo se puede consultar.' });
        }

        next();

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }

};

const validarTallerEditable = async(req, res = response, next) => {

    const body = req.body || {};

    try {

        const talleres = await _fn_getTalleres(body);

        if (talleres.some(t => Number(t.idTallerStatus) === ESTATUS.CANCELADO)) {
            return res.json({ status: 1, message: 'El taller está cancelado, solo se puede consultar.' });
        }

        // Bloqueado de Finalizado/Mostrador en adelante. El candado vive
        // aquí porque los permisos del taller solo se revisaban en la
        // pantalla: un bloqueo de Front no bloquea nada de verdad.
        if (talleres.some(t => fn_estaBloqueado(t.idTallerStatus))) {
            return res.json({
                status: 1,
                message: 'El taller está bloqueado: para modificarlo hay que regresarlo de estatus con autorización.'
            });
        }

        // Con el encargado, solo él (o quien traiga la autorización).
        const conEncargado = talleres.filter(t => fn_esEditablePorEncargado(t.idTallerStatus));

        for (const t of conEncargado) {
            if (!(await _fn_puedeComoEncargado(t.idSucursal, body.idUserLogON, body.auth_idUser))) {
                return res.json({
                    status: 1,
                    message: 'El folio está con el encargado de taller: solo él puede modificarlo.'
                });
            }
        }

        next();

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }

};

module.exports = {
    validarTallerNoCancelado
    , validarTallerEditable
};
