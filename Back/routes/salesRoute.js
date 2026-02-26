const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')
const { uploadMetalCliente, uploadTallerHeader } = require('../middlewares/multer-config')

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

  , getRepPagosWithPage

  , addRefaccionTaller
  , deleteRefaccionTaller
  , addServicioExternoTaller
  , deleteServicioExternoTaller
  , addMetalAgranel
  , deleteMetalAgranel
  , getTallerMetalesAgranel
  , addMetalCliente
  , deleteMetalCliente
  , getTallerMetalesCliente
  , uploadMetalClienteImage
  , getMetalClienteImages
  , deleteMetalClienteImage
  , addManoObraTaller
  , deleteManoObraTaller
  , getTallerManoObra
  , updateManoObraPrecio
  , saveTallerHeader
  , updateTallerStatus
  , getTallerByID
  , getTallerPaginado
  , getTallerRefaccciones
  , getTallerServiciosExternos
  , cbxGetServiciosExternosCombo

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

router.post('/getRepPagosWithPage', getRepPagosWithPage);

router.post('/addRefaccionTaller', [

  check('refaccion','Refacción obligatoria').not().isEmpty(),

  validarCampos
], addRefaccionTaller);

router.post('/deleteRefaccionTaller', [

  check('idRefaccion','id de Refacción obligatorio').not().isEmpty(),
  check('idRefaccion','id de Refacción debe ser numérico').isNumeric(),

  validarCampos
], deleteRefaccionTaller);

router.post('/addServicioExternoTaller', [

  check('servicioExterno','Servicio Externo obligatorio').not().isEmpty(),

  validarCampos
], addServicioExternoTaller);

router.post('/deleteServicioExternoTaller', [

  check('idServicioExternoDetalle','id de Servicio Externo obligatorio').not().isEmpty(),
  check('idServicioExternoDetalle','id de Servicio Externo debe ser numérico').isNumeric(),

  validarCampos
], deleteServicioExternoTaller);

router.post('/addManoObraTaller', [

  check('manoObra','Mano de Obra obligatoria').not().isEmpty(),

  validarCampos
], addManoObraTaller);

router.post('/deleteManoObraTaller', [

  check('idManoObra','id de Mano de Obra obligatorio').not().isEmpty(),
  check('idManoObra','id de Mano de Obra debe ser numérico').isNumeric(),

  validarCampos
], deleteManoObraTaller);

router.post('/getTallerManoObra', [

  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),

  validarCampos
], getTallerManoObra);

router.post('/updateManoObraPrecio', [

  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),

  validarCampos
], updateManoObraPrecio);

router.post('/saveTallerHeader', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('descripcion','Descripción obligatoria').not().isEmpty(),

  validarCampos
], saveTallerHeader);

router.post('/updateTallerStatus', [

  check('idTaller','Taller obligatorio').not().isEmpty(),
  check('idTaller','El Taller debe ser numérico').isNumeric(),

  check('idTallerStatus','Estado de Taller obligatorio').not().isEmpty(),
  check('idTallerStatus','El Estado de Taller debe ser numérico').isNumeric(),

  validarCampos
], updateTallerStatus);

router.post('/getTallerServiciosExternos', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerServiciosExternos);

router.post('/getTallerByID', [

  check('idTaller','id de la Venta obligatorio').not().isEmpty(),

  validarCampos
], getTallerByID);

router.post('/addMetalAgranel', [
  check('metalAgranel','Metal Agranel obligatorio').not().isEmpty(),

  validarCampos
], addMetalAgranel);

router.post('/deleteMetalAgranel', [

  check('idMetalAgranel','id de Metal Agranel obligatorio').not().isEmpty(),
  check('idMetalAgranel','id de Metal Agranel debe ser numérico').isNumeric(),

  validarCampos
], deleteMetalAgranel);

router.post('/getTallerMetalesAgranel', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerMetalesAgranel);

router.post('/addMetalCliente', [
  check('metalCliente','Metal del Cliente obligatorio').not().isEmpty(),
  validarCampos
], addMetalCliente);

router.post('/deleteMetalCliente', [

  check('idMetalCliente','id de Metal Cliente obligatorio').not().isEmpty(),
  check('idMetalCliente','id de Metal Cliente debe ser numérico').isNumeric(),

  validarCampos
], deleteMetalCliente);

router.post('/getTallerMetalesCliente', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerMetalesCliente);

router.post('/uploadMetalClienteImage', uploadMetalCliente.single('file'), uploadMetalClienteImage);

router.post('/uploadTallerHeaderImage', uploadTallerHeader.single('file'), uploadMetalClienteImage);

router.post('/getMetalClienteImages', []
, getMetalClienteImages);

router.post('/deleteMetalClienteImage', [

  check('keyX','id de imagen obligatorio').not().isEmpty(),
  check('keyX','id de imagen debe ser numérico').isNumeric(),

  validarCampos
], deleteMetalClienteImage);

router.post('/getTallerPaginado', getTallerPaginado);

router.post('/getTallerRefaccciones', getTallerRefaccciones);

router.post('/cbxGetServiciosExternosCombo', [

  validarCampos
], cbxGetServiciosExternosCombo);

module.exports = router;