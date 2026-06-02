import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Categoria, AsignacionCategoria } from '../models/categoria.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class CategoriaService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/categorias`;

    /** Obtener todas las categorías activas (con conteo de alumnos) */
    getAll(): Observable<Categoria[]> {
        return this.http.get<Categoria[]>(this.apiUrl);
    }

    /** Obtener una categoría por ID */
    getById(id: number): Observable<Categoria> {
        return this.http.get<Categoria>(`${this.apiUrl}/${id}`);
    }

    /** Crear una nueva categoría */
    create(categoria: Categoria): Observable<Categoria> {
        return this.http.post<Categoria>(this.apiUrl, categoria);
    }

    /** Actualizar una categoría existente */
    update(id: number, categoria: Categoria): Observable<Categoria> {
        return this.http.put<Categoria>(`${this.apiUrl}/${id}`, categoria);
    }

    /** Desactivar una categoría (soft-delete) */
    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    /**
     * LÓGICA DE NEGOCIO:
     * Envía una fecha de nacimiento al backend y obtiene la categoría
     * correspondiente calculada automáticamente por edad.
     * Usada en el formulario de Alumnos para asignación automática.
     */
    asignarPorFechaNacimiento(fechaNacimiento: string): Observable<AsignacionCategoria> {
        return this.http.post<AsignacionCategoria>(`${this.apiUrl}/asignar`, {
            fecha_nacimiento: fechaNacimiento
        });
    }
}
