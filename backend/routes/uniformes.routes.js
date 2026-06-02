const express            = require('express');
const router             = express.Router();
const ctrl               = require('../controllers/uniformes.controller');
const { authMiddleware } = require('../middleware/auth');
const { financialLimiter } = require('../middleware/rateLimit');

// ── GETs son públicos (consultas) ─────────────────────────────
// IMPORTANTE: rutas con sub-paths ANTES de /:id para evitar conflictos de Express.

// GET  /api/uniformes                   → Listar todos (?id_alumno=&estatus=)
router.get('/', ctrl.getAll);

// GET  /api/uniformes/alumno/:id_alumno → Uniformes de un alumno específico
router.get('/alumno/:id_alumno', ctrl.getByAlumno);

// GET  /api/uniformes/:id               → Detalle + historial de abonos
router.get('/:id', ctrl.getById);

// ── POSTs y PATCHs requieren JWT + rate limit financiero ──────

// POST  /api/uniformes                  → Crear cargo de uniforme [JWT]
router.post('/', authMiddleware, ctrl.create);

// POST  /api/uniformes/:id/abonos       → Abonar parcialmente [JWT + Rate Limit]
router.post('/:id/abonos', authMiddleware, financialLimiter, ctrl.registrarAbono);

// PATCH /api/uniformes/:id/entregar     → Marcar como entregado [JWT]
router.patch('/:id/entregar', authMiddleware, ctrl.marcarEntregado);

module.exports = router;
