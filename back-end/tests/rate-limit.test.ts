// ============================================================================
// PRUEBAS DE INTEGRACION: RATE LIMIT DEL LOGIN
// ----------------------------------------------------------------------------
// Verifica que el endpoint /api/auth/login limite los intentos por IP.
// Se importa la aplicacion con un limite bajo (3 intentos) para no esperar.
// ============================================================================

import { describe, expect, it, vi } from 'vitest';
import request from 'supertest';

// Se crea una instancia de la aplicacion con un rate limit bajo (3 intentos),
// reimportando los modulos para que env.ts lea las nuevas variables.
async function crearAppConLimite(maxIntentos: number) {
  vi.resetModules();
  process.env.LOGIN_MAX_INTENTOS = String(maxIntentos);
  process.env.LOGIN_VENTANA_MS = '60000';
  const { default: aplicacion } = await import('../src/app');
  return aplicacion;
}

describe('Rate limit de POST /api/auth/login', () => {
  it('responde 429 al superar el maximo de intentos permitidos', async () => {
    const app = await crearAppConLimite(3);
    const peticion = () =>
      request(app)
        .post('/api/auth/login')
        .send({ correo_o_dni: 'admin@aventura.com', clave: 'clave-incorrecta' });

    // Los 3 primeros intentos pasan el limite (fallan por credenciales).
    for (let i = 0; i < 3; i++) {
      const respuesta = await peticion();
      expect(respuesta.status).toBe(401);
    }

    // El cuarto intento ya esta fuera del limite: HTTP 429.
    const bloqueado = await peticion();
    expect(bloqueado.status).toBe(429);
  });
});
