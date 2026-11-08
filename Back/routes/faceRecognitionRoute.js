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
    , pedirReto
    , getFaceEvidencia

   } = require('../controllers/faceRecognitionController');


const router = Router();

// Registrar, consultar y borrar un rostro de referencia exigen sesión
// (analisis/020): eran públicos y cualquiera podía reemplazar el rostro de
// otra persona por el suyo.
router.post('/saveFaceReference', [

  validarSesion,

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').not().isEmpty(),
  check('idReto','El reto de la captura es obligatorio').not().isEmpty(),
  check('frames','La captura del rostro es obligatoria').isArray({ min: 8, max: 200 }),

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
//
// Prueba de vida (analisis/037): ya no reciben un descriptor suelto, sino
// la secuencia de la captura (`frames`) y el reto que se pidió antes con
// pedirReto.
router.post('/pedirReto', [

  check('proposito','La operación es obligatoria').isIn(['LOGIN', 'TIMECARD', 'AUTORIZACION', 'ENROLAR']),

  validarCampos
], pedirReto);

router.post('/identificarRostro', [

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idReto','El reto de la captura es obligatorio').not().isEmpty(),
  check('frames','La captura del rostro es obligatoria').isArray({ min: 8, max: 200 }),
  check('proposito','La operación es obligatoria').not().isEmpty(),

  validarCampos
], identificarRostro);

router.post('/verificarRostro', [

  check('tipoPersona','tipoPersona obligatorío').not().isEmpty(),
  check('idPersona','idPersona obligatorío').isInt({ gt: 0 }),
  check('idReto','El reto de la captura es obligatorio').not().isEmpty(),
  check('frames','La captura del rostro es obligatoria').isArray({ min: 8, max: 200 }),
  check('proposito','La operación es obligatoria').not().isEmpty(),

  validarCampos
], verificarRostro);

router.post('/logFaceVerification', [

  check('modo','modo obligatorío').not().isEmpty(),
  check('resultado','resultado obligatorío').not().isEmpty(),

  validarCampos
], logFaceVerification);

// Bitácora Facial (analisis/039): sesión + menú `facialLog` (revisado en el
// controller). La evidencia son fotos de personas.
router.post('/getFaceVerificationLogTrack', [
  validarSesion
], getFaceVerificationLogTrack);

router.post('/getFaceEvidencia', [
  validarSesion,

  check('idFaceVerificationLog','Id obligatorio').isInt({ gt: 0 }),

  validarCampos
], getFaceEvidencia);

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
