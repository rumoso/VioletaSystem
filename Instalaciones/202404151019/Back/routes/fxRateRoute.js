const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getFxRateListWithPage
    , insertFxRate
   } = require('../controllers/fxRateController');

   
const router = Router();

router.post('/getFxRateListWithPage', getFxRateListWithPage);

router.post('/insertFxRate', [

  check('referencia','Referencia obligatoría').not().isEmpty(),
  
  check('fxRate','El Tipo de cambio debe ser numérico').isNumeric(),

  validarCampos
], insertFxRate);

module.exports = router;