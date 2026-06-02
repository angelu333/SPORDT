import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CategoriaService } from '../../../services/categoria.service';
import { Categoria } from '../../../models/categoria.model';

@Component({
    selector: 'app-categoria-list',
    imports: [RouterLink],
    templateUrl: './categoria-list.html',
    styleUrl: './categoria-list.css'
})
export class CategoriaList implements OnInit {

    private readonly categoriaService = inject(CategoriaService);
    private readonly router = inject(Router);

    categorias = signal<Categoria[]>([]);
    loading = signal(true);
    errorMsg = signal('');

    ngOnInit(): void {
        this.loadCategorias();
    }

    loadCategorias(): void {
        this.loading.set(true);
        this.errorMsg.set('');

        this.categoriaService.getAll().subscribe({
            next: (data) => {
                this.categorias.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error al cargar categorías:', err);
                this.errorMsg.set('No se pudieron cargar las categorías. Verifica que el servidor esté corriendo.');
                this.loading.set(false);
            }
        });
    }

    editCategoria(id: number): void {
        this.router.navigate(['/categorias/editar', id]);
    }

    deleteCategoria(categoria: Categoria): void {
        const confirmado = confirm(
            `¿Estás seguro de desactivar la categoría "${categoria.nombre_categoria}"?\n` +
            `Solo es posible si no tiene alumnos activos.`
        );
        if (!confirmado) return;

        this.categoriaService.delete(categoria.id_categoria!).subscribe({
            next: () => {
                this.loadCategorias();
            },
            error: (err) => {
                const mensaje = err.error?.message || 'No se pudo desactivar la categoría.';
                alert(mensaje);
            }
        });
    }

    // Funciones para soporte de Bento Grid dinámico
    getCategoryIcon(nombre: string): string {
        const n = nombre.toLowerCase();
        if (n.includes('sub-6')) return 'child_care';
        if (n.includes('sub-8')) return 'sports_esports';
        if (n.includes('sub-10')) return 'sports_soccer';
        if (n.includes('sub-12')) return 'groups';
        if (n.includes('sub-14')) return 'fitness_center';
        if (n.includes('sub-16')) return 'monitoring';
        if (n.includes('sub-18')) return 'star';
        return 'workspace_premium';
    }

    getCategoryTag(nombre: string): string {
        const n = nombre.toLowerCase();
        if (n.includes('sub-6')) return 'Iniciación';
        if (n.includes('sub-8')) return 'Formación';
        if (n.includes('sub-10')) return 'Desarrollo';
        if (n.includes('sub-12')) return 'Pre-Competitiva';
        if (n.includes('sub-14')) return 'Competitiva';
        if (n.includes('sub-16')) return 'Rendimiento';
        if (n.includes('sub-18')) return 'Pre-Profesional';
        return 'Elite Pro';
    }
}
