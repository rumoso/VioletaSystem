const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetFormaPagoCombo
   } = require('../controllers/formaPagoController');

   
const router = Router();

router.post('/cbxGetFormaPagoCombo', cbxGetFormaPagoCombo);


module.exports = router;