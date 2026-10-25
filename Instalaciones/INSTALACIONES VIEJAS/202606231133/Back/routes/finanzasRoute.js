const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getInfFinanciera
   } = require('../controllers/finanzasController');

   
const router = Router();

router.post('/getInfFinanciera', getInfFinanciera);

module.exports = router;