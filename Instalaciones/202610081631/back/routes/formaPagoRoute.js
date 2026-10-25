const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetFormaPagoCombo
  , cbxGetFormaPagoCorteCombo
   } = require('../controllers/formaPagoController');

   
const router = Router();

router.post('/cbxGetFormaPagoCombo', cbxGetFormaPagoCombo);

router.post('/cbxGetFormaPagoCorteCombo', cbxGetFormaPagoCorteCombo);


module.exports = router;