const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const { login } = require('../controllers/authController');

const router = Router();

router.post('/login',[
    check('username','El nombre de usuario es obligatorio').not().isEmpty(),
    check('pwd','La contraseña es obligatoria').not().isEmpty(),
    validarCampos

], login );

// router.post('/google',[
//     check('id_token', 'El id_token es necesario').not().isEmpty(),
//     validarCampos
// ], googleSingIn );

module.exports = router;