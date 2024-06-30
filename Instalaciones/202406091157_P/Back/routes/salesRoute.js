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

} = require('../controllers/salesController');

   
const router = Router();

router.post('/insertSale', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('idSaleType','Condición de pago obligatoria').not().isEmpty(),
  check('idSaleType','La Condición de pago debe ser numérica').isNumeric(),

  check('saleDetail','Debe seleccionar productos').not().isEmpty(),

  validarCampos
], insertSale);

router.post('/getVentasListWithPage', getVentasListWithPage);

router.post('/getSaleByID', [

  check('idSale','id de la Venta obligatorio').not().isEmpty(),

  validarCampos
], getSaleByID);

router.post('/insertPayments', [

  check('idCaja','Caja obligatoria').not().isEmpty(),
  check('idCaja','La Caja debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('paymentList','Los pagos son obligatorios').not().isEmpty(),

  validarCampos
], insertPayments);

router.post('/getPaymentsByIdSaleListWithPage', [

  check('idSale','Venta obligatoria').not().isEmpty(),

  validarCampos
], getPaymentsByIdSaleListWithPage);

router.post('/insertSaleByConsignation', [

  check('idSaleOld','el id de la venta es obligatorio').not().isEmpty(),

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('idSaleType','Condición de pago obligatoria').not().isEmpty(),
  check('idSaleType','La Condición de pago debe ser numérica').isNumeric(),

  check('saleDetail','Debe seleccionar productos').not().isEmpty(),

  validarCampos
], insertSaleByConsignation);

router.post('/regresarProductoDeConsignacion', [

  check('idSaleOld','el id de la venta es obligatorio').not().isEmpty(),

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

router.post('/getPreEgresosCorteCaja', [

  check('idCaja','id caja obligatorio').not().isEmpty(),
  check('idCaja','El id caja debe ser numérico').isNumeric(),

  validarCampos
], getPreEgresosCorteCaja);

router.post('/insertCorteCaja', [

  check('idCaja','id caja obligatorio').not().isEmpty(),
  check('idCaja','El id caja debe ser numérico').isNumeric(),

  validarCampos
], insertCorteCaja);

router.post('/insertEgresos', [

  check('idCaja','Caja obligatoria').not().isEmpty(),
  check('idCaja','La Caja debe ser numérico').isNumeric(),

  check('idFormaPago','Forma de pago obligatorio').not().isEmpty(),
  check('idFormaPago','Forma de pago debe ser numérico').isNumeric(),

  check('amount','Monto es obligatorio').not().isEmpty(),
  check('amount','Monto debe ser numérico').isNumeric(),

  validarCampos
], insertEgresos);

router.post('/disabledEgresos', [
  check('idEgreso','Id obligatorio').not().isEmpty(),
  validarCampos
], disabledEgresos);

router.post('/getCorteCajaByID', [

  check('idCorteCaja','Corte de Caja obligatorio').not().isEmpty(),

  validarCampos
], getCorteCajaByID);

router.post('/getEgresosByIDCorteCaja', [

  check('idCorteCaja','Corte de Caja obligatorio').not().isEmpty(),

  validarCampos
], getEgresosByIDCorteCaja);

router.post('/getCorteCajaListWithPage', getCorteCajaListWithPage);

router.post('/disabledSale', [

  check('idSale','Venta obligatoria').not().isEmpty(),

  validarCampos
], disabledSale);

router.post('/getConsHistory', [

  check('idSale','Venta obligatoria').not().isEmpty(),

  validarCampos
], getConsHistory);

router.post('/getEgresoByID', [

  check('idEgreso','Egreso obligatoria').not().isEmpty(),

  validarCampos
], getEgresoByID);

router.post('/disabledPayment', [
  check('idPayment','Id obligatorio').not().isEmpty(),
  check('idSale','Id obligatorio').not().isEmpty(),
  validarCampos
], disabledPayment);

router.post('/getEgresosListWithPage', getEgresosListWithPage);

router.post('/disableSaleDetail', [

  check('idSaleDetail','El ID es obligatorio').not().isEmpty(),
  check('idSaleDetail','El ID debe ser numérico').isNumeric(),

  validarCampos
], disableSaleDetail);

router.post('/editSobreTaller', [

  check('auth_idUser','El Autorizante es obligatorio').not().isEmpty(),

  check('idSale','El id de la venta es obligatorio').not().isEmpty(),

  check('importe','El id de la venta es obligatorio').not().isEmpty(),
  check('importe','El importe debe ser numérico').isNumeric(),

  check('descriptionTaller','La descripción del sobre es obligatorio').not().isEmpty(),


  validarCampos
], editSobreTaller);

router.post('/getRepVentasDetailWithPage', getRepVentasDetailWithPage);

router.post('/cbxGetSobreTellerStatusCombo', cbxGetSobreTellerStatusCombo);

router.post('/insertIngresos', [

  check('idCaja','Caja obligatoria').not().isEmpty(),
  check('idCaja','La Caja debe ser numérico').isNumeric(),

  check('idFormaPago','Forma de pago obligatorio').not().isEmpty(),
  check('idFormaPago','Forma de pago debe ser numérico').isNumeric(),

  check('amount','Monto es obligatorio').not().isEmpty(),
  check('amount','Monto debe ser numérico').isNumeric(),

  validarCampos
], insertIngresos);

router.post('/disabledIngresos', [
  check('idIngreso','Id obligatorio').not().isEmpty(),
  validarCampos
], disabledIngresos);

router.post('/getPreIngresosCorteCaja', [

  check('idCaja','id caja obligatorio').not().isEmpty(),
  check('idCaja','El id caja debe ser numérico').isNumeric(),

  validarCampos
], getPreIngresosCorteCaja);

router.post('/getIngresoByID', [

  check('idIngreso','Egreso obligatoria').not().isEmpty(),

  validarCampos
], getIngresoByID);

router.post('/getIngresosByIDCorteCaja', [

  check('idCorteCaja','Corte de Caja obligatorio').not().isEmpty(),

  validarCampos
], getIngresosByIDCorteCaja);

router.post('/getIngresosListWithPage', getIngresosListWithPage);

router.post('/getDatosRelacionadosByIDCorteCaja', [

  check('idCorteCaja','Corte de Caja obligatorio').not().isEmpty(),

  validarCampos
], getDatosRelacionadosByIDCorteCaja);

router.post('/getRepPagosCanceladosWithPage', getRepPagosCanceladosWithPage);

module.exports = router;