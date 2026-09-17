// ============================================================================
// SERVICIO: ORGANIZACION (CATALOGOS DE NEGOCIO)
// ----------------------------------------------------------------------------
// Gestion de empresas, establecimientos y areas del sistema. Requiere el
// permiso GESTIONAR_CATALOGOS (solo admin).
// ============================================================================

import axios from 'axios';
import { API_BASE } from '../config/api';
import { leerToken, cerrarSesion } from './auth.service';
import type {
  AreaAdmin,
  EmpresaAdmin,
  EstablecimientoAdmin,
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

// ----------------------------------------------------------------------------
// EMPRESAS
// ----------------------------------------------------------------------------
export async function listarEmpresasAdmin(): Promise<EmpresaAdmin[]> {
  const { data } = await api.get<EmpresaAdmin[]>('/organizacion/empresas');
  return data;
}

export async function guardarEmpresa(peticion: {
  id?: number;
  nombre: string;
  ruc?: string;
  telefono?: string;
  direccion?: string;
  estado?: string;
}): Promise<{ id: number }> {
  const url = peticion.id
    ? `/organizacion/empresas/${peticion.id}`
    : '/organizacion/empresas';
  const { data } = peticion.id
    ? await api.put<{ id: number }>(url, peticion)
    : await api.post<{ id: number }>(url, peticion);
  return data;
}

export async function cambiarEstadoEmpresa(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO'
): Promise<void> {
  await api.patch(`/organizacion/empresas/${id}/estado`, { estado });
}

// ----------------------------------------------------------------------------
// ESTABLECIMIENTOS
// ----------------------------------------------------------------------------
export async function listarEstablecimientosAdmin(): Promise<EstablecimientoAdmin[]> {
  const { data } = await api.get<EstablecimientoAdmin[]>(
    '/organizacion/establecimientos'
  );
  return data;
}

export async function guardarEstablecimiento(peticion: {
  id?: number;
  empresa_id: number;
  nombre: string;
  descripcion?: string;
  estado?: string;
}): Promise<{ id: number }> {
  const url = peticion.id
    ? `/organizacion/establecimientos/${peticion.id}`
    : '/organizacion/establecimientos';
  const { data } = peticion.id
    ? await api.put<{ id: number }>(url, peticion)
    : await api.post<{ id: number }>(url, peticion);
  return data;
}

export async function cambiarEstadoEstablecimiento(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO'
): Promise<void> {
  await api.patch(`/organizacion/establecimientos/${id}/estado`, { estado });
}

// ----------------------------------------------------------------------------
// AREAS
// ----------------------------------------------------------------------------
export async function listarAreasAdmin(): Promise<AreaAdmin[]> {
  const { data } = await api.get<AreaAdmin[]>('/organizacion/areas');
  return data;
}

export async function guardarArea(peticion: {
  id?: number;
  establecimiento_id: number;
  nombre: string;
  descripcion?: string;
  estado?: string;
}): Promise<{ id: number }> {
  const url = peticion.id
    ? `/organizacion/areas/${peticion.id}`
    : '/organizacion/areas';
  const { data } = peticion.id
    ? await api.put<{ id: number }>(url, peticion)
    : await api.post<{ id: number }>(url, peticion);
  return data;
}

export async function cambiarEstadoArea(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO'
): Promise<void> {
  await api.patch(`/organizacion/areas/${id}/estado`, { estado });
}
