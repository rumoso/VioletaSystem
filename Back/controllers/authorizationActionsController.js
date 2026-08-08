const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const authorizationActionAPI = async(req, res = response) => {

    const {

        authorizationCode
        , actionName
       
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call authorizationAction(
            '${ authorizationCode }'
            ,'${ actionName }'
            )`)
  
          if(OSQL.length == 0 || OSQL[0].idAction == 0){
    
              res.json({
                  status: 1,
                  message: "No tiene permisos para autorizar esta acción.",
                  insertID: 0
              });
      
          }
          else{
  
              res.json({
                  status: 0,
                  message: "Acción autorizada con éxito.",
                  insertID: OSQL[0].idUser
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

// Autorización por identificación facial (analisis/004): la cámara ya
// identificó QUIÉN es (idUser), aquí solo se valida si ESE usuario
// tiene permiso para actionName — mismo criterio (rol o asignación
// directa) que authorizationAction, pero sin código: consulta directa,
// sin stored procedure.
const authorizationActionByFace = async(req, res = response) => {

    const {
        idUser
        , actionName
    } = req.body;

    try{

        const rolRows = await dbConnection.query(
            `SELECT AC.idAction
             FROM actions AS A
             INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
             INNER JOIN rolesconfig AS RC ON AC.idRelation = RC.idRol
             WHERE AC.relationType = 'R' AND RC.idUser = :idUser AND A.name = :actionName
             LIMIT 1`,
            { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
        );

        let idAction = rolRows.length > 0 ? rolRows[0].idAction : 0;

        if (!idAction) {
            const userRows = await dbConnection.query(
                `SELECT AC.idAction
                 FROM actions AS A
                 INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
                 WHERE AC.relationType = 'U' AND AC.idRelation = :idUser AND A.name = :actionName
                 LIMIT 1`,
                { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
            );
            idAction = userRows.length > 0 ? userRows[0].idAction : 0;
        }

        if (idAction > 0) {
            res.json({
                status: 0,
                message: "Acción autorizada con éxito.",
                insertID: idUser
            });
        } else {
            res.json({
                status: 1,
                message: "El usuario identificado no tiene permisos para autorizar esta acción.",
                insertID: 0
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

const getAutorizacionesByRelation = async(req, res = response) => {

    var {
        idRelation = ''
        , idRelation2 = ''
        , relationType = ''

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getAutorizacionesByRelation(
            '${ idRelation }'
            , '${ idRelation2 }'
            , '${ relationType }'
            )`)

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

        //await dbConnectionNEW.close();
        
    }catch(error){

        //await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

module.exports = {
    authorizationActionAPI
    , authorizationAction
    , authorizationActionByFace
    , getAutorizacionesByRelation
  }