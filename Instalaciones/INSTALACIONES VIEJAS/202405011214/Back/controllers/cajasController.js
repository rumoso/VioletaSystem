const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');

const getCajasBySec = async(req, res = response) => {

    const {
        idUser
        , search = ''

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getCajasBySec( ${ idUser }, '${ search }', ${ idSucursalLogON } )`)

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

const getSelectCajaByIdUser = async(req, res = response) => {

    const {
        idUser
    } = req.body;

    //console.log(req.body)

    try
    {

        var OSQL = await dbConnection.query(`call getSelectCajaByIdUser( ${ idUser } )`)

        if(OSQL.length == 0)
        {

            res.json({
            status: 1,
            message:"No tiene caja seleccionada.",
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
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }

};

const insertSelectCaja = async(req, res) => {

    const {
      idUser
      , idCaja

      , idUserLogON
      , idSucursalLogON
    } = req.body;
  
    //console.log(req.body)
  
    try{
  
        var OSQL = await dbConnection.query(`call insertSelectCaja(
            ${ idUser }
            ,${ idCaja }
            , ${ idUserLogON }
            )`)
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message:"No se registró la entrada a la caja."
              });
      
          }
          else{

            //console.log( OSQL )
  
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
  
const deleteSelectCaja = async(req, res) => {
    
    const {
        idUser
        , idCaja
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call deleteSelectCaja(
            ${ idUser }
            ,${ idCaja }
            )`)

        res.json({
            status: 0,
            message: "Se guardó con éxito.",
            insertID: OSQL[0].iRows
        });
        
    }catch( error ){
        
        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getCajaByID = async(req, res = response) => {

    const {
        idCaja
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getCajaByID( ${ idCaja } )`)

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
    getCajasBySec
    , getSelectCajaByIdUser
    , insertSelectCaja
    , deleteSelectCaja
    , getCajaByID
  }