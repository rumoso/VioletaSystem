const { response } = require('express');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { ID_ROL_EMPLEADO, TIPO_ROL } = require('../helpers/constantes');
const { SQL_EMPLEADO_VIGENTE } = require('../helpers/empleadoVigente');

// Datos de empleado como COMPLEMENTO del usuario
// (analisis/018-empleados-y-puestos.md). La persona es `users`; la tabla
// `empleados` guarda sus datos laborales y solo aplica a quien tiene el
// puesto de sistema "Empleado" (idRol 7). La pantalla es la de Empleados
// (antes Usuarios): aquí se captura la pestaña "Empleado", la baja
// laboral, la reactivación y la eliminación física.
//
// Queries directas sobre la dbConnection compartida — nunca
// createConexion(); multi-statement siempre con dbConnection.transaction()
// y COMMIT/ROLLBACK sin caminos abiertos.

const _fn_tienePuestoEmpleado = async(idUser, transaction) => {
    const [row] = await dbConnection.query(
        `SELECT COUNT(*) AS n FROM rolesconfig WHERE idUser = :idUser AND idRol = :idRol`,
        { replacements: { idUser, idRol: ID_ROL_EMPLEADO }, type: dbConnection.QueryTypes.SELECT, transaction }
    );
    return Number(row.n) > 0;
};

// Buscador de empleados para otras pantallas (nómina, asistencia).
// `active` = empleado vigente; `nombre` sale de users.
const getEmpleadosList = async(req, res = response) => {

    const {
        search = ''
        , pageSize = 10
        , pageIndex = 0
    } = req.body;

    try{

        const sSearch = `%${ search }%`;
        const iLimit = Number(pageSize) || 10;
        const iOffset = ( Number(pageIndex) || 0 ) * iLimit;

        const [countRow] = await dbConnection.query(
            `SELECT COUNT(*) AS iRows
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             WHERE ( :search = '%%' OR U.name LIKE :search OR U.userName LIKE :search )`,
            { replacements: { search: sSearch }, type: dbConnection.QueryTypes.SELECT }
        );

        const rows = await dbConnection.query(
            `SELECT
                E.idEmpleado AS id,
                E.idUser,
                U.name AS nombre,
                U.userName,
                E.telefono,
                E.periodicidadComisiones,
                E.horasSemana,
                IF( ${ SQL_EMPLEADO_VIGENTE }, 1, 0 ) AS active,
                DATE_FORMAT( E.fechaIngreso, '%d-%m-%Y' ) AS fechaIngresoDesc,
                DATE_FORMAT( E.fechaBaja, '%d-%m-%Y' ) AS fechaBajaDesc,
                S.name AS sucursalDesc
             FROM empleados AS E
             INNER JOIN users AS U ON U.idUser = E.idUser
             LEFT JOIN sucursales AS S ON S.idSucursal = E.idSucursal
             WHERE ( :search = '%%' OR U.name LIKE :search OR U.userName LIKE :search )
             ORDER BY active DESC, U.name ASC
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

// Registro complementario de un usuario. `data` = null si todavía no
// tiene datos de empleado; `bEsEmpleado` dice si tiene el puesto 7.
const getEmpleadoByIdUser = async(req, res = response) => {

    const { idUser } = req.body;

    try{

        const rows = await dbConnection.query(
            `SELECT
                E.idEmpleado AS id, E.idUser, E.fechaIngreso, E.fechaBaja,
                E.idSucursal, E.telefono, E.contactoEmergencia,
                E.rfc, E.curp, E.nss, E.periodicidadComisiones, E.horasSemana
             FROM empleados AS E
             WHERE E.idUser = :idUser
             LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        const bEsEmpleado = await _fn_tienePuestoEmpleado(idUser);

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: rows.length > 0 ? rows[0] : null,
            bEsEmpleado
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
};

// Alta o modificación de los datos de empleado de un usuario (por idUser).
const insertUpdateEmpleado = async(req, res = response) => {

    const {
        idUser
        , fechaIngreso
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

        if (!(await _fn_tienePuestoEmpleado(idUser))) {
            return res.json({
                status: 1,
                message: 'Para capturar datos de empleado, la persona debe tener el puesto "Empleado".'
            });
        }

        const existe = await dbConnection.query(
            `SELECT idEmpleado FROM empleados WHERE idUser = :idUser LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        const oDatos = {
            idUser, fechaIngreso, idSucursal: Number(idSucursal) > 0 ? idSucursal : null
            , telefono, contactoEmergencia, rfc, curp, nss, periodicidadComisiones
            , horasSemana: Math.round( ( Number(horasSemana) || 0 ) * 100 ) / 100
        };

        if (existe.length > 0) {

            await dbConnection.query(
                `UPDATE empleados
                 SET fechaIngreso = :fechaIngreso, idSucursal = :idSucursal, telefono = :telefono,
                     contactoEmergencia = :contactoEmergencia, rfc = :rfc, curp = :curp, nss = :nss,
                     periodicidadComisiones = :periodicidadComisiones, horasSemana = :horasSemana,
                     updateDate = :updateDate
                 WHERE idUser = :idUser`,
                { replacements: { ...oDatos, updateDate: oGetDateNow }, type: dbConnection.QueryTypes.UPDATE }
            );

            return res.json({
                status: 0,
                message: "Datos de empleado modificados con éxito.",
                data: { id: existe[0].idEmpleado }
            });

        }

        await dbConnection.query(
            `INSERT INTO empleados
                (idUser, fechaIngreso, idSucursal, telefono, contactoEmergencia, rfc, curp, nss, periodicidadComisiones, horasSemana, createDate, idCreateUser)
             VALUES
                (:idUser, :fechaIngreso, :idSucursal, :telefono, :contactoEmergencia, :rfc, :curp, :nss, :periodicidadComisiones, :horasSemana, :createDate, :idCreateUser)`,
            { replacements: { ...oDatos, createDate: oGetDateNow, idCreateUser: idUserLogON }, type: dbConnection.QueryTypes.INSERT }
        );

        const [nuevoRow] = await dbConnection.query(
            `SELECT idEmpleado AS id FROM empleados WHERE idUser = :idUser LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Datos de empleado guardados con éxito.",
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

// Qué pasa al dar de baja — para que el Front lo muestre en la
// confirmación ANTES de ejecutar. El metal a cargo va aparte como
// advertencia: hay que devolverlo o reasignarlo.
const getBajaImpacto = async(req, res = response) => {

    const { idUser } = req.body;

    try{

        const usuarios = await dbConnection.query(
            `SELECT U.name, U.userName, U.active, U.bAcceso, E.idEmpleado
             FROM users AS U
             LEFT JOIN empleados AS E ON E.idUser = U.idUser
             WHERE U.idUser = :idUser
             LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        if (usuarios.length === 0) {
            return res.json({ status: 1, message: "La persona no existe." });
        }

        const u = usuarios[0];

        const tipos = await dbConnection.query(
            `SELECT DISTINCT R.idTipoRol
             FROM rolesconfig AS RC
             INNER JOIN roles AS R ON R.idRol = RC.idRol
             WHERE RC.idUser = :idUser AND R.active = 1 AND R.idTipoRol IS NOT NULL`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );
        const aTipos = tipos.map((t) => Number(t.idTipoRol));

        const impacto = [];

        if (Number(u.bAcceso)) {
            impacto.push(`Ya no podrá iniciar sesión con el usuario "${ u.userName }" ni con su rostro`);
        }
        if (aTipos.includes(TIPO_ROL.VENDEDOR)) {
            impacto.push('Deja de aparecer en los combos de vendedor (punto de venta, taller, comisiones, reportes)');
        }
        if (aTipos.includes(TIPO_ROL.TECNICO)) {
            impacto.push('Deja de aparecer en los combos de técnico (taller, inventario de metal)');
        }
        if (aTipos.includes(TIPO_ROL.EMPLEADO)) {
            impacto.push('Sale de asistencia, del checador y de las nóminas nuevas');
        }

        const metal = await dbConnection.query(
            `SELECT P.name AS productoDesc, ROUND(MI.gramos, 2) AS gramos
             FROM metal_inventario AS MI
             INNER JOIN products AS P ON P.idProduct = MI.idProduct
             WHERE MI.tipoPropietario = 'TECNICO' AND MI.idPropietario = :idUser
               AND ROUND(MI.gramos, 2) <> 0`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                impacto,
                metalACargo: metal,
                bEsEmpleado: aTipos.includes(TIPO_ROL.EMPLEADO) || !!u.idEmpleado
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

// Baja laboral: una sola acción. users.active = 0 (sin sesión, sin
// combos, fuera de asistencia/nómina) y, si tiene datos de empleado, su
// fecha de baja. Ya no hay cascada: no existen registros paralelos.
const bajaEmpleado = async(req, res = response) => {

    const {
        idUser
        , fechaBaja = null
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    let t;

    try{

        const rows = await dbConnection.query(
            `SELECT U.active, E.idEmpleado
             FROM users AS U
             LEFT JOIN empleados AS E ON E.idUser = U.idUser
             WHERE U.idUser = :idUser
             LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return res.json({ status: 1, message: "La persona no existe." });
        }
        if (!Number(rows[0].active)) {
            return res.json({ status: 1, message: "Ya está dada de baja." });
        }
        if (rows[0].idEmpleado && !fechaBaja) {
            return res.json({ status: 1, message: "La fecha de baja es obligatoria para un empleado." });
        }

        t = await dbConnection.transaction();

        await dbConnection.query(
            `UPDATE users SET active = 0 WHERE idUser = :idUser`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
        );

        if (rows[0].idEmpleado) {
            await dbConnection.query(
                `UPDATE empleados SET fechaBaja = :fechaBaja, updateDate = :updateDate WHERE idUser = :idUser`,
                { replacements: { fechaBaja, updateDate: oGetDateNow, idUser }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
            );
        }

        // Mismo efecto que el disabledUser anterior sobre la sincronización.
        await dbConnection.query(
            `DELETE FROM sync_up WHERE tabla = 'Users' AND idRelation = :idUser`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.DELETE, transaction: t }
        );

        await t.commit();

        res.json({
            status: 0,
            message: "Baja aplicada con éxito."
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

// Reactivación: vuelve a estar activo con sus puestos, permisos y datos.
// Si tiene datos de empleado, pide nueva fecha de ingreso y limpia la baja.
const reactivarEmpleado = async(req, res = response) => {

    const {
        idUser
        , fechaIngreso = null
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    let t;

    try{

        const rows = await dbConnection.query(
            `SELECT U.active, E.idEmpleado
             FROM users AS U
             LEFT JOIN empleados AS E ON E.idUser = U.idUser
             WHERE U.idUser = :idUser
             LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return res.json({ status: 1, message: "La persona no existe." });
        }
        if (Number(rows[0].active)) {
            return res.json({ status: 1, message: "Ya está activa." });
        }
        if (rows[0].idEmpleado && !fechaIngreso) {
            return res.json({ status: 1, message: "La nueva fecha de ingreso es obligatoria para un empleado." });
        }

        t = await dbConnection.transaction();

        await dbConnection.query(
            `UPDATE users SET active = 1 WHERE idUser = :idUser`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
        );

        if (rows[0].idEmpleado) {
            await dbConnection.query(
                `UPDATE empleados
                 SET fechaIngreso = :fechaIngreso, fechaBaja = NULL, updateDate = :updateDate
                 WHERE idUser = :idUser`,
                { replacements: { fechaIngreso, updateDate: oGetDateNow, idUser }, type: dbConnection.QueryTypes.UPDATE, transaction: t }
            );
        }

        await dbConnection.query(
            `DELETE FROM sync_up WHERE tabla = 'Users' AND idRelation = :idUser`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.DELETE, transaction: t }
        );

        await t.commit();

        res.json({
            status: 0,
            message: "Reactivado con éxito."
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

// Referencias históricas que bloquean la eliminación física. Una persona
// con cualquier historial solo se puede dar de baja.
const _REFERENCIAS_HISTORICAS = [
    { sql: `SELECT COUNT(*) AS n FROM sales WHERE idSeller_idUser = :idUser OR idUserEntrega = :idUser`, desc: 'ventas' },
    { sql: `SELECT COUNT(*) AS n FROM payments WHERE idSeller_idUser = :idUser`, desc: 'pagos' },
    { sql: `SELECT COUNT(*) AS n FROM corte_caja WHERE idUser = :idUser`, desc: 'cortes de caja' },
    { sql: `SELECT COUNT(*) AS n FROM taller_mano_obra WHERE idUserTecnico = :idUser`, desc: 'mano de obra de taller' },
    { sql: `SELECT COUNT(*) AS n FROM taller_metal_final WHERE idUserTecnico = :idUser`, desc: 'metal final de taller' },
    { sql: `SELECT COUNT(*) AS n FROM taller_firmas_status WHERE idUserFirma = :idUser OR idUserCreate = :idUser`, desc: 'firmas de taller' },
    { sql: `SELECT COUNT(*) AS n FROM sobre_taller_status WHERE idUser = :idUser`, desc: 'estatus de sobres de taller' },
    { sql: `SELECT COUNT(*) AS n FROM metal_inventario WHERE tipoPropietario = 'TECNICO' AND idPropietario = :idUser`, desc: 'inventario de metal' },
    { sql: `SELECT COUNT(*) AS n FROM metal_inventario_track WHERE (tipoOrigen = 'TECNICO' AND idOrigen = :idUser) OR (tipoDestino = 'TECNICO' AND idDestino = :idUser) OR idCreateUser = :idUser`, desc: 'movimientos de metal' },
    { sql: `SELECT COUNT(*) AS n FROM comisiones_track WHERE idUser = :idUser`, desc: 'comisiones' },
    { sql: `SELECT COUNT(*) AS n FROM timecard_jornadas AS J INNER JOIN empleados AS E ON E.idEmpleado = J.idEmpleado WHERE E.idUser = :idUser`, desc: 'asistencia' },
    { sql: `SELECT COUNT(*) AS n FROM nomina_recibos WHERE idUser = :idUser`, desc: 'recibos de nómina' },
    { sql: `SELECT COUNT(*) AS n FROM inventarylog WHERE idUser = :idUser`, desc: 'bitácora de inventario' },
    { sql: `SELECT COUNT(*) AS n FROM actionslog WHERE idUser = :idUser`, desc: 'bitácora de acciones' }
];

// Eliminación física (permiso restringido empleados_Eliminar): solo si no
// hay ninguna referencia histórica. Borra a la persona y todo lo suyo en
// una transacción.
const deleteEmpleado = async(req, res = response) => {

    const { idUser } = req.body;

    let t;

    try{

        const rows = await dbConnection.query(
            `SELECT U.idUser, E.idEmpleado
             FROM users AS U
             LEFT JOIN empleados AS E ON E.idUser = U.idUser
             WHERE U.idUser = :idUser
             LIMIT 1`,
            { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
        );

        if (rows.length === 0) {
            return res.json({ status: 1, message: "La persona no existe." });
        }

        for (const ref of _REFERENCIAS_HISTORICAS) {
            const [check] = await dbConnection.query(
                ref.sql,
                { replacements: { idUser }, type: dbConnection.QueryTypes.SELECT }
            );
            if (Number(check.n) > 0) {
                return res.json({
                    status: 1,
                    message: `No se puede eliminar: tiene ${ check.n } registro(s) en ${ ref.desc }. Dalo de baja en su lugar.`
                });
            }
        }

        const idEmpleado = rows[0].idEmpleado;

        t = await dbConnection.transaction();

        const _fn_del = (sql, replacements) => dbConnection.query(
            sql, { replacements, type: dbConnection.QueryTypes.DELETE, transaction: t }
        );

        if (idEmpleado) {
            await _fn_del(`DELETE FROM empleado_conceptos_base WHERE idEmpleado = :idEmpleado`, { idEmpleado });
            await _fn_del(`DELETE FROM empleado_horarios WHERE idEmpleado = :idEmpleado`, { idEmpleado });
            await _fn_del(`DELETE FROM timecard_marcajes WHERE idEmpleado = :idEmpleado`, { idEmpleado });
            await _fn_del(`DELETE FROM empleados WHERE idEmpleado = :idEmpleado`, { idEmpleado });
        }

        await _fn_del(`DELETE FROM rolesconfig WHERE idUser = :idUser`, { idUser });
        await _fn_del(`DELETE FROM sucursalesconfig WHERE idUser = :idUser`, { idUser });
        await _fn_del(`DELETE FROM actionsconf WHERE relationType = 'U' AND idRelation = :idUser`, { idUser });
        await _fn_del(`DELETE FROM menupermisos WHERE typeRelation = 'U' AND idRelation = :idUser`, { idUser });
        await _fn_del(`DELETE FROM face_reference WHERE tipoPersona = 'USUARIO' AND idPersona = :idUser`, { idUser });
        await _fn_del(`DELETE FROM face_camera_preference WHERE idUser = :idUser`, { idUser });
        await _fn_del(`DELETE FROM user_preferences WHERE idUser = :idUser`, { idUser });
        await _fn_del(`DELETE FROM ids_by_user WHERE idUser = :idUser`, { idUser });
        await _fn_del(`DELETE FROM sync_up WHERE tabla = 'Users' AND idRelation = :idUser`, { idUser });
        await _fn_del(`DELETE FROM users WHERE idUser = :idUser`, { idUser });

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
    , getEmpleadoByIdUser
    , insertUpdateEmpleado
    , getBajaImpacto
    , bajaEmpleado
    , reactivarEmpleado
    , deleteEmpleado
    , getConceptosBase
    , insertUpdateConceptoBase
    , deleteConceptoBase
}
