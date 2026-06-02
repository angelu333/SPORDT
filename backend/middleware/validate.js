/**
 * ============================================================
 * SporDT — Middleware de Validación de Inputs
 * middleware/validate.js
 * ============================================================
 * Funciones de validación y sanitización centralizadas.
 * Todos los controllers deben usar estas funciones en lugar
 * de parseFloat() o parseInt() directos sobre req.body.
 *
 * Por qué: parseFloat("500abc") → 500 (pasa sin error)
 *           Number("500abc")    → NaN (bloqueado correctamente)
 * ============================================================
 */

/**
 * Sanitiza un string: elimina espacios extremos, limita longitud
 * y elimina caracteres de control peligrosos.
 *
 * @param {*} value - Valor a sanitizar
 * @param {number} maxLength - Longitud máxima permitida (default: 255)
 * @returns {string|null} - String limpio o null si el valor no es string
 */
const sanitizeString = (value, maxLength = 255) => {
    if (value === null || value === undefined) return null;
    if (typeof value !== 'string') return null;

    return value
        .trim()
        .replace(/[\x00-\x1F\x7F]/g, '') // eliminar caracteres de control ASCII
        .substring(0, maxLength);
};

/**
 * Valida que un valor sea un número positivo finito.
 * Usa Number() en lugar de parseFloat() para ser más estricto.
 *
 * @param {*} value - Valor a validar
 * @param {string} fieldName - Nombre del campo (para mensajes de error)
 * @returns {{ value: number }|{ error: string }}
 */
const validatePositiveNumber = (value, fieldName) => {
    const num = Number(value);

    if (value === '' || value === null || value === undefined) {
        return { error: `${fieldName} es obligatorio` };
    }
    if (isNaN(num) || !isFinite(num)) {
        return { error: `${fieldName} debe ser un número válido (recibido: "${value}")` };
    }
    if (num <= 0) {
        return { error: `${fieldName} debe ser mayor a $0` };
    }

    // Redondear a 2 decimales (centavos) para evitar problemas de flotantes
    return { value: parseFloat(num.toFixed(2)) };
};

/**
 * Valida que un valor sea un entero positivo (para IDs).
 *
 * @param {*} value - Valor a validar
 * @param {string} fieldName - Nombre del campo
 * @returns {{ value: number }|{ error: string }}
 */
const validatePositiveInteger = (value, fieldName) => {
    const num = Number(value);

    if (value === '' || value === null || value === undefined) {
        return { error: `${fieldName} es obligatorio` };
    }
    if (!Number.isInteger(num) || num <= 0) {
        return { error: `${fieldName} debe ser un ID entero válido (recibido: "${value}")` };
    }

    return { value: num };
};

/**
 * Valida que una cadena tenga formato de fecha YYYY-MM-DD y sea una fecha real.
 *
 * @param {*} value - Valor a validar
 * @param {string} fieldName - Nombre del campo
 * @returns {{ value: string }|{ error: string }}
 */
const validateDate = (value, fieldName) => {
    if (!value) {
        return { error: `${fieldName} es obligatoria` };
    }
    if (typeof value !== 'string') {
        return { error: `${fieldName} debe ser una cadena en formato YYYY-MM-DD` };
    }

    // Verificar formato exacto YYYY-MM-DD
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return { error: `${fieldName} debe tener formato YYYY-MM-DD (ej: 2026-07-15)` };
    }

    // Verificar que sea una fecha real (ej: 2026-02-30 es inválida)
    const date = new Date(value + 'T00:00:00');
    if (isNaN(date.getTime())) {
        return { error: `${fieldName} no es una fecha válida` };
    }

    return { value };
};

/**
 * Valida que un valor pertenezca a un conjunto permitido (whitelist).
 * Previene que se inserten valores arbitrarios en campos ENUM de la BD.
 *
 * @param {*} value - Valor a validar
 * @param {string[]} allowed - Lista de valores permitidos
 * @param {string} fieldName - Nombre del campo
 * @param {boolean} required - Si es obligatorio (default: false)
 * @returns {{ value: string }|{ error: string }|{ value: undefined }}
 */
const validateEnum = (value, allowed, fieldName, required = false) => {
    if (value === undefined || value === null || value === '') {
        if (required) {
            return { error: `${fieldName} es obligatorio. Valores permitidos: ${allowed.join(', ')}` };
        }
        return { value: undefined }; // campo opcional — se usará el default
    }

    if (!allowed.includes(value)) {
        return {
            error: `${fieldName} inválido: "${value}". Valores permitidos: ${allowed.join(', ')}`
        };
    }

    return { value };
};

/**
 * Función utilitaria: ejecuta múltiples validaciones y agrega todos los errores.
 * Retorna null si todo es válido, o un array de mensajes de error.
 *
 * Uso:
 *   const errors = collectErrors([
 *     validatePositiveNumber(monto, 'monto'),
 *     validateDate(fecha, 'fecha'),
 *   ]);
 *   if (errors) return res.status(400).json({ errors });
 *
 * @param {Array} results - Array de resultados de validaciones
 * @returns {string[]|null}
 */
const collectErrors = (results) => {
    const errors = results
        .filter(r => r.error)
        .map(r => r.error);
    return errors.length > 0 ? errors : null;
};

module.exports = {
    sanitizeString,
    validatePositiveNumber,
    validatePositiveInteger,
    validateDate,
    validateEnum,
    collectErrors
};
