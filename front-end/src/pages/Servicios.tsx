// ============================================================================
// PAGINA: HISTORIAL DE SERVICIOS (OPERADORA / ADMIN)
// ----------------------------------------------------------------------------
// Lista los servicios ejecutados con conductor, pasajeros y horas.
// ============================================================================

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import Card from '../components/ui/Card';
import AlertaError from '../components/ui/AlertaError';
import Loader from '../components/Loader';
import { listarServicios } from '../services/servicios.service';
import type { ServicioHistorial } from '../types';

function formatearFecha(iso: string | null): string {
  if (!iso) return '—';
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

const COLOR_ESTADO: Record<string, string> = {
  EN_CURSO: 'bg-dorado-500/10 text-dorado-600 dark:text-dorado-400',
  COMPLETADA: 'bg-esmeralda-500/10 text-esmeralda-500',
  CANCELADA: 'bg-coral-500/10 text-coral-500',
};

export default function Servicios() {
  const [servicios, setServicios] = useState<ServicioHistorial[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setServicios(await listarServicios({ q: busqueda, estado: filtroEstado }));
    } catch {
      setError('No se pudieron cargar los servicios.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroEstado]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
          Historial de servicios
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
          Servicios ejecutados con sus pasajeros y horas.
        </p>
      </div>

      {error && <AlertaError mensaje={error} />}

      <Card className="!p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_180px]">
          <div className="relative">
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hueso-500"
              aria-hidden="true"
            />
            <input
              type="search"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por pasajero, origen o destino..."
              aria-label="Buscar servicios"
              className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 dark:placeholder:text-hueso-500"
            />
          </div>
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            aria-label="Filtrar por estado"
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-800 outline-none focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
          >
            <option value="">Todos los estados</option>
            <option value="EN_CURSO">En curso</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </Card>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader mensaje="Cargando servicios..." />
        </div>
      ) : servicios.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-hueso-500">
            No hay servicios registrados todavia.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {servicios.map((servicio) => (
            <Card key={servicio.id} className="!p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-800 dark:text-hueso-100">
                      Servicio #{servicio.id}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[servicio.estado] ?? ''}`}
                    >
                      {servicio.estado}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500 dark:text-hueso-500">
                    Conductor: {servicio.conductor ?? '—'}
                  </p>
                  <p className="mt-1 text-xs text-gray-600 dark:text-hueso-300">
                    Pasajeros: {servicio.pasajeros.join(', ') || '—'}
                  </p>
                </div>
                <div className="shrink-0 text-right text-xs text-gray-500 dark:text-hueso-500">
                  <p>Recogida: {formatearFecha(servicio.hora_recogida)}</p>
                  <p>Finalizado: {formatearFecha(servicio.hora_finalizado)}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}