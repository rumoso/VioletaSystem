const { response } = require('express');
const bcryptjs = require('bcryptjs');

const moment = require('moment');

const { createConexion, dbConnection } = require('../database/config');

const getElectronicMoneyListWithPage = async(req, res = response) => {

    const {
        idCustomer
        , search = ''
        , limiter = 10
        , start = 0
       
    } = req.body;

    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call getElectronicMoneyListWithPage(
            ${ idCustomer }
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

const insertElectronicMoney = async(req, res) => {
   
  const {
    idCustomer,
    amount,
    description

    , idUserLogON
    , idSucursalLogON
  } = req.body;

  console.log(req.body)

  const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

  try{

      var OSQL = await dbConnection.query(`call insertElectronicMoney(
            '${oGetDateNow}'
            , ${idCustomer}
            , '${amount}'
            , '${description}'
            , 0
            , ''

            , ${ idUserLogON }
            )`)

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message:"No se registró el Dinero electrónico."
            });
    
        }
        else{

            res.json({
                status:0,
                message:"Dinero electrónico guardado con éxito.",
                insertID: OSQL[0].out_id
            });
    
        }

  }catch(error){

      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data: error.message
      });
  }
}

const deleteElectronicMoney = async(req, res) => {
   
    const {
        idElectronicMoney
    } = req.body;
  
    console.log(req.body)
  
    try{
  
        var OSQL = await dbConnection.query(`call deleteElectronicMoney(
            ${ idElectronicMoney }
            )`)

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'ElectronicMoney', ${ idElectronicMoney } )`);
  
        res.json({
            status:0,
            message:"Dinero electrónico eliminado con éxito.",
        });
        
    }catch(error){
        
        res.json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }
  }

module.exports = {
    getElectronicMoneyListWithPage
    , insertElectronicMoney
    , deleteElectronicMoney
  }