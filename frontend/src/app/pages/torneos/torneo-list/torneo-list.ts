import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TorneoService } from '../../../services/torneo.service';
import { Torneo, TorneoEstatus } from '../../../models/torneo.model';

@Component({
    selector: 'app-torneo-list',
    imports: [RouterLink, DatePipe, FormsModule],
    templateUrl: './torneo-list.html',
    styleUrl: './torneo-list.css'
})
export class TorneoList implements OnInit {

    private readonly torneoService = inject(TorneoService);
    private readonly router = inject(Router);

    torneos = signal<Torneo[]>([]);
    loading = signal(true);
    errorMsg = signal('');
    busqueda = signal('');
    filtroEstatus = signal<TorneoEstatus | ''>('');

    torneosFiltrados = computed(() => {
        let lista = this.torneos();
        const termino = this.busqueda().toLowerCase().trim();
        const estatus = this.filtroEstatus();
        if (termino) lista = lista.filter(t => t.nombre_torneo.toLowerCase().includes(termino));
        if (estatus) lista = lista.filter(t => t.estatus === estatus);
        return lista;
    });

    ngOnInit(): void {
        this.loadTorneos();
    }

    loadTorneos(): void {
        this.loading.set(true);
        this.errorMsg.set('');
        this.torneoService.getAll().subscribe({
            next: (data) => { this.torneos.set(data); this.loading.set(false); },
            error: () => { this.errorMsg.set('No se pudieron cargar los torneos.'); this.loading.set(false); }
        });
    }

    editTorneo(id: number): void {
        this.router.navigate(['/torneos/editar', id]);
    }

    deleteTorneo(torneo: Torneo): void {
        if (!confirm(`¿Eliminar el torneo "${torneo.nombre_torneo}"? Esta acción no se puede deshacer.`)) return;
        this.torneoService.delete(torneo.id_torneo!).subscribe({
            next: () => this.loadTorneos(),
            error: (err) => alert(err.error?.message || 'No se pudo eliminar el torneo.')
        });
    }

    getEstatusClass(estatus: string | undefined): string {
        const map: Record<string, string> = {
            'Planificacion': 'badge-planning',
            'Activo': 'badge-active',
            'Finalizado': 'badge-finished',
            'Cancelado': 'badge-cancelled'
        };
        return map[estatus ?? ''] ?? 'badge-planning';
    }

    getEstatusIcon(estatus: string | undefined): string {
        const map: Record<string, string> = {
            'Planificacion': 'Planificación',
            'Activo': 'Activo',
            'Finalizado': 'Finalizado',
            'Cancelado': 'Cancelado'
        };
        return map[estatus ?? ''] ?? 'Planificación';
    }

    getDuracionDias(inicio: string, fin: string): number {
        const ms = new Date(fin).getTime() - new Date(inicio).getTime();
        return Math.ceil(ms / (1000 * 60 * 60 * 24));
    }
}
