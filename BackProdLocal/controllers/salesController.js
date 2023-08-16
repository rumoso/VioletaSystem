const { response } = require('express');
const bcryptjs = require('bcryptjs');

const { createConexion, dbConnection } = require('../database/config');

const insertSale = async(req, res) => {
   
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

        idCustomer,

        paymentList
      
    } = req.body;
  
    console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;
    var idSale = 0;
  
    try{

        for( var i = 0; i < paymentList.length; i++){

            var OPayment = paymentList[i];

            var OSQL = await dbConnection.query(`call insertPayments(
                ${ OPayment.idRelation }
                , '${ OPayment.relationType }'
                , ${ OPayment.idSeller_idUser }
                , ${ OPayment.idFormaPago }
                , '${ OPayment.paga }'
                , '${ OPayment.referencia }'
                , '${ OPayment.description }'
                , '${ OPayment.idFxRate }'
                , '${ OPayment.fxRate }'
                , '${ OPayment.pagaF }'
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
    } = req.body;

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPreCorteCaja(
            ${ idCaja }
            )`)

        if(OSQL.length == 0){

            res.json({
                status:0,
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



  

module.exports = {
    insertSale
    , getVentasListWithPage
    , getSaleByID
    , insertPayments
    , getPaymentsByIdSaleListWithPage
    , insertSaleByConsignation
    , regresarProductoDeConsignacion

    , getPreCorteCaja

  }



//   const insertSale = async(req, res) => {
   
//     const {
//       idSeller_idUser,
//       idCustomer,
//       idSaleType,
//       bCredito,
//       total,
  
//       saleDetail,
//       salesPayment
//     } = req.body;
  
//     console.log(req.body)
  
//     const tran = await dbConnection.transaction();
  
//     var bOK = false;
//     var idSale = 0;
  
//     try{
  
//         var OSQL = await dbConnection.query(`call insertSale(
//             ${idSeller_idUser}
//             , ${idCustomer}
//             , ${idSaleType}
//             ,'${total}'
//             , 1
//             )`,{ transaction: tran })
  
//           if(OSQL.length == 0){
    
//               res.json({
//                   status: 1,
//                   message:"No se registró la venta."
//               });
      
//           }
//           else{
  
//               idSale = OSQL[0].out_id;
  
//               if( idSale > 0 ){
  
//                   for(var i = 0; i < saleDetail.length; i++){
//                       var saleD = saleDetail[i];
  
//                       var OSQL2 = await dbConnection.query(`call insertSaleDetail(
//                           ${ idSale }
//                           , ${ saleD.idProduct }
//                           , '${ saleD.cantidad }'
//                           , '${ saleD.precioUnitario }'
//                           , '${ saleD.descuento }'
//                           , '${ saleD.precio }'
//                           , '${ saleD.importe }'
//                           )`,{ transaction: tran })
  
//                       if(OSQL2[0].out_id > 0){
//                           bOK = true;
//                       }else{
//                           bOK = false;
//                           break;
//                       }
  
//                       var OSQL4 = await dbConnection.query(`call insertInventaryLog(
//                           ${idSeller_idUser}
//                           , ${saleD.idProduct}
//                           , '-${saleD.cantidad}'
//                           , 'Salida por Venta'
//                           )`,{ transaction: tran })
      
//                           if(OSQL4[0].out_id > 0){
//                               bOK = true;
//                           }else{
//                               bOK = false;
//                               break;
//                           }
//                   }
  
//                   var anticipo = 0;
  
//                   if(bOK){
  
//                       for(var i = 0; i < salesPayment.length; i++){
//                           var saleP = salesPayment[i];
      
//                           anticipo = saleP.anticipo;
      
//                           var OSQL3 = await dbConnection.query(`call insertPayments(
//                               ${ idSale }
//                               , 'V'
//                               , ${idSeller_idUser}
//                               , ${ saleP.idFormaPago }
//                               , '${ saleP.paga }'
//                               , '${ saleP.referencia }'
//                               , '${ ( anticipo > 0 ? 'Anticipo' : 'Venta' ) }'
//                               , '${saleP.idFxRate}'
//                               , '${saleP.fxRate}'
//                               )`,{ transaction: tran })
      
//                           if(OSQL3[0].out_id > 0){
//                               bOK = true;
//                           }else{
//                               bOK = false;
//                               break;
//                           }
      
//                       }
  
//                   }
  
//               }
  
//               if(bOK){
//                   await tran.commit();
  
//                   res.json({
//                       status:0,
//                       message:"Venta guardada con éxito.",
//                       insertID: idSale
//                   });
//               }else{
//                   await tran.rollback();
  
//                   res.json({
//                       status: 1,
//                       message:"No se guardó la Venta."
//                   });
//               }
      
//           }
        
//     }catch(error){
  
//       await tran.rollback();
        
//       res.status(500).json({
//           status:2,
//           message:"Sucedió un error inesperado",
//           data: error.message
//       });
  
//     }
//   }