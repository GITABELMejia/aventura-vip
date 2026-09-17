// ============================================================================
// PAGINA: DOCUMENTOS DEL CONDUCTOR (DNI + LICENCIA, DOS CARAS)
// ----------------------------------------------------------------------------
// Permite al CONDUCTOR subir/reemplazar las fotos de su DNI y licencia, y al
// ADMIN gestionar los documentos de cualquier conductor.
//
// FLUJO REQUERIDO:
//   * DNI: frente (ANVERSO) y reverso. Se suben directamente.
//   * LICENCIA: PRIMERO se guardan numero de licencia + fecha de caducidad;
//     SOLO despues se habilitan las fotos de frente y reverso.
//   * 1 imagen por cara (al subir se reemplaza la anterior de esa cara).
//   * Imagenes en base64 (jpeg, png, webp; max 5 MB).
// ============================================================================

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { FileImage, IdCard, Lock, Save, Trash2, Upload, X } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import CampoFormulario from '../components/CampoFormulario';
import {
  eliminarDocumento,
  listarDocumentos,
  obtenerDocumento,
  obtenerDatosLicencia,
  guardarDatosLicencia,
  subirDocumento,
} from '../services/documentos.service';
import { leerUsuario } from '../services/auth.service';
import type {
  CaraDocumento,
  Documento,
  DocumentoDetalle,
  LicenciaDatos,
  TipoDocumento,
} from '../types';

// Parsea un dataURL ("data:image/png;base64,....") en { mime, base64 }.
function parsearDataUrl(dataUrl: string): { mime: string; base64: string } {
  const [cabecera, base64] = dataUrl.split(',');
  const mime = cabecera.match(/data:(.*?);/)?.[1] ?? '';
  return { mime, base64 };
}

const MIMES_VALIDOS = ['image/jpeg', 'image/png', 'image/webp'];

export default function Documentos() {
  const { id } = useParams<{ id: string }>();
  const usuario = leerUsuario();
  const usuarioId = id ? Number(id) : (usuario?.id ?? 0);
  const esAdmin = usuario?.permisos?.includes('GESTIONAR_USUARIOS') ?? false;

  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [guardandoLicencia, setGuardandoLicencia] = useState(false);

  // Datos de la licencia (numero + caducidad). Si es null, aun no estan.
  const [licenciaDatos, setLicenciaDatos] = useState<LicenciaDatos | null>(null);

  // Vista previa (modal).
  const [previa, setPrevia] = useState<DocumentoDetalle | null>(null);

  // Miniaturas ya decodificadas: docId -> dataURL.
  const [miniaturas, setMiniaturas] = useState<Record<number, string>>({});

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [lista, datosLic] = await Promise.all([
        listarDocumentos(usuarioId),
        obtenerDatosLicencia(usuarioId),
      ]);
      setDocumentos(lista);
      setLicenciaDatos(datosLic);

      // Se pide el base64 de cada documento para pintar su miniatura.
      const mini: Record<number, string> = {};
      await Promise.all(
        lista.map(async (d) => {
          try {
            const detalle = await obtenerDocumento(d.id);
            mini[d.id] = `data:${detalle.mime};base64,${detalle.contenido_b64}`;
          } catch {
            /* si falla la miniatura se muestra el icono generico */
          }
        })
      );
      setMiniaturas(mini);
    } catch {
      setError('No se pudieron cargar los documentos.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    if (usuarioId) cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioId]);

  // --------------------------------------------------------------------------
  // SUBIDA DE UNA CARA DE UN TIPO
  // --------------------------------------------------------------------------
  async function manejarSubida(
    tipo: TipoDocumento,
    cara: CaraDocumento,
    archivo: File | null
  ) {
    if (!archivo) {
      setError('Selecciona una imagen.');
      return;
    }
    if (!MIMES_VALIDOS.includes(archivo.type)) {
      setError('Formato no permitido. Usa JPEG, PNG o WebP.');
      return;
    }
    if (archivo.size > 5 * 1024 * 1024) {
      setError('La imagen supera 5 MB.');
      return;
    }

    setError('');
    setGuardando(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result as string);
        lector.onerror = () => reject(new Error('No se pudo leer la imagen'));
        lector.readAsDataURL(archivo);
      });
      const { base64: contenido } = parsearDataUrl(base64);

      await subirDocumento(usuarioId, {
        tipo,
        cara,
        nombre_archivo: archivo.name,
        mime: archivo.type,
        contenido_b64: contenido,
      });
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo subir el documento.'
      );
    } finally {
      setGuardando(false);
    }
  }

  // --------------------------------------------------------------------------
  // GUARDAR DATOS DE LA LICENCIA (numero + caducidad)
  // --------------------------------------------------------------------------
  async function manejarGuardarLicencia(numero: string, caducidad: string) {
    if (!numero.trim() || !caducidad) {
      setError('Ingresa el numero de licencia y la fecha de caducidad.');
      return;
    }
    setError('');
    setGuardandoLicencia(true);
    try {
      await guardarDatosLicencia(usuarioId, {
        numero_documento: numero.trim(),
        fecha_caducidad: caducidad,
      });
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudieron guardar los datos de la licencia.'
      );
    } finally {
      setGuardandoLicencia(false);
    }
  }

  async function manejarEliminar(documento: Documento) {
    setError('');
    try {
      await eliminarDocumento(documento.id);
      await cargar();
    } catch {
      setError('No se pudo eliminar el documento.');
    }
  }

  async function verPrevia(documento: Documento) {
    setError('');
    try {
      const detalle = await obtenerDocumento(documento.id);
      setPrevia(detalle);
    } catch {
      setError('No se pudo cargar la imagen.');
    }
  }

  function caraDe(tipo: TipoDocumento, cara: CaraDocumento): Documento | undefined {
    return documentos.find((d) => d.tipo === tipo && d.cara === cara);
  }

  const dniAnverso = caraDe('DNI', 'ANVERSO');
  const dniReverso = caraDe('DNI', 'REVERSO');
  const licAnverso = caraDe('LICENCIA', 'ANVERSO');
  const licReverso = caraDe('LICENCIA', 'REVERSO');

  const mini = (doc?: Documento) => (doc ? miniaturas[doc.id] : undefined);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
          {esAdmin && id ? 'Documentos del conductor' : 'Mis documentos'}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
          Fotos del DNI y de la licencia de conducir (frente y reverso). Solo conductores.
        </p>
      </div>

      {error && <AlertaError mensaje={error} />}

      {cargando ? (
        <div className="flex justify-center py-16 text-sm text-gray-500 dark:text-hueso-500">
          Cargando documentos...
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <FichaDni
            anverso={dniAnverso}
            reverso={dniReverso}
            miniaturaAnverso={mini(dniAnverso)}
            miniaturaReverso={mini(dniReverso)}
            onSubir={(cara, archivo) => manejarSubida('DNI', cara, archivo)}
            onVer={verPrevia}
            onEliminar={manejarEliminar}
            guardando={guardando}
          />
          <FichaLicencia
            datos={licenciaDatos}
            guardandoDatos={guardandoLicencia}
            anverso={licAnverso}
            reverso={licReverso}
            miniaturaAnverso={mini(licAnverso)}
            miniaturaReverso={mini(licReverso)}
            onGuardar={manejarGuardarLicencia}
            onSubir={(cara, archivo) => manejarSubida('LICENCIA', cara, archivo)}
            onVer={verPrevia}
            onEliminar={manejarEliminar}
            guardando={guardando}
          />
        </div>
      )}

      {/* Modal de vista previa */}
      {previa && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setPrevia(null)}
        >
          <div
            className="relative my-4 w-full max-w-2xl rounded-3xl bg-white p-4 shadow-2xl dark:bg-antracita-800"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setPrevia(null)}
              aria-label="Cerrar"
              className="focus-dorado absolute right-3 top-3 rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 dark:text-hueso-300 dark:hover:bg-white/10"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
            <img
              src={`data:${previa.mime};base64,${previa.contenido_b64}`}
              alt={`${previa.tipo} (${previa.cara}) del conductor`}
              className="max-h-[70vh] rounded-xl object-contain"
            />
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------------
// FICHA DEL DNI (dos caras, sin datos previos)
// ----------------------------------------------------------------------------
interface FichaDniProps {
  anverso?: Documento;
  reverso?: Documento;
  miniaturaAnverso?: string;
  miniaturaReverso?: string;
  onSubir: (cara: CaraDocumento, archivo: File) => void;
  onVer: (documento: Documento) => void;
  onEliminar: (documento: Documento) => void;
  guardando: boolean;
}

function FichaDni({
  anverso,
  reverso,
  miniaturaAnverso,
  miniaturaReverso,
  onSubir,
  onVer,
  onEliminar,
  guardando,
}: FichaDniProps) {
  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-hueso-200">
        <IdCard className="h-4 w-4 text-dorado-600 dark:text-dorado-400" aria-hidden="true" />
        DNI
      </h2>

      <div className="space-y-4">
        <SlotCara
          etiqueta="Frente"
          documento={anverso}
          miniatura={miniaturaAnverso}
          onSubir={(archivo) => onSubir('ANVERSO', archivo)}
          onVer={onVer}
          onEliminar={onEliminar}
          guardando={guardando}
        />
        <SlotCara
          etiqueta="Reverso"
          documento={reverso}
          miniatura={miniaturaReverso}
          onSubir={(archivo) => onSubir('REVERSO', archivo)}
          onVer={onVer}
          onEliminar={onEliminar}
          guardando={guardando}
        />
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------------------
// FICHA DE LA LICENCIA (primero datos, luego las dos caras)
// ----------------------------------------------------------------------------
interface FichaLicenciaProps {
  datos: LicenciaDatos | null;
  guardandoDatos: boolean;
  anverso?: Documento;
  reverso?: Documento;
  miniaturaAnverso?: string;
  miniaturaReverso?: string;
  onGuardar: (numero: string, caducidad: string) => void;
  onSubir: (cara: CaraDocumento, archivo: File) => void;
  onVer: (documento: Documento) => void;
  onEliminar: (documento: Documento) => void;
  guardando: boolean;
}

function FichaLicencia({
  datos,
  guardandoDatos,
  anverso,
  reverso,
  miniaturaAnverso,
  miniaturaReverso,
  onGuardar,
  onSubir,
  onVer,
  onEliminar,
  guardando,
}: FichaLicenciaProps) {
  const [numero, setNumero] = useState(datos?.numero_documento ?? '');
  const [caducidad, setCaducidad] = useState(datos?.fecha_caducidad ?? '');

  // Sincroniza los campos cuando se guardan los datos.
  useEffect(() => {
    setNumero(datos?.numero_documento ?? '');
    setCaducidad(datos?.fecha_caducidad ?? '');
  }, [datos]);

  return (
    <Card>
      <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-hueso-200">
        <FileImage className="h-4 w-4 text-dorado-600 dark:text-dorado-400" aria-hidden="true" />
        Licencia de conducir
      </h2>

      {/* PASO 1: datos de la licencia */}
      <div className="space-y-3">
        <CampoFormulario
          id="numero-licencia"
          etiqueta="Número de licencia"
          valor={numero}
          onChange={setNumero}
          placeholder="Ej: Q12345678"
          className="text-base"
        />
        <CampoFormulario
          id="caducidad-licencia"
          etiqueta="Fecha de caducidad"
          tipo="date"
          valor={caducidad}
          onChange={setCaducidad}
          className="text-base"
        />
        <Button
          onClick={() => onGuardar(numero, caducidad)}
          iconoIzq={Save}
          cargando={guardandoDatos}
          textoCargando="Guardando..."
          className="w-full"
        >
          Guardar datos
        </Button>
      </div>

      {/* PASO 2: fotos (solo si ya hay datos guardados) */}
      {datos ? (
        <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-white/10">
          <SlotCara
            etiqueta="Frente"
            documento={anverso}
            miniatura={miniaturaAnverso}
            onSubir={(archivo) => onSubir('ANVERSO', archivo)}
            onVer={onVer}
            onEliminar={onEliminar}
            guardando={guardando}
          />
          <SlotCara
            etiqueta="Reverso"
            documento={reverso}
            miniatura={miniaturaReverso}
            onSubir={(archivo) => onSubir('REVERSO', archivo)}
            onVer={onVer}
            onEliminar={onEliminar}
            guardando={guardando}
          />
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-white/5 dark:text-hueso-400">
          <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
          Guarda primero el número y la fecha de caducidad para poder subir las
          fotos de la licencia.
        </div>
      )}
    </Card>
  );
}

// ----------------------------------------------------------------------------
// SLOT DE UNA CARA (frente o reverso): subida + miniatura + reemplazar/eliminar
// ----------------------------------------------------------------------------
interface SlotProps {
  etiqueta: string;
  documento?: Documento;
  miniatura?: string;
  onSubir: (archivo: File) => void;
  onVer: (documento: Documento) => void;
  onEliminar: (documento: Documento) => void;
  guardando: boolean;
}

function SlotCara({
  etiqueta,
  documento,
  miniatura,
  onSubir,
  onVer,
  onEliminar,
  guardando,
}: SlotProps) {
  const [archivo, setArchivo] = useState<File | null>(null);

  const manejarClic = () => {
    if (!archivo) return;
    onSubir(archivo);
  };

  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-white/10">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-hueso-400">
        {etiqueta}
      </p>

      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={(e) => setArchivo(e.target.files?.[0] ?? null)}
        className="block w-full text-xs text-gray-500 file:mr-3 file:rounded-lg file:border-0 file:bg-dorado-500/10 file:px-3 file:py-2 file:text-xs file:font-semibold file:text-dorado-600 dark:text-hueso-400 dark:file:text-dorado-400"
      />
      {archivo && (
        <p className="mt-1 truncate text-xs text-dorado-600 dark:text-dorado-400">
          Seleccionado: {archivo.name}
        </p>
      )}

      {documento ? (
        <div className="mt-3 space-y-2">
          <button
            type="button"
            onClick={() => onVer(documento)}
            className="focus-dorado block w-full rounded-xl border border-gray-200 p-2 transition hover:border-dorado-400/40 dark:border-white/10"
            title="Ver imagen"
          >
            {miniatura ? (
              <img
                src={miniatura}
                alt={`${etiqueta} del documento`}
                className="mx-auto h-40 w-full rounded-lg object-contain"
              />
            ) : (
              <FileImage className="mx-auto h-16 w-16 text-gray-300 dark:text-hueso-600" aria-hidden="true" />
            )}
            <span className="mt-2 block truncate text-xs text-gray-500 dark:text-hueso-500">
              {documento.nombre_archivo}
            </span>
          </button>

          <div className="flex justify-end gap-2">
            <Button
              variante="ghost"
              tamano="sm"
              onClick={() => onEliminar(documento)}
            >
              <Trash2 className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
              Eliminar
            </Button>
            <Button
              tamano="sm"
              disabled={!archivo}
              onClick={manejarClic}
              cargando={guardando}
              textoCargando="Subiendo..."
            >
              Reemplazar
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3">
          <Button
            onClick={manejarClic}
            iconoIzq={Upload}
            disabled={!archivo}
            cargando={guardando}
            textoCargando="Subiendo..."
            className="w-full"
          >
            Subir {etiqueta}
          </Button>
        </div>
      )}
    </div>
  );
}