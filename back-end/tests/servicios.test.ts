// ============================================================================
// PRUEBAS DE INTEGRACION: SERVICIOS (agrupa varios pasajeros)
// ----------------------------------------------------------------------------
// Al recoger al primer pasajero se crea el servicio; luego se agregan mas
// reservas (pasajeros) y al final se finaliza. El conductor opera sus propios
// viajes; la operadora/admin ven el historial.
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { pool } from '../src/config/database';

const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' };
const CONDUCTOR = { correo_o_dni: '34567890', clave: 'demo123' }; // jorge
const CONDUCTOR2 = { correo_o_dni: '31555789', clave: 'demo123' }; // rosa

let app: Express;
let tokenOperador = '';
let tokenConductor = '';
let tokenConductor2 = '';
let conductorId = 0;
let servicioId = 0;
let reserva1 = 0;
let reserva2 = 0;

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const operador = await request(app).post('/api/auth/login').send(OPERADOR);
  tokenOperador = operador.body.token as string;

  const conductor = await request(app).post('/api/auth/login').send(CONDUCTOR);
  tokenConductor = conductor.body.token as string;
  conductorId = conductor.body.usuario.id as number;

  const conductor2 = await request(app).post('/api/auth/login').send(CONDUCTOR2);
  tokenConductor2 = conductor2.body.token as string;

  await pool.query('DELETE FROM RESERVAS');
  await pool.query('DELETE FROM SERVICIO');
});

async function crearYDespachar(nombre: string): Promise<number> {
  const creada = await request(app)
    .post('/api/reservas')
    .set('Authorization', `Bearer ${tokenOperador}`)
    .send({
      pasajero_nombre: nombre,
      fecha_hora: '2026-12-10T08:00:00Z',
      origen: 'Hotel Monasterio',
      destino: 'Aeropuerto',
    });
  const id = creada.body.id as number;
  await request(app)
    .patch(`/api/reservas/${id}/aceptar`)
    .set('Authorization', `Bearer ${tokenOperador}`);
  await request(app)
    .patch(`/api/reservas/${id}/estado`)
    .set('Authorization', `Bearer ${tokenOperador}`)
    .send({ conductor_id: conductorId });
  return id;
}

describe('Flujo de servicio con varios pasajeros', () => {
  it('prepara dos reservas despachadas al conductor', async () => {
    reserva1 = await crearYDespachar('Pasajero Uno');
    reserva2 = await crearYDespachar('Pasajero Dos');

    const disponibles = await request(app)
      .get('/api/servicios/reservas-disponibles')
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(disponibles.status).toBe(200);
    expect(disponibles.body.length).toBe(2);
  });

  it('el conductor inicia el servicio recogiendo al primer pasajero', async () => {
    const respuesta = await request(app)
      .post('/api/servicios/iniciar')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: reserva1 });

    expect(respuesta.status).toBe(201);
    servicioId = respuesta.body.id as number;
    expect(servicioId).toBeTruthy();
  });

  it('el servicio tiene un pasajero y aparece como EN_CURSO', async () => {
    const lista = await request(app)
      .get('/api/servicios/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);

    const servicio = lista.body.find((s: { id: number }) => s.id === servicioId);
    expect(servicio).toBeTruthy();
    expect(servicio.estado).toBe('EN_CURSO');
    expect(servicio.pasajeros.length).toBe(1);
  });

  it('el conductor agrega el segundo pasajero al servicio', async () => {
    const respuesta = await request(app)
      .post(`/api/servicios/${servicioId}/reservas`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ reserva_id: reserva2 });

    expect(respuesta.status).toBe(200);

    const lista = await request(app)
      .get('/api/servicios/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    const servicio = lista.body.find((s: { id: number }) => s.id === servicioId);
    expect(servicio.pasajeros.length).toBe(2);
  });

  it('otro conductor NO puede agregar a este servicio (403)', async () => {
    const reserva3 = await crearYDespachar('Pasajero Tres');
    const respuesta = await request(app)
      .post(`/api/servicios/${servicioId}/reservas`)
      .set('Authorization', `Bearer ${tokenConductor2}`)
      .send({ reserva_id: reserva3 });

    expect(respuesta.status).toBe(403);
  });

  it('el conductor finaliza el servicio', async () => {
    const respuesta = await request(app)
      .patch(`/api/servicios/${servicioId}/finalizar`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(respuesta.status).toBe(200);

    const lista = await request(app)
      .get('/api/servicios/mios')
      .set('Authorization', `Bearer ${tokenConductor}`);
    const servicio = lista.body.find((s: { id: number }) => s.id === servicioId);
    expect(servicio.estado).toBe('COMPLETADA');
    expect(servicio.hora_finalizado).toBeTruthy();
    expect(servicio.pasajeros.length).toBe(2);
  });

  it('la operadora ve el servicio en el historial con sus pasajeros', async () => {
    const lista = await request(app)
      .get('/api/servicios')
      .set('Authorization', `Bearer ${tokenOperador}`);

    const servicio = lista.body.find((s: { id: number }) => s.id === servicioId);
    expect(servicio).toBeTruthy();
    expect(servicio.estado).toBe('COMPLETADA');
    expect(servicio.pasajeros.length).toBe(2);
  });
});