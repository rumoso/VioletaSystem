const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')
const { validarSesion } = require('../middlewares/validar-sesion')

const {
    getConstantesList
    , saveConstante
    , setConstanteActiva
    , deleteConstante
   } = require('../controllers/constantesController');

// Catálogo de constantes (analisis/040). Todas exigen sesión; las que
// escriben revisan además `config_ConstantesModificar` en el controller.
const router = Router();

router.post('/getConstantesList', [
  validarSesion
], getConstantesList);

router.post('/saveConstante', [
  validarSesion,

  check('sKey','La clave es obligatoria').not().isEmpty(),
  check('sValue','El valor es obligatorio').not().isEmpty(),

  validarCampos
], saveConstante);

router.post('/setConstanteActiva', [
  validarSesion,

  check('idConstante','Id obligatorio').isInt({ gt: 0 }),

  validarCampos
], setConstanteActiva);

router.post('/deleteConstante', [
  validarSesion,

  check('idConstante','Id obligatorio').isInt({ gt: 0 }),

  validarCampos
], deleteConstante);

module.exports = router;
