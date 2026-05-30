import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Credencial, CredencialEstatus, JugadorCredencialFiltrado } from '../models/credencial.model';

@Injectable({
    providedIn: 'root'
})
export class CredencialService {

    private readonly http = inject(HttpClient);
    private readonly apiUrl = 'http://localhost:3000/api/credenciales';

    getAll(): Observable<Credencial[]> {
        return this.http.get<Credencial[]>(this.apiUrl);
    }

    getByEquipoYTorneo(idEquipo: number, idTorneo: number): Observable<JugadorCredencialFiltrado[]> {
        return this.http.get<JugadorCredencialFiltrado[]>(`${this.apiUrl}/filtrar`, {
            params: {
                id_equipo: idEquipo.toString(),
                id_torneo: idTorneo.toString()
            }
        });
    }

    create(payload: { id_jugador: number; id_torneo: number; costo?: number }): Observable<Credencial> {
        return this.http.post<Credencial>(this.apiUrl, payload);
    }

    revoke(id: number, estatus: CredencialEstatus): Observable<any> {
        return this.http.put(`${this.apiUrl}/${id}/revocar`, { estatus });
    }
}
