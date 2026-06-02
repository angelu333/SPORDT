const express            = require('express');
const router             = express.Router();
const ctrl               = require('../controllers/dashboard.controller');
const { authMiddleware } = require('../middleware/auth');

// Todas las rutas del dashboard requieren JWT.
// Exponen datos financieros consolidados — nunca deben ser públicas.

// GET /api/dashboard/resumen      → Widget ejecutivo (todos los KPIs)
router.get('/resumen',      authMiddleware, ctrl.getResumenGeneral);

// GET /api/dashboard/alertas      → Lista priorizada de alertas
router.get('/alertas',      authMiddleware, ctrl.getAlertas);

// GET /api/dashboard/caja/hoy    → Resumen financiero del día
router.get('/caja/hoy',     authMiddleware, ctrl.getCajaHoy);

// GET /api/dashboard/caja/semana → Resumen financiero de los últimos 7 días
router.get('/caja/semana',  authMiddleware, ctrl.getCajaSemana);

// GET /api/dashboard/morosos     → Alumnos con deudas vencidas
router.get('/morosos',      authMiddleware, ctrl.getMorosos);

module.exports = router;
