const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getTecnicosList
    , getTecnicoById
    , insertUpdateTecnico
    , setActiveTecnico
    , deleteTecnico
     } = require('../controllers/catalogosPersonalController');

const router = Router();

router.post('/getTecnicosList', getTecnicosList );

router.post('/getTecnicoById',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], getTecnicoById );

router.post('/insertUpdateTecnico',[
    check('idUser','El usuario ligado es obligatorio').not().isEmpty(),
    check('nombre','El nombre es obligatorio').not().isEmpty(),
    validarCampos

], insertUpdateTecnico );

router.post('/setActiveTecnico',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('active','El estatus es obligatorio').isBoolean(),
    validarCampos

], setActiveTecnico );

router.post('/deleteTecnico',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], deleteTecnico );

module.exports = router;
