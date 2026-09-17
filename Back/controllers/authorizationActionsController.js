const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');
const { fn_validarComprobante } = require('../helpers/faceTicket');
const { fn_logVerificacion, fn_logExitoComprobante } = require('../helpers/faceBitacora');

// Autorizar una acción especial (código o rostro) NO exige users.bAcceso:
// autorizar no es iniciar sesión. Un empleado sin acceso al sistema puede
// autorizar si tiene la acción asignada (analisis/018-empleados-y-puestos.md).
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
// Autorización de una acción especial con el rostro de quien autoriza
// (analisis/020). Exige el comprobante que entrega el servidor al
// identificar el rostro; quién autoriza sale del comprobante.
//
// Antes recibía solo idUser: cualquiera podía mandar el de un usuario con
// permiso y obtener la autorización sin mostrar ningún rostro.
const authorizationActionByFace = async(req, res = response) => {

    const {
        ticket
        , actionName
    } = req.body;

    try{

        const oComprobante = fn_validarComprobante(ticket, { proposito: 'AUTORIZACION', tipoPersona: 'USUARIO', bGastar: true });

        if (!oComprobante.ok) {
            return res.json({ status: 1, message: oComprobante.message, insertID: 0 });
        }

        const idUser = oComprobante.datos.idPersona;

        // Las DOS banderas active: A.active (el permiso sigue existiendo) y
        // AC.active (la asignación sigue vigente). La pantalla de permisos
        // revoca poniendo actionsconf.active = 0; sin ese filtro un permiso
        // revocado seguía autorizando.
        const rolRows = await dbConnection.query(
            `SELECT AC.idAction
             FROM actions AS A
             INNER JOIN actionsconf AS AC ON A.idAction = AC.idAction
             INNER JOIN rolesconfig AS RC ON AC.idRelation = RC.idRol
             WHERE AC.relationType = 'R' AND RC.idUser = :idUser AND A.name = :actionName
               AND A.active = 1 AND AC.active = 1
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
                   AND A.active = 1 AND AC.active = 1
                 LIMIT 1`,
                { replacements: { idUser, actionName }, type: dbConnection.QueryTypes.SELECT }
            );
            idAction = userRows.length > 0 ? userRows[0].idAction : 0;
        }

        if (idAction > 0) {

            await fn_logExitoComprobante(oComprobante.datos, `Autorización: ${ actionName }`);

            res.json({
                status: 0,
                message: "Acción autorizada con éxito.",
                insertID: idUser
            });

        } else {

            await fn_logVerificacion({
                modo: oComprobante.datos.modo,
                tipoPersonaIdentificada: 'USUARIO',
                idPersonaIdentificada: idUser,
                resultado: 'FALLO',
                similitud: oComprobante.datos.similitud,
                referencia: `Autorización: ${ actionName } (sin permiso)`,
                idCreateUser: idUser
            });

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