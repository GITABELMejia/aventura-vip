// ============================================================================
// PAGINA: FORMULARIO DE RESERVA (CREAR)
// ----------------------------------------------------------------------------
// La operadora crea la reserva capturando los datos del pasajero que llamo
// por telefono. Al guardar se genera un codigo secreto para validar el viaje.
// ============================================================================

import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, Save, Search, UserRound } from 'lucide-react';

import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import CampoFormulario from '../components/CampoFormulario';
import Textarea from '../components/ui/Textarea';
import AlertaError from '../components/ui/AlertaError';
import Label from '../components/ui/Label';
import { crearReserva } from '../services/reservas.service';
import { buscarUsuarios } from '../services/usuarios.service';
import type { UsuarioBusqueda } from '../types';

export default function ReservaForm() {
  const navigate = useNavigate();

  const [pasajeroNombre, setPasajeroNombre] = useState('');
  const [pasajeroTelefono, setPasajeroTelefono] = useState('');
  const [pasajeroUsuarioId, setPasajeroUsuarioId] = useState<number | null>(null);
  const [fechaHora, setFechaHora] = useState('');
  const [origen, setOrigen] = useState('');
  const [destino, setDestino] = useState('');
  const [numPasajeros, setNumPasajeros] = useState('1');
  const [notas, setNotas] = useState('');

  // Busqueda de usuarios para autocompletar el pasajero.
  const [sugerencias, setSugerencias] = useState<UsuarioBusqueda[]>([]);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [buscando, setBuscando] = useState(false);
  const timerBusqueda = useRef<number | undefined>(undefined);

  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState('');

  function manejarBusqueda(valor: string) {
    setPasajeroNombre(valor);
    setPasajeroUsuarioId(null);
    const q = valor.trim();
    if (q.length < 2) {
      setSugerencias([]);
      setMostrarSugerencias(false);
      return;
    }
    window.clearTimeout(timerBusqueda.current);
    timerBusqueda.current = window.setTimeout(async () => {
      setBuscando(true);
      try {
        const usuarios = await buscarUsuarios(q);
        setSugerencias(usuarios);
        setMostrarSugerencias(true);
      } catch {
        setSugerencias([]);
      } finally {
        setBuscando(false);
      }
    }, 300);
  }

  function seleccionarPasajero(usuario: UsuarioBusqueda) {
    setPasajeroNombre(`${usuario.nombres} ${usuario.apellidos}`.trim());
    setPasajeroTelefono(usuario.telefono ?? '');
    setPasajeroUsuarioId(usuario.id);
    setSugerencias([]);
    setMostrarSugerencias(false);
  }

  async function manejarEnvio(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (!pasajeroNombre.trim() || !fechaHora || !origen.trim() || !destino.trim()) {
      setError('Completa el pasajero, la fecha/hora, el origen y el destino.');
      return;
    }

    setGuardando(true);
    try {
      await crearReserva({
        pasajero_nombre: pasajeroNombre.trim(),
        pasajero_telefono: pasajeroTelefono.trim() || undefined,
        fecha_hora: new Date(fechaHora).toISOString(),
        origen: origen.trim(),
        destino: destino.trim(),
        num_pasajeros: Number(numPasajeros) || 1,
        notas: notas.trim() || undefined,
        pasajero_usuario_id: pasajeroUsuarioId ?? undefined,
      });
      navigate('/reservas');
    } catch (err) {
      setError(
        (err as { response?: { data?: { mensaje?: string } } })?.response?.data
          ?.mensaje ?? 'No se pudo crear la reserva.'
      );
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-serif-lujo text-2xl tracking-[0.1em] text-gray-900 dark:text-hueso-100">
            Nueva reserva
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-hueso-400">
            Captura los datos del viaje recibido por llamada.
          </p>
        </div>
        <Button variante="ghost" onClick={() => navigate('/reservas')} iconoIzq={ArrowLeft}>
          Volver
        </Button>
      </div>

      {error && <AlertaError mensaje={error} />}

      <form onSubmit={manejarEnvio} noValidate className="space-y-6">
        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-hueso-200">
            Pasajero
          </h2>
          <div className="space-y-5">
            <div className="relative">
              <Label htmlFor="pasajero-nombre" requerido>
                Nombre del pasajero
              </Label>
              <div className="relative mt-1.5">
                <Search
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hueso-500"
                  aria-hidden="true"
                />
                <input
                  id="pasajero-nombre"
                  type="text"
                  value={pasajeroNombre}
                  onChange={(e) => manejarBusqueda(e.target.value)}
                  onFocus={() => sugerencias.length > 0 && setMostrarSugerencias(true)}
                  onBlur={() => window.setTimeout(() => setMostrarSugerencias(false), 150)}
                  placeholder="Buscar por nombre, correo o DNI..."
                  required
                  autoComplete="off"
                  className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-10 pr-4 text-base text-gray-800 outline-none transition focus:border-dorado-400/60 dark:border-white/10 dark:bg-antracita-800 dark:text-hueso-100 dark:placeholder:text-hueso-500"
                />
                {buscando && (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-hueso-500">
                    Buscando...
                  </span>
                )}
              </div>

              {mostrarSugerencias && sugerencias.length > 0 && (
                <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-auto rounded-xl border border-gray-200 bg-white shadow-lg dark:border-white/10 dark:bg-antracita-800">
                  {sugerencias.map((usuario) => (
                    <li key={usuario.id}>
                      <button
                        type="button"
                        onMouseDown={() => seleccionarPasajero(usuario)}
                        className="flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-gray-800 transition hover:bg-dorado-500/10 dark:text-hueso-100"
                      >
                        <UserRound className="h-4 w-4 shrink-0 text-dorado-500" aria-hidden="true" />
                        <span className="min-w-0">
                          <span className="block truncate text-xs text-gray-500 dark:text-hueso-500">
                            {usuario.nombres} {usuario.apellidos}
                          </span>
                          <span className="block truncate text-[11px] text-gray-400 dark:text-hueso-500">
                            {usuario.rol}{usuario.empresa ? ` · ${usuario.empresa}` : ''}
                            {usuario.dni ? ` · ${usuario.dni}` : ''}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              <p className="mt-1.5 text-xs text-gray-400 dark:text-hueso-500">
                Busca un cliente existente o escribe el nombre manualmente.
              </p>
            </div>

            <CampoFormulario
              id="pasajero-telefono"
              etiqueta="Telefono"
              tipo="tel"
              valor={pasajeroTelefono}
              onChange={setPasajeroTelefono}
              placeholder="Ej: 955 555 555"
              icono={Phone}
              className="text-base"
            />
          </div>
        </Card>

        <Card>
          <h2 className="mb-4 text-sm font-semibold text-gray-700 dark:text-hueso-200">
            Viaje
          </h2>
          <div className="space-y-5">
            <CampoFormulario
              id="fecha-hora"
              etiqueta="Fecha y hora de recogida"
              tipo="datetime-local"
              valor={fechaHora}
              onChange={setFechaHora}
              required
              className="text-base"
            />
            <CampoFormulario
              id="origen"
              etiqueta="Origen"
              valor={origen}
              onChange={setOrigen}
              placeholder="Ej: Hotel Monasterio"
              required
              className="text-base"
            />
            <CampoFormulario
              id="destino"
              etiqueta="Destino"
              valor={destino}
              onChange={setDestino}
              placeholder="Ej: Aeropuerto Velasco Astete"
              required
              className="text-base"
            />
            <CampoFormulario
              id="num-pasajeros"
              etiqueta="Numero de pasajeros"
              tipo="number"
              valor={numPasajeros}
              onChange={setNumPasajeros}
              className="text-base"
            />
            <Textarea
              id="notas"
              etiqueta="Notas"
              rows={3}
              valor={notas}
              onChange={setNotas}
              placeholder="Observaciones del viaje (equipaje, asiento bebe...)"
            />
          </div>
        </Card>

        <Button
          type="submit"
          tono="dorado"
          tamano="lg"
          cargando={guardando}
          textoCargando="Creando..."
          iconoDer={Save}
          className="w-full text-base"
        >
          Crear reserva
        </Button>
      </form>
    </div>
  );
}