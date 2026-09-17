// ============================================================================
// RUTAS DEL MODULO ORGANIZACION (CATALOGOS DE NEGOCIO)
// ----------------------------------------------------------------------------
// Gestion de empresas, establecimientos y areas.
// Todas las rutas requieren sesion + permiso GESTIONAR_CATALOGOS.
// ============================================================================

import { Router } from 'express';
import {
  listarEmpresas,
  guardarEmpresa,
  cambiarEstadoEmpresa,
  listarEstablecimientos,
  guardarEstablecimiento,
  cambiarEstadoEstablecimiento,
  listarAreas,
  guardarArea,
  cambiarEstadoArea,
} from '../controllers/organizacion.controller';
import { autenticarToken } from '../middlewares/auth.middleware';
import { autorizarPermiso } from '../middlewares/autorizarPermiso';

const router = Router();

router.use(autenticarToken, autorizarPermiso('GESTIONAR_CATALOGOS'));

// Empresas
router.get('/empresas', listarEmpresas);
router.post('/empresas', guardarEmpresa);
router.put('/empresas/:id', guardarEmpresa);
router.patch('/empresas/:id/estado', cambiarEstadoEmpresa);

// Establecimientos
router.get('/establecimientos', listarEstablecimientos);
router.post('/establecimientos', guardarEstablecimiento);
router.put('/establecimientos/:id', guardarEstablecimiento);
router.patch('/establecimientos/:id/estado', cambiarEstadoEstablecimiento);

// Areas
router.get('/areas', listarAreas);
router.post('/areas', guardarArea);
router.put('/areas/:id', guardarArea);
router.patch('/areas/:id/estado', cambiarEstadoArea);

export default router;
