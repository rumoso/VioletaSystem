const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const getSupplierListWithPage = async(req, res = response) => {

    const {
        search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getSupplierListWithPage(
            '${ search }'
            ,${ start }
            ,${ limiter }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
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

const cbxGetSuppliersCombo = async(req, res = response) => {

    const {
      search = ''
    } = req.body;

    try
    {

        console.log(req.body)
        var OSQL = await dbConnection.query(`call cbxGetSuppliersCombo( '${search}' )`)
      
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

    }catch(error){
  
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }

};

const insertSupplier = async(req, res) => {
   
  const {
    name,
    description

    , idUserLogON
    , idSucursalLogON

  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertSupplier(
          '${name}'
          ,'${description}'

          , ${ idUserLogON }
          )`)

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message: "No se registró el tipo de cambio."
            });
    
        }
        else{

            res.json({
                status: 0,
                message: "Proveedor guardado con éxito.",
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

const disabledActions = async(req, res) => {
    
    const {
        idAction
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call disabledActions(
            ${ idAction }
            )`)

        res.json({
            status: 0,
            message: "Se deshabilitó con éxito."
        });
        
    }catch( error ){
        
        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getActionsForAddUser = async(req, res = response) => {

    const {
      search = ''
      , idUser
    } = req.body;
  
    console.log(req.body)
    var OSQL = await dbConnection.query(`call getActionsForAddUser( '${search}' , ${ idUser })`)
  
    if(OSQL.length == 0){
  
        res.json({
            status: 2,
            message: "No se encontró información.",
            data: null
        });
  
      }
      else{
  
          res.json({
              status: 0,
              message: "Ejecutado correctamente.",
              data: OSQL
          });
  
      }
  
  };

const getActionByUserListWithPage = async(req, res = response) => {

    const {
        idUser
        , search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getActionByUserListWithPage(
            ${ idUser }
            ,'${ search }'
            ,${ start }
            ,${ limiter }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: 0,
                    rows: []
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

const insertActionByIdUser = async(req, res) => {
   
    const {
        idUser,
        idAction
  
      , idUserLogON
      , idSucursalLogON
  
    } = req.body;
  
    console.log(req.body)
  
    try{
  
        var OSQL = await dbConnection.query(`call insertActionByIdUser(
            ${ idUser }
            , ${ idAction }
  
            , ${ idUserLogON }
            )`)
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message: "No se registró."
              });
      
          }
          else{
  
              res.json({
                  status: 0,
                  message: "Acción asignada con éxito.",
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

const disabledActionByRelation = async(req, res = response) => {

    const {
        idRelation = 0
        , relationType = ''
        , idAction = 0
    } = req.body;

    console.log(req.body)
    var OSQL = await dbConnection.query(`call disabledActionByRelation( ${ idRelation }, '${ relationType }', ${ idAction } )`)

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
    getSupplierListWithPage
    , cbxGetSuppliersCombo
    
    , insertSupplier
    , disabledActions
    , getActionsForAddUser
    , getActionByUserListWithPage
    , insertActionByIdUser
    , disabledActionByRelation
  }