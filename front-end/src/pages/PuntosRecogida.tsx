// ============================================================================
// PAGINA: PUNTOS DE RECOGIDA (ADMIN)
// ----------------------------------------------------------------------------
// El admin configura puntos de recogida (hora + lugar). El conductor podra
// crear servicios desde esas horas/lugares.
// ============================================================================

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import AlertaError from '../components/ui/AlertaError';
import CampoFormulario from '../components/CampoFormulario';
import Loader from '../components/Loader';
import {
  actualizarPunto,
  cambiarEstadoPunto,
  crearPunto,
  listarPuntos,
} from '../services/configuracion.service';
import type { PuntoRecogida } from '../types';

export default function PuntosRecogida() {
  const [puntos, setPuntos] = useState<PuntoRecogida[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  const [hora, setHora] = useState('');
  const [lugar, setLugar] = useState('');
  const [editandoId, setEditandoId] = useState<number | null>(null);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setPuntos(await listarPuntos());
    } catch {
      setError('No se pudieron cargar los puntos.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function limpiarFormulario() {
    setHora('');
    setLugar('');
    setEditandoId(null);
  }

  async function manejarGuardar() {
    if (!hora || !lugar.trim()) {
      setError('Indica la hora y el lugar.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      if (editandoId) {
        await actualizarPunto(editandoId, { hora, lugar: lugar.trim() });
      } else {
        await crearPunto({ hora, lugar: lugar.trim() });
      }
      limpiarFormulario();
      await cargar();
    } catch {
      setError('No se pudo guardar el punto.');
    } finally {
      setGuardando(false);
    }
  }

  async function manejarEstado(punto: PuntoRecogida) {
    setError('');
    try {
      await cambiarEstadoPunto(punto.id, punto.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO');
      await cargar();
    } catch {
      setError('No se pudo cambiar el estado.');
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
          Puntos de recogida
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
          Horarios y lugares desde los que el conductor puede crear servicios.
        </p>
      </div>

      {error && <AlertaError mensaje={error} />}

      <Card>
        <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-hueso-200">
          {editandoId ? 'Editar punto' : 'Nuevo punto'}
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoFormulario
            id="punto-hora"
            etiqueta="Hora de recogida"
            tipo="time"
            valor={hora}
            onChange={setHora}
            required
            className="text-base"
          />
          <CampoFormulario
            id="punto-lugar"
            etiqueta="Lugar de recogida"
            valor={lugar}
            onChange={setLugar}
            placeholder="Ej: Hotel Monasterio"
            required
            className="text-base"
          />
        </div>
        <div className="mt-4 flex gap-2">
          <Button onClick={manejarGuardar} cargando={guardando} textoCargando="Guardando...">
            {editandoId ? 'Guardar cambios' : 'Agregar punto'}
          </Button>
          {editandoId && (
            <Button variante="ghost" onClick={limpiarFormulario}>
              Cancelar
            </Button>
          )}
        </div>
      </Card>

      {cargando ? (
        <div className="flex justify-center py-16">
          <Loader mensaje="Cargando puntos..." />
        </div>
      ) : puntos.length === 0 ? (
        <Card>
          <p className="py-8 text-center text-sm text-gray-500 dark:text-hueso-500">
            No hay puntos de recogida configurados.
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {puntos.map((punto) => (
            <Card key={punto.id} className="!p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-dorado-500/10 p-2 text-dorado-600 dark:text-dorado-400">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-hueso-100">
                      {punto.hora.slice(0, 5)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-hueso-500">{punto.lugar}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                      punto.estado === 'ACTIVO'
                        ? 'bg-esmeralda-500/10 text-esmeralda-500'
                        : 'bg-coral-500/10 text-coral-500'
                    }`}
                  >
                    {punto.estado}
                  </span>
                  <Button
                    variante="ghost"
                    tamano="sm"
                    onClick={() => {
                      setEditandoId(punto.id);
                      setHora(punto.hora.slice(0, 5));
                      setLugar(punto.lugar);
                    }}
                  >
                    Editar
                  </Button>
                  <Button
                    variante="ghost"
                    tamano="sm"
                    onClick={() => manejarEstado(punto)}
                  >
                    {punto.estado === 'ACTIVO' ? 'Inactivar' : 'Activar'}
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