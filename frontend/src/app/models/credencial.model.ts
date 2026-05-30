export type CredencialEstatus = 'Activa' | 'Inactiva' | 'Vencida';

export interface Credencial {
    id_credencial?: number;
    id_jugador: number;
    id_torneo: number;
    codigo_credencial: string;
    costo: number;
    id_cargo?: number | null;
    estatus: CredencialEstatus;
    fecha_emision?: string;

    // Campos unidos en la consulta (JOINs)
    nombre_jugador?: string;
    curp_jugador?: string;
    dorsal_jugador?: number;
    id_equipo?: number;
    nombre_equipo?: string;
    nombre_torneo?: string;
    estatus_pago_cargo?: 'Pendiente' | 'Parcial' | 'Pagado' | 'Vencido';
}

export interface JugadorCredencialFiltrado {
    id_jugador: number;
    id_equipo: number;
    nombre_completo: string;
    curp: string | null;
    numero_dorsal: number | null;
    activo: number;
    fecha_registro: string;
    
    // Datos de credencial (si ya se emitió para el torneo seleccionado)
    id_credencial?: number | null;
    codigo_credencial?: string | null;
    costo?: number | null;
    estatus_credencial?: CredencialEstatus | null;
    fecha_emision?: string | null;
    id_cargo?: number | null;
    estatus_pago_cargo?: 'Pendiente' | 'Parcial' | 'Pagado' | 'Vencido' | null;
}
