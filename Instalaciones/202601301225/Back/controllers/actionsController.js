const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { dbConnection, dbSPConnection } = require('../database/config');

const getActionListWithPage = async(req, res = response) => {

    const {
        search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getActionListWithPage(
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

const insertAction = async(req, res) => {
   
  const {
    name
    , description
    , nSpecial = 0

    , idUserLogON
    , idSucursalLogON

  } = req.body;

  //console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertAction(
            '${name}'
            ,'${description}'
            , ${ nSpecial }

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
                message: "Acción guardada con éxito.",
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

    //console.log(req.body)

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

const getAllActionsByPermission = async(req, res = response)=>{

    const {
        relationType
        , idRelation
    }= req.body;

    var OSQL = null;

    try{

       // var OMenuList = [];

        OActionSectionList = await dbConnection.query(`call getActionSection()`);

        console.log( OActionSectionList )

        if( OActionSectionList.length == 0 ){
            return res.json({
                status:1,
                message:"No tiene secciones",
                data:null
            })
        }else{

            var oActionSections = [];

            for(var i = 0; i < OActionSectionList.length; i++){

                var oActionSection = {
                    'sectionName': OActionSectionList[i].sectionName,
                    'actions': []
                }

                oActionsBySectionList = await dbConnection.query(`call getActionsBySectionAndPermission( '${ OActionSectionList[i].idActionSection }', '${ relationType }', ${ idRelation } )`);
                //console.log( oActionsBySectionList )
                
                for(var n = 0; n < oActionsBySectionList.length; n++){

                    var oObj = {
                        'idAction': oActionsBySectionList[n].idAction,
                        'actionName': oActionsBySectionList[n].name,
                        'nameHtml': oActionsBySectionList[n].nameHtml,
                        'description': oActionsBySectionList[n].description,
                        'bPermissionAction': oActionsBySectionList[n].bPermissionAction == 1 ? true : false,
                        'nSpecial': oActionsBySectionList[n].nSpecial
                    };

                    //console.log( oObj )

                    oActionSection.actions.push( oObj );
                    //console.log( oActionSection )
                }

                oActionSections.push( oActionSection );
            }

            //console.log( oActionSections )

            res.json({
                status:0,
                message:"Conectado correctamente.",
                data: oActionSections
            });

        }
        
    }
    catch( error ){
        
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            error: error.message,
            data: OSQL
        });
    }
}

const insertActionsPermisionsByIdRelation = async(req, res) => {
   
    var {
        relationType
        , idRelation
        , seccionesYPermisos

        , idUserLogON
    } = req.body;

    const connection = await dbSPConnection.getConnection();
    await connection.beginTransaction();

    try{

        const jsonList = seccionesYPermisos
        .flatMap(section => section.actions)
        .map(action => ({
            idAction: action.idAction,
            bPermissionAction: action.bPermissionAction ? 1 : 0
        }));

        if( jsonList.length == 0 ){
            res.json({
                status: 1,
                message: "No se guardaron los permisos."
            });
        }else{

            const jsonString = JSON.stringify(jsonList, null, 2);

            console.log( `CALL insertUpdateActionsConf(
                '${ relationType }'
                , ${ idRelation }
                , '${ jsonString }'
                , ${ idUserLogON }
                )` )
                    
            var oSQL = await connection.query(`CALL insertUpdateActionsConf(
                '${ relationType }'
                , ${ idRelation }
                , '${ jsonString }'
                , ${ idUserLogON }
                )`);

            var oSQL = oSQL[0][0];
            console.log( oSQL )

            if(oSQL[0].out_id == 0){
                await connection.rollback();
                connection.release();
                return res.json({
                    status: 2,
                    message: 'No pudieron guardar los permisos'
                });
            }else if(oSQL[0].out_id > 0){
                await connection.commit();
                connection.release();
                res.json({
                    status: 0,
                    message: "Permisos guardados con éxito.",
                });
            }
        }

    }catch(error){
        await connection.rollback();
        connection.release();
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
}

const insertUpdateActionSection = async(req, res) => {
   
    const {
        idActionSection = 0
        , sectionName
        , iLugar
        , active = false

        , idUserLogON
        , idSucursalLogON

    } = req.body;

    try
    {

        var OSQL = await dbConnection.query(`call insertUpdateActionSection(
        ${ idActionSection }
        ,'${ sectionName }'
        , ${ iLugar }
        , ${ active }

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

const getCatActionSectionListWithPage = async(req, res = response) => {

    const {
        search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    try{

        var OSQL = await dbConnection.query(`call getCatActionSectionListWithPage(
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

const getActionsBySectionPagindo = async(req, res = response) => {

    const {
        idActionSection = 0
        , search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    try{

        var OSQL = await dbConnection.query(`call getActionsBySectionPagindo(
            ${ idActionSection }
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

const insertUpdateAction = async(req, res) => {
   
    const {
        idActionSection = 0
        , idAction = 0
        , name = ''
        , nameHtml = ''
        , description = ''
        , active = false
        , nSpecial = 0

        , idUserLogON

    } = req.body;

    try
    {
        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        var OSQL = await dbConnection.query(`call insertUpdateAction(
        '${ oGetDateNow }'
        ,${ idActionSection }
        ,${ idAction }
        ,'${ name }'
        ,'${ nameHtml }'
        ,'${ description }'
        , ${ active }
        , ${ nSpecial }

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

module.exports = {
    getActionListWithPage
    , insertAction
    , disabledActions

    , getAllActionsByPermission
    , insertActionsPermisionsByIdRelation
    , insertUpdateActionSection
    , getCatActionSectionListWithPage

    , getActionsBySectionPagindo
    , insertUpdateAction
  }