// ============================================================================
// COMPONENTE: ALERTA DE ERROR REUTILIZABLE
// ----------------------------------------------------------------------------
// Banner de error con estilo premium (fondo coral translucido, borde suave).
//
// PROPS:
//   * mensaje : texto del error a mostrar.
//   * icono   : icono lucide-react opcional (por defecto ShieldCheck).
//   * className : clases adicionales (margenes, etc.).
//
// EJEMPLO:
//   <AlertaError mensaje="Completa tus credenciales para acceder." />
//
// ACCESIBILIDAD:
//   * role="alert" + aria-live="assertive" para anunciar el error de inmediato.
// ============================================================================

import type { LucideIcon } from 'lucide-react';
import { ShieldCheck } from 'lucide-react';

interface AlertaErrorProps {
  mensaje: string;
  icono?: LucideIcon;
  className?: string;
}

export default function AlertaError({
  mensaje,
  icono: Icono = ShieldCheck,
  className = '',
}: AlertaErrorProps) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className={`flex items-center gap-2.5 rounded-xl border border-coral-500/40 bg-coral-500/10 px-4 py-3 text-sm text-coral-500 ${className}`}
    >
      <Icono className="h-4 w-4 shrink-0" aria-hidden="true" />
      <span>{mensaje}</span>
    </div>
  );
}
