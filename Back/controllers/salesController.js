const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { createConexion, dbConnection } = require('../database/config');

const insertSale = async(req, res) => {

    const {
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
    var idSale = '';

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if( idSucursalLogON > 0 ){
            
            var OSQL = await dbConnection.query(`call insertSale(
            '${oGetDateNow}'
            , ${ idSucursalLogON }
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
    
                if( idSale.length > 0 ){
    
                    for(var i = 0; i < saleDetail.length; i++){
                        
                        var saleD = saleDetail[i];

                        var descriptionTaller = ( idSaleType == "5" ? saleD.productDesc : '' )
    
                        var OSQL2 = await dbConnection.query(`call insertSaleDetail(
                            '${oGetDateNow}'
                            ,'${ idSale }'
                            , ${ saleD.idProduct }
                            , '${ saleD.cantidad }'
                            , '${ saleD.cost }'
                            , '${ saleD.precioUnitario }'
                            , '${ saleD.descuento }'
                            , '${ saleD.precio }'
                            , '${ saleD.importe }'
                            , '${ descriptionTaller }'
                            
                            , ${ idUserLogON }
                        )`,{ transaction: tran })
    
                        if(OSQL2[0].out_id > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        //  QUE NO SEA SOBRE DE TALLER
                        if( idSaleType != "5" )
                        {
                            var OSQL4 = await dbConnection.query(`call insertInventaryLog(
                                '${oGetDateNow}'
                                , ${ saleD.idProduct }
                                , '-${ saleD.cantidad }'
                                , 'Salida por Venta #${ idSale }'
        
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
    
                }
    
                if(bOK){
                    
                    await tran.commit();
    
                    res.json({
                        status: 0,
                        message: "Venta guardada con éxito.",
                        insertID: idSale
                    });
    
                }else{
                    
                    await tran.rollback();
    
                    res.json({
                        status: 1,
                        message: "No se guardó la Venta."
                    });
                }
        
            }
        }else{
            
            await tran.rollback();
    
            res.json({
                status: 1,
                message: "No se puede registrar la venta si no está en una sucursal."
            });

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

    var {
        idUser
        , createDateStart = ''
        , createDateEnd = ''
        , idCustomer = 0
        , idSaleType = 0

        , bCancel = false
        , bPending = false
        , bPagada = false

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        if (bPending && bPagada)
        {
            bPending = false;
            bPagada = false;
        }

        console.log( bPending )
        console.log( bPagada )

        var OSQL = await dbConnectionNEW.query(`call getVentasListWithPage(
            ${idUser}
            , '${createDateStart.substring(0, 10)}'
            , '${createDateEnd.substring(0, 10)}'
            , ${idCustomer}
            , ${idSaleType}

            , ${bCancel}
            , ${bPending}
            , ${bPagada}

            , '${ search }'
            , ${ start }
            , ${ limiter }

            , ${ idSucursalLogON }
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

        await dbConnectionNEW.close();
        
    }catch(error){

        await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getSaleByID = async(req, res = response) => {

    const {
        idSale
    } = req.body;
  
    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getSaleByID( '${ idSale }' )`)
  
        if(OSQL.length == 0){
      
            res.json({
                status: 1,
                message: "No se encontró el producto.",
                data: null
            });
    
        }
        else{

            var OSQL2 = await dbConnection.query(`call getSalesDetail( '${ idSale }' )`)

            var OSQL3 = await dbConnection.query(`call getPaymentsByIdSaleListWithPage(
                '${idSale}'
    
                ,''
                ,0
                ,100000
                )`)
    
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: OSQL[0],
                dataDetail: OSQL2,
                dataPayments: OSQL3
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

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
  
    try{

        for( var i = 0; i < paymentList.length; i++){

            var OPayment = paymentList[i];

            var OSQL_getSaleByID = await dbConnection.query(`call getSaleByID( '${ OPayment.idRelation }' )`)
            OSQL_getSaleByID = OSQL_getSaleByID[0]

            //console.log( OSQL_getSaleByID )
            
            if(OSQL_getSaleByID){

                if(OSQL_getSaleByID.pendingAmount >= OPayment.paga){

                    var OSQL = await dbConnection.query(`call insertPayments(
                        '${oGetDateNow}'
                        ,  ${ idCaja }
                        , '${ OPayment.idRelation }'
                        , '${ OPayment.relationType }'
                        ,  ${ OPayment.idSeller_idUser }
                        ,  ${ OPayment.idFormaPago }
                        , '${ OPayment.paga }'
                        , '${ OPayment.referencia }'
                        , '${ OPayment.description }'
                        , '${ OPayment.idFxRate }'
                        , '${ OPayment.fxRate }'
                        , '${ OPayment.pagaF }'
        
                        , ${ idUserLogON }
                        , ${ idSucursalLogON }
                        )`,{ transaction: tran })
        
                        var idPayment = OSQL[0].out_id;
                
                        if(idPayment.length > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }
        
                        if(OPayment.idFormaPago == 5 && idPayment.length > 0){
                            
                            var OSQL2 = await dbConnection.query(`call insertElectronicMoney(
                                '${oGetDateNow}'
                                ,  ${ idCustomer }
                                , '-${ OPayment.paga }'
                                , 'Se utiliza en el pago #${ idPayment }'
                                , '${ OPayment.idRelation }'
                                , '${ OPayment.relationType }'
        
                                , ${ idUserLogON }
                                )`,{ transaction: tran })
            
                            if(OSQL2[0].out_id > 0){
                                bOK = true;
                            }else{
                                bOK = false;
                                break;
                            }
                            
                        }

                }

            }
            

            
        }

        if(bOK){

            await tran.commit();

            res.json({
                status: 0,
                message: "Pago guardado con éxito."
            });

        }else{

            await tran.rollback();

            res.json({
                status: 1,
                message: "No se guardó el pago."
            });

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
            '${idSale}'

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

const insertSaleByConsignation = async(req, res) => {
   
    const {
        idSaleOld,
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
    var idSale = '';
    var bBorro = 0;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
  
    try{

        var OSQL = await dbConnection.query(`call insertSale(
            '${oGetDateNow}'
            , ${ idSucursalLogON }
            , ${ idSeller_idUser }
            , ${ idCustomer }
            , ${ idSaleType }
            , ${ idUserLogON }
            )`,{ transaction: tran })
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message:"No se registró la venta."
              });
      
          }
          else{
  
              idSale = OSQL[0].out_id;
  
              if( idSale.length > 0 ){
  
                  for(var i = 0; i < saleDetail.length; i++){
                      var saleD = saleDetail[i];

                      //VAMOS A RECALCULAR EN CASO DE QUE SE HAYA APLICADO UN NUEVO DESCUENTO
                      if( saleD.consDescuento > 0 ){
                        //SACO EL DESCUENTO
                        // CONVIERTO EN DECIMAL LE PORCENTAJE
                        var porcentajeDescuento = saleD.consDescuento / 100;
                        var precioDescuento = porcentajeDescuento * saleD.precioUnitario;
                        saleD.descuento = precioDescuento;
            
                        var precio = saleD.precioUnitario - precioDescuento;
                        saleD.precio = precio;
                      }

                      var OSQL2 = await dbConnection.query(`call insertSaleDetail(
                        '${oGetDateNow}'
                          , '${ idSale }'
                          ,  ${ saleD.idProduct }
                          , '${ saleD.consCantidad }'
                          , '${ saleD.cost }'
                          , '${ saleD.precioUnitario }'
                          , '${ saleD.descuento }'
                          , '${ saleD.precio }'
                          , '${ saleD.consCantidad * saleD.precio }'
                          , ''
                          , ${ idUserLogON }
                          )`,{ transaction: tran })
  
                      if(OSQL2[0].out_id > 0){
                          bOK = true;
                      }else{
                          bOK = false;
                          break;
                      }

                      var OSQL3 = await dbConnection.query(`call restarSalesDetailByConsignacion(
                        ${ saleD.idSaleDetail }
                        ,'${ saleD.consCantidad }'
                        )`,{ transaction: tran })

                        if(OSQL3[0].iRows > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        var OSQL4 = await dbConnection.query(`call insertConsHistory(
                            '${oGetDateNow}'
                            , '${ idSaleOld }'
                            ,  ${ saleD.idSaleDetail }
                            , 'Se pasó a ${ ( idSaleType == 1 ? 'una venta de crédito' : idSaleType == 2 ? 'una venta de contado' : idSaleType == 3 ? 'un apartado' : '' ) + ': #' + idSale }'
                            , '${ saleD.consCantidad }'
                            ,  ${ idUserLogON }
                            )`,{ transaction: tran })

                        if(OSQL4[0].idNew > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        var OSQL5 = await dbConnection.query(`call changeInventaryLogCons(
                            '${oGetDateNow}'
                            ,  ${ saleD.idProduct }
                            , '${ saleD.consCantidad }'
                            , '${ idSaleOld }'
                            , '${ idSale }'
                            
                            , ${ idUserLogON }
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
                      message: "Venta guardada con éxito.",
                      idSaleNew: idSale
                  });

              }else{

                  await tran.rollback();
  
                  res.json({
                      status: 1,
                      message: "No se guardó la Venta."
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

const regresarProductoDeConsignacion = async(req, res) => {

    const {
        idSeller_idUser,

        saleDetail,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;
    var bBorro = 0;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        for(var i = 0; i < saleDetail.length; i++){
            var saleD = saleDetail[i];

            var OSQL = await dbConnection.query(`call restarSalesDetailByConsignacion(
                ${ saleD.idSaleDetail }
                ,'${ saleD.consCantidad }'
                )`,{ transaction: tran })

                if(OSQL[0].iRows > 0){
                    bOK = true;
                }else{
                    bOK = false;
                    break;
                }

            var OSQL1 = await dbConnection.query(`call insertInventaryLog(
                '${oGetDateNow}'
                , ${saleD.idProduct}
                , '${saleD.consCantidad}'
                , 'Regreso de consignación #${ saleD.idSale }'

                , ${ idUserLogON }
                )`,{ transaction: tran })

                if(OSQL1[0].out_id > 0){
                    bOK = true;
                }else{
                    bOK = false;
                    break;
                }

            var OSQL2 = await dbConnection.query(`call insertConsHistory(
                '${oGetDateNow}'
                , '${ saleD.idSale }'
                , ${ saleD.idSaleDetail }
                , 'Se regresó a tienda de la consignación #${ saleD.idSale }'
                , '${ saleD.consCantidad }'
                , ${ idUserLogON }
                )`,{ transaction: tran })
    
                    if(OSQL2[0].idNew > 0){
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
        
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getPreCorteCaja = async(req, res = response) => {

    const {
        idCaja
        ,selectedDate = ''

        ,idUserLogON
        ,idSucursalLogON
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreCorteCajaByCaja(
            ${ idCaja }
            , '${ selectedDate.substring(0, 10) }'
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
                    rows: OSQL[0]
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
        ,selectedDate = ''

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
        , selectedDate = ''
        , preCorteCaja

        , idUserLogON
        , idSucursalLogON
    } = req.body;
  
    console.log(req.body)
  
    const tran = await dbConnection.transaction();
  
    var bOK = false;
    var idCorteCaja = '';

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
  
    try{
  
        var OSQL = await dbConnection.query(`call insertCorteCaja(
            '${oGetDateNow}'
            ,  ${ idCaja }
            , '${ selectedDate.substring(0, 10) }'
            ,  ${ idUserLogON }
            ,  ${ idSucursalLogON }
            )`,{ transaction: tran })

            console.log( OSQL )
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message:"No se registró el corte de caja."
              });
      
          }
          else{
  
            idCorteCaja = OSQL[0].idCorteCaja;

            if( idCorteCaja.length > 0 ){

                var OSQL2 = await dbConnection.query(`call getPaymentsToCorteCaja(
                    ${ idCaja }
                    , '${ selectedDate.substring(0, 10) }'
                )`);

                for(var i = 0; i < OSQL2.length; i++){
                    var payment = OSQL2[i];

                    console.log( payment )

                    var OSQL3 = await dbConnection.query(`call insertCorteCajaIngresos(
                        '${ idCorteCaja }'
                        , ${ idCaja }
                        , ${ idUserLogON }
                        , '${ payment.idPayment }'
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
                        '${ idCorteCaja }'
                        , ${ idCaja }
                        , ${ idUserLogON }
                        , '${ egreso.idEgreso }'
                    )`,{ transaction: tran })

                    if(OSQL5[0].idNew > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }

                }

                if( preCorteCaja ){

                    const {
                        pesosCaja = 0
                        ,dolaresF = 0
                        ,fxRate = 0
                        ,dolaresMNX = 0
                        ,vouchersCaja = 0
                        ,transferenciasCaja = 0
                        ,totalCaja = 0
                        ,diferencia = 0
                        ,observaciones = ''
                    } = preCorteCaja;

                    var bCuadro = diferencia == 0 ? 1 : 2;

                    var OSQL6 = await dbConnection.query(`call insertCorteCajaDetail(
                        '${ idCorteCaja }'
                        , '${ pesosCaja }'
                        , '${ dolaresF }'
                        , '${ fxRate }'
                        , '${ dolaresMNX }'
                        , '${ vouchersCaja }'
                        , '${ transferenciasCaja }'
                        , '${ totalCaja }'
                        ,  ${ bCuadro }
                        , '${ diferencia }'
                        , '${ observaciones }'
        
                        , ${ idUserLogON }
                    )`,{ transaction: tran })
        
                    if(OSQL6[0].idNew > 0){
                        bOK = true;
                    }else{
                        bOK = false;
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

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call insertEgresos(
        '  ${oGetDateNow}'
        ,  ${ idCaja }
        ,  ${ idFormaPago }
        , '${ description }'
        , '${ amount }'

        , ${ idUserLogON }
        , ${ idSucursalLogON }
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
        '${ idEgreso }'
        )`)

        res.json({
            status: 0,
            message: "Egreso cancelado con éxito.",
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

const getCorteCajaByID = async(req, res = response) => {

    const {
        idCorteCaja
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getCorteCajaByID( '${ idCorteCaja }' )`)

        //console.log( OSQL )

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

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};

const getEgresosByIDCorteCaja = async(req, res = response) => {

    const {
        idCorteCaja
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getEgresosByIDCorteCaja( '${ idCorteCaja }' )`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró información.",
                data: []
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
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};

const getCorteCajaListWithPage = async(req, res = response) => {

    const {
        createDateStart = ''
        , createDateEnd = ''
        
        , idSucursal = 0
        , idCaja = 0

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    console.log(req.body)

    console.log( new Date() )

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getCorteCajaListWithPage(
            '${ createDateStart }'
            , '${ createDateEnd }'
            , ${ idSucursal }
            , ${ idCaja }

            , '${ search }'
            , ${ start }
            , ${ limiter }

            , ${ idSucursalLogON }
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

        await dbConnectionNEW.close();
        
    }catch(error){

        await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const disabledSale = async(req, res) => {

    const {
        idSale,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var saleDetail = await dbConnection.query(`call getSalesDetail( '${ idSale }' )`)

        var OSQL_oPayments = await dbConnection.query(`call getPaymentsByIdSaleListWithPage(
            '${ idSale }'

            ,''
            ,0
            ,100000
            )`)

        for(var i = 0; i < saleDetail.length; i++){
                        
            var saleD = saleDetail[i];

            var OSQL = await dbConnection.query(`call insertInventaryLog(
                '${oGetDateNow}'
                ,  ${ saleD.idProduct }
                , '${ saleD.cantidad }'
                , 'Se regresa por cancelación de venta #${ idSale }'

                , ${ idUserLogON }
            )`,{ transaction: tran })

            if(OSQL[0].out_id > 0){
                bOK = true;
            }else{
                bOK = false;
                break;
            }
        }

        var OSQL2 = await dbConnection.query(`call disabledSale(
            '${ idSale }'
        )`,{ transaction: tran })

        if(OSQL2[0].idSale.length > 0){
            bOK = true;
        }else{
            bOK = false;
        }

        

        if(OSQL_oPayments.length > 0){

            for(var i = 0; i < OSQL_oPayments.length; i++){
                        
                var oPayments = OSQL_oPayments[i];

                if( oPayments.idFormaPago == 5 ){

                    var OSQL_Sale = await dbConnection.query(`call getSaleByID( '${ idSale }' )`)

                    var OSQL2 = await dbConnection.query(`call insertElectronicMoney(
                        '${ oGetDateNow }'
                        ,  ${ OSQL_Sale[0].idCustomer }
                        , '${ oPayments.pago }'
                        , 'Se regresa por cancelación de pago #${ oPayments.idPayment }'
                        , '${ oPayments.idSale }'
                        , 'P'

                        , ${ idUserLogON }
                        )`,{ transaction: tran })
    
                    if(bOK && OSQL2[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                    }

                }

                var OSQL_insertPaymentsCanceled = await dbConnection.query(`call insertPaymentsCanceled(
                    '${oGetDateNow}'
                    , '${ oPayments.idPayment }'
                    , ${ oPayments.iPagoCortado }

                    , ${ idUserLogON }
                    )`,{ transaction: tran })
    
                if(OSQL_insertPaymentsCanceled[0].out_id > 0){
                    bOK = true;
                }else{
                    bOK = false;
                }

                if( bOK ){

                    var OSQL_disabledPayment = await dbConnection.query(`call disabledPayment(
                        '${ oPayments.idPayment }'
                        )`,{ transaction: tran })

                    if(OSQL_disabledPayment[0].idRelation.length > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                    }
                }

            }

        }
    
        if(bOK){
            
            await tran.commit();

            res.json({
                status: 0,
                message: "Venta cancelada con éxito.",
                insertID: idSale
            });

        }else{
            
            await tran.rollback();

            res.json({
                status: 1,
                message: "No se pudo cancelar la Venta."
            });
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

const getConsHistory = async(req, res = response) => {

    const {
        idSale
    } = req.body;
  
    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getConsHistory( '${ idSale }' )`)

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

const getEgresoByID = async(req, res = response) => {

    const {
        idEgreso
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getEgresoByID( '${ idEgreso }' )`)

        if(OSQL.length == 0){
        
            res.json({
                status: 1,
                message: "No se encontró el egreso.",
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

    }catch(error){
            
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const disabledPayment = async(req, res) => {
   
    const {
        idSale
        , idPayment
        , sOption

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();
    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    var bOK = false;

    try{

        var OSQL_SalesDetail = await dbConnection.query(`call getPaymentsByIdSaleListWithPage(
            '${ idSale }'

            ,''
            ,0
            ,100000
            )`)

        var oPayment = OSQL_SalesDetail.filter( item => item.idPayment === idPayment);

        //console.log(oPayment)

        if(oPayment.length == 0){

            res.json({
                status: 1,
                message: "No se puede cancelar el pago."
            });

        }
        else{

            bOK = true;

            if(oPayment[0].active == 1){

                var OSQL_Sale = await dbConnection.query(`call getSaleByID( '${ idSale }' )`)

                if( oPayment[0].idFormaPago == 5 ){

                    var OSQL2 = await dbConnection.query(`call insertElectronicMoney(
                        '${ oGetDateNow }'
                        ,  ${ OSQL_Sale[0].idCustomer }
                        , '${ oPayment[0].pago }'
                        , 'Se regresa por cancelación de pago #${ idPayment }'
                        , '${ oPayment[0].idRelation }'
                        , '${ oPayment[0].relationType }'

                        , ${ idUserLogON }
                        )`,{ transaction: tran })
    
                    if(bOK && OSQL2[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                    }

                }

                if( bOK && sOption == 'E' )
                {
                    var OSQL_insertEgresos = await dbConnection.query(`call insertEgresos(
                        '${oGetDateNow}'
                        ,  ${ oPayment[0].idCaja }
                        ,  1
                        , 'Devolución del pago #${ oPayment[0].idPayment }'
                        , '${ oPayment[0].pago }'
                
                        , ${ idUserLogON }
                        , ${ idSucursalLogON }
                        )`,{ transaction: tran });

                    if(bOK && OSQL_insertEgresos[0].idNew.length > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                    }
                }
                else if( bOK && sOption == 'EM' && oPayment[0].idFormaPago != 5 )
                {
                    var OSQL_insertElectronicMoney = await dbConnection.query(`call insertElectronicMoney(
                        '${ oGetDateNow }'
                        ,  ${ OSQL_Sale[0].idCustomer }
                        , '${ oPayment[0].pago }'
                        , 'Se agrega por devolución de pago #${ idPayment }'
                        , '${ idPayment }'
                        , 'P'

                        , ${ idUserLogON }
                        )`,{ transaction: tran })
    
                    if(bOK && OSQL_insertElectronicMoney[0].out_id > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                    }
                }

                var OSQL_insertPaymentsCanceled = await dbConnection.query(`call insertPaymentsCanceled(
                    '${oGetDateNow}'
                    , '${ idPayment }'
                    , ${ oPayment[0].iPagoCortado }

                    , ${ idUserLogON }
                    )`,{ transaction: tran })
    
                if(bOK && OSQL_insertPaymentsCanceled[0].out_id > 0){
                    bOK = true;
                }else{
                    bOK = false;
                }

                var OSQL_disabledPayment = await dbConnection.query(`call disabledPayment(
                    '${ idPayment }'
                    )`,{ transaction: tran })

                if(bOK && OSQL_disabledPayment[0].idRelation.length > 0){
                    bOK = true;
                }else{
                    bOK = false;
                }

                if(bOK){

                    await tran.commit();
        
                    res.json({
                        status: 0,
                        message: "Pago cancelado con éxito.",
                    });
        
                }else{
        
                    await tran.rollback();
        
                    res.json({
                        status: 1,
                        message: "No se puede cancelar el pago.",
                    });
        
                }
            
            }else{

                res.json({
                    status: 1,
                    message: "No se puede cancelar el pago."
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

const getEgresosListWithPage = async(req, res = response) => {

    var {
        date = ''
        , description = ''
        , amount = 0

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getEgresosListWithPage(
            '${ date.substring(0, 10) }'
            , '${ description }'
            , '${ amount }'

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
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                count: iRows,
                rows: OSQL
                }
            });
            
        }

        await dbConnectionNEW.close();
        
    }catch(error){

        await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const disableSaleDetail = async(req, res) => {

    const {
        idSaleDetail,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    var oResponse = {
        status: 0,
        message: ""
    };

    try{

        var oSaleDetail = await dbConnection.query(`call getSalesDetailByID( ${ idSaleDetail } )`)

        if(oSaleDetail.length == 0){
            oResponse.status = 1
            oResponse.message = "No se encontraron datos"
        }

        if(oSaleDetail[0].active == 0){
            oResponse.status = 1
            oResponse.message = "No se realizó la acción"
        }

        var OSQL_disabledSaleDetail = await dbConnection.query(`call disabledSaleDetail(
            ${ idSaleDetail }
        )`,{ transaction: tran })

        if(OSQL_disabledSaleDetail[0].out_id > 0){
            bOK = true;
        }else{
            bOK = false;
        }

        var OSQL_insertInventaryLog = await dbConnection.query(`call insertInventaryLog(
            '${oGetDateNow}'
            ,  ${ oSaleDetail[0].idProduct }
            , '${ oSaleDetail[0].cantidad }'
            , 'Se regresa por cancelación de venta #${ oSaleDetail[0].idSale }'

            , ${ idUserLogON }
        )`,{ transaction: tran })

        if(OSQL_insertInventaryLog[0].out_id > 0){
            bOK = true;
        }else{
            bOK = false;
        }
    
        if(bOK){
            
            await tran.commit();

            oResponse.status = 0;
            oResponse.message = "Producto eliminado de la venta";

        }else{
            
            await tran.rollback();

            oResponse.status = 1;
            oResponse.message = "No se pudo eliminar el producto de la venta";

        }
      
    }catch(error){

        await tran.rollback();

        oResponse.status = 2
        oResponse.message = "Sucedió un error inesperado"
        oResponse.data = error.message

    }

    res.json( oResponse );
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

    , getCorteCajaByID

    , getEgresosByIDCorteCaja

    , getCorteCajaListWithPage

    , disabledSale

    , getConsHistory

    , getEgresoByID
    , disabledPayment
    , getEgresosListWithPage

    , disableSaleDetail

}