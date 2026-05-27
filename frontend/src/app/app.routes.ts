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
    }
];
