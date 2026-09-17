// ============================================================================
// PAGINA: LOGIN (VERSION PREMIUM VIP)
// ----------------------------------------------------------------------------
// Acceso exclusivo al sistema de movilidad Aventura Vip.
//
// FLUJO DE EXPERIENCIA DE USUARIO:
//   1. LOADER FULL-SCREEN (~2.6s): monograma "AV" con revelado progresivo,
//      sello dorado girando y barra de progreso. Anima la transicion hacia
//      el formulario (fade-in + slide-up) sin cortes bruscos.
//   2. FORMULARIO: tarjeta glassmorphism en negro/dorado con campos premium
//      (usuario y contrasena), "Recordarme" custom, enlace de recuperacion,
//      boton de lujo con glow, acceso VIP y footer legal.
//   3. LOGICA: se conserva intacta la integracion con el backend a traves de
//      auth.service.ts (login, guardarSesion, leerToken).
//
// ACCESIBILIDAD: labels vinculados, aria-invalid en errores, foco dorado
// por teclado, contraste AA y respeto por prefers-reduced-motion.
// ============================================================================

import { useEffect, useState, useRef, type FormEvent } from 'react';
import { useNavigate, useLocation, Navigate } from 'react-router-dom';
import {
  User,
  Lock,
  Phone,
  ChevronDown,
  ArrowRight,
  Crown,
} from 'lucide-react';

import Loader from '../components/Loader';
import LogoVip from '../components/LogoVip';
import CampoFormulario from '../components/CampoFormulario';
import Button from '../components/ui/Button';
import Checkbox from '../components/ui/Checkbox';
import AlertaError from '../components/ui/AlertaError';
import { login, guardarSesion, leerToken, tokenEstaExpirado, cerrarSesion } from '../services/auth.service';

// Duracion total del loader de pantalla completa (en milisegundos).
const DURACION_LOADER = 2600;

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  // ---- Estado del loader de pantalla completa -------------------------------
  const [mostrandoLoader, setMostrandoLoader] = useState(true);

  // ---- Estado del formulario -------------------------------------------------
  const [correoODni, setCorreoODni] = useState('');
  const [clave, setClave] = useState('');
  const [recordarme, setRecordarme] = useState(false);
  const [mostrarDemo, setMostrarDemo] = useState(false);

  // ---- Estado de la interfaz -------------------------------------------------
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [errorServidor, setErrorServidor] = useState('');
  const [rateLimitSegundos, setRateLimitSegundos] = useState(0);

  // Refs para focus management
  const correoRef = useRef<HTMLInputElement>(null);
  const claveRef = useRef<HTMLInputElement>(null);

  // Countdown para rate limit
  useEffect(() => {
    if (rateLimitSegundos > 0) {
      const intervalo = setInterval(() => {
        setRateLimitSegundos((s) => (s > 0 ? s - 1 : 0));
      }, 1000);
      return () => clearInterval(intervalo);
    }
  }, [rateLimitSegundos]);

  // Si ya hay sesion activa y vigente, redirigimos al Dashboard directamente.
  // Si el token existe pero caduco, lo limpiamos para volver a pedir login.
  const [yaAutenticado] = useState(() => {
    const token = leerToken();
    if (!token) return false;
    if (tokenEstaExpirado(token)) {
      cerrarSesion();
      return false;
    }
    return true;
  });

  // --------------------------------------------------------------------------
  // TIMER DEL LOADER: cuando termina su duracion, mostramos el formulario.
  // --------------------------------------------------------------------------
  useEffect(() => {
    const temporizador = setTimeout(() => setMostrandoLoader(false), DURACION_LOADER);
    return () => clearTimeout(temporizador);
  }, []);

  // --------------------------------------------------------------------------
  // ENVIO DEL FORMULARIO
  // --------------------------------------------------------------------------
  async function manejarEnvio(evento: FormEvent) {
    evento.preventDefault();

    // Validacion: campos obligatorios.
    setError('');
    setErrorServidor('');
    if (!correoODni.trim() || !clave.trim()) {
      setError('Completa tus credenciales para acceder.');
      if (!correoODni.trim()) {
        correoRef.current?.focus();
      } else {
        claveRef.current?.focus();
      }
      return;
    }

    // Llamada al backend con el spinner del boton.
    setCargando(true);
    try {
      const respuesta = await login({
        correo_o_dni: correoODni.trim(),
        clave,
      });
      guardarSesion(respuesta, recordarme);

      // Redirigir a la ruta que se intentaba visitar (o al Dashboard).
      const destino = (location.state as { from?: string } | null)?.from || '/';
      navigate(destino, { replace: true });
    } catch (err: unknown) {
      const respuesta = (err as { response?: { data?: { mensaje?: string }; status?: number; headers?: { 'retry-after'?: string } } })?.response;
      const status = respuesta?.status;
      const mensaje = respuesta?.data?.mensaje ?? 'No se pudo conectar con el servidor. Intenta de nuevo.';

      if (status === 429) {
        const retryAfter = respuesta?.headers?.['retry-after'];
        const segundos = retryAfter ? parseInt(retryAfter, 10) : 60;
        setRateLimitSegundos(segundos);
        setErrorServidor(`Demasiados intentos. Espera ${segundos}s y vuelve a intentarlo.`);
      } else {
        setErrorServidor(mensaje);
      }

      // Focus management: enfocar el campo relevante
      setTimeout(() => {
        if (mensaje.toLowerCase().includes('credencial') || !correoODni.trim()) {
          correoRef.current?.focus();
        } else {
          claveRef.current?.focus();
        }
      }, 0);

      // Mensaje diferenciado segun el formato del identificador.
      if (status === 401) {
        if (correoODni.trim().includes('@')) {
          setErrorServidor(
            'Los trabajadores inician sesion con su DNI (8 digitos).'
          );
        } else {
          setErrorServidor(
            'Credenciales invalidas. Verifica tu DNI y contrasena.'
          );
        }
      }
    } finally {
      setCargando(false);
    }
  }

  // Redireccion declarativa si ya habia sesion (evita efectos en el render).
  if (yaAutenticado) {
    return <Navigate to="/" replace />;
  }

  // El formulario solo se pinta cuando termina el loader (transicion suave).
  const saltarLoader = () => setMostrandoLoader(false);

  return (
    <div className="fondo-vip relative min-h-screen">
      {/* ==================== LOADER PANTALLA COMPLETA ==================== */}
      {mostrandoLoader && <Loader pantallaCompleta premium onComplete={saltarLoader} />}

      {/* ==================== CONTENIDO DE ACCESO ==================== */}
      {!mostrandoLoader && (
        <div className="animate-fade-in-subir mx-auto flex min-h-screen max-w-6xl items-center justify-center p-5">
          {/* Columna izquierda: identidad (visible en desktop/tablet) */}
          <div className="hidden flex-1 flex-col items-center gap-8 pr-10 lg:flex">
            <img
              src="/Logo.svg"
              alt="Logo Aventura Vip de Cusco"
              className="w-full max-w-md drop-shadow-[0_8px_30px_rgba(193,124,38,0.25)]"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = '/icono-192x192.png';
              }}
            />
            <h1 className="text-center font-serif-lujo text-5xl tracking-[0.25em] text-hueso-100">
              AVENTURA
              <span className="block text-dorado-400">VIP</span>
            </h1>
            <p className="letras-espaciadas text-[11px] uppercase text-hueso-400">
              Movilidad privada corporativa
            </p>
            <div className="mt-4 flex items-center gap-3 text-hueso-500">
              <Crown className="h-4 w-4 text-dorado-500" aria-hidden="true" />
              <span className="text-sm">Servicio exclusivo para miembros</span>
            </div>
          </div>

          {/* Columna derecha: tarjeta de acceso VIP */}
          <div className="w-full max-w-md">
            <div className="glass-card rounded-3xl p-8">
              {/* Encabezado con insignia */}
              <div className="mb-8 flex flex-col items-center gap-3">
                <LogoVip tamano="h-16 w-16" insignia />
                <h2 className="font-serif-lujo text-2xl tracking-[0.12em] text-hueso-100">
                  Bienvenido
                </h2>
                <p className="letras-espaciadas text-[9px] uppercase text-hueso-500">
                  Acceso privado autorizado
                </p>
              </div>

              {/* Mensaje de error general */}
              {(errorServidor || error) && (
                <div className="mb-5">
                  <AlertaError
                    mensaje={
                      rateLimitSegundos > 0
                        ? `Demasiados intentos. Espera ${rateLimitSegundos}s y vuelve a intentarlo.`
                        : errorServidor || error
                    }
                  />
                </div>
              )}

              {/* Formulario de acceso */}
              <form onSubmit={manejarEnvio} className="space-y-5" noValidate>
                <CampoFormulario
                  id="correo_o_dni"
                  ref={correoRef}
                  etiqueta="DNI"
                  tipo="text"
                  valor={correoODni}
                  onChange={setCorreoODni}
                  placeholder="Tu DNI (8 digitos)"
                  icono={User}
                  estado={errorServidor || (error && !correoODni.trim()) ? 'error' : 'default'}
                  mensajeError={errorServidor || (error && !correoODni.trim() ? error : undefined)}
                  autocompletar="username"
                  inputmode="numeric"
                  required
                />

                <CampoFormulario
                  id="clave"
                  ref={claveRef}
                  etiqueta="Contraseña"
                  tipo="password"
                  valor={clave}
                  onChange={setClave}
                  placeholder="Tu clave secreta"
                  icono={Lock}
                  permiteRevelar
                  estado={errorServidor || (error && !clave.trim()) ? 'error' : 'default'}
                  mensajeError={errorServidor || (error && !clave.trim() ? error : undefined)}
                  autocompletar="current-password"
                  required
                />

                {/* Fila: Recordarme + Olvidé mi clave */}
                <div className="flex items-center justify-between text-sm">
                  {/* Checkbox custom */}
                  <Checkbox
                    marcado={recordarme}
                    onChange={setRecordarme}
                    etiqueta="Recordarme"
                    ariaLabel="Recordarme en este dispositivo"
                  />

                  {/* Enlace de recuperacion */}
                  <a
                    href="#recuperar"
                    onClick={(e) => e.preventDefault()}
                    className="enlace-discreto text-xs"
                    aria-label="Recuperar contraseña"
                  >
                    ¿Olvidaste tu clave?
                  </a>
                </div>

                {/* Boton principal de lujo con hover glow */}
                <Button
                  type="submit"
                  tono="dorado"
                  tamano="lg"
                  cargando={cargando || rateLimitSegundos > 0}
                  textoCargando={rateLimitSegundos > 0 ? `Espera ${rateLimitSegundos}s...` : 'Verificando...'}
                  iconoDer={ArrowRight}
                  className="w-full"
                >
                  Iniciar sesión
                </Button>

                {/* Acceso alternativo VIP */}
                <div className="pt-1">
                  <div className="mb-4 flex items-center gap-4">
                    <span className="linea-dorada h-px flex-1" />
                    <span className="text-[10px] uppercase tracking-[0.25em] text-hueso-500">
                      Acceso
                    </span>
                    <span className="linea-dorada h-px flex-1" />
                  </div>

                  <Button
                    renderAs="link"
                    href="mailto:concierge@aventuravip.com?subject=Solicitud%20de%20acceso%20VIP"
                    variante="outline"
                    tono="dorado"
                    iconoIzq={Crown}
                    className="w-full"
                    aria-label="Solicitar acceso VIP"
                  >
                    Solicitar acceso VIP
                  </Button>
                </div>
              </form>

              {/* Desplegable discreto de cuentas demo */}
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setMostrarDemo((v) => !v)}
                  className="focus-dorado flex items-center gap-1.5 text-xs text-hueso-500 transition-colors hover:text-hueso-300"
                  aria-expanded={mostrarDemo}
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform duration-200 ${
                      mostrarDemo ? 'rotate-180' : ''
                    }`}
                  />
                  ¿Probar con una cuenta demo?
                </button>
                {mostrarDemo && (
                  <div className="animate-fade-in-subir mt-3 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-xs text-hueso-400">
                    <p className="mb-2 text-hueso-300">Todas usan la clave <code className="text-dorado-400">demo123</code> · Ingresa con tu DNI</p>
                    <ul className="space-y-1">
                      <li>12345678 <span className="text-hueso-500">· admin@aventura.com · ADMIN</span></li>
                      <li>23456789 <span className="text-hueso-500">· operador@aventura.com · OPERADOR</span></li>
                      <li>34567890 <span className="text-hueso-500">· jorge@aventura.com · CONDUCTOR</span></li>
                      <li>45678901 <span className="text-hueso-500">· juan.perez@belmond.com · USUARIO</span></li>
                    </ul>
                  </div>
                )}
              </div>
            </div>

            {/* Footer legal minimalista */}
            <footer className="mt-6 flex items-center justify-center gap-5 text-[11px] text-hueso-500">
              <a href="#privacidad" onClick={(e) => e.preventDefault()} className="enlace-discreto">
                Privacidad
              </a>
              <span className="h-3 w-px bg-white/10" aria-hidden="true" />
              <a href="#terminos" onClick={(e) => e.preventDefault()} className="enlace-discreto">
                Términos
              </a>
              <span className="h-3 w-px bg-white/10" aria-hidden="true" />
              <a
                href="mailto:concierge@aventuravip.com"
                className="enlace-discreto flex items-center gap-1"
              >
                <Phone className="h-3 w-3" />
                Soporte exclusivo
              </a>
            </footer>
          </div>
        </div>
      )}
    </div>
  );
}