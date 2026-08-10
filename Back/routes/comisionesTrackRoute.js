const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getComisionesTrackList
    , insertComisionManual
    , cancelarComisionTrack
    , generarComisionesVenta
     } = require('../controllers/comisionesTrackController');

const router = Router();

router.post('/getComisionesTrackList', getComisionesTrackList );

router.post('/insertComisionManual',[
    check('idUser','El empleado es obligatorio').not().isEmpty(),
    check('concepto','El concepto es obligatorio').not().isEmpty(),
    check('monto','El monto es obligatorio').isFloat({ gt: -1000000, lt: 1000000 }),
    check('fecha','La fecha es obligatoria').not().isEmpty(),
    validarCampos

], insertComisionManual );

router.post('/cancelarComisionTrack',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('motivo','El motivo es obligatorio').not().isEmpty(),
    validarCampos

], cancelarComisionTrack );

router.post('/generarComisionesVenta',[
    check('startDate','La fecha inicial es obligatoria').not().isEmpty(),
    check('endDate','La fecha final es obligatoria').not().isEmpty(),
    check('idSeller_idUser','El vendedor es obligatorio').not().isEmpty(),
    validarCampos

], generarComisionesVenta );

module.exports = router;
