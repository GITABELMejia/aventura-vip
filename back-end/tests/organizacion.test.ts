// ============================================================================
// PRUEBAS DE INTEGRACION: MODULO ORGANIZACION (CATALOGOS DE NEGOCIO)
// ----------------------------------------------------------------------------
// CRUD de empresas, establecimientos y areas. Solo ADMIN
// (permiso GESTIONAR_CATALOGOS).
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

const SUFIJO = Date.now();
const ADMIN = { correo_o_dni: '12345678', clave: 'demo123' };
const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' };

let app: Express;
let tokenAdmin = '';
let tokenOperador = '';

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const loginAdmin = await request(app).post('/api/auth/login').send(ADMIN);
  tokenAdmin = loginAdmin.body.token as string;

  const loginOperador = await request(app).post('/api/auth/login').send(OPERADOR);
  tokenOperador = loginOperador.body.token as string;
});

describe('Seguridad del modulo', () => {
  it('responde 401 sin token', async () => {
    const respuesta = await request(app).get('/api/organizacion/empresas');
    expect(respuesta.status).toBe(401);
  });

  it('responde 403 para la operadora (sin GESTIONAR_CATALOGOS)', async () => {
    const respuesta = await request(app)
      .get('/api/organizacion/empresas')
      .set('Authorization', `Bearer ${tokenOperador}`);
    expect(respuesta.status).toBe(403);
  });
});

describe('Empresas', () => {
  it('lista las empresas sembradas', async () => {
    const respuesta = await request(app)
      .get('/api/organizacion/empresas')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    const belmond = respuesta.body.find(
      (e: { nombre: string }) => e.nombre === 'Belmond'
    );
    expect(belmond).toBeTruthy();
    expect(belmond.establecimientos).toBeGreaterThanOrEqual(3);
  });

  it('crea, edita y cambia el estado de una empresa', async () => {
    const nombre = `Empresa Prueba ${SUFIJO}`;

    const crear = await request(app)
      .post('/api/organizacion/empresas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre, ruc: '20123456789' });
    expect(crear.status).toBe(201);
    const id = crear.body.id as number;

    const editar = await request(app)
      .put(`/api/organizacion/empresas/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: `${nombre} Editada`, ruc: '20123456789' });
    expect(editar.status).toBe(200);

    const estado = await request(app)
      .patch(`/api/organizacion/empresas/${id}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ estado: 'INACTIVO' });
    expect(estado.status).toBe(200);
  });
});

describe('Establecimientos y areas', () => {
  it('crea un establecimiento y luego un area dentro de el', async () => {
    // Buscar una empresa de prueba o usar Belmond.
    const empresas = await request(app)
      .get('/api/organizacion/empresas')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    const belmond = empresas.body.find(
      (e: { nombre: string }) => e.nombre === 'Belmond'
    );

    const nombreEst = `Establecimiento Prueba ${SUFIJO}`;
    const crearEst = await request(app)
      .post('/api/organizacion/establecimientos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ empresa_id: belmond.id, nombre: nombreEst, descripcion: 'Prueba' });
    expect(crearEst.status).toBe(201);
    const estId = crearEst.body.id as number;

    const crearArea = await request(app)
      .post('/api/organizacion/areas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ establecimiento_id: estId, nombre: `Area Prueba ${SUFIJO}` });
    expect(crearArea.status).toBe(201);
  });

  it('rechaza un area sin establecimiento (400)', async () => {
    const respuesta = await request(app)
      .post('/api/organizacion/areas')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombre: 'Area suelta' });
    expect(respuesta.status).toBe(400);
  });
});
