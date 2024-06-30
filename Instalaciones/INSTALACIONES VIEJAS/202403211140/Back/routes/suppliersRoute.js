const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getSupplierListWithPage
    , cbxGetSuppliersCombo
    , insertSupplier

    , disabledActions
    , getActionsForAddUser
    , getActionByUserListWithPage
    , insertActionByIdUser
    , disabledActionByRelation
   } = require('../controllers/suppliersController');

   
const router = Router();

router.post('/getSupplierListWithPage', getSupplierListWithPage);

router.post('/cbxGetSuppliersCombo', cbxGetSuppliersCombo);

router.post('/insertSupplier', [

  check('name','Nombre obligatoría').not().isEmpty(),
  
  check('description','Descripción obligatoría').not().isEmpty(),
  
  validarCampos
], insertSupplier);


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

router.post('/disabledActionByRelation', [
  check('idRelation','Id usuario obligatorio').not().isEmpty(),
  check('idRelation','Id usuario debe ser numérico').isNumeric(),

  check('relationType','Id tipo de relación obligatorio').not().isEmpty(),

  check('idAction','Id Action obligatorio').not().isEmpty(),
  check('idAction','Id Action debe ser numérico').isNumeric(),
  
  validarCampos
], disabledActionByRelation);

module.exports = router;