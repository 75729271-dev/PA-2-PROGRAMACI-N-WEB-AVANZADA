require('dotenv').config();

const app = require('./src/app');
const { conectarDB } = require('./src/config/db');

const PORT = process.env.PORT || 3000;

if (!process.env.JWT_SECRET) {
    console.error('Falta la variable de entorno JWT_SECRET. Revisa el archivo .env');
    process.exit(1);
}

// Primero se conecta a MongoDB y recién después se levanta el servidor
conectarDB()
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
        });
    })
    .catch(error => {
        console.error('No se pudo conectar a MongoDB:', error.message);
        process.exit(1);
    });
