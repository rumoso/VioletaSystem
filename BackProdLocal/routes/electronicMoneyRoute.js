const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  getElectronicMoneyListWithPage
    , insertElectronicMoney
    , deleteElectronicMoney
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

  check('idElectronicMoney','id obligatorío').not().isEmpty(),
  check('idElectronicMoney','El id debe ser numérico').isNumeric(),

  validarCampos
], deleteElectronicMoney);

module.exports = router;