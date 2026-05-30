const pool = require('../config/db');

// ============================================================
// GET /api/equipos
// Listar todos los equipos externos activos con total de jugadores
// ============================================================
const getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                eq.*,
                COUNT(j.id_jugador) AS total_jugadores
            FROM equipos_externos eq
            LEFT JOIN jugadores_externos j ON eq.id_equipo = j.id_equipo AND j.activo = 1
            WHERE eq.activo = 1
            GROUP BY eq.id_equipo
            ORDER BY eq.fecha_inscripcion DESC
        `;
        const [rows] = await pool.query(query);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener equipos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/equipos/:id
// Detalle de un equipo (información, plantilla de jugadores y cargos)
// ============================================================
const getById = async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Obtener datos del equipo
        const [equipos] = await pool.query(
            'SELECT * FROM equipos_externos WHERE id_equipo = ? AND activo = 1', [id]
        );
        if (equipos.length === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado o inactivo' });
        }
        const equipo = equipos[0];

        // 2. Obtener plantilla de jugadores
        const [jugadores] = await pool.query(
            'SELECT * FROM jugadores_externos WHERE id_equipo = ? AND activo = 1 ORDER BY nombre_completo ASC', [id]
        );

        // 3. Obtener cargos financieros asociados al equipo
        const [cargos] = await pool.query(
            'SELECT * FROM cargos_financieros WHERE tipo_entidad = "Equipo" AND id_entidad = ? ORDER BY fecha_generacion DESC', [id]
        );

        res.json({
            ...equipo,
            jugadores,
            cargos
        });
    } catch (error) {
        console.error('Error al obtener detalle del equipo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/equipos
// Registrar equipo externo y asignarle cargo automático de inscripción ($500)
// ============================================================
const create = async (req, res) => {
    // Usar conexión de transacción para asegurar consistencia ACID
    const connection = await pool.getConnection();
    try {
        const { nombre_equipo, nombre_delegado, telefono_delegado, escudo, fecha_inscripcion } = req.body;

        if (!nombre_equipo || !nombre_delegado || !telefono_delegado) {
            return res.status(400).json({ message: 'Faltan campos obligatorios (nombre_equipo, nombre_delegado, telefono_delegado)' });
        }

        await connection.beginTransaction();

        // 1. Insertar el equipo
        const fInscripcion = fecha_inscripcion ? fecha_inscripcion.toString().slice(0, 10) : new Date().toISOString().slice(0, 10);
        const [teamResult] = await connection.query(
            `INSERT INTO equipos_externos 
             (nombre_equipo, nombre_delegado, telefono_delegado, escudo, fecha_inscripcion, activo) 
             VALUES (?, ?, ?, ?, ?, 1)`,
            [nombre_equipo, nombre_delegado, telefono_delegado, escudo || null, fInscripcion]
        );
        const id_equipo = teamResult.insertId;

        // 2. Crear automáticamente el cargo financiero de inscripción ($500.00 MXN)
        // Fecha de vencimiento: 7 días a partir de hoy
        const hoy = new Date();
        const fechaVencimiento = new Date(hoy.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const periodo = hoy.getFullYear() + '-' + String(hoy.getMonth() + 1).padStart(2, '0');

        await connection.query(
            `INSERT INTO cargos_financieros 
             (tipo_entidad, id_entidad, concepto, monto_total, monto_pagado, estatus_pago, fecha_vencimiento, periodo, notas) 
             VALUES ('Equipo', ?, ?, 500.00, 0.00, 'Pendiente', ?, ?, 'Cargo automático por inscripción de equipo externo')`,
            [id_equipo, `Inscripción Liga Externa - ${nombre_equipo}`, fechaVencimiento, periodo]
        );

        await connection.commit();

        // Obtener el equipo creado para responder
        const [nuevoEquipo] = await pool.query('SELECT * FROM equipos_externos WHERE id_equipo = ?', [id_equipo]);
        res.status(201).json(nuevoEquipo[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error al registrar equipo (transacción revertida):', error);
        res.status(500).json({ message: 'Error interno del servidor al registrar el equipo' });
    } finally {
        connection.release();
    }
};

// ============================================================
// PUT /api/equipos/:id
// Actualizar información del equipo externo
// ============================================================
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_equipo, nombre_delegado, telefono_delegado, escudo, fecha_inscripcion } = req.body;

        if (!nombre_equipo || !nombre_delegado || !telefono_delegado) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const fInscripcion = fecha_inscripcion ? fecha_inscripcion.toString().slice(0, 10) : new Date().toISOString().slice(0, 10);

        const [result] = await pool.query(
            `UPDATE equipos_externos 
             SET nombre_equipo = ?, nombre_delegado = ?, telefono_delegado = ?, escudo = ?, fecha_inscripcion = ?
             WHERE id_equipo = ? AND activo = 1`,
            [nombre_equipo, nombre_delegado, telefono_delegado, escudo || null, fInscripcion, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado o inactivo' });
        }

        res.json({ message: 'Equipo actualizado correctamente' });
    } catch (error) {
        console.error('Error al actualizar equipo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// DELETE /api/equipos/:id
// Desactivar equipo externo (soft delete)
// ============================================================
const deleteTeam = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'UPDATE equipos_externos SET activo = 0 WHERE id_equipo = ?', [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado' });
        }

        res.json({ message: 'Equipo desactivado correctamente' });
    } catch (error) {
        console.error('Error al desactivar equipo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/equipos/:id/jugadores
// Agregar un jugador a la plantilla de un equipo
// ============================================================
const addPlayer = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, curp, numero_dorsal } = req.body;

        if (!nombre_completo) {
            return res.status(400).json({ message: 'El nombre del jugador es obligatorio' });
        }

        // Validar si el equipo existe y está activo
        const [equipos] = await pool.query('SELECT id_equipo FROM equipos_externos WHERE id_equipo = ? AND activo = 1', [id]);
        if (equipos.length === 0) {
            return res.status(404).json({ message: 'Equipo no encontrado' });
        }

        // Insertar jugador
        const [result] = await pool.query(
            `INSERT INTO jugadores_externos (id_equipo, nombre_completo, curp, numero_dorsal, activo) 
             VALUES (?, ?, ?, ?, 1)`,
            [id, nombre_completo, curp || null, numero_dorsal || null]
        );

        const [nuevoJugador] = await pool.query('SELECT * FROM jugadores_externos WHERE id_jugador = ?', [result.insertId]);
        res.status(201).json(nuevoJugador[0]);
    } catch (error) {
        console.error('Error al agregar jugador:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un jugador registrado con ese CURP' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// DELETE /api/jugadores/:id
// Dar de baja/desactivar un jugador de la plantilla (soft delete)
// ============================================================
const removePlayer = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'UPDATE jugadores_externos SET activo = 0 WHERE id_jugador = ?', [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Jugador no encontrado' });
        }

        res.json({ message: 'Jugador dado de baja correctamente de la plantilla' });
    } catch (error) {
        console.error('Error al desactivar jugador:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteTeam,
    addPlayer,
    removePlayer
};
