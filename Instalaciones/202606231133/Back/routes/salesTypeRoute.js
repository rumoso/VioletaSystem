const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetSalesTypeCombo
  , cbxGetSalesTypeComboSales
   } = require('../controllers/salesTypeController');

   
const router = Router();

router.post('/cbxGetSalesTypeCombo', cbxGetSalesTypeCombo);

router.post('/cbxGetSalesTypeComboSales', cbxGetSalesTypeComboSales);

module.exports = router;