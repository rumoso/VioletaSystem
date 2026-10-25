const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetQualityCombo
   } = require('../controllers/qualityController');

   
const router = Router();

router.post('/cbxGetQualityCombo', cbxGetQualityCombo);


module.exports = router;