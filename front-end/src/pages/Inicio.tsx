// ============================================================================
// PAGINA: INICIO (PANEL DE CONTROL)
// ----------------------------------------------------------------------------
// Vista principal. Para el CONDUCTOR muestra, además de los KPIs, sus reservas
// asignadas (puede crear servicio) y el pool de reservas sin asignar desde los
// puntos configurados por el admin.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2,
  CalendarCheck,
  CalendarPlus,
  Car,
  KeyRound,
  MapPin,
  PlayCircle,
  Search,
  ShieldCheck,
  Users,
} from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import { leerUsuario } from '../services/auth.service';
import {
  iniciarServicio,
  iniciarServicioDirecto,
  listarReservasDisponibles,
  listarReservasPool,
} from '../services/servicios.service';
import { usePermisos } from '../hooks/usePermisos';
import type { ReservaDisponible } from '../types';

function formatearFecha(iso: string): string {
  const fecha = new Date(iso);
  if (Number.isNaN(fecha.getTime())) return iso;
  return fecha.toLocaleString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PanelConductor() {
  const navigate = useNavigate();
  const [asignadas, setAsignadas] = useState<ReservaDisponible[]>([]);
  const [pool, setPool] = useState<ReservaDisponible[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operandoId, setOperandoId] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      const [a, p] = await Promise.all([listarReservasDisponibles(), listarReservasPool()]);
      setAsignadas(a);
      setPool(p);
    } catch {
      setError('No se pudieron cargar tus reservas.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function crearServicio(id: number, directo: boolean) {
    setOperandoId(id);
    setError('');
    try {
      if (directo) {
        await iniciarServicioDirecto(id);
      } else {
        await iniciarServicio(id);
      }
      navigate('/servicios');
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo crear el servicio.'
      );
      setOperandoId(null);
    }
  }

  const q = busqueda.trim().toLowerCase();
  const poolFiltrado = q
    ? pool.filter(
        (r) =>
          r.pasajero_nombre.toLowerCase().includes(q) ||
          (r.pasajero_dni ?? '').toLowerCase().includes(q) ||
          (r.pasajero_correo ?? '').toLowerCase().includes(q)
      )
    : pool;

  return (
    <>
      {error && <AlertaError mensaje={error} />}

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-hueso-200">
          <Car className="h-4 w-4 text-dorado-600 dark:text-dorado-400" aria-hidden="true" />
          Mis reservas asignadas
        </h2>
        {cargando ? (
          <p className="py-4 text-sm text-gray-500 dark:text-hueso-500">Cargando...</p>
        ) : asignadas.length === 0 ? (
          <p className="py-4 text-sm text-gray-500 dark:text-hueso-500">
            No tienes reservas asignadas pendientes.
          </p>
        ) : (
          <div className="space-y-2">
            {asignadas.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-hueso-100">
                    {r.pasajero_nombre} · {r.origen} → {r.destino}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-hueso-500">
                    {formatearFecha(r.fecha_hora)}
                  </p>
                </div>
                <Button
                  tamano="sm"
                  disabled={operandoId === r.id}
                  onClick={() => crearServicio(r.id, false)}
                  iconoIzq={PlayCircle}
                >
                  Crear servicio
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-hueso-200">
          <MapPin className="h-4 w-4 text-dorado-600 dark:text-dorado-400" aria-hidden="true" />
          Servicios desde puntos configurados
        </h2>
        <div className="relative mb-3">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hueso-500"
            aria-hidden="true"
          />
          <input
            type="search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, correo o DNI..."
            aria-label="Buscar reservas sin asignar"
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-800 outline-none transition focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 dark:placeholder:text-hueso-500"
          />
        </div>
        {busqueda.trim() === '' ? (
          <p className="py-4 text-sm text-gray-500 dark:text-hueso-500">
            Escribe un nombre, correo o DNI para buscar reservas disponibles.
          </p>
        ) : poolFiltrado.length === 0 ? (
          <p className="py-4 text-sm text-gray-500 dark:text-hueso-500">
            No se encontraron reservas con ese criterio.
          </p>
        ) : (
          <div className="space-y-2">
            {poolFiltrado.map((r) => (
              <div
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-100 px-3 py-2 dark:border-white/10"
              >
                <div>
                  <p className="text-sm font-medium text-gray-800 dark:text-hueso-100">
                    {r.pasajero_nombre} · {r.origen} → {r.destino}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-hueso-500">
                    {formatearFecha(r.fecha_hora)}
                    {r.pasajero_dni ? ` · DNI ${r.pasajero_dni}` : ''}
                  </p>
                </div>
                <Button
                  tamano="sm"
                  variante="outline"
                  disabled={operandoId === r.id}
                  onClick={() => crearServicio(r.id, true)}
                  iconoIzq={PlayCircle}
                >
                  Crear servicio
                </Button>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

export default function Inicio() {
  const navigate = useNavigate();
  const usuario = leerUsuario();
  const { rol, tienePermiso } = usePermisos();
  const esConductor = rol === 'CONDUCTOR';

  // El pasajero puede reservar si tiene permitido (bandera) y el permiso real.
  const puedeReservar =
    usuario?.puede_reservar === true && tienePermiso('CREAR_RESERVAS');

  const kpis = [
    {
      titulo: 'Reservas hoy',
      valor: 0,
      icono: CalendarCheck,
      nota: 'Disponible en el modulo de reservas',
    },
    {
      titulo: 'Vehiculos activos',
      valor: 0,
      icono: Car,
      nota: 'Disponible en el modulo de flota',
    },
    {
      titulo: 'Usuarios activos',
      valor: '—',
      icono: Users,
      nota: 'Disponible en el modulo de usuarios',
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
            Hola, {usuario?.nombres} {usuario?.apellidos}
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
            Panel de control de Aventura Vip de Cusco.
          </p>
        </div>
        {puedeReservar && (
          <Button
            onClick={() => navigate('/reservas/nuevo')}
            tono="dorado"
            iconoIzq={CalendarPlus}
          >
            Realizar una reserva
          </Button>
        )}
      </div>

      {esConductor && <PanelConductor />}

      {/* KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kpis.map((kpi) => {
          const Icono = kpi.icono;
          return (
            <Card key={kpi.titulo}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-hueso-500">
                    {kpi.titulo}
                  </p>
                  <p className="mt-2 text-3xl font-bold text-gray-900 dark:text-hueso-100">
                    {kpi.valor}
                  </p>
                </div>
                <div className="rounded-xl bg-dorado-500/10 p-3 text-dorado-600 dark:text-dorado-400">
                  <Icono className="h-5 w-5" aria-hidden="true" />
                </div>
              </div>
              <p className="mt-3 text-[11px] text-gray-400 dark:text-hueso-500">
                {kpi.nota}
              </p>
            </Card>
          );
        })}
      </div>

      {/* Datos de la sesion */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-hueso-200">
            <ShieldCheck className="h-4 w-4 text-dorado-600 dark:text-dorado-400" aria-hidden="true" />
            Mi organizacion
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-3 text-gray-600 dark:text-hueso-300">
              <Building2 className="h-4 w-4 text-gray-400 dark:text-hueso-500" aria-hidden="true" />
              <span>Empresa: <strong>{usuario?.empresa ?? 'Particular'}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-hueso-300">
              <MapPin className="h-4 w-4 text-gray-400 dark:text-hueso-500" aria-hidden="true" />
              <span>Propiedad: <strong>{usuario?.establecimiento ?? 'Sin propiedad'}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-hueso-300">
              <MapPin className="h-4 w-4 text-gray-400 dark:text-hueso-500" aria-hidden="true" />
              <span>Grupo: <strong>{usuario?.area ?? 'Sin grupo asignado'}</strong></span>
            </div>
            <div className="flex items-center gap-3 text-gray-600 dark:text-hueso-300">
              <KeyRound className="h-4 w-4 text-gray-400 dark:text-hueso-500" aria-hidden="true" />
              <span>Rol: <strong>{usuario?.rol}</strong></span>
            </div>
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-hueso-200">
            <ShieldCheck className="h-4 w-4 text-dorado-600 dark:text-dorado-400" aria-hidden="true" />
            Permisos asignados
          </h2>
          {usuario?.permisos?.length ? (
            <div className="flex flex-wrap gap-2">
              {usuario.permisos.map((permiso) => (
                <span
                  key={permiso}
                  className="flex items-center gap-1 rounded-full bg-dorado-500/10 px-3 py-1 text-xs font-medium text-dorado-600 dark:text-dorado-400"
                >
                  <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                  {permiso}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-hueso-500">
              Este usuario no tiene permisos especiales asignados.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}