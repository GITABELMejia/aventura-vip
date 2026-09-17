// ============================================================================
// CONFIGURACION: PRESETS DE PERMISOS POR ROL
// ----------------------------------------------------------------------------
// Al crear/editar un usuario, elegir el rol marca automaticamente el conjunto
// de permisos recomendado (SIEMPRE editable despues con los checkboxes).
// ============================================================================

export const PRESETS_POR_ROL: Record<string, string[]> = {
  // Control total del sistema.
  ADMIN: [
    'GESTIONAR_USUARIOS',
    'CREAR_USUARIOS',
    'GESTIONAR_CATALOGOS',
    'VER_FINANZAS',
    'GESTIONAR_FLOTA',
    'GESTIONAR_CONDUCTORES',
    'CREAR_RESERVAS',
    'DESPACHAR_COLA',
    'VER_GPS',
  ],
  // La operadora: crea reservas, ve todas, asigna conductores y modifica;
  // tambien crea y edita las cuentas de los clientes que llaman.
  OPERADOR: [
    'CREAR_RESERVAS',
    'DESPACHAR_COLA',
    'VER_GPS',
    'CREAR_USUARIOS',
  ],
  // El conductor: maneja la flota y valida viajes.
  CONDUCTOR: ['VER_GPS'],
  // Cliente: sin permisos pre-marcados. La opcion de reservar se concede
  // explicitamente con el checkbox "Puede reservar viajes" (puede_reservar).
  USUARIO: [],
};

/** Preset por nombre de rol (con respaldo vacio). */
export function presetDeRol(nombreRol: string): string[] {
  return PRESETS_POR_ROL[nombreRol] ?? [];
}
