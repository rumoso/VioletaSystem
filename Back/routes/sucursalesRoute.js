const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getSucursalesForAddUser
  , getSucursalesByIdUser
  , cbxGetSucursalesCombo
  , insertSucursalByIdUser
  , deleteSucursalByIdUser
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



module.exports = router;