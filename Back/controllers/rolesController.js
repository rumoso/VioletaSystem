const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { dbConnection } = require('../database/config');
const { TIPO_ROL } = require('../helpers/constantes');


const getRolesForAddUser = async(req, res = response) => {

  const {
    search = ''
    , idUser
  } = req.body;

  //console.log(req.body)
  var OSQL = await dbConnection.query(`call getRolesForAddUser( '${search}' , ${ idUser })`)

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

const getRolesByIdUser = async(req, res = response) => {

    const {
      idUser
    } = req.body;
  
    //console.log(req.body)
    var OSQL = await dbConnection.query(`call getRolesByIdUser( ${ idUser } )`)
  
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

const insertRolByIdUser = async(req, res = response) => {

    const {
        idUser
        , idRol
    } = req.body;

    try{

        //console.log(req.body)
        var OSQL = await dbConnection.query(`call insertRolByIdUser( ${ idUser }, ${ idRol } )`)
        
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

const deleteRolByIdUser = async(req, res = response) => {

    const {
        idUser
        , idRol
    } = req.body;

    //console.log(req.body)
    var OSQL = await dbConnection.query(`call deleteRolByIdUser( ${ idUser }, ${ idRol } )`)

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

const getRolesListWithPage = async(req, res = response) => {

    const idUserLogON = req.header('idUserLogON')

    const {
        search = '', limiter = 10, start = 0
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(
            `call getRolesListWithPage(:search, :start, :limiter)`,
            { replacements: { search, start: Number(start) || 0, limiter: Number(limiter) || 10 }, type: dbConnection.QueryTypes.RAW }
        )

        if(OSQL.length == 0){

            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data:{
                count: 0,
                rows: null
                }
            });

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );
            
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL
                }
            });
            
        }
        
    }catch(error){
        
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const insertRol = async(req, res) => {
    
    const {
        name = '',
        description = '',
        idTipoRol = null,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        // El SP rechaza el tipo 3: es exclusivo del puesto de sistema.
        var OSQL = await dbConnection.query(
            `call insertRol(:oGetDateNow, :name, :description, :idTipoRol, :idUserLogON)`,
            {
                replacements: { oGetDateNow, name, description, idTipoRol: Number(idTipoRol) > 0 ? Number(idTipoRol) : null, idUserLogON },
                type: dbConnection.QueryTypes.RAW
            }
        )

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message,
            insertID: OSQL[0].out_id
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const updateRol = async(req, res) => {
   
    const {
        idRol,
        name = '',
        description = '',
        active,
        idTipoRol = null
    } = req.body;

    try{

        // El SP protege los puestos de sistema (bSistema = 1): no cambian
        // nombre, tipo ni estatus.
        var OSQL = await dbConnection.query(
            `call updateRol(:idRol, :name, :description, :active, :idTipoRol)`,
            {
                replacements: { idRol, name, description, active: active ? 1 : 0, idTipoRol: Number(idTipoRol) > 0 ? Number(idTipoRol) : null },
                type: dbConnection.QueryTypes.RAW
            }
        )

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getRolByID = async(req, res = response) => {

    const {
        idRol
    } = req.body;

    //console.log(req.body)

    try{
        
        var OSQL = await dbConnection.query(`call getRolByID(:idRol)`, { replacements: { idRol }, type: dbConnection.QueryTypes.RAW })

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró el usuario.",
                data: null
            });

        }
        else{

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: OSQL[0]
            });

        }
        
    }catch(error){
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};


// Tipos de puesto asignables desde la pantalla de Puestos. El tipo 3
// (EMPLEADO) no se lista: es exclusivo del puesto de sistema "Empleado".
const cbxGetTiposRol = async(req, res = response) => {

    try {

        const rows = await dbConnection.query(
            `SELECT idTipoRol, clave, nombre
             FROM roles_tipo
             WHERE active = 1 AND idTipoRol <> :idTipoEmpleado
             ORDER BY idTipoRol`,
            { replacements: { idTipoEmpleado: TIPO_ROL.EMPLEADO }, type: dbConnection.QueryTypes.SELECT }
        );

        res.json({ status: 0, message: 'Ejecutado correctamente.', data: rows });

    } catch (error) {
        res.json({ status: 2, message: 'Sucedió un error inesperado', data: error.message });
    }
};

module.exports = {
    cbxGetTiposRol
    , getRolesForAddUser
    , getRolesByIdUser
    , insertRolByIdUser
    , deleteRolByIdUser

    , getRolesListWithPage
    , insertRol
    , updateRol
    , getRolByID
}