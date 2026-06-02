/**
 * ============================================================
 * SporDT — Módulo de Arbitraje Semanal (División 50/50)
 * arbitraje.controller.js  [VERSIÓN CON HARDENING DE SEGURIDAD]
 * ============================================================
 * Seguridad aplicada:
 *   ✅ Validación estricta con Number() — no parseFloat()
 *   ✅ Sanitización de strings (trim + límite de longitud)
 *   ✅ Whitelist de valores ENUM (método de pago, estatus)
 *   ✅ Validación de formato de fecha (YYYY-MM-DD)
 *   ✅ Validación de IDs enteros positivos
 *   ✅ Transacciones con FOR UPDATE (anti race-condition)
 *   ✅ Try/catch en parseo de JSON (notas del partido)
 * ============================================================
 */

const pool = require('../config/db');
const {
    sanitizeString,
    validatePositiveNumber,
    validatePositiveInteger,
    validateDate,
    validateEnum,
    collectErrors
} = require('../middleware/validate');

const METODOS_PAGO   = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];
const ESTATUS_VALIDOS = ['Pendiente', 'Parcial', 'Pagado', 'Vencido'];

// ── Helper: genera un identificador único de partido ──
const generarPartidoRef = () => `ARB-${Date.now()}`;

// ── Helper: parsea el JSON almacenado en el campo `notas` ──
const parsearInfoPartido = (notasStr) => {
    try { return JSON.parse(notasStr); }
    catch { return { raw: notasStr }; }
};

// ============================================================
// POST /api/arbitraje
// Registrar un partido y crear los 2 cargos (50/50) [REQUIERE JWT]
// Body: { id_equipo_local, id_equipo_visitante, costo_total, fecha_partido,
//         jornada?, id_torneo?, notas? }
// ============================================================
const crearPartido = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const {
            id_equipo_local,
            id_equipo_visitante,
            costo_total,
            fecha_partido,
            jornada,
            id_torneo,
            notas
        } = req.body;

        // ── Validación estricta ──
        const vLocal     = validatePositiveInteger(id_equipo_local, 'id_equipo_local');
        const vVisitante = validatePositiveInteger(id_equipo_visitante, 'id_equipo_visitante');
        const vCosto     = validatePositiveNumber(costo_total, 'costo_total');
        const vFecha     = validateDate(fecha_partido, 'fecha_partido');

        const errores = collectErrors([vLocal, vVisitante, vCosto, vFecha]);
        if (errores) {
            return res.status(400).json({ message: 'Errores de validación', errors: errores });
        }

        // Validar torneo si se provee
        if (id_torneo !== undefined && id_torneo !== null) {
            const vTorneo = validatePositiveInteger(id_torneo, 'id_torneo');
            if (vTorneo.error) {
                return res.status(400).json({ message: vTorneo.error });
            }
        }

        if (vLocal.value === vVisitante.value) {
            return res.status(400).json({ message: 'Los equipos local y visitante deben ser diferentes' });
        }

        // Sanitizar strings opcionales
        const jornadaLimpio = sanitizeString(jornada, 50);
        const notasLimpio   = sanitizeString(notas, 500);

        await connection.beginTransaction();

        // Verificar que ambos equipos existen y están activos
        const [equipos] = await connection.query(
            'SELECT id_equipo, nombre_equipo FROM equipos_externos WHERE id_equipo IN (?, ?) AND activo = 1',
            [vLocal.value, vVisitante.value]
        );

        if (equipos.length < 2) {
            await connection.rollback();
            return res.status(404).json({ message: 'Uno o ambos equipos no se encontraron o están inactivos' });
        }

        const equipoLocal     = equipos.find(e => e.id_equipo === vLocal.value);
        const equipoVisitante = equipos.find(e => e.id_equipo === vVisitante.value);

        // Calcular cuota 50/50 con precisión de 2 decimales
        const costo            = vCosto.value;
        const cuota_por_equipo = parseFloat((costo / 2).toFixed(2));
        const partido_ref      = generarPartidoRef();
        const periodo          = vFecha.value.substring(0, 7);

        // Construir notas JSON para vincular los 2 cargos del mismo partido
        const notasLocal = JSON.stringify({
            partido_ref,
            rol:                   'Local',
            id_torneo:             id_torneo || null,
            jornada:               jornadaLimpio || null,
            equipo_rival_id:       vVisitante.value,
            equipo_rival_nombre:   equipoVisitante.nombre_equipo,
            costo_total_arbitraje: costo,
            fecha_partido:         vFecha.value,
            observaciones:         notasLimpio
        });

        const notasVisitante = JSON.stringify({
            partido_ref,
            rol:                   'Visitante',
            id_torneo:             id_torneo || null,
            jornada:               jornadaLimpio || null,
            equipo_rival_id:       vLocal.value,
            equipo_rival_nombre:   equipoLocal.nombre_equipo,
            costo_total_arbitraje: costo,
            fecha_partido:         vFecha.value,
            observaciones:         notasLimpio
        });

        const conceptoBase = `Arbitraje${jornadaLimpio ? ` J${jornadaLimpio}` : ''} - ${vFecha.value}`;

        const [cargoLocalResult] = await connection.query(`
            INSERT INTO cargos_financieros
                (tipo_entidad, id_entidad, concepto, monto_total, monto_pagado,
                 estatus_pago, fecha_vencimiento, periodo, notas)
            VALUES ('Equipo', ?, ?, ?, 0.00, 'Pendiente', ?, ?, ?)
        `, [
            vLocal.value,
            `${conceptoBase} (Local vs ${equipoVisitante.nombre_equipo})`,
            cuota_por_equipo, vFecha.value, periodo, notasLocal
        ]);

        const [cargoVisitanteResult] = await connection.query(`
            INSERT INTO cargos_financieros
                (tipo_entidad, id_entidad, concepto, monto_total, monto_pagado,
                 estatus_pago, fecha_vencimiento, periodo, notas)
            VALUES ('Equipo', ?, ?, ?, 0.00, 'Pendiente', ?, ?, ?)
        `, [
            vVisitante.value,
            `${conceptoBase} (Visitante vs ${equipoLocal.nombre_equipo})`,
            cuota_por_equipo, vFecha.value, periodo, notasVisitante
        ]);

        await connection.commit();

        res.status(201).json({
            message:       'Partido de arbitraje registrado correctamente',
            partido_ref,
            fecha_partido: vFecha.value,
            jornada:       jornadaLimpio || null,
            costo_total:   costo,
            cuota_por_equipo,
            cargos: {
                local: {
                    id_cargo: cargoLocalResult.insertId,
                    equipo:   equipoLocal.nombre_equipo,
                    monto:    cuota_por_equipo,
                    estatus:  'Pendiente'
                },
                visitante: {
                    id_cargo: cargoVisitanteResult.insertId,
                    equipo:   equipoVisitante.nombre_equipo,
                    monto:    cuota_por_equipo,
                    estatus:  'Pendiente'
                }
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('[Arbitraje] Error al crear partido:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};

// ============================================================
// GET /api/arbitraje/jornada
// Vista rápida de todos los partidos de una fecha/jornada.
// Query: ?fecha=2026-06-01  (obligatorio)
// ============================================================
const getJornada = async (req, res) => {
    try {
        const { fecha } = req.query;

        const vFecha = validateDate(fecha, 'fecha');
        if (vFecha.error) {
            return res.status(400).json({ message: vFecha.error });
        }

        const [rows] = await pool.query(`
            SELECT
                cf.*,
                eq.nombre_equipo,
                (cf.monto_total - cf.monto_pagado) AS saldo_restante
            FROM cargos_financieros cf
            JOIN equipos_externos eq ON cf.id_entidad = eq.id_equipo
            WHERE cf.tipo_entidad = 'Equipo'
              AND cf.concepto LIKE 'Arbitraje%'
              AND cf.fecha_vencimiento = ?
            ORDER BY cf.fecha_generacion ASC
        `, [vFecha.value]);

        const partidos = {};
        for (const row of rows) {
            const info = parsearInfoPartido(row.notas);
            const ref  = info.partido_ref || `SIN-REF-${row.id_cargo}`;

            if (!partidos[ref]) {
                partidos[ref] = {
                    partido_ref:    ref,
                    fecha_partido:  vFecha.value,
                    jornada:        info.jornada || null,
                    costo_total:    info.costo_total_arbitraje || null,
                    estatus_global: 'Pendiente',
                    equipos:        []
                };
            }

            partidos[ref].equipos.push({
                id_cargo:       row.id_cargo,
                id_equipo:      row.id_entidad,
                nombre_equipo:  row.nombre_equipo,
                rol:            info.rol || 'N/A',
                equipo_rival:   info.equipo_rival_nombre || 'N/A',
                monto:          parseFloat(row.monto_total),
                monto_pagado:   parseFloat(row.monto_pagado),
                saldo_restante: parseFloat(row.saldo_restante),
                estatus:        row.estatus_pago
            });
        }

        for (const ref in partidos) {
            const eq = partidos[ref].equipos;
            partidos[ref].estatus_global = eq.every(e => e.estatus === 'Pagado')
                ? 'Completo'
                : eq.some(e => e.monto_pagado > 0)
                    ? 'Parcial'
                    : 'Pendiente';
        }

        const lista = Object.values(partidos);

        res.json({
            fecha,
            total_partidos: lista.length,
            completos:      lista.filter(p => p.estatus_global === 'Completo').length,
            parciales:      lista.filter(p => p.estatus_global === 'Parcial').length,
            pendientes:     lista.filter(p => p.estatus_global === 'Pendiente').length,
            partidos:       lista
        });

    } catch (error) {
        console.error('[Arbitraje] Error al obtener jornada:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/arbitraje/pendientes
// Todos los cargos de arbitraje sin liquidar
// ============================================================
const getPendientes = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                cf.*,
                eq.nombre_equipo,
                (cf.monto_total - cf.monto_pagado)           AS saldo_restante,
                DATEDIFF(CURRENT_DATE, cf.fecha_vencimiento) AS dias_vencido
            FROM cargos_financieros cf
            JOIN equipos_externos eq ON cf.id_entidad = eq.id_equipo
            WHERE cf.tipo_entidad = 'Equipo'
              AND cf.concepto LIKE 'Arbitraje%'
              AND cf.estatus_pago IN ('Pendiente', 'Parcial', 'Vencido')
            ORDER BY cf.fecha_vencimiento ASC
        `);

        res.json({
            total:  rows.length,
            cargos: rows.map(row => ({
                ...row,
                saldo_restante: parseFloat(row.saldo_restante),
                partido_info:   parsearInfoPartido(row.notas)
            }))
        });
    } catch (error) {
        console.error('[Arbitraje] Error al obtener pendientes:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/arbitraje
// Listado general con filtros opcionales
// ============================================================
const getAll = async (req, res) => {
    try {
        const { fecha, estatus } = req.query;

        // Validar parámetros de filtro
        if (fecha) {
            const vFecha = validateDate(fecha, 'fecha');
            if (vFecha.error) return res.status(400).json({ message: vFecha.error });
        }
        if (estatus && !ESTATUS_VALIDOS.includes(estatus)) {
            return res.status(400).json({
                message: `estatus inválido. Valores permitidos: ${ESTATUS_VALIDOS.join(', ')}`
            });
        }

        let query = `
            SELECT
                cf.*,
                eq.nombre_equipo,
                (cf.monto_total - cf.monto_pagado) AS saldo_restante
            FROM cargos_financieros cf
            JOIN equipos_externos eq ON cf.id_entidad = eq.id_equipo
            WHERE cf.tipo_entidad = 'Equipo'
              AND cf.concepto LIKE 'Arbitraje%'
        `;
        const params = [];

        if (fecha) { query += ' AND cf.fecha_vencimiento = ?'; params.push(fecha); }
        if (estatus) { query += ' AND cf.estatus_pago = ?'; params.push(estatus); }

        query += ' ORDER BY cf.fecha_vencimiento DESC, cf.fecha_generacion DESC';

        const [rows] = await pool.query(query, params);

        res.json(rows.map(row => ({
            ...row,
            saldo_restante: parseFloat(row.saldo_restante),
            partido_info:   parsearInfoPartido(row.notas)
        })));
    } catch (error) {
        console.error('[Arbitraje] Error al obtener lista:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/arbitraje/:id/pagar
// Registrar pago de un equipo [REQUIERE JWT + Rate Limit Financiero]
// Body: { monto, metodo_pago, recibido_por }
// ============================================================
const registrarPago = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { monto, metodo_pago, recibido_por } = req.body;

        // ── Validación estricta ──
        const vId     = validatePositiveInteger(req.params.id, 'id');
        const vMonto  = validatePositiveNumber(monto, 'monto');
        const vMetodo = validateEnum(metodo_pago, METODOS_PAGO, 'metodo_pago');
        const recibidoLimpio = sanitizeString(recibido_por, 100);

        const errores = collectErrors([vId, vMonto, vMetodo]);
        if (errores) {
            return res.status(400).json({ message: 'Errores de validación', errors: errores });
        }

        await connection.beginTransaction();

        const [cargos] = await connection.query(
            `SELECT * FROM cargos_financieros
             WHERE id_cargo = ? AND tipo_entidad = 'Equipo' AND concepto LIKE 'Arbitraje%'
             FOR UPDATE`,
            [vId.value]
        );

        if (cargos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Cargo de arbitraje no encontrado' });
        }

        const cargo = cargos[0];

        if (cargo.estatus_pago === 'Pagado') {
            await connection.rollback();
            return res.status(400).json({ message: 'Este cargo de arbitraje ya fue pagado' });
        }

        const pago           = vMonto.value;
        const saldo_restante = parseFloat(cargo.monto_total) - parseFloat(cargo.monto_pagado);

        if (pago > saldo_restante + 0.001) {
            await connection.rollback();
            return res.status(400).json({
                message: `El pago ($${pago.toFixed(2)}) excede el saldo restante ($${saldo_restante.toFixed(2)})`,
                saldo_restante: saldo_restante.toFixed(2)
            });
        }

        await connection.query(`
            INSERT INTO historial_abonos (id_cargo, monto_abonado, metodo_pago, recibido_por, notas)
            VALUES (?, ?, ?, ?, 'Pago de cuota de arbitraje')
        `, [vId.value, pago, vMetodo.value || 'Efectivo', recibidoLimpio]);

        const nuevo_pagado  = parseFloat(cargo.monto_pagado) + pago;
        const nuevo_estatus = nuevo_pagado >= parseFloat(cargo.monto_total) ? 'Pagado' : 'Parcial';

        await connection.query(
            'UPDATE cargos_financieros SET monto_pagado = ?, estatus_pago = ? WHERE id_cargo = ?',
            [nuevo_pagado, nuevo_estatus, vId.value]
        );

        await connection.commit();

        const [actualizado] = await pool.query(
            'SELECT * FROM cargos_financieros WHERE id_cargo = ?', [vId.value]
        );

        res.status(201).json({
            message: nuevo_estatus === 'Pagado'
                ? '✅ Pago de arbitraje liquidado completamente.'
                : `Pago registrado. Saldo restante: $${(saldo_restante - pago).toFixed(2)}`,
            cargo: {
                ...actualizado[0],
                partido_info: parsearInfoPartido(actualizado[0].notas)
            }
        });

    } catch (error) {
        await connection.rollback();
        console.error('[Arbitraje] Error al registrar pago:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};

module.exports = {
    crearPartido,
    getAll,
    getJornada,
    getPendientes,
    registrarPago
};
