const pool = require('../config/db');
const { calcularEdad } = require('./categorias.controller');
const { generarCargoInscripcion } = require('../billing.engine');

// Función interna para determinar el ID de categoría en base a la fecha de nacimiento
const obtenerIdCategoriaPorEdad = async (fechaNacimiento) => {
    if (!fechaNacimiento) return null;
    const edad = calcularEdad(fechaNacimiento);
    const [rows] = await pool.query(
        'SELECT id_categoria FROM categorias WHERE activo = 1 AND edad_minima <= ? AND edad_maxima >= ? LIMIT 1',
        [edad, edad]
    );
    return rows.length > 0 ? rows[0].id_categoria : null;
};

// ============================================================
// GET /api/alumnos
// Listar todos los alumnos (Activos e Inactivos), excluyendo 'Baja'
// Incluye datos del tutor y de la categoría (JOIN)
// ============================================================
const getAll = async (req, res) => {
    try {
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
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener alumnos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/alumnos/:id
// Obtener un alumno por ID (con datos del tutor y categoría)
// ============================================================
const getById = async (req, res) => {
    try {
        const { id } = req.params;
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

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Alumno no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener alumno:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/alumnos
// Crear un nuevo alumno
// ============================================================
const create = async (req, res) => {
    try {
        const { id_tutor, nombre_completo, fecha_nacimiento, genero, curp, estatus } = req.body;

        // Validaciones básicas
        if (!id_tutor || !nombre_completo || !fecha_nacimiento) {
            return res.status(400).json({
                message: 'El tutor, nombre completo y fecha de nacimiento son obligatorios'
            });
        }

        // Validar que el tutor existe y está activo
        const [tutor] = await pool.query('SELECT id_tutor FROM tutores WHERE id_tutor = ? AND activo = 1', [id_tutor]);
        if (tutor.length === 0) {
            return res.status(400).json({ message: 'El tutor especificado no existe o está inactivo' });
        }

        // Calcular categoría automáticamente por la edad en el backend
        // (Aunque el frontend también lo hace para mostrarlo en la UI, el backend lo asegura)
        const id_categoria = await obtenerIdCategoriaPorEdad(fecha_nacimiento);

        const estatus_inicial = estatus || 'Activo';

        const [result] = await pool.query(
            `INSERT INTO alumnos 
            (id_tutor, nombre_completo, fecha_nacimiento, genero, curp, id_categoria, estatus) 
            VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [id_tutor, nombre_completo, fecha_nacimiento, genero || null, curp || null, id_categoria, estatus_inicial]
        );

        // Retornar el alumno recién creado
        const [nuevoAlumno] = await pool.query(
            'SELECT * FROM alumnos WHERE id_alumno = ?',
            [result.insertId]
        );

        res.status(201).json(nuevoAlumno[0]);

        // Disparar cargo de inscripcion automaticamente (no bloquea la respuesta)
        generarCargoInscripcion(result.insertId);

    } catch (error) {
        console.error('Error al crear alumno:', error);
        // Manejo de error de CURP duplicado (UNIQUE constraint)
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un alumno con esta CURP.' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// PUT /api/alumnos/:id
// Actualizar un alumno existente
// ============================================================
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { id_tutor, nombre_completo, fecha_nacimiento, genero, curp, estatus } = req.body;

        if (!id_tutor || !nombre_completo || !fecha_nacimiento) {
            return res.status(400).json({
                message: 'El tutor, nombre completo y fecha de nacimiento son obligatorios'
            });
        }

        // Recalcular categoría por si cambió la fecha de nacimiento
        const id_categoria = await obtenerIdCategoriaPorEdad(fecha_nacimiento);

        const [result] = await pool.query(
            `UPDATE alumnos 
             SET id_tutor = ?, nombre_completo = ?, fecha_nacimiento = ?, genero = ?, curp = ?, id_categoria = ?, estatus = ? 
             WHERE id_alumno = ?`,
            [id_tutor, nombre_completo, fecha_nacimiento, genero || null, curp || null, id_categoria, estatus || 'Activo', id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Alumno no encontrado' });
        }

        // Retornar el alumno actualizado
        const [updated] = await pool.query(
            'SELECT * FROM alumnos WHERE id_alumno = ?',
            [id]
        );

        res.json(updated[0]);
    } catch (error) {
        console.error('Error al actualizar alumno:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ message: 'Ya existe un alumno con esta CURP.' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// DELETE /api/alumnos/:id
// Soft-delete: cambiar estatus a 'Baja'
// ============================================================
const remove = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            "UPDATE alumnos SET estatus = 'Baja' WHERE id_alumno = ?",
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Alumno no encontrado' });
        }

        res.json({ message: 'Alumno dado de baja correctamente' });
    } catch (error) {
        console.error('Error al dar de baja alumno:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove
};
