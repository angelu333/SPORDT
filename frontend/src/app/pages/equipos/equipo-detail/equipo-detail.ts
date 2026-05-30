import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe, NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EquipoService } from '../../../services/equipo.service';
import { Equipo, Jugador } from '../../../models/equipo.model';

@Component({
    selector: 'app-equipo-detail',
    imports: [RouterLink, DatePipe, CurrencyPipe, NgClass, FormsModule],
    templateUrl: './equipo-detail.html',
    styleUrl: './equipo-detail.css'
})
export class EquipoDetail implements OnInit {

    private readonly equipoService = inject(EquipoService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    equipo = signal<Equipo | null>(null);
    loading = signal(true);
    errorMsg = signal('');

    // Modal de nuevo jugador
    showAddJugador = signal(false);
    savingJugador = signal(false);
    addJugadorError = signal('');
    nuevoJugador: Jugador = { id_equipo: 0, nombre_completo: '', curp: null, numero_dorsal: null };

    // Tab activo
    activeTab = signal<'plantilla' | 'cargos'>('plantilla');

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.loadEquipo(Number(id));
        }
    }

    loadEquipo(id: number): void {
        this.loading.set(true);
        this.errorMsg.set('');
        this.equipoService.getById(id).subscribe({
            next: (data) => {
                this.equipo.set(data);
                this.nuevoJugador.id_equipo = data.id_equipo!;
                this.loading.set(false);
            },
            error: () => {
                this.errorMsg.set('No se pudo cargar el equipo.');
                this.loading.set(false);
            }
        });
    }

    openAddJugador(): void {
        this.nuevoJugador = { id_equipo: this.equipo()!.id_equipo!, nombre_completo: '', curp: null, numero_dorsal: null };
        this.addJugadorError.set('');
        this.showAddJugador.set(true);
    }

    saveJugador(): void {
        if (!this.nuevoJugador.nombre_completo.trim()) {
            this.addJugadorError.set('El nombre del jugador es obligatorio.');
            return;
        }
        this.savingJugador.set(true);
        this.addJugadorError.set('');
        this.equipoService.addJugador(this.equipo()!.id_equipo!, this.nuevoJugador).subscribe({
            next: () => {
                this.showAddJugador.set(false);
                this.savingJugador.set(false);
                this.loadEquipo(this.equipo()!.id_equipo!);
            },
            error: (err) => {
                this.addJugadorError.set(err.error?.message || 'Error al registrar el jugador.');
                this.savingJugador.set(false);
            }
        });
    }

    removeJugador(jugador: Jugador): void {
        if (!confirm(`¿Dar de baja a "${jugador.nombre_completo}" de la plantilla?`)) return;
        this.equipoService.removeJugador(jugador.id_jugador!).subscribe({
            next: () => this.loadEquipo(this.equipo()!.id_equipo!),
            error: () => alert('No se pudo dar de baja al jugador.')
        });
    }

    getInitials(nombre: string): string {
        return nombre.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
    }

    cargosPendientesCount(): number {
        const cargos: any[] = this.equipo()?.cargos ?? [];
        return cargos.filter((c: any) => c.estatus_pago === 'Pendiente' || c.estatus_pago === 'Vencido').length;
    }

    getEstatusClass(estatus: string): string {
        const map: Record<string, string> = {
            'Pendiente': 'badge-warning',
            'Parcial': 'badge-info',
            'Pagado': 'badge-success',
            'Vencido': 'badge-danger'
        };
        return map[estatus] || 'badge-default';
    }
}
