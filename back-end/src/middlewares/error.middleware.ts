// ============================================================================
// MANEJADOR GLOBAL DE ERRORES
// ----------------------------------------------------------------------------
// Express permite registrar un middleware de error especial que recibe 4
// parametros (error, req, res, next). Cualquier error que se propague desde
// los controladores o middlewares anteriores termina aqui.
//
// Ventajas:
//   1) La API NUNCA responde con HTML ni se cae por un error no controlado.
//   2) Se estandariza el formato de error para el frontend:
//        { "mensaje": "...", "error": "..." }
//   3) El error queda registrado en la consola para diagnosticarlo.
// ============================================================================

import { Request, Response, NextFunction } from 'express';

// ----------------------------------------------------------------------------
// Clase personalizada de error (permite indicar el codigo HTTP deseado).
// ----------------------------------------------------------------------------
export class AppError extends Error {
  public codigoHTTP: number;

  constructor(mensaje: string, codigoHTTP = 500) {
    super(mensaje);
    this.codigoHTTP = codigoHTTP;
    this.name = 'AppError';
  }
}

// ----------------------------------------------------------------------------
// FUNCION: manejadorDeErrores
// ----------------------------------------------------------------------------
// Middleware de error global. Se registra SIEMPRE al final de app.ts,
// despues de todas las rutas, con la firma de 4 argumentos.
// ----------------------------------------------------------------------------
export const manejadorDeErrores = (
  error: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Si es un error de nuestra clase AppError, usamos su codigo HTTP.
  const esErrorPropio = error instanceof AppError;
  const codigoHTTP = esErrorPropio
    ? (error as AppError).codigoHTTP
    : 500;

  // Registro del error en la consola para depuracion.
  console.error('[ERROR]', error.message);

  // Respuesta JSON estandarizada al cliente.
  res.status(codigoHTTP).json({
    mensaje: esErrorPropio
      ? error.message
      : 'Error interno del servidor',
    error: codigoHTTP === 500 ? error.message : undefined,
  });
};
