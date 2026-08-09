const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getNominaConceptosList
    , cbxGetConceptosActivos
    , insertUpdateNominaConcepto
    , setActiveNominaConcepto
    , deleteNominaConcepto
     } = require('../controllers/nominaConceptosController');

const router = Router();

router.post('/getNominaConceptosList', getNominaConceptosList );

router.post('/cbxGetConceptosActivos', cbxGetConceptosActivos );

router.post('/insertUpdateNominaConcepto',[
    check('name','El nombre es obligatorio').not().isEmpty(),
    check('tipo','El tipo es obligatorio').isIn(['PERCEPCION','DEDUCCION']),
    validarCampos

], insertUpdateNominaConcepto );

router.post('/setActiveNominaConcepto',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('active','El estatus es obligatorio').isBoolean(),
    validarCampos

], setActiveNominaConcepto );

router.post('/deleteNominaConcepto',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], deleteNominaConcepto );

module.exports = router;
