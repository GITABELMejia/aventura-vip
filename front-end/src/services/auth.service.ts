// ============================================================================
// SERVICIO DE AUTENTICACION
// ----------------------------------------------------------------------------
// Contiene las funciones para comunicarse con el backend (login y perfil)
// y para gestionar la sesion en el navegador (guardar/leer/eliminar el token).
//
// Endpoints consumidos:
//   POST /api/auth/login  -> inicia sesion con { correo_o_dni, clave }.
//   GET  /api/auth/me     -> devuelve los datos del usuario autenticado.
//
// PERSISTENCIA DE LA SESION:
//   * "Recordarme" marcado  -> localStorage  (la sesion sobrevive al cierre).
//   * "Recordarme" sin marcar -> sessionStorage (la sesion dura solo la pestana).
//   Todas las funciones de lectura/borrado consultan AMBOS almacenes.
// ============================================================================

import axios from 'axios';
import { API_BASE, TOKEN_STORAGE_KEY, USUARIO_STORAGE_KEY } from '../config/api';
import type { PeticionLogin, RespuestaLogin, Usuario } from '../types';

// ----------------------------------------------------------------------------
// GESTION DE LA SESION EN EL NAVEGADOR
// ----------------------------------------------------------------------------

/** Devuelve el almacen (storage) segun la preferencia "recordarme". */
function almacenSesion(persistir: boolean): Storage {
  return persistir ? localStorage : sessionStorage;
}

/** Almacenes en los que puede haber una sesion (local + pestaña). */
function almacenes(): Storage[] {
  return [localStorage, sessionStorage];
}

/** Lee un valor buscando primero en localStorage y luego en sessionStorage. */
function leerDeAmbos(clave: string): string | null {
  for (const almacen of almacenes()) {
    const valor = almacen.getItem(clave);
    if (valor !== null) return valor;
  }
  return null;
}

/** Elimina una clave de ambos almacenes. */
function eliminarDeAmbos(clave: string): void {
  for (const almacen of almacenes()) {
    almacen.removeItem(clave);
  }
}

// ----------------------------------------------------------------------------
// Instancia de Axios configurada con la base de la API.
// ----------------------------------------------------------------------------
const api = axios.create({
  baseURL: API_BASE,
  headers: { 'Content-Type': 'application/json' },
});

// ----------------------------------------------------------------------------
// INTERCEPTOR DE RESPUESTA: sesion vencida (HTTP 401)
// ----------------------------------------------------------------------------
// Cuando el backend responde 401 (token expirado, invalido o usuario
// bloqueado), la sesion del navegador se elimina y se redirige al login.
// ----------------------------------------------------------------------------
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
// LOGIN
// ----------------------------------------------------------------------------
// Envia las credenciales al backend. Si son correctas, devuelve el token JWT
// y los datos del usuario. Si fallan credenciales, lanza error con mensaje.
// ----------------------------------------------------------------------------
export async function login(peticion: PeticionLogin): Promise<RespuestaLogin> {
  const { data } = await api.post<RespuestaLogin>('/auth/login', peticion);
  return data;
}

// ----------------------------------------------------------------------------
// PERFIL (DATOS DEL USUARIO AUTENTICADO)
// ----------------------------------------------------------------------------
// Llama a GET /api/auth/me enviando el token en el encabezado Authorization.
// Confirma que el usuario siga activo en la base de datos.
// ----------------------------------------------------------------------------
export async function obtenerPerfil(token: string) {
  const { data } = await api.get('/auth/me', {
    headers: { Authorization: `Bearer ${token}` },
  });
  return data;
}

// ----------------------------------------------------------------------------
// GESTION DE LA SESION EN EL NAVEGADOR
// ----------------------------------------------------------------------------

/**
 * Guarda el token y los datos del usuario en el almacenamiento del navegador.
 * @param persistir true -> localStorage (sesion persistente); false -> sessionStorage.
 */
export function guardarSesion(respuesta: RespuestaLogin, persistir: boolean): void {
  const almacen = almacenSesion(persistir);
  eliminarDeAmbos(TOKEN_STORAGE_KEY);
  eliminarDeAmbos(USUARIO_STORAGE_KEY);
  almacen.setItem(TOKEN_STORAGE_KEY, respuesta.token);
  almacen.setItem(USUARIO_STORAGE_KEY, JSON.stringify(respuesta.usuario));
}

/** Lee el token guardado (o null si no hay sesion). */
export function leerToken(): string | null {
  return leerDeAmbos(TOKEN_STORAGE_KEY);
}

/** Lee el usuario guardado (o null si no hay sesion). */
export function leerUsuario(): Usuario | null {
  const datos = leerDeAmbos(USUARIO_STORAGE_KEY);
  if (!datos) return null;
  try {
    return JSON.parse(datos) as Usuario;
  } catch {
    return null;
  }
}

/**
 * Actualiza el usuario guardado en los almacenes donde exista una sesion.
 * Se usa para refrescar la foto de perfil sin necesidad de re-loguear.
 */
export function actualizarUsuarioSesion(usuario: Usuario): void {
  for (const almacen of almacenes()) {
    if (almacen.getItem(USUARIO_STORAGE_KEY) !== null) {
      almacen.setItem(USUARIO_STORAGE_KEY, JSON.stringify(usuario));
    }
  }
}

/** Elimina la sesion del navegador (logout). */
export function cerrarSesion(): void {
  eliminarDeAmbos(TOKEN_STORAGE_KEY);
  eliminarDeAmbos(USUARIO_STORAGE_KEY);
}

// ----------------------------------------------------------------------------
// VALIDACION DE EXPIRACION DEL TOKEN (lado cliente)
// ----------------------------------------------------------------------------
// Decodifica el JWT (solo su cabecera/carga, no se verifica la firma aqui)
// para saber si ya caduco y evitar abrir el Dashboard con una sesion muerta.
// ----------------------------------------------------------------------------
export function tokenEstaExpirado(token: string): boolean {
  try {
    const carga = JSON.parse(atob(token.split('.')[1]));
    return typeof carga.exp === 'number' && carga.exp * 1000 < Date.now();
  } catch {
    return true;
  }
}
