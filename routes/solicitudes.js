
const express = require('express');
const router = express.Router();

// Datos temporales para probar el CRUD
let solicitudes = [];
let siguienteId = 1;

// GET: listar todas las solicitudes
router.get('/', (req, res) => {
    res.json(solicitudes);
});

// GET: consultar una solicitud por ID
router.get('/:id', (req, res) => {
    const solicitud = solicitudes.find(
        s => s.id === Number(req.params.id)
    );

    if (!solicitud) {
        return res.status(404).json({
            mensaje: 'Solicitud no encontrada'
        });
    }

    res.json(solicitud);
});

// POST: registrar una solicitud
router.post('/', (req, res) => {
    const { alumno, tipo, descripcion } = req.body;

    if (!alumno || !tipo || !descripcion) {
        return res.status(400).json({
            mensaje: 'Completa alumno, tipo y descripcion'
        });
    }

    const nuevaSolicitud = {
        id: siguienteId++,
        alumno,
        tipo,
        descripcion,
        estado: 'Pendiente'
    };

    solicitudes.push(nuevaSolicitud);

    res.status(201).json({
        mensaje: 'Solicitud registrada correctamente',
        solicitud: nuevaSolicitud
    });
});

// PUT: actualizar una solicitud
router.put('/:id', (req, res) => {
    const solicitud = solicitudes.find(
        s => s.id === Number(req.params.id)
    );

    if (!solicitud) {
        return res.status(404).json({
            mensaje: 'Solicitud no encontrada'
        });
    }

    const { alumno, tipo, descripcion, estado } = req.body;

    if (alumno !== undefined) solicitud.alumno = alumno;
    if (tipo !== undefined) solicitud.tipo = tipo;
    if (descripcion !== undefined) solicitud.descripcion = descripcion;
    if (estado !== undefined) solicitud.estado = estado;

    res.json({
        mensaje: 'Solicitud actualizada correctamente',
        solicitud
    });
});

// DELETE: eliminar una solicitud
router.delete('/:id', (req, res) => {
    const indice = solicitudes.findIndex(
        s => s.id === Number(req.params.id)
    );

    if (indice === -1) {
        return res.status(404).json({
            mensaje: 'Solicitud no encontrada'
        });
    }

    const eliminada = solicitudes.splice(indice, 1);

    res.json({
        mensaje: 'Solicitud eliminada correctamente',
        solicitud: eliminada[0]
    });
});

module.exports = router;
