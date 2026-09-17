// ============================================================================
// RUTAS DEL MODULO DE SERVICIOS
// ----------------------------------------------------------------------------
// Solo requiere sesion (la autorizacion fina se resuelve en el controlador).
// ============================================================================

import { Router } from 'express';
import {
  listarReservasDisponibles,
  listarReservasPool,
  listarServiciosConductor,
  listarServicios,
  iniciarServicio,
  iniciarServicioDirecto,
  agregarReserva,
  agregarReservaDirecto,
  finalizarServicio,
} from '../controllers/servicios.controller';
import { autenticarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(autenticarToken);

router.get('/reservas-disponibles', listarReservasDisponibles);
router.get('/disponibles-pool', listarReservasPool);
router.get('/mios', listarServiciosConductor);
router.get('/', listarServicios);

router.post('/iniciar', iniciarServicio);
router.post('/iniciar-directo', iniciarServicioDirecto);
router.post('/:id/reservas', agregarReserva);
router.post('/:id/reservas-directo', agregarReservaDirecto);
router.patch('/:id/finalizar', finalizarServicio);

export default router;