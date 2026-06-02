import { RenderMode, ServerRoute } from '@angular/ssr';

/**
 * ============================================================
 * SporDT — Configuración de Rutas del Servidor (SSR)
 * ============================================================
 * Las rutas con parámetros dinámicos (:id) NO pueden pre-renderizarse
 * porque Angular no sabe qué IDs existen al compilar.
 * Se marcan como RenderMode.Server para que se rendericen bajo demanda.
 * Las rutas estáticas usan RenderMode.Prerender para mejor rendimiento.
 * ============================================================
 */
export const serverRoutes: ServerRoute[] = [
  // ── Rutas con parámetros dinámicos → Renderizado en servidor bajo demanda ──
  { path: 'tutores/editar/:id',    renderMode: RenderMode.Server },
  { path: 'categorias/editar/:id', renderMode: RenderMode.Server },
  { path: 'alumnos/editar/:id',    renderMode: RenderMode.Server },
  { path: 'equipos/editar/:id',    renderMode: RenderMode.Server },
  { path: 'equipos/:id',           renderMode: RenderMode.Server },
  { path: 'torneos/editar/:id',    renderMode: RenderMode.Server },

  // ── Todas las demás rutas → Pre-renderizado estático ─────────────────────
  { path: '**', renderMode: RenderMode.Prerender }
];
