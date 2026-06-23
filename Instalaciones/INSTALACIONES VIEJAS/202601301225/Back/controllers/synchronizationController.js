const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');


const syncData = async(req, res = response) => {

  const {
    search = ''
  } = req.body;

  //console.log(req.body)

  var OResponseList = [];

    try{

        for(var i = 0; i < req.body.length; i++){

            const {
                tabla
                , data
            } = req.body[i];
    
            ////console.log( tabla )
            ////console.log( data )
    
            if( tabla == 'Users' ){

                const OData = JSON.parse( data );

                var OResponseByTable = [];
        
                for( var n = 0; n < OData.length; n++ ){
        
                    const {
                        idUser
                        , createDate
                        , name
                        , userName
                        , pwd
                        , active
                    } = OData[n];
            
                    var OSQL = await dbConnection.query(`call SD_insertUpdateUser(
                        ${ idUser }
                        , '${ createDate }'
                        , '${ name }'
                        , '${ userName }'
                        , '${ pwd }'
                        , ${active}
                        )`)

                    var bChange = 0;
            
                    if(OSQL.length > 0){

                        bChange = OSQL[0].out_id > 0 ? 1 : 0;
            
                    }

                    var OChange = {
                        idRelation: idUser
                        ,bChange: bChange
                    };

                    OResponseByTable.push( OChange );
        
                }

                var oResponse = {
                    tabla: 'Users',
                    oResponseByTable: OResponseByTable
                }

                OResponseList.push( oResponse );
    
            }else if( tabla == 'Products' ){

                const OData = JSON.parse( data );

                var OResponseByTable = [];
        
                for( var n = 0; n < OData.length; n++ ){
        
                    const {
                        idProduct
                        ,createDate
                        ,idSucursal

                        ,idFamily
                        ,idGroup
                        ,idQuality
                        ,idOrigin

                        ,barCode
                        ,name
                        ,gramos
                        ,cost = 0
                        ,price = 0
                        ,active

                    } = OData[n];

                    var OSQL = await dbConnection.query(`call SD_insertUpdateProducts(
                        ${ idProduct }
                        ,'${ createDate }'
                        , ${ idSucursal }
                        , ${ idFamily }
                        , ${ idGroup }
                        , ${ idQuality }
                        , ${ idOrigin }
                        ,'${ barCode }'
                        ,'${ name }'
                        ,'${ gramos }'
                        ,'${ cost }'
                        ,'${ price }'
                        , ${ active }
                        )`);
            
                    var bChange = 0;
            
                    if(OSQL.length > 0){

                        bChange = OSQL[0].out_id > 0 ? 1 : 0;
            
                    }

                    var OChange = {
                        idRelation: idProduct
                        ,bChange: bChange
                    };

                    OResponseByTable.push( OChange );
        
                }

                var oResponse = {
                    tabla: 'Products',
                    oResponseByTable: OResponseByTable
                }

                OResponseList.push( oResponse );
    
            }

        }

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            oResponseByTable: OResponseList
        });

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};


module.exports = {
    syncData
  }