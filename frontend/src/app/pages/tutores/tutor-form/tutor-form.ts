import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TutorService } from '../../../services/tutor.service';

@Component({
    selector: 'app-tutor-form',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './tutor-form.html',
    styleUrl: './tutor-form.css'
})
export class TutorForm implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly tutorService = inject(TutorService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    form!: FormGroup;
    isEditMode = signal(false);
    tutorId = signal<number | null>(null);
    loading = signal(false);
    errorMsg = signal('');

    ngOnInit(): void {
        this.form = this.fb.group({
            nombre_completo: ['', [Validators.required, Validators.maxLength(150)]],
            telefono: ['', [Validators.required, Validators.maxLength(20)]],
            email: ['', [Validators.email, Validators.maxLength(100)]],
            direccion: ['']
        });

        // Verificar si estamos en modo edición (ruta con :id)
        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.tutorId.set(+id);
            this.loadTutor(+id);
        }
    }

    loadTutor(id: number): void {
        this.loading.set(true);
        this.tutorService.getById(id).subscribe({
            next: (tutor) => {
                this.form.patchValue({
                    nombre_completo: tutor.nombre_completo,
                    telefono: tutor.telefono,
                    email: tutor.email || '',
                    direccion: tutor.direccion || ''
                });
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error al cargar tutor:', err);
                this.errorMsg.set('No se pudo cargar el tutor.');
                this.loading.set(false);
            }
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        this.loading.set(true);
        this.errorMsg.set('');
        const tutorData = this.form.value;

        if (this.isEditMode()) {
            this.tutorService.update(this.tutorId()!, tutorData).subscribe({
                next: () => {
                    this.router.navigate(['/tutores']);
                },
                error: (err) => {
                    console.error('Error al actualizar tutor:', err);
                    this.errorMsg.set('Error al actualizar el tutor.');
                    this.loading.set(false);
                }
            });
        } else {
            this.tutorService.create(tutorData).subscribe({
                next: () => {
                    this.router.navigate(['/tutores']);
                },
                error: (err) => {
                    console.error('Error al crear tutor:', err);
                    this.errorMsg.set('Error al crear el tutor.');
                    this.loading.set(false);
                }
            });
        }
    }
}
