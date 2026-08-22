const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getCartera
    , getCarteraTop
    , getInventario
    , getResumenDia
    , getResumenPorVendedor
    , getResumenMes
    , getOperacion
     } = require('../controllers/dashboardController');

const router = Router();

// Panel del director (analisis/014). Todo es de solo lectura y un
// endpoint por bloque, para que un bloque lento no tumbe a los otros.
//
// `idUserLogON` es obligatorio en todos: es con lo que se resuelve el
// permiso del panel y el de ver costos.

const _aValidacion = [
    check('idUserLogON', 'El usuario es obligatorio').isInt({ gt: 0 }),
    validarCampos
];

router.post('/getCartera', _aValidacion, getCartera);

router.post('/getCarteraTop', _aValidacion, getCarteraTop);

router.post('/getInventario', _aValidacion, getInventario);

router.post('/getResumenDia', _aValidacion, getResumenDia);

router.post('/getResumenPorVendedor', _aValidacion, getResumenPorVendedor);

router.post('/getResumenMes', _aValidacion, getResumenMes);

router.post('/getOperacion', _aValidacion, getOperacion);

module.exports = router;
