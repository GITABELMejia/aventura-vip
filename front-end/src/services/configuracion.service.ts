// ============================================================================
// SERVICIO: CONFIGURACION (PUNTOS DE RECOGIDA)
// ----------------------------------------------------------------------------
// El admin gestiona los puntos de recogida (hora + lugar).
// ============================================================================

import axios from 'axios';
import { API_BASE } from '../config/api';
import { leerToken, cerrarSesion } from './auth.service';
import type { PuntoRecogida } from '../types';

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

export async function listarPuntos(): Promise<PuntoRecogida[]> {
  const { data } = await api.get<PuntoRecogida[]>('/configuracion/puntos');
  return data;
}

export async function crearPunto(peticion: {
  hora: string;
  lugar: string;
}): Promise<void> {
  await api.post('/configuracion/puntos', peticion);
}

export async function actualizarPunto(
  id: number,
  peticion: { hora: string; lugar: string }
): Promise<void> {
  await api.put(`/configuracion/puntos/${id}`, peticion);
}

export async function cambiarEstadoPunto(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO'
): Promise<void> {
  await api.patch(`/configuracion/puntos/${id}/estado`, { estado });
}