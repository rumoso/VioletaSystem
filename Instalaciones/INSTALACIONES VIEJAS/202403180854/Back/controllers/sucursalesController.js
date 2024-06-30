const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');


const getSucursalesForAddUser = async(req, res = response) => {

  const {
    search = ''
    , idUser
  } = req.body;

  console.log(req.body)
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
  
    console.log(req.body)
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

        console.log(req.body)
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
  
    console.log(req.body)
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
  
    console.log(req.body)
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
  
    console.log(req.body)
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

module.exports = {
    getSucursalesForAddUser
    ,getSucursalesByIdUser
    ,cbxGetSucursalesCombo
    ,insertSucursalByIdUser
    ,deleteSucursalByIdUser
    ,getPrintTicketSuc
  }