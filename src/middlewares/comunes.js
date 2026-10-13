const mongoose = require('mongoose');

/**
 * Logger: registra método, ruta, código de estado y tiempo de respuesta.
 */
function logger(req, res, next) {
    const inicio = Date.now();
    res.on('finish', () => {
        if (process.env.NODE_ENV === 'test') return;
        const ms = Date.now() - inicio;
        console.log(`${new Date().toISOString()} ${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });
    next();
}

/**
 * Valida que el parámetro :id sea un ObjectId de MongoDB antes de consultar.
 */
function validarId(req, res, next) {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
        return res.status(400).json({ mensaje: 'El id enviado no es válido' });
    }
    next();
}

/**
 * Respuesta para rutas que no existen.
 */
function rutaNoEncontrada(req, res) {
    res.status(404).json({ mensaje: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
}

/**
 * Manejador central de errores. Traduce los errores de Mongoose
 * y de Express a respuestas HTTP claras.
 */
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
    // Errores de validación del esquema Mongoose
    if (err.name === 'ValidationError') {
        const errores = Object.values(err.errors).map(e => e.message);
        return res.status(400).json({ mensaje: 'Datos inválidos', errores });
    }

    // Clave duplicada (ej. email ya registrado)
    if (err.code === 11000) {
        const campo = Object.keys(err.keyValue || {})[0] || 'campo';
        return res.status(409).json({ mensaje: `El ${campo} ya está registrado` });
    }

    // Id con formato incorrecto
    if (err.name === 'CastError') {
        return res.status(400).json({ mensaje: `Valor inválido para ${err.path}` });
    }

    // JSON mal formado en el body
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ mensaje: 'El cuerpo de la solicitud no es un JSON válido' });
    }

    // Origen bloqueado por CORS
    if (err.message === 'Origen no permitido por CORS') {
        return res.status(403).json({ mensaje: err.message });
    }

    console.error(err);
    res.status(err.status || 500).json({ mensaje: 'Error interno del servidor' });
}

module.exports = { logger, validarId, rutaNoEncontrada, manejadorErrores };
