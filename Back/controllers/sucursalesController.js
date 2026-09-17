const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');
const { SQL_EMPLEADO_VIGENTE } = require('../helpers/empleadoVigente');


const getSucursalesForAddUser = async(req, res = response) => {

  const {
    search = ''
    , idUser
  } = req.body;

  //console.log(req.body)
  var OSQL = await dbConnection.query(`call getSucursalesForAddUser( '${search}' , ${ idUser })`)

  if(OSQL.length == 0){

        res.json({
            status:3,
            message:"No se encontró información.",
            data: null
        });

    }
    else{

        res.json({
            status:0,
            message:"Ejecutado correctamente.",
            data: OSQL
        });

    }

};

const getSucursalesByIdUser = async(req, res = response) => {

    const {
      idUser
    } = req.body;
  
    //console.log(req.body)
    var OSQL = await dbConnection.query(`call getSucursalesByIdUser( ${ idUser } )`)
  
    if(OSQL.length == 0){
  
          res.json({
              status:0,
              message:"No se encontró información.",
              data: null
          });
  
      }
      else{
  
          res.json({
              status:0,
              message:"Ejecutado correctamente.",
              data: OSQL
          });
  
      }
  
  };

  const insertSucursalByIdUser = async(req, res = response) => {

    const {
      idUser
      , idSucursal
    } = req.body;

    try{

        //console.log(req.body)
        var OSQL = await dbConnection.query(`call insertSucursalByIdUser( ${ idUser }, ${ idSucursal } )`)
      
        if(OSQL.length == 0){
      
              res.json({
                  status:0,
                  message:"No se encontró información.",
                  data: null
              });
      
          }
          else{
      
              res.json({
                  status:0,
                  message: OSQL[0].message,
                  data: OSQL
              });
      
          }

    }catch(error){
            
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }
  
  };

  const deleteSucursalByIdUser = async(req, res = response) => {

    const {
      idUser
      , idSucursal
    } = req.body;
  
    //console.log(req.body)
    var OSQL = await dbConnection.query(`call deleteSucursalByIdUser( ${ idUser }, ${ idSucursal } )`)
  
    if(OSQL.length == 0){
  
          res.json({
              status:0,
              message:"No se encontró información.",
              data: null
          });
  
      }
      else{
  
          res.json({
              status:0,
              message:"Eliminado correctamente.",
              data: OSQL
          });
  
      }
  
  };

  const cbxGetSucursalesCombo = async(req, res = response) => {

    const {
        idUser,
        search = ''
    } = req.body;
  
    //console.log(req.body)
    var OSQL = await dbConnection.query(`call cbxGetSucursalesCombo( '${search}', ${idUser} )`)
  
    if(OSQL.length == 0){
  
          res.json({
              status:3,
              message:"No se encontró información.",
              data: null
          });
  
      }
      else{
  
          res.json({
              status:0,
              message:"Ejecutado correctamente.",
              data: OSQL
          });
  
      }
  
  };

  const getPrintTicketSuc = async(req, res = response) => {

    const {
        idSucursal,
        type = ''
    } = req.body;
  
    //console.log(req.body)
    var OSQL = await dbConnection.query(`call getPrintTicketSuc( ${idSucursal}, '${type}' )`)
  
    if(OSQL.length == 0){
  
          res.json({
              status:3,
              message:"No se encontró información.",
              data: null
          });
  
      }
      else{
  
          res.json({
              status:0,
              message:"Ejecutado correctamente.",
              data: OSQL
          });
  
      }
  
  };


//////////////////////////////////////////////////////////////////////////////////////////////////
// CATÁLOGO DE SUCURSALES (analisis/021-catalogo-sucursales.md)
//
// Lista, alta, edición y activación de sucursales. El horario semanal de
// la sucursal NO vive aquí: se sigue guardando con los endpoints de
// TimeCard (getHorarioSucursal / guardarHorarioSucursal), que son los que
// ya usa el cálculo de asistencia.
//
// Todas las rutas exigen sesión (validarSesion). Las que escriben exigen
// además la acción `sucursales_CrearModificar`, revisada aquí: el menú
// solo decide si el renglón aparece, no protege el endpoint.
//
// Queries directas sobre `dbConnection` — nunca createConexion().
//////////////////////////////////////////////////////////////////////////////////////////////////

const ACCION_CREAR_MODIFICAR = 'sucursales_CrearModificar';

// ¿El usuario tiene la acción? Por puesto ('R') o directa ('U'), con las
// DOS banderas active: A.active (la acción existe) y AC.active (la
// asignación sigue vigente — la pantalla de permisos revoca poniendo 0).
const _fn_tieneAccion = async(idUser, actionName) => {

    const filas = await dbConnection.query(
        `SELECT 1 AS ok
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON AC.idAction = A.idAction AND AC.relationType = 'R' AND AC.active = 1
         INNER JOIN rolesconfig AS RC ON RC.idRol = AC.idRelation
         WHERE A.name = :actionName AND A.active = 1 AND RC.idUser = :idUser
         UNION
         SELECT 1 AS ok
         FROM actions AS A
         INNER JOIN actionsconf AS AC ON AC.idAction = A.idAction AND AC.relationType = 'U' AND AC.active = 1
         WHERE A.name = :actionName AND A.active = 1 AND AC.idRelation = :idUser
         LIMIT 1`,
        { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
    );

    return filas.length > 0;

};

// Nombre comparable: sin espacios de sobra y sin distinguir mayúsculas.
const _fn_normalizarNombre = (sNombre) => String(sNombre || '').trim().replace(/\s+/g, ' ');

// ── Lista ──
// Con cuántos empleados vigentes tiene asignados, cuántos usuarios tienen
// acceso y su horario (los días que trabaja), para el resumen de la lista.
const getSucursalesList = async(req, res = response) => {

    const {
        search = ''
        , bIncluirInactivas = false
    } = req.body;

    try {

        const sBusqueda = String(search || '').trim();
        const iIncluirInactivas = ( bIncluirInactivas === true || bIncluirInactivas === 'true' || bIncluirInactivas == 1 ) ? 1 : 0;

        const rows = await dbConnection.query(
            `SELECT
                S.idSucursal
                , S.name
                , IFNULL( S.description, '' ) AS description
                , IFNULL( S.address, '' ) AS address
                , IFNULL( S.active, 0 ) AS active
                , S.createDate
                , ( SELECT COUNT(*)
                    FROM empleados AS E
                    INNER JOIN users AS U ON U.idUser = E.idUser
                    WHERE E.idSucursal = S.idSucursal AND ${ SQL_EMPLEADO_VIGENTE } ) AS empleados
                , ( SELECT COUNT(*) FROM sucursalesconfig AS SC WHERE SC.idSucursal = S.idSucursal ) AS usuariosConAcceso
             FROM sucursales AS S
             WHERE ( :iIncluirInactivas = 1 OR S.active = 1 )
               AND ( :sBusqueda = ''
                     OR S.name LIKE CONCAT('%', :sBusqueda, '%')
                     OR S.description LIKE CONCAT('%', :sBusqueda, '%')
                     OR S.address LIKE CONCAT('%', :sBusqueda, '%') )
             ORDER BY S.active DESC, S.name ASC`,
            { replacements: { sBusqueda, iIncluirInactivas }, type: dbConnection.QueryTypes.SELECT }
        );

        const horarios = rows.length === 0 ? [] : await dbConnection.query(
            `SELECT idSucursal, diaSemana, horaEntrada, horaSalida
             FROM sucursal_horarios
             WHERE idSucursal IN (:ids)
             ORDER BY idSucursal, diaSemana`,
            { replacements: { ids: rows.map((r) => r.idSucursal) }, type: dbConnection.QueryTypes.SELECT }
        );

        rows.forEach((r) => {
            r.active = Number(r.active);
            r.empleados = Number(r.empleados) || 0;
            r.usuariosConAcceso = Number(r.usuariosConAcceso) || 0;
            r.horario = horarios
                .filter((h) => h.idSucursal === r.idSucursal)
                .map((h) => ({ diaSemana: Number(h.diaSemana), horaEntrada: h.horaEntrada, horaSalida: h.horaSalida }));
        });

        res.json({ status: 0, message: "Ejecutado correctamente.", data: { rows, count: rows.length } });

    } catch (error) {

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

// ── Una sucursal ──
const getSucursalByID = async(req, res = response) => {

    const { idSucursal = 0 } = req.body;

    try {

        const [oSucursal] = await dbConnection.query(
            `SELECT
                S.idSucursal
                , S.name
                , IFNULL( S.description, '' ) AS description
                , IFNULL( S.address, '' ) AS address
                , IFNULL( S.active, 0 ) AS active
                , S.createDate
                , ( SELECT COUNT(*)
                    FROM empleados AS E
                    INNER JOIN users AS U ON U.idUser = E.idUser
                    WHERE E.idSucursal = S.idSucursal AND ${ SQL_EMPLEADO_VIGENTE } ) AS empleados
                , ( SELECT COUNT(*) FROM sucursalesconfig AS SC WHERE SC.idSucursal = S.idSucursal ) AS usuariosConAcceso
             FROM sucursales AS S
             WHERE S.idSucursal = :idSucursal
             LIMIT 1`,
            { replacements: { idSucursal }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!oSucursal) {
            return res.json({ status: 1, message: "No se encontró la sucursal.", data: null });
        }

        oSucursal.active = Number(oSucursal.active);
        oSucursal.empleados = Number(oSucursal.empleados) || 0;
        oSucursal.usuariosConAcceso = Number(oSucursal.usuariosConAcceso) || 0;

        res.json({ status: 0, message: "Ejecutado correctamente.", data: oSucursal });

    } catch (error) {

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

// ── Alta y edición ──
// idSucursal = 0 es alta. Regresa el idSucursal para que el Front guarde
// enseguida el horario con él.
const saveSucursal = async(req, res = response) => {

    const {
        idSucursal = 0
        , name = ''
        , description = ''
        , address = ''
    } = req.body;

    const idUser = req.idUserSesion;
    const nIdSucursal = Number(idSucursal) || 0;

    const sNombre = _fn_normalizarNombre(name);
    const sDescripcion = String(description || '').trim();
    const sDireccion = String(address || '').trim();

    if (!sNombre) {
        return res.json({ status: 1, message: "El nombre de la sucursal es obligatorio." });
    }

    if (sNombre.length > 500 || sDescripcion.length > 500 || sDireccion.length > 500) {
        return res.json({ status: 1, message: "El nombre, la descripción y la dirección aceptan hasta 500 caracteres." });
    }

    try {

        if (!(await _fn_tieneAccion(idUser, ACCION_CREAR_MODIFICAR))) {
            return res.json({ status: 1, message: "No tienes permiso para crear o modificar sucursales." });
        }

        // El nombre no se repite: se compara sin mayúsculas y sin espacios
        // de sobra, contra activas e inactivas.
        const aSucursales = await dbConnection.query(
            `SELECT idSucursal, name FROM sucursales WHERE idSucursal <> :idSucursal`,
            { replacements: { idSucursal: nIdSucursal }, type: dbConnection.QueryTypes.SELECT }
        );

        const oRepetida = aSucursales.find((s) => _fn_normalizarNombre(s.name).toLowerCase() === sNombre.toLowerCase());

        if (oRepetida) {
            return res.json({ status: 1, message: `Ya existe una sucursal con el nombre "${ oRepetida.name }".` });
        }

        if (nIdSucursal > 0) {

            const [oExiste] = await dbConnection.query(
                `SELECT idSucursal FROM sucursales WHERE idSucursal = :idSucursal LIMIT 1`,
                { replacements: { idSucursal: nIdSucursal }, type: dbConnection.QueryTypes.SELECT }
            );

            if (!oExiste) {
                return res.json({ status: 1, message: "No se encontró la sucursal." });
            }

            await dbConnection.query(
                `UPDATE sucursales
                 SET name = :name, description = :description, address = :address
                 WHERE idSucursal = :idSucursal`,
                {
                    replacements: { name: sNombre, description: sDescripcion || null, address: sDireccion || null, idSucursal: nIdSucursal },
                    type: dbConnection.QueryTypes.UPDATE
                }
            );

            return res.json({ status: 0, message: "Sucursal guardada con éxito.", data: { idSucursal: nIdSucursal } });
        }

        // Alta: la sucursal y el acceso de quien la crea van juntos. Sin el
        // acceso, las listas que filtran por las sucursales del usuario no
        // se la mostrarían ni a quien la dio de alta.
        const transaction = await dbConnection.transaction();

        try {

            await dbConnection.query(
                `INSERT INTO sucursales (createDate, name, description, address, active)
                 VALUES (NOW(), :name, :description, :address, 1)`,
                {
                    replacements: { name: sNombre, description: sDescripcion || null, address: sDireccion || null },
                    type: dbConnection.QueryTypes.INSERT,
                    transaction
                }
            );

            const [oNueva] = await dbConnection.query(
                `SELECT LAST_INSERT_ID() AS idSucursal`,
                { type: dbConnection.QueryTypes.SELECT, transaction }
            );

            await dbConnection.query(
                `INSERT INTO sucursalesconfig (createDate, idUser, idSucursal)
                 SELECT NOW(), :idUser, :idSucursal
                 FROM DUAL
                 WHERE NOT EXISTS ( SELECT 1 FROM sucursalesconfig WHERE idUser = :idUser AND idSucursal = :idSucursal )`,
                {
                    replacements: { idUser, idSucursal: oNueva.idSucursal },
                    type: dbConnection.QueryTypes.INSERT,
                    transaction
                }
            );

            await transaction.commit();

            res.json({ status: 0, message: "Sucursal creada con éxito.", data: { idSucursal: Number(oNueva.idSucursal) } });

        } catch (errorTx) {
            await transaction.rollback();
            throw errorTx;
        }

    } catch (error) {

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

// ── Activar / desactivar ──
// No se borran: 25 tablas referencian idSucursal.
const setSucursalActiva = async(req, res = response) => {

    const {
        idSucursal = 0
        , active = 1
        , idSucursalTerminal = 0
    } = req.body;

    const idUser = req.idUserSesion;
    const nIdSucursal = Number(idSucursal) || 0;
    const bActivar = ( active === true || active === 'true' || Number(active) === 1 );

    try {

        if (!(await _fn_tieneAccion(idUser, ACCION_CREAR_MODIFICAR))) {
            return res.json({ status: 1, message: "No tienes permiso para crear o modificar sucursales." });
        }

        const [oSucursal] = await dbConnection.query(
            `SELECT idSucursal, name, IFNULL(active, 0) AS active FROM sucursales WHERE idSucursal = :idSucursal LIMIT 1`,
            { replacements: { idSucursal: nIdSucursal }, type: dbConnection.QueryTypes.SELECT }
        );

        if (!oSucursal) {
            return res.json({ status: 1, message: "No se encontró la sucursal." });
        }

        if (!bActivar) {

            // La sucursal de esta terminal: desactivarla la dejaría sin
            // poder operar desde aquí.
            if (Number(idSucursalTerminal) === nIdSucursal) {
                return res.json({ status: 1, message: `No se puede desactivar "${ oSucursal.name }": es la sucursal de esta terminal.` });
            }

            const [oActivas] = await dbConnection.query(
                `SELECT COUNT(*) AS n FROM sucursales WHERE active = 1 AND idSucursal <> :idSucursal`,
                { replacements: { idSucursal: nIdSucursal }, type: dbConnection.QueryTypes.SELECT }
            );

            if (Number(oActivas.n) === 0) {
                return res.json({ status: 1, message: `No se puede desactivar "${ oSucursal.name }": es la única sucursal activa.` });
            }
        }

        await dbConnection.query(
            `UPDATE sucursales SET active = :active WHERE idSucursal = :idSucursal`,
            { replacements: { active: bActivar ? 1 : 0, idSucursal: nIdSucursal }, type: dbConnection.QueryTypes.UPDATE }
        );

        res.json({
            status: 0,
            message: bActivar ? "Sucursal activada." : "Sucursal desactivada.",
            data: { idSucursal: nIdSucursal, active: bActivar ? 1 : 0 }
        });

    } catch (error) {

        res.json({ status: 2, message: "Sucedió un error inesperado", data: error.message });

    }
};

module.exports = {
    getSucursalesForAddUser
    ,getSucursalesByIdUser
    ,cbxGetSucursalesCombo
    ,insertSucursalByIdUser
    ,deleteSucursalByIdUser
    ,getPrintTicketSuc
    ,getSucursalesList
    ,getSucursalByID
    ,saveSucursal
    ,setSucursalActiva
  }