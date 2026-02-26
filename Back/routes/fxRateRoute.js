const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getFxRateListWithPage
    , insertFxRate
    , getFxRateTypesWithLatestRates
    , saveFxRateChanges
    , createFxRateType
    , deleteFxRateType
    , updateFxRateType
    , getPriceByKilataje
   } = require('../controllers/fxRateController');

   
const router = Router();

router.post('/getFxRateListWithPage', getFxRateListWithPage);

router.get('/getFxRateTypesWithLatestRates', getFxRateTypesWithLatestRates);

router.post('/saveFxRateChanges', saveFxRateChanges);

router.post('/createFxRateType', [
  check('nombre', 'El nombre de la referencia es obligatorio').not().isEmpty(),
  validarCampos
], createFxRateType);

router.post('/insertFxRate', [

  check('referencia','Referencia obligatoría').not().isEmpty(),
  
  check('fxRate','El Tipo de cambio debe ser numérico').isNumeric(),

  validarCampos
], insertFxRate);

router.delete('/deleteFxRateType/:idFxRateType', deleteFxRateType);

router.put('/updateFxRateType/:idFxRateType', [
  check('nombre', 'El nombre de la referencia es obligatorio').not().isEmpty(),
  validarCampos
], updateFxRateType);

router.get('/getPriceByKilataje/:kilates', getPriceByKilataje);

module.exports = router;