const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getElectronicMoneyListWithPage
    , insertElectronicMoney
    , deleteElectronicMoney
    , getRepElectronicMoneyListWithPage
   } = require('../controllers/electronicMoneyController');

   
const router = Router();

router.post('/getElectronicMoneyListWithPage', [

  check('idCustomer','Cliente obligatorío').not().isEmpty(),
  
  check('idCustomer','El cliente debe ser numérico').isNumeric(),

  validarCampos
], getElectronicMoneyListWithPage);

router.post('/insertElectronicMoney', [

  check('idCustomer','Cliente obligatorío').not().isEmpty(),
  check('idCustomer','El cliente debe ser numérico').isNumeric(),

  check('amount','Monto obligatorío').not().isEmpty(),
  check('amount','El monto debe ser numérico').isNumeric(),

  validarCampos
], insertElectronicMoney);

router.post('/deleteElectronicMoney', [

  check('keyx','id obligatorío').not().isEmpty(),
  check('keyx','El id debe ser numérico').isNumeric(),

  validarCampos
], deleteElectronicMoney);

router.post('/getRepElectronicMoneyListWithPage', getRepElectronicMoneyListWithPage);

module.exports = router;