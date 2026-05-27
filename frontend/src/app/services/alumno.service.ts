import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Alumno } from '../models/alumno.model';

@Injectable({
    providedIn: 'root'
})
export class AlumnoService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api/alumnos';

    getAll(): Observable<Alumno[]> {
        return this.http.get<Alumno[]>(this.apiUrl);
    }

    getById(id: number): Observable<Alumno> {
        return this.http.get<Alumno>(`${this.apiUrl}/${id}`);
    }

    create(alumno: Alumno): Observable<Alumno> {
        return this.http.post<Alumno>(this.apiUrl, alumno);
    }

    update(id: number, alumno: Alumno): Observable<Alumno> {
        return this.http.put<Alumno>(`${this.apiUrl}/${id}`, alumno);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
