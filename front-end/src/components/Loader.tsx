// ============================================================================
// COMPONENTE: LOADER (CARGADOR ANIMADO)
// ----------------------------------------------------------------------------
// Dos presentaciones segun el contexto:
//
// 1) MODO PREMIUM (pantalla completa - carga inicial de la pagina):
//    Fondo antracita profundo con atmosfera dorada. Muestra el monograma
//    "AV" con efecto de REVELADO PROGRESIVO (clip-path), un sello dorado que
//    rota lentamente, una barra de progreso minimalista que crece y el
//    tagline "EXCLUSIVIDAD". Es una experiencia de carga de lujo.
//
// 2) MODO SPINNER (luz integrada): pequeño circulo giratorio y limpio que se
//    usa dentro del boton de envio, tarjetas u overlays de proceso.
//
// ACCESIBILIDAD:
//   * Los contenedores llevan role="status" y aria-live="polite" para que los
//     lectores de pantalla anuncien el estado de carga.
// ============================================================================

import { Loader2 } from 'lucide-react';
import LogoVip from './LogoVip';

interface LoaderProps {
  tamano?: number;
  color?: string;
  mensaje?: string;
  pantallaCompleta?: boolean;
  solapamiento?: boolean;
  premium?: boolean;
  onComplete?: () => void;
}

export default function Loader({
  tamano = 48,
  color = 'text-dorado-500',
  mensaje,
  pantallaCompleta = false,
  solapamiento = false,
  premium = false,
  onComplete,
}: LoaderProps) {
  // --------------------------------------------------------------------------
  // MODO PREMIUM: experiencia de carga exclusiva (pantalla completa).
  // --------------------------------------------------------------------------
  if (pantallaCompleta && premium) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="fondo-vip fixed inset-0 z-50 flex flex-col items-center justify-center gap-10 cursor-pointer"
        onClick={onComplete}
      >
        {/* Sello VIP con revelado progresivo y aro girando. */}
        <div className="animate-revelar-logo">
          <LogoVip tamano="h-28 w-28" girando insignia />
        </div>

        {/* Firma de la casa en serif espaciada. */}
        <p className="font-serif-lujo text-lg tracking-[0.3em] text-hueso-300">
          AVENTURA VIP
        </p>

        {/* Barra de progreso minimalista (crece de izquierda a derecha). */}
        <div className="h-px w-56 overflow-hidden bg-white/10">
          <div className="animate-crecer-barra h-full w-full origin-left bg-gradient-to-r from-transparent via-dorado-500 to-dorado-300" />
        </div>

        {/* Tagline de exclusividad con letras ampliamente espaciadas. */}
        <p className="letras-espaciadas text-[10px] uppercase text-hueso-500">
          Exclusividad
        </p>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // Spinner clasico (se usa en el boton, tarjetas y overlays de proceso).
  // --------------------------------------------------------------------------
  const contenido = (
    <div className="flex flex-col items-center justify-center gap-3">
      <Loader2
        style={{ width: tamano, height: tamano }}
        className={`animate-spin ${color}`}
        aria-hidden="true"
      />
      {mensaje && (
        <p className="animate-pulso-suave text-sm text-hueso-400">{mensaje}</p>
      )}
    </div>
  );

  if (solapamiento) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg bg-black/25 backdrop-blur-sm"
      >
        {contenido}
      </div>
    );
  }

  return (
    <div role="status" aria-live="polite">
      {contenido}
    </div>
  );
}