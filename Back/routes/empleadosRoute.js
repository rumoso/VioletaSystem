const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getEmpleadosList
    , getEmpleadoById
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

router.post('/getEmpleadoById',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], getEmpleadoById );

router.post('/insertUpdateEmpleado',[
    check('idUser','El usuario ligado es obligatorio').not().isEmpty(),
    check('nombre','El nombre es obligatorio').not().isEmpty(),
    check('fechaIngreso','La fecha de ingreso es obligatoria').not().isEmpty(),
    check('periodicidadComisiones','La periodicidad de comisiones es obligatoria').isIn(['SEMANA','QUINCENA','MES']),
    check('horasSemana','Las horas por semana son obligatorias').isFloat({ gt: 0 }),
    validarCampos

], insertUpdateEmpleado );

router.post('/getBajaImpacto',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], getBajaImpacto );

router.post('/bajaEmpleado',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('fechaBaja','La fecha de baja es obligatoria').not().isEmpty(),
    validarCampos

], bajaEmpleado );

router.post('/reactivarEmpleado',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('fechaIngreso','La nueva fecha de ingreso es obligatoria').not().isEmpty(),
    validarCampos

], reactivarEmpleado );

router.post('/deleteEmpleado',[
    check('id','El id es obligatorio').not().isEmpty(),
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
