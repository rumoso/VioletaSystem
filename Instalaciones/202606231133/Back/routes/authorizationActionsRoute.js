const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  authorizationActionAPI
  , getAutorizacionesByRelation
   } = require('../controllers/authorizationActionsController');

   
const router = Router();

router.post('/authorizationActionAPI', [
  check('authorizationCode','Id usuario obligatorio').not().isEmpty(),

  check('actionName','Id acción obligatorio').not().isEmpty(),
  
  validarCampos
], authorizationActionAPI);

router.post('/getAutorizacionesByRelation', [

  check('idRelation','La relación es obligatoria').not().isEmpty(),

  check('relationType','El tipo de relación es obligatorio').not().isEmpty(),

  validarCampos
], getAutorizacionesByRelation);

module.exports = router;