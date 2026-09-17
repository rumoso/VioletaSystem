const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')
const { uploadMetalCliente, uploadTallerHeader } = require('../middlewares/multer-config')
const { validarTallerNoCancelado } = require('../middlewares/validar-taller-editable')

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
  , entregarApartado

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
  , addMetalFinal
  , deleteMetalFinal
  , getTallerMetalesFinal
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
  , getTallerByIDSeq
  , insertUpdateTallerFirma
  , insertUpdateTallerFirmasMasivo
  , getTallerFirmasHistorial
  , getTallerPaginado
  , getTallerRefaccciones
  , getTallerServiciosExternos
  , cbxGetServiciosExternosCombo
  , getTallerStatusCat

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

  validarCampos,
  validarTallerNoCancelado
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

router.post('/entregarApartado', [

  check('idSale','Venta obligatoria').not().isEmpty(),
  check('auth_idUser','La autorización especial es obligatoria').isInt({ gt: 0 }),

  validarCampos
], entregarApartado);

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

  validarCampos,
  validarTallerNoCancelado
], addRefaccionTaller);

router.post('/deleteRefaccionTaller', [

  check('idRefaccion','id de Refacción obligatorio').not().isEmpty(),
  check('idRefaccion','id de Refacción debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteRefaccionTaller);

router.post('/addServicioExternoTaller', [

  check('servicioExterno','Servicio Externo obligatorio').not().isEmpty(),

  validarCampos,
  validarTallerNoCancelado
], addServicioExternoTaller);

router.post('/deleteServicioExternoTaller', [

  check('idServicioExternoDetalle','id de Servicio Externo obligatorio').not().isEmpty(),
  check('idServicioExternoDetalle','id de Servicio Externo debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteServicioExternoTaller);

router.post('/addManoObraTaller', [

  check('manoObra','Mano de Obra obligatoria').not().isEmpty(),

  validarCampos,
  validarTallerNoCancelado
], addManoObraTaller);

router.post('/deleteManoObraTaller', [

  check('idManoObra','id de Mano de Obra obligatorio').not().isEmpty(),
  check('idManoObra','id de Mano de Obra debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteManoObraTaller);

router.post('/getTallerManoObra', [

  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),

  validarCampos
], getTallerManoObra);

router.post('/updateManoObraPrecio', [

  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], updateManoObraPrecio);

router.post('/saveTallerHeader', [

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El Vendedor debe ser numérico').isNumeric(),

  check('idCustomer','Cliente obligatorio').not().isEmpty(),
  check('idCustomer','El Cliente debe ser numérico').isNumeric(),

  check('descripcion','Descripción obligatoria').not().isEmpty(),

  validarCampos,
  validarTallerNoCancelado
], saveTallerHeader);

router.post('/updateTallerStatus', [

  check('idTaller','Taller obligatorio').not().isEmpty(),
  check('idTaller','El Taller debe ser numérico').isNumeric(),

  check('idTallerStatus','Estado de Taller obligatorio').not().isEmpty(),
  check('idTallerStatus','El Estado de Taller debe ser numérico').isNumeric(),

  check('auth_idUser','El autorizante debe ser un usuario válido').optional().isInt({ gt: 0 }),

  validarCampos,
  validarTallerNoCancelado
], updateTallerStatus);

router.post('/getTallerServiciosExternos', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerServiciosExternos);

router.post('/getTallerByID', [

  check('idTaller','id de la Venta obligatorio').not().isEmpty(),

  validarCampos
], getTallerByID);

router.post('/getTallerByIDSeq', [

  check('idTaller','id de la Venta obligatorio').not().isEmpty(),

  validarCampos
], getTallerByIDSeq);

router.post('/insertUpdateTallerFirma', [

  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], insertUpdateTallerFirma);

router.post('/insertUpdateTallerFirmasMasivo', [
  check('firmas','firmas es obligatorio').not().isEmpty(),
  check('firmas','firmas debe ser un array').isArray({ min: 1 }),
  check('idUserFirma','idUserFirma es obligatorio').not().isEmpty(),
  check('idUserFirma','idUserFirma debe ser numérico').isNumeric(),
  validarCampos,
  validarTallerNoCancelado
], insertUpdateTallerFirmasMasivo);

router.post('/getTallerFirmasHistorial', [
  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),
  validarCampos
], getTallerFirmasHistorial);

router.post('/addMetalAgranel', [
  check('metalAgranel','Metal Agranel obligatorio').not().isEmpty(),

  validarCampos,
  validarTallerNoCancelado
], addMetalAgranel);

router.post('/deleteMetalAgranel', [

  check('idMetalAgranel','id de Metal Agranel obligatorio').not().isEmpty(),
  check('idMetalAgranel','id de Metal Agranel debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteMetalAgranel);

router.post('/getTallerMetalesAgranel', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerMetalesAgranel);

router.post('/addMetalCliente', [
  check('metalCliente','Metal del Cliente obligatorio').not().isEmpty(),
  validarCampos,
  validarTallerNoCancelado
], addMetalCliente);

router.post('/deleteMetalCliente', [

  check('idMetalCliente','id de Metal Cliente obligatorio').not().isEmpty(),
  check('idMetalCliente','id de Metal Cliente debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteMetalCliente);

router.post('/getTallerMetalesCliente', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerMetalesCliente);

router.post('/addMetalFinal', [
  check('metalFinal','Metal Final obligatorio').not().isEmpty(),
  validarCampos,
  validarTallerNoCancelado
], addMetalFinal);

router.post('/deleteMetalFinal', [

  check('idMetalFinal','id de Metal Final obligatorio').not().isEmpty(),
  check('idMetalFinal','id de Metal Final debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteMetalFinal);

router.post('/getTallerMetalesFinal', [

  check('idTaller','id del Taller obligatorio').not().isEmpty(),

  validarCampos
], getTallerMetalesFinal);

router.post('/uploadMetalClienteImage', uploadMetalCliente.single('file'), validarTallerNoCancelado, uploadMetalClienteImage);

router.post('/uploadTallerHeaderImage', uploadTallerHeader.single('file'), validarTallerNoCancelado, uploadMetalClienteImage);

router.post('/getMetalClienteImages', []
, getMetalClienteImages);

router.post('/deleteMetalClienteImage', [

  check('keyX','id de imagen obligatorio').not().isEmpty(),
  check('keyX','id de imagen debe ser numérico').isNumeric(),

  validarCampos,
  validarTallerNoCancelado
], deleteMetalClienteImage);

router.post('/getTallerPaginado', getTallerPaginado);
router.post('/getTallerStatusCat', getTallerStatusCat);

router.post('/getTallerRefaccciones', getTallerRefaccciones);

router.post('/cbxGetServiciosExternosCombo', [

  validarCampos
], cbxGetServiciosExternosCombo);

// Responsables de devolución
const {
  getTallerResponsablesDevolucion,
  insertResponsableDevolucion,
  updateResponsableDevolucion,
  deleteResponsableDevolucion
} = require('../controllers/salesController');

router.post('/getTallerResponsablesDevolucion', [
  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),
  validarCampos
], getTallerResponsablesDevolucion);

router.post('/insertResponsableDevolucion', [
  check('idTaller','idTaller es obligatorio').not().isEmpty(),
  check('idTaller','idTaller debe ser numérico').isNumeric(),
  check('idUser','idUser es obligatorio').not().isEmpty(),
  check('idUser','idUser debe ser numérico').isNumeric(),
  check('monto','monto es obligatorio').not().isEmpty(),
  check('monto','monto debe ser numérico').isNumeric(),
  validarCampos,
  validarTallerNoCancelado
], insertResponsableDevolucion);

router.post('/updateResponsableDevolucion', [
  check('idResponsablesDevolucion','id es obligatorio').not().isEmpty(),
  check('idResponsablesDevolucion','id debe ser numérico').isNumeric(),
  check('idUser','idUser es obligatorio').not().isEmpty(),
  check('idUser','idUser debe ser numérico').isNumeric(),
  check('monto','monto es obligatorio').not().isEmpty(),
  check('monto','monto debe ser numérico').isNumeric(),
  validarCampos,
  validarTallerNoCancelado
], updateResponsableDevolucion);

router.post('/deleteResponsableDevolucion', [
  check('idResponsablesDevolucion','id es obligatorio').not().isEmpty(),
  check('idResponsablesDevolucion','id debe ser numérico').isNumeric(),
  validarCampos,
  validarTallerNoCancelado
], deleteResponsableDevolucion);

// ── Garantías de taller (analisis/016) ──
const {
  getTalleresParaGarantia,
  insertGarantiaByTaller
} = require('../controllers/salesController');

router.post('/getTalleresParaGarantia', [
  validarCampos
], getTalleresParaGarantia);

router.post('/insertGarantiaByTaller', [
  check('idTallerOrigen','El taller de origen es obligatorio').isInt({ gt: 0 }),
  check('descripcion','Describe el problema que motiva la garantía').not().isEmpty(),
  validarCampos,
  validarTallerNoCancelado
], insertGarantiaByTaller);

// ── Eliminar o cancelar taller (analisis/022) ──
const {
  getTallerDatosCancelacion,
  deleteTallerVacio,
  cancelarTaller
} = require('../controllers/salesController');

router.post('/getTallerDatosCancelacion', [
  check('idSale','El folio del taller es obligatorio').not().isEmpty(),
  validarCampos
], getTallerDatosCancelacion);

router.post('/deleteTallerVacio', [
  check('idSale','El folio del taller es obligatorio').not().isEmpty(),
  check('idUserLogON','Usuario obligatorio').isInt({ gt: 0 }),
  validarCampos
], deleteTallerVacio);

router.post('/cancelarTaller', [
  check('idSale','El folio del taller es obligatorio').not().isEmpty(),
  check('auth_idUser','La autorización especial es obligatoria').isInt({ gt: 0 }),
  check('motivo','El motivo de cancelación es obligatorio').trim().not().isEmpty(),
  validarCampos
], cancelarTaller);

module.exports = router;