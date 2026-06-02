const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const tutoresController = require('../controllers/tutores.controller');
const { validate } = require('../middlewares/errorHandler');

// ── Reglas de validación reutilizables ────────────────────────
const tutorRules = [
    body('nombre_completo')
        .notEmpty().withMessage('El nombre completo es obligatorio')
        .isLength({ max: 150 }).withMessage('El nombre no puede exceder 150 caracteres')
        .trim(),
    body('telefono')
        .notEmpty().withMessage('El teléfono es obligatorio')
        .isLength({ max: 20 }).withMessage('El teléfono no puede exceder 20 caracteres')
        .trim(),
    body('email')
        .optional({ nullable: true })
        .isEmail().withMessage('El email no tiene un formato válido')
        .normalizeEmail(),
    body('direccion')
        .optional({ nullable: true })
        .isLength({ max: 255 }).withMessage('La dirección no puede exceder 255 caracteres')
        .trim()
];

// ── Rutas ─────────────────────────────────────────────────────

// GET    /api/tutores?page=1&limit=50  → Listar con paginación
router.get('/', tutoresController.getAll);

// GET    /api/tutores/:id              → Obtener por ID
router.get('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    validate,
    tutoresController.getById
);

// POST   /api/tutores                  → Crear nuevo tutor
router.post('/', tutorRules, validate, tutoresController.create);

// PUT    /api/tutores/:id              → Actualizar tutor
router.put('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    ...tutorRules,
    validate,
    tutoresController.update
);

// DELETE /api/tutores/:id             → Desactivar tutor (soft delete)
router.delete('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    validate,
    tutoresController.remove
);

module.exports = router;
