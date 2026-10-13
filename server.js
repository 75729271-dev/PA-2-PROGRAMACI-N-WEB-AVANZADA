
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const solicitudesRoutes = require('./routes/solicitudes');
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Rutas del CRUD
app.use('/api/solicitudes', solicitudesRoutes);

// Ruta principal
app.get('/', (req, res) => {
    res.json({
        mensaje: 'API de Solicitudes Académicas funcionando correctamente'
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
