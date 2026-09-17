// ============================================================================
// PRUEBAS DE INTEGRACION: FOTO DE PERFIL
// ----------------------------------------------------------------------------
// Reglas: el propio usuario sube su foto; el admin (GESTIONAR_USUARIOS) la de
// cualquiera; la operadora (sin GESTIONAR_USUARIOS) solo la propia.
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// PNG 1x1 (valido, < 2MB).
const BASE64_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const ADMIN = { correo_o_dni: '12345678', clave: 'demo123' };
const CONDUCTOR = { correo_o_dni: '34567890', clave: 'demo123' };
const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' };

let app: Express;
let tokenAdmin = '';
let tokenConductor = '';
let tokenOperador = '';
let adminId = 0;
let conductorId = 0;
let operadorId = 0;

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const admin = await request(app).post('/api/auth/login').send(ADMIN);
  tokenAdmin = admin.body.token as string;
  adminId = admin.body.usuario.id as number;

  const conductor = await request(app).post('/api/auth/login').send(CONDUCTOR);
  tokenConductor = conductor.body.token as string;
  conductorId = conductor.body.usuario.id as number;

  const operador = await request(app).post('/api/auth/login').send(OPERADOR);
  tokenOperador = operador.body.token as string;
  operadorId = operador.body.usuario.id as number;
});

function cuerpoFoto(mime = 'image/png', b64 = BASE64_PNG) {
  return { mime, contenido_b64: b64 };
}

describe('Subida de foto de perfil', () => {
  it('el admin sube la foto de un conductor (200)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/foto`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send(cuerpoFoto());

    expect(respuesta.status).toBe(200);
  });

  it('el login devuelve la foto guardada', async () => {
    const login = await request(app).post('/api/auth/login').send(CONDUCTOR);
    expect(login.body.usuario.foto_b64).toBeTruthy();
    expect(login.body.usuario.foto_mime).toBe('image/png');
  });

  it('el conductor sube su propia foto (200)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/foto`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(cuerpoFoto());

    expect(respuesta.status).toBe(200);
  });

  it('la operadora sube su propia foto (200)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${operadorId}/foto`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send(cuerpoFoto());

    expect(respuesta.status).toBe(200);
  });

  it('rechaza un MIME no permitido (400)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/foto`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(cuerpoFoto('image/gif'));

    expect(respuesta.status).toBe(400);
  });
});

describe('Reglas de acceso', () => {
  it('el conductor NO puede subir la foto de otro usuario (403)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${adminId}/foto`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(cuerpoFoto());

    expect(respuesta.status).toBe(403);
  });

  it('la operadora NO puede subir la foto de un conductor (403)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/foto`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send(cuerpoFoto());

    expect(respuesta.status).toBe(403);
  });

  it('la operadora NO puede eliminar la foto de otro usuario (403)', async () => {
    const respuesta = await request(app)
      .delete(`/api/usuarios/${conductorId}/foto`)
      .set('Authorization', `Bearer ${tokenOperador}`);

    expect(respuesta.status).toBe(403);
  });
});

describe('Eliminar foto', () => {
  it('el admin elimina la foto de un conductor (200) y queda sin foto', async () => {
    const eliminar = await request(app)
      .delete(`/api/usuarios/${conductorId}/foto`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(eliminar.status).toBe(200);

    const login = await request(app).post('/api/auth/login').send(CONDUCTOR);
    expect(login.body.usuario.foto_b64 ?? null).toBeNull();
  });
});