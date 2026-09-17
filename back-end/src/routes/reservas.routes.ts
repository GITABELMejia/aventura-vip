// ============================================================================
// RUTAS DEL MODULO DE RESERVAS
// ----------------------------------------------------------------------------
// Permisos por endpoint (PBAC):
//   * GET (listar/ver)  -> CREAR_RESERVAS o DESPACHAR_COLA.
//   * POST (crear)      -> CREAR_RESERVAS.
//   * PATCH despachar / cambiar estado -> DESPACHAR_COLA.
// El SP de listado filtra por actor: operadora/admin ven todas; el coordinador
// solo las suyas.
// ============================================================================

import { Router } from 'express';
import {
  listarReservas,
  obtenerReserva,
  crearReserva,
  aceptarReserva,
  despacharReserva,
  cambiarEstadoReserva,
} from '../controllers/reservas.controller';
import { autenticarToken } from '../middlewares/auth.middleware';
import {
  autorizarPermiso,
  autorizarAlgunPermiso,
} from '../middlewares/autorizarPermiso';

const router = Router();

router.use(autenticarToken);

// Lectura: cualquiera de los dos permisos de reservas.
router.get(
  '/',
  autorizarAlgunPermiso(['CREAR_RESERVAS', 'DESPACHAR_COLA']),
  listarReservas
);
router.get(
  '/:id',
  autorizarAlgunPermiso(['CREAR_RESERVAS', 'DESPACHAR_COLA']),
  obtenerReserva
);

// Crear: solo CREAR_RESERVAS.
router.post('/', autorizarPermiso('CREAR_RESERVAS'), crearReserva);

// Aceptar y despachar: solo DESPACHAR_COLA.
router.patch('/:id/aceptar', autorizarPermiso('DESPACHAR_COLA'), aceptarReserva);
router.patch('/:id/estado', autorizarPermiso('DESPACHAR_COLA'), despacharReserva);
router.patch(
  '/:id/cambiar-estado',
  autorizarPermiso('DESPACHAR_COLA'),
  cambiarEstadoReserva
);

export default router;