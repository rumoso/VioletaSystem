const { response } = require('express');
const bcryptjs = require('bcryptjs');

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

    console.log(req.body)

    try{

        var OSQL = await dbConnection.query(`call getProductsListWithPage(
        ${idUser}
        ,${idSucursal}
        ,'${ createDateStart }'
        ,'${ createDateEnd }'
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

const getProductByID = async(req, res = response) => {

    const {
        idProduct
    } = req.body;

    console.log(req.body)

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

    const idUserLogON = req.header('idUserLogON');
    const idSucursalLogON = req.header('idSucursal');
   
    const {
        idUser,
        idSucursal,
        idFamily,
        idGroup,
        idQuality,
        idOrigin,

        barCode,
        name,
        gramos,
        cost = 0,
        price = 0,
        active,
        addInv = 0
    } = req.body;

    console.log(req.body)

    const tran = await dbConnection.transaction();

    try{

        var OSQL = await dbConnection.query(`call insertProduct(
        ${ idSucursal }
        , ${ idFamily }
        , ${ idGroup }
        , ${ idQuality }
        , ${ idOrigin }
        ,'${ barCode }'
        ,'${ name }'
        ,'${ gramos }'
        ,'${ cost }'
        ,'${ price }'
        , ${ active }

        , ${ idUserLogON }
        )`,{ transaction: tran })

        if(OSQL.length == 0){

            res.json({
                status: 1,
                message: "No se registró el producto."
            });

        }
        else{

            var idProduct = OSQL[0].out_id;

            if( idProduct > 0 && addInv > 0){

                var OSQL2 = await dbConnection.query(`call insertInventaryLog(
                ${idUser}
                , ${idProduct}
                , '${addInv}'
                , 'Entrada de inventario'
                )`,{ transaction: tran })

                if(OSQL2[0].out_id > 0){
                    await tran.commit();
                }else{
                    await tran.rollback();
                }

            }else{
                await tran.commit();
            }

            res.json({
                status: 0,
                message: "Producto guardado con éxito.",
                insertID: OSQL[0].out_id
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

const updateProduct = async(req, res) => {
   
  const {
    idProduct,
    idSucursal,

    idFamily,
    idGroup,
    idQuality,
    idOrigin,

    barCode,
    name,
    gramos,
    cost = 0,
    price = 0,
    active,
    addInv = 0,

    idUser
  } = req.body;

  console.log(req.body)

  try{

        var OSQL = await dbConnection.query(`call updateProduct(
            ${idProduct}
            , ${idSucursal}
            , ${idFamily}
            , ${idGroup}
            , ${idQuality}
            , ${idOrigin}
            ,'${barCode}'
            ,'${name}'
            ,'${gramos}'
            ,'${cost}'
            ,'${price}'
            , ${active}
            )`);

        var ODeleteSync_up = await dbConnection.query(`call deleteSync_up( 'Products', ${ idProduct } )`);

      res.json({
          status:0,
          message:"Producto actualizado con éxito.",
          insertID: OSQL[0].out_id
      });
      
  }catch(error){
      
      res.status(500).json({
          status:2,
          message:"Sucedió un error inesperado",
          data:error
      });
  }
}

const cbxGetProductsCombo = async(req, res = response) => {

    const {
        idUser,
        search = ''
    } = req.body;
  
    console.log(req.body)

    //const dbConnectionNEW = await createConexion();
    
    try{

        var OSQL = await dbConnection.query(`call cbxGetProductsCombo( '${search}', ${idUser} )`)

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

    //await dbConnectionNEW.close();
  
  };

  const getProductByBarCode = async(req, res = response) => {

    const {
        idUser,
        barCode
    } = req.body;
  
    console.log(req.body)

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

        , search = ''
        , limiter = 10
        , start = 0

       
    } = req.body;

    console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getInventaryListWithPage(
            ${idUser}
            ,${idSucursal}
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
            status:2,
            message:"Sucedió un error inesperado",
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

    } = req.body;

    console.log(req.body)

    const dbConnectionNEW = await createConexion();

    try{

        var OSQL = await dbConnectionNEW.query(`call getInventaryBySucursal(
            ${idUser}
            ,${idSucursal}
            ,'${ barCode }'
            ,'${ name }'
            ,${ idFamily }
            ,${ idGroup }
            ,${ idQuality }
            ,${ idOrigin }

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
  
    console.log(req.body)
  
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

    console.log(req.body)

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

        , idUserLogON
        , idSucursalLogON
    } = req.body;
  
    console.log(req.body)
  
    try{

        var OSQL = await dbConnection.query(`call insertInventaryLog(
            ${ idProduct }
            , '${ cantidad }'
            , '${ description.trim() }'

            , ${ idUserLogON }
            )`)
  
          if(OSQL.length == 0){
    
              res.json({
                  status: 1,
                  message:"No se registró el Inventario."
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
  
      await tran.rollback();
        
        res.status(500).json({
            status:2,
            message:"Sucedió un error inesperado",
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
  }