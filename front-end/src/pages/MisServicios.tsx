// ============================================================================
// PAGINA: RESERVAS ASIGNADAS (CONDUCTOR)
// ----------------------------------------------------------------------------
// Muestra las reservas que la operadora asigno al conductor y que aun no han
// sido recogidas. Al "recoger" la primera se crea el servicio y se redirige a
// la pantalla de Servicios para agregar mas pasajeros y finalizar.
// ============================================================================

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import Loader from '../components/Loader';
import {
  iniciarServicio,
  listarReservasDisponibles,
} from '../services/servicios.service';
import type { ReservaDisponible } from '../types';

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

export default function MisServicios() {
  const navigate = useNavigate();
  const [reservas, setReservas] = useState<ReservaDisponible[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [operandoId, setOperandoId] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setReservas(await listarReservasDisponibles());
    } catch {
      setError('No se pudieron cargar tus reservas asignadas.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function manejarRecoger(reserva: ReservaDisponible) {
    setOperandoId(reserva.id);
    setError('');
    try {
      await iniciarServicio(reserva.id);
      navigate('/servicios');
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo iniciar el servicio.'
      );
      setOperandoId(null);
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
          Reservas asignadas
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
          Reservas que te asignó la operadora. Al recoger al primer pasajero se
          crea el servicio.
        </p>
      </div>

      {error && <AlertaError mensaje={error} />}

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader mensaje="Cargando tus reservas..." />
        </div>
      ) : reservas.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-hueso-500">
            No tienes reservas asignadas pendientes.
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {reservas.map((reserva) => (
            <Card key={reserva.id} className="!p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-800 dark:text-hueso-100">
                    {reserva.pasajero_nombre}
                  </p>
                  <p className="mt-1 text-sm text-gray-600 dark:text-hueso-300">
                    {reserva.origen} → {reserva.destino}
                  </p>
                  <p className="mt-1 text-xs text-gray-500 dark:text-hueso-500">
                    {formatearFecha(reserva.fecha_hora)} · {reserva.num_pasajeros} pasajero(s)
                    {reserva.pasajero_telefono ? ` · ${reserva.pasajero_telefono}` : ''}
                  </p>
                  {reserva.codigo_secreto && (
                    <p className="mt-1 text-xs text-dorado-600 dark:text-dorado-400">
                      Código: {reserva.codigo_secreto}
                    </p>
                  )}
                </div>
                <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:flex-nowrap sm:justify-end">
                  <Button
                    tamano="sm"
                    disabled={operandoId === reserva.id}
                    onClick={() => manejarRecoger(reserva)}
                    iconoIzq={PlayCircle}
                  >
                    Recoger
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}