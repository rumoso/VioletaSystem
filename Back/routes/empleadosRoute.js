const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getEmpleadosList
    , getEmpleadoByIdUser
    , insertUpdateEmpleado
    , getBajaImpacto
    , bajaEmpleado
    , reactivarEmpleado
    , deleteEmpleado
    , getConceptosBase
    , insertUpdateConceptoBase
    , deleteConceptoBase
     } = require('../controllers/empleadosController');

const router = Router();

router.post('/getEmpleadosList', getEmpleadosList );

router.post('/getEmpleadoByIdUser',[
    check('idUser','El usuario es obligatorio').not().isEmpty(),
    validarCampos

], getEmpleadoByIdUser );

router.post('/insertUpdateEmpleado',[
    check('idUser','El usuario es obligatorio').not().isEmpty(),
    check('fechaIngreso','La fecha de ingreso es obligatoria').not().isEmpty(),
    check('periodicidadComisiones','La periodicidad de comisiones es obligatoria').isIn(['SEMANA','QUINCENA','MES']),
    check('horasSemana','Las horas por semana son obligatorias').isFloat({ gt: 0 }),
    validarCampos

], insertUpdateEmpleado );

router.post('/getBajaImpacto',[
    check('idUser','El usuario es obligatorio').not().isEmpty(),
    validarCampos

], getBajaImpacto );

router.post('/bajaEmpleado',[
    check('idUser','El usuario es obligatorio').not().isEmpty(),
    validarCampos

], bajaEmpleado );

router.post('/reactivarEmpleado',[
    check('idUser','El usuario es obligatorio').not().isEmpty(),
    validarCampos

], reactivarEmpleado );

router.post('/deleteEmpleado',[
    check('idUser','El usuario es obligatorio').not().isEmpty(),
    validarCampos

], deleteEmpleado );

router.post('/getConceptosBase',[
    check('idEmpleado','El empleado es obligatorio').not().isEmpty(),
    validarCampos

], getConceptosBase );

router.post('/insertUpdateConceptoBase',[
    check('idEmpleado','El empleado es obligatorio').not().isEmpty(),
    check('idNominaConcepto','El concepto es obligatorio').not().isEmpty(),
    check('monto','El monto es obligatorio y debe ser mayor a cero').isFloat({ gt: 0 }),
    validarCampos

], insertUpdateConceptoBase );

router.post('/deleteConceptoBase',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], deleteConceptoBase );

module.exports = router;
