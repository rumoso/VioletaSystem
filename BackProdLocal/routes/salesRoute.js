const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
   insertSale
   , getVentasListWithPage
   , getSaleByID
   , insertPayments
   , getPaymentsByIdSaleListWithPage
   , insertSaleByConsignation
   , regresarProductoDeConsignacion

   , getPreCorteCaja


   } = require('../controllers/salesController');

   
const router = Router();

router.post('/insertSale', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('idSaleType','Condición de pago obligatoria').not().isEmpty(),
  check('idSaleType','La Condición de pago debe ser numérica').isNumeric(),

  check('total','Total obligatorio').not().isEmpty(),
  check('total','El Total debe ser numérico').isNumeric(),

  check('saleDetail','Debe seleccionar productos').not().isEmpty(),

  validarCampos
], insertSale);

router.post('/getVentasListWithPage', getVentasListWithPage);

router.post('/getSaleByID', [

  check('idSale','id de la Venta obligatorio').not().isEmpty(),
  check('idSale','El id de la Venta debe ser numérico').isNumeric(),

  validarCampos
], getSaleByID);

router.post('/insertPayments', [

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('paymentList','Los pagos son obligatorios').not().isEmpty(),

  validarCampos
], insertPayments);

router.post('/getPaymentsByIdSaleListWithPage', [

  check('idSale','Venta obligatoria').not().isEmpty(),
  check('idSale','La venta debe ser numérica').isNumeric(),

  validarCampos
], getPaymentsByIdSaleListWithPage);

router.post('/insertSaleByConsignation', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('idSaleType','Condición de pago obligatoria').not().isEmpty(),
  check('idSaleType','La Condición de pago debe ser numérica').isNumeric(),

  check('total','Total obligatorio').not().isEmpty(),
  check('total','El Total debe ser numérico').isNumeric(),

  check('saleDetail','Debe seleccionar productos').not().isEmpty(),

  validarCampos
], insertSaleByConsignation);

router.post('/regresarProductoDeConsignacion', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('saleDetail','Debe seleccionar productos').not().isEmpty(),

  validarCampos
], regresarProductoDeConsignacion);

router.post('/getPreCorteCaja', [

  check('idCaja','id caja obligatorio').not().isEmpty(),
  check('idCaja','El id caja debe ser numérico').isNumeric(),

  validarCampos
], getPreCorteCaja);


module.exports = router;