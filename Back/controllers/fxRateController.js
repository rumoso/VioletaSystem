const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const getFxRateListWithPage = async(req, res = response) => {

    const {
        search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getFxRateListWithPage(
            '${ search }'
            ,${ start }
            ,${ limiter }
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
        
    }catch(error){
      
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data:error
        });
    }
};

const insertFxRate = async(req, res) => {
   
  const {
    referencia,
    fxRate
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertFxRate(
          '${referencia}'
          ,'${fxRate}'
          )`)

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message:"No se registró el tipo de cambio."
            });
    
        }
        else{

            res.json({
                status:0,
                message:"Tipo de Cambio guardado con éxito.",
                insertID: OSQL[0].out_id
            });
    
        }

  }catch(error){

    await tran.rollback();
      
      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data: error.message
      });
  }
}

module.exports = {
    getFxRateListWithPage
    , insertFxRate
  }