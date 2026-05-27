import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe, LowerCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AlumnoService } from '../../../services/alumno.service';
import { Alumno } from '../../../models/alumno.model';
import { CategoriaService } from '../../../services/categoria.service';
import { Categoria } from '../../../models/categoria.model';

@Component({
    selector: 'app-alumno-list',
    imports: [RouterLink, DatePipe, LowerCasePipe, FormsModule],
    templateUrl: './alumno-list.html',
    styleUrl: './alumno-list.css'
})
export class AlumnoList implements OnInit {

    private readonly alumnoService = inject(AlumnoService);
    private readonly categoriaService = inject(CategoriaService);
    private readonly router = inject(Router);

    alumnos = signal<Alumno[]>([]);
    categorias = signal<Categoria[]>([]);
    loading = signal(true);
    errorMsg = signal('');

    // Filtros
    filtroCategoria = signal<string>('');
    filtroEstatus = signal<string>('');

    // Alumnos filtrados computados
    alumnosFiltrados = computed(() => {
        return this.alumnos().filter(a => {
            const matchCategoria = !this.filtroCategoria() || a.id_categoria?.toString() === this.filtroCategoria();
            const matchEstatus = !this.filtroEstatus() || a.estatus === this.filtroEstatus();
            return matchCategoria && matchEstatus;
        });
    });

    ngOnInit(): void {
        this.loadAlumnos();
        this.loadCategorias();
    }

    loadAlumnos(): void {
        this.loading.set(true);
        this.errorMsg.set('');

        this.alumnoService.getAll().subscribe({
            next: (data) => {
                this.alumnos.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error al cargar alumnos:', err);
                this.errorMsg.set('No se pudieron cargar los alumnos.');
                this.loading.set(false);
            }
        });
    }

    loadCategorias(): void {
        this.categoriaService.getAll().subscribe({
            next: (data) => this.categorias.set(data),
            error: (err) => console.error('Error al cargar categorías para filtro:', err)
        });
    }

    editAlumno(id: number): void {
        this.router.navigate(['/alumnos/editar', id]);
    }

    deleteAlumno(alumno: Alumno): void {
        const confirmado = confirm(`¿Estás seguro de dar de baja al alumno "${alumno.nombre_completo}"?`);
        if (!confirmado) return;

        this.alumnoService.delete(alumno.id_alumno!).subscribe({
            next: () => {
                this.loadAlumnos();
            },
            error: (err) => {
                console.error('Error al dar de baja:', err);
                alert('Ocurrió un error al intentar dar de baja al alumno.');
            }
        });
    }
}
