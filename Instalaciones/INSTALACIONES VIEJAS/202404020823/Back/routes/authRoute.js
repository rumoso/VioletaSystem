const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const { 
    login
    , getMenuByPermissions
    , getActionsPermissionByUser

    , getMenuForPermissions
    , insertMenusPermisionsByIdRelation
     } = require('../controllers/authController');

const router = Router();

router.post('/login',[
    check('username','El nombre de usuario es obligatorio').not().isEmpty(),
    check('pwd','La contraseña es obligatoria').not().isEmpty(),
    validarCampos

], login );

router.post('/getMenuByPermissions',[
    check('idUser','Usuario obligatorio').not().isEmpty(),
    validarCampos

], getMenuByPermissions );

router.post('/getActionsPermissionByUser',[
    check('idUser','Usuario obligatorio').not().isEmpty(),
    validarCampos

], getActionsPermissionByUser );

router.post('/getMenuForPermissions', [
  
    check('relationType','Id tipo de relación obligatorio').not().isEmpty(),
    check('idRelation','Id usuario obligatorio').not().isEmpty(),
    check('idRelation','Id usuario debe ser numérico').isNumeric(),
  
    validarCampos
  ], getMenuForPermissions);

router.post('/insertMenusPermisionsByIdRelation', [

    check('relationType','Id tipo de relación obligatorio').not().isEmpty(),
    check('idRelation','Id usuario obligatorio').not().isEmpty(),
    check('idRelation','Id usuario debe ser numérico').isNumeric(),

validarCampos
], insertMenusPermisionsByIdRelation);

module.exports = router;