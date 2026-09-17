// ============================================================================
// CONTROLADOR: RESERVAS
// ----------------------------------------------------------------------------
// La OPERADORA recibe la llamada y crea la reserva; luego la despacha (asigna
// un conductor). El coordinador (CREAR_RESERVAS) crea y ve solo las suyas.
//
// TODA la logica vive en los procedimientos (SP-Centric); aqui solo se hace el
// puente con la API.
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';
import type {
  PeticionCambiarEstado,
  PeticionCrearReserva,
  PeticionDespacharReserva,
} from '../modules/reservas/reservas.types';

/** ¿El actor ve todas las reservas (operadora/admin) o solo las suyas? */
function puedeVerTodas(permisos: string[]): boolean {
  return permisos.includes('DESPACHAR_COLA') || permisos.includes('GESTIONAR_USUARIOS');
}

// ----------------------------------------------------------------------------
// LISTAR
// GET /api/reservas?estado=&q=
// ----------------------------------------------------------------------------
export const listarReservas = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { estado = '', q = '' } = req.query as {
      estado?: string;
      q?: string;
    };
    const permisos = req.usuario?.permisos ?? [];
    const usuarioId = req.usuario?.sub ?? 0;
    const soloPropias = !puedeVerTodas(permisos);

    const resultado = await pool.query(
      'SELECT SP_LISTAR_RESERVAS($1, $2, $3, $4) AS reservas',
      [usuarioId, soloPropias, estado || null, q || null]
    );

    res.json(resultado.rows[0]?.reservas ?? []);
  } catch (error) {
    console.error('Error al listar reservas:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER
// GET /api/reservas/:id
// ----------------------------------------------------------------------------
export const obtenerReserva = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const id = Number(req.params.id);
    const resultado = await pool.query(
      'SELECT SP_OBTENER_RESERVA($1) AS reserva',
      [id]
    );
    const reserva = resultado.rows[0]?.reserva;
    if (!reserva) {
      res.status(404).json({ mensaje: 'Reserva no encontrada' });
      return;
    }
    res.json(reserva);
  } catch (error) {
    console.error('Error al obtener reserva:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// CREAR
// POST /api/reservas
// ----------------------------------------------------------------------------
export const crearReserva = async (
  req: Request,
  res: Response
): Promise<void> => {
  const cuerpo = req.body as PeticionCrearReserva;

  if (
    !cuerpo.pasajero_nombre?.trim() ||
    !cuerpo.fecha_hora ||
    !cuerpo.origen?.trim() ||
    !cuerpo.destino?.trim()
  ) {
    res.status(400).json({
      mensaje: 'Faltan datos: se requiere pasajero_nombre, fecha_hora, origen y destino',
    });
    return;
  }

  const numPasajeros = cuerpo.num_pasajeros ?? 1;
  if (numPasajeros < 1) {
    res.status(400).json({ mensaje: 'El numero de pasajeros debe ser al menos 1' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_CREAR_RESERVA($1, $2, $3, $4, $5, $6, $7, $8, $9) AS creada',
      [
        req.usuario?.sub ?? null,
        cuerpo.pasajero_nombre.trim(),
        cuerpo.pasajero_telefono?.trim() || null,
        cuerpo.fecha_hora,
        cuerpo.origen.trim(),
        cuerpo.destino.trim(),
        numPasajeros,
        cuerpo.notas?.trim() || null,
        cuerpo.pasajero_usuario_id ?? null,
      ]
    );

    const creada = resultado.rows[0]?.creada;
    const detalle = await pool.query('SELECT SP_OBTENER_RESERVA($1) AS reserva', [
      creada?.id,
    ]);

    res.status(201).json(detalle.rows[0]?.reserva);
  } catch (error) {
    console.error('Error al crear reserva:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// ACEPTAR RESERVA (PENDIENTE -> ACEPTADA)
// PATCH /api/reservas/:id/aceptar
// ----------------------------------------------------------------------------
export const aceptarReserva = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);

  try {
    const resultado = await pool.query(
      'SELECT SP_ACEPTAR_RESERVA($1, $2) AS ok',
      [id, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({
        mensaje: 'No se pudo aceptar: reserva inexistente o ya no está pendiente',
      });
      return;
    }

    const detalle = await pool.query('SELECT SP_OBTENER_RESERVA($1) AS reserva', [id]);
    res.json(detalle.rows[0]?.reserva);
  } catch (error) {
    console.error('Error al aceptar reserva:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// DESPACHAR (asignar conductor)
// PATCH /api/reservas/:id/estado  { conductor_id }
// ----------------------------------------------------------------------------
export const despacharReserva = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { conductor_id } = req.body as PeticionDespacharReserva;

  if (!conductor_id) {
    res.status(400).json({ mensaje: 'Falta conductor_id para despachar' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_DESPACHAR_RESERVA($1, $2, $3) AS ok',
      [id, conductor_id, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({
        mensaje: 'No se pudo despachar: reserva inexistente, ya despachada o conductor invalido',
      });
      return;
    }

    const detalle = await pool.query('SELECT SP_OBTENER_RESERVA($1) AS reserva', [id]);
    res.json(detalle.rows[0]?.reserva);
  } catch (error) {
    console.error('Error al despachar reserva:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// CAMBIAR ESTADO (solo cancelar reservas pendientes/despachadas)
// PATCH /api/reservas/:id/cambiar-estado  { estado: 'CANCELADA' }
// ----------------------------------------------------------------------------
export const cambiarEstadoReserva = async (
  req: Request,
  res: Response
): Promise<void> => {
  const id = Number(req.params.id);
  const { estado } = req.body as PeticionCambiarEstado;

  if (estado !== 'CANCELADA') {
    res.status(400).json({ mensaje: 'Solo se permite cancelar (CANCELADA)' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_CAMBIAR_ESTADO_RESERVA($1, $2, $3) AS ok',
      [id, estado, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Reserva no encontrada' });
      return;
    }

    const detalle = await pool.query('SELECT SP_OBTENER_RESERVA($1) AS reserva', [id]);
    res.json(detalle.rows[0]?.reserva);
  } catch (error) {
    console.error('Error al cambiar estado de reserva:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};