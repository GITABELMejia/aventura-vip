// ============================================================================
// PRUEBAS DE INTEGRACION: RESERVAS
// ----------------------------------------------------------------------------
// Flujo por llamada: la operadora crea la reserva y la despacha. El coordinador
// (CREAR_RESERVAS) crea y ve solo las suyas. Búsqueda por permiso y estados.
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { pool } from '../src/config/database';

const ADMIN = { correo_o_dni: '12345678', clave: 'demo123' };
const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' };
const CONDUCTOR = { correo_o_dni: '34567890', clave: 'demo123' }; // jorge
const COORDINADOR = { correo_o_dni: '45678901', clave: 'demo123' }; // juan (CREAR_RESERVAS)

let app: Express;
let tokenOperador = '';
let tokenConductor = '';
let tokenCoordinador = '';
let conductorId = 0;
let noConductorId = 0; // admin (rol no CONDUCTOR) para despacho invalido

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const operador = await request(app).post('/api/auth/login').send(OPERADOR);
  tokenOperador = operador.body.token as string;

  const conductor = await request(app).post('/api/auth/login').send(CONDUCTOR);
  tokenConductor = conductor.body.token as string;
  conductorId = conductor.body.usuario.id as number;

  const coordinador = await request(app).post('/api/auth/login').send(COORDINADOR);
  tokenCoordinador = coordinador.body.token as string;

  const admin = await request(app).post('/api/auth/login').send(ADMIN);
  noConductorId = admin.body.usuario.id as number;

  // Estado limpio.
  await pool.query('DELETE FROM RESERVAS');
});

function cuerpoReserva(sobre = {}) {
  return {
    pasajero_nombre: 'Cliente de Prueba',
    pasajero_telefono: '955111222',
    fecha_hora: '2026-12-01T10:00:00Z',
    origen: 'Hotel Monasterio',
    destino: 'Aeropuerto',
    num_pasajeros: 2,
    ...sobre,
  };
}

describe('Crear reserva', () => {
  it('la operadora crea una reserva (201) con codigo secreto', async () => {
    const respuesta = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send(cuerpoReserva());

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.estado).toBe('PENDIENTE');
    expect(respuesta.body.codigo_secreto).toMatch(/^\d{6}$/);
  });

  it('rechaza una reserva sin datos obligatorios (400)', async () => {
    const respuesta = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ pasajero_nombre: '', origen: '', destino: '' });

    expect(respuesta.status).toBe(400);
  });

  it('el coordinador crea una reserva (201)', async () => {
    const respuesta = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenCoordinador}`)
      .send(cuerpoReserva({ pasajero_nombre: 'Pasajero Coordinador' }));

    expect(respuesta.status).toBe(201);
  });

  it('el conductor (sin CREAR_RESERVAS) NO puede crear (403)', async () => {
    const respuesta = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send(cuerpoReserva());

    expect(respuesta.status).toBe(403);
  });
});

describe('Listar reservas', () => {
  it('la operadora ve todas las reservas', async () => {
    const lista = await request(app)
      .get('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`);

    expect(lista.status).toBe(200);
    expect(lista.body.length).toBeGreaterThanOrEqual(2);
  });

  it('el coordinador ve solo las suyas', async () => {
    const lista = await request(app)
      .get('/api/reservas')
      .set('Authorization', `Bearer ${tokenCoordinador}`);

    expect(lista.status).toBe(200);
    expect(lista.body.length).toBeGreaterThanOrEqual(1);
    for (const r of lista.body) {
      expect(r.pasajero_nombre).toBe('Pasajero Coordinador');
    }
  });
});

describe('Despacho y estados', () => {
  let reservaPendienteId = 0;

  it('prepara una reserva pendiente para despachar', async () => {
    const creada = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send(cuerpoReserva({ pasajero_nombre: 'Para Despachar' }));
    reservaPendienteId = creada.body.id as number;
  });

  it('NO se puede asignar un conductor sin aceptar primero (404)', async () => {
    const respuesta = await request(app)
      .patch(`/api/reservas/${reservaPendienteId}/estado`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ conductor_id: conductorId });

    expect(respuesta.status).toBe(404);
  });

  it('la operadora acepta la reserva (200 -> ACEPTADA)', async () => {
    const respuesta = await request(app)
      .patch(`/api/reservas/${reservaPendienteId}/aceptar`)
      .set('Authorization', `Bearer ${tokenOperador}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe('ACEPTADA');
  });

  it('el coordinador NO puede despachar (403)', async () => {
    const respuesta = await request(app)
      .patch(`/api/reservas/${reservaPendienteId}/estado`)
      .set('Authorization', `Bearer ${tokenCoordinador}`)
      .send({ conductor_id: conductorId });

    expect(respuesta.status).toBe(403);
  });

  it('despachar con un usuario no conductor falla (404)', async () => {
    const respuesta = await request(app)
      .patch(`/api/reservas/${reservaPendienteId}/estado`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ conductor_id: noConductorId });

    expect(respuesta.status).toBe(404);
  });

  it('la operadora despacha asignando un conductor (200)', async () => {
    const respuesta = await request(app)
      .patch(`/api/reservas/${reservaPendienteId}/estado`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ conductor_id: conductorId });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.estado).toBe('DESPACHADA');
    expect(respuesta.body.conductor_id).toBe(conductorId);
  });

  it('la operadora ya no marca EN_CURSO por la reserva (400, usa servicios)', async () => {
    const respuesta = await request(app)
      .patch(`/api/reservas/${reservaPendienteId}/cambiar-estado`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ estado: 'EN_CURSO' });

    expect(respuesta.status).toBe(400);
  });

  it('la operadora cancela una reserva pendiente/despachada (200)', async () => {
    const pendiente = await request(app)
      .post('/api/reservas')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        pasajero_nombre: 'Para Cancelar',
        fecha_hora: '2026-12-12T09:00:00Z',
        origen: 'Hotel Nazarenas',
        destino: 'Plaza de Armas',
      });
    const pid = pendiente.body.id as number;

    const respuesta = await request(app)
      .patch(`/api/reservas/${pid}/cambiar-estado`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ estado: 'CANCELADA' });

    expect(respuesta.status).toBe(200);

    const detalle = await request(app)
      .get(`/api/reservas/${pid}`)
      .set('Authorization', `Bearer ${tokenOperador}`);
    expect(detalle.body.estado).toBe('CANCELADA');
  });
});