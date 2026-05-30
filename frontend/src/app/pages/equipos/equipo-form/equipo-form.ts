import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { EquipoService } from '../../../services/equipo.service';
import { Equipo } from '../../../models/equipo.model';

@Component({
    selector: 'app-equipo-form',
    imports: [RouterLink, FormsModule],
    templateUrl: './equipo-form.html',
    styleUrl: './equipo-form.css'
})
export class EquipoForm implements OnInit {

    private readonly equipoService = inject(EquipoService);
    private readonly router = inject(Router);
    private readonly route = inject(ActivatedRoute);

    isEditMode = signal(false);
    equipoId = signal<number | null>(null);
    loading = signal(false);
    loadingData = signal(false);
    errorMsg = signal('');
    successMsg = signal('');
    escudoPreview = signal<string>('');

    equipo: Equipo = {
        nombre_equipo: '',
        nombre_delegado: '',
        telefono_delegado: '',
        escudo: null,
        fecha_inscripcion: new Date().toISOString().slice(0, 10)
    };

    ngOnInit(): void {
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.equipoId.set(Number(id));
            this.loadEquipo(Number(id));
        }
    }

    loadEquipo(id: number): void {
        this.loadingData.set(true);
        this.equipoService.getById(id).subscribe({
            next: (data) => {
                this.equipo = {
                    nombre_equipo: data.nombre_equipo,
                    nombre_delegado: data.nombre_delegado,
                    telefono_delegado: data.telefono_delegado,
                    escudo: data.escudo,
                    fecha_inscripcion: data.fecha_inscripcion?.slice(0, 10) ?? ''
                };
                if (data.escudo) {
                    this.escudoPreview.set(data.escudo);
                }
                this.loadingData.set(false);
            },
            error: () => {
                this.errorMsg.set('No se pudo cargar el equipo.');
                this.loadingData.set(false);
            }
        });
    }

    onEscudoChange(event: Event): void {
        const input = event.target as HTMLInputElement;
        if (!input.files?.length) return;
        const file = input.files[0];
        if (file.size > 500000) {
            this.errorMsg.set('El escudo no debe superar los 500 KB.');
            return;
        }
        const reader = new FileReader();
        reader.onload = () => {
            const base64 = reader.result as string;
            this.equipo.escudo = base64;
            this.escudoPreview.set(base64);
            this.errorMsg.set('');
        };
        reader.readAsDataURL(file);
    }

    removeEscudo(): void {
        this.equipo.escudo = null;
        this.escudoPreview.set('');
    }

    onSubmit(): void {
        this.errorMsg.set('');
        this.successMsg.set('');

        if (!this.equipo.nombre_equipo.trim() || !this.equipo.nombre_delegado.trim() || !this.equipo.telefono_delegado.trim()) {
            this.errorMsg.set('Por favor completa todos los campos obligatorios.');
            return;
        }

        this.loading.set(true);

        if (this.isEditMode()) {
            this.equipoService.update(this.equipoId()!, this.equipo).subscribe({
                next: () => {
                    this.successMsg.set('Equipo actualizado correctamente.');
                    this.loading.set(false);
                    setTimeout(() => this.router.navigate(['/equipos']), 1200);
                },
                error: () => {
                    this.errorMsg.set('Error al actualizar el equipo. Intenta de nuevo.');
                    this.loading.set(false);
                }
            });
        } else {
            this.equipoService.create(this.equipo).subscribe({
                next: () => {
                    this.successMsg.set('¡Equipo registrado! Se generó un cargo de inscripción de $500.00 MXN automáticamente.');
                    this.loading.set(false);
                    setTimeout(() => this.router.navigate(['/equipos']), 1800);
                },
                error: () => {
                    this.errorMsg.set('Error al registrar el equipo. Intenta de nuevo.');
                    this.loading.set(false);
                }
            });
        }
    }
}
