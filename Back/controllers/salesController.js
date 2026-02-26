const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');
const { Sequelize } = require('sequelize');
const fs = require('fs');
const path = require('path');

const { dbConnection } = require('../database/config');
const { Console } = require('console');

const insertSale = async(req, res) => {

    const {
        idSeller_idUser,
        idCustomer,
        idSaleType,
        fechaEntrega = '',

        saleDetail,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    const p_jsonString = JSON.stringify(req.body);

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
            ,'${ fechaEntrega ? fechaEntrega.substring(0, 10) : '0' }'
            , ${ idUserLogON }
            )`)
    
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

                        var descriptionTaller = ( idSaleType == "5" || idSaleType == "6" ? saleD.productDesc : '' )
    
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
                            , ${ idSaleType }

                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
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
                    
                    res.json({
                        status: 0,
                        message: "Venta guardada con éxito.",
                        insertID: idSale
                    });
    
                }else{
                    
                    var OSQL = await dbConnection.query(`call deleteSaleByError(
                        '${ idSale }'
                        , '${oGetDateNow}'
                        , ${ idSucursalLogON }
                        , 'Error en venta: ${ p_jsonString }'
                        )`)
    
                    res.json({
                        status: 1,
                        message: "No se guardó la Venta."
                    });
                }

            }

        }else{
            
            res.json({
                status: 1,
                message: "No se puede registrar la venta si no está en una sucursal."
            });

        }

    }catch(error){

        if( idSale.length > 0 ){
        
            var OSQL = await dbConnection.query(`call deleteSaleByError(
                '${ idSale }'
                , '${oGetDateNow}'
                , ${ idSucursalLogON }
                , '${ error }:  ${ p_jsonString }'
                )`)
                
        }

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getVentasListWithPage = async(req, res = response) => {

    var {
        createDateStart = ''
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

    ////console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        if (bPending && bPagada)
        {
            bPending = false;
            bPagada = false;
        }

        //////console.log( bPending )
        //////console.log( bPagada )

        var OSQL = await dbConnection.query(`call getVentasListWithPage(
            ${idUserLogON}
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

        //////console.log(OSQL)

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

        //await dbConnection.close();
        
    }catch(error){

        //await dbConnection.close();
      
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
  
    ////console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getSaleByID( '${ idSale }' )`)
  
        if(OSQL.length == 0){
      
            res.json({
                status: 1,
                message: "No se encontró la venta.",
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
  
    ////console.log(req.body)

    var bOK = false;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
  
    var rollbackList = [];

    try{
        
        for( var i = 0; i < paymentList.length; i++){

            var OPayment = paymentList[i];

            var OSQL_getSaleByID = await dbConnection.query(`call getSaleByID( '${ OPayment.idRelation }' )`)
            OSQL_getSaleByID = OSQL_getSaleByID[0]

            if(OSQL_getSaleByID.idSaleType == 5){
                OSQL_getSaleByID = await dbConnection.query(`call getTallerByIdSale( '${ OPayment.idRelation }' )`)
                OSQL_getSaleByID = OSQL_getSaleByID[0]
            }

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
                        )`)
        
                    var idPayment = OSQL[0].out_id;
            
                    if(idPayment.length > 0){
                        bOK = true;
                        rollbackList.push( { type: 'Payment', idRelation: idPayment } );
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
                            )`)
        
                        if(OSQL2[0].out_id > 0){
                            bOK = true;
                            rollbackList.push( { type: 'ElectronicMoney', idRelation: OSQL2[0].out_id } );
                        }else{
                            bOK = false;
                            break;
                        }
                        
                    }

                }

            }
            
        }
        
        if(bOK){

            res.json({
                status: 0,
                message: "Pago guardado con éxito."
            });

        }else{
            
            for(var i = 0; i < rollbackList.length; i++){

                if(rollbackList[i].type == 'Payment'){

                    var OSQL = await dbConnection.query(`call deletePaymentByError(
                        '${ rollbackList[i].idRelation }'
                        , '${oGetDateNow}'
                        , ${ idSucursalLogON }
                        )`)

                }else if(rollbackList[i].type == 'ElectronicMoney'){

                    var OSQL = await dbConnection.query(`call deleteElectronicMoneyByError(
                        '${ rollbackList[i].idRelation }'
                        , '${oGetDateNow}'
                        , ${ idSucursalLogON }
                        )`)

                }
                    
            }

            res.json({
                status: 1,
                message: "No se guardó el pago."
            });

        }

    }catch(error){

        for(var i = 0; i < rollbackList.length; i++){

            if(rollbackList[i].type == 'Payment'){

                var OSQL = await dbConnection.query(`call deletePaymentByError(
                    '${ rollbackList[i].idRelation }'
                    , '${oGetDateNow}'
                    , ${ idSucursalLogON }
                    )`)

            }else if(rollbackList[i].type == 'ElectronicMoney'){

                var OSQL = await dbConnection.query(`call deleteElectronicMoneyByError(
                    '${ rollbackList[i].idRelation }'
                    , '${oGetDateNow}'
                    , ${ idSucursalLogON }
                    )`)

            }
                
        }
  
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

    //console.log(req.body)

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
        fechaEntrega = '',

        saleDetail,

        idUserLogON,
        idSucursalLogON
    } = req.body;
  
    //console.log(req.body)
  
    var bOK = false;
    var idSale = '';
    var bBorro = 0;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
  
    try{

        new Promise((resolve, reject) => {

            dbConnection.transaction( async (tran) => {
            
                var OSQL = await dbConnection.query(`call insertSale(
                    '${oGetDateNow}'
                    , ${ idSucursalLogON }
                    , ${ idSeller_idUser }
                    , ${ idCustomer }
                    , ${ idSaleType }
                    ,'${ fechaEntrega ? fechaEntrega.substring(0, 10) : '0' }'
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
    
                            var OSQL2 = await dbConnection.query(`call insertSaleConsDetail(
                            '${oGetDateNow}'
                                , '${ idSaleOld }'
                                , '${ idSale }'
                                ,  ${ saleD.idProduct }
                                , '${ saleD.consCantidad }'
                                , '${ saleD.cost }'
                                , '${ saleD.precioUnitario }'
                                , '${ saleD.descuento }'
                                , '${ saleD.precio }'
                                , '${ saleD.consCantidad * saleD.precio }'
                                , ''
                                , ${ saleD.idSaleDetail }
                                , 'Se pasó a ${ ( idSaleType == 1 ? 'una venta de crédito' : idSaleType == 2 ? 'una venta de contado' : idSaleType == 3 ? 'un apartado' : '' ) + ': #' + idSale }'
    
                                , ${ idUserLogON }
                                , ${ idSucursalLogON }
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

                    resolve();
            
                }
            
            }).catch(reject);
        
        }).then(() => {
            console.log('Transacción completada');
        }).catch((error) => {
            console.error('Error en la transacción:', error);
        });
        
    }catch(error){
  
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

    //console.log(req.body)

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

                , 1
                , 1
                , ''
                , 0
                , 0
                , 0

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
                , ${ idSucursalLogON }
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

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreCorteCajaByCaja(
            ${ idCaja }
            , '${ selectedDate.substring(0, 10) }'
            )`)

            console.log(OSQL)

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

    //console.log(req.body)

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
  
    //console.log(req.body)
  
    var idCorteCaja = '';

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
  
    try{

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
  
        var OSQL = await dbConnection.query(`call insertCorteCaja(
            '${oGetDateNow}'
            ,  ${ idCaja }
            , '${ selectedDate.substring(0, 10) }'

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

            ,  ${ idUserLogON }
            ,  ${ idSucursalLogON }
            )`)

            //console.log( OSQL )
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message:"No se registró el corte de caja."
              });
      
          }
          else{
  
            idCorteCaja = OSQL[0].idCorteCaja;
            
            res.json({
                status: 0,
                message: "Corte de caja guardada con éxito.",
                insertID: idCorteCaja
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

const insertEgresos = async(req, res) => {

    const {

        idCaja,
        idFormaPago,
        description = '',

        amount,

        idUserLogON,
        idSucursalLogON
      
    } = req.body;
  
    //console.log(req.body)

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
                message: "No se registró el egreso."
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

    //console.log(req.body)

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

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getCorteCajaByID( '${ idCorteCaja }' )`)

        ////console.log( OSQL )

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

    //console.log(req.body)

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

    //console.log(req.body)

    //console.log( new Date() )

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getCorteCajaListWithPage(
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

        //await dbConnectionNEW.close();
        
    }catch(error){

        //await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const disabledSale = async(req, res) => {

    const {
        sOption = '',
        idSale,
        auth_idUser = 0,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if(auth_idUser == 0){
            res.json({
                status: 1,
                message: "No se pudo cancelar la Venta porque no fue autorizada la acción."
            });
            return;
        }

        var OSQL = await dbConnection.query(`call cancelarVentaCompleta(
            '${ oGetDateNow }'
            , '${ sOption }'
            , '${ idSale }'
            , ${ auth_idUser }
            
            , ${ idUserLogON }
            , ${ idSucursalLogON }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se puede cancelar el pago."
            });

        }else{

            res.json({
                status: OSQL[0].bOK > 0 ? 0 : 1,
                message: OSQL[0].message
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

const getConsHistory = async(req, res = response) => {

    const {
        idSale
    } = req.body;
  
    //console.log(req.body)

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

    //console.log(req.body)

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
        , auth_idUser

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call cancelarPagoCortado(
            '${ oGetDateNow }'
            , '${ sOption }'
            , '${ idSale }'
            , '${ idPayment }'
            , ${ auth_idUser }
            
            , ${ idUserLogON }
            , ${ idSucursalLogON }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se puede cancelar el pago."
            });

        }else{

            res.json({
                status: OSQL[0].bOK > 0 ? 0 : 1,
                message: OSQL[0].message
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

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getEgresosListWithPage(
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

        // await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
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

    //console.log(req.body)

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

        var OSQL_SaleByID = await dbConnection.query(`call getSaleByID( '${ oSaleDetail[0].idSale }' )`)

        var OSQL_disabledSaleDetail = await dbConnection.query(`call disabledSaleDetail(
            ${ idSaleDetail }
        )`,{ transaction: tran })

        if(OSQL_disabledSaleDetail[0].out_id > 0){
            bOK = true;
        }else{
            bOK = false;
        }

        if(OSQL_SaleByID[0].idSaleType != 6 && oSaleDetail[0].idProduct > 0){
            
            var OSQL_insertInventaryLog = await dbConnection.query(`call insertInventaryLog(
                '${oGetDateNow}'
                ,  ${ oSaleDetail[0].idProduct }
                , '${ oSaleDetail[0].cantidad }'
                , 'Se regresa por cancelación de venta #${ oSaleDetail[0].idSale }'
    
                , 1
                , 1
                , ''
                , 0
                , 0
                , 0
    
                , ${ idUserLogON }
            )`,{ transaction: tran })
    
            if(OSQL_insertInventaryLog[0].out_id > 0){
                bOK = true;
            }else{
                bOK = false;
            }

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

const editSobreTaller = async(req, res) => {

    const {
        auth_idUser = 0,
        idSale = '',
        importe = 0,
        descriptionTaller = '',
        idStatusSobre,
        fechaEntrega,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if(auth_idUser == 0){
            res.json({
                status: 1,
                message: "No se pudo cancelar la Venta porque no fue autorizada la acción."
            });
            return;
        }

        var OSQL_editSobreTaller = await dbConnection.query(`call editSobreTaller(
            '${oGetDateNow}'
            ,'${ idSale }'
            ,'${ importe }'
            ,'${ descriptionTaller }'
            , ${ idStatusSobre }
            ,'${ fechaEntrega ? fechaEntrega.substring(0, 10) : '0' }'

            , ${ auth_idUser }

            , ${ idUserLogON }
            , ${ idSucursalLogON }
        )`)

        //console.log( OSQL_editSobreTaller )

       if(OSQL_editSobreTaller[0].bOK > 0){
            
            res.json({
                status: 0,
                message: "Sobre actualizado",
            });

        }else{
            
            res.json({
                status: 1,
                message: "No se pudo actualizar el sobre",
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

const getRepVentasDetailWithPage = async(req, res = response) => {

    var {
        createDateStart = ''
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

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        if (bPending && bPagada)
        {
            bPending = false;
            bPagada = false;
        }

        var OSQL_Sum = await dbConnection.query(`call getRepVentasSumByIdSaleType(
            ${idUserLogON}
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

        //console.log( OSQL_Sum )



        var OSQL = await dbConnection.query(`call getRepVentasDetailWithPage(
            ${idUserLogON}
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

        //console.log(OSQL)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"No se encontró información.",
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
                    rows: OSQL,
                    repVentasSumByIdSaleType: OSQL_Sum
                }
            });
            
        }

        // await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const cbxGetSobreTellerStatusCombo = async(req, res = response) => {

    const {
        search = ''
    } = req.body;
  
    //////console.log(req.body)
    
    try{

        var OSQL = await dbConnection.query(`call cbxGetSobreTellerStatusCombo( '${search}' )`)

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

const insertIngresos = async(req, res) => {

    const {

        idCaja,
        idFormaPago,
        description = '',

        amount,

        idUserLogON,
        idSucursalLogON
        
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call insertIngresos(
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
                message: "No se registró el Ingreso."
            });

        }
        else{

            res.json({
                status: 0,
                message: "Ingreso guardado con éxito.",
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

const disabledIngresos = async(req, res) => {
   
    const {
        idIngreso
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call disabledIngresos(
        '${ idIngreso }'
        )`)

        res.json({
            status: 0,
            message: "Ingreso cancelado con éxito.",
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

const getPreIngresosCorteCaja = async(req, res = response) => {

    const {
        idCaja

        ,idUserLogON
        ,idSucursalLogON
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreIngresosCorteCaja(
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

const getIngresoByID = async(req, res = response) => {

    const {
        idIngreso
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getIngresoByID( '${ idIngreso }' )`)

        if(OSQL.length == 0){
        
            res.json({
                status: 1,
                message: "No se encontró el ingreso.",
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

const getIngresosByIDCorteCaja = async(req, res = response) => {

    const {
        idCorteCaja
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getIngresosByIDCorteCaja( '${ idCorteCaja }' )`)

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

const getIngresosListWithPage = async(req, res = response) => {

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

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getIngresosListWithPage(
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

        // await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getDatosRelacionadosByIDCorteCaja = async(req, res = response) => {

    const {
        idCorteCaja
    } = req.body;

    //console.log(req.body)

    try{

        var egresosList = await dbConnection.query(`call getEgresosByIDCorteCaja( '${ idCorteCaja }' )`)
        var ingresosList = await dbConnection.query(`call getIngresosByIDCorteCaja( '${ idCorteCaja }' )`)
        var pagosCanList = await dbConnection.query(`call getPagosCanceladosByIDCorteCaja( '${ idCorteCaja }' )`)

        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            egresosList: egresosList,
            ingresosList: ingresosList,
            pagosCanList: pagosCanList
        });


    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

};

const getRepPagosCanceladosWithPage = async(req, res = response) => {
    
    var {
        createDateStart = ''
        , createDateEnd = ''
        , idCustomer = 0
        , idSale = ''
        , idPayment = ''

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        // var OSQL_Sum = await dbConnection.query(`call getRepVentasSumByIdSaleType(
        //     ${idUserLogON}
        //     , '${createDateStart.substring(0, 10)}'
        //     , '${createDateEnd.substring(0, 10)}'
        //     , ${idCustomer}
        //     , ${idSaleType}

        //     , ${bCancel}
        //     , ${bPending}
        //     , ${bPagada}

        //     , '${ search }'
        //     , ${ start }
        //     , ${ limiter }

        //     , ${ idSucursalLogON }
        //     )`)

        //console.log( OSQL_Sum )



        var OSQL = await dbConnection.query(`call getRepPagosCanceladosWithPage(
            ${idUserLogON}
            , '${ createDateStart.substring(0, 10) }'
            , '${ createDateEnd.substring(0, 10) }'
            , ${ idCustomer }
            , '${ idSale }'
            , '${ idPayment }'


            , '${ search }'
            , ${ start }
            , ${ limiter }

            , ${ idSucursalLogON }
            )`)

        //console.log(OSQL)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"No se encontró información.",
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
                    rows: OSQL,
                    //repVentasSumByIdSaleType: OSQL_Sum
                }
            });
            
        }

        // await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getRepPagosWithPage = async(req, res = response) => {
    
    var {
        createDateStart = ''
        , createDateEnd = ''
        , idCustomer = 0
        , idSale = ''
        , idPayment = ''
        , idCorteCaja = ''

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        // var OSQL_Sum = await dbConnection.query(`call getRepVentasSumByIdSaleType(
        //     ${idUserLogON}
        //     , '${createDateStart.substring(0, 10)}'
        //     , '${createDateEnd.substring(0, 10)}'
        //     , ${idCustomer}
        //     , ${idSaleType}

        //     , ${bCancel}
        //     , ${bPending}
        //     , ${bPagada}

        //     , '${ search }'
        //     , ${ start }
        //     , ${ limiter }

        //     , ${ idSucursalLogON }
        //     )`)

        //console.log( OSQL_Sum )

        var OSQL_Sum = await dbConnection.query(`call getRepPagosSUM(
            ${idUserLogON}
            , '${ createDateStart.substring(0, 10) }'
            , '${ createDateEnd.substring(0, 10) }'
            , ${ idCustomer }
            , '${ idSale }'
            , '${ idPayment }'
            , '${ idCorteCaja }'


            , '${ search }'
            , ${ start }
            , ${ limiter }

            , ${ idSucursalLogON }
            )`)

        //console.log( OSQL_Sum[0] )

        var OSQL = await dbConnection.query(`call getRepPagosWithPage(
            ${idUserLogON}
            , '${ createDateStart.substring(0, 10) }'
            , '${ createDateEnd.substring(0, 10) }'
            , ${ idCustomer }
            , '${ idSale }'
            , '${ idPayment }'
            , '${ idCorteCaja }'


            , '${ search }'
            , ${ start }
            , ${ limiter }

            , ${ idSucursalLogON }
            )`)

        //console.log(OSQL)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"No se encontró información.",
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
                    rows: OSQL,
                    OSQL_Sum: OSQL_Sum
                    //repVentasSumByIdSaleType: OSQL_Sum
                }
            });
            
        }

        // await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const addRefaccionTaller = async(req, res) => {

    var {
        idTaller,
        idSale,
        refaccion,
        idUserLogON,
        idSucursalLogON
    } = req.body;
    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    var bOK = false;

    try {

        // Ahora insertar la refacción como detalle de la venta
        if ( ( idSale.length > 0 || idSale > 0 ) && idTaller > 0) {

            var idRefaccion = refaccion.idRefaccion || 0;
            var idProduct = refaccion.idProduct || 0;
            var productDesc = refaccion.productDesc || '';
            var cantidad = refaccion.cantidad || 1;
            var precio = refaccion.precio || 0;
            var costo = refaccion.costo || 0;
            var tipoRefaccion = refaccion.tipo || 'porDefinir';

            var OSQL_InsertRefaccion = await dbConnection.query(`call insertUpdateTallerRefacciones(
                ${ idRefaccion }
                , '${ oGetDateNow }'
                , ${ idTaller }
                , '${ idSale }'
                , ${ idProduct }
                , '${ productDesc }'
                , '${ cantidad }'
                , '${ costo }'
                , '${ precio }'
                , ${ idUserLogON }
            )`);

            res.json({
                status: OSQL_InsertRefaccion[0].out_id > 0 ? 0 : 1,
                message: OSQL_InsertRefaccion[0].message,
            });
        }

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const deleteRefaccionTaller = async(req, res = response) => {

    const {
        idRefaccion,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {

        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        var OSQL = await dbConnection.query(`call deleteRefaccionTaller(
            ${ idRefaccion }
            , '${ oGetDateNow }'
            , ${ idUserLogON }
        )`);
        console.log(OSQL)

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const addServicioExternoTaller = async(req, res) => {

    var {
        idTaller,
        idSale,
        servicioExterno,
        idUserLogON,
        idSucursalLogON
    } = req.body;
    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    var bOK = false;

    try {

        // Ahora insertar el servicio externo como detalle de la venta
        if ( ( idSale.length > 0 || idSale > 0 ) && idTaller > 0) {

            var idServicioExternoDetalle = servicioExterno.idServicioExternoDetalle || 0;
            var idServicioExterno = servicioExterno.idServicioExterno || 0;
            var nombre = servicioExterno.nombre || '';
            var cantidad = servicioExterno.cantidad || 1;
            var precio = servicioExterno.precio || 0;
            var costo = servicioExterno.costo || 0;

            var OSQL_InsertServicioExterno = await dbConnection.query(`call insertUpdateTallerServiciosExternos(
                ${ idServicioExternoDetalle }
                , '${ oGetDateNow }'
                , ${ idTaller }
                , '${ idSale }'
                , ${ idServicioExterno }
                , '${ cantidad }'
                , '${ costo }'
                , '${ precio }'
                , ${ idUserLogON }
            )`);

            res.json({
                status: OSQL_InsertServicioExterno[0].out_id > 0 ? 0 : 1,
                message: OSQL_InsertServicioExterno[0].message
            });
        }
    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const deleteServicioExternoTaller = async(req, res = response) => {

    const {
        idServicioExternoDetalle,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {

        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        var OSQL = await dbConnection.query(`call deleteServicioExternoTaller(
            ${ idServicioExternoDetalle }
            , '${ oGetDateNow }'
            , ${ idUserLogON }
        )`);
        console.log(OSQL)

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const saveTallerHeader = async(req, res) => {

    var {
        idTaller = 0,
        idSale = '',
        idSeller_idUser = 0,
        idCustomer = 0,
        descripcion = '',
        fechaIngreso = '',
        fechaPrometidaEntrega = '',
        idUserLogON,
        idSucursalLogON
    } = req.body;
    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try {

        var oSQLInsert = await dbConnection.query(`call insertUpdateSaleTaller(
            '${oGetDateNow}'
            , '${idSale}'
            , ${idSucursalLogON}
            , ${idSeller_idUser}
            , ${idCustomer}
            , '${fechaIngreso ? fechaIngreso.substring(0, 10) : ''}'
            , '${fechaPrometidaEntrega ? fechaPrometidaEntrega.substring(0, 10) : ''}'
            , '${descripcion}'

            , ${idUserLogON}
        )`);

        if (oSQLInsert.length > 0) {
            idSale = oSQLInsert[0].idSale;
            idTaller = oSQLInsert[0].idTaller;
            res.json({
                status: 0,
                message: "Taller creado con éxito.",
                data: {
                    idSale: idSale,
                    idTaller: idTaller
                }
            });
        } else {
            res.json({
                status: 1,
                message: "No se pudo crear el taller."
            });
        }
    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const updateTallerStatus = async(req, res) => {

    var {
        idTaller = 0,
        idTallerStatus = 0,
        precioTotal = 0,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try {

        // Construir la consulta dinámicamente
        let updateQuery = `
            UPDATE taller 
            SET idTallerStatus = ${idTallerStatus}`;
        
        // Solo actualizar precioTotal cuando se pasa a status 2
        if (idTallerStatus === 2) {
            updateQuery += `, precioTotal = ${precioTotal}`;
        }
        
        // Actualizar fechaEntrega cuando se pasa a status 5
        if (idTallerStatus === 5) {
            updateQuery += `, fechaEntrega = '${ oGetDateNow }'`;
        }
        
        updateQuery += ` WHERE idTaller = ${idTaller}`;

        var oSQLUpdate = await dbConnection.query(updateQuery);

        if (oSQLUpdate[0].affectedRows > 0) {
            res.json({
                status: 0,
                message: "Estado del taller actualizado correctamente.",
                data: {
                    idTaller: idTaller,
                    idTallerStatus: idTallerStatus,
                    precioTotal: precioTotal,
                    fechaEntrega: idTallerStatus === 5 ? oGetDateNow : null
                }
            });
        } else {
            res.json({
                status: 1,
                message: "No se pudo actualizar el estado del taller."
            });
        }
    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getTallerByID = async(req, res = response) => {

    const {
        idTaller
    } = req.body;
  
    ////console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getTallerByID( '${ idTaller }' )`)
  
        if(OSQL.length == 0){
      
            res.json({
                status: 1,
                message: "No se encontró la venta.",
                data: null
            });
    
        }
        else{

            var oRefacciones = await dbConnection.query(`call getTallerRefaccciones( '${ idTaller }' )`)
            var oServiciosExternos = await dbConnection.query(`call getTallerServiciosExternos( '${ idTaller }' )`)
            var oMetalesAgranel = await dbConnection.query(`call getTallerMetalesAgranel( '${ idTaller }' )`)
            var oMetalesCliente = await dbConnection.query(`call getTallerMetalesCliente( '${ idTaller }' )`)

            var oManoObra = await dbConnection.query(`
            SELECT 
                tmo.idManoObra,
                tmo.createDate,
                tmo.idTaller,
                tmo.idSale,
                tmo.idUserTecnico,
                u.name as tecnicoDesc,
                u.userName,
                tmo.precio,
                tmo.idCreateUser
            FROM taller_mano_obra tmo
            LEFT JOIN users u ON tmo.idUserTecnico = u.idUser
            WHERE tmo.idTaller = :idTaller
            ORDER BY tmo.createDate DESC
        `, {
            replacements: { idTaller: idTaller },
            type: dbConnection.QueryTypes.SELECT
        });

            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data: {
                    oTaller: OSQL[0],
                    refaccionesDetail: oRefacciones,
                    serviciosExternos: oServiciosExternos,
                    metalesAgranel: oMetalesAgranel,
                    metalesCliente: oMetalesCliente,
                    oManoObra: oManoObra
                }
                
                //dataPayments: OSQL3
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

const getTallerPaginado = async(req, res = response) => {

    var {
        createDateStart = ''
        , createDateEnd = ''
        , idCustomer = 0
        , idSale = ''

        , bCancel = false
        , bPending = false
        , bPagada = false

        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //const dbConnectionNEW = await createConexion();

    try{

        if (bPending && bPagada)
        {
            bPending = false;
            bPagada = false;
        }

        var OSQL = await dbConnection.query(`call getTallerPaginado(
            '${ createDateStart.substring(0, 10) }'
            , '${ createDateEnd.substring(0, 10) }'
            , ${ idCustomer }
            , '${ idSale }'

            , ${ bCancel }
            , ${ bPending }
            , ${ bPagada }

            , ${ start }
            , ${ limiter }

            , ${ idSucursalLogON }
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
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                count: iRows,
                rows: OSQL
                }
            });
            
        }

        //await dbConnection.close();
        
    }catch(error){

        //await dbConnection.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getTallerRefaccciones = async(req, res = response) => {

    const {
        idTaller
    } = req.body;
  
    try{
        var oRefacciones = await dbConnection.query(`call getTallerRefaccciones( '${ idTaller }' )`)
        
        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                refaccionesDetail: oRefacciones
            }
        });
    }catch(error){
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const getTallerServiciosExternos = async(req, res = response) => {

    const {
        idTaller
    } = req.body;
  
    try{
        var oServiciosExternos = await dbConnection.query(`call getTallerServiciosExternos( '${ idTaller }' )`)
        
        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                serviciosExternosDetail: oServiciosExternos
            }
        });
    }catch(error){
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const cbxGetServiciosExternosCombo = async(req, res = response) => {

    const {
        search = ''
    } = req.body;
  
    try{

        var OSQL = await dbConnection.query(`call cbxGetServiciosExternosCombo( '${search}' )`)

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

const addMetalAgranel = async(req, res) => {

    var {
        idTaller,
        idSale,
        metalAgranel,
        idUserLogON,
        idSucursalLogON
    } = req.body;
    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    var bOK = false;

    try {

        // Ahora insertar el metal agranel como detalle de la venta
        if ( ( idSale.length > 0 || idSale > 0 ) && idTaller > 0) {

            var idMetalAgranel = metalAgranel.idMetalAgranel || 0;
            var tipo = metalAgranel.tipo || 'oro';
            var gramos = metalAgranel.gramos || 0;
            var kilates = metalAgranel.kilates || 8;
            var valorMetal = metalAgranel.valorMetal || 0;

            var OSQL_InsertMetalAgranel = await dbConnection.query(`call insertUpdateTallerMetalAgranel(
                ${ idMetalAgranel }
                , '${ oGetDateNow }'
                , ${ idTaller }
                , '${ idSale }'
                , '${ tipo }'
                , ${ gramos }
                , ${ kilates }
                , ${ valorMetal }
                , ${ idUserLogON }
            )`);

            res.json({
                status: OSQL_InsertMetalAgranel[0].out_id > 0 ? 0 : 1,
                message: OSQL_InsertMetalAgranel[0].message
            });
        }

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const deleteMetalAgranel = async(req, res = response) => {

    const {
        idMetalAgranel,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {

        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        var OSQL = await dbConnection.query(`call deleteMetalAgranel(
            ${ idMetalAgranel }
            , '${ oGetDateNow }'
            , ${ idUserLogON }
        )`);
        console.log(OSQL)

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getTallerMetalesAgranel = async(req, res = response) => {

    const {
        idTaller
    } = req.body;
  
    try{
        var oMetalesAgranel = await dbConnection.query(`call getTallerMetalesAgranel( '${ idTaller }' )`)
        
        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                metalesAgranelDetail: oMetalesAgranel
            }
        });
    }catch(error){
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const addMetalCliente = async(req, res) => {

    var {
        idTaller,
        idSale,
        metalCliente,
        idUserLogON,
        idSucursalLogON
    } = req.body;
    console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    var bOK = false;

    try {

        // Ahora insertar el metal cliente como detalle de la venta
        if ( ( idSale.length > 0 || idSale > 0 ) && idTaller > 0) {

            var idMetalCliente = metalCliente.idMetalCliente || 0;
            var tipo = metalCliente.tipo || 'oro';
            var gramos = metalCliente.gramos || 0;
            var kilates = metalCliente.kilates || 8;
            var valorMetal = metalCliente.valorMetal || 0;

            var OSQL_InsertMetalCliente = await dbConnection.query(`call insertUpdateTallerMetalCliente(
                ${ idMetalCliente }
                , '${ oGetDateNow }'
                , ${ idTaller }
                , '${ idSale }'
                , '${ tipo }'
                , ${ gramos }
                , ${ kilates }
                , ${ valorMetal }
                , ${ idUserLogON }
            )`);

            if (OSQL_InsertMetalCliente[0].out_id > 0) {
                bOK = true;
            } else {
                bOK = false;
            }

            if (bOK) {
                res.json({
                    status: 0,
                    message: "Activo Cliente agregado con éxito.",
                    data: {
                        idSale: idSale,
                        idTaller: idTaller
                    }
                });
            } else {
                res.json({
                    status: 1,
                    message: "No se registró el activo cliente."
                });
            }
        }

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const deleteMetalCliente = async(req, res = response) => {

    const {
        idMetalCliente,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {

        // Get all images associated with this metal
        const oImagesCliente = await dbConnection.query(`call getMetalClienteImgs( '${ idMetalCliente }' )`);

        // Delete physical files from server
        if (oImagesCliente && oImagesCliente.length > 0) {
            oImagesCliente.forEach((img) => {
                const filePath = path.join(__dirname, '../uploads/taller/metales', img.nombreImgNew);
                if (fs.existsSync(filePath)) {
                    fs.unlinkSync(filePath);
                }
            });
        }

        // Delete image records from database
        if (oImagesCliente && oImagesCliente.length > 0) {
            for (const img of oImagesCliente) {
                await dbConnection.query(`call deleteMetalClienteImg(${ img.keyX })`);
            }
        }

        // Delete the metal client record
        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        var OSQL = await dbConnection.query(`call deleteMetalCliente(
            ${ idMetalCliente }
            , '${ oGetDateNow }'
            , ${ idUserLogON }
        )`);

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].out_id > 0 ? 'Activo Cliente y sus imágenes eliminados con éxito' : 'No se pudo eliminar el activo cliente'
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getTallerMetalesCliente = async(req, res = response) => {

    const {
        idTaller
    } = req.body;
  
    try{
        var oMetalesCliente = await dbConnection.query(`call getTallerMetalesCliente( '${ idTaller }' )`)
        
        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                metalesClienteDetail: oMetalesCliente
            }
        });
    }catch(error){
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const uploadMetalClienteImage = async(req, res = response) => {

    const {
        idMetalCliente = 0,
        idTaller = 0,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {

        if (!req.file) {
            return res.json({
                status: 2,
                message: "No se seleccionó archivo"
            });
        }

        // Validar que al menos uno esté presente
        if (idMetalCliente === 0 && idTaller === 0) {
            return res.json({
                status: 2,
                message: "Debe proporcionar idMetalCliente o idTaller"
            });
        }

        const nombreImagenOriginal = req.file.originalname;
        const nombreImagenNew = req.file.filename;
        
        // Determinar ruta según el tipo de imagen
        let urlImg = '';
        if (idMetalCliente > 0) {
            // Imagen de metal cliente
            urlImg = `/uploads/taller/metales/${nombreImagenNew}`;
        } else if (idTaller > 0) {
            // Imagen de header del taller
            urlImg = `/uploads/taller/header/${nombreImagenNew}`;
        }

        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        // Guardar registro en BD - adaptado para ambos casos
        const OSQL = await dbConnection.query(`
            INSERT INTO taller_metal_cliente_img 
            (idMetalCliente, idTaller, createDate, nombreImgOriginal, nombreImgNew, urlImg)
            VALUES (:idMetalCliente, :idTaller, :createDate, :nombreImgOriginal, :nombreImgNew, :urlImg)
        `, {
            replacements: {
                idMetalCliente: idMetalCliente > 0 ? idMetalCliente : 0,
                idTaller: idTaller > 0 ? idTaller : 0,
                createDate: oGetDateNow,
                nombreImgOriginal: nombreImagenOriginal,
                nombreImgNew: nombreImagenNew,
                urlImg: urlImg
            },
            type: dbConnection.QueryTypes.INSERT
        });

        // Obtener el ID insertado
        const lastIdResult = await dbConnection.query(`SELECT LAST_INSERT_ID() as lastId`);
        const newId = lastIdResult[0][0].lastId;

        if (newId && newId > 0) {
            res.json({
                status: 0,
                message: "Imagen subida con éxito",
                data: {
                    keyX: newId,
                    urlImg: urlImg,
                    nombreImgNew: nombreImagenNew
                }
            });
        } else {
            res.json({
                status: 1,
                message: "No se pudo guardar la imagen en la base de datos"
            });
        }

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getMetalClienteImages = async(req, res = response) => {

    const {
        idMetalCliente = 0,
        idTaller = 0
    } = req.body;
  
    try{
        let query = '';
        let replacements = {};

        // Determinar qué imágenes recuperar
        if (idMetalCliente > 0) {
            // Imágenes del metal cliente
            query = `
                SELECT * FROM taller_metal_cliente_img
                WHERE idMetalCliente = :idMetalCliente AND idTaller = 0
                ORDER BY createDate DESC
            `;
            replacements = { idMetalCliente: idMetalCliente };
        } else if (idTaller > 0) {
            // Imágenes del header del taller
            query = `
                SELECT * FROM taller_metal_cliente_img
                WHERE idTaller = :idTaller AND idMetalCliente = 0
                ORDER BY createDate DESC
            `;
            replacements = { idTaller: idTaller };
        } else {
            return res.json({
                status: 2,
                message: "Debe proporcionar idMetalCliente o idTaller"
            });
        }

        const oImagesCliente = await dbConnection.query(query, {
            replacements: replacements,
            type: dbConnection.QueryTypes.SELECT
        });
        
        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: {
                imagesDetail: oImagesCliente
            }
        });
    }catch(error){
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const deleteMetalClienteImage = async(req, res = response) => {

    const {
        keyX,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {

        // Primero obtener info de la imagen para saber qué archivo eliminar
        const imgInfo = await dbConnection.query(`
            SELECT keyX, nombreImgNew, idMetalCliente, idTaller 
            FROM taller_metal_cliente_img
            WHERE keyX = :keyX
        `, {
            replacements: { keyX: keyX },
            type: dbConnection.QueryTypes.SELECT
        });

        if (!imgInfo || imgInfo.length === 0) {
            return res.json({
                status: 1,
                message: "La imagen no existe"
            });
        }

        const { nombreImgNew, idMetalCliente, idTaller } = imgInfo[0];

        // Determinar la ruta del archivo según el tipo
        let filePath = '';
        if (idMetalCliente > 0) {
            filePath = path.join(__dirname, '../uploads/taller/metales', nombreImgNew);
        } else if (idTaller > 0) {
            filePath = path.join(__dirname, '../uploads/taller/header', nombreImgNew);
        }

        // Eliminar archivo físico del servidor
        if (filePath && fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        // Eliminar registro de la base de datos
        await dbConnection.query(`
            DELETE FROM taller_metal_cliente_img
            WHERE keyX = :keyX
        `, {
            replacements: { keyX: keyX },
            type: dbConnection.QueryTypes.DELETE
        });

        res.json({
            status: 0,
            message: "Imagen eliminada con éxito"
        });

    } catch (error) {
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

// FUNCIONES DE MANO DE OBRA

const addManoObraTaller = async(req, res) => {

    var {
        idTaller,
        idSale,
        manoObra,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');
    const transaction = await dbConnection.transaction();

    try {

        if ( ( idSale.length > 0 || idSale > 0 ) && idTaller > 0) {

            var idManoObra = manoObra.idManoObra || 0;
            var idTecnico = manoObra.idTecnico || 0;
            var precio = manoObra.precio || 0;

            if (idManoObra > 0) {
                // UPDATE: Primero guarda el registro actual en el log
                await dbConnection.query(`
                    INSERT INTO taller_mano_obra_log 
                    (idManoObra, createDate, idTaller, idSale, idUserTecnico, precio, idCreateUser, tipoLog, logDate, idCreateUserLog)
                    SELECT idManoObra, createDate, idTaller, idSale, idUserTecnico, precio, idCreateUser, 'UPDATE', :logDate, :idCreateUserLog
                    FROM taller_mano_obra
                    WHERE idManoObra = :idManoObra
                `, {
                    replacements: { 
                        idManoObra: idManoObra,
                        logDate: oGetDateNow,
                        idCreateUserLog: idUserLogON
                    },
                    type: dbConnection.QueryTypes.INSERT,
                    transaction: transaction
                });

                // UPDATE el registro
                const resultUpdate = await dbConnection.query(`
                    UPDATE taller_mano_obra 
                    SET idUserTecnico = :idTecnico, precio = :precio
                    WHERE idManoObra = :idManoObra
                `, {
                    replacements: { 
                        idTecnico: idTecnico,
                        precio: precio,
                        idManoObra: idManoObra
                    },
                    type: dbConnection.QueryTypes.UPDATE,
                    transaction: transaction
                });

                // Validar que se actualizó correctamente
                if (!resultUpdate || resultUpdate[1] === 0) {
                    await transaction.rollback();
                    res.json({
                        status: 1,
                        message: "No se pudo actualizar la mano de obra"
                    });
                    return;
                }

                await transaction.commit();

                res.json({
                    status: 0,
                    message: "Mano de obra actualizada con éxito",
                    insertID: idManoObra
                });

            } else {
                // INSERT nuevo registro
                // Validar que el técnico no esté ya agregado en este taller
                const tecnicoExistente = await dbConnection.query(`
                    SELECT idManoObra FROM taller_mano_obra
                    WHERE idTaller = :idTaller AND idUserTecnico = :idTecnico
                    LIMIT 1
                `, {
                    replacements: { 
                        idTaller: idTaller,
                        idTecnico: idTecnico
                    },
                    type: dbConnection.QueryTypes.SELECT,
                    transaction: transaction
                });

                if (tecnicoExistente && tecnicoExistente.length > 0) {
                    await transaction.rollback();
                    res.json({
                        status: 1,
                        message: "Este técnico ya está agregado en el taller"
                    });
                    return;
                }

                // Insertar nuevo registro
                await dbConnection.query(`
                    INSERT INTO taller_mano_obra 
                    (createDate, idTaller, idSale, idUserTecnico, precio, idCreateUser)
                    VALUES (:createDate, :idTaller, :idSale, :idTecnico, :precio, :idCreateUser)
                `, {
                    replacements: { 
                        createDate: oGetDateNow,
                        idTaller: idTaller,
                        idSale: idSale,
                        idTecnico: idTecnico,
                        precio: precio,
                        idCreateUser: idUserLogON
                    },
                    type: dbConnection.QueryTypes.INSERT,
                    transaction: transaction
                });

                // Obtener el último ID insertado
                const lastIdResult = await dbConnection.query(`SELECT LAST_INSERT_ID() as lastId`, {
                    transaction: transaction
                });
                const newId = lastIdResult[0][0].lastId;

                // Validar que se obtuvo un ID válido
                if (!newId || newId <= 0) {
                    await transaction.rollback();
                    res.json({
                        status: 1,
                        message: "No se pudo obtener el ID del registro insertado"
                    });
                    return;
                }

                await transaction.commit();

                res.json({
                    status: 0,
                    message: "Mano de obra agregada con éxito",
                    insertID: newId
                });
            }
        } else {
            res.json({
                status: 1,
                message: "Parámetros inválidos"
            });
        }
    } catch (error) {
        await transaction.rollback();
        console.log(error)
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const deleteManoObraTaller = async(req, res = response) => {

    const {
        idManoObra,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    const transaction = await dbConnection.transaction();

    try {

        const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

        // Inicialmente, verificar que el registro existe
        const recordExists = await dbConnection.query(`
            SELECT idManoObra FROM taller_mano_obra
            WHERE idManoObra = :idManoObra
            LIMIT 1
        `, {
            replacements: { idManoObra: idManoObra },
            type: dbConnection.QueryTypes.SELECT,
            transaction: transaction
        });

        if (!recordExists || recordExists.length === 0) {
            await transaction.rollback();
            res.json({
                status: 1,
                message: "El registro de mano de obra no existe"
            });
            return;
        }

        // Guarda el registro en el log con tipo 'DELETE'
        await dbConnection.query(`
            INSERT INTO taller_mano_obra_log 
            (idManoObra, createDate, idTaller, idSale, idUserTecnico, precio, idCreateUser, tipoLog, logDate, idCreateUserLog)
            SELECT idManoObra, createDate, idTaller, idSale, idUserTecnico, precio, idCreateUser, 'DELETE', :logDate, :idCreateUserLog
            FROM taller_mano_obra
            WHERE idManoObra = :idManoObra
        `, {
            replacements: { 
                idManoObra: idManoObra,
                logDate: oGetDateNow,
                idCreateUserLog: idUserLogON
            },
            type: dbConnection.QueryTypes.INSERT,
            transaction: transaction
        });

        // Elimina el registro
        await dbConnection.query(`
            DELETE FROM taller_mano_obra
            WHERE idManoObra = :idManoObra
        `, {
            replacements: { idManoObra: idManoObra },
            type: dbConnection.QueryTypes.DELETE,
            transaction: transaction
        });

        // Verifica que se eliminó correctamente
        const recordAfterDelete = await dbConnection.query(`
            SELECT idManoObra FROM taller_mano_obra
            WHERE idManoObra = :idManoObra
            LIMIT 1
        `, {
            replacements: { idManoObra: idManoObra },
            type: dbConnection.QueryTypes.SELECT,
            transaction: transaction
        });

        if (recordAfterDelete && recordAfterDelete.length > 0) {
            await transaction.rollback();
            res.json({
                status: 1,
                message: "No se pudo eliminar completamente la mano de obra"
            });
            return;
        }

        await transaction.commit();

        res.json({
            status: 0,
            message: "Mano de obra eliminada con éxito",
            out_id: idManoObra
        });

    } catch (error) {
        await transaction.rollback();
        console.log("Error en deleteManoObraTaller:", error);
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getTallerManoObra = async(req, res = response) => {

    const {
        idTaller
    } = req.body;
  
    try{
        const oManoObra = await dbConnection.query(`
            SELECT 
                tmo.idManoObra,
                tmo.createDate,
                tmo.idTaller,
                tmo.idSale,
                tmo.idUserTecnico,
                u.name as tecnicoDesc,
                u.userName,
                tmo.precio,
                tmo.idCreateUser
            FROM taller_mano_obra tmo
            LEFT JOIN users u ON tmo.idUserTecnico = u.idUser
            WHERE tmo.idTaller = :idTaller
            ORDER BY tmo.createDate DESC
        `, {
            replacements: { idTaller: idTaller },
            type: dbConnection.QueryTypes.SELECT
        });
        
        res.json({
            status: 0,
            message: "Ejecutado correctamente.",
            data: oManoObra
        });
    }catch(error){
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const updateManoObraPrecio = async(req, res) => {

    const {
        idTaller,
        manoObraPrecio,
        idUserLogON,
        idSucursalLogON
    } = req.body;

    try {
        if (idTaller <= 0) {
            res.json({
                status: 1,
                message: "ID de taller inválido"
            });
            return;
        }

        // Usar SQL directo para actualizar el campo manoObraPrecio en la tabla sale_taller
        const result = await dbConnection.query(`
            UPDATE taller 
            SET manoObraPrecio = :manoObraPrecio 
            WHERE idTaller = :idTaller
        `, {
            replacements: { manoObraPrecio: manoObraPrecio || 0, idTaller: idTaller },
            type: dbConnection.QueryTypes.UPDATE
        });

        // result retorna un array [undefined, rowsAffected]
        if (result && result[1] > 0) {
            res.json({
                status: 0,
                message: "Mano de obra actualizada correctamente"
            });
        } else {
            res.json({
                status: 0,
                message: "Mano de obra actualizada correctamente"
            });
        }
    } catch (error) {
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

    , getCorteCajaByID

    , getEgresosByIDCorteCaja

    , getCorteCajaListWithPage

    , disabledSale

    , getConsHistory

    , getEgresoByID
    , disabledPayment
    , getEgresosListWithPage

    , disableSaleDetail

    , editSobreTaller

    , getRepVentasDetailWithPage
    , cbxGetSobreTellerStatusCombo
    , insertIngresos
    , disabledIngresos

    , getPreIngresosCorteCaja

    , getIngresoByID

    , getIngresosByIDCorteCaja

    , getIngresosListWithPage

    , getDatosRelacionadosByIDCorteCaja

    , getRepPagosCanceladosWithPage

    , getRepPagosWithPage

    , addRefaccionTaller
    , deleteRefaccionTaller
    , addServicioExternoTaller
    , deleteServicioExternoTaller
    , saveTallerHeader
    , updateTallerStatus
    , getTallerByID
    , getTallerPaginado
    , getTallerRefaccciones
    , getTallerServiciosExternos
    , cbxGetServiciosExternosCombo
    , addMetalAgranel
    , deleteMetalAgranel
    , getTallerMetalesAgranel
    , addMetalCliente
    , deleteMetalCliente
    , getTallerMetalesCliente
    , uploadMetalClienteImage
    , getMetalClienteImages
    , deleteMetalClienteImage
    , addManoObraTaller
    , deleteManoObraTaller
    , getTallerManoObra
    , updateManoObraPrecio

}