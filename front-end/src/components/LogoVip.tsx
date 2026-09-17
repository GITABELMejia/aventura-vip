// ============================================================================
// COMPONENTE: LOGO VIP (SELLO + LOGO OFICIAL)
// ----------------------------------------------------------------------------
// Identidad visual de la credencial de acceso VIP.
//
// Consta de dos capas:
//   1. Logo oficial de la marca (Logo.svg, vectorizado desde Logo_1.png).
//   2. Sello circular dorado texturizado (aro) que envuelve el logo.
//
// PROPS:
//   * tamano (string class)  : dimension del anillo (p. ej. "h-20 w-20").
//   * girando (boolean)      : si TRUE, el aro texturizado rota lentamente
//                              (se usa en el loader de pantalla completa).
//   * insignia (boolean)     : muestra el badge "MEMBER" sobre el sello.
//
// EJEMPLO:
//   <LogoVip tamano="h-24 w-24" girando insignia />
// ============================================================================

interface LogoVipProps {
  tamano?: string;
  girando?: boolean;
  insignia?: boolean;
}

export default function LogoVip({
  tamano = 'h-20 w-20',
  girando = false,
  insignia = false,
}: LogoVipProps) {
  return (
    <div className={`relative ${tamano}`}>
      {/* Aro exterior texturizado (gira lentamente en el loader). */}
      <svg
        viewBox="0 0 100 100"
        className={`absolute inset-0 h-full w-full text-dorado-500 ${
          girando ? 'animate-sello-girar' : ''
        }`}
        aria-hidden="true"
      >
        <defs>
          {/* Patron de puntos para textura de lujo del aro. */}
          <pattern id="punteadoVip" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="1.2" cy="1.2" r="1" fill="currentColor" />
          </pattern>
        </defs>
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="none"
          stroke="url(#punteadoVip)"
          strokeWidth="1.4"
          opacity="0.85"
        />
      </svg>

      {/* Aro interno dorado solido (sutil). */}
      <div className="absolute inset-1 rounded-full border border-dorado-500/25" />

      {/* Logo oficial de la marca (vector, se adapta a la proporcion). */}
      <div className="absolute inset-0 flex items-center justify-center">
        <img
          src="/Logo.svg"
          alt="Logo Aventura Vip"
          className="h-[72%] w-[72%] object-contain drop-shadow-[0_2px_8px_rgba(193,124,38,0.35)]"
        />
      </div>

      {/* Insignia de estatus "MEMBER". */}
      {insignia && (
        <span
          className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 rounded-full border border-dorado-500/60 bg-antracita-800 px-2 py-0.5 text-[8px] font-semibold uppercase tracking-[0.2em] text-dorado-400"
          role="text"
          aria-label="Miembro VIP"
        >
          Member
        </span>
      )}
    </div>
  );
}