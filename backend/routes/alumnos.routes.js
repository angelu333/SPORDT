const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const alumnosController = require('../controllers/alumnos.controller');
const { validate } = require('../middlewares/errorHandler');

// ── Reglas de validación reutilizables ────────────────────────
const alumnoRules = [
    body('id_tutor')
        .notEmpty().withMessage('El tutor es obligatorio')
        .isInt({ min: 1 }).withMessage('El id_tutor debe ser un número entero positivo'),
    body('nombre_completo')
        .notEmpty().withMessage('El nombre completo es obligatorio')
        .isLength({ max: 150 }).withMessage('El nombre no puede exceder 150 caracteres')
        .trim(),
    body('fecha_nacimiento')
        .notEmpty().withMessage('La fecha de nacimiento es obligatoria')
        .isDate().withMessage('La fecha de nacimiento debe tener formato YYYY-MM-DD'),
    body('genero')
        .optional({ nullable: true })
        .isIn(['M', 'F']).withMessage('El género debe ser M o F'),
    body('curp')
        .optional({ nullable: true })
        .isLength({ max: 18 }).withMessage('La CURP no puede exceder 18 caracteres')
        .toUpperCase()
];

// ── Rutas ─────────────────────────────────────────────────────

// GET    /api/alumnos?page=1&limit=50  → Listar con paginación
router.get('/', alumnosController.getAll);

// GET    /api/alumnos/:id              → Obtener por ID
router.get('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    validate,
    alumnosController.getById
);

// POST   /api/alumnos                  → Crear nuevo alumno
router.post('/', alumnoRules, validate, alumnosController.create);

// PUT    /api/alumnos/:id              → Actualizar alumno
router.put('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    ...alumnoRules,
    validate,
    alumnosController.update
);

// DELETE /api/alumnos/:id             → Dar de baja (soft delete)
router.delete('/:id',
    param('id').isInt({ min: 1 }).withMessage('El ID debe ser un número entero positivo'),
    validate,
    alumnosController.remove
);

module.exports = router;
