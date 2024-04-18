const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');

const getPrintersBySec = async(req, res = response) => {

    const {
        idUser
        , search = ''
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPrintersBySec( ${ idUser }, '${ search }' )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se encontró información.",
            });
    
        }
        else{
    
            res.json({
                status: 0,
                message:"Ejecutado correctamente.",
                data: OSQL
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

const getSelectPrinterByIdUser = async(req, res = response) => {

    const {
        idUser
    } = req.body;

    console.log(req.body)

    try
    {

        var OSQL = await dbConnection.query(`call getSelectPrinterByIdUser( ${ idUser } )`)

        if(OSQL.length == 0)
        {

            res.json({
            status: 1,
            message: "No tiene caja seleccionada.",
            data: null
            });

        }
        else
        {

            res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: OSQL[0]
            });

        }

    
    }
    catch( error ){
        
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const insertSelectPrinter = async(req, res) => {

    const {
      idUser
      , idPrinter

      , idUserLogON
      , idSucursalLogON
    } = req.body;
  
    console.log(req.body)
  
    try{
  
        var OSQL = await dbConnection.query(`call insertSelectPrinter(
            ${ idUser }
            , ${ idPrinter }
            , 1
            , ${ idUserLogON }
            )`)
  
          if(OSQL.length == 0){
    
              res.json({
                  status:1,
                  message:"No se registró."
              });
      
          }
          else{
  
              res.json({
                  status: OSQL[0].out_id > 0 ? 0 : 1,
                  message: OSQL[0].message,
                  insertID: OSQL[0].out_id
              });
      
          }
        
    }catch(error){
  
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
  }
  
const deleteSelectPrinter = async(req, res) => {
    
    const {
        idUser
        , idPrinter
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call deleteSelectPrinter(
            ${ idUser }
            , ${ idPrinter }
            , 1
            )`)

        res.json({
            status: 0,
            message: "Se guardó con éxito.",
            insertID: OSQL[0].iRows
        });
        
    }catch( error ){
        
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getPrinterByID = async(req, res = response) => {

    const {
        idPrinter
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPrinterByID( ${ idPrinter } )`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró información.",
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
    getPrintersBySec
    , getSelectPrinterByIdUser
    , insertSelectPrinter
    , deleteSelectPrinter
    , getPrinterByID
  }