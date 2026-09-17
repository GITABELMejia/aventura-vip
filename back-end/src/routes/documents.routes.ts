// ============================================================================
// RUTAS DEL MODULO DE DOCUMENTOS (CONDUCTOR)
// ----------------------------------------------------------------------------
// Solo conductores (documentos propios) y admin (cualquier conductor).
// La autorizacion fina (owner/admin/conductor) se resuelve en el controlador.
// ============================================================================

import { Router } from 'express';
import {
  listarDocumentos,
  subirDocumento,
  obtenerDocumento,
  eliminarDocumento,
  obtenerLicencia,
  guardarLicencia,
} from '../controllers/documents.controller';
import { autenticarToken } from '../middlewares/auth.middleware';

const router = Router();

router.use(autenticarToken);

// Documentos de un usuario (conductor).
router.get('/usuarios/:id/documentos', listarDocumentos);
router.post('/usuarios/:id/documentos', subirDocumento);

// Datos de la licencia (numero + caducidad) se guardan antes que las fotos.
router.get('/usuarios/:id/licencia', obtenerLicencia);
router.put('/usuarios/:id/licencia', guardarLicencia);

// Un documento puntual.
router.get('/documentos/:docId', obtenerDocumento);
router.delete('/documentos/:docId', eliminarDocumento);

export default router;