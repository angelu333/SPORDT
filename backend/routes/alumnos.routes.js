const express = require('express');
const router = express.Router();
const alumnosController = require('../controllers/alumnos.controller');

// GET    /api/alumnos         → Listar todos los alumnos
router.get('/', alumnosController.getAll);

// GET    /api/alumnos/:id     → Obtener un alumno por ID
router.get('/:id', alumnosController.getById);

// POST   /api/alumnos         → Crear un nuevo alumno
router.post('/', alumnosController.create);

// PUT    /api/alumnos/:id     → Actualizar un alumno existente
router.put('/:id', alumnosController.update);

// DELETE /api/alumnos/:id     → Dar de baja un alumno (soft delete)
router.delete('/:id', alumnosController.remove);

module.exports = router;
