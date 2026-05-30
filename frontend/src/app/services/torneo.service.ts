import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Torneo } from '../models/torneo.model';

@Injectable({
    providedIn: 'root'
})
export class TorneoService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api/torneos';

    getAll(): Observable<Torneo[]> {
        return this.http.get<Torneo[]>(this.apiUrl);
    }

    getById(id: number): Observable<Torneo> {
        return this.http.get<Torneo>(`${this.apiUrl}/${id}`);
    }

    create(torneo: Torneo): Observable<Torneo> {
        return this.http.post<Torneo>(this.apiUrl, torneo);
    }

    update(id: number, torneo: Torneo): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, torneo);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }
}
