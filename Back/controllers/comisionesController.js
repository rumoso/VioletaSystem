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

    console.log(req.body)

    const tran = await dbConnection.transaction();
    const dbConnectionNEW = await createConexion();

    var bOK = false;
    var idSale = '';
    var idComision = '';

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{
        
        var OSQL_getPendingPayments = await dbConnectionNEW.query(`call comis_getPendingPayments(
            '${ startDate.substring(0, 10) }'
            , '${ endDate.substring(0, 10) }'
            ,  ${ idSeller_idUser }
            )`)

            console.log( OSQL_getPendingPayments )

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

                    console.log( OSQL_insertComisiones )
    
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
                            
                            console.log('abonadoHist: ' + oPayment.abonadoHist)
                            console.log('pAcomuladosBefore: ' + pAcomulados)
                            fComision = oPayment.abonadoHist + pAcomulados - oSale.costoTotal + oPayment.pago;
                            AComision += fComision < 0 ? 0 : ( fComision < oPayment.pago ? fComision : oPayment.pago );
                            console.log('pAcomulados: ' + pAcomulados)
                            console.log('costoTotal: ' + oSale.costoTotal)
                            console.log('pago: ' + oPayment.pago)
                            console.log('fComision: ' + fComision)
                            console.log('AComision: ' + AComision)

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

                        console.log( OSQL_insertComisionesDetail )
        
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

                console.log( oComisionList )

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

            await dbConnectionNEW.close();
            
    }catch(error){
        
        await tran.rollback();
        await dbConnectionNEW.close();


        console.log( error.message )
            
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getComisionesListWithPage = async(req, res = response) => {

    const {
        startDate = ''
        , endDate = ''
        , idSeller_idUser = 0

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getComisionesListWithPage(
            '${ startDate.substring(0, 10) }'
            , '${ endDate.substring(0, 10) }'
            , ${ idSeller_idUser }

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

    console.log(req.body)

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
                    header: OSQL[0].sumComision
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

    console.log(req.body)

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

    console.log(req.body)

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

    console.log(req.body)

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

module.exports = {
    generarComision
    , getComisionesListWithPage
    , getComisionDetail
    , getComisionesPagosDetailListWithPage
    , disabledComision
    , disabledComisionDetail

}