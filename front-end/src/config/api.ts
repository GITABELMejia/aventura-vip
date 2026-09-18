// ============================================================================
// CONFIGURACION DEL CLIENTE DE LA API
// ----------------------------------------------------------------------------
// Centraliza la configuracion de las llamadas HTTP al backend.
//
// NOTA IMPORTANTE:
//   En desarrollo se usa la RUTA RELATIVA "/api". Vite tiene un proxy
//   configurado (vite.config.ts) que reenvia "/api/*" al backend real
//   en http://localhost:3000. Asi no hay problemas de CORS.
//
//   En produccion hay dos escenarios:
//     * Un solo servicio (Seenode): backend y frontend comparten origen, la
//       ruta relativa "/api" sigue funcionando (valor por defecto).
//     * Frontend y backend separados (ej. Vercel + Seenode): al compilar se
//       define la variable VITE_API_URL con la URL absoluta del backend
//       (ej. https://mi-backend.seenode.app/api).
// ============================================================================

/** Base de las peticiones a la API (relativa por defecto; absoluta con VITE_API_URL). */
export const API_BASE: string = import.meta.env.VITE_API_URL || '/api';

/** Ruta para guardar el token JWT en el navegador (persistencia de sesion). */
export const TOKEN_STORAGE_KEY = 'aventura_token';

/** Ruta para guardar los datos del usuario autenticado. */
export const USUARIO_STORAGE_KEY = 'aventura_usuario';