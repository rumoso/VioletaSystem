const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');


const getInfFinanciera = async(req, res = response) => {

    const {
        startDate = ''
        , endDate = ''
        , idSucursal
        , idSeller_idUser = 0
        , idGroup = 0

        , idUserLogON
        , idSucursalLogON

    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getInfFinanciera(
            '${ startDate.substring(0, 10) }'
            ,'${ endDate.substring(0, 10) }'
            , ${ idSucursal }
            , ${ idSeller_idUser }
            , ${ idGroup }
            
            , ${ idUserLogON }

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
                status:0,
                message:"Ejecutado correctamente.",
                data:{
                count: iRows,
                rows: OSQL
                }
            });
            
        }

        // await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }
};



module.exports = {
    getInfFinanciera
  }