const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getActionListWithPage
    , insertAction
    , disabledActions

    , getAllActionsByPermission
    , insertActionsPermisionsByIdRelation
    , insertUpdateActionSection
    , getCatActionSectionListWithPage

    , getActionsBySectionPagindo
    , insertUpdateAction
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

router.post('/insertUpdateActionSection', [

  check('sectionName','Nombre obligatoría').not().isEmpty(),
  
  check('iLugar','Lugar obligatoría').not().isEmpty(),
  check('iLugar','El lugar debe ser numérico').isNumeric(),
  
  validarCampos
], insertUpdateActionSection);

router.post('/getCatActionSectionListWithPage', getCatActionSectionListWithPage);

router.post('/getActionsBySectionPagindo', [

  check('idActionSection','id obligatorio').not().isEmpty(),
  check('idActionSection','id lugar debe ser numérico').isNumeric(),
  
  validarCampos
], getActionsBySectionPagindo);

router.post('/insertUpdateAction', [

  check('name','Nombre obligatoría').not().isEmpty(),
  check('nameHtml','nameHtml obligatoría').not().isEmpty(),
  
  check('idActionSection','id obligatorio').not().isEmpty(),
  check('idActionSection','id lugar debe ser numérico').isNumeric(),
  
  validarCampos
], insertUpdateAction);

module.exports = router;