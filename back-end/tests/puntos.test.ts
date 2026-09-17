// ============================================================================
// PRUEBAS DE INTEGRACION: PUNTOS DE RECOGIDA + SERVICIO DIRECTO
// ----------------------------------------------------------------------------
// El admin configura puntos (hora + lugar). El conductor crea servicios
// directos sobre reservas sin asignar que coincidan con el punto (lugar) y
// cuya hora de recogida sea >= la hora configurada.
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { pool } from '../src/config/database';

const ADMIN = { correo_o_dni: '12345678', clave: 'demo123' };
const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' };
const CONDUCTOR = { correo_o_dni: '34567890', clave: 'demo123' }; // jorge

let app: Express;
let tokenAdmin = '';
let tokenOperador = '';
let tokenConductor = '';
let conductorId = 0;

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const admin = await request(app).post('/api/auth/login').send(ADMIN);
  tokenAdmin = admin.body.token as string;

  const operador = await request(app).post('/api/auth/login').send(OPERADOR);
  tokenOperador = operador.body.token as string;

  const conductor = await request(app).post('/api/auth/login').send(CONDUCTOR);
  tokenConductor = conductor.body.token as string;
  conductorId = conductor.body.usuario.id as number;

  await pool.query('DELETE FROM RESERVAS');
  await pool.query('DELETE FROM SERVICIO');
  await pool.query('DELETE FROM PUNTOS_RECOGIDA');
});

describe('Puntos de recogida (admin)', () => {
  it('el admin crea un punto (201)', async () => {
    const respuesta = await request(app)
      .post('/api/configuracion/puntos')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ hora: '08:00', lugar: 'Hotel Monasterio' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.id).toBeTruthy();
  });

  it('el admin lista los puntos', async () => {
    const lista = await request(app)
      .get('/api/configuracion/puntos')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(lista.status).toBe(200);
    expect(lista.body.length).toBe(1);
    expect(lista.body[0].lugar).toBe('Hotel Monasterio');
  });

  it('el admin edita el punto (200)', async () => {
    const lista = await request(app)
      .get('/api/configuracion/puntos')
      .set('Authorization', `Bearer ${tokenAdmin}`);
    const id = lista.body[0].id as number;

    const editado = await request(app)
      .put(`/api/configuracion/puntos/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ hora: '07:30', lugar: 'Hotel Monasterio' });

    expect(editado.status).toBe(200);
  });

  it('la operadora NO puede crear puntos (403)', async () => {
    const respuesta = await request(app)
      .post('/api/configuracion/puntos')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ hora: '09:00', lugar: 'Palacio Nazarenas' });

    expect(respuesta.status).toBe(403);
  });
});

describe('Servicio directo del conductor', () => {
  it('prepara una reserva sin asignar que coincide con el punto', async () => {
    const creada = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        pasajero_nombre: 'Pasajero Pool',
        fecha_hora: '2026-12-20T09:00:00Z',
        origen: 'Hotel Monasterio',
        destino: 'Aeropuerto',
      });

    expect(creada.status).toBe(201);
  });

  it('el conductor ve la reserva en el pool', async () => {
    const lista = await request(app)
      .get('/api/servicios/disponibles-pool')
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(lista.status).toBe(200);
    expect(lista.body.length).toBeGreaterThanOrEqual(1);
    expect(lista.body[0].pasajero_nombre).toBe('Pasajero Pool');
  });

  it('el conductor crea el servicio directo (auto-asignado)', async () => {
    const lista = await request(app)
      .get('/api/servicios/disponibles-pool')
      .set('Authorization', `Bearer ${tokenConductor}`);
    const reservaId = lista.body[0].id as number;

    const respuesta = await request(app)
      .post('/api/servicios/iniciar-directo')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: reservaId });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.id).toBeTruthy();
  });

  it('el servicio queda asignado al conductor y EN_CURSO', async () => {
    const lista = await request(app)
      .get('/api/servicios/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(lista.status).toBe(200);
    const servicio = lista.body.find(
      (s: { pasajeros: { pasajero_nombre: string }[] }) =>
        s.pasajeros.some((p) => p.pasajero_nombre === 'Pasajero Pool')
    );
    expect(servicio).toBeTruthy();
    expect(servicio.estado).toBe('EN_CURSO');
  });

  it('una reserva fuera del punto no aparece en el pool', async () => {
    // Origen no configurado como punto activo.
    await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        pasajero_nombre: 'Fuera de punto',
        fecha_hora: '2026-12-20T09:00:00Z',
        origen: 'Otra Ubicacion',
        destino: 'Plaza',
      });

    const lista = await request(app)
      .get('/api/servicios/disponibles-pool')
      .set('Authorization', `Bearer ${tokenConductor}`);

    const nombres = lista.body.map((r: { pasajero_nombre: string }) => r.pasajero_nombre);
    expect(nombres).not.toContain('Fuera de punto');
  });
});