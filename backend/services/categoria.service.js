/**
 * ============================================================
 * SporDT — Servicio de Categorías (backend)
 * ============================================================
 * Lógica de acceso a base de datos para la entidad Categoría.
 * También exporta `calcularEdad`, función utilitaria usada
 * por el servicio de alumnos y el motor de cobranza.
 * ============================================================
 */

const pool = require('../config/db');

// ── Utilidad pura (sin BD) ────────────────────────────────────

/**
 * Calcula la edad en años completos a partir de una fecha de nacimiento.
 * @param {string|Date} fechaNacimiento
 * @returns {number}
 */
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = nacimiento.getMonth();
    if (
        mesActual < mesNacimiento ||
        (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())
    ) {
        edad--;
    }
    return edad;
}

// ── Queries SELECT ────────────────────────────────────────────

/**
 * Listar todas las categorías activas con conteo de alumnos activos.
 */
const findAll = async () => {
    const [rows] = await pool.query(`
        SELECT
            c.id_categoria,
            c.nombre_categoria,
            c.edad_minima,
            c.edad_maxima,
            c.descripcion,
            c.activo,
            COUNT(a.id_alumno) AS total_alumnos
        FROM categorias c
        LEFT JOIN alumnos a
            ON a.id_categoria = c.id_categoria AND a.estatus = 'Activo'
        WHERE c.activo = 1
        GROUP BY c.id_categoria
        ORDER BY c.edad_minima ASC
    `);
    return rows;
};

/**
 * Obtener una categoría por ID.
 */
const findById = async (id) => {
    const [rows] = await pool.query(
        'SELECT * FROM categorias WHERE id_categoria = ?',
        [id]
    );
    return rows[0] || null;
};

/**
 * Determinar la categoría correspondiente a una fecha de nacimiento.
 * @returns {{ categoria: object|null, edad: number, message: string }}
 */
const resolverPorEdad = async (fechaNacimiento) => {
    const edad = calcularEdad(fechaNacimiento);

    if (edad < 0) {
        const err = new Error('La fecha de nacimiento no puede ser futura');
        err.status = 400;
        throw err;
    }

    const [rows] = await pool.query(
        'SELECT * FROM categorias WHERE activo = 1 AND edad_minima <= ? AND edad_maxima >= ? LIMIT 1',
        [edad, edad]
    );

    if (rows.length === 0) {
        return {
            categoria: null,
            edad,
            message: `Edad fuera de rango (${edad} años). No existe una categoría para esta edad.`
        };
    }

    return {
        categoria: rows[0],
        edad,
        message: `Categoría asignada: ${rows[0].nombre_categoria} (${edad} años)`
    };
};

// ── Queries de escritura ──────────────────────────────────────

/**
 * Crear una nueva categoría.
 */
const create = async ({ nombre_categoria, edad_minima, edad_maxima, descripcion }) => {
    const [result] = await pool.query(
        'INSERT INTO categorias (nombre_categoria, edad_minima, edad_maxima, descripcion) VALUES (?, ?, ?, ?)',
        [nombre_categoria, edad_minima, edad_maxima, descripcion || null]
    );
    const [rows] = await pool.query('SELECT * FROM categorias WHERE id_categoria = ?', [result.insertId]);
    return rows[0];
};

/**
 * Actualizar una categoría existente.
 */
const update = async (id, { nombre_categoria, edad_minima, edad_maxima, descripcion }) => {
    const [result] = await pool.query(
        'UPDATE categorias SET nombre_categoria = ?, edad_minima = ?, edad_maxima = ?, descripcion = ? WHERE id_categoria = ?',
        [nombre_categoria, edad_minima, edad_maxima, descripcion || null, id]
    );
    if (result.affectedRows === 0) return null;

    const [rows] = await pool.query('SELECT * FROM categorias WHERE id_categoria = ?', [id]);
    return rows[0];
};

/**
 * Soft-delete: desactiva la categoría solo si no tiene alumnos activos.
 */
const softDelete = async (id) => {
    const [[{ total }]] = await pool.query(
        "SELECT COUNT(*) AS total FROM alumnos WHERE id_categoria = ? AND estatus = 'Activo'",
        [id]
    );

    if (total > 0) {
        const err = new Error(`No se puede desactivar esta categoría porque tiene ${total} alumno(s) activo(s) asignado(s).`);
        err.status = 409;
        throw err;
    }

    const [result] = await pool.query(
        'UPDATE categorias SET activo = 0 WHERE id_categoria = ?',
        [id]
    );
    return result.affectedRows > 0;
};

module.exports = { calcularEdad, findAll, findById, resolverPorEdad, create, update, softDelete };
