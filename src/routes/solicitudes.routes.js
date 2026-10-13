const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/solicitudes.controller');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');
const { validarId } = require('../middlewares/comunes');

// Todas las rutas de solicitudes requieren estar autenticado
router.use(verificarToken);

router.get('/', ctrl.listar);
router.post('/', autorizarRoles('estudiante'), ctrl.crear);

router.get('/:id', validarId, ctrl.obtener);
router.put('/:id', validarId, autorizarRoles('estudiante'), ctrl.actualizar);
router.patch('/:id/estado', validarId, autorizarRoles('administrativo'), ctrl.cambiarEstado);
router.delete('/:id', validarId, ctrl.eliminar);

module.exports = router;
