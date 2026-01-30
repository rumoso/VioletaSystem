const { response } = require('express');
const bcryptjs = require('bcryptjs');
const moment = require('moment');

const { createConexion, dbConnection } = require('../database/config');

const getProductsListWithPage = async(req, res = response) => {

    const {
        idUser
        , idSucursal
        , createDateStart = ''
        , createDateEnd = ''
        , barCode = ''
        , name = ''
        , idFamily = 0
        , idGroup = 0
        , idQuality = 0
        , idOrigin = 0

        , search = ''
        , limiter = 10
        , start = 0

    } = req.body;

    let responseData = {
        status: -1,
        message: '',
        data: null
    };

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getProductsListWithPage(
        ${idUser}
        ,${idSucursal}
        ,'${ createDateStart.substring(0, 10) }'
        ,'${ createDateEnd.substring(0, 10) }'
        ,'${ barCode }'
        ,'${ name }'
        ,${ idFamily }
        ,${ idGroup }
        ,${ idQuality }
        ,${ idOrigin }

        ,'${ search }'
        ,${ start }
        ,${ limiter }
        )`)

        if(OSQL.length == 0){

            responseData = {
                status: 0,
                message: "Ejecutado correctamente.",
                data:
                {
                    count: 0,
                    rows: null
                }
            };

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );

            responseData = {
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL
                }
            };

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

    res.json(responseData);

};

const getProductByID = async(req, res = response) => {

    const {
        idProduct
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getProductByID(${ idProduct })`)

        if(OSQL.length == 0){

            res.json({
                status: 0,
                message: "No se encontró el usuario.",
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

const insertProduct = async(req, res) => {

    const {
        idUser,
        idSucursal,
        idFamily,
        idGroup,
        idQuality,
        idOrigin,
        idSupplier = 0,

        barCode,
        name,
        gramos,
        cost = 0,
        price = 0,
        active,
        addInv = 0,

        noEntrada = '',

        idUserLogON,
        idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    var bOK = false;

    try{

        var OSQL = await dbConnection.query(`call insertProduct(
        ${ idSucursal }
        , ${ idFamily }
        , ${ idGroup }
        , ${ idQuality }
        , ${ idOrigin }
        , ${ idSupplier }
        ,'${ barCode }'
        ,'${ name }'
        ,'${ gramos }'
        ,'${ cost }'
        ,'${ price }'
        , ${ active }

        , '${ addInv }'
        , '${ noEntrada }'
        , '${ oGetDateNow }'

        , ${ idUserLogON }
        )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se registró el producto."
            });

        }else{

            res.json({
                status: OSQL[0].out_id > 0 ? 0 : 1,
                message: OSQL[0].message,
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

const updateProduct = async(req, res) => {

    const {
        idProduct,
        idSucursal,

        idFamily,
        idGroup,
        idQuality,
        idOrigin,
        idSupplier = 0,

        barCode,
        name,
        gramos,
        cost = 0,
        price = 0,
        active,

        idUser
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call updateProduct(
            ${idProduct}
            , ${idSucursal}
            , ${idFamily}
            , ${idGroup}
            , ${idQuality}
            , ${idOrigin}
            , ${idSupplier}
            ,'${barCode}'
            ,'${name}'
            ,'${gramos}'
            ,'${cost}'
            ,'${price}'
            , ${active}
        )`);

        res.json({
            status: OSQL[0].out_id > 0 ? 0 : 1,
            message: OSQL[0].message,
            insertID: OSQL[0].out_id
        });

    }catch(error){

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error
        });

    }
}

const cbxGetProductsCombo = async(req, res = response) => {

    const {
        iOption = 1
        , search = ''

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call cbxGetProductsCombo( ${ iOption }, '${ search }', ${ idUserLogON } )`)

        if(OSQL.length == 0){

                res.json({
                    status:3,
                    message:"No se encontró información.",
                    data: null
                });

            }
            else{

                res.json({
                    status:0,
                    message:"Ejecutado correctamente.",
                    data: OSQL
                });

            }

    }catch(error){

        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }

};

const getProductByBarCode = async(req, res = response) => {

    const {
        idUser,
        barCode
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getProductByBarCode('${ barCode }', ${idUser})`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"No se encontró el producto.",
                data: null
            });

        }
        else{

            res.json({
                status: 0,
                message:"Ejecutado correctamente.",
                data: OSQL[0]
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

const getInventaryListWithPage = async(req, res = response) => {

    const {
        idUser
        , idSucursal
        , barCode = ''
        , name = ''
        , idFamily = 0
        , idGroup = 0
        , idQuality = 0
        , idOrigin = 0
        , iConInventario = 0

        , search = ''
        , limiter = 10
        , start = 0


    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getInventaryListWithPage(
            ${idUser}
            ,${idSucursal}
            ,'${ barCode }'
            ,'${ name }'
            ,${ idFamily }
            ,${ idGroup }
            ,${ idQuality }
            ,${ idOrigin }
            ,${ iConInventario }

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

        //await dbConnectionNEW.close();

    }catch(error){

        //await dbConnectionNEW.close();

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const getInventaryBySucursal = async(req, res = response) => {

    const {
        idUser
        , idSucursal
        , barCode = ''
        , name = ''
        , idFamily = 0
        , idGroup = 0
        , idQuality = 0
        , idOrigin = 0
        , iConInventario = 0

    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getInventaryBySucursal(
            ${idUser}
            ,${idSucursal}
            ,'${ barCode }'
            ,'${ name }'
            ,${ idFamily }
            ,${ idGroup }
            ,${ idQuality }
            ,${ idOrigin }
            ,${ iConInventario }

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

        //await dbConnectionNEW.close();

    }catch(error){

        //await dbConnectionNEW.close();

        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }
};

const disableProduct = async(req, res) => {

    const {
        idProduct
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call disableProduct(
            ${ idProduct }
            )`)

          var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Products', ${ idProduct } )`);

        res.json({
            status: 0,
            message: "Product deshabilitado con éxito.",
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

const getInventarylogByIdProductWithPage = async(req, res = response) => {

    const {
        idProduct

        , search = ''
        , limiter = 10
        , start = 0

    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getInventarylogByIdProductWithPage(
            ${ idProduct }

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

const insertInventaryLog = async(req, res) => {

    const {
        idProduct
        , cantidad
        , description
        , noEntrada = ''

        , idUserAutorizante = 0

        , newCost = 0
        , newPrice = 0

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var firmaVer = 0;
        var firmaMost = 0;

        if( cantidad < 0 ){
            firmaVer = 1;
            firmaMost = 1;
        }

        var OSQL = await dbConnection.query(`call insertInventaryLog(
            '${oGetDateNow}'
            , ${ idProduct }
            , '${ cantidad }'
            , '${ description.trim() }'
            , ${ firmaVer }
            , ${ firmaMost }
            , '${ noEntrada }'
            , 0
            , 0
            , ${ idUserAutorizante }
            , ${ newCost }
            , ${ newPrice }

            , ${ idUserLogON }
            )`)

          if(OSQL.length == 0){

              res.json({
                  status: 1,
                  message: "No se registró el Inventario."
              });

          }
          else{

              res.json({
                  status: 0,
                  message: "Inventario guardado con éxito.",
                  insertID: OSQL[0].out_id
              });

          }

    }catch(error){

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
        
    }
}

const startPhysicInventory = async(req, res) => {

    const {
        idSucursal
        , idFamily = 0
        , idGroup = 0

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call generatePhysicInventory(
            '${ oGetDateNow }'
            , ${ idSucursal }
            , ${ idFamily }
            , ${ idGroup }

            , ${ idUserLogON }
        )`)

        ////console.log( OSQL_GetProducts )

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message:"No se inició el inventario físico."
            });

        }
        else{

            res.json({
                status: OSQL[0].out_id.length > 0 ? 0 : 1,
                message: OSQL[0].message,
                insertID: OSQL[0].out_id
            });

        }

    }
    catch(error)
    {

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }
}

const getPhysicalInventoryListWithPage = async(req, res = response) => {

    const {
        startDate = ''
        , endDate = ''
        , idSucursal
        , idFamily = 0
        , idGroup = 0

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getPhysicalInventoryListWithPage(
            '${ startDate.substring(0, 10) }'
            , '${ endDate.substring(0, 10) }'
            , ${ idSucursal }
            , ${ idFamily }
            , ${ idGroup }

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

const getPhysicalInventoryDetailListWithPage = async(req, res = response) => {

    const {
        iOption = 1
        , idPhysicalInventory

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPhysicalInventoryDetail(
            ${ iOption }
            ,'${ idPhysicalInventory }'

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

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const verifyPhysicalInventoryDetail = async(req, res) => {

    const {
        idPhysicalInventory,
        barCode,
        cantidad = 1,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call verifyPhysicalInventoryDetail(
        '${ idPhysicalInventory }'
        , '${ barCode }'
        , '${ cantidad }'

        , ${ idUserLogON }
        )`)

        if(OSQL.length == 0){

            res.json({
                status: -1,
                message: "No se pudo verificar el producto."
            });

        }
        else{

            res.json({
                status: OSQL[0].out_id,
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

const changeStatusPhysicalInventory = async(req, res) => {
   
    const {
        idPhysicalInventory,
        idStatus,

        auth_idUser = 0,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var OSQL = await dbConnection.query(`call changeStatusPhysicalInventory(
        '${ oGetDateNow }'
        ,'${ idPhysicalInventory }'
        ,${ idStatus }

        ,${ auth_idUser }
        ,${ idUserLogON }
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

const getPhysicalInventoryHeader = async(req, res = response) => {

    const {
        idPhysicalInventory
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getPhysicalInventoryHeader( '${ idPhysicalInventory }' )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
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

const updateMostradorPhysicalInventoryDetail = async(req, res) => {
   
    const {
        idPhysicalInventory,
        idPhysicalInventoryDetail,
        cantidad,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call updateMostradorPhysicalInventoryDetail(
        '${ idPhysicalInventory }'
        , ${ idPhysicalInventoryDetail }
        , ${ cantidad }

        , ${ idUserLogON }
        )`)

        res.json({
            status: OSQL[0].out_id,
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

const getPhysicalInventoryHeaderBySucursal = async(req, res = response) => {

    const {
        startDate = ''
        , endDate = ''
        , idSucursal
        , idFamily = 0
        , idGroup = 0

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getPhysicalInventoryHeaderBySucursal(
            '${ startDate }'
            ,'${ endDate }'
            , ${ idSucursal }
            , ${ idFamily }
            , ${ idGroup }
            , ${ idUserLogON }
            )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se encontró información.",
                data: null
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

        //await dbConnectionNEW.close();

    }catch(error){

        //await dbConnectionNEW.close();

        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
            data: error.message
        });
    }
};

const getCatListWithPage = async(req, res = response) => {

    const {
        sOption = ''

        , search = ''
        , limiter = 10
        , start = 0

        , idUserLogON
        , idSucursalLogON
       
    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call getCatListWithPage(
            '${ sOption }'

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

        //await dbConnectionNEW.close();
        
    }catch(error){

        // await dbConnectionNEW.close();
      
        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }

};

const insertUpdateCat = async(req, res) => {

    const {
        sOption,
        idRelation = 0,
        name = '',
        description = '',
        valor = 0,
        active,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        var iActive = active ? 1 : 0;

        var OSQL = await dbConnection.query(`call insertUpdateCat(
        '${ sOption }'
        , '${ oGetDateNow }'
        , ${ idRelation }
        , '${ name }'
        , '${ description }'
        , '${ valor }'
        , ${ iActive }
        )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se guardó."
            });

        }
        else{

            res.json({
                status: OSQL[0].out_id > 0 ? 0 : 1,
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

const getRepComprasProveedorListWithPage = async(req, res = response) => {

    const {
        idSupplier = 0

        , search = ''
        , limiter = 10
        , start = 0

    } = req.body;

    //console.log(req.body)

    //const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnection.query(`call rep_getRepComprasProveedorListWithPage(
            ${ idSupplier }

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

        // await dbConnectionNEW.close();

    }catch(error){

        // await dbConnectionNEW.close();

        res.status(500).json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });
    }
};

const getInventarylogParaFirmar = async(req, res = response) => {

    const {
        idProduct = 0
        , startDate = ''
        , endDate = ''
        , noEntrada = ''

        , bPending = false

        , search = ''
        , limiter = 10
        , start = 0

    } = req.body;

    let responseData = {
        status: -1,
        message: '',
        data: null
    };

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getInventarylogParaFirmar(
        ${ idProduct }
        ,'${ startDate.substring(0, 10) }'
        ,'${ endDate.substring(0, 10) }'
        ,'${ noEntrada.trim() }'

        , ${ bPending }
        
        ,'${ search }'
        ,${ start }
        ,${ limiter }
        )`)

        if(OSQL.length == 0){

            responseData = {
                status: 0,
                message: "Ejecutado correctamente.",
                data:
                {
                    count: 0,
                    rows: null
                }
            };

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );

            responseData = {
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL
                }
            };

        }

    }catch(error){

        responseData = {
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        };

    }

    res.json(responseData);

};

const updateFirmaEntradaInventario = async(req, res) => {

    const {
        iOption
        , idProduct = 0
        , startDate = ''
        , endDate = ''
        , noEntrada = ''

        , auth_idUser = 0

        , invSelectList

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = true;

    try{

        if( invSelectList.length == 0 ){

            var OSQL = await dbConnection.query(`call updateFirmaEntradaInventario(
                '${ iOption }'
                , ${ idProduct }
                ,'${ startDate.substring(0, 10) }'
                ,'${ endDate.substring(0, 10) }'
                ,'${ noEntrada.trim() }'
                , ${ auth_idUser }
                
                , ${ idUserLogON }
                )`)
        
            if(OSQL.length == 0){
    
                res.json({
                    status: 1,
                    message: "No se pudo realizar la acción."
                });
    
            }
            else{
    
                res.json({
                    status: OSQL[0].out_id > 0 ? 0 : 1,
                    message: OSQL[0].message
                });
    
            }

        }else if( invSelectList.length > 0 ){

            var sMessage = '';

            for(var i = 0; i < invSelectList.length; i++){

                var oInvSelect = invSelectList[i];
        
                var OSQL2 = await dbConnection.query(`call updateFirmaEntradaInventarioByidInventarylog(
                    '${ iOption }'
                      , ${ oInvSelect.idInventarylog }
                      , ${ auth_idUser }

                      , ${ idUserLogON }
                      )`,{ transaction: tran })

                  if(bOK && OSQL2[0].out_id > 0){
                      bOK = true;
                      sMessage = OSQL2[0].message;
                  }else{
                      bOK = false;
                      break;
                  }

            }

            if(bOK){
                await tran.commit();

                res.json({
                    status: 0,
                    message: sMessage
                });

            }else{

                await tran.rollback();

                res.json({
                    status: 1,
                    message: "No se pudo realizar la acción."
                });
                
            }

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

}

const saveDevoluInventario = async(req, res) => {

    const {
        auth_idUser = 0,

        idProduct = 0,
        productDesc = '',
        cantidad = 1,
        justify = '',

        idUserLogON,
        idSucursalLogON

    } = req.body;

    //console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = false;

    const oGetDateNow = moment().format('YYYY-MM-DD HH:mm:ss');

    try{

        if(auth_idUser == 0){
            res.json({
                status: 1,
                message: "No se pudo hacer la devolución porque no fue autorizada la acción."
            });
            return;
        }

        var OSQL2 = await dbConnection.query(`call insertInventaryLog(
            '${oGetDateNow}'
            ,  ${ idProduct }
            , '${ cantidad * -1 }'
            , 'Devolución: ${ justify }'
            , 0
            , 1
            , ''
            , 0
            , ${ auth_idUser }
            , 0
            , 0
            , 0
            , ${ idUserLogON }
            )`,{ transaction: tran })

            if(OSQL2[0].out_id > 0){
                bOK = true;
            }else{
                bOK = false;
            }

            var OSQL_insertInventaryLogDevolution = await dbConnection.query(`call insertInventaryLogDevolution(
                '${oGetDateNow}'
                , ${ OSQL2[0].out_id }
    
                , ${ idUserLogON }
            )`,{ transaction: tran })
    
            if(bOK && OSQL_insertInventaryLogDevolution[0].out_id > 0){
                bOK = true;
            }else{
                bOK = false;
            }

        var OSQL_insertAutorizaciones = await dbConnection.query(`call insertAutorizaciones(
            '${oGetDateNow}'
            ,  '${ OSQL2[0].out_id }'
            , 'firmaMost'
            , 'inventaryLog'
            , ${ auth_idUser }
            , 1
            , 'SE AUTORIZA la debolución del producto: ${ productDesc }'

            , ${ idUserLogON }
        )`,{ transaction: tran })

        if(bOK && OSQL_insertAutorizaciones[0].out_id > 0){
            bOK = true;
        }else{
            bOK = false;
        }
    
        if(bOK){
            
            await tran.commit();

            res.json({
                status: 0,
                message: "Devolución registrada",
            });

        }else{
            
            await tran.rollback();

            res.json({
                status: 1,
                message: "No se pudo realizar la devolución",
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

const getInventarylog_devolution = async(req, res = response) => {

    const {
        bPending = false

        , search = ''
        , limiter = 10
        , start = 0

    } = req.body;

    let responseData = {
        status: -1,
        message: '',
        data: null
    };

    //console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getInventarylog_devolution(
        ${ bPending }
        
        ,'${ search }'
        ,${ start }
        ,${ limiter }
        )`)

        if(OSQL.length == 0){

            responseData = {
                status: 0,
                message: "Ejecutado correctamente.",
                data:
                {
                    count: 0,
                    rows: null
                }
            };

        }
        else{

            const iRows = ( OSQL.length > 0 ? OSQL[0].iRows: 0 );

            responseData = {
                status: 0,
                message: "Ejecutado correctamente.",
                data:{
                    count: iRows,
                    rows: OSQL
                }
            };

        }

    }catch(error){

        responseData = {
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        };

    }

    res.json(responseData);

};

const updateFirmaDevoluInventario = async(req, res) => {

    const {
        auth_idUser
        , invSelectList

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    //console.log(req.body)

    const tran = await dbConnection.transaction();

    var bOK = true;

    try{

        if( invSelectList.length == 0 ){

            var OSQL = await dbConnection.query(`call updateFirmaDevoluInventario(
                ${ auth_idUser }
                
                , ${ idSucursalLogON }
                , ${ idUserLogON }
                )`)
        
            if(OSQL.length == 0){
    
                res.json({
                    status: 1,
                    message: "No se pudo realizar la acción."
                });
    
            }
            else{
    
                res.json({
                    status: OSQL[0].out_id > 0 ? 0 : 1,
                    message: OSQL[0].message
                });
    
            }

        }else if( invSelectList.length > 0 ){

            var sMessage = '';

            for(var i = 0; i < invSelectList.length; i++){

                var oInvSelect = invSelectList[i];
        
                var OSQL2 = await dbConnection.query(`call updateFirmaDevoluInventarioByidInventarylog(
                    ${ auth_idUser }
                      , ${ oInvSelect.idInventarylog }

                      , ${ idSucursalLogON }
                      , ${ idUserLogON }
                      )`,{ transaction: tran })

                  if(bOK && OSQL2[0].out_id > 0){
                      bOK = true;
                      sMessage = OSQL2[0].message;
                  }else{
                      bOK = false;
                      break;
                  }

            }

            if(bOK){
                await tran.commit();

                res.json({
                    status: 0,
                    message: sMessage
                });

            }else{

                await tran.rollback();

                res.json({
                    status: 1,
                    message: "No se pudo realizar la acción."
                });
                
            }

        }

    }catch(error){

        res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

}

const cancelDevolution = async(req, res) => {

    const {
        auth_idUser
        , invSelectList

        , idUserLogON
        , idSucursalLogON
    } = req.body;

    try{

        if( invSelectList.length == 0 ){

            return res.json({
                status: 1,
                message: "Debe seleccionar las devoluciones que quiere cancelar"
            });

        }else if( invSelectList.length > 0 ){

            var sMessage = '';

            for(var i = 0; i < invSelectList.length; i++){

                var oInvSelect = invSelectList[i];
        
                await dbConnection.query(`call cancelDevolution(
                    ${ auth_idUser }
                      , ${ oInvSelect.idInventarylog }

                      , ${ idSucursalLogON }
                      , ${ idUserLogON }
                      )`)

            }

            return res.json({
                status: 0,
                message: 'Cancelada con éxito.'
            });

        }

    }catch(error){

        return res.json({
            status: 2,
            message: "Sucedió un error inesperado",
            data: error.message
        });

    }

}

const updateProductPrice = async(req, res) => {

    const {
        idProduct,
        price = 0,

        idUserLogON,
        idSucursalLogON
    } = req.body;

    try{

        var OSQL = await dbConnection.query(`call updateProductPrice(
        ${ idProduct }
        , '${ price }'
        )`)

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se registró el producto."
            });

        }else{
            res.json({
                status: OSQL[0].out_id > 0 ? 0 : 1,
                message: OSQL[0].message,
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


module.exports = {
    getProductsListWithPage
    , getProductByID
    , insertProduct
    , updateProduct
    , cbxGetProductsCombo
    , getProductByBarCode
    , getInventaryListWithPage
    , getInventaryBySucursal
    , disableProduct
    , getInventarylogByIdProductWithPage
    , insertInventaryLog

    , startPhysicInventory
    , getPhysicalInventoryListWithPage
    , getPhysicalInventoryDetailListWithPage
    , verifyPhysicalInventoryDetail
    , changeStatusPhysicalInventory
    , getPhysicalInventoryHeader
    , updateMostradorPhysicalInventoryDetail
    , getPhysicalInventoryHeaderBySucursal
    , getCatListWithPage
    , insertUpdateCat
    , getRepComprasProveedorListWithPage
    , getInventarylogParaFirmar
    , updateFirmaEntradaInventario
    , saveDevoluInventario
    , getInventarylog_devolution
    , updateFirmaDevoluInventario
    , cancelDevolution
    , updateProductPrice
  }