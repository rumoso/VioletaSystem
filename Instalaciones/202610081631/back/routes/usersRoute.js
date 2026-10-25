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
  , checkUserNameDisponible
  , cbxGetSellersCombo
  , cbxGetTecnicosCombo
  , updateAuthorizationCode
  , cbxGetAllUsersCombo
  , getUserPreferences
  , insertUpdateUserPreferences
   } = require('../controllers/usersController');

   
const router = Router();

router.post('/getUsersListWithPage', getUsersListWithPage);

router.post('/getUserByID', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),
  validarCampos
], getUserByID);

// userName ya no es obligatorio aquí: solo lo es con acceso al sistema,
// y eso lo valida el SP (analisis/018).
router.post('/insertUser', [
  check('nombre','Nombre obligatorio').not().isEmpty(),

  validarCampos
], insertUser);

router.post('/checkUserNameDisponible', checkUserNameDisponible);

router.post('/updateUser', [
  check('nombre','Nombre obligatorio').not().isEmpty(),

  validarCampos
], updateUser);

router.post('/changePassword', [
  check('idUser','Id obligatorio').not().isEmpty(),
  check('idUser','Id debe ser numérico').isNumeric(),

  check('pwd','Contraseña obligatoria').not().isEmpty(),

  check('pwd2','Confirmación de contraseña obligatoria').not().isEmpty(),

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

router.post('/cbxGetTecnicosCombo', [

  validarCampos
], cbxGetTecnicosCombo);

router.post('/updateAuthorizationCode', [
  check('authorizationCode','Id obligatorio').not().isEmpty(),
  validarCampos
], updateAuthorizationCode);

router.post('/cbxGetAllUsersCombo', [
  validarCampos
], cbxGetAllUsersCombo);

router.post('/getUserPreferences', [
  check('idUser','El usuario es obligatorio').not().isEmpty(),
  check('scope','El scope es obligatorio').not().isEmpty(),
  validarCampos
], getUserPreferences);

router.post('/insertUpdateUserPreferences', [
  check('idUser','El usuario es obligatorio').not().isEmpty(),
  check('scope','El scope es obligatorio').not().isEmpty(),
  check('prefKey','La clave es obligatoria').not().isEmpty(),
  check('prefValue','El valor es obligatorio').not().isEmpty(),
  validarCampos
], insertUpdateUserPreferences);

module.exports = router;