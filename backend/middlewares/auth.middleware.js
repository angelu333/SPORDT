/**
 * Middleware de seguridad básico
 * En un entorno real, aquí validarías un JWT o una sesión.
 */
const authMiddleware = (req, res, next) => {
    // Por ahora, simulamos que la seguridad requiere un header 'x-api-key'
    // Esto evita que cualquier usuario que conozca la URL dispare procesos críticos.
    const apiKey = req.headers['x-api-key'];
    const validApiKey = process.env.ADMIN_API_KEY || 'admin-secret-key';

    if (!apiKey || apiKey !== validApiKey) {
        console.warn(`[Seguridad] Intento de acceso no autorizado a: ${req.originalUrl}`);
        return res.status(403).json({ 
            mensaje: 'Acceso denegado. No tienes permisos para ejecutar esta acción.' 
        });
    }

    next();
};

module.exports = { authMiddleware };
