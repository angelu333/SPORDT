/**
 * ============================================================
 * SporDT — API Principal (index.js)
 * ============================================================
 * HARDENING DE SEGURIDAD APLICADO:
 *   ✅ Helmet          — Headers HTTP de seguridad (~15 headers)
 *   ✅ CORS restrictivo — Solo permite el origen del frontend
 *   ✅ Rate Limiting   — 3 niveles de protección por IP
 *   ✅ Body limit 5MB  — Previene ataques DoS por payload masivo
 *   ✅ JWT Auth        — Login + tokens para rutas financieras
 *   ✅ Error handler   — Captura errores sin filtrar stack traces
 * ============================================================
 */

const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
require('dotenv').config();

// Inicializar la conexión a BD (el pool se crea al importar)
require('./config/db');

// ── Seguridad ──
const { generalLimiter, motorLimiter } = require('./middleware/rateLimit');

// ── Rutas ──
const authRoutes        = require('./routes/auth.routes');
const tutoresRoutes     = require('./routes/tutores.routes');
const categoriasRoutes  = require('./routes/categorias.routes');
const alumnosRoutes     = require('./routes/alumnos.routes');
const cargosRoutes      = require('./routes/cargos.routes');
const equiposRoutes     = require('./routes/equipos.routes');
const torneosRoutes     = require('./routes/torneos.routes');
const credencialesRoutes = require('./routes/credenciales.routes');
const uniformesRoutes   = require('./routes/uniformes.routes');
const arbitrajeRoutes   = require('./routes/arbitraje.routes');
const dashboardRoutes   = require('./routes/dashboard.routes');

// ── Motor de cobranza ──
const {
    iniciarMotorCobranza,
    generarMensualidades,
    actualizarCargosVencidos
} = require('./billing.engine');

const app  = express();
const PORT = process.env.PORT || 3000;

// ════════════════════════════════════════════════════════════
// CAPA 1: HEADERS DE SEGURIDAD HTTP (Helmet)
// Activa automáticamente: X-Frame-Options, X-Content-Type-Options,
// Strict-Transport-Security, Content-Security-Policy, etc.
// ════════════════════════════════════════════════════════════
app.use(helmet());

// ════════════════════════════════════════════════════════════
// CAPA 2: CORS RESTRICTIVO
// Solo acepta requests del frontend autorizado.
// En producción, FRONTEND_URL debe ser el dominio real (ej: https://spordt.com)
// ════════════════════════════════════════════════════════════
const corsOptions = {
    origin: (origin, callback) => {
        const allowed = (process.env.FRONTEND_URL || 'http://localhost:4200').split(',').map(s => s.trim());
        // Permitir requests sin origin (Postman, apps móviles, mismo servidor)
        if (!origin || allowed.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error(`CORS: Origen no autorizado: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};
app.use(cors(corsOptions));

// ════════════════════════════════════════════════════════════
// CAPA 3: RATE LIMITING GENERAL
// 200 requests por IP cada 15 minutos.
// Los limitadores específicos se aplican en las rutas financieras.
// ════════════════════════════════════════════════════════════
app.use(generalLimiter);

// ════════════════════════════════════════════════════════════
// CAPA 4: PARSEO DEL BODY (tamaño limitado)
// Se redujo de 50MB a 5MB para prevenir ataques DoS.
// 5MB es suficiente para imágenes Base64 de escudos de equipos.
// ════════════════════════════════════════════════════════════
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ limit: '5mb', extended: true }));

// ────────────────────────────────────────────────────────────
// Ruta raíz de verificación
// ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        sistema: 'SporDT API',
        version: '2.0.0',
        estado: 'En línea',
        seguridad: 'Helmet + CORS + Rate Limiting + JWT',
        endpoints: [
            'POST /api/auth/login',
            'GET  /api/auth/me',
            'GET  /api/tutores',
            'GET  /api/categorias',
            'GET  /api/alumnos',
            'GET  /api/cargos',
            'GET  /api/equipos',
            'GET  /api/torneos',
            'GET  /api/credenciales',
            'GET  /api/uniformes',
            'POST /api/uniformes        [JWT]',
            'POST /api/uniformes/:id/abonos  [JWT + Rate Limit Financiero]',
            'PATCH /api/uniformes/:id/entregar [JWT]',
            'GET  /api/arbitraje',
            'POST /api/arbitraje        [JWT + Rate Limit Financiero]',
            'POST /api/arbitraje/:id/pagar    [JWT + Rate Limit Financiero]',
            'GET  /api/dashboard/resumen [JWT]',
            'GET  /api/dashboard/alertas [JWT]',
            'GET  /api/dashboard/caja/hoy [JWT]',
            'GET  /api/dashboard/morosos  [JWT]',
            'POST /api/motor/mensualidades [Rate Limit Motor]',
            'POST /api/motor/vencimientos  [Rate Limit Motor]'
        ]
    });
});

// ────────────────────────────────────────────────────────────
// Rutas de la API
// ────────────────────────────────────────────────────────────
app.use('/api/auth',        authRoutes);        // Login + sesión
app.use('/api/tutores',     tutoresRoutes);
app.use('/api/categorias',  categoriasRoutes);
app.use('/api/alumnos',     alumnosRoutes);
app.use('/api/cargos',      cargosRoutes);
app.use('/api/equipos',     equiposRoutes);
app.use('/api/torneos',     torneosRoutes);
app.use('/api/credenciales', credencialesRoutes);
app.use('/api/uniformes',   uniformesRoutes);   // JWT en POST/PATCH
app.use('/api/arbitraje',   arbitrajeRoutes);   // JWT en POST
app.use('/api/dashboard',   dashboardRoutes);   // JWT en todos

// ────────────────────────────────────────────────────────────
// Motor de cobranza — con rate limit estricto
// ────────────────────────────────────────────────────────────

/** POST /api/motor/mensualidades — Ejecutar manualmente (demos y pruebas) */
app.post('/api/motor/mensualidades', motorLimiter, async (req, res) => {
    try {
        console.log('[Motor] Job de mensualidades ejecutado manualmente via API');
        const resultado = await generarMensualidades();
        res.json({ mensaje: 'Job de mensualidades ejecutado correctamente', resultado });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al ejecutar el job' });
    }
});

/** POST /api/motor/vencimientos — Ejecutar manualmente (demos y pruebas) */
app.post('/api/motor/vencimientos', motorLimiter, async (req, res) => {
    try {
        console.log('[Motor] Job de vencimientos ejecutado manualmente via API');
        const resultado = await actualizarCargosVencidos();
        res.json({ mensaje: 'Job de vencimientos ejecutado correctamente', resultado });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al ejecutar el job' });
    }
});

// ════════════════════════════════════════════════════════════
// CAPA FINAL: MANEJADOR GLOBAL DE ERRORES
// Captura cualquier error no manejado en los controllers.
// NUNCA filtra stack traces ni detalles internos al cliente.
// ════════════════════════════════════════════════════════════
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
    // Errores de CORS
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({ message: err.message });
    }
    // Errores de payload demasiado grande
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'El cuerpo de la solicitud es demasiado grande (máx. 5MB)' });
    }
    // Errores de JSON malformado
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'El cuerpo de la solicitud contiene JSON inválido' });
    }
    // Error genérico — registrar internamente sin filtrar detalles al cliente
    console.error('[Error Global]', {
        url:     req.url,
        method:  req.method,
        message: err.message,
        stack:   err.stack
    });
    res.status(500).json({ message: 'Error interno del servidor' });
});

// ────────────────────────────────────────────────────────────
// Iniciar servidor y motor de cobranza
// ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor SporDT corriendo en http://localhost:${PORT}`);
    console.log(`🔒 Seguridad: Helmet ✅ | CORS restrictivo ✅ | Rate Limiting ✅ | JWT ✅`);
    console.log(`   FRONTEND_URL permitido: ${process.env.FRONTEND_URL || 'http://localhost:4200'}\n`);
    iniciarMotorCobranza();
});