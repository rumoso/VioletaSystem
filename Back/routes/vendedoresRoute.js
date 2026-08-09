const { Router }= require('express');
const { check } = require('express-validator');

const { validarCampos } = require('../middlewares/validar-campos');

const {
    getVendedoresList
    , getVendedorById
    , insertUpdateVendedor
    , setActiveVendedor
    , deleteVendedor
     } = require('../controllers/catalogosPersonalController');

const router = Router();

router.post('/getVendedoresList', getVendedoresList );

router.post('/getVendedorById',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], getVendedorById );

router.post('/insertUpdateVendedor',[
    check('idUser','El usuario ligado es obligatorio').not().isEmpty(),
    check('nombre','El nombre es obligatorio').not().isEmpty(),
    validarCampos

], insertUpdateVendedor );

router.post('/setActiveVendedor',[
    check('id','El id es obligatorio').not().isEmpty(),
    check('active','El estatus es obligatorio').isBoolean(),
    validarCampos

], setActiveVendedor );

router.post('/deleteVendedor',[
    check('id','El id es obligatorio').not().isEmpty(),
    validarCampos

], deleteVendedor );

module.exports = router;
