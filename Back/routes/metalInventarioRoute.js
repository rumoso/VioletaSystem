const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const {
    getMetalInventarioSaldos
    , getMetalInventarioTrack
    , addMetalInventarioMovimiento
    , cbxGetProductosMetal

   } = require('../controllers/metalInventarioController');


const router = Router();

router.post('/getMetalInventarioSaldos', getMetalInventarioSaldos);

router.post('/getMetalInventarioTrack', getMetalInventarioTrack);

router.post('/addMetalInventarioMovimiento', [

  check('tipoMovimiento','tipoMovimiento obligatorío').not().isEmpty(),
  check('tipoDestino','tipoDestino obligatorío').not().isEmpty(),
  check('idProduct','idProduct obligatorío').not().isEmpty(),
  check('idProduct','idProduct debe ser numérico').isNumeric(),
  check('gramos','gramos obligatorío').not().isEmpty(),
  check('gramos','gramos debe ser numérico').isNumeric(),

  validarCampos
], addMetalInventarioMovimiento);

router.post('/cbxGetProductosMetal', cbxGetProductosMetal);

module.exports = router;
