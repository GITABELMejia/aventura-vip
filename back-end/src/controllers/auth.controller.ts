// ============================================================================
// CONTROLADOR DE AUTENTICACION (LOGIN)
// ----------------------------------------------------------------------------
// Este archivo contiene la logica de los endpoints de autenticacion:
//   POST /api/auth/login  -> inicia sesion y devuelve el token JWT
//   GET  /api/auth/me     -> devuelve los datos del usuario autenticado
//
// IMPORTANTE (arquitectura del proyecto):
//   Toda la logica de negocio vive en PROCEDIMIENTOS de PostgreSQL. Aqui en
//   Node.js SOLO se hace el "puente": se llama al procedimiento, se lee la
//   respuesta y se devuelve al cliente en formato JSON.
//
//   Los procedimientos usados son:
//     * SP_LOGIN(correo_o_dni, clave)   -> valida credenciales.
//     * SP_VALIDAR_USUARIO(id)          -> confirma que el usuario siga activo.
// ============================================================================

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { pool } from '../config/database';
import { env } from '../config/env';
import {
  DatosUsuario,
  PeticionLogin,
  RespuestaLogin,
} from '../modules/auth/auth.types';

// ----------------------------------------------------------------------------
// UTILIDAD: convertir una duracion JWT ('12h', '30m', '15s' o segundos) a ms.
// Se usa para informar la fecha exacta en la que expira el token, sin
// tener que re-decodificarlo.
// ----------------------------------------------------------------------------
function duracionAMilisegundos(duracion: string): number {
  const coincidencia = /^(\d+)(s|m|h|d)?$/.exec(duracion.trim());
  if (!coincidencia) return 0;
  const cantidad = Number(coincidencia[1]);
  const unidad = coincidencia[2] || 's';
  const multiplicadores: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  return cantidad * multiplicadores[unidad];
}

// ----------------------------------------------------------------------------
// LOGIN
// POST /api/auth/login
// ----------------------------------------------------------------------------
// Cuerpo de la peticion (JSON):
//   {
//     "correo_o_dni": "admin@aventura.com",   // correo o DNI del usuario
//     "clave":        "demo123"               // contrasena en texto plano
//   }
//
// Respuesta exitosa (HTTP 200):
//   {
//     "token": "eyJhbGciOiJIUzI1NiIs...",     // JWT (dura 12 horas)
//     "expira_en": "2026-08-11T08:00:00.000Z",
//     "usuario": { ... datos del usuario ... }
//   }
//
// Respuesta de error (HTTP 401):
//   { "mensaje": "Credenciales invalidas" }
// ----------------------------------------------------------------------------
export const login = async (req: Request, res: Response): Promise<void> => {
  // 1) Leer y validar que el cliente envie los 2 datos obligatorios.
  const { correo_o_dni, clave } = req.body as PeticionLogin;

  if (!correo_o_dni || !clave) {
    res.status(400).json({
      mensaje: 'Faltan datos: se requiere "correo_o_dni" y "clave"',
    });
    return;
  }

  try {
    // 2) Llamar al procedimiento SP_LOGIN de PostgreSQL.
    //    El resultado es una columna "sp_login" de tipo JSONB (ya viene
    //    armado como JSON por el procedimiento).
    const resultado = await pool.query(
      'SELECT SP_LOGIN($1, $2) AS usuario',
      [correo_o_dni, clave]
    );

    // 3) Si no llego fila (o el JSON es nulo) las credenciales fallaron.
    const usuario: DatosUsuario | null = resultado.rows[0]?.usuario;
    if (!usuario) {
      res.status(401).json({ mensaje: 'Credenciales invalidas' });
      return;
    }

    // 4) Firmar el token JWT con los datos del usuario.
    //    El token guarda el id, rol y permisos; asi las peticiones futuras
    //    no necesitan consultar la base en cada request.
    const token = jwt.sign(
      {
        sub: usuario.id, // sub = "subject" (el id del usuario)
        rol: usuario.rol,
        permisos: usuario.permisos,
      },
      env.jwtSecret,
      { expiresIn: env.jwtExpiresIn as jwt.SignOptions['expiresIn'] }
    );

    // 5) Calcular la fecha de expiracion del token (para informarla al usuario)
    //    a partir de la duracion configurada, sin re-decodificar el token.
    const expiraEn = new Date(
      Date.now() + duracionAMilisegundos(env.jwtExpiresIn)
    ).toISOString();

    // 6) Responder con el token y los datos del usuario.
    const respuesta: RespuestaLogin = {
      token,
      expira_en: expiraEn,
      usuario,
    };
    res.json(respuesta);
  } catch (error) {
    // El procedimiento lanza la excepcion 'CREDENCIALES_INVALIDAS' cuando el
    // correo/DNI no existe o la clave es incorrecta. El driver de PostgreSQL
    // la entrega como un Error cuyo mensaje contiene ese texto.
    const mensajeError = error instanceof Error ? error.message : String(error);
    if (mensajeError.includes('CREDENCIALES_INVALIDAS')) {
      res.status(401).json({ mensaje: 'Credenciales invalidas' });
      return;
    }
    // Cualquier otro error: error interno del servidor.
    console.error('Error en login:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// PERFIL (DATOS DEL USUARIO AUTENTICADO)
// GET /api/auth/me
// ----------------------------------------------------------------------------
// No recibe cuerpo: el usuario se identifica con el token JWT en el encabezado
// "Authorization: Bearer <token>" (el middleware lo valida primero).
//
// Respuesta exitosa (HTTP 200):
//   { "id": 1, "rol": "ADMIN", "permisos": [...] }
// ----------------------------------------------------------------------------
export const me = async (req: Request, res: Response): Promise<void> => {
  try {
    // 1) El middleware de autenticacion ya verifico el token y dejo los datos
    //    del usuario en req.usuario. Solo los devolvemos.
    const usuarioAutenticado = req.usuario;

    // 2) Confirmar en la base que el usuario siga existiendo y ACTIVO.
    //    (Si lo bloquearon despues de emitir el token, pierde el acceso).
    const valido = await pool.query('SELECT SP_VALIDAR_USUARIO($1) AS valido', [
      usuarioAutenticado?.sub,
    ]);
    const sigueActivo = valido.rows[0]?.valido;

    if (!sigueActivo) {
      res.status(401).json({ mensaje: 'Usuario inactivo o no existe' });
      return;
    }

    // 3) Responder con los datos del usuario guardados en el token.
    res.json({
      id: usuarioAutenticado?.sub,
      rol: usuarioAutenticado?.rol,
      permisos: usuarioAutenticado?.permisos,
    });
  } catch (error) {
    console.error('Error en /me:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
