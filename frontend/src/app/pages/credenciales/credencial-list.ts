import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { CredencialService } from '../../services/credencial.service';
import { TorneoService } from '../../services/torneo.service';
import { EquipoService } from '../../services/equipo.service';
import { Credencial, CredencialEstatus, JugadorCredencialFiltrado } from '../../models/credencial.model';
import { Torneo } from '../../models/torneo.model';
import { Equipo } from '../../models/equipo.model';

@Component({
    selector: 'app-credencial-list',
    imports: [RouterLink, DatePipe, CurrencyPipe, FormsModule],
    templateUrl: './credencial-list.html',
    styleUrl: './credencial-list.css'
})
export class CredencialList implements OnInit {

    private readonly credencialService = inject(CredencialService);
    private readonly torneoService = inject(TorneoService);
    private readonly equipoService = inject(EquipoService);

    // Navegación de pestañas
    activeTab = signal<'emision' | 'listado'>('emision');

    // Catálogos generales
    torneos = signal<Torneo[]>([]);
    equipos = signal<Equipo[]>([]);
    credenciales = signal<Credencial[]>([]);

    // Selección actual en el control operativo
    selectedTorneoId = signal<number | null>(null);
    selectedEquipoId = signal<number | null>(null);

    // Plantilla de jugadores para el control operativo
    roster = signal<JugadorCredencialFiltrado[]>([]);
    loadingRoster = signal(false);
    loadingCredenciales = signal(false);

    // Estatus de carga de acciones
    savingJugadorId = signal<number | null>(null);
    updatingCredencialId = signal<number | null>(null);

    // Alertas
    errorMsg = signal('');
    successMsg = signal('');

    // Filtros para la pestaña "Listado de Credenciales"
    generalSearch = signal('');
    generalEstatus = signal<string>('');
    generalTorneo = signal<string>('');

    // KPIs calculados dinámicamente
    kpis = computed(() => {
        const list = this.credenciales();
        const total = list.length;
        const proyectado = list.reduce((acc, c) => acc + Number(c.costo || 0), 0);
        const recaudado = list
            .filter(c => c.estatus_pago_cargo === 'Pagado')
            .reduce((acc, c) => acc + Number(c.costo || 0), 0);
        const pendiente = proyectado - recaudado;

        return {
            total,
            proyectado,
            recaudado,
            pendiente
        };
    });

    // Listado general de credenciales filtrado
    filteredCredenciales = computed(() => {
        let list = this.credenciales();
        const search = this.generalSearch().toLowerCase().trim();
        const estatus = this.generalEstatus();
        const torneo = this.generalTorneo();

        if (search) {
            list = list.filter(c => 
                c.nombre_jugador?.toLowerCase().includes(search) ||
                c.codigo_credencial.toLowerCase().includes(search) ||
                c.curp_jugador?.toLowerCase().includes(search) ||
                c.nombre_equipo?.toLowerCase().includes(search)
            );
        }

        if (estatus) {
            list = list.filter(c => c.estatus === estatus);
        }

        if (torneo) {
            list = list.filter(c => c.nombre_torneo === torneo);
        }

        return list;
    });

    ngOnInit(): void {
        this.loadCatalogos();
        this.loadAllCredenciales();
    }

    loadCatalogos(): void {
        // Cargar torneos
        this.torneoService.getAll().subscribe({
            next: (data) => {
                this.torneos.set(data.filter(t => t.estatus !== 'Cancelado'));
                // Seleccionar primer torneo activo por defecto si existe
                const activos = data.filter(t => t.estatus === 'Activo' || t.estatus === 'Planificacion');
                if (activos.length > 0) {
                    this.selectedTorneoId.set(activos[0].id_torneo!);
                } else if (data.length > 0) {
                    this.selectedTorneoId.set(data[0].id_torneo!);
                }
                this.tryLoadRoster();
            },
            error: () => this.errorMsg.set('No se pudieron cargar los torneos.')
        });

        // Cargar equipos
        this.equipoService.getAll().subscribe({
            next: (data) => {
                this.equipos.set(data.filter(e => e.activo !== 0));
                if (data.length > 0) {
                    this.selectedEquipoId.set(data[0].id_equipo!);
                }
                this.tryLoadRoster();
            },
            error: () => this.errorMsg.set('No se pudieron cargar los equipos.')
        });
    }

    loadAllCredenciales(): void {
        this.loadingCredenciales.set(true);
        this.credencialService.getAll().subscribe({
            next: (data) => {
                this.credenciales.set(data);
                this.loadingCredenciales.set(false);
            },
            error: () => {
                this.errorMsg.set('No se pudieron cargar las credenciales generales.');
                this.loadingCredenciales.set(false);
            }
        });
    }

    onSelectionChange(): void {
        this.tryLoadRoster();
    }

    tryLoadRoster(): void {
        const torneoId = this.selectedTorneoId();
        const equipoId = this.selectedEquipoId();

        if (torneoId && equipoId) {
            this.loadingRoster.set(true);
            this.roster.set([]);
            this.credencialService.getByEquipoYTorneo(equipoId, torneoId).subscribe({
                next: (data) => {
                    this.roster.set(data);
                    this.loadingRoster.set(false);
                },
                error: () => {
                    this.errorMsg.set('No se pudo cargar la plantilla de jugadores con credenciales.');
                    this.loadingRoster.set(false);
                }
            });
        }
    }

    emitirCredencial(jugador: JugadorCredencialFiltrado): void {
        const torneoId = this.selectedTorneoId();
        if (!torneoId) return;

        this.savingJugadorId.set(jugador.id_jugador);
        this.errorMsg.set('');
        this.successMsg.set('');

        this.credencialService.create({
            id_jugador: jugador.id_jugador,
            id_torneo: torneoId,
            costo: 100.00 // Tarifa estándar de credencialización obligatoria
        }).subscribe({
            next: (nuevaCredencial) => {
                this.successMsg.set(`¡Credencial ${nuevaCredencial.codigo_credencial} emitida para ${jugador.nombre_completo}! Se generó un cargo de $100.00 al equipo.`);
                this.savingJugadorId.set(null);
                
                // Recargar datos operativos y listado general
                this.tryLoadRoster();
                this.loadAllCredenciales();

                // Limpiar mensaje de éxito en unos segundos
                setTimeout(() => this.successMsg.set(''), 5000);
            },
            error: (err) => {
                this.errorMsg.set(err.error?.message || 'Error al emitir la credencial obligatoria.');
                this.savingJugadorId.set(null);
            }
        });
    }

    cambiarEstatus(id_credencial: number, nuevoEstatus: CredencialEstatus): void {
        this.updatingCredencialId.set(id_credencial);
        this.errorMsg.set('');
        this.successMsg.set('');

        this.credencialService.revoke(id_credencial, nuevoEstatus).subscribe({
            next: () => {
                this.successMsg.set(`Estatus de credencial actualizado correctamente a "${nuevoEstatus}".`);
                this.updatingCredencialId.set(null);
                
                // Recargar datos operativos y listado general
                this.tryLoadRoster();
                this.loadAllCredenciales();

                setTimeout(() => this.successMsg.set(''), 3000);
            },
            error: (err) => {
                this.errorMsg.set(err.error?.message || 'No se pudo actualizar el estatus de la credencial.');
                this.updatingCredencialId.set(null);
            }
        });
    }

    // Clases estéticas auxiliares
    getEstatusPagoClass(estatus: string | null | undefined): string {
        if (!estatus) return 'pago-ninguno';
        const map: Record<string, string> = {
            'Pendiente': 'pago-pendiente',
            'Parcial': 'pago-parcial',
            'Pagado': 'pago-pagado',
            'Vencido': 'pago-vencido'
        };
        return map[estatus] || 'pago-pendiente';
    }

    getEstatusCredencialClass(estatus: string | null | undefined): string {
        if (!estatus) return 'cred-ninguna';
        const map: Record<string, string> = {
            'Activa': 'cred-activa',
            'Inactiva': 'cred-inactiva',
            'Vencida': 'cred-vencida'
        };
        return map[estatus] || 'cred-inactiva';
    }
}
