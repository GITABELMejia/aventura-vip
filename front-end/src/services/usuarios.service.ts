// ============================================================================
// SERVICIO: MODULO DE USUARIOS (GESTION)
// ----------------------------------------------------------------------------
// Comunicacion con el backend para listar, crear, editar, cambiar estado y
// administrar permisos de usuarios. Todas las llamadas requieren sesion;
// el backend exige el permiso GESTIONAR_USUARIOS.
// ============================================================================

import axios from 'axios';
import { API_BASE } from '../config/api';
import { leerToken, cerrarSesion } from './auth.service';
import type {
  Catalogos,
  PeticionActualizarUsuario,
  PeticionCrearUsuario,
  UsuarioBusqueda,
  UsuarioGestion,
} from '../types';

// Instancia compartida con la base de la API (misma config que auth.service).
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// Interceptor de respuesta: sesion vencida (401) -> logout + redireccion.
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

// Interceptor: agrega el token de la sesion a cada peticion. Usa leerToken()
// para respetar ambos almacenes (localStorage con "Recordarme" o
// sessionStorage sin marcar).
api.interceptors.request.use((config) => {
  const token = leerToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ----------------------------------------------------------------------------
// CATALOGOS
// ----------------------------------------------------------------------------
export async function obtenerCatalogos(): Promise<Catalogos> {
  const { data } = await api.get<Catalogos>('/catalogos');
  return data;
}

// ----------------------------------------------------------------------------
// BUSQUEDA (para reservas): solo requiere sesion, no permisos de gestion.
// ----------------------------------------------------------------------------
export async function buscarUsuarios(q: string): Promise<UsuarioBusqueda[]> {
  const { data } = await api.get<UsuarioBusqueda[]>('/usuarios/buscar', {
    params: { q },
  });
  return data;
}

// ----------------------------------------------------------------------------
// USUARIOS
// ----------------------------------------------------------------------------
export async function listarUsuarios(params: {
  q?: string;
  rol?: string;
  estado?: string;
}): Promise<UsuarioGestion[]> {
  const { data } = await api.get<UsuarioGestion[]>('/usuarios', { params });
  return data;
}

export async function obtenerUsuario(id: number): Promise<UsuarioGestion> {
  const { data } = await api.get<UsuarioGestion>(`/usuarios/${id}`);
  return data;
}

export async function crearUsuario(
  peticion: PeticionCrearUsuario
): Promise<UsuarioGestion> {
  const { data } = await api.post<UsuarioGestion>('/usuarios', peticion);
  return data;
}

export async function actualizarUsuario(
  id: number,
  peticion: PeticionActualizarUsuario
): Promise<UsuarioGestion> {
  const { data } = await api.put<UsuarioGestion>(`/usuarios/${id}`, peticion);
  return data;
}

export async function cambiarEstadoUsuario(
  id: number,
  estado: 'ACTIVO' | 'INACTIVO'
): Promise<void> {
  await api.patch(`/usuarios/${id}/estado`, { estado });
}

export async function resetearClave(id: number): Promise<void> {
  await api.post(`/usuarios/${id}/reset-password`);
}

// ----------------------------------------------------------------------------
// FOTO DE PERFIL
// ----------------------------------------------------------------------------
export async function subirFotoPerfil(
  id: number,
  peticion: { mime: string; contenido_b64: string }
): Promise<void> {
  await api.put(`/usuarios/${id}/foto`, peticion);
}

export async function quitarFotoPerfil(id: number): Promise<void> {
  await api.delete(`/usuarios/${id}/foto`);
}
