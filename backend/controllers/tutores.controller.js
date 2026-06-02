/**
 * ============================================================
 * SporDT — Controlador de Tutores
 * ============================================================
 * Solo maneja la lógica HTTP (req/res).
 * Toda la lógica de base de datos está en tutor.service.js
 * ============================================================
 */

const tutorService = require('../services/tutor.service');

// GET /api/tutores?page=1&limit=50
const getAll = async (req, res, next) => {
    try {
        const { page, limit } = req.query;
        const resultado = await tutorService.findAll({ page, limit });
        res.json(resultado);
    } catch (err) {
        next(err);
    }
};

// GET /api/tutores/:id
const getById = async (req, res, next) => {
    try {
        const tutor = await tutorService.findById(req.params.id);
        if (!tutor) return res.status(404).json({ message: 'Tutor no encontrado' });
        res.json(tutor);
    } catch (err) {
        next(err);
    }
};

// POST /api/tutores
const create = async (req, res, next) => {
    try {
        const tutor = await tutorService.create(req.body);
        res.status(201).json(tutor);
    } catch (err) {
        next(err);
    }
};

// PUT /api/tutores/:id
const update = async (req, res, next) => {
    try {
        const tutor = await tutorService.update(req.params.id, req.body);
        if (!tutor) return res.status(404).json({ message: 'Tutor no encontrado' });
        res.json(tutor);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/tutores/:id  (soft-delete)
const remove = async (req, res, next) => {
    try {
        const eliminado = await tutorService.softDelete(req.params.id);
        if (!eliminado) return res.status(404).json({ message: 'Tutor no encontrado' });
        res.json({ message: 'Tutor desactivado correctamente' });
    } catch (err) {
        next(err);
    }
};

module.exports = { getAll, getById, create, update, remove };
