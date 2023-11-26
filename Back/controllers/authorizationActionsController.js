const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const authorizationActionAPI = async(req, res = response) => {

    const {

        authorizationCode
        , actionName
       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call authorizationAction(
            '${ authorizationCode }'
            ,'${ actionName }'
            )`)
  
          if(OSQL.length == 0 || OSQL[0].idAction == 0){
    
              res.json({
                  status: 1,
                  message: "No tiene permisos para autorizar esta acción."
              });
      
          }
          else{
  
              res.json({
                  status: 0,
                  message: "Acción autorizada con éxito.",
                  insertID: OSQL[0].idAction
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

const authorizationAction = async(idUser, actionName) => {

    var bOK = false;

    try{

        var OSQL = await dbConnection.query(`call authorizationAction(
            ${idUser}
            ,'${actionName}'
            )`)
  
          if(OSQL.length == 0 || OSQL[0].idAction == 0){
    
            bOK = false;
      
          }
          else{
  
            bOK = true;
      
          }
        
    }catch(error){
        bOK = false;
    }

    return bOK;
};

module.exports = {
    authorizationActionAPI
    , authorizationAction
  }