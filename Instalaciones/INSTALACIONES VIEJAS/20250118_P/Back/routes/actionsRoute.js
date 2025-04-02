const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getActionListWithPage
    , insertAction
    , disabledActions

    , getAllActionsByPermission
    , insertActionsPermisionsByIdRelation
  } = require('../controllers/actionsController');

   
const router = Router();

router.post('/getActionListWithPage', getActionListWithPage);

router.post('/insertAction', [

  check('name','Nombre obligatoría').not().isEmpty(),
  
  check('description','Descripción obligatoría').not().isEmpty(),
  
  validarCampos
], insertAction);

router.post('/disabledActions', [

  check('idAction','Id de la acción obligatoria').not().isEmpty(),
  check('idAction','Id de la acción debe ser numérico').isNumeric(),
  
  validarCampos
], disabledActions);

router.post('/getAllActionsByPermission', [
  
  check('relationType','Id tipo de relación obligatorio').not().isEmpty(),
  check('idRelation','Id usuario obligatorio').not().isEmpty(),
  check('idRelation','Id usuario debe ser numérico').isNumeric(),

  validarCampos
], getAllActionsByPermission);

router.post('/insertActionsPermisionsByIdRelation', [
  
  check('relationType','Id tipo de relación obligatorio').not().isEmpty(),
  check('idRelation','Id usuario obligatorio').not().isEmpty(),
  check('idRelation','Id usuario debe ser numérico').isNumeric(),

  validarCampos
], insertActionsPermisionsByIdRelation);

module.exports = router;