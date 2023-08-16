const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const { 
    login
    , getMenuByPermissions
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

module.exports = router;