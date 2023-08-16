const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getRolesForAddUser
  , getRolesByIdUser
  , insertRolByIdUser
  , deleteRolByIdUser
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



module.exports = router;