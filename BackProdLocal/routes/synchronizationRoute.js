const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  syncData
   } = require('../controllers/synchronizationController');

   
const router = Router();

router.post('/syncData', syncData);


module.exports = router;