// ============================================================================
// PRUEBAS DE INTEGRACION: DOCUMENTOS DEL CONDUCTOR (DOS CARAS + DATOS LICENCIA)
// ----------------------------------------------------------------------------
// Fotos de DNI y licencia (base64), cada una con ANVERSO y REVERSO (2 caras).
// La LICENCIA exige guardar PRIMERO numero + caducidad (tabla LICENCIAS) y
// recien entonces se pueden cargar sus dos caras.
// Reglas: solo conductores tienen docs; conductor -> solo suyos;
// admin -> cualquier conductor; operadora -> 403.
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { pool } from '../src/config/database';

// PNG 1x1 (valido, < 5MB).
const BASE64_PNG =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const ADMIN = { correo_o_dni: '12345678', clave: 'demo123' };
const CONDUCTOR = { correo_o_dni: '34567890', clave: 'demo123' }; // jorge
const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' };

let app: Express;
let tokenAdmin = '';
let tokenConductor = '';
let tokenOperador = '';
let conductorId = 0;
let clienteId = 0; // juan (rol USUARIO)

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const admin = await request(app).post('/api/auth/login').send(ADMIN);
  tokenAdmin = admin.body.token as string;

  const conductor = await request(app).post('/api/auth/login').send(CONDUCTOR);
  tokenConductor = conductor.body.token as string;
  conductorId = conductor.body.usuario.id as number;

  const operador = await request(app).post('/api/auth/login').send(OPERADOR);
  tokenOperador = operador.body.token as string;

  // Cliente (juan) para validar la regla "solo conductores".
  const juan = await request(app)
    .post('/api/auth/login')
    .send({ correo_o_dni: '45678901', clave: 'demo123' });
  clienteId = juan.body.usuario.id as number;

  // Estado limpio para el conductor (las corridas anteriores dejan residuos).
  await pool.query('DELETE FROM LICENCIAS WHERE USUARIO_ID = $1', [conductorId]);
  await pool.query('DELETE FROM DOCUMENTOS WHERE USUARIO_ID = $1', [conductorId]);
});

describe('Datos de la licencia (numero + caducidad)', () => {
  it('al inicio NO hay datos de licencia (devuelve null)', async () => {
    const respuesta = await request(app)
      .get(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toBeNull();
  });

  it('rechaza guardar datos incompletos (400)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ numero_documento: 'Q12345678' });

    expect(respuesta.status).toBe(400);
  });

  it('guarda los datos de la licencia (200) y quedan disponibles', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ numero_documento: 'Q12345678', fecha_caducidad: '2027-12-31' });

    expect(respuesta.status).toBe(200);

    const recarga = await request(app)
      .get(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(recarga.body.numero_documento).toBe('Q12345678');
    expect(recarga.body.fecha_caducidad).toBe('2027-12-31');
  });

  it('reenviar los datos los ACTUALIZA (queda un solo registro)', async () => {
    await request(app)
      .put(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({ numero_documento: 'Q99999999', fecha_caducidad: '2028-06-30' });

    const recarga = await request(app)
      .get(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(recarga.body.numero_documento).toBe('Q99999999');
  });

  it('la operadora NO puede guardar los datos (403)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ numero_documento: 'Q11111111', fecha_caducidad: '2029-01-01' });

    expect(respuesta.status).toBe(403);
  });
});

describe('Subida de documentos (DNI y caras de licencia)', () => {
  it('el conductor sube el anverso de su DNI (201)', async () => {
    const respuesta = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'DNI',
        cara: 'ANVERSO',
        nombre_archivo: 'dni-frente.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.id).toBeTruthy();
  });

  it('el conductor sube tambien el reverso de su DNI (201)', async () => {
    const respuesta = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'DNI',
        cara: 'REVERSO',
        nombre_archivo: 'dni-reverso.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });

    expect(respuesta.status).toBe(201);
  });

  it('reemplaza el anverso del DNI al subir uno nuevo (queda 1 de esa cara)', async () => {
    await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'DNI',
        cara: 'ANVERSO',
        nombre_archivo: 'dni-frente-v2.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });

    const lista = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(lista.status).toBe(200);
    const anversos = lista.body.filter(
      (d: { tipo: string; cara: string }) =>
        d.tipo === 'DNI' && d.cara === 'ANVERSO'
    );
    expect(anversos.length).toBe(1);
  });

  it('genera el nombre con la nomenclatura TIPO_CARA_DNI.extension', async () => {
    const lista = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    const nombres = new Set(
      lista.body.map((d: { nombre_archivo: string }) => d.nombre_archivo)
    );

    // Jorge tiene DNI 34567890 y mime image/png -> extension .png.
    expect(nombres.has('DNI_A_34567890.png')).toBe(true);
    expect(nombres.has('DNI_R_34567890.png')).toBe(true);
  });

  it('sube el anverso y reverso de la licencia (ya con datos guardados)', async () => {
    const frente = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'LICENCIA',
        cara: 'ANVERSO',
        nombre_archivo: 'lic-frente.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });
    expect(frente.status).toBe(201);

    const reverso = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'LICENCIA',
        cara: 'REVERSO',
        nombre_archivo: 'lic-reverso.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });
    expect(reverso.status).toBe(201);

    // Nomenclatura de la licencia (Jorge DNI 34567890).
    const lista = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);
    const nombres = new Set(
      lista.body.map((d: { nombre_archivo: string }) => d.nombre_archivo)
    );

    expect(nombres.has('LICENCIA_A_34567890.png')).toBe(true);
    expect(nombres.has('LICENCIA_R_34567890.png')).toBe(true);
  });

  it('rechaza una cara invalida (400)', async () => {
    const respuesta = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'DNI',
        cara: 'LADO_X',
        nombre_archivo: 'dni.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });

    expect(respuesta.status).toBe(400);
  });

  it('rechaza un MIME no permitido (400)', async () => {
    const respuesta = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'DNI',
        cara: 'REVERSO',
        nombre_archivo: 'dni.gif',
        mime: 'image/gif',
        contenido_b64: BASE64_PNG,
      });

    expect(respuesta.status).toBe(400);
  });
});

describe('Reglas de acceso', () => {
  it('el conductor lista sus documentos sin el base64 (con caras)', async () => {
    const lista = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(lista.status).toBe(200);
    expect(lista.body.length).toBeGreaterThanOrEqual(4);
    expect(lista.body[0]).not.toHaveProperty('contenido_b64');
    expect(lista.body[0]).toHaveProperty('cara');
  });

  it('el conductor NO puede subir a otro usuario (403)', async () => {
    const respuesta = await request(app)
      .post(`/api/usuarios/${clienteId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`)
      .send({
        tipo: 'DNI',
        cara: 'ANVERSO',
        nombre_archivo: 'dni.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });

    expect(respuesta.status).toBe(403);
  });

  it('la operadora NO puede subir (403)', async () => {
    const respuesta = await request(app)
      .post(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        tipo: 'DNI',
        cara: 'ANVERSO',
        nombre_archivo: 'dni.jpg',
        mime: 'image/png',
        contenido_b64: BASE64_PNG,
      });

    expect(respuesta.status).toBe(403);
  });

  it('el admin puede ver los datos de licencia de un conductor', async () => {
    const respuesta = await request(app)
      .get(`/api/usuarios/${conductorId}/licencia`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.numero_documento).toBeTruthy();
  });

  it('el admin NO puede guardar a un cliente no conductor (400)', async () => {
    const respuesta = await request(app)
      .put(`/api/usuarios/${clienteId}/licencia`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ numero_documento: 'Q777', fecha_caducidad: '2028-01-01' });

    expect(respuesta.status).toBe(400);
  });
});

describe('Obtener y eliminar', () => {
  it('obtiene un documento con su base64', async () => {
    const lista = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);
    const docId = lista.body[0].id as number;

    const detalle = await request(app)
      .get(`/api/documentos/${docId}`)
      .set('Authorization', `Bearer ${tokenConductor}`);

    expect(detalle.status).toBe(200);
    expect(detalle.body.contenido_b64).toBe(BASE64_PNG);
    expect(detalle.body.cara).toBeTruthy();
  });

  it('elimina un documento y desaparece de la lista', async () => {
    const lista = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);
    const docId = lista.body[0].id as number;

    const eliminar = await request(app)
      .delete(`/api/documentos/${docId}`)
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(eliminar.status).toBe(200);

    const lista2 = await request(app)
      .get(`/api/usuarios/${conductorId}/documentos`)
      .set('Authorization', `Bearer ${tokenConductor}`);
    expect(lista2.body.find((d: { id: number }) => d.id === docId)).toBeUndefined();
  });
});