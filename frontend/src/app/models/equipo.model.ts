export interface Jugador {
    id_jugador?: number;
    id_equipo: number;
    nombre_completo: string;
    curp?: string | null;
    numero_dorsal?: number | null;
    activo?: number;
    fecha_registro?: string;
}

export interface Equipo {
    id_equipo?: number;
    nombre_equipo: string;
    nombre_delegado: string;
    telefono_delegado: string;
    escudo?: string | null; // Base64
    fecha_inscripcion?: string;
    activo?: number;
    total_jugadores?: number; // Campo calculado por JOIN en getAll
    jugadores?: Jugador[];
    cargos?: any[];
}
