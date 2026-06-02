/**
 * ============================================================
 * SporDT — Middleware de Errores Centralizado
 * ============================================================
 * Captura todos los errores lanzados con next(error) en la app.
 * Evita repetir res.status(500).json(...) en cada controlador.
 * Maneja además errores de seguridad (CORS, Payload limit, JSON malformado).
 * ============================================================
 */

const { validationResult } = require('express-validator');

/**
 * Middleware de validación.
 * Extrae los errores de express-validator y responde 422 si hay alguno.
 * Úsalo después de las reglas de validación en las rutas.
 */
const validate = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({
            message: 'Datos de entrada inválidos',
            errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
        });
    }
    next();
};

/**
 * Middleware de errores global (4 parámetros = Express lo identifica como error handler).
 * Se registra al FINAL de index.js, después de todas las rutas.
 */
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
    console.error(`[Error Global] ${req.method} ${req.originalUrl} →`, err.message);

    // 1. Errores de seguridad de CORS
    if (err.message && err.message.startsWith('CORS:')) {
        return res.status(403).json({ message: err.message });
    }

    // 2. Errores de payload demasiado grande (límite de 5MB)
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'El cuerpo de la solicitud es demasiado grande (máx. 5MB)' });
    }

    // 3. Errores de JSON malformado en el body
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'El cuerpo de la solicitud contiene JSON inválido' });
    }

    // 4. Error de clave duplicada en MySQL
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            message: 'Ya existe un registro con ese valor único (duplicado).',
            detalle: err.sqlMessage
        });
    }

    // 5. Error de llave foránea en MySQL
    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            message: 'El registro referenciado no existe en la base de datos.',
            detalle: err.sqlMessage
        });
    }

    // 6. Error genérico del servidor
    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        message: err.message || 'Error interno del servidor'
    });
};

module.exports = { validate, errorHandler };
