const express = require('express');
const router = express.Router();
const categoriasController = require('../controllers/categorias.controller');

// ⚠️  IMPORTANTE: La ruta /asignar debe ir ANTES de /:id
// para que Express no la interprete como un ID numérico.

// POST   /api/categorias/asignar  → Calcular y devolver categoría por fecha de nacimiento
router.post('/asignar', categoriasController.asignarCategoria);

// GET    /api/categorias           → Listar todas las categorías activas (con conteo de alumnos)
router.get('/', categoriasController.getAll);

// GET    /api/categorias/:id       → Obtener una categoría por ID
router.get('/:id', categoriasController.getById);

// POST   /api/categorias           → Crear una nueva categoría
router.post('/', categoriasController.create);

// PUT    /api/categorias/:id       → Actualizar una categoría existente
router.put('/:id', categoriasController.update);

// DELETE /api/categorias/:id       → Desactivar categoría (soft-delete)
router.delete('/:id', categoriasController.remove);

module.exports = router;
