const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const getActionListWithPage = async(req, res = response) => {

    const {
        search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    console.log(req.body)

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
    name,
    description

    , idUserLogON
    , idSucursalLogON

  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertAction(
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

const getAllActionsByPermission = async(req, res = response)=>{

    const {
        relationType
        , idRelation
    }= req.body;

    var OSQL = null;

    try{

       // var OMenuList = [];

        OActionSectionList = await dbConnection.query(`call getActionSection()`);

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
                        'bPermissionAction': oActionsBySectionList[n].bPermissionAction == 1 ? true : false
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
   
    const {
        relationType
        , idRelation
        , seccionesYPermisos

        , idUserLogON
        , idSucursalLogON

    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();
    var bOK = true;

    try{

        var oClear = await dbConnection.query(`call clearActionsConfByIdRelation( '${ relationType }', ${ idRelation } )`,{ transaction: tran });

        console.log( oClear )

        if(oClear[0].bOK > 0){

            bOK = true;

            for(var i = 0; i < seccionesYPermisos.length; i++){
                for(var n = 0; n < seccionesYPermisos[i].actions.length; n++){
                    console.log( seccionesYPermisos[i].actions[n] )
    
                    if( seccionesYPermisos[i].actions[n].bPermissionAction ){

                        var OSQLInsert = await dbConnection.query(`call insertActionByIdRelation(
                            '${ relationType }'
                            , ${ idRelation }
                            , ${ seccionesYPermisos[i].actions[n].idAction }
    
                            , ${ idUserLogON }
                        )`,{ transaction: tran })
        
                        if(OSQLInsert[0].out_id > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                    }
    
                }
            }

        }else{
            bOK = false;
        }

        if(bOK){
                    
            await tran.commit();

            res.json({
                status: 0,
                message: "Permisos guardados con éxito.",
            });

        }else{
            
            await tran.rollback();

            res.json({
                status: 1,
                message: "No se guardaron los permisos."
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


module.exports = {
    getActionListWithPage
    , insertAction
    , disabledActions

    , getAllActionsByPermission
    , insertActionsPermisionsByIdRelation
  }