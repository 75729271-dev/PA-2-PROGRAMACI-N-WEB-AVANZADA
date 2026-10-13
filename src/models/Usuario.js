const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ROLES = ['estudiante', 'administrativo'];

const usuarioSchema = new mongoose.Schema(
    {
        nombre: {
            type: String,
            required: [true, 'El nombre es obligatorio'],
            trim: true,
            minlength: [3, 'El nombre debe tener al menos 3 caracteres']
        },
        email: {
            type: String,
            required: [true, 'El email es obligatorio'],
            unique: true,
            lowercase: true,
            trim: true,
            match: [/^\S+@\S+\.\S+$/, 'El email no tiene un formato válido']
        },
        password: {
            type: String,
            required: [true, 'La contraseña es obligatoria'],
            minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
            select: false // nunca se devuelve en las consultas por defecto
        },
        rol: {
            type: String,
            enum: { values: ROLES, message: 'Rol no permitido: {VALUE}' },
            default: 'estudiante'
        },
        activo: {
            type: Boolean,
            default: true
        }
    },
    { timestamps: true, versionKey: false }
);

// Antes de guardar, se cifra la contraseña con bcrypt (solo si cambió)
usuarioSchema.pre('save', async function () {
    if (!this.isModified('password')) return;
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Compara la contraseña escrita con el hash guardado
usuarioSchema.methods.compararPassword = function (passwordPlano) {
    return bcrypt.compare(passwordPlano, this.password);
};

// Al convertir a JSON se elimina el hash por seguridad
usuarioSchema.set('toJSON', {
    transform: (doc, ret) => {
        delete ret.password;
        return ret;
    }
});

const Usuario = mongoose.model('Usuario', usuarioSchema);

module.exports = Usuario;
module.exports.ROLES = ROLES;
