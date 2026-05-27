export interface Categoria {
    id_categoria?: number;
    nombre_categoria: string;
    edad_minima: number;
    edad_maxima: number;
    descripcion?: string | null;
    activo?: number;
    total_alumnos?: number; // Campo calculado por el JOIN en getAll
}

// Respuesta del endpoint /api/categorias/asignar
export interface AsignacionCategoria {
    categoria: Categoria | null;
    edad: number;
    message: string;
}
