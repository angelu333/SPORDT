/**
 * ============================================================
 * SporDT — Controlador de Autenticación
 * controllers/auth.controller.js
 * ============================================================
 * Maneja el inicio de sesión de administradores.
 * Verifica credenciales contra la tabla `usuarios` y
 * emite un JWT con vigencia de 8 horas.
 * ============================================================
 */

const pool    = require('../config/db');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');

const JWT_SECRET  = process.env.JWT_SECRET;
const JWT_EXPIRES = process.env.JWT_EXPIRES_IN || '8h';

// ============================================================
// POST /api/auth/login
// Body: { username, password }
// ============================================================
const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validación básica de presencia
        if (!username || !password) {
            return res.status(400).json({ message: 'Usuario y contraseña son obligatorios' });
        }

        // Sanitización mínima — no permitir strings muy largos
        if (typeof username !== 'string' || username.length > 50) {
            return res.status(400).json({ message: 'Usuario inválido' });
        }
        if (typeof password !== 'string' || password.length > 255) {
            return res.status(400).json({ message: 'Contraseña inválida' });
        }

        // Buscar usuario activo en la BD
        const [usuarios] = await pool.query(
            'SELECT id_usuario, username, password, rol FROM usuarios WHERE username = ? AND activo = 1',
            [username.trim()]
        );

        // IMPORTANTE: devolver SIEMPRE el mismo mensaje aunque no exista el usuario
        // Esto previene el "user enumeration attack" (saber si un usuario existe)
        if (usuarios.length === 0) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        const usuario = usuarios[0];

        // Verificar contraseña con bcrypt (comparación segura en tiempo constante)
        const passwordValida = await bcrypt.compare(password, usuario.password);
        if (!passwordValida) {
            return res.status(401).json({ message: 'Credenciales incorrectas' });
        }

        // Generar JWT
        if (!JWT_SECRET) {
            console.error('[Auth] CRÍTICO: JWT_SECRET no definido');
            return res.status(500).json({ message: 'Error de configuración del servidor' });
        }

        const token = jwt.sign(
            {
                id_usuario: usuario.id_usuario,
                username:   usuario.username,
                rol:        usuario.rol
            },
            JWT_SECRET,
            { expiresIn: JWT_EXPIRES }
        );

        res.json({
            message: 'Sesión iniciada correctamente',
            token,
            usuario: {
                id_usuario: usuario.id_usuario,
                username:   usuario.username,
                rol:        usuario.rol
            },
            expira_en: JWT_EXPIRES
        });

    } catch (error) {
        console.error('[Auth] Error en login:', error);
        res.status(500).json({ message: 'Error interno del servidor' });
    }
};

// ============================================================
// GET /api/auth/me
// Verifica el token actual y devuelve datos del usuario.
// Útil para que el frontend valide que la sesión sigue activa.
// ============================================================
const me = async (req, res) => {
    // req.usuario es inyectado por authMiddleware
    res.json({
        usuario: req.usuario,
        message: 'Sesión activa'
    });
};

module.exports = { login, me };
