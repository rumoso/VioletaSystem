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

router.post('/cbxGetProductsCombo', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], cbxGetProductsCombo);

router.post('/getProductByBarCode', [
  check('barCode','Id obligatorio').not().isEmpty(),
  validarCampos
], getProductByBarCode);

module.exports = router;