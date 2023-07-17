const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getCustomersListWithPage
    , getCustomerByID
    , insertCustomer
    , updateCustomer
    , deleteCustomer
    , cbxGetCustomersCombo
   } = require('../controllers/customersController');

   
const router = Router();

router.post('/getCustomersListWithPage', getCustomersListWithPage);

router.post('/getCustomerByID', [
  check('idCustomer','Id obligatorio').not().isEmpty(),
  check('idCustomer','Id debe ser numérico').isNumeric(),
  validarCampos
], getCustomerByID);

router.post('/insertCustomer', [

  check('idUser','idUser obligatorio').not().isEmpty(),
  check('idUser','idUser debe ser numérico').isNumeric(),

  check('name','Código de barra obligatorio').not().isEmpty(),

  check('lastName','Nombre obligatorio').not().isEmpty(),

  validarCampos
], insertCustomer);

router.post('/updateCustomer', [

  check('idCustomer','idUser obligatorio').not().isEmpty(),
  check('idCustomer','idUser debe ser numérico').isNumeric(),

  check('idUser','idUser obligatorio').not().isEmpty(),
  check('idUser','idUser debe ser numérico').isNumeric(),

  check('name','Código de barra obligatorio').not().isEmpty(),

  check('lastName','Nombre obligatorio').not().isEmpty(),

  validarCampos
], updateCustomer);

router.post('/deleteCustomer', [
  check('idCustomer','Id obligatorio').not().isEmpty(),
  check('idCustomer','Id debe ser numérico').isNumeric(),
  validarCampos
], deleteCustomer);

router.post('/cbxGetCustomersCombo', [
  check('idUser','Id del usuario obligatorio').not().isEmpty(),
  check('idUser','Id del usuario debe ser numérico').isNumeric(),

  validarCampos
], cbxGetCustomersCombo);

module.exports = router;