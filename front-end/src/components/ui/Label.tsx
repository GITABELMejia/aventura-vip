// ============================================================================
// COMPONENTE: ETIQUETA DE FORMULARIO (LABEL)
// ----------------------------------------------------------------------------
// Primitiva reutilizable para etiquetas de campos.
//
// PROPS:
//   * htmlFor   : id del input al que esta vinculada (accesibilidad).
//   * requerido : agrega un asterisco dorado de campo obligatorio.
//   * className : clases adicionales (margenes, etc.).
//
// EJEMPLO:
//   <Label htmlFor="correo" requerido>Usuario</Label>
//
// ACCESIBILIDAD:
//   * El <label htmlFor> queda vinculado al campo para lectores de pantalla
//     y para que el clic en el texto enfoque el input.
// ============================================================================

import type { LabelHTMLAttributes } from 'react';

interface LabelProps extends LabelHTMLAttributes<HTMLLabelElement> {
  requerido?: boolean;
}

export default function Label({
  requerido = false,
  className = '',
  children,
  ...rest
}: LabelProps) {
  return (
    <label
      {...rest}
      className={`mb-1.5 block text-xs font-semibold uppercase tracking-[0.15em] text-gray-600 dark:text-hueso-200 ${className}`}
    >
      {children}
      {requerido && (
        <span className="ml-1 text-dorado-500" aria-hidden="true">
          *
        </span>
      )}
    </label>
  );
}
