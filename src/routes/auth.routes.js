const express = require('express');
const router = express.Router();
const auth = require('../controllers/auth.controller');
const { verificarToken } = require('../middlewares/auth');

// Rutas públicas
router.post('/registro', auth.registrar);
router.post('/login', auth.login);

// Ruta protegida: devuelve el usuario dueño del token
router.get('/perfil', verificarToken, auth.perfil);

module.exports = router;
