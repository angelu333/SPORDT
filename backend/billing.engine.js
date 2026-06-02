/**
 * ============================================================
 * SporDT — Motor de Cobranza Recurrente (billing.engine.js)
 * ============================================================
 * Este módulo contiene los 3 jobs automatizados del sistema:
 *
 *   [JOB 1] Mensualidades — Corre el día 1 de cada mes a las 00:05
 *           Genera un cargo de mensualidad por cada alumno activo.
 *
 *   [JOB 2] Inscripciones — Se llama manualmente al crear un alumno.
 *           Genera un cargo de inscripción inmediatamente.
 *
 *   [JOB 3] Vencimientos — Corre diariamente a las 08:00
 *           Actualiza a 'Vencido' los cargos Pendientes/Parciales
 *           cuya fecha_vencimiento ya pasó.
 * ============================================================
 */

const cron = require('node-cron');
const pool = require('./config/db');

// ============================================================
// HELPERS internos
// ============================================================

/** Devuelve el periodo en formato 'YYYY-MM' para el mes actual */
const getPeriodoActual = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${year}-${mes}`;
};

/** Devuelve una fecha de vencimiento: día 15 del mes actual */
const getFechaVencimientoMensualidad = () => {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const mes = String(hoy.getMonth() + 1).padStart(2, '0');
    return `${year}-${mes}-15`;
};

/** Devuelve una fecha N días desde hoy */
const getFechaEnDias = (dias) => {
    const fecha = new Date();
    fecha.setDate(fecha.getDate() + dias);
    return fecha.toISOString().split('T')[0]; // YYYY-MM-DD
};

// ============================================================
// JOB 1: Generación de Mensualidades
// Cron: '5 0 1 * *' = A las 00:05 del día 1 de cada mes
// ============================================================
const generarMensualidades = async () => {
    console.log('[Cobranza] Iniciando generación de mensualidades...');

    try {
        const periodo = getPeriodoActual();
        const fechaVencimiento = getFechaVencimientoMensualidad();

        // 1. Obtener la tarifa de mensualidad activa
        const [tarifas] = await pool.query(
            "SELECT * FROM tarifas WHERE tipo = 'Mensualidad' AND activo = 1 LIMIT 1"
        );
        if (tarifas.length === 0) {
            console.warn('[Cobranza] No se encontró tarifa de Mensualidad activa. Job cancelado.');
            return { generados: 0, omitidos: 0, error: 'Sin tarifa activa' };
        }
        const tarifa = tarifas[0];

        // 2. Obtener todos los alumnos activos
        const [alumnos] = await pool.query(
            "SELECT id_alumno, nombre_completo FROM alumnos WHERE estatus = 'Activo'"
        );
        if (alumnos.length === 0) {
            console.log('[Cobranza] No hay alumnos activos. Job finalizado sin cargos.');
            return { generados: 0, omitidos: 0 };
        }

        let generados = 0;
        let omitidos = 0;

        // ... (existing code)
// 3. Generar todos los cargos de una sola vez para evitar el problema de rendimiento N+1
        const [result] = await pool.query(
            `INSERT INTO cargos_financieros 
             (tipo_entidad, id_entidad, concepto, monto_total, fecha_vencimiento, periodo)
             SELECT 
                'Alumno', 
                a.id_alumno, 
                ?, 
                ?, 
                ?, 
                ?
             FROM alumnos a
             WHERE a.estatus = 'Activo'
             AND NOT EXISTS (
                 SELECT 1 FROM cargos_financieros cf 
                 WHERE cf.tipo_entidad = 'Alumno' 
                 AND cf.id_entidad = a.id_alumno 
                 AND cf.periodo = ?
             )`,
            [
                `${tarifa.concepto} - ${periodo}`,
                tarifa.monto,
                fechaVencimiento,
                periodo,
                periodo
            ]
        );
        
        generados = result.affectedRows;
        // Nota: 'omitidos' es difícil de calcular exactamente con un solo INSERT, 
        // pero el proceso ahora es extremadamente rápido.
        console.log(`[Cobranza] Proceso de mensualidades completado. Cargos nuevos: ${generados}`);
        return { generados, omitidos: 'Calculado por BD' };

    } catch (error) {
// ... (rest of the file)

        console.error('[Cobranza] Error al generar mensualidades:', error.message);
        return { generados: 0, omitidos: 0, error: error.message };
    }
};

// ============================================================
// JOB 2: Cargo de Inscripción
// No es un cron — se llama directamente desde alumnos.controller
// al momento de registrar un nuevo alumno.
// ============================================================
const generarCargoInscripcion = async (idAlumno) => {
    console.log(`[Cobranza] Generando cargo de inscripción para alumno ID: ${idAlumno}`);

    try {
        // Obtener la tarifa de inscripción activa
        const [tarifas] = await pool.query(
            "SELECT * FROM tarifas WHERE tipo = 'Inscripcion' AND activo = 1 LIMIT 1"
        );
        if (tarifas.length === 0) {
            console.warn('[Cobranza] No se encontró tarifa de Inscripción activa. Se omite el cargo.');
            return null;
        }
        const tarifa = tarifas[0];

        // Fecha de vencimiento: 7 días desde hoy
        const fechaVencimiento = getFechaEnDias(7);

        const [result] = await pool.query(
            `INSERT INTO cargos_financieros 
             (tipo_entidad, id_entidad, concepto, monto_total, fecha_vencimiento, notas)
             VALUES ('Alumno', ?, ?, ?, ?, 'Generado automáticamente al inscribir al alumno')`,
            [idAlumno, tarifa.concepto, tarifa.monto, fechaVencimiento]
        );

        console.log(`[Cobranza] Cargo de inscripción generado (ID: ${result.insertId}) — Vence: ${fechaVencimiento}`);
        return result.insertId;

    } catch (error) {
        console.error('[Cobranza] Error al generar cargo de inscripción:', error.message);
        return null;
    }
};

// ============================================================
// JOB 3: Actualización de Cargos Vencidos
// Cron: '0 8 * * *' = Todos los días a las 08:00
// ============================================================
const actualizarCargosVencidos = async () => {
    console.log('[Cobranza] Verificando cargos vencidos...');

    try {
        const hoy = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const [result] = await pool.query(
            `UPDATE cargos_financieros 
             SET estatus_pago = 'Vencido'
             WHERE estatus_pago IN ('Pendiente', 'Parcial') 
               AND fecha_vencimiento < ?`,
            [hoy]
        );

        if (result.affectedRows > 0) {
            console.log(`[Cobranza] ${result.affectedRows} cargo(s) marcados como Vencido.`);
        } else {
            console.log('[Cobranza] No hay cargos vencidos nuevos.');
        }

        return { actualizados: result.affectedRows };

    } catch (error) {
        console.error('[Cobranza] Error al actualizar vencidos:', error.message);
        return { actualizados: 0, error: error.message };
    }
};

// ============================================================
// FUNCIÓN DE ARRANQUE
// Registra y activa todos los cron jobs.
// Se llama una vez desde index.js al iniciar el servidor.
// ============================================================
const iniciarMotorCobranza = () => {
    console.log('[Cobranza] Iniciando motor de cobranza recurrente...');

    // JOB 1: Mensualidades — Día 1 de cada mes a las 00:05
    cron.schedule('5 0 1 * *', () => {
        console.log('\n[Cobranza] Ejecutando job mensual de mensualidades...');
        generarMensualidades();
    }, {
        timezone: 'America/Chihuahua' // Zona horaria de México (Chihuahua/Ciudad Juárez)
    });

    // JOB 3: Vencimientos — Todos los días a las 08:00
    cron.schedule('0 8 * * *', () => {
        console.log('\n[Cobranza] Ejecutando job diario de vencimientos...');
        actualizarCargosVencidos();
    }, {
        timezone: 'America/Chihuahua'
    });

    console.log('[Cobranza] Motor activo. Jobs programados:');
    console.log('   • Mensualidades: día 1 de cada mes a las 00:05');
    console.log('   • Vencimientos:  todos los días a las 08:00');
};

// ============================================================
// EXPORTACIONES
// - iniciarMotorCobranza: para llamar desde index.js
// - generarMensualidades: para pruebas manuales por endpoint
// - generarCargoInscripcion: para llamar desde alumnos.controller
// - actualizarCargosVencidos: para pruebas manuales por endpoint
// ============================================================
module.exports = {
    iniciarMotorCobranza,
    generarMensualidades,
    generarCargoInscripcion,
    actualizarCargosVencidos
};
