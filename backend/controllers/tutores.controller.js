const pool = require('../config/db');

// Obtener todos los tutores activos
const getAll = async (req, res) => {
    try {
        const [rows] = await pool.query(
            'SELECT * FROM tutores WHERE activo = 1 ORDER BY fecha_registro DESC'
        );
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener tutores:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Obtener un tutor por ID
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM tutores WHERE id_tutor = ?',
            [id]
        );

        if (rows.length === 0) {
            return res.status(404).json({ message: 'Tutor no encontrado' });
        }

        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener tutor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Crear un nuevo tutor
const create = async (req, res) => {
    try {
        const { nombre_completo, telefono, email, direccion } = req.body;

        // Validaciones básicas
        if (!nombre_completo || !telefono) {
            return res.status(400).json({
                message: 'El nombre completo y el teléfono son obligatorios'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO tutores (nombre_completo, telefono, email, direccion) VALUES (?, ?, ?, ?)',
            [nombre_completo, telefono, email || null, direccion || null]
        );

        // Retornar el tutor recién creado
        const [newTutor] = await pool.query(
            'SELECT * FROM tutores WHERE id_tutor = ?',
            [result.insertId]
        );

        res.status(201).json(newTutor[0]);
    } catch (error) {
        console.error('Error al crear tutor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Actualizar un tutor existente
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_completo, telefono, email, direccion } = req.body;

        if (!nombre_completo || !telefono) {
            return res.status(400).json({
                message: 'El nombre completo y el teléfono son obligatorios'
            });
        }

        const [result] = await pool.query(
            'UPDATE tutores SET nombre_completo = ?, telefono = ?, email = ?, direccion = ? WHERE id_tutor = ?',
            [nombre_completo, telefono, email || null, direccion || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tutor no encontrado' });
        }

        // Retornar el tutor actualizado
        const [updated] = await pool.query(
            'SELECT * FROM tutores WHERE id_tutor = ?',
            [id]
        );

        res.json(updated[0]);
    } catch (error) {
        console.error('Error al actualizar tutor:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// Desactivar un tutor (soft delete)
const remove = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'UPDATE tutores SET activo = 0 WHERE id_tutor = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Tutor no encontrado' });
        }

        res.json({ message: 'Tutor desactivado correctamente' });
    } catch (error) {
        console.error('Error al desactivar tutor:', error);
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
