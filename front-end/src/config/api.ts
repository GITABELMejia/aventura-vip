// ============================================================================
// CONFIGURACION DEL CLIENTE DE LA API
// ----------------------------------------------------------------------------
// Centraliza la configuracion de las llamadas HTTP al backend.
//
// NOTA IMPORTANTE:
//   En desarrollo se usa la RUTA RELATIVA "/api". Vite tiene un proxy
//   configurado (vite.config.ts) que reenvia "/api/*" al backend real
//   en http://localhost:3000. Asi no hay problemas de CORS.
// ============================================================================

/** Base de las peticiones a la API. */
export const API_BASE = '/api';

/** Ruta para guardar el token JWT en el navegador (persistencia de sesion). */
export const TOKEN_STORAGE_KEY = 'aventura_token';

/** Ruta para guardar los datos del usuario autenticado. */
export const USUARIO_STORAGE_KEY = 'aventura_usuario';