const express     = require('express');
const router      = express.Router();
const authCtrl    = require('../controllers/auth.controller');
const { authMiddleware } = require('../middleware/auth');
const { loginLimiter }   = require('../middleware/rateLimit');

// POST /api/auth/login  → Iniciar sesión (con rate limit anti brute-force)
router.post('/login', loginLimiter, authCtrl.login);

// GET  /api/auth/me     → Verificar sesión activa (requiere token)
router.get('/me', authMiddleware, authCtrl.me);

module.exports = router;
