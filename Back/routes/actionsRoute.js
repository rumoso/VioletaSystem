const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getActionListWithPage
    , insertAction
    , disabledActions
    , getActionsForAddUser
    , getActionByUserListWithPage
    , insertActionByIdUser
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

router.post('/getActionsForAddUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  
  validarCampos
], getActionsForAddUser);

router.post('/getActionByUserListWithPage', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  
  validarCampos
], getActionByUserListWithPage);

router.post('/insertActionByIdUser', [
  check('idUser','Id usuario obligatorio').not().isEmpty(),
  check('idUser','Id usuario debe ser numérico').isNumeric(),

  check('idAction','Id acción obligatorio').not().isEmpty(),
  check('idAction','Id acción debe ser numérico').isNumeric(),
  
  validarCampos
], insertActionByIdUser);

module.exports = router;