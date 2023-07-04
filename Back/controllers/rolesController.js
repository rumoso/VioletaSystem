const { response } = require('express');
const bcryptjs = require('bcryptjs');

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

  


module.exports = {
    getRolesForAddUser
    , getRolesByIdUser
    , insertRolByIdUser
    , deleteRolByIdUser
  }