const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const { 
  cbxGetGroupsCombo
   } = require('../controllers/groupsController');

   
const router = Router();

router.post('/cbxGetGroupsCombo', cbxGetGroupsCombo);


module.exports = router;