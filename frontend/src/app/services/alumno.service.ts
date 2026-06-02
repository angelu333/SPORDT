import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Alumno } from '../models/alumno.model';
import { PaginatedResponse } from '../models/paginated-response.model';
import { environment } from '../../../environments/environment';

@Injectable({
    providedIn: 'root'
})
export class AlumnoService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = `${environment.apiUrl}/alumnos`;

    getAll(): Observable<PaginatedResponse<Alumno>> {
        return this.http.get<PaginatedResponse<Alumno>>(this.apiUrl).pipe(
            catchError(this.handleError)
        );
    }

    getById(id: number): Observable<Alumno> {
        return this.http.get<Alumno>(`${this.apiUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }

    create(alumno: Alumno): Observable<Alumno> {
        return this.http.post<Alumno>(this.apiUrl, alumno).pipe(
            catchError(this.handleError)
        );
    }

    update(id: number, alumno: Alumno): Observable<Alumno> {
        return this.http.put<Alumno>(`${this.apiUrl}/${id}`, alumno).pipe(
            catchError(this.handleError)
        );
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }

    private handleError(error: any) {
        let errorMessage = 'Ocurrió un error inesperado.';
        if (error.status === 404) {
            errorMessage = 'El recurso solicitado no fue encontrado.';
        } else if (error.status === 500) {
            errorMessage = 'Error interno del servidor.';
        } else if (error.status === 0) {
            errorMessage = 'No se pudo conectar con el servidor.';
        }
        console.error(`[AlumnoService Error]: ${error.message}`);
        return throwError(() => new Error(errorMessage));
    }
}
