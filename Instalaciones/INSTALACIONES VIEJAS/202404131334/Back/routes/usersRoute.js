const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getUsersListWithPage
  , getUserByID
  , insertUser
  , updateUser
  , changePassword
  , disabledUser
  , cbxGetSellersCombo
   } = require('../controllers/usersController');

   
const router = Router();

router.post('/getUsersListWithPage', getUsersListWithPage);

router.post('/getUserByID', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  validarCampos
], getUserByID);

router.post('/insertUser', [
  check('name','Nombre obligatorio').not().isEmpty(),
  check('userName','Usuario obligatorio').not().isEmpty(),

  validarCampos
], insertUser);

router.post('/updateUser', [
  check('name','Nombre obligatorio').not().isEmpty(),
  check('userName','Usuario obligatorio').not().isEmpty(),

  check('name','Nombre obligatorio').not().isEmpty(),

  validarCampos
], updateUser);

router.post('/changePassword', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),

  check('pwd','Usuario obligatorio').not().isEmpty(),

  check('pwd2','Nombre obligatorio').not().isEmpty(),

  validarCampos
], changePassword);

router.post('/disabledUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  validarCampos
], disabledUser);

router.post('/cbxGetSellersCombo', [

  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),

  validarCampos
], cbxGetSellersCombo);

module.exports = router;