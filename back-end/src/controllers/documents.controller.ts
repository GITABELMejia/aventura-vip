// ============================================================================
// CONTROLADOR: DOCUMENTOS DEL CONDUCTOR
// ----------------------------------------------------------------------------
// Fotos de DNI y licencia de conducir, almacenadas en base64.
//
// REGLAS DE ACCESO:
//   * Solo usuarios con rol CONDUCTOR poseen documentos.
//   * El CONDUCTOR gestiona SOLO sus propios documentos.
//   * El ADMIN (GESTIONAR_USUARIOS) gestiona documentos de cualquier conductor.
//   * La OPERADORA no tiene acceso (403).
//   * El DNI y la licencia tienen DOS CARAS (ANVERSO y REVERSO).
//   * Los DATOS de la licencia (numero + caducidad) se guardan primero por
//     separado (tabla LICENCIAS) y luego se cargan las dos caras.
// ============================================================================

import { Request, Response } from 'express';
import { pool } from '../config/database';

// Tipos y MIME permitidos.
const TIPOS_VALIDOS = ['DNI', 'LICENCIA'];
const CARAS_VALIDAS = ['ANVERSO', 'REVERSO'];
const MIMES_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];
const TAMANO_MAXIMO_BYTES = 5 * 1024 * 1024; // 5 MB

// Extension del archivo segun su MIME (para la nomenclatura del nombre).
const EXTENSIONES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function esAdmin(req: Request): boolean {
  return req.usuario?.permisos?.includes('GESTIONAR_USUARIOS') ?? false;
}

function esConductor(req: Request): boolean {
  return req.usuario?.rol === 'CONDUCTOR';
}

/** ¿Puede el usuario autenticado gestionar los documentos de `usuarioId`? */
function puedeGestionar(req: Request, usuarioId: number): boolean {
  if (esAdmin(req)) return true;
  return esConductor(req) && req.usuario?.sub === usuarioId;
}

// ----------------------------------------------------------------------------
// UTILIDAD: datos del usuario objetivo (rol + dni). NULL si no existe.
// ----------------------------------------------------------------------------
interface UsuarioObjetivo {
  rol?: string;
  dni?: string | null;
}

async function obtenerUsuarioObjetivo(
  usuarioId: number
): Promise<UsuarioObjetivo | null> {
  const resultado = await pool.query(
    'SELECT SP_OBTENER_USUARIO($1) AS usuario',
    [usuarioId]
  );
  return (resultado.rows[0]?.usuario as UsuarioObjetivo) ?? null;
}

// ----------------------------------------------------------------------------
// LISTAR DOCUMENTOS DE UN USUARIO
// GET /api/usuarios/:id/documentos
// ----------------------------------------------------------------------------
export const listarDocumentos = async (
  req: Request,
  res: Response
): Promise<void> => {
  const usuarioId = Number(req.params.id);

  if (!puedeGestionar(req, usuarioId)) {
    res.status(403).json({ mensaje: 'No tienes permisos para ver estos documentos' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_LISTAR_DOCUMENTOS($1) AS documentos',
      [usuarioId]
    );
    res.json(resultado.rows[0]?.documentos ?? []);
  } catch (error) {
    console.error('Error al listar documentos:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// SUBIR / REEMPLAZAR DOCUMENTO
// POST /api/usuarios/:id/documentos
// ----------------------------------------------------------------------------
export const subirDocumento = async (
  req: Request,
  res: Response
): Promise<void> => {
  const usuarioId = Number(req.params.id);
  const {
    tipo,
    cara,
    mime,
    contenido_b64,
  } = req.body as {
    tipo?: string;
    cara?: string;
    mime?: string;
    contenido_b64?: string;
  };

  // 1) Permisos.
  if (!puedeGestionar(req, usuarioId)) {
    res.status(403).json({ mensaje: 'No tienes permisos para subir documentos' });
    return;
  }

  // 2) Validaciones de campos.
  if (!tipo || !TIPOS_VALIDOS.includes(tipo)) {
    res.status(400).json({ mensaje: 'Tipo invalido (DNI o LICENCIA)' });
    return;
  }
  if (!cara || !CARAS_VALIDAS.includes(cara)) {
    res.status(400).json({ mensaje: 'Cara invalida (ANVERSO o REVERSO)' });
    return;
  }
  if (!contenido_b64) {
    res.status(400).json({ mensaje: 'Falta contenido_b64' });
    return;
  }
  if (!mime || !MIMES_VALIDOS.includes(mime)) {
    res.status(400).json({ mensaje: 'Formato de imagen no permitido (jpeg, png, webp)' });
    return;
  }

  // Tamano maximo (decodificando el base64).
  try {
    const bytes = Buffer.from(contenido_b64, 'base64').length;
    if (bytes > TAMANO_MAXIMO_BYTES) {
      res.status(400).json({ mensaje: 'La imagen supera el tamano maximo de 5 MB' });
      return;
    }
  } catch {
    res.status(400).json({ mensaje: 'Base64 invalido' });
    return;
  }

  try {
    // 3) El usuario objetivo debe ser CONDUCTOR (y aporta su DNI).
    const objetivo = await obtenerUsuarioObjetivo(usuarioId);
    if (objetivo?.rol !== 'CONDUCTOR') {
      res.status(400).json({ mensaje: 'Solo los conductores tienen documentos' });
      return;
    }
    const dni = objetivo.dni?.trim();
    if (!dni) {
      res.status(400).json({ mensaje: 'El conductor no tiene DNI registrado' });
      return;
    }

    // 4) Nomenclatura del nombre: TIPO_CARA_DNI.extension
    //    (ej. DNI_A_34567890.jpg, LICENCIA_R_34567890.png).
    const letra = cara === 'ANVERSO' ? 'A' : 'R';
    const extension = EXTENSIONES[mime] ?? 'jpg';
    const nombreArchivo = `${tipo}_${letra}_${dni}.${extension}`;

    const resultado = await pool.query(
      `SELECT SP_GUARDAR_DOCUMENTO($1, $2, $3, $4, $5, $6, $7) AS guardado`,
      [
        usuarioId,
        tipo,
        cara,
        nombreArchivo,
        mime,
        contenido_b64,
        req.usuario?.sub ?? null,
      ]
    );

    const documentoId = resultado.rows[0]?.guardado?.id;
    res.status(201).json({ id: documentoId, mensaje: 'Documento guardado' });
  } catch (error) {
    console.error('Error al guardar documento:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER UN DOCUMENTO (con base64)
// GET /api/documentos/:docId
// ----------------------------------------------------------------------------
export const obtenerDocumento = async (
  req: Request,
  res: Response
): Promise<void> => {
  const docId = Number(req.params.docId);

  try {
    const resultado = await pool.query(
      'SELECT SP_OBTENER_DOCUMENTO($1) AS documento',
      [docId]
    );
    const documento = resultado.rows[0]?.documento;
    if (!documento) {
      res.status(404).json({ mensaje: 'Documento no encontrado' });
      return;
    }

    if (!puedeGestionar(req, documento.usuario_id)) {
      res.status(403).json({ mensaje: 'No tienes permisos para ver este documento' });
      return;
    }

    res.json(documento);
  } catch (error) {
    console.error('Error al obtener documento:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// ELIMINAR DOCUMENTO
// DELETE /api/documentos/:docId
// ----------------------------------------------------------------------------
export const eliminarDocumento = async (
  req: Request,
  res: Response
): Promise<void> => {
  const docId = Number(req.params.docId);

  try {
    const actual = await pool.query(
      'SELECT SP_OBTENER_DOCUMENTO($1) AS documento',
      [docId]
    );
    const documento = actual.rows[0]?.documento;
    if (!documento) {
      res.status(404).json({ mensaje: 'Documento no encontrado' });
      return;
    }

    if (!puedeGestionar(req, documento.usuario_id)) {
      res.status(403).json({ mensaje: 'No tienes permisos para eliminar este documento' });
      return;
    }

    const eliminado = await pool.query(
      'SELECT SP_ELIMINAR_DOCUMENTO($1) AS ok',
      [docId]
    );
    if (!eliminado.rows[0]?.ok) {
      res.status(404).json({ mensaje: 'Documento no encontrado' });
      return;
    }

    res.json({ mensaje: 'Documento eliminado' });
  } catch (error) {
    console.error('Error al eliminar documento:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// OBTENER DATOS DE LA LICENCIA
// GET /api/usuarios/:id/licencia
// ----------------------------------------------------------------------------
export const obtenerLicencia = async (
  req: Request,
  res: Response
): Promise<void> => {
  const usuarioId = Number(req.params.id);

  if (!puedeGestionar(req, usuarioId)) {
    res.status(403).json({ mensaje: 'No tienes permisos para ver estos datos' });
    return;
  }

  try {
    const resultado = await pool.query(
      'SELECT SP_OBTENER_LICENCIA($1) AS licencia',
      [usuarioId]
    );
    // Devuelve null si aun no hay datos guardados.
    res.json(resultado.rows[0]?.licencia ?? null);
  } catch (error) {
    console.error('Error al obtener licencia:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};

// ----------------------------------------------------------------------------
// GUARDAR DATOS DE LA LICENCIA
// PUT /api/usuarios/:id/licencia
// ----------------------------------------------------------------------------
export const guardarLicencia = async (
  req: Request,
  res: Response
): Promise<void> => {
  const usuarioId = Number(req.params.id);
  const { numero_documento, fecha_caducidad } = req.body as {
    numero_documento?: string;
    fecha_caducidad?: string;
  };

  if (!puedeGestionar(req, usuarioId)) {
    res.status(403).json({ mensaje: 'No tienes permisos para guardar estos datos' });
    return;
  }

  if (!numero_documento?.trim() || !fecha_caducidad) {
    res.status(400).json({
      mensaje: 'La licencia requiere numero de licencia y fecha de caducidad',
    });
    return;
  }

  try {
    // El usuario objetivo debe ser CONDUCTOR.
    if ((await obtenerUsuarioObjetivo(usuarioId))?.rol !== 'CONDUCTOR') {
      res.status(400).json({ mensaje: 'Solo los conductores tienen licencia' });
      return;
    }

    const resultado = await pool.query(
      'SELECT SP_GUARDAR_LICENCIA($1, $2, $3, $4) AS guardado',
      [
        usuarioId,
        numero_documento.trim(),
        fecha_caducidad,
        req.usuario?.sub ?? null,
      ]
    );

    const licenciaId = resultado.rows[0]?.guardado?.id;
    res.json({ id: licenciaId, mensaje: 'Datos de licencia guardados' });
  } catch (error) {
    console.error('Error al guardar licencia:', error);
    res.status(500).json({ mensaje: 'Error interno del servidor' });
  }
};