const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');

// Catálogo de empleados y su listado base de conceptos de nómina
// (analisis/006-catalogo-empleados-nomina.md). Ligado 1:1 a
// users.idUser. `active` = "actualmente labora en la empresa"; la baja
// captura fechaBaja y desactiva EN CASCADA (transacción todo-o-nada)
// el usuario del sistema y los catálogos ligados al idUser (vendedor,
// técnico). Queries directas sobre la dbConnection compartida — nunca
// createConexion(); multi-statement siempre con
// dbConnection.transaction() y COMMIT/ROLLBACK sin caminos abiertos.

const getEmpleadosList = async(req, res = response) => {

    const {
        search = ''
        , pageSize = 10
        , pageIndex = 0
    } = req.body;

    try{

        const sSearch = `%${ search }%`;
        const iLimit = Number(pageSize);
        const iOffset = Number(pageIndex) * iLimit;

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             WHERE ( :search = '%%' OR E.nombre LIKE :search OR U.userName LIKE :search OR E.puesto LIKE :search )`,
            { replacements: { search: sSearch }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                E.idEmpleado AS id,
                E.idUser,
                E.nombre,
                E.puesto,
                E.telefono,
                E.periodicidadComisiones,
                E.horasSemana,
                E.active,
                DATE_FORMAT( E.fechaIngreso, '%d-%m-%Y' ) AS fechaIngresoDesc,
                DATE_FORMAT( E.fechaBaja, '%d-%m-%Y' ) AS fechaBajaDesc,
                U.userName,
                U.name AS userNombre,
                S.name AS sucursalDesc,
                IF(FR.idFaceReference IS NULL, 0, 1) AS bTieneRostro
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             LEFT JOIN sucursales AS S ON S.idSucursal = E.idSucursal
             LEFT JOIN face_reference AS FR ON FR.tipoPersona = 'USUARIO' AND FR.idPersona = E.idUser
             WHERE ( :search = '%%' OR E.nombre LIKE :search OR U.userName LIKE :search OR E.puesto LIKE :search )
             ORDER BY E.active DESC, E.nombre ASC
             LIMIT :offset, :limit`,
            { replacements: { search: sSearch, offset: iOffset, limit: iLimit }, type: dbConnection.QueryTypes.SELECT }
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

const getEmpleadoById = async(req, res = response) => {

    const { id } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT
                E.idEmpleado AS id, E.idUser, E.nombre, E.fechaIngreso, E.fechaBaja,
                E.puesto, E.idSucursal, E.telefono, E.contactoEmergencia,
                E.rfc, E.curp, E.nss, E.periodicidadComisiones, E.horasSemana, E.active,
                U.userName, U.name AS userNombre,
                IF(FR.idFaceReference IS NULL, 0, 1) AS bTieneRostro
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             LEFT JOIN face_reference AS FR ON FR.tipoPersona = 'USUARIO' AND FR.idPersona = E.idUser
             WHERE E.idEmpleado = :id
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

const insertUpdateEmpleado = async(req, res = response) => {

    const {
        id = 0
        , idUser
        , nombre
        , fechaIngreso
        , puesto = null
        , idSucursal = null
        , telefono = null
        , contactoEmergencia = null
        , rfc = null
        , curp = null
        , nss = null
        , periodicidadComisiones = 'SEMANA'
        , horasSemana = 48

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        const [dupUser] = await dbConnection.query(
            `SELECT COUNT(*) AS n FROM empleados
             WHERE idUser = :idUser AND idEmpleado <> :id`,
            { replacements: { idUser, id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (dupUser.n > 0) {
            return res.json({
                status: 1,
                message: "Ese usuario ya está ligado a otro empleado."
            });
        }

        if (id > 0) {

            await dbConnection.query(
                `UPDATE empleados
                 SET idUser = :idUser, nombre = :nombre, fechaIngreso = :fechaIngreso,
                     puesto = :puesto, idSucursal = :idSucursal, telefono = :telefono,
                     contactoEmergencia = :contactoEmergencia, rfc = :rfc, curp = :curp, nss = :nss,
                     periodicidadComisiones = :periodicidadComisiones, horasSemana = :horasSemana,
                     updateDate = :updateDate
                 WHERE idEmpleado = :id`,
                { replacements: { idUser, nombre, fechaIngreso, puesto, idSucursal, telefono, contactoEmergencia, rfc, curp, nss, periodicidadComisiones, horasSemana, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE }
            );

            return res.json({
                status: 0,
                message: "Modificado con éxito.",
                data: { id }
            });

        }

        await dbConnection.query(
            `INSERT INTO empleados
                (idUser, nombre, fechaIngreso, puesto, idSucursal, telefono, contactoEmergencia, rfc, curp, nss, periodicidadComisiones, horasSemana, active, createDate, idCreateUser)
             VALUES
                (:idUser, :nombre, :fechaIngreso, :puesto, :idSucursal, :telefono, :contactoEmergencia, :rfc, :curp, :nss, :periodicidadComisiones, :horasSemana, 1, :createDate, :idCreateUser)`,
            { replacements: { idUser, nombre, fechaIngreso, puesto, idSucursal, telefono, contactoEmergencia, rfc, curp, nss, periodicidadComisiones, horasSemana, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT }
        );

        const [nuevoRow] = await dbConnection.query(
            `SELECT idEmpleado AS id FROM empleados WHERE idUser = :idUser LIMIT 1`,
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

// Qué se desactivará en cascada al dar de baja — para que el Front lo
// muestre en la confirmación ANTES de ejecutar.
const getBajaImpacto = async(req, res = response) => {

    const { id } = req.body;

    try{

        const row = await dbConnection.query(
            `SELECT
                E.idUser,
                U.userName,
                U.active AS userActive,
                V.idVendedor,
                V.active AS vendedorActive,
                T.idTecnico,
                T.active AS tecnicoActive
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             LEFT JOIN vendedores AS V ON V.idUser = E.idUser
             LEFT JOIN tecnicos AS T ON T.idUser = E.idUser
             WHERE E.idEmpleado = :id
             LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El empleado no existe." });
        }

        const r = row[0];
        const impacto = [];

        if (r.userActive) {
            impacto.push(`El usuario del sistema "${ r.userName }" (ya no podrá iniciar sesión)`);
        }
        if (r.idVendedor && r.vendedorActive) {
            impacto.push('Su registro en el catálogo de vendedores');
        }
        if (r.idTecnico && r.tecnicoActive) {
            impacto.push('Su registro en el catálogo de técnicos');
        }

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: impacto
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Baja laboral EN CASCADA (transacción todo-o-nada): empleado
// inactivo + fechaBaja, usuario del sistema desactivado, y registros
// de vendedor/técnico del mismo idUser desactivados.
const bajaEmpleado = async(req, res = response) => {

    const {
        id
        , fechaBaja
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    let t;

    try{

        const row = await dbConnection.query(
            `SELECT idUser, active FROM empleados WHERE idEmpleado = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El empleado no existe." });
        }
        if (!row[0].active) {
            return res.json({ status: 1, message: "El empleado ya está dado de baja." });
        }

        const idUser = row[0].idUser;

        t = await dbConnection.transaction();

        await dbConnection.query(
            `UPDATE empleados SET active = 0, fechaBaja = :fechaBaja, updateDate = :updateDate WHERE idEmpleado = :id`,
            { replacements: { fechaBaja, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
        );

        await dbConnection.query(
            `UPDATE users SET active = 0 WHERE idUser = :idUser`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
        );

        await dbConnection.query(
            `UPDATE vendedores SET active = 0, updateDate = :updateDate WHERE idUser = :idUser AND active = 1`,
            { replacements: { idUser, updateDate: oGetDateNow }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
        );

        await dbConnection.query(
            `UPDATE tecnicos SET active = 0, updateDate = :updateDate WHERE idUser = :idUser AND active = 1`,
            { replacements: { idUser, updateDate: oGetDateNow }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
        );

        await t.commit();

        res.json({
            status: 0,
            message: "Baja aplicada: empleado, usuario del sistema y catálogos ligados quedaron desactivados."
        });

    }catch(error){

        if (t) {
            await t.rollback();
        }

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Reactivación: SOLO el empleado (nueva fecha de ingreso, limpia la
// baja). El usuario y los demás catálogos se reactivan a mano.
const reactivarEmpleado = async(req, res = response) => {

    const {
        id
        , fechaIngreso
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        const row = await dbConnection.query(
            `SELECT active FROM empleados WHERE idEmpleado = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El empleado no existe." });
        }
        if (row[0].active) {
            return res.json({ status: 1, message: "El empleado ya está activo." });
        }

        await dbConnection.query(
            `UPDATE empleados
             SET active = 1, fechaIngreso = :fechaIngreso, fechaBaja = NULL, updateDate = :updateDate
             WHERE idEmpleado = :id`,
            { replacements: { fechaIngreso, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE }
        );

        res.json({
            status: 0,
            message: "Empleado reactivado. Recuerda reactivar a mano su usuario y catálogos si aplica."
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Eliminación física (permiso restringido): borra al empleado y su
// listado base en una transacción. Punto único para checks de
// historial futuros (nóminas generadas, etc.).
const deleteEmpleado = async(req, res = response) => {

    const { id } = req.body;

    let t;

    try{

        const row = await dbConnection.query(
            `SELECT idUser FROM empleados WHERE idEmpleado = :id LIMIT 1`,
            { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (row.length === 0) {
            return res.json({ status: 1, message: "El empleado no existe." });
        }

        // Checks de historial que bloquean el borrado físico. Cuando
        // exista el módulo de nómina, agregar aquí sus verificaciones
        // (recibos generados, préstamos con saldo, etc.).
        const referencias = [];

        for (const ref of referencias) {
            const [check] = await dbConnection.query(
                ref.sql,
                { replacements: { id }, type: dbConnection.QueryTypes.SELECT }
            );
            if (check.n > 0) {
                return res.json({
                    status: 1,
                    message: `No se puede eliminar: tiene ${ check.n } registro(s) en ${ ref.desc }. Dalo de baja en su lugar.`
                });
            }
        }

        t = await dbConnection.transaction();

        await dbConnection.query(
            `DELETE FROM empleado_conceptos_base WHERE idEmpleado = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE, transaction: t }
        );

        await dbConnection.query(
            `DELETE FROM empleados WHERE idEmpleado = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE, transaction: t }
        );

        await t.commit();

        res.json({
            status: 0,
            message: "Eliminado definitivamente con éxito."
        });

    }catch(error){

        if (t) {
            await t.rollback();
        }

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// ---- Listado base de conceptos por empleado ----

const getConceptosBase = async(req, res = response) => {

    const { idEmpleado } = req.body;

    try{

        const rows = await dbConnection.query(
            `SELECT
                B.idEmpleadoConceptoBase AS id,
                B.idNominaConcepto,
                B.monto,
                C.name AS conceptoDesc,
                C.tipo,
                C.active AS conceptoActive
             FROM empleado_conceptos_base AS B
             INNER JOIN nomina_conceptos AS C ON C.idNominaConcepto = B.idNominaConcepto
             WHERE B.idEmpleado = :idEmpleado
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

const insertUpdateConceptoBase = async(req, res = response) => {

    const {
        id = 0
        , idEmpleado
        , idNominaConcepto
        , monto

        , idUserLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if (Number(monto) <= 0) {
            return res.json({ status: 1, message: "El monto debe ser mayor a cero." });
        }

        // El concepto debe existir y estar activo para agregarse
        const concepto = await dbConnection.query(
            `SELECT active FROM nomina_conceptos WHERE idNominaConcepto = :idNominaConcepto LIMIT 1`,
            { replacements: { idNominaConcepto }, type: dbConnection.QueryTypes.SELECT }
        );

        if (concepto.length === 0) {
            return res.json({ status: 1, message: "El concepto no existe." });
        }
        if (id === 0 && !concepto[0].active) {
            return res.json({ status: 1, message: "El concepto está inactivo — no se puede agregar a listados nuevos." });
        }

        // Concepto único en el listado base del empleado
        const [dup] = await dbConnection.query(
            `SELECT COUNT(*) AS n FROM empleado_conceptos_base
             WHERE idEmpleado = :idEmpleado AND idNominaConcepto = :idNominaConcepto AND idEmpleadoConceptoBase <> :id`,
            { replacements: { idEmpleado, idNominaConcepto, id }, type: dbConnection.QueryTypes.SELECT }
        );

        if (dup.n > 0) {
            return res.json({ status: 1, message: "El empleado ya tiene ese concepto en su listado base." });
        }

        if (id > 0) {

            await dbConnection.query(
                `UPDATE empleado_conceptos_base
                 SET idNominaConcepto = :idNominaConcepto, monto = :monto, updateDate = :updateDate
                 WHERE idEmpleadoConceptoBase = :id`,
                { replacements: { idNominaConcepto, monto, updateDate: oGetDateNow, id }, type: dbConnection.QueryTypes.UPDATE }
            );

            return res.json({ status: 0, message: "Concepto modificado con éxito." });

        }

        await dbConnection.query(
            `INSERT INTO empleado_conceptos_base (idEmpleado, idNominaConcepto, monto, createDate, idCreateUser)
             VALUES (:idEmpleado, :idNominaConcepto, :monto, :createDate, :idCreateUser)`,
            { replacements: { idEmpleado, idNominaConcepto, monto, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT }
        );

        res.json({ status: 0, message: "Concepto agregado con éxito." });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

const deleteConceptoBase = async(req, res = response) => {

    const { id } = req.body;

    try{

        await dbConnection.query(
            `DELETE FROM empleado_conceptos_base WHERE idEmpleadoConceptoBase = :id`,
            { replacements: { id }, type: dbConnection.QueryTypes.DELETE }
        );

        res.json({ status: 0, message: "Concepto quitado del listado base." });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

module.exports = {
    getEmpleadosList
    , getEmpleadoById
    , insertUpdateEmpleado
    , getBajaImpacto
    , bajaEmpleado
    , reactivarEmpleado
    , deleteEmpleado
    , getConceptosBase
    , insertUpdateConceptoBase
    , deleteConceptoBase
}
