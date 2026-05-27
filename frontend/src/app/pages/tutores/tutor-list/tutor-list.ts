import { Component, OnInit, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { TutorService } from '../../../services/tutor.service';
import { Tutor } from '../../../models/tutor.model';

@Component({
    selector: 'app-tutor-list',
    imports: [RouterLink, DatePipe],
    templateUrl: './tutor-list.html',
    styleUrl: './tutor-list.css'
})
export class TutorList implements OnInit {

    private readonly tutorService = inject(TutorService);
    private readonly router = inject(Router);

    tutores = signal<Tutor[]>([]);
    loading = signal(true);
    errorMsg = signal('');

    ngOnInit(): void {
        this.loadTutores();
    }

    loadTutores(): void {
        this.loading.set(true);
        this.errorMsg.set('');

        this.tutorService.getAll().subscribe({
            next: (data) => {
                this.tutores.set(data);
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error al cargar tutores:', err);
                this.errorMsg.set('No se pudieron cargar los tutores. Verifica que el servidor esté corriendo.');
                this.loading.set(false);
            }
        });
    }

    editTutor(id: number): void {
        this.router.navigate(['/tutores/editar', id]);
    }

    deleteTutor(tutor: Tutor): void {
        const confirmado = confirm(`¿Estás seguro de desactivar al tutor "${tutor.nombre_completo}"?`);
        if (!confirmado) return;

        this.tutorService.delete(tutor.id_tutor!).subscribe({
            next: () => {
                this.loadTutores();
            },
            error: (err) => {
                console.error('Error al eliminar tutor:', err);
                alert('No se pudo desactivar al tutor. Puede tener alumnos asociados.');
            }
        });
    }
}
