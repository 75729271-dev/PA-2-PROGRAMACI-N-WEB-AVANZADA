const mongoose = require('mongoose');

/**
 * Conecta la aplicación con MongoDB usando Mongoose.
 * La URI se lee desde la variable de entorno MONGO_URI (archivo .env),
 * así no se publica ninguna credencial en el repositorio.
 */
async function conectarDB(uri = process.env.MONGO_URI) {
    if (!uri) {
        throw new Error('Falta la variable de entorno MONGO_URI');
    }

    await mongoose.connect(uri);
    console.log(`MongoDB conectado: ${mongoose.connection.host}/${mongoose.connection.name}`);
}

async function desconectarDB() {
    await mongoose.disconnect();
}

module.exports = { conectarDB, desconectarDB };
