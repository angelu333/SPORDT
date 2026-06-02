/**
 * ============================================================
 * SporDT — Módulo de Uniformes y Abonos Parciales
 * uniformes.controller.js  [VERSIÓN CON HARDENING DE SEGURIDAD]
 * ============================================================
 * Seguridad aplicada:
 *   ✅ Validación estricta con Number() — no parseFloat()
 *   ✅ Sanitización de strings (trim + límite de longitud)
 *   ✅ Whitelist de valores ENUM (método de pago)
 *   ✅ Validación de formato de fecha (YYYY-MM-DD)
 *   ✅ Validación de IDs enteros positivos
 *   ✅ Transacciones con FOR UPDATE (anti race-condition)
 *   ✅ Errores descriptivos sin filtrar info interna
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

const METODOS_PAGO = ['Efectivo', 'Transferencia', 'Tarjeta', 'Otro'];

// ============================================================
// GET /api/uniformes
// Listar todos los cargos de uniforme con saldo calculado.
// Filtros opcionales: ?id_alumno=5  &estatus=Pendiente
// ============================================================
const getAll = async (req, res) => {
    try {
        const { id_alumno, estatus } = req.query;

        // Validar id_alumno si se provee como filtro
        if (id_alumno !== undefined) {
            const v = validatePositiveInteger(id_alumno, 'id_alumno');
            if (v.error) return res.status(400).json({ message: v.error });
        }

        // Validar estatus contra lista blanca de la BD
        const estatusPermitidos = ['Pendiente', 'Parcial', 'Pagado', 'Vencido'];
        if (estatus && !estatusPermitidos.includes(estatus)) {
            return res.status(400).json({
                message: `estatus inválido. Valores permitidos: ${estatusPermitidos.join(', ')}`
            });
        }

        let query = `
            SELECT
                cf.*,
                (cf.monto_total - cf.monto_pagado) AS saldo_restante,
                a.nombre_completo AS alumno_nombre,
                t.nombre_completo AS tutor_nombre,
                t.telefono       AS tutor_telefono
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            JOIN tutores t ON a.id_tutor   = t.id_tutor
            WHERE cf.tipo_entidad = 'Alumno'
              AND cf.concepto LIKE 'Uniforme%'
        `;
        const params = [];

        if (id_alumno) {
            query += ' AND cf.id_entidad = ?';
            params.push(parseInt(id_alumno, 10));
        }
        if (estatus) {
            query += ' AND cf.estatus_pago = ?';
            params.push(estatus);
        }

        query += ' ORDER BY cf.fecha_vencimiento ASC';

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('[Uniformes] Error al obtener lista:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/uniformes/alumno/:id_alumno
// Todos los uniformes de un alumno
// ============================================================
const getByAlumno = async (req, res) => {
    try {
        const v = validatePositiveInteger(req.params.id_alumno, 'id_alumno');
        if (v.error) return res.status(400).json({ message: v.error });

        const [rows] = await pool.query(`
            SELECT
                cf.*,
                (cf.monto_total - cf.monto_pagado) AS saldo_restante,
                a.nombre_completo AS alumno_nombre
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            WHERE cf.tipo_entidad = 'Alumno'
              AND cf.concepto LIKE 'Uniforme%'
              AND cf.id_entidad = ?
            ORDER BY cf.fecha_generacion DESC
        `, [v.value]);

        res.json(rows);
    } catch (error) {
        console.error('[Uniformes] Error al obtener por alumno:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/uniformes/:id
// Detalle de un cargo de uniforme + historial de abonos
// ============================================================
const getById = async (req, res) => {
    try {
        const v = validatePositiveInteger(req.params.id, 'id');
        if (v.error) return res.status(400).json({ message: v.error });

        const [cargos] = await pool.query(`
            SELECT
                cf.*,
                (cf.monto_total - cf.monto_pagado) AS saldo_restante,
                a.nombre_completo AS alumno_nombre,
                t.nombre_completo AS tutor_nombre,
                t.telefono        AS tutor_telefono
            FROM cargos_financieros cf
            JOIN alumnos a ON cf.id_entidad = a.id_alumno
            JOIN tutores t ON a.id_tutor    = t.id_tutor
            WHERE cf.id_cargo = ?
              AND cf.tipo_entidad = 'Alumno'
              AND cf.concepto LIKE 'Uniforme%'
        `, [v.value]);

        if (cargos.length === 0) {
            return res.status(404).json({ message: 'Cargo de uniforme no encontrado' });
        }

        const [abonos] = await pool.query(
            'SELECT * FROM historial_abonos WHERE id_cargo = ? ORDER BY fecha_pago DESC',
            [v.value]
        );

        res.json({ ...cargos[0], abonos });
    } catch (error) {
        console.error('[Uniformes] Error al obtener por ID:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/uniformes
// Crear un cargo de uniforme para un alumno [REQUIERE JWT]
// Body: { id_alumno, descripcion, precio_total, fecha_limite, notas }
// ============================================================
const create = async (req, res) => {
    try {
        const { id_alumno, descripcion, precio_total, fecha_limite, notas } = req.body;

        // ── Validación estricta de todos los campos ──
        const vAlumno     = validatePositiveInteger(id_alumno, 'id_alumno');
        const vPrecio     = validatePositiveNumber(precio_total, 'precio_total');
        const vFecha      = validateDate(fecha_limite, 'fecha_limite');
        const descLimpio  = sanitizeString(descripcion, 100);
        const notasLimpio = sanitizeString(notas, 500);

        // Validar descripción manualmente (campo obligatorio)
        const errores = collectErrors([vAlumno, vPrecio, vFecha]);
        if (errores) {
            return res.status(400).json({ message: 'Errores de validación', errors: errores });
        }
        if (!descLimpio || descLimpio.length === 0) {
            return res.status(400).json({ message: 'descripcion es obligatoria (máx. 100 caracteres)' });
        }

        // Verificar que el alumno existe y está activo
        const [alumnos] = await pool.query(
            "SELECT id_alumno FROM alumnos WHERE id_alumno = ? AND estatus = 'Activo'",
            [vAlumno.value]
        );
        if (alumnos.length === 0) {
            return res.status(404).json({ message: 'Alumno no encontrado o no está activo' });
        }

        const concepto = `Uniforme - ${descLimpio}`;
        const hoy      = new Date();
        const periodo  = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;

        const [result] = await pool.query(`
            INSERT INTO cargos_financieros
                (tipo_entidad, id_entidad, concepto, monto_total, monto_pagado,
                 estatus_pago, fecha_vencimiento, periodo, notas)
            VALUES ('Alumno', ?, ?, ?, 0.00, 'Pendiente', ?, ?, ?)
        `, [vAlumno.value, concepto, vPrecio.value, vFecha.value, periodo, notasLimpio]);

        const [nuevo] = await pool.query(`
            SELECT cf.*, (cf.monto_total - cf.monto_pagado) AS saldo_restante
            FROM cargos_financieros cf WHERE cf.id_cargo = ?
        `, [result.insertId]);

        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error('[Uniformes] Error al crear cargo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/uniformes/:id/abonos
// Registrar un abono parcial [REQUIERE JWT + Rate Limit Financiero]
// Body: { monto_abonado, metodo_pago, recibido_por, notas }
// ============================================================
const registrarAbono = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { monto_abonado, metodo_pago, recibido_por, notas } = req.body;

        // ── Validación estricta ──
        const vId     = validatePositiveInteger(req.params.id, 'id');
        const vMonto  = validatePositiveNumber(monto_abonado, 'monto_abonado');
        const vMetodo = validateEnum(metodo_pago, METODOS_PAGO, 'metodo_pago');
        const recibidoLimpio = sanitizeString(recibido_por, 100);
        const notasLimpio    = sanitizeString(notas, 500);

        const errores = collectErrors([vId, vMonto, vMetodo]);
        if (errores) {
            return res.status(400).json({ message: 'Errores de validación', errors: errores });
        }

        await connection.beginTransaction();

        // Obtener el cargo con FOR UPDATE (evita condiciones de carrera)
        const [cargos] = await connection.query(
            `SELECT * FROM cargos_financieros
             WHERE id_cargo = ? AND tipo_entidad = 'Alumno' AND concepto LIKE 'Uniforme%'
             FOR UPDATE`,
            [vId.value]
        );

        if (cargos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Cargo de uniforme no encontrado' });
        }

        const cargo = cargos[0];

        if (cargo.estatus_pago === 'Pagado') {
            await connection.rollback();
            return res.status(400).json({ message: 'Este uniforme ya está completamente liquidado' });
        }

        const saldo_restante = parseFloat(cargo.monto_total) - parseFloat(cargo.monto_pagado);
        const abono          = vMonto.value;

        if (abono > saldo_restante + 0.001) {
            await connection.rollback();
            return res.status(400).json({
                message: `El abono ($${abono.toFixed(2)}) excede el saldo restante ($${saldo_restante.toFixed(2)}). Monto máximo: $${saldo_restante.toFixed(2)}`,
                saldo_restante: saldo_restante.toFixed(2)
            });
        }

        await connection.query(`
            INSERT INTO historial_abonos (id_cargo, monto_abonado, metodo_pago, recibido_por, notas)
            VALUES (?, ?, ?, ?, ?)
        `, [vId.value, abono, vMetodo.value || 'Efectivo', recibidoLimpio, notasLimpio]);

        const nuevo_monto_pagado = parseFloat(cargo.monto_pagado) + abono;
        const nuevo_estatus      = nuevo_monto_pagado >= parseFloat(cargo.monto_total) ? 'Pagado' : 'Parcial';

        await connection.query(
            'UPDATE cargos_financieros SET monto_pagado = ?, estatus_pago = ? WHERE id_cargo = ?',
            [nuevo_monto_pagado, nuevo_estatus, vId.value]
        );

        await connection.commit();

        const [actualizado] = await pool.query(`
            SELECT cf.*, (cf.monto_total - cf.monto_pagado) AS saldo_restante
            FROM cargos_financieros cf WHERE cf.id_cargo = ?
        `, [vId.value]);

        const nuevo_saldo = parseFloat(cargo.monto_total) - nuevo_monto_pagado;

        res.status(201).json({
            message: nuevo_estatus === 'Pagado'
                ? '✅ ¡Uniforme liquidado completamente! Ya puede ser entregado.'
                : `Abono registrado. Saldo restante: $${nuevo_saldo.toFixed(2)}`,
            cargo: actualizado[0]
        });

    } catch (error) {
        await connection.rollback();
        console.error('[Uniformes] Error al registrar abono:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};

// ============================================================
// PATCH /api/uniformes/:id/entregar
// Marcar entrega física del uniforme [REQUIERE JWT]
// REGLA: Solo si estatus_pago = 'Pagado'
// Body: { entregado_por }
// ============================================================
const marcarEntregado = async (req, res) => {
    try {
        const vId = validatePositiveInteger(req.params.id, 'id');
        if (vId.error) return res.status(400).json({ message: vId.error });

        const entregado_por = sanitizeString(req.body.entregado_por, 100);

        const [cargos] = await pool.query(
            `SELECT * FROM cargos_financieros
             WHERE id_cargo = ? AND tipo_entidad = 'Alumno' AND concepto LIKE 'Uniforme%'`,
            [vId.value]
        );

        if (cargos.length === 0) {
            return res.status(404).json({ message: 'Cargo de uniforme no encontrado' });
        }

        const cargo = cargos[0];

        if (cargo.estatus_pago !== 'Pagado') {
            const saldo = (parseFloat(cargo.monto_total) - parseFloat(cargo.monto_pagado)).toFixed(2);
            return res.status(400).json({
                message: `🚫 No se puede entregar el uniforme. Saldo pendiente: $${saldo}`,
                saldo_restante: saldo
            });
        }

        if (cargo.notas && cargo.notas.includes('ENTREGADO:')) {
            return res.status(400).json({ message: 'Este uniforme ya fue marcado como entregado anteriormente' });
        }

        const fecha_entrega      = new Date().toISOString().split('T')[0];
        const nota_entrega       = `ENTREGADO: ${fecha_entrega}${entregado_por ? ` — por ${entregado_por}` : ''}`;
        const notas_actualizadas = cargo.notas ? `${cargo.notas} | ${nota_entrega}` : nota_entrega;

        await pool.query(
            'UPDATE cargos_financieros SET notas = ? WHERE id_cargo = ?',
            [notas_actualizadas, vId.value]
        );

        res.json({
            message: `✅ Uniforme marcado como entregado el ${fecha_entrega}`,
            id_cargo:      vId.value,
            fecha_entrega,
            entregado_por: entregado_por || 'No especificado'
        });

    } catch (error) {
        console.error('[Uniformes] Error al marcar entregado:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAll,
    getByAlumno,
    getById,
    create,
    registrarAbono,
    marcarEntregado
};
