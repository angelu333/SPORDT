const pool = require('../config/db');

// ============================================================
// GET /api/torneos
// Listar todos los torneos con sus categorías asociadas
// ============================================================
const getAll = async (req, res) => {
    try {
        const query = `
            SELECT 
                t.*,
                GROUP_CONCAT(c.nombre_categoria ORDER BY c.nombre_categoria ASC) AS nombres_categorias,
                GROUP_CONCAT(c.id_categoria ORDER BY c.id_categoria ASC) AS ids_categorias
            FROM torneos t
            LEFT JOIN torneo_categorias tc ON t.id_torneo = tc.id_torneo
            LEFT JOIN categorias c ON tc.id_categoria = c.id_categoria
            GROUP BY t.id_torneo
            ORDER BY t.fecha_inicio DESC
        `;
        const [rows] = await pool.query(query);

        // Formatear el string de categorías agrupadas en un array
        const formattedRows = rows.map(row => ({
            ...row,
            estatus: row.estatus === 'En curso' ? 'Activo' : row.estatus,
            categorias: row.ids_categorias 
                ? row.ids_categorias.split(',').map((id, index) => ({
                    id_categoria: parseInt(id),
                    nombre_categoria: row.nombres_categorias.split(',')[index]
                  }))
                : []
        }));

        res.json(formattedRows);
    } catch (error) {
        console.error('Error al obtener torneos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/torneos/:id
// Obtener detalle de un torneo (incluyendo reglamento y categorías)
// ============================================================
const getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [torneos] = await pool.query(
            'SELECT * FROM torneos WHERE id_torneo = ?', [id]
        );
        if (torneos.length === 0) {
            return res.status(404).json({ message: 'Torneo no encontrado' });
        }
        const torneo = torneos[0];

        // Obtener categorías participantes
        const [categorias] = await pool.query(
            `SELECT c.* 
             FROM torneo_categorias tc 
             JOIN categorias c ON tc.id_categoria = c.id_categoria 
             WHERE tc.id_torneo = ? 
             ORDER BY c.nombre_categoria ASC`, [id]
        );

        res.json({
            ...torneo,
            estatus: torneo.estatus === 'En curso' ? 'Activo' : torneo.estatus,
            categorias
        });
    } catch (error) {
        console.error('Error al obtener detalle del torneo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/torneos
// Crear/Configurar nuevo torneo con sus categorías asociadas
// ============================================================
const create = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { nombre_torneo, fecha_inicio, fecha_fin, reglamento, estatus, categorias } = req.body;

        if (!nombre_torneo || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ message: 'Faltan campos obligatorios (nombre_torneo, fecha_inicio, fecha_fin)' });
        }

        await connection.beginTransaction();

        const dbEstatus = estatus === 'Activo' ? 'En curso' : (estatus || 'Planificacion');

        // 1. Insertar el Torneo
        const [torneoResult] = await connection.query(
            `INSERT INTO torneos (nombre_torneo, fecha_inicio, fecha_fin, reglamento, estatus) 
             VALUES (?, ?, ?, ?, ?)`,
            [nombre_torneo, fecha_inicio, fecha_fin, reglamento || null, dbEstatus]
        );
        const id_torneo = torneoResult.insertId;

        // 2. Asociar categorías si se proporcionan
        if (categorias && Array.isArray(categorias) && categorias.length > 0) {
            const values = categorias.map(catId => [id_torneo, catId]);
            await connection.query(
                'INSERT INTO torneo_categorias (id_torneo, id_categoria) VALUES ?',
                [values]
            );
        }

        await connection.commit();

        res.status(201).json({
            id_torneo,
            nombre_torneo,
            fecha_inicio,
            fecha_fin,
            reglamento,
            estatus: estatus || 'Planificacion',
            categorias: categorias || []
        });
    } catch (error) {
        await connection.rollback();
        console.error('Error al configurar torneo (transacción revertida):', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};

// ============================================================
// PUT /api/torneos/:id
// Editar la configuración de un torneo y sus categorías participantes
// ============================================================
const update = async (req, res) => {
    const connection = await pool.getConnection();
    try {
        const { id } = req.params;
        const { nombre_torneo, fecha_inicio, fecha_fin, reglamento, estatus, categorias } = req.body;

        if (!nombre_torneo || !fecha_inicio || !fecha_fin) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        await connection.beginTransaction();

        const dbEstatus = estatus === 'Activo' ? 'En curso' : (estatus || 'Planificacion');

        // 1. Actualizar datos del torneo
        const [torneoResult] = await connection.query(
            `UPDATE torneos 
             SET nombre_torneo = ?, fecha_inicio = ?, fecha_fin = ?, reglamento = ?, estatus = ?
             WHERE id_torneo = ?`,
            [nombre_torneo, fecha_inicio, fecha_fin, reglamento || null, dbEstatus, id]
        );

        if (torneoResult.affectedRows === 0) {
            await connection.rollback();
            return res.status(404).json({ message: 'Torneo no encontrado' });
        }

        // 2. Actualizar categorías asociadas (eliminar antiguas e insertar nuevas)
        await connection.query('DELETE FROM torneo_categorias WHERE id_torneo = ?', [id]);

        if (categorias && Array.isArray(categorias) && categorias.length > 0) {
            const values = categorias.map(catId => [id, catId]);
            await connection.query(
                'INSERT INTO torneo_categorias (id_torneo, id_categoria) VALUES ?',
                [values]
            );
        }

        await connection.commit();
        res.json({ message: 'Torneo y categorías actualizadas correctamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error al actualizar torneo (transacción revertida):', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    } finally {
        connection.release();
    }
};

// ============================================================
// DELETE /api/torneos/:id
// Eliminar un torneo de forma física (debido a relaciones CASCADE, se limpian sus referencias)
// ============================================================
const deleteTournament = async (req, res) => {
    try {
        const { id } = req.params;

        const [result] = await pool.query(
            'DELETE FROM torneos WHERE id_torneo = ?', [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Torneo no encontrado' });
        }

        res.json({ message: 'Torneo eliminado correctamente' });
    } catch (error) {
        console.error('Error al eliminar torneo:', error);
        if (error.code === 'ER_ROW_IS_REFERENCED_2') {
            return res.status(400).json({ message: 'No se puede eliminar el torneo porque ya tiene credenciales emitidas asociadas.' });
        }
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    deleteTournament
};
