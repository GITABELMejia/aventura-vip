// ============================================================================
// MIDDLEWARE DE AUTENTICACION (JWT)
// ----------------------------------------------------------------------------
// Un "middleware" en Express es una funcion que se ejecuta ANTES de llegar a
// la ruta final. Este valida que la peticion traiga un token JWT valido.
//
// Como funciona:
//   1) El cliente envia el token en el encabezado HTTP:
//        Authorization: Bearer <TOKEN>
//   2) Este middleware lee ese encabezado, extrae el token y lo verifica.
//   3) Si es valido -> deja los datos del usuario en req.usuario y deja
//      pasar la peticion (next()).
//   4) Si falta o es invalido -> responde HTTP 401 sin dejar pasar.
//
// Para proteger una ruta solo hay que ponerlo delante, por ejemplo:
//   router.get('/me', autenticarToken, me);
// ============================================================================

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { PayloadToken } from '../modules/auth/auth.types';

// Extendemos la interfaz Request de Express para agregar el campo "usuario".
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      usuario?: PayloadToken;
    }
  }
}

// ----------------------------------------------------------------------------
// FUNCION: autenticarToken
// ----------------------------------------------------------------------------
// Middleware que verifica el token JWT. Si pasa, adjunta los datos a
// req.usuario y llama a next(); si no, corta la peticion con HTTP 401.
// ----------------------------------------------------------------------------
export const autenticarToken = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // 1) Leer el encabezado Authorization: "Bearer eyJhbGciOi..."
  const cabecera = req.headers.authorization;

  // 2) Si no existe o no empieza con "Bearer ", falta el token.
  if (!cabecera || !cabecera.startsWith('Bearer ')) {
    res.status(401).json({ mensaje: 'No se envio un token de acceso' });
    return;
  }

  // 3) Extraer solo el token (quitando el prefijo "Bearer ").
  const token = cabecera.split(' ')[1];

  try {
    // 4) Verificar la firma y expiracion del token con la clave secreta.
    const payload = jwt.verify(token, env.jwtSecret) as unknown as PayloadToken;

    // 5) Guardar los datos en la peticion para las rutas siguientes.
    req.usuario = payload;
    next();
  } catch (error) {
    // El token es invalido, caduco o fue manipulado.
    res.status(401).json({ mensaje: 'Token invalido o expirado' });
  }
};
