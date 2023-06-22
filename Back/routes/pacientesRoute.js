const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
    getPacientesListWithPage
    , getClientByID
    , insertPaciente
    , updatePaciente
    , deletePaciente
   } = require('../controllers/pacientesController');

   
const router = Router();

router.post('/getPacientesListWithPage', getPacientesListWithPage);

router.post('/getClientByID', [
  check('idPaciente','Id obligatorio').not().isEmpty(),
  check('idPaciente','Id debe ser numérico').isNumeric(),
  validarCampos
], getClientByID);

router.post('/insertPaciente', [
  check('name','Nombre obligatorio').not().isEmpty(),
  check('fechaNacimiento','fecha de nacimiento obligatoria').not().isEmpty(),

  validarCampos
], insertPaciente);

router.post('/updatePaciente', [
  check('idPaciente','Id obligatorio').not().isEmpty(),
  check('idPaciente','Id debe ser numérico').isNumeric(),

  check('name','Nombre obligatorio').not().isEmpty(),

  validarCampos
], updatePaciente);

router.post('/deletePaciente', [
  check('idPaciente','Id obligatorio').not().isEmpty(),
  check('idPaciente','Id debe ser numérico').isNumeric(),
  validarCampos
], deletePaciente);

module.exports = router;