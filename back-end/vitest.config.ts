// ============================================================================
// CONFIGURACION DE VITEST (pruebas automatizadas del backend)
// ----------------------------------------------------------------------------
// Las pruebas son de INTEGRACION: usan la base de datos real (contenedor
// av-test-pg) a traves de la aplicacion Express (sin levantar el puerto).
//
// REQUISITO: tener el contenedor de PostgreSQL corriendo:
//   docker start av-test-pg
//
// Comandos:
//   npm test           -> ejecuta las pruebas una vez
//   npm run test:watch -> modo vigilancia (desarrollo)
// ============================================================================

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Limite alto de intentos de login por defecto para que las pruebas de
    // autenticacion no tropiecen con el rate limit (la prueba especifica de
    // rate limit configura su propio limite bajo).
    env: {
      LOGIN_MAX_INTENTOS: '1000',
      LOGIN_VENTANA_MS: '60000',
    },
    // Archivos de prueba.
    include: ['tests/**/*.test.ts'],
    // Las pruebas dependen de una base de datos compartida: correr en serie.
    fileParallelism: false,
  },
});
