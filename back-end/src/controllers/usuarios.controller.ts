// ============================================================================
// CONTROLADOR: USUARIOS (GESTION)
// ----------------------------------------------------------------------------
// CRUD del modulo de usuarios: listar (con busqueda/filtros), obtener,
// crear, editar, cambiar estado y administrar permisos.
//
// TODA la logica vive en los procedimientos de PostgreSQL (SP-Centric);
// aqui solo se hace el puente con la API.
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';
import type {
  PeticionActualizarUsuario,
  PeticionCrearUsuario,
} from '../modules/usuarios/usuarios.types';

// ----------------------------------------------------------------------------
// UTILIDAD: ID del rol USUARIO (clientes)
// ----------------------------------------------------------------------------
async function idRolUsuario(): Promise<number | null> {
  const resultado = await pool.query(
    'SELECT SP_OBTENER_ROL_POR_NOMBRE(\'USUARIO\') AS id'
  );
  return resultado.rows[0]?.id ?? null;
}

/** ¿El actor tiene la gestion completa de usuarios (no solo creacion)? */
function tieneGestionCompleta(permisos: string[]): boolean {
  return permisos.includes('GESTIONAR_USUARIOS');
}

// ----------------------------------------------------------------------------
// BUSCAR USUARIOS (para reservas; solo requiere sesion)
// GET /api/usuarios/buscar?q=
// ----------------------------------------------------------------------------
export const buscarUsuarios = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q = '' } = req.query as { q?: string };
    const resultado = await pool.query('SELECT SP_BUSCAR_USUARIOS($1) AS usuarios', [
      q || '',
    ]);
    res.json(resultado.rows[0]?.usuarios ?? []);
  } catch (error) {
    console.error('Error al buscar usuarios:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// LISTAR
// GET /api/usuarios?q=&rol=&estado=
// ----------------------------------------------------------------------------
export const listarUsuarios = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { q = '', rol = '', estado = '' } = req.query as {
      q?: string;
      rol?: string;
      estado?: string;
    };

    const resultado = await pool.query(
      'SELECT SP_LISTAR_USUARIOS($1, $2, $3) AS usuarios',
      [q, rol || null, estado || null]
    );

    res.json(resultado.rows[0]?.usuarios ?? []);
  } catch (error) {
    console.error('Error al listar usuarios:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER
// GET /api/usuarios/:id
// ----------------------------------------------------------------------------
export const obtenerUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);

    const resultado = await pool.query(
      'SELECT SP_OBTENER_USUARIO($1) AS usuario',
      [id]
    );

    const usuario = resultado.rows[0]?.usuario;
    if (!usuario) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json(usuario);
  } catch (error) {
    console.error('Error al obtener usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// CREAR
// POST /api/usuarios
// ----------------------------------------------------------------------------
export const crearUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const cuerpo = req.body as PeticionCrearUsuario;

  // Validacion de campos obligatorios.
  if (!cuerpo.nombres?.trim() || !cuerpo.apellidos?.trim() || !cuerpo.clave || !cuerpo.rol_id) {
    res.status(400).json({
      mensaje: 'Faltan datos: se requiere nombres, apellidos, clave y rol_id',
    });
    return;
  }

  try {
    const usuarioAutenticado = req.usuario;

    // Si el creador solo tiene CREAR_USUARIOS (no GESTIONAR_USUARIOS), solo
    // puede crear cuentas de clientes (rol USUARIO).
    if (usuarioAutenticado && !tieneGestionCompleta(usuarioAutenticado.permisos)) {
      const rolCliente = await idRolUsuario();
      if (!rolCliente || cuerpo.rol_id !== rolCliente) {
        res.status(403).json({
          mensaje: 'Solo puedes crear cuentas de clientes (rol USUARIO)',
        });
        return;
      }
    }

    // 1) Crear el usuario (SP_REGISTRAR_USUARIO cifra la clave con bcrypt).
    const creado = await pool.query(
      `SELECT SP_REGISTRAR_USUARIO($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) AS id`,
      [
        cuerpo.nombres.trim(),
        cuerpo.apellidos.trim(),
        cuerpo.dni || null,
        cuerpo.correo || null,
        cuerpo.telefono || null,
        cuerpo.clave,
        cuerpo.rol_id,
        cuerpo.empresa_id || null,
        cuerpo.area_id || null,
        cuerpo.puede_reservar ?? false,
        usuarioAutenticado?.sub ?? null,
      ]
    );

    const nuevoId = creado.rows[0]?.id;

    // 2) Asignar los permisos enviados (si vienen).
    if (cuerpo.permisos?.length) {
      await pool.query('SELECT SP_REEMPLAZAR_PERMISOS($1, $2)', [
        nuevoId,
        cuerpo.permisos,
      ]);
    }

    // 3) Devolver el detalle del usuario creado.
    const detalle = await pool.query('SELECT SP_OBTENER_USUARIO($1) AS usuario', [
      nuevoId,
    ]);

    res.status(201).json(detalle.rows[0]?.usuario);
  } catch (error) {
    const mensajeError = error instanceof Error ? error.message : String(error);
    // Correo o DNI duplicado: PostgreSQL lanza 23505 (unique_violation).
    if (mensajeError.includes('23505') || (error as { code?: string })?.code === '23505') {
      res.status(409).json({
        mensaje: 'Ya existe un usuario con ese correo o DNI',
      });
      return;
    }
    console.error('Error al crear usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// EDITAR
// PUT /api/usuarios/:id
// ----------------------------------------------------------------------------
export const actualizarUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const cuerpo = req.body as PeticionActualizarUsuario;

  if (!cuerpo.nombres?.trim() || !cuerpo.apellidos?.trim() || !cuerpo.rol_id) {
    res.status(400).json({
      mensaje: 'Faltan datos: se requiere nombres, apellidos y rol_id',
    });
    return;
  }

  try {
    const usuarioAutenticado = req.usuario;

    // Si el actor solo tiene CREAR_USUARIOS: solo puede editar clientes
    // (rol USUARIO) y no puede cambiarlos a otro rol.
    if (usuarioAutenticado && !tieneGestionCompleta(usuarioAutenticado.permisos)) {
      const rolCliente = await idRolUsuario();

      // Se usa el SP de detalle para conocer el rol actual del usuario
      // (100% SP-Centric).
      const actual = await pool.query(
        'SELECT SP_OBTENER_USUARIO($1) AS usuario',
        [id]
      );
      const rolActual = actual.rows[0]?.usuario?.rol_id as number | undefined;
      const esCliente = rolActual === rolCliente;

      if (!rolCliente || !esCliente || cuerpo.rol_id !== rolCliente) {
        res.status(403).json({
          mensaje: 'Solo puedes editar cuentas de clientes (rol USUARIO)',
        });
        return;
      }
    }

    const actualizado = await pool.query(
      `SELECT SP_ACTUALIZAR_USUARIO($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) AS ok`,
      [
        id,
        cuerpo.nombres.trim(),
        cuerpo.apellidos.trim(),
        cuerpo.dni || null,
        cuerpo.correo || null,
        cuerpo.telefono || null,
        cuerpo.rol_id,
        cuerpo.empresa_id || null,
        cuerpo.area_id || null,
        cuerpo.puede_reservar ?? false,
        cuerpo.clave_nueva || null,
        usuarioAutenticado?.sub ?? null,
      ]
    );

    if (!actualizado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    // Reemplazar permisos si se enviaron.
    if (cuerpo.permisos) {
      await pool.query('SELECT SP_REEMPLAZAR_PERMISOS($1, $2)', [
        id,
        cuerpo.permisos,
      ]);
    }

    const detalle = await pool.query('SELECT SP_OBTENER_USUARIO($1) AS usuario', [
      id,
    ]);

    res.json(detalle.rows[0]?.usuario);
  } catch (error) {
    const mensajeError = error instanceof Error ? error.message : String(error);
    if (mensajeError.includes('23505') || (error as { code?: string })?.code === '23505') {
      res.status(409).json({
        mensaje: 'Ya existe un usuario con ese correo o DNI',
      });
      return;
    }
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO
// PATCH /api/usuarios/:id/estado  { estado: 'ACTIVO' | 'INACTIVO' }
// ----------------------------------------------------------------------------
export const cambiarEstadoUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { estado } = req.body as { estado?: string };

  if (!estado || !['ACTIVO', 'INACTIVO'].includes(estado)) {
    res.status(400).json({ mensaje: 'Estado invalido (ACTIVO o INACTIVO)' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_CAMBIAR_ESTADO_USUARIO($1, $2, $3) AS ok',
      [id, estado, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json({ mensaje: `Usuario ${estado === 'ACTIVO' ? 'activado' : 'inactivado'}` });
  } catch (error) {
    console.error('Error al cambiar estado:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// ASIGNAR PERMISO
// POST /api/usuarios/:id/permisos  { codigo: 'GESTIONAR_USUARIOS' }
// ----------------------------------------------------------------------------
export const asignarPermiso = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { codigo } = req.body as { codigo?: string };

  if (!codigo) {
    res.status(400).json({ mensaje: 'Falta el codigo del permiso' });
    return;
  }

  try {
    const resultado = await pool.query('SELECT SP_ASIGNAR_PERMISO($1, $2) AS ok', [
      id,
      codigo,
    ]);

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Usuario o permiso no encontrado' });
      return;
    }

    res.status(201).json({ mensaje: 'Permiso asignado' });
  } catch (error) {
    console.error('Error al asignar permiso:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// QUITAR PERMISO
// DELETE /api/usuarios/:id/permisos/:permisoId
// ----------------------------------------------------------------------------
export const quitarPermiso = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const permisoId = Number(req.params.permisoId);

  try {
    const resultado = await pool.query('SELECT SP_QUITAR_PERMISO($1, $2) AS ok', [
      id,
      permisoId,
    ]);

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Permiso no asignado a este usuario' });
      return;
    }

    res.json({ mensaje: 'Permiso quitado' });
  } catch (error) {
    console.error('Error al quitar permiso:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// FOTO DE PERFIL
// ----------------------------------------------------------------------------
// Reglas: el propio usuario puede subir/eliminar su foto; el admin
// (GESTIONAR_USUARIOS) puede gestionar la de cualquiera.
// ----------------------------------------------------------------------------
const MIMES_VALIDOS_FOTO = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAX_FOTO = 2 * 1024 * 1024; // 2 MB

function puedeGestionarFoto(req: Request, usuarioId: number): boolean {
  if (req.usuario?.permisos?.includes('GESTIONAR_USUARIOS')) return true;
  return req.usuario?.sub === usuarioId;
}

// PUT /api/usuarios/:id/foto
export const subirFotoPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { mime, contenido_b64 } = req.body as {
    mime?: string;
    contenido_b64?: string;
  };

  if (!puedeGestionarFoto(req, id)) {
    res.status(403).json({ mensaje: 'No tienes permisos para modificar esta foto' });
    return;
  }

  if (!mime || !MIMES_VALIDOS_FOTO.includes(mime)) {
    res.status(400).json({ mensaje: 'Formato de imagen no permitido (jpeg, png, webp)' });
    return;
  }
  if (!contenido_b64) {
    res.status(400).json({ mensaje: 'Falta contenido_b64' });
    return;
  }

  try {
    const bytes = Buffer.from(contenido_b64, 'base64').length;
    if (bytes > TAMANO_MAX_FOTO) {
      res.status(400).json({ mensaje: 'La imagen supera el tamano maximo de 2 MB' });
      return;
    }
  } catch {
    res.status(400).json({ mensaje: 'Base64 invalido' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_ACTUALIZAR_FOTO_PERFIL($1, $2, $3, $4) AS ok',
      [id, contenido_b64, mime, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json({ mensaje: 'Foto de perfil actualizada' });
  } catch (error) {
    console.error('Error al subir foto de perfil:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// DELETE /api/usuarios/:id/foto
export const quitarFotoPerfil = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);

  if (!puedeGestionarFoto(req, id)) {
    res.status(403).json({ mensaje: 'No tienes permisos para modificar esta foto' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_QUITAR_FOTO_PERFIL($1, $2) AS ok',
      [id, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json({ mensaje: 'Foto de perfil eliminada' });
  } catch (error) {
    console.error('Error al eliminar foto de perfil:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// RESETEAR CONTRASEÑA (SOLO ADMIN)
// POST /api/usuarios/:id/reset-password
// ----------------------------------------------------------------------------
export const resetearClaveUsuario = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);

  try {
    const resultado = await pool.query(
      'SELECT SP_RESET_CLAVE_USUARIO($1, $2) AS ok',
      [id, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Usuario no encontrado' });
      return;
    }

    res.json({
      mensaje: 'Contraseña reseteada a "AventuraCusco" correctamente',
    });
  } catch (error) {
    console.error('Error al resetear contraseña:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
