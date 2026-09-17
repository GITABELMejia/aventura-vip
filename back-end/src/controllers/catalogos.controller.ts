// ============================================================================
// CONTROLADOR: CATALOGOS
// ----------------------------------------------------------------------------
// Devuelve los catalogos que alimentan los formularios del frontend:
// roles, empresas, establecimientos, areas y permisos. Todo en UNA llamada
// al procedimiento SP_OBTENER_CATALOGOS (100% SP-Centric). Solo requiere
// sesion (no permiso).
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';

export const obtenerCatalogos = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const resultado = await pool.query('SELECT SP_OBTENER_CATALOGOS() AS catalogos');
    res.json(resultado.rows[0]?.catalogos ?? {});
  } catch (error) {
    console.error('Error al obtener catalogos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};
