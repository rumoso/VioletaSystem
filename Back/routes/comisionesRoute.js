const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const {

  generarComision
  , generarAllComisiones
  , getComisionesListWithPage
  , getComisionDetail
  , getComisionesPagosDetailListWithPage
  , disabledComision
  , disabledComisionDetail
  , changeStatusComision

} = require('../controllers/comisionesController');

   
const router = Router();

router.post('/generarComision', [

  check('startDate','Fecha inicio obligatoria').not().isEmpty(),
  check('endDate','Fecha Fin obligatoria').not().isEmpty(),

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El numero del Vendedor debe ser numérico').isNumeric(),

  validarCampos
], generarComision);

router.post('/generarAllComisiones', [

  check('startDate','Fecha inicio obligatoria').not().isEmpty(),
  check('endDate','Fecha Fin obligatoria').not().isEmpty(),

  check('idSeller_idUser','Vendedor obligatorio').not().isEmpty(),
  check('idSeller_idUser','El numero del Vendedor debe ser numérico').isNumeric(),

  validarCampos
], generarAllComisiones);


router.post('/getComisionesListWithPage', getComisionesListWithPage);

router.post('/getComisionDetail', [

  check('idComision','Id obligatorio').not().isEmpty(),

  validarCampos
], getComisionDetail);

router.post('/getComisionesPagosDetailListWithPage', [

  check('idComision','Id obligatorio').not().isEmpty(),

  validarCampos
], getComisionesPagosDetailListWithPage);

router.post('/disabledComision', [

  check('idComision','Id obligatorio').not().isEmpty(),

  validarCampos
], disabledComision);

router.post('/disabledComisionDetail', [

  check('idComisionDetail','Id obligatorio').not().isEmpty(),

  validarCampos
], disabledComisionDetail);

router.post('/changeStatusComision', [

  check('idComision','Id obligatorio').not().isEmpty(),

  check('idStatus','Estatus obligatorio').not().isEmpty(),
  check('idStatus','El estatus debe ser numérico').isNumeric(),

  validarCampos
], changeStatusComision);



module.exports = router;