// ============================================================================
// HOOK: usePermisos
// ----------------------------------------------------------------------------
// Facilita el control de acceso por permisos (PBAC) en la interfaz.
// Lee la lista de permisos del usuario guardado en la sesion y expone:
//   * tienePermiso('GESTIONAR_USUARIOS') -> boolean
//   * tieneAlgunPermiso([...])           -> boolean
//   * permisos                           -> lista completa
// ============================================================================

import { leerUsuario } from '../services/auth.service';

export function usePermisos() {
  const usuario = leerUsuario();
  const permisos = usuario?.permisos ?? [];
  const rol = usuario?.rol ?? null;

  function tienePermiso(permiso: string): boolean {
    return permisos.includes(permiso);
  }

  function tieneAlgunPermiso(lista: string[]): boolean {
    return lista.some((p) => permisos.includes(p));
  }

  return { permisos, rol, tienePermiso, tieneAlgunPermiso };
}
