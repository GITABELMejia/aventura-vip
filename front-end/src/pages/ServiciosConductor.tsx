// ============================================================================
// PAGINA: SERVICIOS (CONDUCTOR)
// ----------------------------------------------------------------------------
// Muestra los servicios del conductor. En un servicio EN_CURSO puede agregar
// mas reservas (pasajeros) y al terminar lo finaliza. Los COMPLETADOS muestran
// las horas de recogida y finalizado.
// ============================================================================

import { useEffect, useState } from 'react';
import { CheckCircle2, Plus, Search, UserRound } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import Loader from '../components/Loader';
import {
  agregarReserva,
  agregarReservaDirecto,
  finalizarServicio,
  listarReservasDisponibles,
  listarReservasPool,
  listarServiciosConductor,
} from '../services/servicios.service';
import type { ReservaDisponible, ServicioConductor } from '../types';

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

export default function ServiciosConductor() {
  const [servicios, setServicios] = useState<ServicioConductor[]>([]);
  const [disponibles, setDisponibles] = useState<ReservaDisponible[]>([]);
  const [pool, setPool] = useState<ReservaDisponible[]>([]);
  const [agregarSel, setAgregarSel] = useState<Record<number, string>>({});
  const [busquedaAgregar, setBusquedaAgregar] = useState<Record<number, string>>({});
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operandoId, setOperandoId] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [servs, dispos, poolRes] = await Promise.all([
        listarServiciosConductor(),
        listarReservasDisponibles(),
        listarReservasPool(),
      ]);
      setServicios(servs);
      setDisponibles(dispos);
      setPool(poolRes);
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

  // Reservas que se pueden agregar a un servicio en curso: las despachadas
  // (asignadas) + las del pool (sin asignar, desde los puntos configurados).
  const reservasParaAgregar: ReservaDisponible[] = [...disponibles, ...pool];

  async function manejarAgregar(servicio: ServicioConductor) {
    const reservaId = Number(agregarSel[servicio.id]);
    if (!reservaId) {
      setError('Selecciona una reserva para agregar.');
      return;
    }
    const reserva = reservasParaAgregar.find((r) => r.id === reservaId);
    setOperandoId(servicio.id);
    setError('');
    try {
      if (reserva && reserva.estado === 'DESPACHADA') {
        await agregarReserva(servicio.id, reservaId);
      } else {
        await agregarReservaDirecto(servicio.id, reservaId);
      }
      setAgregarSel((s) => ({ ...s, [servicio.id]: '' }));
      setBusquedaAgregar((s) => ({ ...s, [servicio.id]: '' }));
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo agregar la reserva.'
      );
    } finally {
      setOperandoId(null);
    }
  }

  function filtradas(servicioId: number): ReservaDisponible[] {
    const q = (busquedaAgregar[servicioId] ?? '').trim().toLowerCase();
    if (!q) return reservasParaAgregar;
    return reservasParaAgregar.filter(
      (r) =>
        r.pasajero_nombre.toLowerCase().includes(q) ||
        (r.pasajero_telefono ?? '').toLowerCase().includes(q) ||
        (r.pasajero_dni ?? '').toLowerCase().includes(q) ||
        (r.pasajero_correo ?? '').toLowerCase().includes(q)
    );
  }

  async function manejarFinalizar(servicio: ServicioConductor) {
    setOperandoId(servicio.id);
    setError('');
    try {
      await finalizarServicio(servicio.id);
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo finalizar el servicio.'
      );
    } finally {
      setOperandoId(null);
    }
  }

  const enCurso = servicios.filter((s) => s.estado === 'EN_CURSO');
  const completados = servicios.filter((s) => s.estado !== 'EN_CURSO');

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
          Servicios
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
          Agrega pasajeros a un servicio en curso y finalízalo al terminar.
        </p>
      </div>

      {error && <AlertaError mensaje={error} />}

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader mensaje="Cargando servicios..." />
        </div>
      ) : servicios.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-hueso-500">
            No tienes servicios todavía. Recoge a un pasajero desde "Reservas asignadas".
          </p>
        </Card>
      ) : (
        <div className="space-y-6">
          {enCurso.map((servicio) => (
            <Card key={servicio.id} className="!p-5">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-hueso-200">
                  Servicio en curso
                </h2>
                <span className="rounded-full bg-dorado-500/10 px-2.5 py-0.5 text-xs font-medium text-dorado-600 dark:text-dorado-400">
                  Recogida: {formatearFecha(servicio.hora_recogida)}
                </span>
              </div>

              <div className="mt-3 space-y-2">
                {servicio.pasajeros.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-white/10"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800 dark:text-hueso-100">
                        {p.pasajero_nombre}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-hueso-500">
                        {p.origen} → {p.destino}
                      </p>
                    </div>
                    <span className="text-xs text-dorado-600 dark:text-dorado-400">
                      {p.codigo_secreto}
                    </span>
                  </div>
                ))}
              </div>

              <div className="mt-4 flex flex-wrap items-start gap-2">
                <div className="relative w-full min-w-0 sm:w-auto sm:min-w-[240px] sm:flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-hueso-500"
                    aria-hidden="true"
                  />
                  <input
                    type="text"
                    value={busquedaAgregar[servicio.id] ?? ''}
                    onChange={(e) => {
                      setBusquedaAgregar((s) => ({ ...s, [servicio.id]: e.target.value }));
                      setAgregarSel((s) => ({ ...s, [servicio.id]: '' }));
                    }}
                    placeholder="Buscar por nombre, correo o DNI..."
                    autoComplete="off"
                    className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm text-gray-800 outline-none transition focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 dark:placeholder:text-hueso-500"
                  />

                  {filtradas(servicio.id).length > 0 && (
                    <ul className="absolute z-20 mt-1 max-h-52 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-antracita-800">
                      {filtradas(servicio.id).map((r) => (
                        <li key={r.id}>
                          <button
                            type="button"
                            onMouseDown={() => {
                              setAgregarSel((s) => ({ ...s, [servicio.id]: String(r.id) }));
                              setBusquedaAgregar((s) => ({
                                ...s,
                                [servicio.id]: r.pasajero_nombre,
                              }));
                            }}
                            className={`flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition hover:bg-dorado-500/10 dark:text-hueso-100 ${
                              agregarSel[servicio.id] === String(r.id)
                                ? 'bg-dorado-500/15 text-dorado-600 dark:text-dorado-400'
                                : 'text-gray-800'
                            }`}
                          >
                            <UserRound className="h-4 w-4 shrink-0 text-dorado-500" aria-hidden="true" />
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{r.pasajero_nombre}</span>
                              <span className="block truncate text-xs text-gray-500 dark:text-hueso-500">
                                {r.pasajero_dni ? `DNI ${r.pasajero_dni} · ` : ''}
                                {r.origen} → {r.destino}
                              </span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <Button
                  tamano="sm"
                  variante="outline"
                  disabled={operandoId === servicio.id}
                  onClick={() => manejarAgregar(servicio)}
                  iconoIzq={Plus}
                >
                  Agregar
                </Button>
                <div className="ml-auto">
                  <Button
                    tamano="sm"
                    disabled={operandoId === servicio.id}
                    onClick={() => manejarFinalizar(servicio)}
                    iconoIzq={CheckCircle2}
                  >
                    Finalizar
                  </Button>
                </div>
              </div>
            </Card>
          ))}

          {completados.map((servicio) => (
            <Card key={servicio.id} className="!p-5 opacity-80">
              <div className="flex items-center justify-between gap-3">
                <h2 className="text-sm font-semibold text-gray-700 dark:text-hueso-200">
                  {servicio.estado === 'COMPLETADA' ? 'Completado' : servicio.estado}
                </h2>
                <span className="rounded-full bg-esmeralda-500/10 px-2.5 py-0.5 text-xs font-medium text-esmeralda-500">
                  {formatearFecha(servicio.hora_recogida)} → {formatearFecha(servicio.hora_finalizado)}
                </span>
              </div>
              <div className="mt-3 space-y-1">
                {servicio.pasajeros.map((p) => (
                  <p key={p.id} className="text-sm text-gray-600 dark:text-hueso-300">
                    {p.pasajero_nombre} · {p.origen} → {p.destino}
                  </p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}