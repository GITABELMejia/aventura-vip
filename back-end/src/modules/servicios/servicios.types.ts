// ============================================================================
// TIPOS Y CONTRATOS DEL MODULO DE SERVICIOS
// ============================================================================

/** Reserva asignada a un conductor, aun sin servicio (pendiente de recoger). */
export interface ReservaDisponible {
  id: number;
  pasajero_nombre: string;
  pasajero_telefono: string | null;
  fecha_hora: string;
  origen: string;
  destino: string;
  num_pasajeros: number;
  notas: string | null;
  estado: string;
  codigo_secreto: string | null;
  pasajero_dni: string | null;
  pasajero_correo: string | null;
}

/** Pasajero dentro de un servicio. */
export interface PasajeroServicio {
  id: number;
  pasajero_nombre: string;
  pasajero_telefono: string | null;
  origen: string;
  destino: string;
  num_pasajeros: number;
  estado: string;
  codigo_secreto: string | null;
}

/** Servicio (viaje ejecutado) que agrupa pasajeros. */
export interface Servicio {
  id: number;
  estado: string;
  hora_recogida: string | null;
  hora_finalizado: string | null;
  creado_at: string | null;
  pasajeros: PasajeroServicio[];
}

/** Servicio en el historial de operadora/admin. */
export interface ServicioHistorial {
  id: number;
  conductor_id: number | null;
  conductor: string | null;
  hora_recogida: string | null;
  hora_finalizado: string | null;
  estado: string;
  creado_at: string | null;
  pasajeros: string[];
}