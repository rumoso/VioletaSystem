const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const {
    saveFaceReference
    , getFaceReference
    , getFaceReferences
    , logFaceVerification
    , getFaceVerificationLogTrack
    , getCameraPreference
    , saveCameraPreference

   } = require('../controllers/faceRecognitionController');


const router = Router();

router.post('/saveFaceReference', [

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').not().isEmpty(),
  check('descriptor','descriptor obligatorío').not().isEmpty(),

  validarCampos
], saveFaceReference);

router.post('/getFaceReference', [

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').not().isEmpty(),

  validarCampos
], getFaceReference);

router.post('/getFaceReferences', getFaceReferences);

router.post('/logFaceVerification', [

  check('modo','modo obligatorío').not().isEmpty(),
  check('resultado','resultado obligatorío').not().isEmpty(),

  validarCampos
], logFaceVerification);

router.post('/getFaceVerificationLogTrack', getFaceVerificationLogTrack);

router.post('/getCameraPreference', [

  check('idUser','idUser obligatorío').not().isEmpty(),

  validarCampos
], getCameraPreference);

router.post('/saveCameraPreference', [

  check('idUser','idUser obligatorío').not().isEmpty(),
  check('deviceId','deviceId obligatorío').not().isEmpty(),

  validarCampos
], saveCameraPreference);

module.exports = router;
