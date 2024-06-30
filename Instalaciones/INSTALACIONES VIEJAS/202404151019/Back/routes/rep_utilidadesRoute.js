const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  get_rep_getUtilidades
   } = require('../controllers/rep_utilidadesController');

   
const router = Router();

router.post('/get_rep_getUtilidades', get_rep_getUtilidades);

module.exports = router;