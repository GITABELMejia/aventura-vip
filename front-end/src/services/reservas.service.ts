// ============================================================================
// SERVICIO: RESERVAS
// ----------------------------------------------------------------------------
// La operadora crea reservas (recibidas por llamada) y las despacha (asigna
// conductor). El coordinador crea y ve solo las suyas.
// ============================================================================

import axios from 'axios';
import { API_BASE } from '../config/api';
import { leerToken, cerrarSesion } from './auth.service';
import type {
  Reserva,
  PeticionCrearReserva,
  PeticionDespacharReserva,
  PeticionCambiarEstado,
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

export async function listarReservas(params: {
  estado?: string;
  q?: string;
}): Promise<Reserva[]> {
  const { data } = await api.get<Reserva[]>('/reservas', { params });
  return data;
}

export async function obtenerReserva(id: number): Promise<Reserva> {
  const { data } = await api.get<Reserva>(`/reservas/${id}`);
  return data;
}

export async function crearReserva(
  peticion: PeticionCrearReserva
): Promise<Reserva> {
  const { data } = await api.post<Reserva>('/reservas', peticion);
  return data;
}

export async function aceptarReserva(id: number): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(`/reservas/${id}/aceptar`);
  return data;
}

export async function despacharReserva(
  id: number,
  peticion: PeticionDespacharReserva
): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(`/reservas/${id}/estado`, peticion);
  return data;
}

export async function cambiarEstadoReserva(
  id: number,
  peticion: PeticionCambiarEstado
): Promise<Reserva> {
  const { data } = await api.patch<Reserva>(
    `/reservas/${id}/cambiar-estado`,
    peticion
  );
  return data;
}