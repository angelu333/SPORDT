const express = require('express');
const router = express.Router();
const tutoresController = require('../controllers/tutores.controller');

// GET    /api/tutores         → Listar todos los tutores activos
router.get('/', tutoresController.getAll);

// GET    /api/tutores/:id     → Obtener un tutor por ID
router.get('/:id', tutoresController.getById);

// POST   /api/tutores         → Crear un nuevo tutor
router.post('/', tutoresController.create);

// PUT    /api/tutores/:id     → Actualizar un tutor existente
router.put('/:id', tutoresController.update);

// DELETE /api/tutores/:id     → Desactivar un tutor (soft delete)
router.delete('/:id', tutoresController.remove);

module.exports = router;
