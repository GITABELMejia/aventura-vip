// ============================================================================
// CONEXION A POSTGRESQL (POOL)
// ----------------------------------------------------------------------------
// Este archivo crea y exporta el "pool" (grupo) de conexiones a la base de
// datos. En vez de abrir y cerrar una conexion por cada consulta (lento),
// se mantienen varias conexiones abiertas listas para usarse al instante.
//
// La cadena de conexion ya viene validada desde config/env.ts.
// ============================================================================

import { Pool } from 'pg';
import { env } from './env';

// Se crea el pool con la cadena de conexion de PostgreSQL.
export const pool = new Pool({
  connectionString: env.databaseUrl,
});

// Control de errores: si una conexion del pool se pierde o falla, se
// registra el error en la consola para poder diagnosticarlo facilmente.
pool.on('error', (err) => {
  console.error('Error inesperado en una conexion del pool:', err);
});
