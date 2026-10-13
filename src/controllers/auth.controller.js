const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

function generarToken(usuario) {
    return jwt.sign(
        { id: usuario._id, rol: usuario.rol },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '2h' }
    );
}

// POST /api/auth/registro
// Todo registro público crea un usuario con rol "estudiante".
// El rol "administrativo" solo lo asigna otro administrativo (o el script seed).
async function registrar(req, res) {
    const { nombre, email, password } = req.body;

    const usuario = await Usuario.create({ nombre, email, password, rol: 'estudiante' });
    const token = generarToken(usuario);

    res.status(201).json({
        mensaje: 'Usuario registrado correctamente',
        usuario,
        token
    });
}

// POST /api/auth/login
async function login(req, res) {
    const { email, password } = req.body;

    // Se exige texto plano para evitar inyecciones tipo { "$gt": "" }
    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
        return res.status(400).json({ mensaje: 'Email y contraseña son obligatorios' });
    }

    // select('+password') porque en el modelo está oculto por defecto
    const usuario = await Usuario.findOne({ email: email.toLowerCase().trim() }).select('+password');

    if (!usuario || !(await usuario.compararPassword(password))) {
        return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
    }

    if (!usuario.activo) {
        return res.status(403).json({ mensaje: 'La cuenta está desactivada' });
    }

    res.json({
        mensaje: 'Inicio de sesión correcto',
        usuario,
        token: generarToken(usuario)
    });
}

// GET /api/auth/perfil  (ruta protegida)
async function perfil(req, res) {
    res.json(req.usuario);
}

module.exports = { registrar, login, perfil };
