const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/usuarios.controller');
const { verificarToken, autorizarRoles } = require('../middlewares/auth');
const { validarId } = require('../middlewares/comunes');

// Gestión de usuarios: solo el rol administrativo
router.use(verificarToken, autorizarRoles('administrativo'));

router.get('/', ctrl.listar);
router.post('/', ctrl.crear);
router.get('/:id', validarId, ctrl.obtener);
router.put('/:id', validarId, ctrl.actualizar);
router.delete('/:id', validarId, ctrl.eliminar);

module.exports = router;
