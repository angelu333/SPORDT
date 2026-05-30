const express = require('express');
const router = express.Router();
const equiposController = require('../controllers/equipos.controller');

// Rutas de Equipos Externos
router.get('/', equiposController.getAll);
router.get('/:id', equiposController.getById);
router.post('/', equiposController.create);
router.put('/:id', equiposController.update);
router.delete('/:id', equiposController.deleteTeam);

// Rutas de Jugadores asociados a Equipos
router.post('/:id/jugadores', equiposController.addPlayer);
router.delete('/jugadores/:id', equiposController.removePlayer);

module.exports = router;
