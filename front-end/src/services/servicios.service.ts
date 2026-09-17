// ============================================================================
// SERVICIO: SERVICIOS (viaje ejecutado, agrupa pasajeros)
// ----------------------------------------------------------------------------
// El conductor inicia/finaliza servicios y agrega pasajeros; la operadora/
// admin ven el historial.
// ============================================================================

import axios from 'axios';
import { API_BASE } from '../config/api';
import { leerToken, cerrarSesion } from './auth.service';
import type {
  ReservaDisponible,
  ServicioConductor,
  ServicioHistorial,
} from '../types';

const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = leerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (respuesta) => respuesta,
  (error) => {
    if (error?.response?.status === 401) {
      cerrarSesion();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export async function listarReservasDisponibles(): Promise<ReservaDisponible[]> {
  const { data } = await api.get<ReservaDisponible[]>(
    '/servicios/reservas-disponibles'
  );
  return data;
}

export async function listarReservasPool(): Promise<ReservaDisponible[]> {
  const { data } = await api.get<ReservaDisponible[]>('/servicios/disponibles-pool');
  return data;
}

export async function listarServiciosConductor(): Promise<ServicioConductor[]> {
  const { data } = await api.get<ServicioConductor[]>('/servicios/mios');
  return data;
}

export async function listarServicios(params: {
  estado?: string;
  q?: string;
}): Promise<ServicioHistorial[]> {
  const { data } = await api.get<ServicioHistorial[]>('/servicios', { params });
  return data;
}

export async function iniciarServicio(reservaId: number): Promise<void> {
  await api.post('/servicios/iniciar', { reserva_id: reservaId });
}

export async function iniciarServicioDirecto(reservaId: number): Promise<void> {
  await api.post('/servicios/iniciar-directo', { reserva_id: reservaId });
}

export async function agregarReserva(
  servicioId: number,
  reservaId: number
): Promise<void> {
  await api.post(`/servicios/${servicioId}/reservas`, { reserva_id: reservaId });
}

export async function agregarReservaDirecto(
  servicioId: number,
  reservaId: number
): Promise<void> {
  await api.post(`/servicios/${servicioId}/reservas-directo`, {
    reserva_id: reservaId,
  });
}

export async function finalizarServicio(servicioId: number): Promise<void> {
  await api.patch(`/servicios/${servicioId}/finalizar`);
}