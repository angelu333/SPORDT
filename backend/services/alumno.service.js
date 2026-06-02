/**
 * ============================================================
 * SporDT — Servicio de Alumnos (backend)
 * ============================================================
 * Contiene toda la lógica de acceso a la base de datos
 * para la entidad Alumno. Los controladores solo llaman
 * a estas funciones — no hacen pool.query directamente.
 * ============================================================
 */

const pool = require('../config/db');

// ── Helpers internos ─────────────────────────────────────────

/**
 * Determina el id_categoria activo según la fecha de nacimiento del alumno.
 * Importa calcularEdad del servicio de categorías para no duplicar lógica.
 */
const { calcularEdad } = require('./categoria.service');

const obtenerIdCategoriaPorEdad = async (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const edad = calcularEdad(fechaNacimiento);
    const [rows] = await pool.query(
        'SELECT id_categoria FROM categorias WHERE activo = 1 AND edad_minima <= ? AND edad_maxima >= ? LIMIT 1',
        [edad, edad]
    );
    return rows.length > 0 ? rows[0].id_categoria : null;
};

// ── Queries SELECT ────────────────────────────────────────────

/**
 * Listar todos los alumnos activos / inactivos (excluye Baja).
 * Incluye datos del tutor y categoría mediante JOIN.
 * Soporta paginación con page y limit.
 */
const findAll = async ({ page = 1, limit = 50 } = {}) => {
    const offset = (page - 1) * limit;

    const [[{ total }]] = await pool.query(
        `SELECT COUNT(*) AS total FROM alumnos WHERE estatus != 'Baja'`
    );

    const [rows] = await pool.query(`
        SELECT 
            a.*, 
            t.nombre_completo AS tutor_nombre, 
            c.nombre_categoria 
        FROM alumnos a
        LEFT JOIN tutores t ON a.id_tutor = t.id_tutor
        LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
        WHERE a.estatus != 'Baja'
        ORDER BY a.fecha_inscripcion DESC
        LIMIT ? OFFSET ?
    `, [Number(limit), Number(offset)]);

    return { data: rows, total, page: Number(page), limit: Number(limit) };
};

/**
 * Obtener un alumno por su ID.
 */
const findById = async (id) => {
    const [rows] = await pool.query(`
        SELECT 
            a.*, 
            t.nombre_completo AS tutor_nombre, 
            c.nombre_categoria 
        FROM alumnos a
        LEFT JOIN tutores t ON a.id_tutor = t.id_tutor
        LEFT JOIN categorias c ON a.id_categoria = c.id_categoria
        WHERE a.id_alumno = ? AND a.estatus != 'Baja'
    `, [id]);

    return rows[0] || null;
};

// ── Queries de escritura ──────────────────────────────────────

/**
 * Crear un nuevo alumno. La categoría se asigna automáticamente por la edad.
 * @returns {{ insertId: number, alumno: object }}
 */
const create = async ({ id_tutor, nombre_completo, fecha_nacimiento, genero, curp, estatus }) => {
    // Verificar que el tutor existe y está activo
    const [tutorRows] = await pool.query(
        'SELECT id_tutor FROM tutores WHERE id_tutor = ? AND activo = 1',
        [id_tutor]
    );
    if (tutorRows.length === 0) {
        const err = new Error('El tutor especificado no existe o está inactivo');
        err.status = 400;
        throw err;
    }

    const id_categoria = await obtenerIdCategoriaPorEdad(fecha_nacimiento);
    const estatus_inicial = estatus || 'Activo';

    const [result] = await pool.query(
        `INSERT INTO alumnos (id_tutor, nombre_completo, fecha_nacimiento, genero, curp, id_categoria, estatus) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [id_tutor, nombre_completo, fecha_nacimiento, genero || null, curp || null, id_categoria, estatus_inicial]
    );

    const [rows] = await pool.query('SELECT * FROM alumnos WHERE id_alumno = ?', [result.insertId]);
    return { insertId: result.insertId, alumno: rows[0] };
};

/**
 * Actualizar un alumno existente. La categoría se recalcula si cambia la fecha.
 */
const update = async (id, { id_tutor, nombre_completo, fecha_nacimiento, genero, curp, estatus }) => {
    const id_categoria = await obtenerIdCategoriaPorEdad(fecha_nacimiento);

    const [result] = await pool.query(
        `UPDATE alumnos 
         SET id_tutor = ?, nombre_completo = ?, fecha_nacimiento = ?, genero = ?, curp = ?, id_categoria = ?, estatus = ? 
         WHERE id_alumno = ?`,
        [id_tutor, nombre_completo, fecha_nacimiento, genero || null, curp || null, id_categoria, estatus || 'Activo', id]
    );

    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query('SELECT * FROM alumnos WHERE id_alumno = ?', [id]);
    return rows[0];
};

/**
 * Soft-delete: cambia el estatus del alumno a 'Baja'.
 */
const softDelete = async (id) => {
    const [result] = await pool.query(
        "UPDATE alumnos SET estatus = 'Baja' WHERE id_alumno = ?",
        [id]
    );
    return result.affectedRows > 0;
};

module.exports = { findAll, findById, create, update, softDelete };
