// ============================================================================
// SERVICIO: DOCUMENTOS DEL CONDUCTOR
// ----------------------------------------------------------------------------
// Subida/lectura/eliminacion de fotos de DNI y licencia (base64).
// Requiere sesion; el controlador aplica las reglas de acceso
// (conductor -> solo suyos; admin -> cualquier conductor).
// ============================================================================

import axios from 'axios';
import { API_BASE } from '../config/api';
import { leerToken, cerrarSesion } from './auth.service';
import type {
  Documento,
  DocumentoDetalle,
  LicenciaDatos,
  PeticionGuardarLicencia,
  PeticionSubirDocumento,
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

export async function listarDocumentos(usuarioId: number): Promise<Documento[]> {
  const { data } = await api.get<Documento[]>(`/usuarios/${usuarioId}/documentos`);
  return data;
}

export async function obtenerDatosLicencia(
  usuarioId: number
): Promise<LicenciaDatos | null> {
  const { data } = await api.get<LicenciaDatos | null>(
    `/usuarios/${usuarioId}/licencia`
  );
  return data;
}

export async function guardarDatosLicencia(
  usuarioId: number,
  peticion: PeticionGuardarLicencia
): Promise<{ id: number; mensaje: string }> {
  const { data } = await api.put<{ id: number; mensaje: string }>(
    `/usuarios/${usuarioId}/licencia`,
    peticion
  );
  return data;
}

export async function subirDocumento(
  usuarioId: number,
  peticion: PeticionSubirDocumento
): Promise<{ id: number; mensaje: string }> {
  const { data } = await api.post<{ id: number; mensaje: string }>(
    `/usuarios/${usuarioId}/documentos`,
    peticion
  );
  return data;
}

export async function obtenerDocumento(docId: number): Promise<DocumentoDetalle> {
  const { data } = await api.get<DocumentoDetalle>(`/documentos/${docId}`);
  return data;
}

export async function eliminarDocumento(docId: number): Promise<void> {
  await api.delete(`/documentos/${docId}`);
}