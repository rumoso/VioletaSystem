const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')
const { validarSesion } = require('../middlewares/validar-sesion')

const { 
  getSucursalesForAddUser
  , getSucursalesByIdUser
  , cbxGetSucursalesCombo
  , insertSucursalByIdUser
  , deleteSucursalByIdUser
  , getPrintTicketSuc
  , getSucursalesList
  , getSucursalByID
  , saveSucursal
  , setSucursalActiva
   } = require('../controllers/sucursalesController');

   
const router = Router();

router.post('/getSucursalesForAddUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  
  validarCampos
], getSucursalesForAddUser);

router.post('/getSucursalesByIdUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),

  validarCampos
], getSucursalesByIdUser);

router.post('/insertSucursalByIdUser', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idSucursal','Id de sucursal obligatorio').not().isEmpty(),
  check('idSucursal','Id de sucursal debe ser numérico').isNumeric(),

  validarCampos
], insertSucursalByIdUser);

router.post('/deleteSucursalByIdUser', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idSucursal','Id de sucursal obligatorio').not().isEmpty(),
  check('idSucursal','Id de sucursal debe ser numérico').isNumeric(),

  validarCampos
], deleteSucursalByIdUser);


router.post('/cbxGetSucursalesCombo', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], cbxGetSucursalesCombo);

router.post('/getPrintTicketSuc', [
  check('idSucursal','Id de la sucursal obligatorio').not().isEmpty(),
  check('idSucursal','Id de la sucursal debe ser numérico').isNumeric(),

  check('type','El tipo es obligatorio').not().isEmpty(),

  validarCampos
], getPrintTicketSuc);

// ── Catálogo de sucursales (analisis/021) ──
// Todas exigen sesión. Las que escriben revisan además, en el controller,
// la acción `sucursales_CrearModificar`.

router.post('/getSucursalesList', [
  validarSesion,
  validarCampos
], getSucursalesList);

router.post('/getSucursalByID', [
  validarSesion,
  check('idSucursal','La sucursal es obligatoria').isInt({ gt: 0 }),
  validarCampos
], getSucursalByID);

router.post('/saveSucursal', [
  validarSesion,
  check('idSucursal','La sucursal debe ser numérica').isInt({ min: 0 }),
  check('name','El nombre de la sucursal es obligatorio').isString().trim().notEmpty(),
  validarCampos
], saveSucursal);

router.post('/setSucursalActiva', [
  validarSesion,
  check('idSucursal','La sucursal es obligatoria').isInt({ gt: 0 }),
  check('active','El estatus es obligatorio').not().isEmpty(),
  validarCampos
], setSucursalActiva);



module.exports = router;