const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    generarNomina
    , getNominasList
    , getNominaDetalle
    , getRecibo
    , insertUpdateReciboDetalle
    , deleteReciboDetalle
    , excluirRecibo
    , pagarNomina
    , cancelarNomina
    , deleteNomina
    , getNominasByEmpleado
     } = require('../controllers/nominaController');

const router = Router();

router.post('/generarNomina',[
    check('tipoPeriodo','El tipo de periodo es obligatorio').isIn(['SEMANA','QUINCENA','MES']),
    check('fechaInicio','La fecha de inicio es obligatoria').not().isEmpty(),
    check('fechaFin','La fecha final es obligatoria').not().isEmpty(),
    validarCampos

], generarNomina );

router.post('/getNominasList', getNominasList );

router.post('/getNominaDetalle',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], getNominaDetalle );

router.post('/getRecibo',[
    check('idNominaRecibo','El recibo es obligatorio').not().isEmpty(),
    validarCampos

], getRecibo );

router.post('/insertUpdateReciboDetalle',[
    check('idNominaRecibo','El recibo es obligatorio').not().isEmpty(),
    check('conceptoDesc','El concepto es obligatorio').not().isEmpty(),
    check('tipo','El tipo es obligatorio').isIn(['PERCEPCION','DEDUCCION']),
    check('monto','El monto es obligatorio').isFloat(),
    validarCampos

], insertUpdateReciboDetalle );

router.post('/deleteReciboDetalle',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], deleteReciboDetalle );

router.post('/excluirRecibo',[
    check('idNominaRecibo','El recibo es obligatorio').not().isEmpty(),
    validarCampos

], excluirRecibo );

router.post('/pagarNomina',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], pagarNomina );

router.post('/cancelarNomina',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('motivo','El motivo es obligatorio').not().isEmpty(),
    validarCampos

], cancelarNomina );

router.post('/deleteNomina',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], deleteNomina );

router.post('/getNominasByEmpleado',[
    check('idEmpleado','El empleado es obligatorio').not().isEmpty(),
    validarCampos

], getNominasByEmpleado );

module.exports = router;
