import { Categoria } from './categoria.model';

export type TorneoEstatus = 'Planificacion' | 'Activo' | 'Finalizado' | 'Cancelado';

export interface Torneo {
    id_torneo?: number;
    nombre_torneo: string;
    fecha_inicio: string;
    fecha_fin: string;
    reglamento?: string | null;
    estatus?: TorneoEstatus;
    fecha_creacion?: string;
    // Campos calculados desde JOINs
    categorias?: Categoria[];
    nombres_categorias?: string;  // GROUP_CONCAT del getAll
    ids_categorias?: string;      // GROUP_CONCAT del getAll
}
