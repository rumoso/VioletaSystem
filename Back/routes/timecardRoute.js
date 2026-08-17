const { Router } = require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getEstadoTimecard
    , insertMarcaje
    , insertMarcajeManual
    , getAsistenciaList
    , getHorarioSucursal
    , guardarHorarioSucursal
    , getHorarioEmpleado
    , guardarHorarioEmpleado
     } = require('../controllers/timecardController');

const router = Router();

// --- Checador (público — se usa desde el login, sin sesión) ---

router.post('/getEstadoTimecard', [
    check('idUser', 'El usuario es obligatorio').not().isEmpty(),
    validarCampos
], getEstadoTimecard);

router.post('/insertMarcaje', [
    check('idUser', 'El usuario es obligatorio').not().isEmpty(),
    check('tipo', 'El tipo de marcaje es obligatorio').not().isEmpty(),
    validarCampos
], insertMarcaje);

// --- Captura/corrección manual (permiso especial) ---

router.post('/insertMarcajeManual', [
    check('idEmpleado', 'El empleado es obligatorio').not().isEmpty(),
    check('tipo', 'El tipo de marcaje es obligatorio').not().isEmpty(),
    check('fechaHora', 'La fecha/hora es obligatoria').not().isEmpty(),
    check('motivo', 'El motivo es obligatorio').not().isEmpty(),
    check('auth_idUser', 'La autorización especial es obligatoria').isInt({ gt: 0 }),
    validarCampos
], insertMarcajeManual);

// --- Consulta ---

router.post('/getAsistenciaList', [
    check('idEmpleado', 'El empleado es obligatorio').not().isEmpty(),
    check('startDate', 'La fecha de inicio es obligatoria').not().isEmpty(),
    check('endDate', 'La fecha final es obligatoria').not().isEmpty(),
    validarCampos
], getAsistenciaList);

// --- Horarios ---

router.post('/getHorarioSucursal', [
    check('idSucursal', 'La sucursal es obligatoria').not().isEmpty(),
    validarCampos
], getHorarioSucursal);

router.post('/guardarHorarioSucursal', [
    check('idSucursal', 'La sucursal es obligatoria').not().isEmpty(),
    check('dias', 'Los días deben ser una lista').isArray(),
    validarCampos
], guardarHorarioSucursal);

router.post('/getHorarioEmpleado', [
    check('idEmpleado', 'El empleado es obligatorio').not().isEmpty(),
    validarCampos
], getHorarioEmpleado);

router.post('/guardarHorarioEmpleado', [
    check('idEmpleado', 'El empleado es obligatorio').not().isEmpty(),
    check('dias', 'Los días deben ser una lista').isArray(),
    validarCampos
], guardarHorarioEmpleado);

module.exports = router;
