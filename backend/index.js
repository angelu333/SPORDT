/**
 * ============================================================
 * SporDT — API Principal (index.js)
 * ============================================================
 */

const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Inicializar la conexión a BD (el pool se crea al importar)
require('./config/db');

// Importar rutas
const tutoresRoutes = require('./routes/tutores.routes');
const categoriasRoutes = require('./routes/categorias.routes');
const alumnosRoutes = require('./routes/alumnos.routes');
const cargosRoutes = require('./routes/cargos.routes');
const equiposRoutes = require('./routes/equipos.routes');
const torneosRoutes = require('./routes/torneos.routes');
const credencialesRoutes = require('./routes/credenciales.routes');


// Importar motor de cobranza
const {
    iniciarMotorCobranza,
    generarMensualidades,
    actualizarCargosVencidos
} = require('./billing.engine');

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// ────────────────────────────────────────────────────────────
// Ruta raíz de verificación
// ────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
    res.json({
        sistema: 'SporDT API',
        version: '2.0.0',
        estado: 'En línea',
        endpoints: [
            'GET /api/tutores',
            'GET /api/categorias',
            'GET /api/alumnos',
            'GET /api/cargos',
            'GET /api/equipos',
            'GET /api/torneos',
            'GET /api/credenciales',
            'POST /api/motor/mensualidades',
            'POST /api/motor/vencimientos'
        ]
    });
});

// ────────────────────────────────────────────────────────────
// Rutas de la API
// ────────────────────────────────────────────────────────────
app.use('/api/tutores', tutoresRoutes);
app.use('/api/categorias', categoriasRoutes);
app.use('/api/alumnos', alumnosRoutes);
app.use('/api/cargos', cargosRoutes);
app.use('/api/equipos', equiposRoutes);
app.use('/api/torneos', torneosRoutes);
app.use('/api/credenciales', credencialesRoutes);


// ────────────────────────────────────────────────────────────
// Endpoints de prueba manual del motor de cobranza
// Útiles para demostrar y testear sin esperar el cron real
// ────────────────────────────────────────────────────────────

/**
 * POST /api/motor/mensualidades
 * Ejecuta el job de mensualidades manualmente (para demos y pruebas)
 */
app.post('/api/motor/mensualidades', async (req, res) => {
    try {
        console.log('📲 [Motor] Job de mensualidades ejecutado manualmente via API');
        const resultado = await generarMensualidades();
        res.json({
            mensaje: 'Job de mensualidades ejecutado correctamente',
            resultado
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al ejecutar el job', error: error.message });
    }
});

/**
 * POST /api/motor/vencimientos
 * Ejecuta el job de vencimientos manualmente (para demos y pruebas)
 */
app.post('/api/motor/vencimientos', async (req, res) => {
    try {
        console.log('📲 [Motor] Job de vencimientos ejecutado manualmente via API');
        const resultado = await actualizarCargosVencidos();
        res.json({
            mensaje: 'Job de vencimientos ejecutado correctamente',
            resultado
        });
    } catch (error) {
        res.status(500).json({ mensaje: 'Error al ejecutar el job', error: error.message });
    }
});

// ────────────────────────────────────────────────────────────
// Iniciar servidor y arrancar motor de cobranza
// ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
    console.log(`🚀 Servidor SporDT corriendo en http://localhost:${PORT}`);
    // Arrancar el motor de cobranza (registra los cron jobs)
    iniciarMotorCobranza();
});