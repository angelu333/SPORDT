export interface Tutor {
    id_tutor?: number;
    nombre_completo: string;
    telefono: string;
    email?: string | null;
    direccion?: string | null;
    activo?: number;
    fecha_registro?: string;
    total_alumnos?: number; // Campo calculado por JOIN en getAll
}
