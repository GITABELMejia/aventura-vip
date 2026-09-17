// ============================================================================
// VALIDADOR DE VARIABLES DE ENTORNO
// ----------------------------------------------------------------------------
// Este archivo centraliza la lectura y VALIDACION de las variables del
// archivo .env (PORT, DATABASE_URL, JWT_SECRET, JWT_EXPIRES_IN).
//
// Beneficios de validarlas aqui:
//   1) Si falta una variable vital, el servidor NO ARRANCA con un mensaje
//      claro (evita errores confusos a mitad de ejecucion).
//   2) Se exporta un objeto "env" tipado, de modo que el resto del codigo
//      nunca accede directamente a process.env y siempre sabe que tipo de
//      dato espera (seguridad y mantenimiento).
// ============================================================================

import dotenv from 'dotenv';

// Carga las variables definidas en el archivo .env a process.env.
dotenv.config();

// Lista de variables OBLIGATORIAS. Si alguna falta, el servidor no arranca.
const VARIABLES_OBLIGATORIAS = ['DATABASE_URL', 'JWT_SECRET'] as const;

// Separador de la lista de origenes permitidos para CORS.
const SEPARADOR_ORIGENES = ',';

// Verificamos que existan. Si no, lanzamos un error claro en la consola.
for (const variable of VARIABLES_OBLIGATORIAS) {
  if (!process.env[variable]) {
    throw new Error(
      `[CONFIG] Falta la variable de entorno ${variable}. Verifica el archivo .env`
    );
  }
}

// Objeto de configuracion tipado y exportado.
export const env = {
  port: Number(process.env.PORT) || 3000,
  databaseUrl: process.env.DATABASE_URL as string,
  jwtSecret: process.env.JWT_SECRET as string,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '12h',
  // Lista de origenes permitidos por CORS (separados por coma).
  // Si no se configura, se permiten los origenes de desarrollo local.
  corsOrigenes: (process.env.CORS_ORIGENES || 'http://localhost:5173,http://localhost:4173')
    .split(SEPARADOR_ORIGENES)
    .map((origen) => origen.trim())
    .filter(Boolean),
  // Maximo de intentos de login por IP y por ventana de tiempo (rate limit).
  loginMaxIntentos: Number(process.env.LOGIN_MAX_INTENTOS) || 5,
  loginVentanaMs: Number(process.env.LOGIN_VENTANA_MS) || 60_000,
};
