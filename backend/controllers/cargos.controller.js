const pool = require('../config/db');

// ============================================================
// GET /api/cargos
// Listar cargos con filtros opcionales: ?estatus=Pendiente&tipo=Alumno
// ============================================================
const getAll = async (req, res) => {
    try {
        const { estatus, tipo } = req.query;
        let query = `
            SELECT 
                cf.*,
                CASE 
                    WHEN cf.tipo_entidad = 'Alumno' THEN a.nombre_completo
                    ELSE eq.nombre_equipo
                END AS nombre_entidad
            FROM cargos_financieros cf
            LEFT JOIN alumnos a ON cf.tipo_entidad = 'Alumno' AND cf.id_entidad = a.id_alumno
            LEFT JOIN equipos_externos eq ON cf.tipo_entidad = 'Equipo' AND cf.id_entidad = eq.id_equipo
            WHERE 1=1
        `;
        const params = [];

        if (estatus) {
            query += ` AND cf.estatus_pago = ?`;
            params.push(estatus);
        }
        if (tipo) {
            query += ` AND cf.tipo_entidad = ?`;
            params.push(tipo);
        }

        query += ` ORDER BY cf.fecha_vencimiento ASC`;

        const [rows] = await pool.query(query, params);
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener cargos:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/cargos/:id
// Obtener un cargo específico con su historial de abonos
// ============================================================
const getById = async (req, res) => {
    try {
        const { id } = req.params;

        const [cargo] = await pool.query(
            'SELECT * FROM cargos_financieros WHERE id_cargo = ?', [id]
        );
        if (cargo.length === 0) {
            return res.status(404).json({ message: 'Cargo no encontrado' });
        }

        const [abonos] = await pool.query(
            'SELECT * FROM historial_abonos WHERE id_cargo = ? ORDER BY fecha_pago DESC', [id]
        );

        res.json({ ...cargo[0], abonos });
    } catch (error) {
        console.error('Error al obtener cargo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/cargos
// Crear un cargo manualmente (para casos especiales)
// ============================================================
const create = async (req, res) => {
    try {
        const { tipo_entidad, id_entidad, concepto, monto_total, fecha_vencimiento, periodo, notas } = req.body;

        if (!tipo_entidad || !id_entidad || !concepto || !monto_total || !fecha_vencimiento) {
            return res.status(400).json({ message: 'Faltan campos obligatorios' });
        }

        const [result] = await pool.query(
            `INSERT INTO cargos_financieros 
             (tipo_entidad, id_entidad, concepto, monto_total, fecha_vencimiento, periodo, notas)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [tipo_entidad, id_entidad, concepto, monto_total, fecha_vencimiento, periodo || null, notas || null]
        );

        const [nuevo] = await pool.query('SELECT * FROM cargos_financieros WHERE id_cargo = ?', [result.insertId]);
        res.status(201).json(nuevo[0]);
    } catch (error) {
        console.error('Error al crear cargo:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = { getAll, getById, create };
