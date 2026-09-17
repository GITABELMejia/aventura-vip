// ============================================================================
// CONTROLADOR: ORGANIZACION (CATALOGOS DE NEGOCIO)
// ----------------------------------------------------------------------------
// CRUD de empresas, establecimientos y areas (modulo "Organizacion").
// Toda la logica vive en los SPs de 06_ORGANIZACION.SQL (SP-Centric).
// Requiere el permiso GESTIONAR_CATALOGOS (definido en las rutas).
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';

// ----------------------------------------------------------------------------
// UTILIDAD: ejecutar un SP_GUARDAR_* y devolver su resultado
// ----------------------------------------------------------------------------
async function guardar(
  sp: string,
  parametros: unknown[],
  res: Response
): Promise<void> {
  try {
    const resultado = await pool.query(`SELECT ${sp}(${parametros.map((_, i) => `$${i + 1}`).join(', ')}) AS guardado`, parametros);
    const id = resultado.rows[0]?.guardado?.id;
    res.status(id ? (parametros[0] == null ? 201 : 200) : 400).json({ id, mensaje: 'Guardado' });
  } catch (error) {
    const mensajeError = error instanceof Error ? error.message : String(error);
    // Nombre duplicado dentro de la misma empresa/establecimiento.
    if (mensajeError.includes('23505') || (error as { code?: string })?.code === '23505') {
      res.status(409).json({ mensaje: 'Ya existe un registro con ese nombre en el mismo nivel' });
      return;
    }
    console.error(`Error en ${sp}:`, error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
}

// ----------------------------------------------------------------------------
// EMPRESAS
// ----------------------------------------------------------------------------
export const listarEmpresas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query('SELECT SP_LISTAR_EMPRESAS() AS empresas');
    res.json(resultado.rows[0]?.empresas ?? []);
  } catch (error) {
    console.error('Error al listar empresas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const guardarEmpresa = async (req: Request, res: Response): Promise<void> => {
  // En PUT el id llega por la ruta; en POST viene del body (undefined).
  const id = req.params.id !== undefined ? Number(req.params.id) : (req.body?.id as number | undefined);
  const { nombre, ruc, telefono, direccion, estado } = req.body as {
    nombre: string;
    ruc?: string;
    telefono?: string;
    direccion?: string;
    estado?: string;
  };

  if (!nombre?.trim()) {
    res.status(400).json({ mensaje: 'El nombre de la empresa es obligatorio' });
    return;
  }

  await guardar('SP_GUARDAR_EMPRESA', [id ?? null, nombre.trim(), ruc || null, telefono || null, direccion || null, estado || 'ACTIVO', req.usuario?.sub ?? null], res);
};

export const cambiarEstadoEmpresa = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { estado } = req.body as { estado?: string };

  if (!estado || !['ACTIVO', 'INACTIVO'].includes(estado)) {
    res.status(400).json({ mensaje: 'Estado invalido (ACTIVO o INACTIVO)' });
    return;
  }

  try {
    const resultado = await pool.query('SELECT SP_CAMBIAR_ESTADO_EMPRESA($1, $2, $3) AS ok', [id, estado, req.usuario?.sub ?? null]);
    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Empresa no encontrada' });
      return;
    }
    res.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado de empresa:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// ESTABLECIMIENTOS
// ----------------------------------------------------------------------------
export const listarEstablecimientos = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query('SELECT SP_LISTAR_ESTABLECIMIENTOS() AS establecimientos');
    res.json(resultado.rows[0]?.establecimientos ?? []);
  } catch (error) {
    console.error('Error al listar establecimientos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const guardarEstablecimiento = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id !== undefined ? Number(req.params.id) : (req.body?.id as number | undefined);
  const { empresa_id, nombre, descripcion, estado } = req.body as {
    empresa_id: number;
    nombre: string;
    descripcion?: string;
    estado?: string;
  };

  if (!nombre?.trim() || !empresa_id) {
    res.status(400).json({ mensaje: 'El nombre y la empresa son obligatorios' });
    return;
  }

  await guardar('SP_GUARDAR_ESTABLECIMIENTO', [id ?? null, empresa_id, nombre.trim(), descripcion || null, estado || 'ACTIVO', req.usuario?.sub ?? null], res);
};

export const cambiarEstadoEstablecimiento = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { estado } = req.body as { estado?: string };

  if (!estado || !['ACTIVO', 'INACTIVO'].includes(estado)) {
    res.status(400).json({ mensaje: 'Estado invalido (ACTIVO o INACTIVO)' });
    return;
  }

  try {
    const resultado = await pool.query('SELECT SP_CAMBIAR_ESTADO_ESTABLECIMIENTO($1, $2, $3) AS ok', [id, estado, req.usuario?.sub ?? null]);
    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Establecimiento no encontrado' });
      return;
    }
    res.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado de establecimiento:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// AREAS
// ----------------------------------------------------------------------------
export const listarAreas = async (_req: Request, res: Response): Promise<void> => {
  try {
    const resultado = await pool.query('SELECT SP_LISTAR_AREAS() AS areas');
    res.json(resultado.rows[0]?.areas ?? []);
  } catch (error) {
    console.error('Error al listar areas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

export const guardarArea = async (req: Request, res: Response): Promise<void> => {
  const id = req.params.id !== undefined ? Number(req.params.id) : (req.body?.id as number | undefined);
  const { establecimiento_id, nombre, descripcion, estado } = req.body as {
    establecimiento_id: number;
    nombre: string;
    descripcion?: string;
    estado?: string;
  };

  if (!nombre?.trim() || !establecimiento_id) {
    res.status(400).json({ mensaje: 'El nombre y el establecimiento son obligatorios' });
    return;
  }

  await guardar('SP_GUARDAR_AREA', [id ?? null, establecimiento_id, nombre.trim(), descripcion || null, estado || 'ACTIVO', req.usuario?.sub ?? null], res);
};

export const cambiarEstadoArea = async (req: Request, res: Response): Promise<void> => {
  const id = Number(req.params.id);
  const { estado } = req.body as { estado?: string };

  if (!estado || !['ACTIVO', 'INACTIVO'].includes(estado)) {
    res.status(400).json({ mensaje: 'Estado invalido (ACTIVO o INACTIVO)' });
    return;
  }

  try {
    const resultado = await pool.query('SELECT SP_CAMBIAR_ESTADO_AREA($1, $2, $3) AS ok', [id, estado, req.usuario?.sub ?? null]);
    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Area no encontrada' });
      return;
    }
    res.json({ mensaje: 'Estado actualizado' });
  } catch (error) {
    console.error('Error al cambiar estado de area:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
