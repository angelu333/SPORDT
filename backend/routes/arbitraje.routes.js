const express              = require('express');
const router               = express.Router();
const ctrl                 = require('../controllers/arbitraje.controller');
const { authMiddleware }   = require('../middleware/auth');
const { financialLimiter } = require('../middleware/rateLimit');

// ── Rutas con path fijo ANTES de /:id ────────────────────────

// GET  /api/arbitraje/jornada      → Vista del fin de semana (?fecha=YYYY-MM-DD)
router.get('/jornada', ctrl.getJornada);

// GET  /api/arbitraje/pendientes   → Todos sin pagar (alertas)
router.get('/pendientes', ctrl.getPendientes);

// ── GETs son públicos ─────────────────────────────────────────

// GET  /api/arbitraje              → Listado general (?fecha=&estatus=)
router.get('/', ctrl.getAll);

// ── POSTs requieren JWT + rate limit financiero ───────────────

// POST /api/arbitraje              → Registrar partido + 2 cargos 50/50 [JWT + Rate Limit]
router.post('/', authMiddleware, financialLimiter, ctrl.crearPartido);

// POST /api/arbitraje/:id/pagar    → Registrar pago de un equipo [JWT + Rate Limit]
router.post('/:id/pagar', authMiddleware, financialLimiter, ctrl.registrarPago);

module.exports = router;
