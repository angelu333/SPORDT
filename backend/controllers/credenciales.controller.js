const pool = require('../config/db');

// ============================================================
// GET /api/credenciales
// Listar todas las credenciales emitidas con información cruzada
// ============================================================
const getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                cr.*,
                j.nombre_completo AS nombre_jugador,
                j.curp AS curp_jugador,
                j.numero_dorsal AS dorsal_jugador,
                eq.id_equipo,
                eq.nombre_equipo,
                t.nombre_torneo,
                cf.estatus_pago AS estatus_pago_cargo
            FROM credenciales cr
            JOIN jugadores_externos j ON cr.id_jugador = j.id_jugador
            JOIN equipos_externos eq ON j.id_equipo = eq.id_equipo
            JOIN torneos t ON cr.id_torneo = t.id_torneo
            LEFT JOIN cargos_financieros cf ON cr.id_cargo = cf.id_cargo
            ORDER BY cr.fecha_emision DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener credenciales:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/credenciales/filtrar
// Obtener plantilla de jugadores de un equipo indicando su estado de credencial para un torneo
// Query params: ?id_equipo=1&id_torneo=2
// ============================================================
const getByEquipoYTorneo = async (req, res) => {
    try {
        const { id_equipo, id_torneo } = req.query;

        if (!id_equipo || !id_torneo) {
            return res.status(400).json({ message: 'Faltan parámetros de consulta obligatorios (id_equipo, id_torneo)' });
        }

        const query = `
            SELECT 
                j.*,
                cr.id_credencial,
                cr.codigo_credencial,
                cr.costo,
                cr.estatus AS estatus_credencial,
                cr.fecha_emision,
                cf.id_cargo,
                cf.estatus_pago AS estatus_pago_cargo
            FROM jugadores_externos j
            LEFT JOIN credenciales cr ON j.id_jugador = cr.id_jugador AND cr.id_torneo = ?
            LEFT JOIN cargos_financieros cf ON cr.id_cargo = cf.id_cargo
            WHERE j.id_equipo = ? AND j.activo = 1
            ORDER BY j.nombre_completo ASC
        `;
        const [rows] = await pool.query(query, [id_torneo, id_equipo]);
        res.json(rows);
    } catch (error) {
        console.error('Error al filtrar jugadores por credencial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/credenciales
// Emitir credencial obligatoria y generar cargo financiero automático para el equipo ($100)
// ============================================================
const create = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id_jugador, id_torneo, costo } = req.body;

        if (!id_jugador || !id_torneo) {
            return res.status(400).json({ message: 'Faltan campos obligatorios (id_jugador, id_torneo)' });
        }

        // Costo por defecto: $100.00 MXN
        const costoCredencial = costo || 100.00;

        await connection.beginTransaction();

        // 1. Validar que no exista una credencial activa o pendiente para ese jugador en ese torneo
        const [credencialesExistentes] = await connection.query(
            'SELECT id_credencial FROM credenciales WHERE id_jugador = ? AND id_torneo = ?',
            [id_jugador, id_torneo]
        );

        if (credencialesExistentes.length > 0) {
            await connection.rollback();
            return res.status(400).json({ message: 'El jugador ya cuenta con una credencial emitida para este torneo' });
        }

        // 2. Obtener datos del jugador y su equipo
        const [jugadores] = await connection.query(
            `SELECT j.nombre_completo, eq.id_equipo, eq.nombre_equipo 
             FROM jugadores_externos j 
             JOIN equipos_externos eq ON j.id_equipo = eq.id_equipo 
             WHERE j.id_jugador = ? AND j.activo = 1`, [id_jugador]
        );

        if (jugadores.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Jugador no encontrado o inactivo' });
        }
        const jugador = jugadores[0];

        // 3. Obtener datos del torneo
        const [torneos] = await connection.query(
            'SELECT nombre_torneo FROM torneos WHERE id_torneo = ?', [id_torneo]
        );
        if (torneos.length === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Torneo no encontrado' });
        }
        const torneo = torneos[0];

        // 4. Crear automáticamente el cargo financiero al equipo ($100.00 MXN)
        const hoy = new Date();
        const fechaVencimiento = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const periodo = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');
        const conceptoCargo = `Credencial - ${jugador.nombre_completo} (${torneo.nombre_torneo})`;

        const [cargoResult] = await connection.query(
            `INSERT INTO cargos_financieros 
             (tipo_entidad, id_entidad, concepto, monto_total, monto_pagado, estatus_pago, fecha_vencimiento, periodo, notas) 
             VALUES ('Equipo', ?, ?, ?, 0.00, 'Pendiente', ?, ?, 'Cargo automático generado por emisión de credencial obligatoria')`,
            [jugador.id_equipo, conceptoCargo, costoCredencial, fechaVencimiento, periodo]
        );
        const id_cargo = cargoResult.insertId;

        // 5. Autogenerar el código único de credencial (ej: CR-2026-T1-J45-1234)
        const rnd = String(Math.floor(1000 + Math.random() * 9000));
        const codigo_credencial = `CR-${periodo.replace('-', '')}-T${id_torneo}-J${id_jugador}-${rnd}`;

        // 6. Insertar la Credencial
        const [credResult] = await connection.query(
            `INSERT INTO credenciales (id_jugador, id_torneo, codigo_credencial, costo, id_cargo, estatus) 
             VALUES (?, ?, ?, ?, ?, 'Activa')`,
            [id_jugador, id_torneo, codigo_credencial, costoCredencial, id_cargo]
        );

        await connection.commit();

        // Responder con la credencial recién creada
        const [nuevaCredencial] = await pool.query(
            `SELECT cr.*, j.nombre_completo AS nombre_jugador, eq.nombre_equipo, t.nombre_torneo 
             FROM credenciales cr 
             JOIN jugadores_externos j ON cr.id_jugador = j.id_jugador 
             JOIN equipos_externos eq ON j.id_equipo = eq.id_equipo 
             JOIN torneos t ON cr.id_torneo = t.id_torneo 
             WHERE cr.id_credencial = ?`, [credResult.insertId]
        );

        res.status(201).json(nuevaCredencial[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error al emitir credencial (transacción revertida):', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};

// ============================================================
// PUT /api/credenciales/:id/revocar
// Cambiar el estatus de una credencial a 'Inactiva' o 'Vencida'
// ============================================================
const revoke = async (req, res) => {
    try {
        const { id } = req.params;
        const { estatus } = req.body; // 'Inactiva' o 'Vencida'

        if (!estatus || !['Inactiva', 'Vencida', 'Activa'].includes(estatus)) {
            return res.status(400).json({ message: 'Estatus proporcionado no es válido' });
        }

        const [result] = await pool.query(
            'UPDATE credenciales SET estatus = ? WHERE id_credencial = ?',
            [estatus, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Credencial no encontrada' });
        }

        res.json({ message: `Estatus de credencial actualizado a ${estatus}` });
    } catch (error) {
        console.error('Error al actualizar estatus de credencial:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAll,
    getByEquipoYTorneo,
    create,
    revoke
};
