const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const insertSale = async(req, res) => {
   
  const {
    idSeller_idUser,
    idCustomer,
    idSaleType,
    bCredito,
    total,

    saleDetail,
    salesPayment
  } = req.body;

  console.log(req.body)

  const tran = await dbConnection.transaction();

  var bOK = false;
  var idSale = 0;

  try{

      var OSQL = await dbConnection.query(`call insertSale(
          ${idSeller_idUser}
          , ${idCustomer}
          , ${idSaleType}
          ,'${total}'
          , 1
          )`,{ transaction: tran })

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message:"No se registró la venta."
            });
    
        }
        else{

            idSale = OSQL[0].out_id;

            if( idSale > 0 ){

                for(var i = 0; i < saleDetail.length; i++){
                    var saleD = saleDetail[i];

                    var OSQL2 = await dbConnection.query(`call insertSaleDetail(
                        ${ idSale }
                        , ${ saleD.idProduct }
                        , '${ saleD.cantidad }'
                        , '${ saleD.precioUnitario }'
                        , '${ saleD.descuento }'
                        , '${ saleD.precio }'
                        , '${ saleD.importe }'
                        )`,{ transaction: tran })

                    if(OSQL2[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }

                    var OSQL4 = await dbConnection.query(`call insertInventaryLog(
                        ${idSeller_idUser}
                        , ${saleD.idProduct}
                        , '-${saleD.cantidad}'
                        , 'Salida por Venta'
                        )`,{ transaction: tran })
    
                        if(OSQL4[0].out_id > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }
                }

                var anticipo = 0;

                if(bOK){

                    for(var i = 0; i < salesPayment.length; i++){
                        var saleP = salesPayment[i];
    
                        anticipo = saleP.anticipo;
    
                        var OSQL3 = await dbConnection.query(`call insertPayments(
                            ${ idSale }
                            , 'V'
                            , ${idSeller_idUser}
                            , ${ saleP.idFormaPago }
                            , '${ saleP.paga }'
                            , '${ saleP.referencia }'
                            , '${ ( anticipo > 0 ? 'Anticipo' : 'Venta' ) }'
                            , '${saleP.idFxRate}'
                            , '${saleP.fxRate}'
                            )`,{ transaction: tran })
    
                        if(OSQL3[0].out_id > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }
    
                    }

                }

            }

            if(bOK){
                await tran.commit();

                res.json({
                    status:0,
                    message:"Venta guardada con éxito.",
                    insertID: idSale
                });
            }else{
                await tran.rollback();

                res.json({
                    status: 1,
                    message:"No se guardó la Venta."
                });
            }
    
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

const getVentasListWithPage = async(req, res = response) => {

    const {
        idUser
        ,createDateStart = ''
        ,createDateEnd = ''
        ,idCustomer = 0

        , search = ''
        , limiter = 10
        , start = 0

       
    } = req.body;

    console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getVentasListWithPage(
            ${idUser}
            , '${createDateStart}'
            , '${createDateEnd}'
            , ${idCustomer}

            , '${ search }'
            , ${ start }
            , ${ limiter }
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

        await dbConnectionNEW.close();
        
    }catch(error){

        await dbConnectionNEW.close();
      
        res.status(500).json({
            status: 2,
            message:"Sucedió un error inesperado",
            data:error
        });
    }

};

const insertAbono = async(req, res) => {
   
    const {
      idSeller_idUser,
      idCustomer,
      idSale,
      idFormaPago,
      paga,
      referencia = '',
      idFxRate = 0,
      fxRate = 0
      
    } = req.body;
  
    console.log(req.body)
  
    try{

        var OSQL = await dbConnection.query(`call insertPayments(
            ${ idSale }
            , 'A'
            , ${idSeller_idUser}
            , ${ idFormaPago }
            , '${ paga }'
            , '${ referencia }'
            , 'Abono'
            , '${idFxRate}'
            , '${fxRate}'
            )`)
  
        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"No se registró el abono."
            });
    
        }
        else{

        res.json({
            status:0,
            message:"Abono guardado con éxito.",
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


const getVentasACreditoListWithPage = async(req, res = response) => {

    const {
        idCustomer
        , all

        , search = ''
        , limiter = 10
        , start = 0

       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getVentasACreditoListWithPage(
            ${idCustomer}
            ,${all}

            ,'${ search }'
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
            status: 2,
            message:"Sucedió un error inesperado",
            data:error
        });
    }
};

const getAbonosBySaleListWithPage = async(req, res = response) => {

    const {
        idSale

        , search = ''
        , limiter = 10
        , start = 0

       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getAbonosBySaleListWithPage(
            ${idSale}

            ,'${ search }'
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
            status: 2,
            message:"Sucedió un error inesperado",
            data:error
        });
    }
};

module.exports = {
    insertSale
    , getVentasListWithPage
    , getVentasACreditoListWithPage
    , insertAbono
    , getAbonosBySaleListWithPage
  }