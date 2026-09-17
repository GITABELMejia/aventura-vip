// ============================================================================
// RUTAS DE CATALOGOS
// ----------------------------------------------------------------------------
// GET /api/catalogos -> roles, empresas, areas y permisos.
// Solo requiere sesion (cualquier usuario autenticado).
// ============================================================================

import { Router } from 'express';
import { obtenerCatalogos } from '../controllers/catalogos.controller';
import { autenticarToken } from '../middlewares/auth.middleware';

const router = Router();

router.get('/', autenticarToken, obtenerCatalogos);

export default router;
