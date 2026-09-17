const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')
const { validarSesion } = require('../middlewares/validar-sesion')

const {
    saveFaceReference
    , getFaceReference
    , deleteFaceReference
    , logFaceVerification
    , getFaceVerificationLogTrack
    , getCameraPreference
    , saveCameraPreference
    , identificarRostro
    , verificarRostro

   } = require('../controllers/faceRecognitionController');


const router = Router();

// Registrar, consultar y borrar un rostro de referencia exigen sesión
// (analisis/020): eran públicos y cualquiera podía reemplazar el rostro de
// otra persona por el suyo.
router.post('/saveFaceReference', [

  validarSesion,

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').not().isEmpty(),
  check('descriptor','descriptor obligatorío').not().isEmpty(),

  validarCampos
], saveFaceReference);

router.post('/getFaceReference', [

  validarSesion,

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').not().isEmpty(),

  validarCampos
], getFaceReference);

router.post('/deleteFaceReference', [

  validarSesion,

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').not().isEmpty(),

  validarCampos
], deleteFaceReference);

// Identificar / verificar un rostro: la comparación ocurre en el servidor
// y, si coincide, se entrega un comprobante de un solo uso. Públicas a
// propósito: el login facial y el checador se usan sin sesión.
router.post('/identificarRostro', [

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('descriptor','La captura del rostro es obligatoria').isArray({ min: 128, max: 128 }),
  check('proposito','La operación es obligatoria').not().isEmpty(),

  validarCampos
], identificarRostro);

router.post('/verificarRostro', [

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').isInt({ gt: 0 }),
  check('descriptor','La captura del rostro es obligatoria').isArray({ min: 128, max: 128 }),
  check('proposito','La operación es obligatoria').not().isEmpty(),

  validarCampos
], verificarRostro);

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
