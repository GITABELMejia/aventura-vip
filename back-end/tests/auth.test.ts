// ============================================================================
// PRUEBAS DE INTEGRACION: AUTENTICACION (login y /me)
// ----------------------------------------------------------------------------
// Prueba la API real (Express) contra la base de datos PostgreSQL del
// contenedor av-test-pg. Usa supertest sin levantar un puerto real.
//
// REGLA DE IDENTIFICADOR DE ACCESO:
//   * Trabajadores (Aventura Vip, hoteles) -> inician con su DNI.
//   * Empresa "Particular" (app publica)  -> inicia con su correo.
//
// Requisito: contenedor de BD corriendo (docker start av-test-pg) y los
// scripts SQL inyectados (npm run db:init).
// ============================================================================

import { beforeAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';

// Datos de la cuenta demo definida en 03_SEEDS.SQL (acceso por DNI).
const CUENTA_DEMO = {
  correo_o_dni: '12345678', // DNI de admin@aventura.com
  clave: 'demo123',
};

const SUFIJO = Date.now();

let app: Express;
let tokenAdmin = '';

beforeAll(async () => {
  // Se importa la aplicacion DESPUES de que vitest configure las variables
  // de entorno definidas en vitest.config.ts (LOGIN_MAX_INTENTOS alto).
  const { default: aplicacion } = await import('../src/app');
  app = aplicacion;

  const login = await request(app).post('/api/auth/login').send(CUENTA_DEMO);
  tokenAdmin = login.body.token as string;
});

describe('POST /api/auth/login', () => {
  it('acepta credenciales correctas por DNI y devuelve token + permisos', async () => {
    const respuesta = await request(app).post('/api/auth/login').send(CUENTA_DEMO);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.token).toBeTruthy();
    expect(respuesta.body.expira_en).toBeTruthy();
    expect(respuesta.body.usuario).toMatchObject({
      dni: '12345678',
      rol: 'ADMIN',
    });
    expect(respuesta.body.usuario.permisos).toContain('GESTIONAR_USUARIOS');
    expect(JSON.stringify(respuesta.body)).not.toContain('demo123');
  });

  it('rechaza a un trabajador que intenta entrar con su CORREO (regla DNI)', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: 'admin@aventura.com', clave: 'demo123' });

    expect(respuesta.status).toBe(401);
  });

  it('acepta a un cliente de hotel (Belmond) por DNI', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '45678901', clave: 'demo123' }); // juan.perez@belmond.com

    expect(respuesta.status).toBe(200);
    expect(respuesta.body.usuario.empresa).toBe('Belmond');
  });

  it('rechaza a un cliente de hotel que intenta entrar con su CORREO', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: 'juan.perez@belmond.com', clave: 'demo123' });

    expect(respuesta.status).toBe(401);
  });

  it('permite el acceso por CORREO a un usuario de la app publica (Particular)', async () => {
    // Crear un usuario Particular (rol USUARIO) con el token de admin.
    const correo = `publico${SUFIJO}@app.com`;
    const dniPublico = '7' + String(SUFIJO).slice(-7);
    const crear = await request(app)
      .post('/api/usuarios')
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        nombres: 'Publico',
        apellidos: 'App',
        dni: dniPublico,
        correo,
        clave: 'clave123',
        rol_id: 4,
        empresa_id: 3, // Particular
      });
    expect(crear.status).toBe(201);

    // Accede con su CORREO.
    const porCorreo = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: correo, clave: 'clave123' });
    expect(porCorreo.status).toBe(200);
    expect(porCorreo.body.usuario.empresa).toBe('Particular');

    // NO puede acceder con su DNI.
    const porDni = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: dniPublico, clave: 'clave123' });
    expect(porDni.status).toBe(401);
  });

  it('rechaza credenciales incorrectas con 401', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '12345678', clave: 'clave-incorrecta' });

    expect(respuesta.status).toBe(401);
    expect(respuesta.body.mensaje).toBe('Credenciales invalidas');
  });

  it('responde 400 si faltan datos obligatorios', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: '12345678' });

    expect(respuesta.status).toBe(400);
  });

  it('bloquea inyeccion SQL en el campo de identificador', async () => {
    const respuesta = await request(app)
      .post('/api/auth/login')
      .send({ correo_o_dni: "' OR '1'='1' --", clave: 'cualquiera' });

    expect(respuesta.status).toBe(401);
  });
});

describe('GET /api/auth/me', () => {
  it('devuelve los datos del usuario con un token valido', async () => {
    const respuesta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toMatchObject({ rol: 'ADMIN' });
  });

  it('responde 401 si no se envia token', async () => {
    const respuesta = await request(app).get('/api/auth/me');

    expect(respuesta.status).toBe(401);
  });

  it('responde 401 con un token manipulado o inexistente', async () => {
    const respuesta = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer token-inventado');

    expect(respuesta.status).toBe(401);
  });
});
