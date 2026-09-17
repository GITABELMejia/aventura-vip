// ============================================================================
// PAGINA: RESERVAS (LISTADO Y GESTION)
// ----------------------------------------------------------------------------
// La operadora ve todas las reservas, crea y despacha (asigna conductor). El
// coordinador ve solo las suyas. Filtro por estado y busqueda.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Check,
  Plus,
  Search,
  Send,
  XCircle,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import Loader from '../components/Loader';
import {
  aceptarReserva,
  cambiarEstadoReserva,
  despacharReserva,
  listarReservas,
} from '../services/reservas.service';
import { listarUsuarios } from '../services/usuarios.service';
import { usePermisos } from '../hooks/usePermisos';
import type { Reserva, UsuarioGestion } from '../types';

const COLOR_ESTADO: Record<string, string> = {
  PENDIENTE: 'bg-gray-400/10 text-gray-500 dark:text-hueso-400',
  ACEPTADA: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
  DESPACHADA: 'bg-institucional-500/10 text-institucional-500',
  EN_CURSO: 'bg-dorado-500/10 text-dorado-600 dark:text-dorado-400',
  COMPLETADA: 'bg-esmeralda-500/10 text-esmeralda-500',
  CANCELADA: 'bg-coral-500/10 text-coral-500',
};

function formatearFecha(iso: string): string {
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

export default function Reservas() {
  const navigate = useNavigate();
  const { tienePermiso } = usePermisos();

  const puedeCrear = tienePermiso('CREAR_RESERVAS');
  const puedeDespachar = tienePermiso('DESPACHAR_COLA');

  const [reservas, setReservas] = useState<Reserva[]>([]);
  const [conductores, setConductores] = useState<UsuarioGestion[]>([]);
  const [conductorSel, setConductorSel] = useState<Record<number, string>>({});

  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operandoId, setOperandoId] = useState<number | null>(null);

  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [lista] = await Promise.all([
        listarReservas({ q: busqueda, estado: filtroEstado }),
        puedeDespachar
          ? listarUsuarios({ rol: 'CONDUCTOR' }).then(setConductores)
          : Promise.resolve(undefined),
      ]);
      setReservas(lista);
    } catch {
      setError('No se pudieron cargar las reservas.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [puedeDespachar]);

  useEffect(() => {
    const t = setTimeout(cargar, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [busqueda, filtroEstado]);

  async function manejarDespachar(reserva: Reserva) {
    const conductorId = Number(conductorSel[reserva.id]);
    if (!conductorId) {
      setError('Selecciona un conductor para despachar.');
      return;
    }
    setOperandoId(reserva.id);
    setError('');
    try {
      await despacharReserva(reserva.id, { conductor_id: conductorId });
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo despachar la reserva.'
      );
    } finally {
      setOperandoId(null);
    }
  }

  async function manejarAceptar(reserva: Reserva) {
    setOperandoId(reserva.id);
    setError('');
    try {
      await aceptarReserva(reserva.id);
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo aceptar la reserva.'
      );
    } finally {
      setOperandoId(null);
    }
  }

  async function manejarCancelar(reserva: Reserva) {
    setOperandoId(reserva.id);
    setError('');
    try {
      await cambiarEstadoReserva(reserva.id, { estado: 'CANCELADA' });
      await cargar();
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo cancelar la reserva.'
      );
    } finally {
      setOperandoId(null);
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
            Reservas
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
            Viajes recibidos por llamada. Despacha asignando un conductor.
          </p>
        </div>
        {puedeCrear && (
          <Button onClick={() => navigate('/reservas/nuevo')} tono="dorado" iconoIzq={Plus}>
            Nueva reserva
          </Button>
        )}
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
              placeholder="Buscar por pasajero, telefono, origen o destino..."
              aria-label="Buscar reservas"
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
            <option value="PENDIENTE">Pendiente</option>
            <option value="ACEPTADA">Aceptada</option>
            <option value="DESPACHADA">Despachada</option>
            <option value="EN_CURSO">En curso</option>
            <option value="COMPLETADA">Completada</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>
      </Card>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader mensaje="Cargando reservas..." />
        </div>
      ) : reservas.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-hueso-500">
            No hay reservas que coincidan con la busqueda.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservas.map((reserva) => (
            <Card key={reserva.id} className="!p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-gray-800 dark:text-hueso-100">
                      {reserva.pasajero_nombre}
                    </p>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${COLOR_ESTADO[reserva.estado] ?? ''}`}
                    >
                      {reserva.estado}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-hueso-300">
                    {reserva.origen} → {reserva.destino}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-hueso-500">
                    {formatearFecha(reserva.fecha_hora)} · {reserva.num_pasajeros} pasajero(s)
                    {reserva.pasajero_telefono ? ` · ${reserva.pasajero_telefono}` : ''}
                  </p>
                  {reserva.conductor && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-hueso-500">
                      Conductor: <strong>{reserva.conductor}</strong>
                    </p>
                  )}
                  {reserva.codigo_secreto && (
                    <p className="mt-1 text-xs text-dorado-600 dark:text-dorado-400">
                      Código: {reserva.codigo_secreto}
                    </p>
                  )}
                </div>

                {puedeDespachar && (
                  <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                    {reserva.estado === 'PENDIENTE' && (
                      <Button
                        tamano="sm"
                        disabled={operandoId === reserva.id}
                        onClick={() => manejarAceptar(reserva)}
                        iconoIzq={Check}
                      >
                        Aceptar
                      </Button>
                    )}

                    {reserva.estado === 'ACEPTADA' && (
                      <>
                        <select
                          value={conductorSel[reserva.id] ?? ''}
                          onChange={(e) =>
                            setConductorSel((s) => ({ ...s, [reserva.id]: e.target.value }))
                          }
                          aria-label="Conductor"
                          className="rounded-xl border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800 outline-none focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100"
                        >
                          <option value="">Conductor...</option>
                          {conductores.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.nombres} {c.apellidos}
                            </option>
                          ))}
                        </select>
                        <Button
                          tamano="sm"
                          disabled={operandoId === reserva.id}
                          onClick={() => manejarDespachar(reserva)}
                          iconoIzq={Send}
                        >
                          Asignar
                        </Button>
                      </>
                    )}

                    {(reserva.estado === 'PENDIENTE' ||
                      reserva.estado === 'ACEPTADA' ||
                      reserva.estado === 'DESPACHADA') && (
                      <Button
                        variante="ghost"
                        tamano="sm"
                        disabled={operandoId === reserva.id}
                        onClick={() => manejarCancelar(reserva)}
                      >
                        <XCircle className="mr-1 h-3.5 w-3.5" aria-hidden="true" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}