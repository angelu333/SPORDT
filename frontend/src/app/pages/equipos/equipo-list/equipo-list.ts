import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipoService } from '../../../services/equipo.service';
import { Equipo } from '../../../models/equipo.model';

@Component({
    selector: 'app-equipo-list',
    imports: [RouterLink, DatePipe, FormsModule],
    templateUrl: './equipo-list.html',
    styleUrl: './equipo-list.css'
})
export class EquipoList implements OnInit {

    private readonly equipoService = inject(EquipoService);
    private readonly router = inject(Router);

    equipos = signal<Equipo[]>([]);
    loading = signal(true);
    errorMsg = signal('');
    busqueda = signal<string>('');

    equiposFiltrados = computed(() => {
        const termino = this.busqueda().toLowerCase().trim();
        if (!termino) return this.equipos();
        return this.equipos().filter(e =>
            e.nombre_equipo.toLowerCase().includes(termino) ||
            e.nombre_delegado.toLowerCase().includes(termino)
        );
    });

    ngOnInit(): void {
        this.loadEquipos();
    }

    loadEquipos(): void {
        this.loading.set(true);
        this.errorMsg.set('');
        this.equipoService.getAll().subscribe({
            next: (data) => {
                this.equipos.set(data);
                this.loading.set(false);
            },
            error: () => {
                this.errorMsg.set('No se pudieron cargar los equipos. Verifica que el servidor esté corriendo.');
                this.loading.set(false);
            }
        });
    }

    verDetalle(id: number): void {
        this.router.navigate(['/equipos', id]);
    }

    editEquipo(id: number): void {
        this.router.navigate(['/equipos/editar', id]);
    }

    deleteEquipo(equipo: Equipo): void {
        const confirmado = confirm(`¿Estás seguro de desactivar el equipo "${equipo.nombre_equipo}"?`);
        if (!confirmado) return;

        this.equipoService.delete(equipo.id_equipo!).subscribe({
            next: () => this.loadEquipos(),
            error: () => alert('No se pudo desactivar el equipo.')
        });
    }

    getEscudo(equipo: Equipo): string {
        return equipo.escudo || '';
    }

    getInitials(nombre: string): string {
        return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }
}
