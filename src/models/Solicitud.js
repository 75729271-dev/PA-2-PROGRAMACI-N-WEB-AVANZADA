const mongoose = require('mongoose');

const TIPOS = [
    'Constancia de estudios',
    'Rectificación de nota',
    'Retiro de curso',
    'Reserva de matrícula',
    'Convalidación',
    'Otro'
];

const ESTADOS = ['Pendiente', 'En revisión', 'Aprobada', 'Rechazada'];

const solicitudSchema = new mongoose.Schema(
    {
        estudiante: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            required: true
        },
        tipo: {
            type: String,
            required: [true, 'El tipo de solicitud es obligatorio'],
            enum: { values: TIPOS, message: 'Tipo de solicitud no válido: {VALUE}' }
        },
        asunto: {
            type: String,
            required: [true, 'El asunto es obligatorio'],
            trim: true,
            maxlength: [120, 'El asunto no puede superar los 120 caracteres']
        },
        descripcion: {
            type: String,
            required: [true, 'La descripción es obligatoria'],
            trim: true,
            minlength: [10, 'La descripción debe tener al menos 10 caracteres']
        },
        estado: {
            type: String,
            enum: { values: ESTADOS, message: 'Estado no válido: {VALUE}' },
            default: 'Pendiente'
        },
        respuesta: {
            type: String,
            trim: true,
            default: ''
        },
        atendidaPor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Usuario',
            default: null
        }
    },
    { timestamps: true, versionKey: false }
);

const Solicitud = mongoose.model('Solicitud', solicitudSchema, 'solicitudes');

module.exports = Solicitud;
module.exports.TIPOS = TIPOS;
module.exports.ESTADOS = ESTADOS;
