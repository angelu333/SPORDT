/**
 * ============================================================
 * SporDT — Configuración de Entorno de Producción
 * ============================================================
 * Reemplaza automáticamente a environment.ts al compilar con --configuration=production.
 * Actualiza "apiUrl" con la URL real del servidor cuando se despliegue.
 * ============================================================
 */
export const environment = {
    production: true,
    apiUrl: 'https://api.spordt.com/api' // ← Actualizar con la URL real en producción
};
