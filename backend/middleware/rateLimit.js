/**
 * ============================================================
 * SporDT — Middleware de Rate Limiting
 * middleware/rateLimit.js
 * ============================================================
 * Define 3 limitadores de tasa de requests con distinta
 * severidad según la sensibilidad de la operación:
 *
 *   generalLimiter   → Todo el API (200 req / 15 min)
 *   financialLimiter → Rutas que mueven dinero (50 req / 15 min)
 *   motorLimiter     → Motor de cobranza (10 req / hora)
 *
 * Previene:
 *   - Ataques de fuerza bruta
 *   - DoS por saturación de requests
 *   - Scraping masivo de datos financieros
 * ============================================================
 */

const rateLimit = require('express-rate-limit');

// ── Respuesta estándar cuando se supera el límite ──
const limitHandler = (windowMinutes) => ({
    handler: (req, res) => {
        res.status(429).json({
            message: `Demasiadas solicitudes desde esta IP. Intenta de nuevo en ${windowMinutes} minuto(s).`,
            retryAfter: `${windowMinutes} minuto(s)`
        });
    }
});

// ============================================================
// LIMITADOR GENERAL
// Aplica a todo el API como primera línea de defensa.
// 200 requests por IP cada 15 minutos.
// ============================================================
const generalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    standardHeaders: true,   // envía headers RateLimit-* estándar
    legacyHeaders: false,
    ...limitHandler(15)
});

// ============================================================
// LIMITADOR FINANCIERO
// Aplica a rutas que crean o modifican transacciones de dinero:
//   POST /api/uniformes
//   POST /api/uniformes/:id/abonos
//   PATCH /api/uniformes/:id/entregar
//   POST /api/arbitraje
//   POST /api/arbitraje/:id/pagar
//
// 50 operaciones financieras por IP cada 15 minutos.
// Una academia normal no procesa más de 50 pagos en 15 minutos.
// ============================================================
const financialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 50,
    standardHeaders: true,
    legacyHeaders: false,
    ...limitHandler(15)
});

// ============================================================
// LIMITADOR DEL MOTOR DE COBRANZA
// Aplica a los endpoints manuales del motor de cobranza.
// Son operaciones muy pesadas (recorren todos los alumnos).
// 10 ejecuciones por IP por hora.
// ============================================================
const motorLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    ...limitHandler(60)
});

// ============================================================
// LIMITADOR DE LOGIN (anti brute-force)
// Máximo 10 intentos de login por IP cada 15 minutos.
// Después de 10 fallos, se bloquea la IP temporalmente.
// ============================================================
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        res.status(429).json({
            message: 'Demasiados intentos de inicio de sesión. Tu IP ha sido bloqueada temporalmente por 15 minutos.',
            retryAfter: '15 minuto(s)'
        });
    }
});

module.exports = {
    generalLimiter,
    financialLimiter,
    motorLimiter,
    loginLimiter
};
