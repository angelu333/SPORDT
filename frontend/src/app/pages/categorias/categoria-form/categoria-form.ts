import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CategoriaService } from '../../../services/categoria.service';

@Component({
    selector: 'app-categoria-form',
    imports: [ReactiveFormsModule, RouterLink],
    templateUrl: './categoria-form.html',
    styleUrl: './categoria-form.css'
})
export class CategoriaForm implements OnInit {

    private readonly fb = inject(FormBuilder);
    private readonly categoriaService = inject(CategoriaService);
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    form!: FormGroup;
    isEditMode = signal(false);
    categoriaId = signal<number | null>(null);
    loading = signal(false);
    errorMsg = signal('');

    ngOnInit(): void {
        this.form = this.fb.group({
            nombre_categoria: ['', [Validators.required, Validators.maxLength(50)]],
            edad_minima: [null, [Validators.required, Validators.min(0), Validators.max(99)]],
            edad_maxima: [null, [Validators.required, Validators.min(1), Validators.max(99)]],
            descripcion: ['', Validators.maxLength(255)]
        }, { validators: this.edadRangeValidator });

        const id = this.route.snapshot.paramMap.get('id');
        if (id) {
            this.isEditMode.set(true);
            this.categoriaId.set(+id);
            this.loadCategoria(+id);
        }
    }

    /** Validador personalizado: edad_minima < edad_maxima */
    edadRangeValidator(group: FormGroup) {
        const min = group.get('edad_minima')?.value;
        const max = group.get('edad_maxima')?.value;
        if (min != null && max != null && Number(min) >= Number(max)) {
            return { edadRangeInvalid: true };
        }
        return null;
    }

    loadCategoria(id: number): void {
        this.loading.set(true);
        this.categoriaService.getById(id).subscribe({
            next: (cat) => {
                this.form.patchValue({
                    nombre_categoria: cat.nombre_categoria,
                    edad_minima: cat.edad_minima,
                    edad_maxima: cat.edad_maxima,
                    descripcion: cat.descripcion || ''
                });
                this.loading.set(false);
            },
            error: (err) => {
                console.error('Error al cargar categoría:', err);
                this.errorMsg.set('No se pudo cargar la categoría.');
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
        const data = this.form.value;

        if (this.isEditMode()) {
            this.categoriaService.update(this.categoriaId()!, data).subscribe({
                next: () => this.router.navigate(['/categorias']),
                error: (err) => {
                    this.errorMsg.set(err.error?.message || 'Error al actualizar la categoría.');
                    this.loading.set(false);
                }
            });
        } else {
            this.categoriaService.create(data).subscribe({
                next: () => this.router.navigate(['/categorias']),
                error: (err) => {
                    this.errorMsg.set(err.error?.message || 'Error al crear la categoría.');
                    this.loading.set(false);
                }
            });
        }
    }

    /** Helpers para acceder a los errores de los campos en el template */
    get f() { return this.form.controls; }
}
