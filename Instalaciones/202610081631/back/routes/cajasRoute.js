const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getCajasBySec
  , getSelectCajaByIdUser
  , insertSelectCaja
  , deleteSelectCaja
  , getCajaByID
} = require('../controllers/cajasController');

   
const router = Router();

router.post('/getCajasBySec', [

  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], getCajasBySec);

router.post('/getSelectCajaByIdUser', [
  
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], getSelectCajaByIdUser);

router.post('/insertSelectCaja', [
  
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idCaja','Id de la caja obligatorio').not().isEmpty(),
  check('idCaja','Id de la caja debe ser numérico').isNumeric(),

  validarCampos
], insertSelectCaja);

router.post('/deleteSelectCaja', [
  
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idCaja','Id de la caja obligatorio').not().isEmpty(),
  check('idCaja','Id de la caja debe ser numérico').isNumeric(),

  validarCampos
], deleteSelectCaja);

router.post('/getCajaByID', [
  
  check('idCaja','Id de la caja obligatorio').not().isEmpty(),
  check('idCaja','Id de la caja debe ser numérico').isNumeric(),

  validarCampos
], getCajaByID);

module.exports = router;