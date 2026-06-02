/**
 * ============================================================
 * SporDT — Servicio de Tutores (backend)
 * ============================================================
 * Lógica de acceso a base de datos para la entidad Tutor.
 * ============================================================
 */

const pool = require('../config/db');

// ── Queries SELECT ────────────────────────────────────────────

/**
 * Listar todos los tutores activos con conteo de alumnos activos.
 * Soporta paginación con page y limit.
 */
const findAll = async ({ page = 1, limit = 50 } = {}) => {
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
        'SELECT COUNT(*) AS total FROM tutores WHERE activo = 1'
    );

    const [rows] = await pool.query(`
        SELECT 
            t.*,
            COUNT(a.id_alumno) AS total_alumnos
        FROM tutores t
        LEFT JOIN alumnos a 
            ON a.id_tutor = t.id_tutor AND a.estatus = 'Activo'
        WHERE t.activo = 1
        GROUP BY t.id_tutor
        ORDER BY t.fecha_registro DESC
        LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)]);

    return { data: rows, total, page: Number(page), limit: Number(limit) };
};

/**
 * Obtener un tutor por ID.
 */
const findById = async (id) => {
    const [rows] = await pool.query(
        'SELECT * FROM tutores WHERE id_tutor = ?',
        [id]
    );
    return rows[0] || null;
};

// ── Queries de escritura ──────────────────────────────────────

/**
 * Crear un nuevo tutor.
 */
const create = async ({ nombre_completo, telefono, email, direccion }) => {
    const [result] = await pool.query(
        'INSERT INTO tutores (nombre_completo, telefono, email, direccion) VALUES (?, ?, ?, ?)',
        [nombre_completo, telefono, email || null, direccion || null]
    );
    const [rows] = await pool.query('SELECT * FROM tutores WHERE id_tutor = ?', [result.insertId]);
    return rows[0];
};

/**
 * Actualizar un tutor existente.
 */
const update = async (id, { nombre_completo, telefono, email, direccion }) => {
    const [result] = await pool.query(
        'UPDATE tutores SET nombre_completo = ?, telefono = ?, email = ?, direccion = ? WHERE id_tutor = ?',
        [nombre_completo, telefono, email || null, direccion || null, id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query('SELECT * FROM tutores WHERE id_tutor = ?', [id]);
    return rows[0];
};

/**
 * Soft-delete: desactiva el tutor (activo = 0).
 */
const softDelete = async (id) => {
    const [result] = await pool.query(
        'UPDATE tutores SET activo = 0 WHERE id_tutor = ?',
        [id]
    );
    return result.affectedRows > 0;
};

module.exports = { findAll, findById, create, update, softDelete };
