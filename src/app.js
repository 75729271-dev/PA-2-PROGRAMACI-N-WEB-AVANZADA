const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth.routes');
const solicitudesRoutes = require('./routes/solicitudes.routes');
const usuariosRoutes = require('./routes/usuarios.routes');
const { logger, rutaNoEncontrada, manejadorErrores } = require('./middlewares/comunes');

const app = express();

// CORS: solo los orígenes listados en CORS_ORIGIN (separados por coma) pueden
// consumir la API desde el navegador. Peticiones sin origen (Postman, curl) se permiten.
const origenesPermitidos = (process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origenesPermitidos.includes(origin)) return callback(null, true);
        callback(new Error('Origen no permitido por CORS'));
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware de aplicación
app.use(express.json({ limit: '100kb' }));
app.use(logger);

// Ruta principal
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de Solicitudes Académicas funcionando correctamente',
        endpoints: ['/api/auth', '/api/solicitudes', '/api/usuarios']
    });
});

// Rutas de la API
app.use('/api/auth', authRoutes);
app.use('/api/solicitudes', solicitudesRoutes);
app.use('/api/usuarios', usuariosRoutes);

// Middleware final: 404 y manejo centralizado de errores
app.use(rutaNoEncontrada);
app.use(manejadorErrores);

module.exports = app;
