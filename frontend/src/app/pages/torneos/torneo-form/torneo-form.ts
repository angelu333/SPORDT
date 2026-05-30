import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TorneoService } from '../../../services/torneo.service';
import { CategoriaService } from '../../../services/categoria.service';
import { Torneo, TorneoEstatus } from '../../../models/torneo.model';
import { Categoria } from '../../../models/categoria.model';

@Component({
    selector: 'app-torneo-form',
    imports: [RouterLink, FormsModule],
    templateUrl: './torneo-form.html',
    styleUrl: './torneo-form.css'
})
export class TorneoForm implements OnInit {

    private readonly torneoService = inject(TorneoService);
    private readonly categoriaService = inject(CategoriaService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    isEditMode = signal(false);
    torneoId = signal<number | null>(null);
    loading = signal(false);
    loadingData = signal(false);
    errorMsg = signal('');
    successMsg = signal('');

    // Datos del formulario
    torneo: Torneo = {
        nombre_torneo: '',
        fecha_inicio: '',
        fecha_fin: '',
        reglamento: null,
        estatus: 'Planificacion',
        categorias: []
    };

    // Catálogo de categorías disponibles
    categoriasDisponibles = signal<Categoria[]>([]);
    categoriasSeleccionadas = signal<number[]>([]);

    readonly estatusOptions: TorneoEstatus[] = ['Planificacion', 'Activo', 'Finalizado', 'Cancelado'];

    ngOnInit(): void {
        this.loadCategorias();
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.torneoId.set(Number(id));
            this.loadTorneo(Number(id));
        }
    }

    loadCategorias(): void {
        this.categoriaService.getAll().subscribe({
            next: (data) => this.categoriasDisponibles.set(data.filter(c => c.activo !== 0)),
            error: () => {}
        });
    }

    loadTorneo(id: number): void {
        this.loadingData.set(true);
        this.torneoService.getById(id).subscribe({
            next: (data) => {
                this.torneo = {
                    nombre_torneo: data.nombre_torneo,
                    fecha_inicio: data.fecha_inicio?.slice(0, 10) ?? '',
                    fecha_fin: data.fecha_fin?.slice(0, 10) ?? '',
                    reglamento: data.reglamento,
                    estatus: data.estatus ?? 'Planificacion',
                    categorias: data.categorias ?? []
                };
                this.categoriasSeleccionadas.set(
                    (data.categorias ?? []).map(c => c.id_categoria!)
                );
                this.loadingData.set(false);
            },
            error: () => {
                this.errorMsg.set('No se pudo cargar el torneo.');
                this.loadingData.set(false);
            }
        });
    }

    toggleCategoria(id: number): void {
        const current = this.categoriasSeleccionadas();
        if (current.includes(id)) {
            this.categoriasSeleccionadas.set(current.filter(c => c !== id));
        } else {
            this.categoriasSeleccionadas.set([...current, id]);
        }
    }

    isCategoriaSelected(id: number): boolean {
        return this.categoriasSeleccionadas().includes(id);
    }

    getDuracionDias(): number {
        if (!this.torneo.fecha_inicio || !this.torneo.fecha_fin) return 0;
        const ms = new Date(this.torneo.fecha_fin).getTime() - new Date(this.torneo.fecha_inicio).getTime();
        return Math.max(0, Math.ceil(ms / (1000 * 60 * 60 * 24)));
    }

    onSubmit(): void {
        this.errorMsg.set('');
        this.successMsg.set('');

        if (!this.torneo.nombre_torneo.trim()) {
            this.errorMsg.set('El nombre del torneo es obligatorio.');
            return;
        }
        if (!this.torneo.fecha_inicio || !this.torneo.fecha_fin) {
            this.errorMsg.set('Las fechas de inicio y fin son obligatorias.');
            return;
        }
        if (this.torneo.fecha_fin < this.torneo.fecha_inicio) {
            this.errorMsg.set('La fecha de fin no puede ser anterior a la fecha de inicio.');
            return;
        }

        const payload: any = {
            ...this.torneo,
            categorias: this.categoriasSeleccionadas()
        };

        this.loading.set(true);

        if (this.isEditMode()) {
            this.torneoService.update(this.torneoId()!, payload).subscribe({
                next: () => {
                    this.successMsg.set('Torneo actualizado correctamente.');
                    this.loading.set(false);
                    setTimeout(() => this.router.navigate(['/torneos']), 1200);
                },
                error: (err) => {
                    this.errorMsg.set(err.error?.message || 'Error al actualizar el torneo.');
                    this.loading.set(false);
                }
            });
        } else {
            this.torneoService.create(payload).subscribe({
                next: () => {
                    this.successMsg.set('¡Torneo configurado exitosamente!');
                    this.loading.set(false);
                    setTimeout(() => this.router.navigate(['/torneos']), 1200);
                },
                error: (err) => {
                    this.errorMsg.set(err.error?.message || 'Error al crear el torneo.');
                    this.loading.set(false);
                }
            });
        }
    }
}
