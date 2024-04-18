const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { dbConnection } = require('../database/config');


const getRolesForAddUser = async(req, res = response) => {

  const {
    search = ''
    , idUser
  } = req.body;

  console.log(req.body)
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
  
    console.log(req.body)
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

        console.log(req.body)
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

    console.log(req.body)
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

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getRolesListWithPage('${ search }',${ start },${ limiter })`)

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

        idUserLogON,
        idSucursalLogON
        
    } = req.body;

    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call insertRol(
            '${ oGetDateNow }'
            , '${ name }'
            , '${ description }'

            , ${ idUserLogON }
        )`)

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
        active
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call updateRol(
        ${ idRol }
        ,'${ name }'
        ,'${ description }'
        , ${ active }
        )`)

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

    console.log(req.body)

    try{
        
        var OSQL = await dbConnection.query(`call getRolByID(${ idRol })`)

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


module.exports = {
    getRolesForAddUser
    , getRolesByIdUser
    , insertRolByIdUser
    , deleteRolByIdUser

    , getRolesListWithPage
    , insertRol
    , updateRol
    , getRolByID
}