// ============================================================================
// TIPOS Y CONTRATOS DEL MODULO DE USUARIOS (GESTION)
// ============================================================================

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
// CATALOGOS (alimentan los formularios del frontend)
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
