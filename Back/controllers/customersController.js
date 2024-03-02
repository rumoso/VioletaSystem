const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { dbConnection } = require('../database/config');

const getCustomersListWithPage = async(req, res = response) => {

    const {
        createDateStart = ''
        , createDateEnd = ''
        , name = ''
        , lastName = ''
        
        , search = ''
        , limiter = 10
        , start = 0
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getCustomersListWithPage(
            '${ createDateStart }'
            ,'${ createDateEnd }'
            ,'${ name }'
            ,'${ lastName }'
            
            ,'${ search }'
            ,${ start }
            ,${ limiter }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró información.",
                data:{
                    count: 0,
                    rows: null
                }
            });

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );

            var OSQL_getSUMDineroElectHeader = await dbConnection.query(`call getSUMDineroElectHeader(
                '${ createDateStart }'
                ,'${ createDateEnd }'
                ,'${ name }'
                ,'${ lastName }'
                )`)
            
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL,
                    header: OSQL_getSUMDineroElectHeader[0]
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

const getCustomerByID = async(req, res = response) => {

    const {
        idCustomer
    } = req.body;
  
    console.log(req.body)
    var OSQL = await dbConnection.query(`call getCustomerByID(${ idCustomer })`)
  
    if(OSQL.length == 0){
  
        res.json({
            status: 0,
            message: "No se encontró información.",
            data: null
        });

    }
    else{

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: OSQL[0]
        });

    }
  
  };

const insertCustomer = async(req, res) => {
   
  const {
    idUser
    , name = ''
    , lastName = ''
    , address = ''
    , tel = ''
    , eMail = ''
    , active

    , idUserLogON
    , idSucursalLogON

  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call insertCustomer(
          '${ name.trim() }'
          ,'${ lastName.trim() }'
          ,'${ address.trim() }'
          ,'${ tel.trim() }'
          ,'${ eMail.trim() }'
          , ${ active }

          , ${ idUserLogON }
          )`)

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message: "No se registró el cliente."
            });
    
        }
        else{

            res.json({
                status: 0,
                message: "Cliente guardado con éxito.",
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

const updateCustomer = async(req, res) => {
   
  const {
    idCustomer

    , name = ''
    , lastName = ''
    , address = ''
    , tel = ''
    , eMail = ''
    , active

    , idUser
  } = req.body;

  console.log(req.body)

  try{

        var OSQL = await dbConnection.query(`call updateCustomer(
            ${ idCustomer }  
            ,'${ name.trim() }'
            ,'${ lastName.trim() }'
            ,'${ address.trim() }'
            ,'${ tel.trim() }'
            ,'${ eMail.trim() }'
            , ${ active }
            )`);

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Customers', ${ idCustomer } )`);

      res.json({
          status: 0,
          message: "Cliente actualizado con éxito.",
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

const deleteCustomer = async(req, res) => {
   
  const {
    idCustomer
  } = req.body;

  console.log(req.body)

  try{

      var OSQL = await dbConnection.query(`call deleteCustomer(
          ${ idCustomer }
          )`)

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Customers', ${ idCustomer } )`);

      res.json({
          status:0,
          message:"Cliente deshabilitado con éxito.",
          insertID: OSQL[0].out_id
      });
      
  }catch(error){
      
      res.json({
          status:2,
          message:"Sucedió un error inesperado",
          data: error.message
      });
  }
}

const cbxGetCustomersCombo = async(req, res = response) => {

    const {
        idUser,
        search = ''
    } = req.body;
  
    console.log(req.body)
    
    try{

        var OSQL = await dbConnection.query(`call cbxGetCustomersCombo( '${search}' )`)

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

    }catch(error){
        
        res.json({
            status: 3,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
  
  };



module.exports = {
    getCustomersListWithPage
    , getCustomerByID
    , insertCustomer
    , updateCustomer
    , deleteCustomer
    , cbxGetCustomersCombo
    
  }