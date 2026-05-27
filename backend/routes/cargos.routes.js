const express = require('express');
const router = express.Router();
const cargosController = require('../controllers/cargos.controller');

// GET    /api/cargos           → Listar cargos (filtros: ?estatus=Pendiente&tipo=Alumno)
router.get('/', cargosController.getAll);

// GET    /api/cargos/:id       → Obtener un cargo con su historial de abonos
router.get('/:id', cargosController.getById);

// POST   /api/cargos           → Crear un cargo manualmente
router.post('/', cargosController.create);

module.exports = router;
