const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetOriginCombo
   } = require('../controllers/originController');

   
const router = Router();

router.post('/cbxGetOriginCombo', cbxGetOriginCombo);


module.exports = router;