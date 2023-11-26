const { response } = require('express');
const bcryptjs = require('bcryptjs');

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

    try{

        if( idSucursalLogON > 0 ){
            
            var OSQL = await dbConnection.query(`call insertSale(
            ${ idSucursalLogON }
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
    
                        var OSQL2 = await dbConnection.query(`call insertSaleDetail(
                            '${ idSale }'
                            , ${ saleD.idProduct }
                            , '${ saleD.cantidad }'
                            , '${ saleD.cost }'
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

    const {
        idUser
        ,createDateStart = ''
        ,createDateEnd = ''
        ,idCustomer = 0

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

        var OSQL = await dbConnectionNEW.query(`call getVentasListWithPage(
            ${idUser}
            , '${createDateStart}'
            , '${createDateEnd}'
            , ${idCustomer}

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
  
    try{

        for( var i = 0; i < paymentList.length; i++){

            var OPayment = paymentList[i];

            var OSQL = await dbConnection.query(`call insertPayments(
                ${ idCaja }
                , '${ OPayment.idRelation }'
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
                        ${ idCustomer }
                        ,'-${ OPayment.paga }'
                        ,'Se utiliza en el pago #${ idPayment }'
                        ,'${ OPayment.idRelation }'
                        ,'${ OPayment.relationType }'

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
  
    try{

        var OSQL = await dbConnection.query(`call insertSale(
            ${ idSucursalLogON }
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
                          '${ idSale }'
                          , ${ saleD.idProduct }
                          , '${ saleD.consCantidad }'
                          , '${ saleD.cost }'
                          , '${ saleD.precioUnitario }'
                          , '${ saleD.descuento }'
                          , '${ saleD.precio }'
                          , '${ saleD.consCantidad * saleD.precio }'
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
                            '${ idSaleOld }'
                            , ${ saleD.idSaleDetail }
                            , 'Se pasó a ${ ( idSaleType == 1 ? 'una venta de crédito' : idSaleType == 2 ? 'una venta de contado' : idSaleType == 3 ? 'un apartado' : '' ) + ': #' + idSale }'
                            , '${ saleD.consCantidad }'
                            , ${ idUserLogON }
                            )`,{ transaction: tran })

                        if(OSQL4[0].idNew > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        var OSQL5 = await dbConnection.query(`call changeInventaryLogCons(
                            ${ saleD.idProduct }
                            ,'${ saleD.consCantidad }'
                            ,'${ idSaleOld }'
                            ,'${ idSale }'
                            
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
                ${saleD.idProduct}
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
                '${ saleD.idSale }'
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

        ,idUserLogON
        ,idSucursalLogON
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreCorteCajaByCaja(
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
        , conclusionData

        , idUserLogON
        , idSucursalLogON
    } = req.body;
  
    console.log(req.body)
  
    const tran = await dbConnection.transaction();
  
    var bOK = false;
    var idCorteCaja = '';
  
    try{
  
        var OSQL = await dbConnection.query(`call insertCorteCaja(
            ${ idCaja }
            , ${ idUserLogON }
            , ${ idSucursalLogON }
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

                if( conclusionData ){

                    var bCuadro = conclusionData.bCuadro;
                    var falto = conclusionData.falto;
                    var sobro = conclusionData.sobro;
                    var observaciones = conclusionData.observaciones;

                    var OSQL6 = await dbConnection.query(`call insertCorteCajaDetail(
                        '${ idCorteCaja }'
                        , ${ bCuadro }
                        , '${ falto }'
                        , '${ sobro }'
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

    try{

        var OSQL = await dbConnection.query(`call insertEgresos(
        ${ idCaja }
        , ${ idFormaPago }
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

const insertCorteCajaDetail = async(req, res) => {
   
    const {
        idCorteCaja
        , paymentList

        , idUserLogON
        , idSucursalLogON
    } = req.body;
  
    console.log(req.body)
  
    const tran = await dbConnection.transaction();
  
    var bOK = false;
    try{

        for( var i = 0; i < paymentList.length; i++ ){
            
            var payment = paymentList[i];

            console.log( payment )

            var OSQL = await dbConnection.query(`call insertCorteCajaDetail(
                '${ idCorteCaja }'
                , ${ payment.idFormaPago }
                , ${ payment.numPagos }
                , ${ payment.saldo }
                , ${ payment.egresos }
                , ${ payment.saldo - payment.egresos }
                , ${ payment.saldoCaja }
                , ${ payment.restoCaja }
                , ${ payment.valorMXN }

                , ${ idUserLogON }
            )`,{ transaction: tran })

            if(OSQL[0].idNew > 0){
                bOK = true;
            }else{
                bOK = false;
                break;
            }

        }

        if(bOK){

            await tran.commit();

            res.json({
                status: 0,
                message: "Detalle de Corte de caja guardado con éxito.",
                insertID: idCorteCaja
            });

        }else{

            await tran.rollback();

            res.json({
                status: 1,
                message: "No se guardó el Detalle de Corte de caja."
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

    try{

        var saleDetail = await dbConnection.query(`call getSalesDetail( '${ idSale }' )`)

        for(var i = 0; i < saleDetail.length; i++){
                        
            var saleD = saleDetail[i];

            var OSQL = await dbConnection.query(`call insertInventaryLog(
                ${ saleD.idProduct }
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
    
        if(bOK){
            
            await tran.commit();

            res.json({
                status: 0,
                message: "Venta eliminada con éxito.",
                insertID: idSale
            });

        }else{
            
            await tran.rollback();

            res.json({
                status: 1,
                message: "No se eliminó la Venta."
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

    , insertCorteCajaDetail

    , getCorteCajaByID

    , getEgresosByIDCorteCaja

    , getCorteCajaListWithPage

    , disabledSale

    , getConsHistory

    , getEgresoByID

}