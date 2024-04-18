const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
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

   } = require('../controllers/productsController');

   
const router = Router();

router.post('/getProductsListWithPage', getProductsListWithPage);



router.post('/getProductByID', [
  check('idProduct','Id obligatorio').not().isEmpty(),
  check('idProduct','Id debe ser numérico').isNumeric(),
  validarCampos
], getProductByID);

router.post('/insertProduct', [

  check('idUser','idUser obligatorio').not().isEmpty(),
  check('idUser','idUser debe ser numérico').isNumeric(),

  check('idSucursal','idSucursal obligatorio').not().isEmpty(),
  check('idSucursal','idSucursal debe ser numérico').isNumeric(),

  check('idFamily','idFamily obligatorio').not().isEmpty(),
  check('idFamily','idFamily debe ser numérico').isNumeric(),

  check('idGroup','idGroup obligatorio').not().isEmpty(),
  check('idGroup','idGroup debe ser numérico').isNumeric(),

  check('idQuality','idQuality obligatorio').not().isEmpty(),
  check('idQuality','idQuality debe ser numérico').isNumeric(),

  check('idOrigin','idOrigin obligatorio').not().isEmpty(),
  check('idOrigin','idOrigin debe ser numérico').isNumeric(),

  check('barCode','Código de barra obligatorio').not().isEmpty(),

  check('name','Nombre obligatorio').not().isEmpty(),

  check('cost','idOrigin debe ser numérico').isNumeric(),

  check('price','idOrigin debe ser numérico').isNumeric(),

  validarCampos
], insertProduct);

router.post('/updateProduct', [

  check('idProduct','idUser obligatorio').not().isEmpty(),
  check('idProduct','idUser debe ser numérico').isNumeric(),

  check('idUser','idUser obligatorio').not().isEmpty(),
  check('idUser','idUser debe ser numérico').isNumeric(),

  check('idSucursal','idSucursal obligatorio').not().isEmpty(),
  check('idSucursal','idSucursal debe ser numérico').isNumeric(),

  check('idFamily','idFamily obligatorio').not().isEmpty(),
  check('idFamily','idFamily debe ser numérico').isNumeric(),

  check('idGroup','idGroup obligatorio').not().isEmpty(),
  check('idGroup','idGroup debe ser numérico').isNumeric(),

  check('idQuality','idQuality obligatorio').not().isEmpty(),
  check('idQuality','idQuality debe ser numérico').isNumeric(),

  check('idOrigin','idOrigin obligatorio').not().isEmpty(),
  check('idOrigin','idOrigin debe ser numérico').isNumeric(),

  check('barCode','Código de barra obligatorio').not().isEmpty(),

  check('name','Nombre obligatorio').not().isEmpty(),

  check('cost','idOrigin debe ser numérico').isNumeric(),

  check('price','idOrigin debe ser numérico').isNumeric(),

  validarCampos
], updateProduct);

router.post('/cbxGetProductsCombo', cbxGetProductsCombo);

router.post('/getProductByBarCode', [
  check('barCode','Id obligatorio').not().isEmpty(),
  validarCampos
], getProductByBarCode);

router.post('/getInventaryListWithPage', getInventaryListWithPage);

router.post('/getInventaryBySucursal', getInventaryBySucursal);

router.post('/disableProduct', [
  check('idProduct','Id del usuario obligatorio').not().isEmpty(),
  check('idProduct','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], disableProduct);

router.post('/getInventarylogByIdProductWithPage', [
  check('idProduct','Id obligatorio').not().isEmpty(),
  check('idProduct','Id debe ser numérico').isNumeric(),
  validarCampos
], getInventarylogByIdProductWithPage);

router.post('/insertInventaryLog', [

  check('idProduct','Cliente obligatorío').not().isEmpty(),
  check('idProduct','El cliente debe ser numérico').isNumeric(),

  check('cantidad','Monto obligatorío').not().isEmpty(),
  check('cantidad','El monto debe ser numérico').isNumeric(),

  check('description','Description obligatoría').not().isEmpty(),

  validarCampos
], insertInventaryLog);

router.post('/startPhysicInventory', startPhysicInventory);

router.post('/getPhysicalInventoryListWithPage', getPhysicalInventoryListWithPage);

router.post('/getPhysicalInventoryDetailListWithPage', [

  check('idPhysicalInventory','id obligatorío').not().isEmpty(),

  validarCampos
], getPhysicalInventoryDetailListWithPage);

router.post('/verifyPhysicalInventoryDetail', [

  check('idPhysicalInventory','id obligatorío').not().isEmpty(),
  
  check('barCode','id obligatorío').not().isEmpty(),

  validarCampos
], verifyPhysicalInventoryDetail);

router.post('/changeStatusPhysicalInventory', [

  check('idPhysicalInventory','id obligatorío').not().isEmpty(),
  
  check('idStatus','Estatus obligatorío').not().isEmpty(),
  check('idStatus','El estatus debe ser numérico').isNumeric(),

  validarCampos
], changeStatusPhysicalInventory);

router.post('/getPhysicalInventoryHeader', [

  check('idPhysicalInventory','id obligatorío').not().isEmpty(),

  validarCampos
], getPhysicalInventoryHeader);

router.post('/updateMostradorPhysicalInventoryDetail', [

  check('idPhysicalInventory','id obligatorío').not().isEmpty(),
  
  check('idPhysicalInventoryDetail','id D obligatorío').not().isEmpty(),
  check('idPhysicalInventoryDetail','id debe ser numérico').isNumeric(),

  validarCampos
], updateMostradorPhysicalInventoryDetail);

router.post('/getPhysicalInventoryHeaderBySucursal', getPhysicalInventoryHeaderBySucursal);

router.post('/getCatListWithPage', [

  check('sOption','Opción obligatoría').not().isEmpty(),

  validarCampos
], getCatListWithPage);

router.post('/insertUpdateCat', [

  check('name','id obligatorío').not().isEmpty(),
  
  validarCampos
], insertUpdateCat);

router.post('/getRepComprasProveedorListWithPage', getRepComprasProveedorListWithPage);

router.post('/getInventarylogParaFirmar', getInventarylogParaFirmar);

router.post('/updateFirmaEntradaInventario', [

  check('iOption','Opción obligatoria').not().isEmpty(),
  check('iOption','La opción debe ser numérico').isNumeric(),

  check('auth_idUser','Autorizante obligatorio').not().isEmpty(),
  check('auth_idUser','El Autorzante debe ser numérico').isNumeric(),

  validarCampos
], updateFirmaEntradaInventario);

router.post('/saveDevoluInventario', [

  check('idProduct','Producto obligatorio').not().isEmpty(),
  check('idProduct','El producto debe ser numérico').isNumeric(),

  validarCampos
], saveDevoluInventario);

router.post('/getInventarylog_devolution', getInventarylog_devolution);

router.post('/updateFirmaDevoluInventario', [

  check('auth_idUser','Autorizante obligatorio').not().isEmpty(),
  check('auth_idUser','El Autorzante debe ser numérico').isNumeric(),

  validarCampos
], updateFirmaDevoluInventario);



module.exports = router;