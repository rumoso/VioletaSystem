const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// Catálogo de conceptos de nómina (analisis/006). Los conceptos de
// fábrica (bSistema=1) se pueden inactivar pero no eliminar; los del
// cliente solo se eliminan si ningún listado base los usa. Queries
// directas sobre la dbConnection compartida.

const getNominaConceptosList = async(req, res = response) => {

    const {
        search = ''
        , tipo = ''
        , pageSize = 10
        , pageIndex = 0
    } = req.body;

    try{

        const sSearch = `%${ search }%`;
        const iLimit = Number(pageSize);
        const iOffset = Number(pageIndex) * iLimit;

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM nomina_conceptos
             WHERE ( :search = '%%' OR name LIKE :search )
             AND ( :tipo = '' OR tipo = :tipo )`,
            { replacements: { search: sSearch, tipo }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                C.idNominaConcepto AS id,
                C.name,
                C.tipo,
                C.bSistema,
                C.active,
                ( SELECT COUNT(*) FROM empleado_conceptos_base AS B WHERE B.idNominaConcepto = C.idNominaConcepto ) AS iUsos
             FROM nomina_conceptos AS C
             WHERE ( :search = '%%' OR C.name LIKE :search )
             AND ( :tipo = '' OR C.tipo = :tipo )
             ORDER BY C.active DESC, C.tipo ASC, C.name ASC
             LIMIT :offset, :limit`,
            { replacements: { search: sSearch, tipo, offset: iOffset, limit: iLimit }, type: dbConnection.QueryTypes.SELECT }
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

// Conceptos activos disponibles para agregar al listado base de un
// empleado (excluye los que ya tiene).
const cbxGetConceptosActivos = async(req, res = response) => {

    const { idEmpleado = 0 } = req.body;

    try{

        const rows = await dbConnection.query(
            `SELECT C.idNominaConcepto AS id, C.name, C.tipo
             FROM nomina_conceptos AS C
             WHERE C.active = 1
             AND NOT EXISTS (
                SELECT 1 FROM empleado_conceptos_base AS B
                WHERE B.idNominaConcepto = C.idNominaConcepto AND B.idEmpleado = :idEmpleado
             )
             ORDER BY C.tipo ASC, C.name ASC`,
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

const insertUpdateNominaConcepto = async(req, res = response) => {

    const {
        id = 0
        , name
        , tipo

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if (tipo !== 'PERCEPCION' && tipo !== 'DEDUCCION') {
            return res.json({ status: 1, message: "El tipo debe ser PERCEPCION o DEDUCCION." });
        }

        const [dup] = await dbConnection.query(
            `SELECT COUNT(*) AS n FROM nomina_conceptos
             WHERE name = :name AND idNominaConcepto <> :id`,
            { replacements: { name, id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (dup.n > 0) {
            return res.json({ status: 1, message: "Ya existe un concepto con ese nombre." });
        }

        if (id > 0) {

            // Los conceptos de fábrica no cambian de nombre/tipo (los
            // módulos futuros de nómina dependen de ellos); solo los
            // del cliente son editables.
            const row = await dbConnection.query(
                `SELECT bSistema FROM nomina_conceptos WHERE idNominaConcepto = :id LIMIT 1`,
                { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
            );

            if (row.length === 0) {
                return res.json({ status: 1, message: "El concepto no existe." });
            }
            if (row[0].bSistema) {
                return res.json({ status: 1, message: "Los conceptos precargados del sistema no se pueden modificar (solo inactivar)." });
            }

            await dbConnection.query(
                `UPDATE nomina_conceptos
                 SET name = :name, tipo = :tipo, updateDate = :updateDate
                 WHERE idNominaConcepto = :id`,
                { replacements: { name, tipo, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE }
            );

            return res.json({ status: 0, message: "Concepto modificado con éxito.", data: { id } });

        }

        await dbConnection.query(
            `INSERT INTO nomina_conceptos (name, tipo, bSistema, active, createDate, idCreateUser)
             VALUES (:name, :tipo, 0, 1, :createDate, :idCreateUser)`,
            { replacements: { name, tipo, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT }
        );

        const [nuevoRow] = await dbConnection.query(
            `SELECT idNominaConcepto AS id FROM nomina_conceptos WHERE name = :name LIMIT 1`,
            { replacements: { name }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({ status: 0, message: "Concepto creado con éxito.", data: { id: nuevoRow.id } });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const setActiveNominaConcepto = async(req, res = response) => {

    const {
        id
        , active
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        await dbConnection.query(
            `UPDATE nomina_conceptos
             SET active = :active, updateDate = :updateDate
             WHERE idNominaConcepto = :id`,
            { replacements: { active: active ? 1 : 0, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE }
        );

        res.json({
            status: 0,
            message: active ? "Concepto activado." : "Concepto inactivado (los listados base que ya lo tienen no cambian)."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const deleteNominaConcepto = async(req, res = response) => {

    const { id } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT bSistema FROM nomina_conceptos WHERE idNominaConcepto = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El concepto no existe." });
        }
        if (row[0].bSistema) {
            return res.json({ status: 1, message: "Los conceptos precargados del sistema no se pueden eliminar — inactívalo en su lugar." });
        }

        const [usos] = await dbConnection.query(
            `SELECT COUNT(*) AS n FROM empleado_conceptos_base WHERE idNominaConcepto = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (usos.n > 0) {
            return res.json({
                status: 1,
                message: `No se puede eliminar: está en el listado base de ${ usos.n } empleado(s). Inactívalo en su lugar.`
            });
        }

        await dbConnection.query(
            `DELETE FROM nomina_conceptos WHERE idNominaConcepto = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE }
        );

        res.json({ status: 0, message: "Concepto eliminado con éxito." });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

module.exports = {
    getNominaConceptosList
    , cbxGetConceptosActivos
    , insertUpdateNominaConcepto
    , setActiveNominaConcepto
    , deleteNominaConcepto
}
