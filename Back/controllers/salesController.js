const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const insertSale = async(req, res) => {

    const {
        idCaja,
        idSeller_idUser,
        idCustomer,
        idSaleType,

        saleDetail,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;
    var idSale = 0;

    try{

        var OSQL = await dbConnection.query(`call insertSale(
        ${ idCaja }
        , ${ idSeller_idUser }
        , ${ idCustomer }
        , ${ idSaleType }
        , ${ idUserLogON }
        )`,{ transaction: tran })

        if(OSQL.length == 0){
  
            res.json({
                status: 1,
                message: "No se registró la venta."
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
                        , ${ idUserLogON }
                    )`,{ transaction: tran })

                    if(OSQL2[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }

                    var OSQL4 = await dbConnection.query(`call insertInventaryLog(
                        ${ saleD.idProduct }
                        , '-${ saleD.cantidad }'
                        , 'Salida por Venta'

                        , ${ idUserLogON }
                    )`,{ transaction: tran })

                    if(OSQL4[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
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
            
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
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

const getSaleByID = async(req, res = response) => {

    const {
        idSale
    } = req.body;
  
    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getSaleByID( ${ idSale } )`)
  
        if(OSQL.length == 0){
      
            res.json({
                status: 1,
                message:"No se encontró el producto.",
                data: null
            });
    
        }
        else{

            var OSQL2 = await dbConnection.query(`call getSalesDetail( ${ idSale } )`)

            var OSQL3 = await dbConnection.query(`call getPaymentsByIdSaleListWithPage(
                ${idSale}
    
                ,''
                ,0
                ,100000
                )`)
    
            res.json({
                status: 0,
                message:"Ejecutado correctamente.",
                data: OSQL[0],
                dataDetail: OSQL2,
                dataPayments: OSQL3
            });
    
        }

    }catch(error){
            
        res.status(500).json({
            status: 2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }
  
  };


const insertPayments = async(req, res) => {

    const {

        idCaja,
        idCustomer,

        paymentList,

        idUserLogON,
        idSucursalLogON
      
    } = req.body;
  
    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;
    var idSale = 0;
  
    try{

        for( var i = 0; i < paymentList.length; i++){

            var OPayment = paymentList[i];

            var OSQL = await dbConnection.query(`call insertPayments(
                ${ idCaja }
                , ${ OPayment.idRelation }
                , '${ OPayment.relationType }'
                , ${ OPayment.idSeller_idUser }
                , ${ OPayment.idFormaPago }
                , '${ OPayment.paga }'
                , '${ OPayment.referencia }'
                , '${ OPayment.description }'
                , '${ OPayment.idFxRate }'
                , '${ OPayment.fxRate }'
                , '${ OPayment.pagaF }'

                , ${ idUserLogON }
                )`,{ transaction: tran })
        
                if(OSQL[0].out_id > 0){
                    bOK = true;
                }else{
                    bOK = false;
                    break;
                }

                if(OPayment.idFormaPago == 5){
                    
                    var OSQL2 = await dbConnection.query(`call insertElectronicMoney(
                        ${ idCustomer }
                        ,'-${ OPayment.paga }'
                        ,'Se utiliza en venta'
                        ,${ OPayment.idRelation }
                        ,'${ OPayment.relationType }'

                        , ${ idUserLogON }
                        )`)
    
                    if(OSQL2[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }
                    
                }
        }

        if(bOK){
            await tran.commit();

            res.json({
                status:0,
                message:"Pago guardado con éxito."
            });

        }else{

            await tran.rollback();

            res.json({
                status: 1,
                message:"No se guardó el pago."
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

const getPaymentsByIdSaleListWithPage = async(req, res = response) => {

    const {
        idSale

        , search = ''
        , limiter = 10
        , start = 0

       
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPaymentsByIdSaleListWithPage(
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

const insertSaleByConsignation = async(req, res) => {
   
    const {
      idSeller_idUser,
      idCustomer,
      idSaleType,
      total,
  
      saleDetail
    } = req.body;
  
    console.log(req.body)
  
    const tran = await dbConnection.transaction();
  
    var bOK = false;
    var idSale = 0;
    var bBorro = 0;
  
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

                      var OSQL3 = await dbConnection.query(`call deleteSalesDetailByIdDetail(
                        ${ saleD.idSaleDetail }
                        ,${ saleD.idSale }
                        ,1
                        )`,{ transaction: tran })

                        if(OSQL3[0].iRows > 0){
                            bOK = true;
                            bBorro = OSQL3[0].bBorro;
                        }else{
                            bOK = false;
                            break;
                        }

                  }
  
              }

              if(bOK){
                  await tran.commit();
  
                  res.json({
                      status:0,
                      message:"Venta guardada con éxito.",
                      bBorro: bBorro
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

const regresarProductoDeConsignacion = async(req, res) => {

    const {
        idSeller_idUser,

        saleDetail
    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;
    var bBorro = 0;

    try{

        for(var i = 0; i < saleDetail.length; i++){
            var saleD = saleDetail[i];

            var OSQL = await dbConnection.query(`call deleteSalesDetailByIdDetail(
            ${ saleD.idSaleDetail }
            ,${ saleD.idSale }
            ,1
            )`,{ transaction: tran })

            if(OSQL[0].iRows > 0){
                bOK = true;
                bBorro = OSQL[0].bBorro;
            }else{
                bOK = false;
                break;
            }

            var OSQL1 = await dbConnection.query(`call insertInventaryLog(
                ${idSeller_idUser}
                , ${saleD.idProduct}
                , '${saleD.cantidad}'
                , 'Regreso de consignación'
                )`,{ transaction: tran })

                if(OSQL1[0].out_id > 0){
                    bOK = true;
                }else{
                    bOK = false;
                    break;
                }

        }

        if(bOK){
            await tran.commit();

            res.json({
                status:0,
                message:"Guardada con éxito.",
                bBorro: bBorro
            });
        }else{
            await tran.rollback();

            res.json({
                status: 1,
                message:"No se guardó la Venta."
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

const getPreCorteCaja = async(req, res = response) => {

    const {
        idCaja

        ,idUserLogON
        ,idSucursalLogON
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreCorteCaja(
            ${ idCaja }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"Ejecutado correctamente.",
            });

        }
        else{

            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data:{
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

const getPreEgresosCorteCaja = async(req, res = response) => {

    const {
        idCaja

        ,idUserLogON
        ,idSucursalLogON
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreEgresosCorteCaja(
            ${ idCaja }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"Ejecutado correctamente.",
            });

        }
        else{

            res.json({
                status:0,
                message:"Ejecutado correctamente.",
                data:{
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

const insertCorteCaja = async(req, res) => {
   
    const {
        idCaja

        ,idUserLogON
        ,idSucursalLogON
    } = req.body;
  
    console.log(req.body)
  
    const tran = await dbConnection.transaction();
  
    var bOK = false;
    var idCorteCaja = 0;
  
    try{
  
        var OSQL = await dbConnection.query(`call insertCorteCaja(
            ${ idCaja }
            , ${ idUserLogON }
            )`,{ transaction: tran })
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message:"No se registró el corte de caja."
              });
      
          }
          else{
  
            idCorteCaja = OSQL[0].idNew;

            if( idCorteCaja > 0 ){

                var OSQL2 = await dbConnection.query(`call getPaymentsToCorteCaja(
                    ${ idCaja }
                )`);

                for(var i = 0; i < OSQL2.length; i++){
                    var payment = OSQL2[i];

                    console.log( payment )

                    var OSQL3 = await dbConnection.query(`call insertCorteCajaIngresos(
                        ${ idCorteCaja }
                        , ${ idCaja }
                        , ${ idUserLogON }
                        , ${ payment.idPayment }
                    )`,{ transaction: tran })

                    if(OSQL3[0].idNew > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }

                }

                var OSQL4 = await dbConnection.query(`call getEgresosToCorteCaja(
                    ${ idCaja }
                )`);

                for(var i = 0; i < OSQL4.length; i++){
                    var egreso = OSQL4[i];

                    console.log( payment )

                    var OSQL5 = await dbConnection.query(`call insertCorteCajaEgresos(
                        ${ idCorteCaja }
                        , ${ idCaja }
                        , ${ idUserLogON }
                        , ${ egreso.idEgreso }
                    )`,{ transaction: tran })

                    if(OSQL5[0].idNew > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }

                }

            }

            if(bOK){

                await tran.commit();

                res.json({
                    status: 0,
                    message: "Corte de caja guardada con éxito.",
                    insertID: idCorteCaja
                });

            }else{

                await tran.rollback();

                res.json({
                    status: 1,
                    message: "No se guardó el Corte de caja."
                });

            }
      
          }
        
    }catch(error){
  
        await tran.rollback();
        
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
  
    }
}

const insertEgresos = async(req, res) => {

    const {

        idCaja,
        idFormaPago,
        description = '',

        amount,

        idUserLogON,
        idSucursalLogON
      
    } = req.body;
  
    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call insertEgresos(
        ${ idCaja }
        , ${ idFormaPago }
        , '${ description }'
        , '${ amount }'

        , ${ idUserLogON }
        )`);

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se registró el producto."
            });

        }
        else{

            res.json({
                status: 0,
                message: "Egreso guardado con éxito.",
                insertID: OSQL[0].idNew
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

const disabledEgresos = async(req, res) => {
   
    const {
        idEgreso
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call disabledEgresos(
        ${ idEgreso }
        )`)

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Egresos', ${ idEgreso } )`);

        res.json({
            status: 0,
            message: "Egreso deshabilitado con éxito.",
            insertID: OSQL[0].idRelation
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
    insertSale
    , getVentasListWithPage
    , getSaleByID
    , insertPayments
    , getPaymentsByIdSaleListWithPage
    , insertSaleByConsignation
    , regresarProductoDeConsignacion

    , getPreCorteCaja
    , getPreEgresosCorteCaja
    , insertCorteCaja
    , insertEgresos

    , disabledEgresos

}