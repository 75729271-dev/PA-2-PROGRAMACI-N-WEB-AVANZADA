/**
 * Crea un usuario administrativo inicial y datos de ejemplo.
 * Uso: npm run seed
 * Las credenciales se leen del .env (ADMIN_EMAIL, ADMIN_PASSWORD).
 */
require('dotenv').config();

const { conectarDB, desconectarDB } = require('../src/config/db');
const Usuario = require('../src/models/Usuario');
const Solicitud = require('../src/models/Solicitud');

async function seed() {
    await conectarDB();

    const email = process.env.ADMIN_EMAIL || 'admin@isil.test';
    const password = process.env.ADMIN_PASSWORD;

    if (!password) {
        throw new Error('Define ADMIN_PASSWORD en el archivo .env antes de ejecutar el seed');
    }

    let admin = await Usuario.findOne({ email });
    if (admin) {
        console.log(`El administrativo ${email} ya existe`);
    } else {
        admin = await Usuario.create({
            nombre: 'Mesa de Partes ISIL',
            email,
            password,
            rol: 'administrativo'
        });
        console.log(`Administrativo creado: ${email}`);
    }

    // Estudiante y solicitudes de ejemplo (solo si no existen)
    let estudiante = await Usuario.findOne({ email: 'estudiante.demo@isil.test' });
    if (!estudiante) {
        estudiante = await Usuario.create({
            nombre: 'Estudiante Demo',
            email: 'estudiante.demo@isil.test',
            password,
            rol: 'estudiante'
        });

        await Solicitud.insertMany([
            {
                estudiante: estudiante._id,
                tipo: 'Constancia de estudios',
                asunto: 'Constancia para prácticas',
                descripcion: 'Solicito constancia de estudios del periodo 202620 para presentar en mi centro de prácticas.'
            },
            {
                estudiante: estudiante._id,
                tipo: 'Rectificación de nota',
                asunto: 'Revisión de nota PA1',
                descripcion: 'Solicito revisión de la nota de PA1 del curso Programación Web II por error de registro.',
                estado: 'En revisión',
                atendidaPor: admin._id
            }
        ]);
        console.log('Estudiante demo y 2 solicitudes de ejemplo creados');
    }

    await desconectarDB();
}

seed().catch(async error => {
    console.error('Error en el seed:', error.message);
    await desconectarDB();
    process.exit(1);
});
