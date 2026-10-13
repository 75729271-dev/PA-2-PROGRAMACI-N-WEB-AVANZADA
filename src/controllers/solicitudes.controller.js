const Solicitud = require('../models/Solicitud');

const esAdministrativo = usuario => usuario.rol === 'administrativo';
const esDueno = (solicitud, usuario) => solicitud.estudiante._id.equals(usuario._id);

// Datos del usuario que se muestran al hacer populate
const CAMPOS_USUARIO = 'nombre email rol';

// GET /api/solicitudes
// Estudiante: solo sus solicitudes. Administrativo: todas.
// Filtros opcionales: ?estado=Pendiente&tipo=Retiro de curso
async function listar(req, res) {
    const filtro = {};

    if (!esAdministrativo(req.usuario)) {
        filtro.estudiante = req.usuario._id;
    }
    if (req.query.estado) filtro.estado = String(req.query.estado);
    if (req.query.tipo) filtro.tipo = String(req.query.tipo);

    const solicitudes = await Solicitud.find(filtro)
        .populate('estudiante', CAMPOS_USUARIO)
        .populate('atendidaPor', CAMPOS_USUARIO)
        .sort({ createdAt: -1 });

    res.json({ total: solicitudes.length, solicitudes });
}

// GET /api/solicitudes/:id
async function obtener(req, res) {
    const solicitud = await Solicitud.findById(req.params.id)
        .populate('estudiante', CAMPOS_USUARIO)
        .populate('atendidaPor', CAMPOS_USUARIO);

    if (!solicitud) {
        return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }
    if (!esAdministrativo(req.usuario) && !esDueno(solicitud, req.usuario)) {
        return res.status(403).json({ mensaje: 'No puedes ver solicitudes de otros estudiantes' });
    }

    res.json(solicitud);
}

// POST /api/solicitudes  (solo estudiante)
async function crear(req, res) {
    const { tipo, asunto, descripcion } = req.body;

    // El estudiante se toma del token, no del body: nadie puede crear a nombre de otro
    const solicitud = await Solicitud.create({
        estudiante: req.usuario._id,
        tipo,
        asunto,
        descripcion
    });

    res.status(201).json({
        mensaje: 'Solicitud registrada correctamente',
        solicitud
    });
}

// PUT /api/solicitudes/:id  (estudiante dueño, solo si sigue Pendiente)
async function actualizar(req, res) {
    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
        return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }
    if (!solicitud.estudiante.equals(req.usuario._id)) {
        return res.status(403).json({ mensaje: 'Solo puedes modificar tus propias solicitudes' });
    }
    if (solicitud.estado !== 'Pendiente') {
        return res.status(409).json({
            mensaje: `No se puede modificar una solicitud en estado "${solicitud.estado}"`
        });
    }

    // Solo se permiten estos campos; el estado lo cambia el área administrativa
    const { tipo, asunto, descripcion } = req.body;
    if (tipo !== undefined) solicitud.tipo = tipo;
    if (asunto !== undefined) solicitud.asunto = asunto;
    if (descripcion !== undefined) solicitud.descripcion = descripcion;

    await solicitud.save(); // save() vuelve a ejecutar las validaciones del esquema

    res.json({
        mensaje: 'Solicitud actualizada correctamente',
        solicitud
    });
}

// PATCH /api/solicitudes/:id/estado  (solo administrativo)
async function cambiarEstado(req, res) {
    const { estado, respuesta } = req.body;

    if (!estado) {
        return res.status(400).json({ mensaje: 'El estado es obligatorio' });
    }

    const solicitud = await Solicitud.findByIdAndUpdate(
        req.params.id,
        { estado, respuesta: respuesta ?? '', atendidaPor: req.usuario._id },
        { returnDocument: 'after', runValidators: true }
    )
        .populate('estudiante', CAMPOS_USUARIO)
        .populate('atendidaPor', CAMPOS_USUARIO);

    if (!solicitud) {
        return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    res.json({
        mensaje: `Solicitud marcada como "${solicitud.estado}"`,
        solicitud
    });
}

// DELETE /api/solicitudes/:id
// Estudiante: solo las suyas y en estado Pendiente. Administrativo: cualquiera.
async function eliminar(req, res) {
    const solicitud = await Solicitud.findById(req.params.id);

    if (!solicitud) {
        return res.status(404).json({ mensaje: 'Solicitud no encontrada' });
    }

    if (!esAdministrativo(req.usuario)) {
        if (!solicitud.estudiante.equals(req.usuario._id)) {
            return res.status(403).json({ mensaje: 'Solo puedes eliminar tus propias solicitudes' });
        }
        if (solicitud.estado !== 'Pendiente') {
            return res.status(409).json({ mensaje: 'Solo se pueden eliminar solicitudes pendientes' });
        }
    }

    await solicitud.deleteOne();

    res.json({
        mensaje: 'Solicitud eliminada correctamente',
        solicitud
    });
}

module.exports = { listar, obtener, crear, actualizar, cambiarEstado, eliminar };
