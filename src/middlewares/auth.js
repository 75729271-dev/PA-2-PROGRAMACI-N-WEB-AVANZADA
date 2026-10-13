const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');

/**
 * Protección de rutas: exige un JWT válido en la cabecera
 * Authorization: Bearer <token>
 * Si es válido, deja el usuario autenticado en req.usuario.
 */
async function verificarToken(req, res, next) {
    const cabecera = req.headers.authorization || '';
    const [tipo, token] = cabecera.split(' ');

    if (tipo !== 'Bearer' || !token) {
        return res.status(401).json({ mensaje: 'Token no proporcionado' });
    }

    try {
        const payload = jwt.verify(token, process.env.JWT_SECRET);
        const usuario = await Usuario.findById(payload.id);

        if (!usuario || !usuario.activo) {
            return res.status(401).json({ mensaje: 'Usuario no válido o inactivo' });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        return res.status(401).json({ mensaje: 'Token inválido o expirado' });
    }
}

/**
 * Autorización basada en roles.
 * Uso: autorizarRoles('administrativo')
 */
function autorizarRoles(...rolesPermitidos) {
    return (req, res, next) => {
        if (!req.usuario || !rolesPermitidos.includes(req.usuario.rol)) {
            return res.status(403).json({
                mensaje: 'No tienes permisos para realizar esta acción'
            });
        }
        next();
    };
}

module.exports = { verificarToken, autorizarRoles };
