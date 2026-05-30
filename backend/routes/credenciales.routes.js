const express = require('express');
const router = express.Router();
const credencialesController = require('../controllers/credenciales.controller');

// Rutas de Credenciales
router.get('/', credencialesController.getAll);
router.get('/filtrar', credencialesController.getByEquipoYTorneo);
router.post('/', credencialesController.create);
router.put('/:id/revocar', credencialesController.revoke);

module.exports = router;
