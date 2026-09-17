// ============================================================================
// CONTROLADOR: SERVICIOS
// ----------------------------------------------------------------------------
// Un servicio agrupa varias reservas (pasajeros). Al recoger al primer pasajero
// se crea el servicio; luego se agregan mas reservas y al final se finaliza.
// El conductor opera sus propios viajes; la operadora/admin operan cualquiera.
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';

function esOperadorOAdmin(req: Request): boolean {
  const permisos = req.usuario?.permisos ?? [];
  return permisos.includes('DESPACHAR_COLA') || permisos.includes('GESTIONAR_USUARIOS');
}

/** ¿El actor puede operar la reserva (referencia a un conductor)? */
async function puedeOperarReserva(req: Request, reservaId: number): Promise<boolean> {
  if (esOperadorOAdmin(req)) return true;
  const resultado = await pool.query('SELECT SP_OBTENER_RESERVA($1) AS reserva', [
    reservaId,
  ]);
  const reserva = resultado.rows[0]?.reserva;
  return (
    req.usuario?.rol === 'CONDUCTOR' &&
    reserva?.conductor_id === req.usuario?.sub
  );
}

/** ¿El actor puede operar el servicio? */
async function puedeOperarServicio(req: Request, servicioId: number): Promise<boolean> {
  if (esOperadorOAdmin(req)) return true;
  const resultado = await pool.query('SELECT SP_OBTENER_SERVICIO($1) AS servicio', [
    servicioId,
  ]);
  const servicio = resultado.rows[0]?.servicio;
  return (
    req.usuario?.rol === 'CONDUCTOR' &&
    servicio?.conductor_id === req.usuario?.sub
  );
}

// ----------------------------------------------------------------------------
// RESERVAS DISPONIBLES (conductor: asignadas sin servicio)
// GET /api/servicios/reservas-disponibles
// ----------------------------------------------------------------------------
export const listarReservasDisponibles = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resultado = await pool.query(
      'SELECT SP_LISTAR_RESERVAS_DISPONIBLES($1) AS reservas',
      [req.usuario?.sub ?? 0]
    );
    res.json(resultado.rows[0]?.reservas ?? []);
  } catch (error) {
    console.error('Error al listar reservas disponibles:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// MIS SERVICIOS (conductor)
// GET /api/servicios/mios
// ----------------------------------------------------------------------------
export const listarServiciosConductor = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resultado = await pool.query(
      'SELECT SP_LISTAR_SERVICIOS_CONDUCTOR($1) AS servicios',
      [req.usuario?.sub ?? 0]
    );
    res.json(resultado.rows[0]?.servicios ?? []);
  } catch (error) {
    console.error('Error al listar mis servicios:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// HISTORIAL DE SERVICIOS (operadora/admin)
// GET /api/servicios?estado=&q=
// ----------------------------------------------------------------------------
export const listarServicios = async (
  req: Request,
  res: Response
): Promise<void> => {
  if (!esOperadorOAdmin(req)) {
    res.status(403).json({ mensaje: 'No tienes permisos para ver los servicios' });
    return;
  }

  try {
    const { estado = '', q = '' } = req.query as { estado?: string; q?: string };
    const resultado = await pool.query(
      'SELECT SP_LISTAR_SERVICIOS($1, $2) AS servicios',
      [estado || null, q || null]
    );
    res.json(resultado.rows[0]?.servicios ?? []);
  } catch (error) {
    console.error('Error al listar servicios:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// INICIAR SERVICIO (recoger primer pasajero)
// POST /api/servicios/iniciar  { reserva_id }
// ----------------------------------------------------------------------------
export const iniciarServicio = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { reserva_id } = req.body as { reserva_id?: number };
  const reservaId = Number(reserva_id);

  if (!reservaId) {
    res.status(400).json({ mensaje: 'Falta reserva_id' });
    return;
  }

  try {
    if (!(await puedeOperarReserva(req, reservaId))) {
      res.status(403).json({ mensaje: 'No puedes iniciar este servicio' });
      return;
    }

    const resultado = await pool.query(
      'SELECT SP_INICIAR_SERVICIO($1, $2) AS servicio',
      [reservaId, req.usuario?.sub ?? null]
    );

    const servicio = resultado.rows[0]?.servicio;
    if (!servicio?.id) {
      res.status(404).json({
        mensaje: 'No se pudo iniciar: la reserva no está despachada o no existe',
      });
      return;
    }

    res.status(201).json(servicio);
  } catch (error) {
    console.error('Error al iniciar servicio:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// AGREGAR RESERVA AL SERVICIO (mas pasajeros)
// POST /api/servicios/:id/reservas  { reserva_id }
// ----------------------------------------------------------------------------
export const agregarReserva = async (
  req: Request,
  res: Response
): Promise<void> => {
  const servicioId = Number(req.params.id);
  const { reserva_id } = req.body as { reserva_id?: number };
  const reservaId = Number(reserva_id);

  if (!servicioId || !reservaId) {
    res.status(400).json({ mensaje: 'Faltan servicio (id) o reserva_id' });
    return;
  }

  try {
    if (!(await puedeOperarServicio(req, servicioId))) {
      res.status(403).json({ mensaje: 'No puedes agregar a este servicio' });
      return;
    }

    const resultado = await pool.query(
      'SELECT SP_AGREGAR_RESERVA_SERVICIO($1, $2, $3) AS ok',
      [servicioId, reservaId, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({
        mensaje: 'No se pudo agregar: la reserva no está disponible para este servicio',
      });
      return;
    }

    const detalle = await pool.query(
      'SELECT SP_LISTAR_SERVICIOS_CONDUCTOR($1) AS servicios',
      [req.usuario?.sub ?? 0]
    );
    res.json(detalle.rows[0]?.servicios ?? []);
  } catch (error) {
    console.error('Error al agregar reserva al servicio:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// AGREGAR RESERVA DEL POOL AL SERVICIO (auto-asigna al conductor)
// POST /api/servicios/:id/reservas-directo  { reserva_id }
// ----------------------------------------------------------------------------
export const agregarReservaDirecto = async (
  req: Request,
  res: Response
): Promise<void> => {
  const servicioId = Number(req.params.id);
  const { reserva_id } = req.body as { reserva_id?: number };
  const reservaId = Number(reserva_id);

  if (!servicioId || !reservaId) {
    res.status(400).json({ mensaje: 'Faltan servicio (id) o reserva_id' });
    return;
  }

  try {
    if (!(await puedeOperarServicio(req, servicioId))) {
      res.status(403).json({ mensaje: 'No puedes agregar a este servicio' });
      return;
    }

    const resultado = await pool.query(
      'SELECT SP_AGREGAR_RESERVA_SERVICIO_DIRECTO($1, $2, $3, $4) AS ok',
      [servicioId, reservaId, req.usuario?.sub ?? null, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({
        mensaje: 'No se pudo agregar: la reserva no está disponible para este servicio',
      });
      return;
    }

    const detalle = await pool.query(
      'SELECT SP_LISTAR_SERVICIOS_CONDUCTOR($1) AS servicios',
      [req.usuario?.sub ?? 0]
    );
    res.json(detalle.rows[0]?.servicios ?? []);
  } catch (error) {
    console.error('Error al agregar reserva directa al servicio:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// FINALIZAR SERVICIO
// PATCH /api/servicios/:id/finalizar
// ----------------------------------------------------------------------------
export const finalizarServicio = async (
  req: Request,
  res: Response
): Promise<void> => {
  const servicioId = Number(req.params.id);

  if (!servicioId) {
    res.status(400).json({ mensaje: 'Falta el id del servicio' });
    return;
  }

  try {
    if (!(await puedeOperarServicio(req, servicioId))) {
      res.status(403).json({ mensaje: 'No puedes finalizar este servicio' });
      return;
    }

    const resultado = await pool.query(
      'SELECT SP_FINALIZAR_SERVICIO($1, $2) AS ok',
      [servicioId, req.usuario?.sub ?? null]
    );

    if (!resultado.rows[0]?.ok) {
      res.status(404).json({
        mensaje: 'No se pudo finalizar: el servicio no está en curso o no existe',
      });
      return;
    }

    const detalle = await pool.query(
      'SELECT SP_LISTAR_SERVICIOS_CONDUCTOR($1) AS servicios',
      [req.usuario?.sub ?? 0]
    );
    res.json(detalle.rows[0]?.servicios ?? []);
  } catch (error) {
    console.error('Error al finalizar servicio:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// RESERVAS DEL POOL (sin asignar, desde la hora/lugar configurados)
// GET /api/servicios/disponibles-pool
// ----------------------------------------------------------------------------
export const listarReservasPool = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const resultado = await pool.query(
      'SELECT SP_LISTAR_RESERVAS_POOL($1) AS reservas',
      [req.usuario?.sub ?? 0]
    );
    res.json(resultado.rows[0]?.reservas ?? []);
  } catch (error) {
    console.error('Error al listar reservas del pool:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// INICIAR SERVICIO DIRECTO (auto-asignar conductor a una reserva sin asignar)
// POST /api/servicios/iniciar-directo  { reserva_id }
// ----------------------------------------------------------------------------
export const iniciarServicioDirecto = async (
  req: Request,
  res: Response
): Promise<void> => {
  const { reserva_id } = req.body as { reserva_id?: number };
  const reservaId = Number(reserva_id);

  if (!reservaId) {
    res.status(400).json({ mensaje: 'Falta reserva_id' });
    return;
  }

  if (req.usuario?.rol !== 'CONDUCTOR') {
    res.status(403).json({ mensaje: 'Solo los conductores pueden iniciar este servicio' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_INICIAR_SERVICIO_DIRECTO($1, $2, $3) AS servicio',
      [reservaId, req.usuario.sub, req.usuario.sub]
    );

    const servicio = resultado.rows[0]?.servicio;
    if (!servicio?.id) {
      res.status(404).json({
        mensaje: 'No se pudo iniciar: la reserva no está disponible desde los puntos configurados',
      });
      return;
    }

    res.status(201).json(servicio);
  } catch (error) {
    console.error('Error al iniciar servicio directo:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};