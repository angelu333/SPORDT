const express = require('express');
const router = express.Router();
const torneosController = require('../controllers/torneos.controller');

// Rutas de Torneos y Temporadas
router.get('/', torneosController.getAll);
router.get('/:id', torneosController.getById);
router.post('/', torneosController.create);
router.put('/:id', torneosController.update);
router.delete('/:id', torneosController.deleteTournament);

module.exports = router;
