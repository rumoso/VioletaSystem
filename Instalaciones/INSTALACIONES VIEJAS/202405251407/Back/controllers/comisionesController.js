const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { createConexion, dbConnection } = require('../database/config');

const generarComision = async(req, res) => {

    const {
        startDate = '',
        endDate = '',
        idSeller_idUser,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    const tran = await dbConnection.transaction();
    //const dbConnectionNEW = await createConexion();

    var bOK = false;
    var idSale = '';
    var idComision = '';

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{
        
        var OSQL_getPendingPayments = await dbConnection.query(`call comis_getPendingPayments(
            '${ startDate.substring(0, 10) }'
            , '${ endDate.substring(0, 10) }'
            ,  ${ idSeller_idUser }
            )`)

            //console.log( OSQL_getPendingPayments )

            if(!OSQL_getPendingPayments){
                res.json({
                    status: 1,
                    message: "No hay comisiones pendientes."
                });
            }

            // Objeto para almacenar las ventas agrupadas
            var ventasAgrupadas = OSQL_getPendingPayments.reduce((acc, payment) => {
                const idSale = payment.idSale;
              
                // Si la venta no existe, agregar una nueva entrada
                if (!acc[idSale]) {
                    acc[idSale] = {
                    idSale,
                    costoTotal: payment.costoTotal,
                    total: payment.total,
                    abonadoHist: payment.abonadoHist,
                    abonado: payment.abonado,
                    comisionPagada: payment.comisionPagada,
                    pagos: []  // Nueva propiedad para almacenar la lista de pagos
                    };
                }
                
                // Agregar el pago a la lista de pagos de la venta
                acc[idSale].pagos.push({
                    idPayment: payment.idPayment,
                    pago: payment.pago,
                    abonadoHist: payment.abonadoHist,
                    bRange: payment.bRange
                });
                
                return acc;
            }, {});

            ventasAgrupadas = Object.values(ventasAgrupadas);

            if(ventasAgrupadas.length > 0){

                var OSQL_insertComisiones = await dbConnection.query(`call insertComisiones(
                    '${oGetDateNow}'
                    ,  ${ idSeller_idUser }
    
                    , ${ idUserLogON }
                    , ${ idSucursalLogON }
                    )`,{ transaction: tran })

                    //console.log( OSQL_insertComisiones )
    
                    idComision = OSQL_insertComisiones[0].out_id;
            
                if(idComision.length > 0){
                    bOK = true;
                }else{
                    bOK = false;
                }

                //console.log( ventasAgrupadas )

                var oComisionList = [];

                for( var i = 0; i < ventasAgrupadas.length; i++ ){
                    var oSale = ventasAgrupadas[i];

                    var fComision = 0;
                    var AComision = 0;
                    var pAcomulados = 0;

                    var oComision = {
                        idSale: oSale.idSale,
                        costoTotal: oSale.costoTotal,
                        total: oSale.total,
                        abonado: oSale.abonado,
                        comision: 0,
                        payments: []
                    }

                    for( var n = 0; n < oSale.pagos.length; n++ ){
                        var oPayment = oSale.pagos[n];

                        if( oPayment.bRange == 1 ){
                            
                            //console.log('abonadoHist: ' + oPayment.abonadoHist)
                            //console.log('pAcomuladosBefore: ' + pAcomulados)
                            fComision = oPayment.abonadoHist + pAcomulados - oSale.costoTotal + oPayment.pago;
                            AComision += fComision < 0 ? 0 : ( fComision < oPayment.pago ? fComision : oPayment.pago );
                            //console.log('pAcomulados: ' + pAcomulados)
                            //console.log('costoTotal: ' + oSale.costoTotal)
                            //console.log('pago: ' + oPayment.pago)
                            //console.log('fComision: ' + fComision)
                            //console.log('AComision: ' + AComision)

                            pAcomulados += oPayment.pago;

                            oComision.payments.push( oPayment.idPayment )
                        }

                        oComision.comision = AComision;
                    }

                    var OSQL_insertComisionesDetail = await dbConnection.query(`call insertComisionesDetail(
                        ${ idSeller_idUser }
                        , '${ idComision }'
                        , '${ oSale.idSale }'
                        , ''
                        , '${ oComision.comision }'
        
                        , ${ idUserLogON }
                        , ${ idSucursalLogON }
                        )`,{ transaction: tran })

                        //console.log( OSQL_insertComisionesDetail )
        
                        var idComisionDetail = OSQL_insertComisionesDetail[0].out_id;
                
                    if(idComisionDetail > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                        break;
                    }

                    for( var n = 0; n < oComision.payments.length; n++ ){

                        var OSQL_insertComisionesPagosDetail = await dbConnection.query(`call insertComisionesPagosDetail(
                            '${ idComisionDetail }'
                            , '${ oComision.payments[n] }'

                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
                            )`,{ transaction: tran })
            
                            var idComisionesPagosDetail = OSQL_insertComisionesPagosDetail[0].out_id;
                    
                        if(idComisionesPagosDetail > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                    }

                    oComisionList.push(oComision)

                }

                //console.log( oComisionList )

            }

            if(bOK){

                await tran.commit();
                //await tran.rollback();
    
                res.json({
                    status: 0,
                    message: "Comisión generada con éxito.",
                    insertID: idComision
                });
    
            }else{
    
                await tran.rollback();
    
                res.json({
                    status: 1,
                    message: "No se pudo generar comisión."
                });
    
            }

            //await dbConnectionNEW.close();
            
    }catch(error){
        
        await tran.rollback();
        //await dbConnectionNEW.close();


        //console.log( error.message )
            
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const generarAllComisiones = async(req, res) => {

    var {
        startDate = '',
        endDate = '',
        idSeller_idUser,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    var oResponse = {
        status: 0,
        message: ""
    };

    var dbConnectionNEW = await createConexion();

    var bOK = false;
    var idSale = '';
    var idComision = '';

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var oSellers = [];

        var OSQL_getSellersPending = await dbConnectionNEW.query(`call comis_getSellersPending(
            '${ startDate.substring(0, 10) }'
            , '${ endDate.substring(0, 10) }'
            ,  ${ idSeller_idUser }
            )`)

        //console.log( OSQL_getSellersPending )

        if( OSQL_getSellersPending.length > 0 ){
            
            for( var i = 0; i < OSQL_getSellersPending.length; i++ ){
                if( !oSellers.includes( OSQL_getSellersPending[i].idSeller_idUser ) ){
                    oSellers.push( OSQL_getSellersPending[i].idSeller_idUser );
                }
            }
        
        }

        // REVISIÓN DE CANCELACIÓN DE PAGOS
        var OSQL_getPagosCancelados = await dbConnectionNEW.query(`call getPagosCanceladosNoDescontados(
            ${ idSeller_idUser }
            )`)

        //console.log( OSQL_getPagosCancelados )

        if( OSQL_getPagosCancelados.length > 0 ){
            
            for( var i = 0; i < OSQL_getPagosCancelados.length; i++ ){
                if( !oSellers.includes( OSQL_getPagosCancelados[i].idSeller_idUser ) ){
                    oSellers.push( OSQL_getPagosCancelados[i].idSeller_idUser );
                }
            }
        
        }

        //console.log( oSellers )

        if( oSellers.length == 0 ){

            oResponse.status = 1;
            oResponse.message = "No hay comisiones pendientes.";

        }
        else{

            bOK = true;

            for( var pp = 0; pp < oSellers.length; pp++ )
            {
                dbConnectionNEW = await createConexion();

                var tran = await dbConnectionNEW.transaction();

                var idSeller_idUser = oSellers[pp];

                var OSQL_getPendingPayments = await dbConnectionNEW.query(`call comis_getPendingPayments(
                '${ startDate.substring(0, 10) }'
                , '${ endDate.substring(0, 10) }'
                ,  ${ idSeller_idUser }
                )`)

                //console.log( OSQL_getPendingPayments )

                if(!OSQL_getPendingPayments){

                    oResponse.status = 1;
                    oResponse.message = "No hay comisiones pendientes.";

                }

                // Objeto para almacenar las ventas agrupadas
                var ventasAgrupadas = OSQL_getPendingPayments.reduce((acc, payment) => {
                    const idSale = payment.idSale;
                
                    // Si la venta no existe, agregar una nueva entrada
                    if (!acc[idSale]) {
                        acc[idSale] = {
                        idSale,
                        costoTotal: payment.costoTotal,
                        total: payment.total,
                        abonadoHist: payment.abonadoHist,
                        abonado: payment.abonado,
                        comisionPagada: payment.comisionPagada,
                        pagos: []  // Nueva propiedad para almacenar la lista de pagos
                        };
                    }
                    
                    // Agregar el pago a la lista de pagos de la venta
                    acc[idSale].pagos.push({
                        idPayment: payment.idPayment,
                        pago: payment.pago,
                        abonadoHist: payment.abonadoHist,
                        bRange: payment.bRange
                    });
                    
                    return acc;
                }, {});

                ventasAgrupadas = Object.values(ventasAgrupadas);

                if(ventasAgrupadas.length > 0){

                    var OSQL_insertComisiones = await dbConnectionNEW.query(`call insertComisiones(
                        '${oGetDateNow}'
                        ,  ${ idSeller_idUser }

                        , '${ startDate.substring(0, 10) }'
                        , '${ endDate.substring(0, 10) }'
        
                        , ${ idUserLogON }
                        , ${ idSucursalLogON }
                        )`,{ transaction: tran })

                        //console.log( OSQL_insertComisiones )
        
                        idComision = OSQL_insertComisiones[0].out_id;
                
                    if(bOK && idComision.length > 0){
                        bOK = true;
                    }else{
                        bOK = false;
                    }

                    //console.log( ventasAgrupadas )

                    var oComisionList = [];

                    for( var i = 0; i < ventasAgrupadas.length; i++ ){
                        var oSale = ventasAgrupadas[i];

                        var fComision = 0;
                        var AComision = 0;
                        var pAcomulados = 0;

                        var oComision = {
                            idSale: oSale.idSale,
                            costoTotal: oSale.costoTotal,
                            total: oSale.total,
                            abonado: oSale.abonado,
                            comision: 0,
                            payments: []
                        }

                        for( var n = 0; n < oSale.pagos.length; n++ ){
                            var oPayment = oSale.pagos[n];

                            if( oPayment.bRange == 1 ){
                                
                                // console.log('abonadoHist: ' + oPayment.abonadoHist)
                                // console.log('pAcomuladosBefore: ' + pAcomulados)
                                fComision = oPayment.abonadoHist + pAcomulados - oSale.costoTotal + oPayment.pago;
                                AComision += fComision < 0 ? 0 : ( fComision < oPayment.pago ? fComision : oPayment.pago );
                                // console.log('pAcomulados: ' + pAcomulados)
                                // console.log('costoTotal: ' + oSale.costoTotal)
                                // console.log('pago: ' + oPayment.pago)
                                // console.log('fComision: ' + fComision)
                                // console.log('AComision: ' + AComision)

                                pAcomulados += oPayment.pago;

                                oComision.payments.push( oPayment.idPayment )
                            }

                            oComision.comision = AComision;
                        }

                        var OSQL_insertComisionesDetail = await dbConnectionNEW.query(`call insertComisionesDetail(
                            ${ idSeller_idUser }
                            , '${ idComision }'
                            , '${ oSale.idSale }'
                            , ''
                            , '${ oComision.comision }'
            
                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
                            )`,{ transaction: tran })

                            //console.log( OSQL_insertComisionesDetail )
            
                            var idComisionDetail = OSQL_insertComisionesDetail[0].out_id;
                    
                        if(bOK && idComisionDetail > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        for( var n = 0; n < oComision.payments.length; n++ ){

                            var OSQL_insertComisionesPagosDetail = await dbConnectionNEW.query(`call insertComisionesPagosDetail(
                                '${ idComisionDetail }'
                                , '${ oComision.payments[n] }'

                                , ${ idUserLogON }
                                , ${ idSucursalLogON }
                                )`,{ transaction: tran })
                
                                var idComisionesPagosDetail = OSQL_insertComisionesPagosDetail[0].out_id;
                        
                            if(bOK && idComisionesPagosDetail > 0){
                                bOK = true;
                            }else{
                                bOK = false;
                                break;
                            }

                        }

                        oComisionList.push(oComision)

                    }

                    //console.log( oComisionList )
                }

                // REVISIÓN DE CANCELACIÓN DE PAGOS
                var OSQL_getPagosCancelados = await dbConnectionNEW.query(`call getPagosCanceladosNoDescontados(
                    ${ idSeller_idUser }
                    )`)
        
                //console.log( OSQL_getPagosCancelados )
        
                if( OSQL_getPagosCancelados.length > 0 ){
                    
                    // SI NO TENIA COMISIONES SE GENERA
                    if(bOK && idComision.length == 0){
                    
                        var OSQL_insertComisiones = await dbConnectionNEW.query(`call insertComisiones(
                            '${oGetDateNow}'
                            ,  ${ idSeller_idUser }
    
                            , '${ startDate.substring(0, 10) }'
                            , '${ endDate.substring(0, 10) }'
            
                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
                            )`,{ transaction: tran })
    
                            //console.log( OSQL_insertComisiones )
            
                            idComision = OSQL_insertComisiones[0].out_id;
                    
                        if(bOK && idComision.length > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                        }

                    }

                    for( var r = 0; r < OSQL_getPagosCancelados.length; r++ ){

                        var oPagoCancelado = OSQL_getPagosCancelados[r];

                        var OSQL_insertComisionesDetail = await dbConnectionNEW.query(`call insertComisionesDetail(
                            ${ idSeller_idUser }
                            , '${ idComision }'
                            , '${ oPagoCancelado.idSale }'
                            , 'Cancelación del pago: #${ oPagoCancelado.idPayment }'
                            , -'${ oPagoCancelado.pago }'
            
                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
                            )`,{ transaction: tran })

                            //console.log( OSQL_insertComisionesDetail )
            
                            var idComisionDetail = OSQL_insertComisionesDetail[0].out_id;
                    
                        if(bOK && idComisionDetail > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        var OSQL_insertComisionesPagosDetail = await dbConnectionNEW.query(`call insertComisionesPagosDetail(
                            '${ idComisionDetail }'
                            , '${ oPagoCancelado.idPayment }'

                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
                            )`,{ transaction: tran })
            
                            var idComisionesPagosDetail = OSQL_insertComisionesPagosDetail[0].out_id;
                    
                        if(bOK && idComisionesPagosDetail > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                        var OSQL_insertPagosDescontadosPorCancelacion = await dbConnectionNEW.query(`call insertPagosDescontadosPorCancelacion(
                            '${oGetDateNow}'
                            , '${ oPagoCancelado.idPayment }'

                            , ${ idUserLogON }
                            , ${ idSucursalLogON }
                            )`,{ transaction: tran })
            
                        if(bOK && OSQL_insertPagosDescontadosPorCancelacion[0].out_id > 0){
                            bOK = true;
                        }else{
                            bOK = false;
                            break;
                        }

                    }

                }

                if(bOK){

                    await tran.commit();
                    //await tran.rollback();
        
                    oResponse.status = 0;
                    oResponse.message = "Comisión generada con éxito.";
        
                }else{
        
                    await tran.rollback();

                    oResponse.status = 1;
                    oResponse.message = "No se pudo generar comisión.";
        
                }

                await dbConnectionNEW.close();
            }

        }
            
    }catch(error){

        //console.log( error )
        
        await tran.rollback();
        await dbConnectionNEW.close();


        //console.log( error.message )
            
        oResponse.status = 2;
        oResponse.message = "Sucedió un error inesperado";
        oResponse.data = error.message;

    }

    res.json( oResponse );
}

const getComisionesListWithPage = async(req, res = response) => {

    var {
        startDate = ''
        , endDate = ''
        , idSeller_idUser = 0

        , bPending = false
        , bPagada = false
        , bCancel = false

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        // if (bPending && bPagada && bCancel)
        // {
        //     bPending = false;
        //     bPagada = false;
        //     bCancel = false;
        // }

        var OSQL = await dbConnectionNEW.query(`call getComisionesListWithPage(
            '${ startDate.substring(0, 10) }'
            , '${ endDate.substring(0, 10) }'
            , ${ idSeller_idUser }

            , ${ bPending }
            , ${ bPagada }
            , ${ bCancel }

            , '${ search }'
            , ${ start }
            , ${ limiter }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se encontraron datos con esos filtros."
            });

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );

            var OSQL_getSUMComisionesHeader = await dbConnectionNEW.query(`call getSUMComisionesHeader(
                '${ startDate.substring(0, 10) }'
                , '${ endDate.substring(0, 10) }'

                , ${ bPending }
                , ${ bPagada }
                , ${ bCancel }

                , ${ idSeller_idUser }
                )`)
            
            res.json({
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL,
                    header: OSQL_getSUMComisionesHeader[0]
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

const getComisionDetail = async(req, res = response) => {

    const {
        idComision = ''

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getComisionDetail(
            '${ idComision }'
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se encontraron datos."
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
                    header: {
                        sumComision: OSQL[0].sumComision,
                        idStatus: OSQL[0].idStatus
                    }
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

const getComisionesPagosDetailListWithPage = async(req, res = response) => {

    const {
        idComision = ''

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getComisionesPagosDetailListWithPage(
            '${ idComision }'

            , '${ search }'
            , ${ start }
            , ${ limiter }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se encontraron datos."
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

const disabledComision = async(req, res) => {

    const {
        idComision,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    var bOK = false;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call disabledComision( '${ idComision }' )`)
        OSQL = OSQL[0];

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se pudo cancelar la comisión.",
            });

        }
        else{

            res.json({
                status: 0,
                message: "Comisión cancelada.",
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

const disabledComisionDetail = async(req, res) => {

    const {
        idComisionDetail,

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    var bOK = false;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call disabledComisionDetail( ${ idComisionDetail } )`)
        OSQL = OSQL[0];

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se pudo cancelar la comisión.",
            });

        }
        else{

            res.json({
                status: 0,
                message: "Comisión cancelada.",
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

const changeStatusComision = async(req, res) => {
   
    const {
        idComision,
        idStatus,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call changeStatusComision(
        '${ idComision }'
        ,${ idStatus }
        )`)

        res.json({
            status: OSQL[0].out_id.length > 0 ? 0 : 1,
            message: OSQL[0].message
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
    generarComision
    , generarAllComisiones
    , getComisionesListWithPage
    , getComisionDetail
    , getComisionesPagosDetailListWithPage
    , disabledComision
    , disabledComisionDetail
    , changeStatusComision

}