// ============================================================================
// CONTROLADOR: CONFIGURACION (PUNTOS DE RECOGIDA)
// ----------------------------------------------------------------------------
// El ADMIN configura puntos de recogida (hora + lugar). Solo GESTIONAR_CATALOGOS.
// 100% SP-Centric.
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';

// ----------------------------------------------------------------------------
// LISTAR
// GET /api/configuracion/puntos
// ----------------------------------------------------------------------------
export const listarPuntos = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const resultado = await pool.query('SELECT SP_LISTAR_PUNTOS() AS puntos');
    res.json(resultado.rows[0]?.puntos ?? []);
  } catch (error) {
    console.error('Error al listar puntos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// CREAR
// POST /api/configuracion/puntos  { hora, lugar }
// ----------------------------------------------------------------------------
export const crearPunto = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { hora, lugar } = req.body as { hora?: string; lugar?: string };

  if (!hora || !lugar?.trim()) {
    res.status(400).json({ mensaje: 'Faltan hora y lugar' });
    return;
  }

  try {
    const resultado = await pool.query('SELECT SP_CREAR_PUNTO($1, $2, $3) AS id', [
      hora,
      lugar.trim(),
      req.usuario?.sub ?? null,
    ]);
    res.status(201).json({ id: resultado.rows[0]?.id });
  } catch (error) {
    console.error('Error al crear punto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// EDITAR
// PUT /api/configuracion/puntos/:id  { hora, lugar }
// ----------------------------------------------------------------------------
export const actualizarPunto = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { hora, lugar } = req.body as { hora?: string; lugar?: string };

  if (!hora || !lugar?.trim()) {
    res.status(400).json({ mensaje: 'Faltan hora y lugar' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_ACTUALIZAR_PUNTO($1, $2, $3, $4) AS ok',
      [id, hora, lugar.trim(), req.usuario?.sub ?? null]
    );
    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Punto no encontrado' });
      return;
    }
    res.json({ mensaje: 'Punto actualizado' });
  } catch (error) {
    console.error('Error al actualizar punto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO
// PATCH /api/configuracion/puntos/:id/estado  { estado }
// ----------------------------------------------------------------------------
export const cambiarEstadoPunto = async (
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
      'SELECT SP_CAMBIAR_ESTADO_PUNTO($1, $2, $3) AS ok',
      [id, estado, req.usuario?.sub ?? null]
    );
    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Punto no encontrado' });
      return;
    }
    res.json({ mensaje: `Punto ${estado === 'ACTIVO' ? 'activado' : 'inactivado'}` });
  } catch (error) {
    console.error('Error al cambiar estado de punto:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};