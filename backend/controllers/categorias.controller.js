/**
 * ============================================================
 * SporDT — Controlador de Categorías
 * ============================================================
 * Solo maneja la lógica HTTP (req/res).
 * Toda la lógica de base de datos está en categoria.service.js
 * ============================================================
 */

const categoriaService = require('../services/categoria.service');

// GET /api/categorias
const getAll = async (req, res, next) => {
    try {
        const categorias = await categoriaService.findAll();
        res.json(categorias);
    } catch (err) {
        next(err);
    }
};

// GET /api/categorias/:id
const getById = async (req, res, next) => {
    try {
        const categoria = await categoriaService.findById(req.params.id);
        if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
        res.json(categoria);
    } catch (err) {
        next(err);
    }
};

// POST /api/categorias
const create = async (req, res, next) => {
    try {
        const categoria = await categoriaService.create(req.body);
        res.status(201).json(categoria);
    } catch (err) {
        next(err);
    }
};

// PUT /api/categorias/:id
const update = async (req, res, next) => {
    try {
        const categoria = await categoriaService.update(req.params.id, req.body);
        if (!categoria) return res.status(404).json({ message: 'Categoría no encontrada' });
        res.json(categoria);
    } catch (err) {
        next(err);
    }
};

// DELETE /api/categorias/:id  (soft-delete, con protección de alumnos activos)
const remove = async (req, res, next) => {
    try {
        const eliminado = await categoriaService.softDelete(req.params.id);
        if (!eliminado) return res.status(404).json({ message: 'Categoría no encontrada' });
        res.json({ message: 'Categoría desactivada correctamente' });
    } catch (err) {
        next(err);
    }
};

// POST /api/categorias/asignar  — Resuelve categoría por fecha de nacimiento
const asignarCategoria = async (req, res, next) => {
    try {
        const { fecha_nacimiento } = req.body;
        const resultado = await categoriaService.resolverPorEdad(fecha_nacimiento);
        res.json(resultado);
    } catch (err) {
        next(err);
    }
};

// Exportamos calcularEdad para compatibilidad con billing.engine.js
const { calcularEdad } = require('../services/categoria.service');

module.exports = { getAll, getById, create, update, remove, asignarCategoria, calcularEdad };
