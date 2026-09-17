// ============================================================================
// TIPOS DEL FRONTEND
// ----------------------------------------------------------------------------
// Define los contratos de datos que se intercambian con la API del backend.
// Deben coincidir con los tipos devueltos por el backend (auth.types.ts).
// ============================================================================

/** Datos del usuario autenticado (devuelto por POST /api/auth/login). */
export interface Usuario {
  id: number;
  nombres: string;
  apellidos: string;
  correo: string | null;
  dni: string | null;
  telefono: string | null;
  rol: string;
  empresa: string | null;
  establecimiento: string | null;
  area: string | null;
  empresa_id: number | null;
  area_id: number | null;
  puede_reservar: boolean;
  permisos: string[];
  foto_b64?: string | null;
  foto_mime?: string | null;
}

/** Respuesta exitosa del login. */
export interface RespuestaLogin {
  token: string;
  expira_en: string | null;
  usuario: Usuario;
}

/** Cuerpo de la peticion de login. */
export interface PeticionLogin {
  correo_o_dni: string;
  clave: string;
}

/** Estructura estandar de un error de la API. */
export interface ErrorApi {
  mensaje: string;
  error?: string;
}

// ----------------------------------------------------------------------------
// MODULO DE USUARIOS (GESTION)
// ----------------------------------------------------------------------------

/** Usuario como lo devuelve el modulo de gestion (con permisos y catalogo). */
export interface UsuarioGestion {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string | null;
  correo: string | null;
  telefono: string | null;
  rol: string;
  rol_id: number;
  empresa: string | null;
  empresa_id: number | null;
  establecimiento: string | null;
  establecimiento_id: number | null;
  area: string | null;
  area_id: number | null;
  puede_reservar: boolean;
  estado: string;
  permisos: string[];
  foto_b64?: string | null;
  foto_mime?: string | null;
}

/** Cuerpo para crear un usuario nuevo. */
export interface PeticionCrearUsuario {
  nombres: string;
  apellidos: string;
  dni?: string;
  correo?: string;
  telefono?: string;
  clave: string;
  rol_id: number;
  empresa_id?: number | null;
  area_id?: number | null;
  puede_reservar?: boolean;
  permisos?: string[];
}

/** Cuerpo para editar un usuario (la clave es opcional). */
export interface PeticionActualizarUsuario {
  nombres: string;
  apellidos: string;
  dni?: string;
  correo?: string;
  telefono?: string;
  rol_id: number;
  empresa_id?: number | null;
  area_id?: number | null;
  puede_reservar?: boolean;
  clave_nueva?: string;
  permisos?: string[];
}

// ----------------------------------------------------------------------------
// CATALOGOS (formularios)
// ----------------------------------------------------------------------------

export interface CatalogoRol {
  id: number;
  nombre: string;
  descripcion: string | null;
}

export interface CatalogoEmpresa {
  id: number;
  nombre: string;
}

export interface CatalogoEstablecimiento {
  id: number;
  empresa_id: number;
  nombre: string;
}

export interface CatalogoArea {
  id: number;
  establecimiento_id: number;
  nombre: string;
}

export interface CatalogoPermiso {
  id: number;
  codigo: string;
  descripcion: string | null;
}

export interface Catalogos {
  roles: CatalogoRol[];
  empresas: CatalogoEmpresa[];
  establecimientos: CatalogoEstablecimiento[];
  areas: CatalogoArea[];
  permisos: CatalogoPermiso[];
}

// ----------------------------------------------------------------------------
// ORGANIZACION (gestion de catalogos de negocio)
// ----------------------------------------------------------------------------

export interface EmpresaAdmin {
  id: number;
  nombre: string;
  ruc: string | null;
  telefono: string | null;
  direccion: string | null;
  estado: string;
  establecimientos: number;
}

export interface EstablecimientoAdmin {
  id: number;
  empresa_id: number;
  empresa: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
  areas: number;
}

export interface AreaAdmin {
  id: number;
  establecimiento_id: number;
  establecimiento: string;
  empresa: string;
  nombre: string;
  descripcion: string | null;
  estado: string;
}

// ----------------------------------------------------------------------------
// DOCUMENTOS DEL CONDUCTOR (DNI y licencia, base64)
// ----------------------------------------------------------------------------

export type TipoDocumento = 'DNI' | 'LICENCIA';
export type CaraDocumento = 'ANVERSO' | 'REVERSO';

/** Metadatos de un documento (listado, sin base64). */
export interface Documento {
  id: number;
  tipo: TipoDocumento;
  cara: CaraDocumento;
  nombre_archivo: string;
  mime: string;
  estado: string;
  modificado_at: string | null;
}

/** Documento completo (incluye base64, para mostrar la imagen). */
export interface DocumentoDetalle extends Documento {
  usuario_id: number;
  contenido_b64: string;
}

/** Cuerpo para subir/reemplazar un documento. */
export interface PeticionSubirDocumento {
  tipo: TipoDocumento;
  cara: CaraDocumento;
  nombre_archivo: string;
  mime: string;
  contenido_b64: string;
}

/** Datos de la licencia de conducir (numero + caducidad). */
export interface LicenciaDatos {
  numero_documento: string;
  fecha_caducidad: string;
}

/** Cuerpo para guardar los datos de la licencia. */
export interface PeticionGuardarLicencia {
  numero_documento: string;
  fecha_caducidad: string;
}

// ----------------------------------------------------------------------------
// RESERVAS (viajes)
// ----------------------------------------------------------------------------

export type EstadoReserva =
  | 'PENDIENTE'
  | 'ACEPTADA'
  | 'DESPACHADA'
  | 'EN_CURSO'
  | 'COMPLETADA'
  | 'CANCELADA';

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

export interface PeticionDespacharReserva {
  conductor_id: number;
}

export interface PeticionCambiarEstado {
  estado: EstadoReserva;
}

// ----------------------------------------------------------------------------
// SERVICIOS (viaje ejecutado, agrupa varios pasajeros)
// ----------------------------------------------------------------------------

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

/** Pasajero (reserva) dentro de un servicio. */
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
export interface ServicioConductor {
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

// ----------------------------------------------------------------------------
// CONFIGURACION (puntos de recogida)
// ----------------------------------------------------------------------------

export interface PuntoRecogida {
  id: number;
  hora: string;
  lugar: string;
  estado: string;
}

/** Resultado de la busqueda de usuarios (para reservas). */
export interface UsuarioBusqueda {
  id: number;
  nombres: string;
  apellidos: string;
  dni: string | null;
  correo: string | null;
  telefono: string | null;
  rol: string;
  empresa: string | null;
  establecimiento: string | null;
  area: string | null;
}