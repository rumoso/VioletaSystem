const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { fn_tieneAccion } = require('../helpers/permisos');

//////////////////////////////////////////////////////////////////////////////////////////////////
// Catálogo de constantes del sistema (analisis/040-catalogo-de-constantes.md).
//
// Misma tabla y funciones que en AgroEnvases. Todas las rutas exigen
// sesión (validarSesion). Las que escriben exigen además la acción
// `config_ConstantesModificar`, revisada aquí.
//
// El sistema lee las constantes con helpers/constantesSistema.js, siempre
// con un default: una constante inactiva o eliminada no tumba nada.
//
// Queries directas sobre `dbConnection` — nunca createConexion().
//////////////////////////////////////////////////////////////////////////////////////////////////

const ACCION_MODIFICAR = 'config_ConstantesModificar';
const MAX_VALOR = 500;
const MAX_CLAVE = 100;

// "facial evidencia activa" → "FACIAL_EVIDENCIA_ACTIVA". Solo A-Z, 0-9 y _.
const _fn_normalizarClave = (sKey) => String(sKey || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');

const _fn_valorOpcional = (v) => {
    const s = v === null || v === undefined ? '' : String(v).trim();
    return s === '' ? null : s;
};

const _fn_errorInesperado = (res, error) => res.json({
    status: 2,
    message: "Sucedió un error inesperado",
    data: error.message
});

const _fn_sinPermiso = (res) => res.json({ status: 1, message: 'No tienes permiso para modificar constantes.' });

const getConstantesList = async(req, res = response) => {

    const { search = '' } = req.body;

    try {

        const rows = await dbConnection.query(
            `SELECT C.idConstante, C.sKey, C.sValue, C.sValue2, C.sValue3, C.sValue4, C.active,
                    DATE_FORMAT(C.createDate, '%d-%m-%Y %h:%i %p') AS createDateDesc,
                    U.name AS createUserDesc
             FROM constantes AS C
             LEFT JOIN users AS U ON U.idUser = C.idCreateUser
             WHERE ( :search = '' OR C.sKey LIKE :like OR C.sValue LIKE :like )
             ORDER BY C.sKey`,
            { replacements: { search, like: `%${ search }%` }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({ status: 0, message: 'Ejecutado correctamente.', data: { rows } });

    } catch (error) {
        _fn_errorInesperado(res, error);
    }
};

const saveConstante = async(req, res = response) => {

    const {
        idConstante = 0,
        sKey = '',
        sValue = '',
        sValue2 = null,
        sValue3 = null,
        sValue4 = null,
        active = 1
    } = req.body;

    try {

        if (!await fn_tieneAccion(req.idUserSesion, ACCION_MODIFICAR)) {
            return _fn_sinPermiso(res);
        }

        const sClave = _fn_normalizarClave(sKey);
        const sValor = String(sValue === null || sValue === undefined ? '' : sValue).trim();

        if (!sClave) {
            return res.json({ status: 1, message: 'La clave es obligatoria (letras, números y guion bajo).' });
        }
        if (sClave.length > MAX_CLAVE) {
            return res.json({ status: 1, message: `La clave no puede pasar de ${ MAX_CLAVE } caracteres.` });
        }
        if (!sValor) {
            return res.json({ status: 1, message: 'El valor es obligatorio.' });
        }

        const aValores = [sValor, _fn_valorOpcional(sValue2), _fn_valorOpcional(sValue3), _fn_valorOpcional(sValue4)];

        if (aValores.some((v) => v !== null && v.length > MAX_VALOR)) {
            return res.json({ status: 1, message: `Los valores no pueden pasar de ${ MAX_VALOR } caracteres.` });
        }

        const [repetida] = await dbConnection.query(
            `SELECT idConstante FROM constantes WHERE sKey = :sClave AND idConstante <> :idConstante LIMIT 1`,
            { replacements: { sClave, idConstante: Number(idConstante) || 0 }, type: dbConnection.QueryTypes.SELECT }
        );

        if (repetida) {
            return res.json({ status: 1, message: `Ya existe una constante con la clave ${ sClave }.` });
        }

        const replacements = {
            idConstante: Number(idConstante) || 0,
            sKey: sClave,
            sValue: aValores[0],
            sValue2: aValores[1],
            sValue3: aValores[2],
            sValue4: aValores[3],
            active: Number(active) === 0 ? 0 : 1,
            createDate: moment().format('YYYY-MM-DD HH:mm:ss'),
            idCreateUser: req.idUserSesion
        };

        if (replacements.idConstante > 0) {

            const [existe] = await dbConnection.query(
                `SELECT idConstante FROM constantes WHERE idConstante = :idConstante`,
                { replacements, type: dbConnection.QueryTypes.SELECT }
            );

            if (!existe) {
                return res.json({ status: 1, message: 'La constante no existe.' });
            }

            await dbConnection.query(
                `UPDATE constantes
                 SET sKey = :sKey, sValue = :sValue, sValue2 = :sValue2, sValue3 = :sValue3, sValue4 = :sValue4, active = :active
                 WHERE idConstante = :idConstante`,
                { replacements, type: dbConnection.QueryTypes.UPDATE }
            );

            return res.json({ status: 0, message: 'Constante actualizada.', data: { idConstante: replacements.idConstante, sKey: sClave } });
        }

        const [idNuevo] = await dbConnection.query(
            `INSERT INTO constantes (createDate, active, idCreateUser, sKey, sValue, sValue2, sValue3, sValue4)
             VALUES (:createDate, :active, :idCreateUser, :sKey, :sValue, :sValue2, :sValue3, :sValue4)`,
            { replacements, type: dbConnection.QueryTypes.INSERT }
        );

        res.json({ status: 0, message: 'Constante creada.', data: { idConstante: idNuevo, sKey: sClave } });

    } catch (error) {
        _fn_errorInesperado(res, error);
    }
};

const setConstanteActiva = async(req, res = response) => {

    const { idConstante = 0, active = 1 } = req.body;

    try {

        if (!await fn_tieneAccion(req.idUserSesion, ACCION_MODIFICAR)) {
            return _fn_sinPermiso(res);
        }

        const [, iAfectadas] = await dbConnection.query(
            `UPDATE constantes SET active = :active WHERE idConstante = :idConstante`,
            { replacements: { idConstante: Number(idConstante), active: Number(active) === 0 ? 0 : 1 }, type: dbConnection.QueryTypes.UPDATE }
        );

        if (!iAfectadas) {
            return res.json({ status: 1, message: 'La constante no existe.' });
        }

        res.json({ status: 0, message: Number(active) === 0 ? 'Constante desactivada.' : 'Constante activada.' });

    } catch (error) {
        _fn_errorInesperado(res, error);
    }
};

const deleteConstante = async(req, res = response) => {

    const { idConstante = 0 } = req.body;

    try {

        if (!await fn_tieneAccion(req.idUserSesion, ACCION_MODIFICAR)) {
            return _fn_sinPermiso(res);
        }

        const [fila] = await dbConnection.query(
            `SELECT sKey FROM constantes WHERE idConstante = :idConstante`,
            { replacements: { idConstante: Number(idConstante) }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!fila) {
            return res.json({ status: 1, message: 'La constante no existe.' });
        }

        await dbConnection.query(
            `DELETE FROM constantes WHERE idConstante = :idConstante`,
            { replacements: { idConstante: Number(idConstante) }, type: dbConnection.QueryTypes.DELETE }
        );

        res.json({ status: 0, message: `Constante ${ fila.sKey } eliminada. El sistema usará su valor por default.` });

    } catch (error) {
        _fn_errorInesperado(res, error);
    }
};

module.exports = {
    getConstantesList
    , saveConstante
    , setConstanteActiva
    , deleteConstante
};
