const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetFamiliesCombo
   } = require('../controllers/familiesController');

   
const router = Router();

router.post('/cbxGetFamiliesCombo', cbxGetFamiliesCombo);


module.exports = router;