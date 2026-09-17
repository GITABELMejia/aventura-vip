// ============================================================================
// COMPONENTE: BADGE (INDICADOR NUMERICO)
// ----------------------------------------------------------------------------
// Insignia circular para notificaciones pendientes. Se usa sobre los iconos
// del menu lateral y la campana del header.
//
// PROPS:
//   * numero : cantidad a mostrar (si es 0 o undefined, no se dibuja).
//   * max    : limite superior; encima se muestra "9+".
//
// EJEMPLO:
//   <Badge numero={5} />   -> "5"
//   <Badge numero={12} />  -> "9+"
// ============================================================================

interface BadgeProps {
  numero?: number;
  max?: number;
}

export default function Badge({ numero = 0, max = 9 }: BadgeProps) {
  if (!numero || numero <= 0) return null;

  const texto = numero > max ? `${max}+` : String(numero);

  return (
    <span
      className="inline-flex min-w-[18px] items-center justify-center rounded-full bg-coral-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white shadow-sm"
      aria-label={`${numero} notificaciones pendientes`}
    >
      {texto}
    </span>
  );
}
