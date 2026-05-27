import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AlumnoService } from '../../../services/alumno.service';
import { TutorService } from '../../../services/tutor.service';
import { CategoriaService } from '../../../services/categoria.service';
import { Tutor } from '../../../models/tutor.model';

@Component({
    selector: 'app-alumno-form',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './alumno-form.html',
    styleUrl: './alumno-form.css'
})
export class AlumnoForm implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly alumnoService = inject(AlumnoService);
    private readonly tutorService = inject(TutorService);
    private readonly categoriaService = inject(CategoriaService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    form!: FormGroup;
    isEditMode = signal(false);
    alumnoId = signal<number | null>(null);
    loading = signal(false);
    errorMsg = signal('');
    
    // Datos auxiliares
    tutores = signal<Tutor[]>([]);
    
    // Estado de asignación de categoría
    categoriaAsignada = signal<string>('Esperando fecha de nacimiento...');
    categoriaValida = signal<boolean>(false);
    idCategoriaCalculada = signal<number | null>(null);

    ngOnInit(): void {
        this.form = this.fb.group({
            nombre_completo: ['', [Validators.required, Validators.maxLength(150)]],
            fecha_nacimiento: ['', Validators.required],
            genero: [''],
            curp: ['', Validators.maxLength(18)],
            id_tutor: ['', Validators.required],
            estatus: ['Activo'] // Solo se usa en edición, pero lo dejamos por defecto
        });

        this.loadTutores();

        // Escuchar cambios en la fecha de nacimiento para asignar categoría
        this.form.get('fecha_nacimiento')?.valueChanges.subscribe(fecha => {
            if (fecha) {
                this.calcularCategoria(fecha);
            } else {
                this.categoriaAsignada.set('Esperando fecha de nacimiento...');
                this.categoriaValida.set(false);
                this.idCategoriaCalculada.set(null);
            }
        });

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.alumnoId.set(+id);
            this.loadAlumno(+id);
        }
    }

    loadTutores(): void {
        this.tutorService.getAll().subscribe({
            next: (data) => this.tutores.set(data),
            error: (err) => console.error('Error al cargar tutores:', err)
        });
    }

    loadAlumno(id: number): void {
        this.loading.set(true);
        this.alumnoService.getById(id).subscribe({
            next: (alumno) => {
                // Al setear los valores, se disparará el valueChanges de fecha_nacimiento
                this.form.patchValue({
                    nombre_completo: alumno.nombre_completo,
                    fecha_nacimiento: alumno.fecha_nacimiento.substring(0, 10), // YYYY-MM-DD
                    genero: alumno.genero || '',
                    curp: alumno.curp || '',
                    id_tutor: alumno.id_tutor,
                    estatus: alumno.estatus
                });
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error al cargar alumno:', err);
                this.errorMsg.set('No se pudo cargar el alumno.');
                this.loading.set(false);
            }
        });
    }

    calcularCategoria(fechaNacimiento: string): void {
        this.categoriaService.asignarPorFechaNacimiento(fechaNacimiento).subscribe({
            next: (res) => {
                if (res.categoria) {
                    this.categoriaAsignada.set(res.message);
                    this.categoriaValida.set(true);
                    this.idCategoriaCalculada.set(res.categoria.id_categoria!);
                } else {
                    this.categoriaAsignada.set(res.message);
                    this.categoriaValida.set(false);
                    this.idCategoriaCalculada.set(null);
                }
            },
            error: () => {
                this.categoriaAsignada.set('Error al calcular la categoría');
                this.categoriaValida.set(false);
                this.idCategoriaCalculada.set(null);
            }
        });
    }

    onSubmit(): void {
        if (this.form.invalid) {
            this.form.markAllAsTouched();
            return;
        }

        // Advertencia si la edad no corresponde a ninguna categoría
        if (!this.categoriaValida()) {
            const continuar = confirm('La edad de este alumno no entra en ninguna categoría activa. Se guardará sin categoría deportiva asignada. ¿Deseas continuar?');
            if (!continuar) return;
        }

        this.loading.set(true);
        this.errorMsg.set('');
        
        // Preparar payload
        const formData = this.form.value;
        const payload = {
            ...formData,
            id_categoria: this.idCategoriaCalculada() // inyectamos la calculada
        };

        // Si es nuevo, forzamos estatus activo
        if (!this.isEditMode()) {
            payload.estatus = 'Activo';
        }

        if (this.isEditMode()) {
            this.alumnoService.update(this.alumnoId()!, payload).subscribe({
                next: () => this.router.navigate(['/alumnos']),
                error: (err) => {
                    this.errorMsg.set(err.error?.message || 'Error al actualizar el alumno.');
                    this.loading.set(false);
                }
            });
        } else {
            this.alumnoService.create(payload).subscribe({
                next: () => this.router.navigate(['/alumnos']),
                error: (err) => {
                    this.errorMsg.set(err.error?.message || 'Error al registrar el alumno.');
                    this.loading.set(false);
                }
            });
        }
    }

    get f() { return this.form.controls; }
}
