// ============================================================================
// TIPOS Y CONTRATOS DEL MODULO DE RESERVAS
// ============================================================================

/** Posibles estados de una reserva. */
export type EstadoReserva =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'DESPACHADA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA';

/** Reserva como la devuelve el listado. */
export interface Reserva {
  id: number;
  usuario_id: number;
  creador: string;
  pasajero_nombre: string;
  pasajero_telefono: string | null;
  fecha_hora: string;
  origen: string;
  destino: string;
  num_pasajeros: number;
  notas: string | null;
  estado: EstadoReserva;
  conductor_id: number | null;
  conductor: string | null;
  codigo_secreto: string | null;
  creado_at: string;
}

/** Cuerpo para crear una reserva. */
export interface PeticionCrearReserva {
  pasajero_nombre: string;
  pasajero_telefono?: string;
  fecha_hora: string;
  origen: string;
  destino: string;
  num_pasajeros?: number;
  notas?: string;
  pasajero_usuario_id?: number | null;
}

/** Cuerpo para despachar una reserva (asignar conductor). */
export interface PeticionDespacharReserva {
  conductor_id: number;
}

/** Cuerpo para cambiar el estado de una reserva. */
export interface PeticionCambiarEstado {
  estado: EstadoReserva;
}