// ============================================================================
// RUTAS DEL MODULO DE AUTENTICACION
// ----------------------------------------------------------------------------
// Define los endpoints (rutas) del login. Express enruta cada peticion
// HTTP que llega a /api/auth/* hacia la funcion correspondiente.
//
//   POST /api/auth/login  -> publica (no necesita token): inicia sesion.
//   GET  /api/auth/me     -> protegida (necesita token): perfil del usuario.
// ============================================================================

import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { login, me } from '../controllers/auth.controller';
import { autenticarToken } from '../middlewares/auth.middleware';
import { env } from '../config/env';

// Se crea el enrutador de Express para este modulo.
const router = Router();

// ----------------------------------------------------------------------------
// RATE LIMIT DEL LOGIN (proteccion contra fuerza bruta)
// ----------------------------------------------------------------------------
// Limita cuantos intentos de login puede hacer una misma IP dentro de una
// ventana de tiempo. Cuando se supera, el servidor responde HTTP 429.
// Los limites se configuran en el .env (LOGIN_MAX_INTENTOS / LOGIN_VENTANA_MS).
// ----------------------------------------------------------------------------
const limiteLogin = rateLimit({
  windowMs: env.loginVentanaMs,
  limit: env.loginMaxIntentos,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: {
    mensaje: 'Demasiados intentos de acceso. Espera un momento y vuelve a intentarlo.',
  },
});

// ----------------------------------------------------------------------------
// POST /api/auth/login
// ----------------------------------------------------------------------------
// Inicia sesion. Recibe { correo_o_dni, clave } y devuelve el token JWT.
// Es PUBLICA: cualquiera puede intentar loguearse (protegida por rate limit).
// ----------------------------------------------------------------------------
router.post('/login', limiteLogin, login);

// ----------------------------------------------------------------------------
// GET /api/auth/me
// ----------------------------------------------------------------------------
// Devuelve los datos del usuario autenticado. Es PROTEGIDA: el middleware
// autenticarToken valida que el token JWT sea correcto y este vigente.
// ----------------------------------------------------------------------------
router.get('/me', autenticarToken, me);

// Se exporta el enrutador para que app.ts lo monte en la aplicacion.
export default router;
