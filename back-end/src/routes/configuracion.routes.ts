// ============================================================================
// RUTAS DEL MODULO DE CONFIGURACION (PUNTOS DE RECOGIDA)
// ----------------------------------------------------------------------------
// Solo admin (GESTIONAR_CATALOGOS) gestiona los puntos de recogida.
// ============================================================================

import { Router } from 'express';
import {
  listarPuntos,
  crearPunto,
  actualizarPunto,
  cambiarEstadoPunto,
} from '../controllers/configuracion.controller';
import { autenticarToken } from '../middlewares/auth.middleware';
import { autorizarPermiso } from '../middlewares/autorizarPermiso';

const router = Router();

router.use(autenticarToken);

router.get('/puntos', autorizarPermiso('GESTIONAR_CATALOGOS'), listarPuntos);
router.post('/puntos', autorizarPermiso('GESTIONAR_CATALOGOS'), crearPunto);
router.put('/puntos/:id', autorizarPermiso('GESTIONAR_CATALOGOS'), actualizarPunto);
router.patch(
  '/puntos/:id/estado',
  autorizarPermiso('GESTIONAR_CATALOGOS'),
  cambiarEstadoPunto
);

export default router;