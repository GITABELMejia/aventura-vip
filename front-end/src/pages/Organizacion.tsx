// ============================================================================
// PAGINA: ORGANIZACION (CATALOGOS DE NEGOCIO)
// ----------------------------------------------------------------------------
// Gestiona las EMPRESAS, sus PROPIEDADES (hoteles, trenes, barcos...) y los
// GRUPOS de cada propiedad. El admin puede agregar todo desde esta interfaz.
// Solo ADMIN (permiso GESTIONAR_CATALOGOS).
// ============================================================================

import { useEffect, useState } from 'react';
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  Store,
  UserRound,
  X,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import CampoFormulario from '../components/CampoFormulario';
import {
  cambiarEstadoArea,
  cambiarEstadoEmpresa,
  cambiarEstadoEstablecimiento,
  guardarArea,
  guardarEmpresa,
  guardarEstablecimiento,
  listarAreasAdmin,
  listarEmpresasAdmin,
  listarEstablecimientosAdmin,
} from '../services/organizacion.service';
import type {
  AreaAdmin,
  EmpresaAdmin,
  EstablecimientoAdmin,
} from '../types';

type Pestana = 'empresas' | 'establecimientos' | 'areas';

const PESTANAS: { id: Pestana; titulo: string; icono: typeof Building2 }[] = [
  { id: 'empresas', titulo: 'Empresas', icono: Building2 },
  { id: 'establecimientos', titulo: 'Propiedades', icono: Store },
  { id: 'areas', titulo: 'Grupos', icono: MapPin },
];

export default function Organizacion() {
  const [pestana, setPestana] = useState<Pestana>('empresas');
  const [empresas, setEmpresas] = useState<EmpresaAdmin[]>([]);
  const [establecimientos, setEstablecimientos] = useState<EstablecimientoAdmin[]>([]);
  const [areas, setAreas] = useState<AreaAdmin[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Estado del formulario emergente.
  const [formAbierto, setFormAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [empresaId, setEmpresaId] = useState('');
  const [establecimientoId, setEstablecimientoId] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [operandoId, setOperandoId] = useState<number | null>(null);

  async function cargarTodo() {
    setCargando(true);
    setError('');
    try {
      const [emp, est, ar] = await Promise.all([
        listarEmpresasAdmin(),
        listarEstablecimientosAdmin(),
        listarAreasAdmin(),
      ]);
      setEmpresas(emp);
      setEstablecimientos(est);
      setAreas(ar);
    } catch {
      setError('No se pudieron cargar los datos de la organizacion.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  // --------------------------------------------------------------------------
  // FORMULARIO (alta / edicion segun la pestana activa)
  // --------------------------------------------------------------------------
  function abrirNuevo() {
    setEditandoId(null);
    setNombre('');
    setDescripcion('');
    setEmpresaId('');
    setEstablecimientoId('');
    setFormAbierto(true);
  }

  function abrirEdicion(registro: EmpresaAdmin | EstablecimientoAdmin | AreaAdmin) {
    setEditandoId(registro.id);
    setNombre(registro.nombre);
    setDescripcion(
      'descripcion' in registro && registro.descripcion ? registro.descripcion : ''
    );
    setEmpresaId(
      'empresa_id' in registro && registro.empresa_id
        ? String(registro.empresa_id)
        : ''
    );
    setEstablecimientoId(
      'establecimiento_id' in registro && registro.establecimiento_id
        ? String(registro.establecimiento_id)
        : ''
    );
    setFormAbierto(true);
  }

  async function guardar() {
    if (!nombre.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    if (
      (pestana === 'establecimientos' && !empresaId) ||
      (pestana === 'areas' && !establecimientoId)
    ) {
      setError('Selecciona el nivel superior correspondiente.');
      return;
    }

    setGuardando(true);
    setError('');
    try {
      if (pestana === 'empresas') {
        await guardarEmpresa({ id: editandoId ?? undefined, nombre: nombre.trim() });
      } else if (pestana === 'establecimientos') {
        await guardarEstablecimiento({
          id: editandoId ?? undefined,
          empresa_id: Number(empresaId),
          nombre: nombre.trim(),
          descripcion: descripcion || undefined,
        });
      } else {
        await guardarArea({
          id: editandoId ?? undefined,
          establecimiento_id: Number(establecimientoId),
          nombre: nombre.trim(),
          descripcion: descripcion || undefined,
        });
      }
      setFormAbierto(false);
      await cargarTodo();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo guardar.'
      );
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEstado(id: number, activo: boolean) {
    setOperandoId(id);
    setError('');
    const estado = activo ? 'INACTIVO' : 'ACTIVO';
    try {
      if (pestana === 'empresas') await cambiarEstadoEmpresa(id, estado);
      else if (pestana === 'establecimientos')
        await cambiarEstadoEstablecimiento(id, estado);
      else await cambiarEstadoArea(id, estado);
      await cargarTodo();
    } catch {
      setError('No se pudo cambiar el estado.');
    } finally {
      setOperandoId(null);
    }
  }

  // --------------------------------------------------------------------------
  // TABLAS
  // --------------------------------------------------------------------------
  function filasEmpresas() {
    return empresas.map((empresa) => (
      <tr key={empresa.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
        <td className="px-5 py-3">
          <p className="font-medium text-gray-800 dark:text-hueso-100">{empresa.nombre}</p>
          {empresa.direccion && (
            <p className="text-xs text-gray-500 dark:text-hueso-500">{empresa.direccion}</p>
          )}
        </td>
        <td className="hidden px-5 py-3 text-gray-600 dark:text-hueso-300 md:table-cell">{empresa.ruc ?? '—'}</td>
        <td className="hidden px-5 py-3 text-gray-600 dark:text-hueso-300 md:table-cell">{empresa.telefono ?? '—'}</td>
        <td className="px-5 py-3">
          <span className="rounded-full bg-dorado-500/10 px-2.5 py-1 text-xs font-medium text-dorado-600 dark:text-dorado-400">
            {empresa.establecimientos} propiedades
          </span>
        </td>
        {acciones(empresa)}
      </tr>
    ));
  }

  function filasEstablecimientos() {
    return establecimientos.map((establecimiento) => (
      <tr key={establecimiento.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
        <td className="px-5 py-3">
          <p className="font-medium text-gray-800 dark:text-hueso-100">{establecimiento.nombre}</p>
          {establecimiento.descripcion && (
            <p className="text-xs text-gray-500 dark:text-hueso-500">{establecimiento.descripcion}</p>
          )}
        </td>
        <td className="hidden px-5 py-3 text-gray-600 dark:text-hueso-300 md:table-cell">{establecimiento.empresa}</td>
        <td className="px-5 py-3">
          <span className="rounded-full bg-dorado-500/10 px-2.5 py-1 text-xs font-medium text-dorado-600 dark:text-dorado-400">
            {establecimiento.areas} grupos
          </span>
        </td>
        {acciones(establecimiento)}
      </tr>
    ));
  }

  function filasAreas() {
    return areas.map((area) => (
      <tr key={area.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 dark:border-white/5 dark:hover:bg-white/[0.03]">
        <td className="px-5 py-3">
          <p className="font-medium text-gray-800 dark:text-hueso-100">{area.nombre}</p>
          {area.descripcion && (
            <p className="text-xs text-gray-500 dark:text-hueso-500">{area.descripcion}</p>
          )}
        </td>
        <td className="hidden px-5 py-3 text-gray-600 dark:text-hueso-300 md:table-cell">{area.establecimiento}</td>
        <td className="hidden px-5 py-3 text-gray-600 dark:text-hueso-300 md:table-cell">{area.empresa}</td>
        {acciones(area)}
      </tr>
    ));
  }

  function acciones(registro: EmpresaAdmin | EstablecimientoAdmin | AreaAdmin) {
    const activo = registro.estado === 'ACTIVO';
    return (
      <td className="px-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <span
            className={`mr-2 rounded-full px-2.5 py-1 text-xs font-medium ${
              activo
                ? 'bg-esmeralda-500/10 text-esmeralda-500'
                : 'bg-coral-500/10 text-coral-500'
            }`}
          >
            {registro.estado}
          </span>
          <button
            type="button"
            onClick={() => abrirEdicion(registro)}
            aria-label={`Editar ${registro.nombre}`}
            title="Editar"
            className="focus-dorado rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-dorado-600 dark:text-hueso-500 dark:hover:bg-white/5"
          >
            <Pencil className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={() => manejarEstado(registro.id, activo)}
            disabled={operandoId === registro.id}
            aria-label={activo ? `Inactivar ${registro.nombre}` : `Activar ${registro.nombre}`}
            title={activo ? 'Inactivar' : 'Activar'}
            className="focus-dorado rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-coral-500 disabled:opacity-50 dark:text-hueso-500 dark:hover:bg-white/5"
          >
            <UserRound className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </td>
    );
  }

  const PestanaIcono = PESTANAS.find((p) => p.id === pestana)?.icono ?? Building2;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
            Organizacion
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
            Empresas, sus propiedades (hoteles, trenes, barcos...) y sus grupos.
          </p>
        </div>
        <Button onClick={abrirNuevo} tono="dorado" iconoIzq={Plus}>
          {pestana === 'empresas'
            ? 'Nueva empresa'
            : pestana === 'establecimientos'
              ? 'Nueva propiedad'
              : 'Nuevo grupo'}
        </Button>
      </div>

      {error && <AlertaError mensaje={error} />}

      {/* Pestanas */}
      <div className="flex gap-2" role="tablist" aria-label="Secciones de organizacion">
        {PESTANAS.map(({ id, titulo, icono: Icono }) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={pestana === id}
            onClick={() => {
              setPestana(id);
              setFormAbierto(false);
            }}
            className={`flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors focus-dorado ${
              pestana === id
                ? 'bg-dorado-500/10 text-dorado-600 dark:text-dorado-400'
                : 'text-gray-500 hover:bg-white/5 dark:text-hueso-500'
            }`}
          >
            <Icono className="h-4 w-4" aria-hidden="true" />
            {titulo}
          </button>
        ))}
      </div>

      {cargando ? (
        <div className="flex justify-center py-16 text-sm text-gray-500 dark:text-hueso-500">
          Cargando...
        </div>
      ) : (
        <Card className="!p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500 dark:border-white/10 dark:text-hueso-500">
                  <th className="px-5 py-3 font-semibold">
                    {pestana === 'empresas'
                      ? 'Empresa'
                      : pestana === 'establecimientos'
                        ? 'Propiedad'
                        : 'Grupo'}
                  </th>
                  {pestana === 'empresas' && (
                    <>
                      <th className="hidden px-5 py-3 font-semibold md:table-cell">RUC</th>
                      <th className="hidden px-5 py-3 font-semibold md:table-cell">Telefono</th>
                    </>
                  )}
                  {pestana === 'establecimientos' && (
                    <th className="hidden px-5 py-3 font-semibold md:table-cell">Empresa</th>
                  )}
                  {pestana === 'areas' && (
                    <>
                      <th className="hidden px-5 py-3 font-semibold md:table-cell">Propiedad</th>
                      <th className="hidden px-5 py-3 font-semibold md:table-cell">Empresa</th>
                    </>
                  )}
                  {pestana !== 'areas' && (
                    <th className="px-5 py-3 font-semibold">Detalle</th>
                  )}
                  <th className="px-5 py-3 text-right font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {pestana === 'empresas' && filasEmpresas()}
                {pestana === 'establecimientos' && filasEstablecimientos()}
                {pestana === 'areas' && filasAreas()}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Formulario emergente */}
      {formAbierto && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setFormAbierto(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Formulario de organizacion"
            className="my-4 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-antracita-800"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-lg font-bold text-gray-800 dark:text-hueso-100">
                <PestanaIcono className="h-5 w-5 text-dorado-500" aria-hidden="true" />
                {editandoId
                  ? `Editar ${pestana === 'empresas' ? 'empresa' : pestana === 'establecimientos' ? 'propiedad' : 'grupo'}`
                  : `Nuevo ${pestana === 'empresas' ? 'empresa' : pestana === 'establecimientos' ? 'propiedad' : 'grupo'}`}
              </h2>
              <button
                type="button"
                onClick={() => setFormAbierto(false)}
                aria-label="Cerrar"
                className="focus-dorado rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:text-hueso-500 dark:hover:bg-white/5"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="space-y-4">
              {pestana === 'establecimientos' && (
                <div>
                  <label htmlFor="empresa-sel" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200">
                    Empresa <span className="text-dorado-500">*</span>
                  </label>
                  <select
                    id="empresa-sel"
                    value={empresaId}
                    onChange={(e) => setEmpresaId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 outline-none focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
                  >
                    <option value="">Selecciona una empresa</option>
                    {empresas.map((empresa) => (
                      <option key={empresa.id} value={empresa.id}>
                        {empresa.nombre}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {pestana === 'areas' && (
                <div>
                  <label htmlFor="establecimiento-sel" className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200">
                    Propiedad <span className="text-dorado-500">*</span>
                  </label>
                  <select
                    id="establecimiento-sel"
                    value={establecimientoId}
                    onChange={(e) => setEstablecimientoId(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 bg-white px-3 py-3 text-base text-gray-800 outline-none focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
                  >
                    <option value="">Selecciona una propiedad</option>
                    {establecimientos.map((establecimiento) => (
                      <option key={establecimiento.id} value={establecimiento.id}>
                        {establecimiento.nombre} ({establecimiento.empresa})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <CampoFormulario
                id="nombre-org"
                etiqueta={
                  pestana === 'empresas'
                    ? 'Nombre de la empresa'
                    : pestana === 'establecimientos'
                      ? 'Nombre de la propiedad'
                      : 'Nombre del grupo'
                }
                valor={nombre}
                onChange={setNombre}
                placeholder={
                  pestana === 'empresas'
                    ? 'Ej: Belmond'
                    : pestana === 'establecimientos'
                      ? 'Ej: Hotel Monasterio'
                      : 'Ej: Cocina'
                }
                required
                className="text-base"
              />

              <CampoFormulario
                id="descripcion-org"
                etiqueta="Descripcion (opcional)"
                valor={descripcion}
                onChange={setDescripcion}
                placeholder="Breve descripcion"
                className="text-base"
              />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variante="ghost"
                  onClick={() => setFormAbierto(false)}
                >
                  Cancelar
                </Button>
                <Button
                  type="button"
                  tono="dorado"
                  cargando={guardando}
                  textoCargando="Guardando..."
                  onClick={guardar}
                >
                  Guardar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
