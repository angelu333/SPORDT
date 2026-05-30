// Módulos: Tutores, Categorías, Alumnos | Equipos Externos (César Ley) | Torneos | Credenciales
import { Routes } from '@angular/router';

export const routes: Routes = [
    {
        path: '',
        redirectTo: 'tutores',
        pathMatch: 'full'
    },
    {
        path: 'tutores',
        loadComponent: () => import('./pages/tutores/tutor-list/tutor-list').then(m => m.TutorList)
    },
    {
        path: 'tutores/nuevo',
        loadComponent: () => import('./pages/tutores/tutor-form/tutor-form').then(m => m.TutorForm)
    },
    {
        path: 'tutores/editar/:id',
        loadComponent: () => import('./pages/tutores/tutor-form/tutor-form').then(m => m.TutorForm)
    },
    // ── Categorías ────────────────────────────────────────────
    {
        path: 'categorias',
        loadComponent: () => import('./pages/categorias/categoria-list/categoria-list').then(m => m.CategoriaList)
    },
    {
        path: 'categorias/nueva',
        loadComponent: () => import('./pages/categorias/categoria-form/categoria-form').then(m => m.CategoriaForm)
    },
    {
        path: 'categorias/editar/:id',
        loadComponent: () => import('./pages/categorias/categoria-form/categoria-form').then(m => m.CategoriaForm)
    },
    // ── Alumnos ───────────────────────────────────────────────
    {
        path: 'alumnos',
        loadComponent: () => import('./pages/alumnos/alumno-list/alumno-list').then(m => m.AlumnoList)
    },
    {
        path: 'alumnos/nuevo',
        loadComponent: () => import('./pages/alumnos/alumno-form/alumno-form').then(m => m.AlumnoForm)
    },
    {
        path: 'alumnos/editar/:id',
        loadComponent: () => import('./pages/alumnos/alumno-form/alumno-form').then(m => m.AlumnoForm)
    },
    // ── Equipos Externos (César Ley) ──────────────────────────
    {
        path: 'equipos',
        loadComponent: () => import('./pages/equipos/equipo-list/equipo-list').then(m => m.EquipoList)
    },
    {
        path: 'equipos/nuevo',
        loadComponent: () => import('./pages/equipos/equipo-form/equipo-form').then(m => m.EquipoForm)
    },
    {
        path: 'equipos/editar/:id',
        loadComponent: () => import('./pages/equipos/equipo-form/equipo-form').then(m => m.EquipoForm)
    },
    {
        path: 'equipos/:id',
        loadComponent: () => import('./pages/equipos/equipo-detail/equipo-detail').then(m => m.EquipoDetail)
    },
    // ── Torneos y Temporadas (César Ley) ──────────────────────
    {
        path: 'torneos',
        loadComponent: () => import('./pages/torneos/torneo-list/torneo-list').then(m => m.TorneoList)
    },
    {
        path: 'torneos/nuevo',
        loadComponent: () => import('./pages/torneos/torneo-form/torneo-form').then(m => m.TorneoForm)
    },
    {
        path: 'torneos/editar/:id',
        loadComponent: () => import('./pages/torneos/torneo-form/torneo-form').then(m => m.TorneoForm)
    },
    // ── Credencialización Obligatoria (César Ley) ─────────────
    {
        path: 'credenciales',
        loadComponent: () => import('./pages/credenciales/credencial-list').then(m => m.CredencialList)
    }
];


