// ============================================================================
// PRUEBAS DE INTEGRACION: MODULO DE USUARIOS (GESTION)
// ----------------------------------------------------------------------------
// Cubre: listar (con/sin permiso), crear, editar sin tocar la clave,
// cambiar estado y administracion de permisos. Requiere la BD arriba.
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Sufijo unico por ejecucion para no chocar con usuarios previos.
const SUFIJO = Date.now();

// El personal accede con su DNI (regla del sistema).
const ADMIN = { correo_o_dni: '12345678', clave: 'demo123' }; // admin@aventura.com
const OPERADOR = { correo_o_dni: '23456789', clave: 'demo123' }; // operador@aventura.com

let app: Express;
let tokenAdmin = '';

beforeAll(async () => {
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const login = await request(app).post('/api/auth/login').send(ADMIN);
  tokenAdmin = login.body.token as string;
});

describe('GET /api/usuarios', () => {
  it('responde 401 sin token', async () => {
    const respuesta = await request(app).get('/api/usuarios');
    expect(respuesta.status).toBe(401);
  });

  it('responde 403 para un usuario sin ningun permiso de usuarios', async () => {
    // maria.tupac (USUARIO) no tiene permisos de gestion.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '56789012', clave: 'demo123' });
    const token = login.body.token as string;

    const respuesta = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${token}`);

    expect(respuesta.status).toBe(403);
  });

  it('lista usuarios con el token de ADMIN (incluye permisos)', async () => {
    const respuesta = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(Array.isArray(respuesta.body)).toBe(true);
    const admin = respuesta.body.find(
      (u: { correo: string }) => u.correo === 'admin@aventura.com'
    );
    expect(admin).toBeTruthy();
    expect(admin.rol).toBe('ADMIN');
    expect(admin.permisos).toContain('GESTIONAR_USUARIOS');
  });

  it('filtra por busqueda y estado', async () => {
    const respuesta = await request(app)
      .get('/api/usuarios')
      .query({ q: 'jorge', estado: 'ACTIVO' })
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.length).toBeGreaterThanOrEqual(1);
    expect(respuesta.body[0].nombres).toBe('Jorge');
  });
});

describe('POST /api/usuarios (crear)', () => {
  it('crea un usuario y permite su login (por DNI, regla corporativa)', async () => {
    const correo = `nuevo${SUFIJO}@aventura.com`;

    const crear = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Nuevo',
        apellidos: 'Usuario',
        dni: '9' + String(SUFIJO).slice(-7),
        correo,
        telefono: '911111111',
        clave: 'clave123',
        rol_id: 4, // USUARIO
        empresa_id: 2, // Belmond
        area_id: 1, // Hotel Monasterio
        puede_reservar: true,
        permisos: ['CREAR_RESERVAS'],
      });

    expect(crear.status).toBe(201);
    expect(crear.body.id).toBeTruthy();
    expect(crear.body.permisos).toContain('CREAR_RESERVAS');

    // El usuario nuevo (trabajador de hotel) inicia sesion con su DNI.
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '9' + String(SUFIJO).slice(-7), clave: 'clave123' });
    expect(login.status).toBe(200);
  });

  it('responde 400 si faltan datos obligatorios', async () => {
    const respuesta = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ nombres: 'Incompleto' });

    expect(respuesta.status).toBe(400);
  });
});

describe('PUT /api/usuarios/:id (editar)', () => {
  it('edita datos sin cambiar la clave (el login sigue funcionando)', async () => {
    const correo = `edit${SUFIJO}@aventura.com`;
    const creado = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Editable',
        apellidos: 'Usuario',
        dni: '9' + String(SUFIJO).slice(-6),
        correo,
        clave: 'claveOriginal',
        rol_id: 4,
      });
    const id = creado.body.id as number;

    const editar = await request(app)
      .put(`/api/usuarios/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Editado',
        apellidos: 'Usuario',
        dni: '9' + String(SUFIJO).slice(-6),
        correo,
        rol_id: 4,
        puede_reservar: false,
      });

    expect(editar.status).toBe(200);
    expect(editar.body.nombres).toBe('Editado');

    // La clave original sigue valida (acceso por DNI).
    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '9' + String(SUFIJO).slice(-6), clave: 'claveOriginal' });
    expect(login.status).toBe(200);
  });

  it('cambia la clave si se envia clave_nueva', async () => {
    const correo = `clave${SUFIJO}@aventura.com`;
    const creado = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Clave',
        apellidos: 'Nueva',
        dni: '9' + String(SUFIJO).slice(-5),
        correo,
        clave: 'anterior',
        rol_id: 4,
      });
    const id = creado.body.id as number;

    await request(app)
      .put(`/api/usuarios/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Clave',
        apellidos: 'Nueva',
        dni: '9' + String(SUFIJO).slice(-5),
        correo,
        rol_id: 4,
        clave_nueva: 'nuevaClave',
      });

    const loginVieja = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '9' + String(SUFIJO).slice(-5), clave: 'anterior' });
    expect(loginVieja.status).toBe(401);

    const loginNueva = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '9' + String(SUFIJO).slice(-5), clave: 'nuevaClave' });
    expect(loginNueva.status).toBe(200);
  });
});

describe('PATCH /api/usuarios/:id/estado', () => {
  it('bloquea a un usuario (login -> 401) y lo reactiva', async () => {
    const correo = `estado${SUFIJO}@aventura.com`;
    const creado = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Estado',
        apellidos: 'Prueba',
        dni: '9' + String(SUFIJO).slice(-4),
        correo,
        clave: 'demo123',
        rol_id: 4,
      });
    const id = creado.body.id as number;

    const bloquear = await request(app)
      .patch(`/api/usuarios/${id}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ estado: 'INACTIVO' });
    expect(bloquear.status).toBe(200);

    const login = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '9' + String(SUFIJO).slice(-4), clave: 'demo123' });
    expect(login.status).toBe(401);

    const reactivar = await request(app)
      .patch(`/api/usuarios/${id}/estado`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ estado: 'ACTIVO' });
    expect(reactivar.status).toBe(200);
  });
});

describe('Permisos puntuales', () => {
  it('asigna y quita un permiso', async () => {
    const correo = `permiso${SUFIJO}@aventura.com`;
    const creado = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Permiso',
        apellidos: 'Prueba',
        correo,
        clave: 'demo123',
        rol_id: 4,
        permisos: [],
      });
    const id = creado.body.id as number;

    const asignar = await request(app)
      .post(`/api/usuarios/${id}/permisos`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ codigo: 'VER_GPS' });
    expect(asignar.status).toBe(201);

    const detalle = await request(app)
      .get(`/api/usuarios/${id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(detalle.body.permisos).toContain('VER_GPS');

    const permisoId = detalle.body.permisos.length
      ? await request(app)
          .get('/api/catalogos')
          .set('Authorization', `Bearer ${tokenAdmin}`)
          .then((r) =>
            r.body.permisos.find((p: { codigo: string }) => p.codigo === 'VER_GPS')
          )
      : null;

    const quitar = await request(app)
      .delete(`/api/usuarios/${id}/permisos/${permisoId?.id ?? 0}`)
      .set('Authorization', `Bearer ${tokenAdmin}`);
    expect(quitar.status).toBe(200);
  });
});

describe('GET /api/catalogos', () => {
  it('devuelve roles, empresas, establecimientos, areas y permisos', async () => {
    const respuesta = await request(app)
      .get('/api/catalogos')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.roles.length).toBeGreaterThanOrEqual(4);
    expect(respuesta.body.permisos.length).toBeGreaterThanOrEqual(9);
    expect(
      respuesta.body.empresas.some(
        (e: { nombre: string }) => e.nombre === 'Aventura Vip de Cusco'
      )
    ).toBe(true);

    // Establecimientos de Belmond + areas con establecimiento_id.
    const monasterio = respuesta.body.establecimientos.find(
      (est: { nombre: string }) => est.nombre === 'Hotel Monasterio'
    );
    expect(monasterio).toBeTruthy();
    expect(
      respuesta.body.areas.every(
        (a: { establecimiento_id: number }) => typeof a.establecimiento_id === 'number'
      )
    ).toBe(true);
  });
});

// ----------------------------------------------------------------------------
// OPERADORA: permiso CREAR_USUARIOS (crear/editar SOLO clientes rol USUARIO)
// ----------------------------------------------------------------------------
describe('Operadora con CREAR_USUARIOS', () => {
  let tokenOperador = '';

  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send(OPERADOR);
    tokenOperador = login.body.token as string;
  });

  it('puede listar usuarios', async () => {
    const respuesta = await request(app)
      .get('/api/usuarios')
      .set('Authorization', `Bearer ${tokenOperador}`);

    expect(respuesta.status).toBe(200);
  });

  it('puede crear un cliente (rol USUARIO)', async () => {
    const crear = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        nombres: 'Cliente',
        apellidos: 'Operadora',
        dni: '6' + String(SUFIJO).slice(-7),
        correo: `cliente${SUFIJO}@belmond.com`,
        clave: 'clave123',
        rol_id: 4, // USUARIO
        empresa_id: 2, // Belmond
        area_id: 1,
        puede_reservar: true,
        permisos: ['CREAR_RESERVAS'],
      });

    expect(crear.status).toBe(201);
  });

  it('NO puede crear un ADMIN (403)', async () => {
    const crear = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        nombres: 'Intruso',
        apellidos: 'Admin',
        dni: '8' + String(SUFIJO).slice(-7),
        correo: `intruso${SUFIJO}@aventura.com`,
        clave: 'clave123',
        rol_id: 1, // ADMIN
      });

    expect(crear.status).toBe(403);
  });

  it('puede editar a un cliente (rol USUARIO)', async () => {
    // Crear un cliente como admin para luego editarlo como operadora.
    const creado = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Editable',
        apellidos: 'PorOperadora',
        dni: '7' + String(SUFIJO).slice(-7),
        correo: `editar${SUFIJO}@belmond.com`,
        clave: 'clave123',
        rol_id: 4,
        empresa_id: 2,
      });
    const id = creado.body.id as number;

    const editar = await request(app)
      .put(`/api/usuarios/${id}`)
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        nombres: 'Editado',
        apellidos: 'PorOperadora',
        dni: '7' + String(SUFIJO).slice(-7),
        correo: `editar${SUFIJO}@belmond.com`,
        rol_id: 4,
        empresa_id: 2,
        telefono: '977777777',
      });

    expect(editar.status).toBe(200);
    expect(editar.body.nombres).toBe('Editado');
  });

  it('NO puede editar a un ADMIN (403)', async () => {
    const editar = await request(app)
      .put('/api/usuarios/1') // admin
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({
        nombres: 'Admin',
        apellidos: 'Sistema',
        dni: '12345678',
        correo: 'admin@aventura.com',
        rol_id: 1,
      });

    expect(editar.status).toBe(403);
  });

  it('NO puede activar/inactivar usuarios (403)', async () => {
    const respuesta = await request(app)
      .patch('/api/usuarios/4/estado')
      .set('Authorization', `Bearer ${tokenOperador}`)
      .send({ estado: 'INACTIVO' });

    expect(respuesta.status).toBe(403);
  });
});

describe('POST /api/usuarios/:id/reset-password', () => {
  let tokenOperador: string;

  beforeAll(async () => {
    const login = await request(app).post('/api/auth/login').send(OPERADOR);
    tokenOperador = login.body.token as string;
  });

  it('el ADMIN resetea la clave de un usuario a "AventuraCusco"', async () => {
    // Crear un usuario de prueba con DNI unico.
    const dniReset = '3' + String(SUFIJO).slice(-7);
    const crear = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Cliente',
        apellidos: 'De Prueba',
        dni: dniReset,
        correo: `reset${SUFIJO}@belmond.com`,
        clave: 'claveOriginal',
        rol_id: 4,
        empresa_id: 2,
        area_id: 1,
        puede_reservar: true,
      });
    expect(crear.status).toBe(201);
    const id = crear.body.id as number;

    // El admin resetea la clave.
    const reset = await request(app)
      .post(`/api/usuarios/${id}/reset-password`)
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(reset.status).toBe(200);
    expect(reset.body.mensaje).toContain('AventuraCusco');

    // La nueva clave funciona.
    const loginNueva = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: dniReset, clave: 'AventuraCusco' });
    expect(loginNueva.status).toBe(200);

    // La clave anterior ya no funciona.
    const loginVieja = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: dniReset, clave: 'claveOriginal' });
    expect(loginVieja.status).toBe(401);
  });

  it('la operadora NO puede resetear (403, solo admin)', async () => {
    const reset = await request(app)
      .post('/api/usuarios/4/reset-password')
      .set('Authorization', `Bearer ${tokenOperador}`);

    expect(reset.status).toBe(403);
  });

  it('responde 404 si el usuario no existe', async () => {
    const reset = await request(app)
      .post('/api/usuarios/999999/reset-password')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(reset.status).toBe(404);
  });
});
