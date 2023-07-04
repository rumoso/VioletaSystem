const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getUsersListWithPage
  , getUserByID
  , insertUser
  , updateUser
  , changePassword
  , deleteUser
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

router.post('/deleteUser', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  validarCampos
], deleteUser);

// router.post('/deletePaciente', [
//   check('idPaciente','Id obligatorio').not().isEmpty(),
//   check('idPaciente','Id debe ser numérico').isNumeric(),
//   validarCampos
// ], deletePaciente);

module.exports = router;