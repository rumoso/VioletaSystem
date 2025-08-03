const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getPrintersBySec
  , getSelectPrinterByIdUser
  , insertSelectPrinter
  , deleteSelectPrinter
  , getPrinterByID

} = require('../controllers/printersController');

   
const router = Router();

router.post('/getPrintersBySec', [

  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], getPrintersBySec);

router.post('/getSelectPrinterByIdUser', [
  
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], getSelectPrinterByIdUser);

router.post('/insertSelectPrinter', [
  
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idPrinter','Id de la caja obligatorio').not().isEmpty(),
  check('idPrinter','Id de la caja debe ser numérico').isNumeric(),

  validarCampos
], insertSelectPrinter);

router.post('/deleteSelectPrinter', [
  
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idPrinter','Id de la caja obligatorio').not().isEmpty(),
  check('idPrinter','Id de la caja debe ser numérico').isNumeric(),

  validarCampos
], deleteSelectPrinter);

router.post('/getPrinterByID', [
  
  check('idPrinter','Id de la caja obligatorio').not().isEmpty(),
  check('idPrinter','Id de la caja debe ser numérico').isNumeric(),

  validarCampos
], getPrinterByID);

module.exports = router;