const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const categoriasController = require('../controllers/categorias.controller');
const { validate } = require('../middlewares/errorHandler');

// ── Reglas de validación reutilizables ────────────────────────
const categoriaRules = [
    body('nombre_categoria')
        .notEmpty().withMessage('El nombre de la categoría es obligatorio')
        .isLength({ max: 100 }).withMessage('El nombre no puede exceder 100 caracteres')
        .trim(),
    body('edad_minima')
        .notEmpty().withMessage('La edad mínima es obligatoria')
        .isInt({ min: 0 }).withMessage('La edad mínima debe ser un entero >= 0'),
    body('edad_maxima')
        .notEmpty().withMessage('La edad máxima es obligatoria')
        .isInt({ min: 1 }).withMessage('La edad máxima debe ser un entero >= 1')
        .custom((edadMaxima, { req }) => {
            if (Number(edadMaxima) <= Number(req.body.edad_minima)) {
                throw new Error('La edad máxima debe ser mayor que la edad mínima');
            }
            return true;
        }),
    body('descripcion')
        .optional({ nullable: true })
        .isLength({ max: 255 }).withMessage('La descripción no puede exceder 255 caracteres')
        .trim()
];

// ── Rutas ─────────────────────────────────────────────────────
// IMPORTANTE: /asignar debe ir ANTES de /:id para que Express no lo interprete como un ID.

// POST   /api/categorias/asignar    → Calcular categoría por fecha de nacimiento
router.post('/asignar',
    body('fecha_nacimiento')
        .notEmpty().withMessage('La fecha de nacimiento es obligatoria')
        .isDate().withMessage('La fecha de nacimiento debe tener formato YYYY-MM-DD'),
    validate,
    categoriasController.asignarCategoria
);

// GET    /api/categorias             → Listar todas las categorías activas
router.get('/', categoriasController.getAll);

// GET    /api/categorias/:id         → Obtener una categoría por ID
router.get('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    validate,
    categoriasController.getById
);

// POST   /api/categorias             → Crear nueva categoría
router.post('/', categoriaRules, validate, categoriasController.create);

// PUT    /api/categorias/:id         → Actualizar categoría
router.put('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    ...categoriaRules,
    validate,
    categoriasController.update
);

// DELETE /api/categorias/:id         → Desactivar categoría (soft-delete)
router.delete('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    validate,
    categoriasController.remove
);

module.exports = router;
