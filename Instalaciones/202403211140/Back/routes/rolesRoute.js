const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getRolesForAddUser
  , getRolesByIdUser
  , insertRolByIdUser
  , deleteRolByIdUser

  , getRolesListWithPage
  , insertRol
  , updateRol
  , getRolByID

   } = require('../controllers/rolesController');

   
const router = Router();

router.post('/getRolesForAddUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  
  validarCampos
], getRolesForAddUser);

router.post('/getRolesByIdUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),

  validarCampos
], getRolesByIdUser);

router.post('/insertRolByIdUser', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idRol','Id del Rol obligatorio').not().isEmpty(),
  check('idRol','Id del Rol debe ser numérico').isNumeric(),

  validarCampos
], insertRolByIdUser);

router.post('/deleteRolByIdUser', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  check('idRol','Id del Rol obligatorio').not().isEmpty(),
  check('idRol','Id del Rol debe ser numérico').isNumeric(),

  validarCampos
], deleteRolByIdUser);

router.post('/getRolesListWithPage', getRolesListWithPage);

router.post('/insertRol', [
  check('name','Nombre obligatorio').not().isEmpty(),

  validarCampos
], insertRol);

router.post('/updateRol', [

  check('idRol','Id del rol obligatorio').not().isEmpty(),
  check('name','Nombre obligatorio').not().isEmpty(),

  validarCampos
], updateRol);

router.post('/getRolByID', [
  check('idRol','Id obligatorio').not().isEmpty(),
  check('idRol','Id debe ser numérico').isNumeric(),
  validarCampos
], getRolByID);



module.exports = router;