// ============================================================================
// RUTAS DEL MODULO DE USUARIOS (GESTION)
// ----------------------------------------------------------------------------
// Permisos por endpoint (PBAC):
//   * GET (listar/ver)      -> GESTIONAR_USUARIOS o CREAR_USUARIOS.
//   * POST/PUT (crear/editar)-> GESTIONAR_USUARIOS o CREAR_USUARIOS; si el
//                              actor solo tiene CREAR_USUARIOS, el controlador
//                              restringe el rol a USUARIO (clientes).
//   * PATCH estado y permisos puntuales -> solo GESTIONAR_USUARIOS.
// ============================================================================

import { Router } from 'express';
import {
  listarUsuarios,
  obtenerUsuario,
  crearUsuario,
  actualizarUsuario,
  cambiarEstadoUsuario,
  asignarPermiso,
  quitarPermiso,
  resetearClaveUsuario,
  subirFotoPerfil,
  quitarFotoPerfil,
  buscarUsuarios,
} from '../controllers/usuarios.controller';
import { autenticarToken } from '../middlewares/auth.middleware';
import {
  autorizarPermiso,
  autorizarAlgunPermiso,
} from '../middlewares/autorizarPermiso';

const router = Router();

// Todas las rutas requieren sesion.
router.use(autenticarToken);

// Busqueda de usuarios para reservas: solo requiere sesion (sin permisos).
router.get('/buscar', buscarUsuarios);

// Lectura: cualquiera de los dos permisos de usuarios.
router.get('/', autorizarAlgunPermiso(['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']), listarUsuarios);
router.get('/:id', autorizarAlgunPermiso(['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']), obtenerUsuario);

// Crear y editar: cualquiera de los dos (con restriccion de rol en el controlador).
router.post('/', autorizarAlgunPermiso(['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']), crearUsuario);
router.put('/:id', autorizarAlgunPermiso(['GESTIONAR_USUARIOS', 'CREAR_USUARIOS']), actualizarUsuario);

// Gestion avanzada: solo GESTIONAR_USUARIOS.
router.patch('/:id/estado', autorizarPermiso('GESTIONAR_USUARIOS'), cambiarEstadoUsuario);
router.post('/:id/permisos', autorizarPermiso('GESTIONAR_USUARIOS'), asignarPermiso);
router.delete('/:id/permisos/:permisoId', autorizarPermiso('GESTIONAR_USUARIOS'), quitarPermiso);

// ----------------------------------------------------------------------------
// RESETEAR CONTRASEÑA (SOLO ADMIN / GESTIONAR_USUARIOS)
// POST /api/usuarios/:id/reset-password
// ----------------------------------------------------------------------------
router.post(
  '/:id/reset-password',
  autorizarPermiso('GESTIONAR_USUARIOS'),
  resetearClaveUsuario
);

// ----------------------------------------------------------------------------
// RESETEAR CONTRASEÑA (SOLO ADMIN / GESTIONAR_USUARIOS)
// POST /api/usuarios/:id/reset-password
// ----------------------------------------------------------------------------
router.post(
  '/:id/reset-password',
  autorizarPermiso('GESTIONAR_USUARIOS'),
  resetearClaveUsuario
);

// ----------------------------------------------------------------------------
// FOTO DE PERFIL: cualquier usuario autenticado (propia) o admin (cualquiera).
// La autorizacion fina (propia vs admin) se resuelve en el controlador.
// ----------------------------------------------------------------------------
router.put('/:id/foto', subirFotoPerfil);
router.delete('/:id/foto', quitarFotoPerfil);

export default router;
