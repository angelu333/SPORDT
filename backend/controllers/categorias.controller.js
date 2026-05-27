const pool = require('../config/db');

// ============================================================
// Función interna: calcular edad en años a partir de fecha_nacimiento
// ============================================================
function calcularEdad(fechaNacimiento) {
    const hoy = new Date();
    const nacimiento = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - nacimiento.getFullYear();
    const mesActual = hoy.getMonth();
    const mesNacimiento = nacimiento.getMonth();
    // Si aún no ha cumplido años este año, restar 1
    if (
        mesActual < mesNacimiento ||
        (mesActual === mesNacimiento && hoy.getDate() < nacimiento.getDate())
    ) {
        edad--;
    }
    return edad;
}

// ============================================================
// GET /api/categorias
// Listar todas las categorías activas con conteo de alumnos
// ============================================================
const getAll = async (req, res) => {
    try {
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
        res.json(rows);
    } catch (error) {
        console.error('Error al obtener categorías:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/categorias/:id
// Obtener una categoría por ID
// ============================================================
const getById = async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await pool.query(
            'SELECT * FROM categorias WHERE id_categoria = ?',
            [id]
        );
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error al obtener categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/categorias
// Crear una nueva categoría
// ============================================================
const create = async (req, res) => {
    try {
        const { nombre_categoria, edad_minima, edad_maxima, descripcion } = req.body;

        // Validaciones
        if (!nombre_categoria || edad_minima == null || edad_maxima == null) {
            return res.status(400).json({
                message: 'El nombre, edad mínima y edad máxima son obligatorios'
            });
        }
        if (Number(edad_minima) >= Number(edad_maxima)) {
            return res.status(400).json({
                message: 'La edad mínima debe ser menor que la edad máxima'
            });
        }

        const [result] = await pool.query(
            'INSERT INTO categorias (nombre_categoria, edad_minima, edad_maxima, descripcion) VALUES (?, ?, ?, ?)',
            [nombre_categoria, edad_minima, edad_maxima, descripcion || null]
        );

        const [nueva] = await pool.query(
            'SELECT * FROM categorias WHERE id_categoria = ?',
            [result.insertId]
        );

        res.status(201).json(nueva[0]);
    } catch (error) {
        console.error('Error al crear categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// PUT /api/categorias/:id
// Actualizar una categoría existente
// ============================================================
const update = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre_categoria, edad_minima, edad_maxima, descripcion } = req.body;

        if (!nombre_categoria || edad_minima == null || edad_maxima == null) {
            return res.status(400).json({
                message: 'El nombre, edad mínima y edad máxima son obligatorios'
            });
        }
        if (Number(edad_minima) >= Number(edad_maxima)) {
            return res.status(400).json({
                message: 'La edad mínima debe ser menor que la edad máxima'
            });
        }

        const [result] = await pool.query(
            'UPDATE categorias SET nombre_categoria = ?, edad_minima = ?, edad_maxima = ?, descripcion = ? WHERE id_categoria = ?',
            [nombre_categoria, edad_minima, edad_maxima, descripcion || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        const [actualizada] = await pool.query(
            'SELECT * FROM categorias WHERE id_categoria = ?',
            [id]
        );

        res.json(actualizada[0]);
    } catch (error) {
        console.error('Error al actualizar categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// DELETE /api/categorias/:id
// Soft-delete: desactivar categoría (solo si no tiene alumnos activos)
// ============================================================
const remove = async (req, res) => {
    try {
        const { id } = req.params;

        // Verificar que no tenga alumnos activos
        const [alumnos] = await pool.query(
            "SELECT COUNT(*) AS total FROM alumnos WHERE id_categoria = ? AND estatus = 'Activo'",
            [id]
        );

        if (alumnos[0].total > 0) {
            return res.status(409).json({
                message: `No se puede desactivar esta categoría porque tiene ${alumnos[0].total} alumno(s) activo(s) asignado(s).`
            });
        }

        const [result] = await pool.query(
            'UPDATE categorias SET activo = 0 WHERE id_categoria = ?',
            [id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Categoría no encontrada' });
        }

        res.json({ message: 'Categoría desactivada correctamente' });
    } catch (error) {
        console.error('Error al desactivar categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// POST /api/categorias/asignar
// LÓGICA DE NEGOCIO CLAVE:
// Recibe una fecha_nacimiento y devuelve la categoría correspondiente.
// Usada por el formulario de Alumnos para asignar la categoría automáticamente.
// ============================================================
const asignarCategoria = async (req, res) => {
    try {
        const { fecha_nacimiento } = req.body;

        if (!fecha_nacimiento) {
            return res.status(400).json({ message: 'La fecha de nacimiento es obligatoria' });
        }

        const edad = calcularEdad(fecha_nacimiento);

        if (edad < 0) {
            return res.status(400).json({ message: 'La fecha de nacimiento no puede ser futura' });
        }

        // Buscar la categoría activa que corresponda al rango de edad
        const [rows] = await pool.query(
            'SELECT * FROM categorias WHERE activo = 1 AND edad_minima <= ? AND edad_maxima >= ? LIMIT 1',
            [edad, edad]
        );

        if (rows.length === 0) {
            return res.json({
                categoria: null,
                edad,
                message: `Edad fuera de rango (${edad} años). No existe una categoría para esta edad.`
            });
        }

        res.json({
            categoria: rows[0],
            edad,
            message: `Categoría asignada: ${rows[0].nombre_categoria} (${edad} años)`
        });
    } catch (error) {
        console.error('Error al asignar categoría:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

module.exports = {
    getAll,
    getById,
    create,
    update,
    remove,
    asignarCategoria,
    calcularEdad // exportamos también para usarla en el motor de cobranza
};
