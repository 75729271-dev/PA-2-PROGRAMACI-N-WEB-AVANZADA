const Usuario = require('../models/Usuario');
const Solicitud = require('../models/Solicitud');

// Todas estas acciones están protegidas para el rol "administrativo"

// GET /api/usuarios   (?rol=estudiante)
async function listar(req, res) {
    const filtro = req.query.rol ? { rol: String(req.query.rol) } : {};
    const usuarios = await Usuario.find(filtro).sort({ createdAt: -1 });
    res.json({ total: usuarios.length, usuarios });
}

// GET /api/usuarios/:id
async function obtener(req, res) {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }
    res.json(usuario);
}

// POST /api/usuarios  (permite crear otro administrativo)
async function crear(req, res) {
    const { nombre, email, password, rol } = req.body;
    const usuario = await Usuario.create({ nombre, email, password, rol });
    res.status(201).json({ mensaje: 'Usuario creado correctamente', usuario });
}

// PUT /api/usuarios/:id  (nombre, rol, activo)
async function actualizar(req, res) {
    const usuario = await Usuario.findById(req.params.id);
    if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const { nombre, rol, activo } = req.body;
    if (nombre !== undefined) usuario.nombre = nombre;
    if (rol !== undefined) usuario.rol = rol;
    if (activo !== undefined) usuario.activo = Boolean(activo);

    await usuario.save();
    res.json({ mensaje: 'Usuario actualizado correctamente', usuario });
}

// DELETE /api/usuarios/:id  (elimina también sus solicitudes)
async function eliminar(req, res) {
    if (req.usuario._id.equals(req.params.id)) {
        return res.status(400).json({ mensaje: 'No puedes eliminar tu propia cuenta' });
    }

    const usuario = await Usuario.findByIdAndDelete(req.params.id);
    if (!usuario) {
        return res.status(404).json({ mensaje: 'Usuario no encontrado' });
    }

    const { deletedCount } = await Solicitud.deleteMany({ estudiante: usuario._id });

    res.json({
        mensaje: 'Usuario eliminado correctamente',
        solicitudesEliminadas: deletedCount,
        usuario
    });
}

module.exports = { listar, obtener, crear, actualizar, eliminar };
