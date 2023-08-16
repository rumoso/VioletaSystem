const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
   insertSale
   , getVentasListWithPage

   , getVentasACreditoListWithPage
   , insertAbono
   , getAbonosBySaleListWithPage
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

router.post('/getVentasACreditoListWithPage', [

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  validarCampos
], getVentasACreditoListWithPage);

router.post('/insertAbono', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('idSale','Venta obligatoria').not().isEmpty(),
  check('idSale','La venta debe ser numérica').isNumeric(),

  check('paga','Condición de pago obligatoria').not().isEmpty(),
  check('paga','La Condición de pago debe ser numérica').isNumeric(),

  validarCampos
], insertAbono);

router.post('/getAbonosBySaleListWithPage', [

  check('idSale','Venta obligatoria').not().isEmpty(),
  check('idSale','La venta debe ser numérica').isNumeric(),

  validarCampos
], getAbonosBySaleListWithPage);

module.exports = router;