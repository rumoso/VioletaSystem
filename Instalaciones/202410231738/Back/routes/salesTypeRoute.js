const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetSalesTypeCombo
   } = require('../controllers/salesTypeController');

   
const router = Router();

router.post('/cbxGetSalesTypeCombo', cbxGetSalesTypeCombo);


module.exports = router;