const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  authorizationActionAPI
   } = require('../controllers/authorizationActionsController');

   
const router = Router();

router.post('/authorizationActionAPI', [
  check('authorizationCode','Id usuario obligatorio').not().isEmpty(),

  check('actionName','Id acción obligatorio').not().isEmpty(),
  
  validarCampos
], authorizationActionAPI);

module.exports = router;