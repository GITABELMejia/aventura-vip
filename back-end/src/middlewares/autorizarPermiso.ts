// ============================================================================
// MIDDLEWARE: AUTORIZAR PERMISO (PBAC)
// ----------------------------------------------------------------------------
// Verifica que el usuario autenticado tenga UN permiso especifico (control de
// acceso por permisos). Se usa detras de autenticarToken:
//
//   router.get('/', autenticarToken, autorizarPermiso('GESTIONAR_USUARIOS'), listar);
//
// Si el permiso falta, responde HTTP 403 sin dejar pasar la peticion.
// ============================================================================

import { Request, Response, NextFunction } from 'express';

export function autorizarPermiso(permiso: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permisos = req.usuario?.permisos ?? [];

    if (!permisos.includes(permiso)) {
      res.status(403).json({
        mensaje: `No tienes permiso para realizar esta accion (requiere: ${permiso})`,
      });
      return;
    }

    next();
  };
}

// ----------------------------------------------------------------------------
// AUTORIZAR ALGUN PERMISO DE LA LISTA
// ----------------------------------------------------------------------------
// Permite la peticion si el usuario tiene AL MENOS UNO de los permisos dados.
// Ej: GET /api/usuarios requiere GESTIONAR_USUARIOS o CREAR_USUARIOS.
// ----------------------------------------------------------------------------
export function autorizarAlgunPermiso(permisosRequeridos: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const permisos = req.usuario?.permisos ?? [];

    if (!permisosRequeridos.some((p) => permisos.includes(p))) {
      res.status(403).json({
        mensaje: `No tienes permiso para realizar esta accion (requiere alguno de: ${permisosRequeridos.join(', ')})`,
      });
      return;
    }

    next();
  };
}
