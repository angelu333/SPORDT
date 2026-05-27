export interface Alumno {
    id_alumno?: number;
    id_tutor: number;
    nombre_completo: string;
    fecha_nacimiento: string;
    genero?: 'M' | 'F' | null;
    curp?: string | null;
    id_categoria?: number | null;
    estatus?: 'Activo' | 'Inactivo' | 'Baja';
    fecha_inscripcion?: string;
    
    // Campos provenientes de los JOIN (readonly)
    tutor_nombre?: string;
    nombre_categoria?: string;
}
