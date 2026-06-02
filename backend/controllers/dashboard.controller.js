/**
 * ============================================================
 * SporDT — Dashboard de Alertas y Resumen de Caja
 * dashboard.controller.js
 * ============================================================
 * Pantalla unificada de valor agregado para el administrador.
 * Analiza toda la base de datos en tiempo real para mostrar:
 *
 *   [1] Alertas prioritarias (CRÍTICA → URGENTE → ADVERTENCIA)
 *       - Uniformes vencidos sin liquidar
 *       - Uniformes próximos a vencer (≤ 7 días)
 *       - Mensualidades vencidas
 *       - Arbitrajes pendientes de pago
 *
 *   [2] Resumen de caja del día y la semana
 *       - Ingresos por concepto
 *       - Cargos generados hoy
 *       - Deudas con vencimiento hoy
 *
 *   [3] Listado de morosos (alumnos con cargos vencidos)
 *
 *   [4] Resumen ejecutivo (una sola llamada para el widget top)
 * ============================================================
 */

const pool = require('../config/db');

// ── Helper: formatea decimales para evitar errores de flotantes ──
const fmt = (n) => parseFloat(parseFloat(n || 0).toFixed(2));

// ============================================================
// GET /api/dashboard/alertas
// Lista priorizada de todas las alertas del sistema.
// Orden: CRITICA > URGENTE > ADVERTENCIA
// ============================================================
const getAlertas = async (req, res) => {
    try {
        const hoy     = new Date().toISOString().split('T')[0];
        const en7Dias = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const alertas = [];

        // ─────────────────────────────────────────────────────
        // ALERTA CRÍTICA: Uniformes vencidos sin liquidar
        // ─────────────────────────────────────────────────────
        const [uniformesVencidos] = await pool.query(`
            SELECT
                cf.id_cargo,
                cf.concepto,
                cf.monto_total,
                cf.monto_pagado,
                (cf.monto_total - cf.monto_pagado)     AS saldo_restante,
                cf.fecha_vencimiento,
                DATEDIFF(CURRENT_DATE, cf.fecha_vencimiento) AS dias_vencido,
                a.nombre_completo AS alumno_nombre,
                t.nombre_completo AS tutor_nombre,
                t.telefono        AS tutor_telefono
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            JOIN tutores t ON a.id_tutor   = t.id_tutor
            WHERE cf.tipo_entidad = 'Alumno'
              AND cf.concepto LIKE 'Uniforme%'
              AND cf.estatus_pago IN ('Pendiente', 'Parcial', 'Vencido')
              AND cf.fecha_vencimiento < ?
            ORDER BY cf.fecha_vencimiento ASC
        `, [hoy]);

        uniformesVencidos.forEach(u => {
            alertas.push({
                nivel:       'CRITICA',
                tipo:        'UNIFORME_VENCIDO',
                icono:       '🔴',
                titulo:      `Uniforme vencido — ${u.alumno_nombre}`,
                descripcion: `${u.concepto}. Saldo: $${fmt(u.saldo_restante)}. Venció hace ${u.dias_vencido} día(s).`,
                accion:      `Contactar al tutor: ${u.tutor_nombre} — ${u.tutor_telefono}`,
                datos:       { ...u, saldo_restante: fmt(u.saldo_restante) }
            });
        });

        // ─────────────────────────────────────────────────────
        // ALERTA CRÍTICA: Mensualidades vencidas sin pagar
        // ─────────────────────────────────────────────────────
        const [mensualidadesVencidas] = await pool.query(`
            SELECT
                cf.id_cargo,
                cf.concepto,
                cf.periodo,
                cf.monto_total,
                cf.monto_pagado,
                (cf.monto_total - cf.monto_pagado)     AS saldo_restante,
                cf.fecha_vencimiento,
                DATEDIFF(CURRENT_DATE, cf.fecha_vencimiento) AS dias_vencido,
                a.nombre_completo AS alumno_nombre,
                t.nombre_completo AS tutor_nombre,
                t.telefono        AS tutor_telefono
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            JOIN tutores t ON a.id_tutor   = t.id_tutor
            WHERE cf.tipo_entidad = 'Alumno'
              AND cf.concepto LIKE 'Mensualidad%'
              AND cf.estatus_pago IN ('Pendiente', 'Parcial', 'Vencido')
              AND cf.fecha_vencimiento < ?
              AND a.estatus = 'Activo'
            ORDER BY cf.fecha_vencimiento ASC
        `, [hoy]);

        mensualidadesVencidas.forEach(m => {
            alertas.push({
                nivel:       'CRITICA',
                tipo:        'MENSUALIDAD_VENCIDA',
                icono:       '🔴',
                titulo:      `Mensualidad vencida — ${m.alumno_nombre}`,
                descripcion: `Periodo ${m.periodo}. Adeuda: $${fmt(m.saldo_restante)}. Venció hace ${m.dias_vencido} día(s).`,
                accion:      `Cobrar al tutor: ${m.tutor_nombre} — ${m.tutor_telefono}`,
                datos:       { ...m, saldo_restante: fmt(m.saldo_restante) }
            });
        });

        // ─────────────────────────────────────────────────────
        // ALERTA URGENTE: Arbitrajes de fin de semana pendientes
        // ─────────────────────────────────────────────────────
        const [arbitrajesPendientes] = await pool.query(`
            SELECT
                cf.id_cargo,
                cf.concepto,
                cf.monto_total,
                cf.monto_pagado,
                cf.estatus_pago,
                (cf.monto_total - cf.monto_pagado)     AS saldo_restante,
                cf.fecha_vencimiento,
                DATEDIFF(CURRENT_DATE, cf.fecha_vencimiento) AS dias_vencido,
                eq.nombre_equipo
            FROM cargos_financieros cf
            JOIN equipos_externos eq ON cf.id_entidad = eq.id_equipo
            WHERE cf.tipo_entidad = 'Equipo'
              AND cf.concepto LIKE 'Arbitraje%'
              AND cf.estatus_pago IN ('Pendiente', 'Parcial', 'Vencido')
            ORDER BY cf.fecha_vencimiento DESC
        `);

        arbitrajesPendientes.forEach(a => {
            const esVencido = a.estatus_pago === 'Vencido' || a.dias_vencido > 0;
            alertas.push({
                nivel:       esVencido ? 'CRITICA' : 'URGENTE',
                tipo:        'ARBITRAJE_PENDIENTE',
                icono:       esVencido ? '🔴' : '🟡',
                titulo:      `Arbitraje pendiente — ${a.nombre_equipo}`,
                descripcion: `${a.concepto}. Adeuda: $${fmt(a.saldo_restante)}.`,
                accion:      `Cobrar al delegado del equipo: ${a.nombre_equipo}`,
                datos:       { ...a, saldo_restante: fmt(a.saldo_restante) }
            });
        });

        // ─────────────────────────────────────────────────────
        // ALERTA ADVERTENCIA: Uniformes próximos a vencer (≤ 7 días)
        // ─────────────────────────────────────────────────────
        const [uniformesProximos] = await pool.query(`
            SELECT
                cf.id_cargo,
                cf.concepto,
                cf.monto_total,
                cf.monto_pagado,
                (cf.monto_total - cf.monto_pagado)      AS saldo_restante,
                cf.fecha_vencimiento,
                DATEDIFF(cf.fecha_vencimiento, CURRENT_DATE) AS dias_restantes,
                a.nombre_completo AS alumno_nombre,
                t.nombre_completo AS tutor_nombre,
                t.telefono        AS tutor_telefono
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            JOIN tutores t ON a.id_tutor   = t.id_tutor
            WHERE cf.tipo_entidad = 'Alumno'
              AND cf.concepto LIKE 'Uniforme%'
              AND cf.estatus_pago IN ('Pendiente', 'Parcial')
              AND cf.fecha_vencimiento BETWEEN ? AND ?
            ORDER BY cf.fecha_vencimiento ASC
        `, [hoy, en7Dias]);

        uniformesProximos.forEach(u => {
            alertas.push({
                nivel:       'ADVERTENCIA',
                tipo:        'UNIFORME_PROXIMO_VENCER',
                icono:       '🟠',
                titulo:      `Uniforme próximo a vencer — ${u.alumno_nombre}`,
                descripcion: `${u.concepto}. Saldo: $${fmt(u.saldo_restante)}. Vence en ${u.dias_restantes} día(s).`,
                accion:      `Recordar al tutor: ${u.tutor_nombre} — ${u.tutor_telefono}`,
                datos:       { ...u, saldo_restante: fmt(u.saldo_restante) }
            });
        });

        // ── Ordenar por nivel de prioridad ──
        const ordenPrioridad = { CRITICA: 0, URGENTE: 1, ADVERTENCIA: 2, INFO: 3 };
        alertas.sort((a, b) => ordenPrioridad[a.nivel] - ordenPrioridad[b.nivel]);

        res.json({
            total:       alertas.length,
            criticas:    alertas.filter(a => a.nivel === 'CRITICA').length,
            urgentes:    alertas.filter(a => a.nivel === 'URGENTE').length,
            advertencias: alertas.filter(a => a.nivel === 'ADVERTENCIA').length,
            alertas
        });

    } catch (error) {
        console.error('[Dashboard] Error al generar alertas:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/dashboard/caja/hoy
// Resumen financiero del día actual
// ============================================================
const getCajaHoy = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];

        // Ingresos del día agrupados por categoría de concepto
        const [ingresos] = await pool.query(`
            SELECT
                CASE
                    WHEN cf.concepto LIKE 'Mensualidad%'  THEN 'Mensualidades'
                    WHEN cf.concepto LIKE 'Uniforme%'     THEN 'Uniformes'
                    WHEN cf.concepto LIKE 'Arbitraje%'    THEN 'Arbitraje'
                    WHEN cf.concepto LIKE 'Inscripci%'    THEN 'Inscripciones'
                    WHEN cf.concepto LIKE 'Credencial%'   THEN 'Credenciales'
                    ELSE 'Otros'
                END AS categoria,
                COUNT(ha.id_abono)     AS num_pagos,
                SUM(ha.monto_abonado)  AS total_cobrado
            FROM historial_abonos ha
            JOIN cargos_financieros cf ON ha.id_cargo = cf.id_cargo
            WHERE DATE(ha.fecha_pago) = ?
            GROUP BY categoria
            ORDER BY total_cobrado DESC
        `, [hoy]);

        const total_dia = ingresos.reduce((sum, i) => sum + fmt(i.total_cobrado), 0);

        // Cargos nuevos generados hoy
        const [cargosNuevos] = await pool.query(`
            SELECT COUNT(*) AS cantidad, SUM(monto_total) AS monto_total
            FROM cargos_financieros
            WHERE DATE(fecha_generacion) = ?
        `, [hoy]);

        // Cargos que vencen hoy y aún no están pagados
        const [vencenHoy] = await pool.query(`
            SELECT COUNT(*) AS cantidad, SUM(monto_total - monto_pagado) AS deuda_total
            FROM cargos_financieros
            WHERE fecha_vencimiento = ?
              AND estatus_pago IN ('Pendiente', 'Parcial')
        `, [hoy]);

        res.json({
            fecha: hoy,
            ingresos_del_dia: {
                total:    fmt(total_dia),
                desglose: ingresos.map(i => ({ ...i, total_cobrado: fmt(i.total_cobrado) }))
            },
            cargos_generados_hoy: {
                cantidad:    cargosNuevos[0].cantidad,
                monto_total: fmt(cargosNuevos[0].monto_total)
            },
            vencen_hoy: {
                cantidad:    vencenHoy[0].cantidad,
                deuda_total: fmt(vencenHoy[0].deuda_total)
            }
        });

    } catch (error) {
        console.error('[Dashboard] Error al obtener caja del día:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/dashboard/caja/semana
// Resumen financiero de los últimos 7 días
// ============================================================
const getCajaSemana = async (req, res) => {
    try {
        const hoy      = new Date().toISOString().split('T')[0];
        const hace7    = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        // Ingresos por día
        const [porDia] = await pool.query(`
            SELECT
                DATE(ha.fecha_pago)    AS fecha,
                COUNT(ha.id_abono)     AS num_pagos,
                SUM(ha.monto_abonado)  AS total_cobrado
            FROM historial_abonos ha
            WHERE DATE(ha.fecha_pago) BETWEEN ? AND ?
            GROUP BY DATE(ha.fecha_pago)
            ORDER BY fecha ASC
        `, [hace7, hoy]);

        // Ingresos por concepto en la semana
        const [porConcepto] = await pool.query(`
            SELECT
                CASE
                    WHEN cf.concepto LIKE 'Mensualidad%'  THEN 'Mensualidades'
                    WHEN cf.concepto LIKE 'Uniforme%'     THEN 'Uniformes'
                    WHEN cf.concepto LIKE 'Arbitraje%'    THEN 'Arbitraje'
                    WHEN cf.concepto LIKE 'Inscripci%'    THEN 'Inscripciones'
                    WHEN cf.concepto LIKE 'Credencial%'   THEN 'Credenciales'
                    ELSE 'Otros'
                END AS categoria,
                SUM(ha.monto_abonado) AS total
            FROM historial_abonos ha
            JOIN cargos_financieros cf ON ha.id_cargo = cf.id_cargo
            WHERE DATE(ha.fecha_pago) BETWEEN ? AND ?
            GROUP BY categoria
            ORDER BY total DESC
        `, [hace7, hoy]);

        const total_semana = porDia.reduce((sum, d) => sum + fmt(d.total_cobrado), 0);

        res.json({
            periodo:      { desde: hace7, hasta: hoy },
            total_semana: fmt(total_semana),
            por_dia:      porDia.map(d => ({ ...d, total_cobrado: fmt(d.total_cobrado) })),
            por_concepto: porConcepto.map(c => ({ ...c, total: fmt(c.total) }))
        });

    } catch (error) {
        console.error('[Dashboard] Error al obtener caja semanal:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/dashboard/morosos
// Alumnos activos con cargos vencidos (deudores).
// Ordenados por monto de deuda descendente.
// ============================================================
const getMorosos = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                a.id_alumno,
                a.nombre_completo                              AS alumno_nombre,
                t.nombre_completo                              AS tutor_nombre,
                t.telefono                                     AS tutor_telefono,
                t.email                                        AS tutor_email,
                COUNT(cf.id_cargo)                             AS num_deudas,
                SUM(cf.monto_total - cf.monto_pagado)          AS deuda_total,
                MIN(cf.fecha_vencimiento)                      AS deuda_mas_antigua,
                MAX(DATEDIFF(CURRENT_DATE, cf.fecha_vencimiento)) AS dias_max_vencido
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            JOIN tutores t ON a.id_tutor   = t.id_tutor
            WHERE cf.tipo_entidad = 'Alumno'
              AND cf.estatus_pago IN ('Pendiente', 'Parcial', 'Vencido')
              AND cf.fecha_vencimiento < CURRENT_DATE
              AND a.estatus = 'Activo'
            GROUP BY a.id_alumno, a.nombre_completo, t.nombre_completo, t.telefono, t.email
            ORDER BY deuda_total DESC
        `);

        const deuda_total_sistema = rows.reduce((s, r) => s + fmt(r.deuda_total), 0);

        res.json({
            total_morosos:       rows.length,
            deuda_total_sistema: fmt(deuda_total_sistema),
            morosos:             rows.map(r => ({ ...r, deuda_total: fmt(r.deuda_total) }))
        });

    } catch (error) {
        console.error('[Dashboard] Error al obtener morosos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/dashboard/resumen
// Vista ejecutiva rápida (widget principal del dashboard).
// Retorna conteos y totales en una sola llamada.
// ============================================================
const getResumenGeneral = async (req, res) => {
    try {
        const hoy = new Date().toISOString().split('T')[0];

        const [[uvCount]]  = await pool.query(`
            SELECT COUNT(*) AS total FROM cargos_financieros
            WHERE tipo_entidad='Alumno' AND concepto LIKE 'Uniforme%'
              AND estatus_pago IN ('Pendiente','Parcial','Vencido')
              AND fecha_vencimiento < ?`, [hoy]);

        const [[mvCount]]  = await pool.query(`
            SELECT COUNT(*) AS total FROM cargos_financieros
            WHERE tipo_entidad='Alumno' AND concepto LIKE 'Mensualidad%'
              AND estatus_pago IN ('Pendiente','Parcial','Vencido')
              AND fecha_vencimiento < ?`, [hoy]);

        const [[arbCount]] = await pool.query(`
            SELECT COUNT(*) AS total FROM cargos_financieros
            WHERE tipo_entidad='Equipo' AND concepto LIKE 'Arbitraje%'
              AND estatus_pago IN ('Pendiente','Parcial')`);

        const [[cajaHoy]]  = await pool.query(`
            SELECT COALESCE(SUM(monto_abonado), 0) AS total
            FROM historial_abonos WHERE DATE(fecha_pago) = ?`, [hoy]);

        const [[activos]]  = await pool.query(
            "SELECT COUNT(*) AS total FROM alumnos WHERE estatus = 'Activo'");

        res.json({
            fecha:           hoy,
            alertas_criticas: uvCount.total + mvCount.total,
            alertas: {
                uniformes_vencidos:      uvCount.total,
                mensualidades_vencidas:  mvCount.total,
                arbitraje_pendiente:     arbCount.total
            },
            caja_hoy:        fmt(cajaHoy.total),
            alumnos_activos: activos.total
        });

    } catch (error) {
        console.error('[Dashboard] Error al obtener resumen general:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAlertas,
    getCajaHoy,
    getCajaSemana,
    getMorosos,
    getResumenGeneral
};
