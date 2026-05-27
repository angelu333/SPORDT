import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Tutor } from '../models/tutor.model';

@Injectable({
    providedIn: 'root'
})
export class TutorService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api/tutores';

    getAll(): Observable<Tutor[]> {
        return this.http.get<Tutor[]>(this.apiUrl);
    }

    getById(id: number): Observable<Tutor> {
        return this.http.get<Tutor>(`${this.apiUrl}/${id}`);
    }

    create(tutor: Tutor): Observable<Tutor> {
        return this.http.post<Tutor>(this.apiUrl, tutor);
    }

    update(id: number, tutor: Tutor): Observable<Tutor> {
        return this.http.put<Tutor>(`${this.apiUrl}/${id}`, tutor);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
