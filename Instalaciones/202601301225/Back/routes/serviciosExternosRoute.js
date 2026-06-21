const { Router } = require('express');
const { check } = require('express-validator')

const { validarCampos } = require('../middlewares/validar-campos')

const {
    getServiciosExternosListWithPage,
    getServicioExternoByID,
    insertUpdateServicioExterno,
    deleteServicioExterno,
    cbxGetServiciosExternos
} = require('../controllers/serviciosExternosController');

const router = Router();

// Obtener lista de servicios externos con paginación
router.post('/getServiciosExternosListWithPage', [
    check('search', 'Búsqueda es requerida').optional(),
    validarCampos
], getServiciosExternosListWithPage);

// Obtener servicio externo por ID
router.post('/getServicioExternoByID', [
    check('idServicioExterno', 'ID de servicio externo obligatorio').not().isEmpty(),
    check('idServicioExterno', 'ID debe ser numérico').isNumeric(),
    validarCampos
], getServicioExternoByID);

// Insertar o actualizar servicio externo
router.post('/insertUpdateServicioExterno', [
    check('name', 'Nombre del servicio externo es requerido').not().isEmpty(),
    validarCampos
], insertUpdateServicioExterno);

// Eliminar servicio externo
router.post('/deleteServicioExterno', [
    check('idServicioExterno', 'ID de servicio externo obligatorio').not().isEmpty(),
    check('idServicioExterno', 'ID debe ser numérico').isNumeric(),
    validarCampos
], deleteServicioExterno);

// Obtener combo de servicios externos
router.post('/cbxGetServiciosExternos', [
    validarCampos
], cbxGetServiciosExternos);

module.exports = router;

module.exports = router;
