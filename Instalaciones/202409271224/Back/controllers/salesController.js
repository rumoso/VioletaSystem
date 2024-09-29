const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');
const { Sequelize } = require('sequelize');

const { dbConnection } = require('../database/config');

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

            console.log( OSQL_getSaleByID )
            
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

}