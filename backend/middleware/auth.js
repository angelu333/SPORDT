/**
 * ============================================================
 * SporDT — Middleware de Autenticación JWT
 * middleware/auth.js
 * ============================================================
 * Verifica que el request incluya un token JWT válido en el
 * header Authorization: Bearer <token>
 *
 * Uso en rutas:
 *   const { authMiddleware } = require('../middleware/auth');
 *   router.post('/ruta-protegida', authMiddleware, controller.funcion);
 *
 * Si el token es válido, inyecta req.usuario con:
 *   { id_usuario, username, rol }
 * ============================================================
 */

const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;

/**
 * Middleware principal de autenticación.
 * Protege rutas que requieren que el usuario esté autenticado.
 */
const authMiddleware = (req, res, next) => {
    // Verificar que JWT_SECRET esté configurado en el servidor
    if (!JWT_SECRET) {
        console.error('[Auth] CRÍTICO: JWT_SECRET no está definido en las variables de entorno');
        return res.status(500).json({ message: 'Error de configuración del servidor' });
    }

    // Extraer el token del header
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(401).json({
            message: 'Acceso denegado. Se requiere autenticación.',
            hint: 'Incluye el header: Authorization: Bearer <tu_token>'
        });
    }

    // Formato esperado: "Bearer eyJhbGci..."
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({
            message: 'Formato de token inválido.',
            hint: 'El header debe tener el formato: Authorization: Bearer <token>'
        });
    }

    const token = parts[1];

    try {
        // Verificar y decodificar el token
        const decoded = jwt.verify(token, JWT_SECRET);

        // Inyectar datos del usuario en el request para uso en controllers
        req.usuario = {
            id_usuario: decoded.id_usuario,
            username:   decoded.username,
            rol:        decoded.rol
        };

        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({
                message: 'Tu sesión ha expirado. Inicia sesión nuevamente.',
                code: 'TOKEN_EXPIRED'
            });
        }
        if (error.name === 'JsonWebTokenError') {
            return res.status(401).json({
                message: 'Token inválido o manipulado.',
                code: 'TOKEN_INVALID'
            });
        }
        // Error desconocido de JWT
        return res.status(401).json({
            message: 'No se pudo verificar la autenticación.',
            code: 'AUTH_ERROR'
        });
    }
};

/**
 * Middleware de autorización por rol.
 * Usar DESPUÉS de authMiddleware.
 *
 * Uso: router.delete('/ruta', authMiddleware, requireRol('Administrador'), ctrl.fn)
 *
 * @param {...string} roles - Roles permitidos
 */
const requireRol = (...roles) => (req, res, next) => {
    if (!req.usuario) {
        return res.status(401).json({ message: 'No autenticado' });
    }
    if (!roles.includes(req.usuario.rol)) {
        return res.status(403).json({
            message: `Acceso prohibido. Se requiere rol: ${roles.join(' o ')}. Tu rol actual: ${req.usuario.rol}`
        });
    }
    next();
};

module.exports = { authMiddleware, requireRol };
