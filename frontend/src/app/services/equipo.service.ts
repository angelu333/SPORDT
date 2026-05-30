import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Equipo, Jugador } from '../models/equipo.model';

@Injectable({
    providedIn: 'root'
})
export class EquipoService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api/equipos';

    getAll(): Observable<Equipo[]> {
        return this.http.get<Equipo[]>(this.apiUrl);
    }

    getById(id: number): Observable<Equipo> {
        return this.http.get<Equipo>(`${this.apiUrl}/${id}`);
    }

    create(equipo: Equipo): Observable<Equipo> {
        return this.http.post<Equipo>(this.apiUrl, equipo);
    }

    update(id: number, equipo: Equipo): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}`, equipo);
    }

    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    // Jugadores (Plantilla)
    addJugador(idEquipo: number, jugador: Jugador): Observable<Jugador> {
        return this.http.post<Jugador>(`${this.apiUrl}/${idEquipo}/jugadores`, jugador);
    }

    removeJugador(idJugador: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/jugadores/${idJugador}`);
    }
}
