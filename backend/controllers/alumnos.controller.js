/**
 * ============================================================
 * SporDT — Controlador de Alumnos
 * ============================================================
 * Solo maneja la lógica HTTP (req/res).
 * Toda la lógica de base de datos está en alumno.service.js
 * Los errores de BD se propagan con next(err) al errorHandler.
 * ============================================================
 */

const alumnoService = require('../services/alumno.service');
const { generarCargoInscripcion } = require('../billing.engine');

// GET /api/alumnos?page=1&limit=50
const getAll = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const resultado = await alumnoService.findAll({ page, limit });
        res.json(resultado);
    } catch (err) {
        next(err);
    }
};

// GET /api/alumnos/:id
const getById = async (req, res, next) => {
    try {
        const alumno = await alumnoService.findById(req.params.id);
        if (!alumno) return res.status(404).json({ message: 'Alumno no encontrado' });
        res.json(alumno);
    } catch (err) {
        next(err);
    }
};

// POST /api/alumnos
const create = async (req, res, next) => {
    try {
        const { insertId, alumno } = await alumnoService.create(req.body);
        res.status(201).json(alumno);
        // Disparar cargo de inscripción de forma asíncrona (no bloquea la respuesta)
        generarCargoInscripcion(insertId);
    } catch (err) {
        next(err);
    }
};

// PUT /api/alumnos/:id
const update = async (req, res, next) => {
    try {
        const alumno = await alumnoService.update(req.params.id, req.body);
        if (!alumno) return res.status(404).json({ message: 'Alumno no encontrado' });
        res.json(alumno);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/alumnos/:id  (soft-delete)
const remove = async (req, res, next) => {
    try {
        const eliminado = await alumnoService.softDelete(req.params.id);
        if (!eliminado) return res.status(404).json({ message: 'Alumno no encontrado' });
        res.json({ message: 'Alumno dado de baja correctamente' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update, remove };
