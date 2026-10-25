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
    , getVentasConjunto
    , getPagosConjunto
    , getProductosConjunto
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

// Conjuntos del panel (analisis/015): los registros que hay detrás de
// una cifra, para la pantalla a la que lleva su clic. La clave del
// conjunto y sus parámetros se validan contra el catálogo en el
// controller; aquí solo lo básico de forma.
const _aValidacionConjunto = [
    check('idUserLogON', 'El usuario es obligatorio').isInt({ gt: 0 }),
    check('panel', 'La consulta del panel es obligatoria').isString().notEmpty(),
    validarCampos
];

router.post('/getVentasConjunto', _aValidacionConjunto, getVentasConjunto);

router.post('/getPagosConjunto', _aValidacionConjunto, getPagosConjunto);

router.post('/getProductosConjunto', _aValidacionConjunto, getProductosConjunto);

module.exports = router;
