const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// Catálogos de personal: técnicos y vendedores
// (analisis/005-catalogo-tecnicos-vendedores.md). La referencia
// universal sigue siendo users.idUser — estos catálogos solo agregan
// datos por persona. Queries directas sobre la instancia compartida
// `dbConnection` (pool propio) — nunca createConexion(). La lógica es
// idéntica para ambos catálogos, solo cambia la configuración: un solo
// factory genera los handlers de cada uno.

const CATALOGOS = {
    tecnicos: {
        tabla: 'tecnicos',
        idCampo: 'idTecnico',
        etiqueta: 'técnico',
        // % de destajo (0-100) — solo técnicos, no vendedores. Usado
        // por la bitácora de comisiones (analisis/008) para calcular
        // la comisión destajo sobre la mano de obra de cada taller.
        bTieneDestajo: true,
        // Referencias históricas por idUser que bloquean la eliminación física
        referencias: [
            { sql: `SELECT COUNT(*) AS n FROM taller_mano_obra WHERE idUserTecnico = :idUser`, desc: 'mano de obra de taller' },
            { sql: `SELECT COUNT(*) AS n FROM taller_metal_final WHERE idUserTecnico = :idUser`, desc: 'metal final de taller' },
            { sql: `SELECT COUNT(*) AS n FROM metal_inventario WHERE tipoPropietario = 'TECNICO' AND idPropietario = :idUser`, desc: 'inventario de metal' },
            { sql: `SELECT COUNT(*) AS n FROM metal_inventario_track WHERE (tipoOrigen = 'TECNICO' AND idOrigen = :idUser) OR (tipoDestino = 'TECNICO' AND idDestino = :idUser)`, desc: 'movimientos de metal' }
        ]
    },
    vendedores: {
        tabla: 'vendedores',
        idCampo: 'idVendedor',
        etiqueta: 'vendedor',
        referencias: [
            { sql: `SELECT COUNT(*) AS n FROM sales WHERE idSeller_idUser = :idUser`, desc: 'ventas' }
        ]
    }
};

const _fn_getList = (config) => async(req, res = response) => {

    const {
        search = ''
        , pageSize = 10
        , pageIndex = 0
        , bSoloActivos = false
    } = req.body;

    try{

        const sSearch = `%${ search }%`;
        const iLimit = Number(pageSize);
        const iOffset = Number(pageIndex) * iLimit;

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM ${ config.tabla } AS C
             INNER JOIN users AS U ON U.idUser = C.idUser
             WHERE ( :search = '%%' OR C.nombre LIKE :search OR U.userName LIKE :search )
             AND ( :bSoloActivos = false OR C.active = 1 )`,
            { replacements: { search: sSearch, bSoloActivos }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                C.${ config.idCampo } AS id,
                C.idUser,
                C.nombre,
                C.active,
                C.createDate,
                DATE_FORMAT( C.createDate, '%d-%m-%Y' ) AS createDateDesc,
                U.userName,
                U.name AS userNombre,
                U.active AS userActive
                ${ config.bTieneDestajo ? ', C.destajoPorcentaje' : '' }
             FROM ${ config.tabla } AS C
             INNER JOIN users AS U ON U.idUser = C.idUser
             WHERE ( :search = '%%' OR C.nombre LIKE :search OR U.userName LIKE :search )
             AND ( :bSoloActivos = false OR C.active = 1 )
             ORDER BY C.active DESC, C.nombre ASC
             LIMIT :offset, :limit`,
            { replacements: { search: sSearch, bSoloActivos, offset: iOffset, limit: iLimit }, type: dbConnection.QueryTypes.SELECT }
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

const _fn_getById = (config) => async(req, res = response) => {

    const { id } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT
                C.${ config.idCampo } AS id, C.idUser, C.nombre, C.active,
                U.userName, U.name AS userNombre
                ${ config.bTieneDestajo ? ', C.destajoPorcentaje' : '' }
             FROM ${ config.tabla } AS C
             INNER JOIN users AS U ON U.idUser = C.idUser
             WHERE C.${ config.idCampo } = :id
             LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: row.length > 0 ? row[0] : null
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const _fn_insertUpdate = (config) => async(req, res = response) => {

    const {
        id = 0
        , idUser
        , nombre
        , active = 1
        , destajoPorcentaje = 0

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if (config.bTieneDestajo && (Number(destajoPorcentaje) < 0 || Number(destajoPorcentaje) > 100)) {
            return res.json({
                status: 1,
                message: "El % de destajo debe estar entre 0 y 100."
            });
        }

        // idUser no puede estar ligado a otro registro del mismo catálogo
        const [dupUser] = await dbConnection.query(
            `SELECT COUNT(*) AS n FROM ${ config.tabla }
             WHERE idUser = :idUser AND ${ config.idCampo } <> :id`,
            { replacements: { idUser, id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (dupUser.n > 0) {
            return res.json({
                status: 1,
                message: `Ese usuario ya está ligado a otro ${ config.etiqueta }.`
            });
        }

        // Nombre no duplicado entre activos
        const [dupNombre] = await dbConnection.query(
            `SELECT COUNT(*) AS n FROM ${ config.tabla }
             WHERE nombre = :nombre AND active = 1 AND ${ config.idCampo } <> :id`,
            { replacements: { nombre, id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (dupNombre.n > 0) {
            return res.json({
                status: 1,
                message: `Ya existe un ${ config.etiqueta } activo con ese nombre.`
            });
        }

        if (id > 0) {

            await dbConnection.query(
                `UPDATE ${ config.tabla }
                 SET idUser = :idUser, nombre = :nombre, active = :active, updateDate = :updateDate
                 ${ config.bTieneDestajo ? ', destajoPorcentaje = :destajoPorcentaje' : '' }
                 WHERE ${ config.idCampo } = :id`,
                { replacements: { idUser, nombre, active: active ? 1 : 0, updateDate: oGetDateNow, destajoPorcentaje, id }, type: dbConnection.QueryTypes.UPDATE }
            );

            return res.json({
                status: 0,
                message: "Modificado con éxito.",
                data: { id }
            });

        }

        const sColumnasDestajo = config.bTieneDestajo ? ', destajoPorcentaje' : '';
        const sValoresDestajo = config.bTieneDestajo ? ', :destajoPorcentaje' : '';

        await dbConnection.query(
            `INSERT INTO ${ config.tabla } (idUser, nombre, active, createDate, idCreateUser ${ sColumnasDestajo })
             VALUES (:idUser, :nombre, 1, :createDate, :idCreateUser ${ sValoresDestajo })`,
            { replacements: { idUser, nombre, createDate: oGetDateNow, idCreateUser: idUserLogON, destajoPorcentaje }, type: dbConnection.QueryTypes.INSERT }
        );

        const [nuevoRow] = await dbConnection.query(
            `SELECT ${ config.idCampo } AS id FROM ${ config.tabla } WHERE idUser = :idUser LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Creado con éxito.",
            data: { id: nuevoRow.id }
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const _fn_setActive = (config) => async(req, res = response) => {

    const {
        id
        , active
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        await dbConnection.query(
            `UPDATE ${ config.tabla }
             SET active = :active, updateDate = :updateDate
             WHERE ${ config.idCampo } = :id`,
            { replacements: { active: active ? 1 : 0, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE }
        );

        res.json({
            status: 0,
            message: active ? "Activado con éxito." : "Inactivado con éxito."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const _fn_delete = (config) => async(req, res = response) => {

    const { id } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT idUser FROM ${ config.tabla } WHERE ${ config.idCampo } = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El registro no existe." });
        }

        const idUser = row[0].idUser;

        // Referencias históricas del idUser: si existen, no se puede
        // borrar físicamente — se sugiere inactivar.
        for (const ref of config.referencias) {
            const [check] = await dbConnection.query(
                ref.sql,
                { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
            );
            if (check.n > 0) {
                return res.json({
                    status: 1,
                    message: `No se puede eliminar: tiene ${ check.n } registro(s) en ${ ref.desc }. Inactívalo en su lugar.`
                });
            }
        }

        await dbConnection.query(
            `DELETE FROM ${ config.tabla } WHERE ${ config.idCampo } = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE }
        );

        res.json({
            status: 0,
            message: "Eliminado definitivamente con éxito."
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
    getTecnicosList: _fn_getList(CATALOGOS.tecnicos)
    , getTecnicoById: _fn_getById(CATALOGOS.tecnicos)
    , insertUpdateTecnico: _fn_insertUpdate(CATALOGOS.tecnicos)
    , setActiveTecnico: _fn_setActive(CATALOGOS.tecnicos)
    , deleteTecnico: _fn_delete(CATALOGOS.tecnicos)

    , getVendedoresList: _fn_getList(CATALOGOS.vendedores)
    , getVendedorById: _fn_getById(CATALOGOS.vendedores)
    , insertUpdateVendedor: _fn_insertUpdate(CATALOGOS.vendedores)
    , setActiveVendedor: _fn_setActive(CATALOGOS.vendedores)
    , deleteVendedor: _fn_delete(CATALOGOS.vendedores)
}
