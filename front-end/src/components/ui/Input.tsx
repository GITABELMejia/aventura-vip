// ============================================================================
// COMPONENTE: INPUT REUTILIZABLE
// ----------------------------------------------------------------------------
// Primitiva de entrada de texto con estados visuales profesionales:
//   * default  : fondo oscuro, borde gris sutil, icono gris.
//   * focus    : borde y halo dorado (exclusivo VIP).
//   * error    : borde coral + icono de alerta + sacudida sutil.
//   * validado : borde esmeralda + icono de check.
//
// PROPS (ademas de las heredadas de <input>):
//   * estado         : 'default' | 'focus' | 'error' | 'validado'.
//   * mensajeError   : texto de error bajo el campo (con aria-describedby).
//   * icono (LucideIcon) : icono del lado izquierdo.
//   * permiteRevelar : habilita el boton ver/ocultar (solo password).
//
// EJEMPLO:
//   <Input id="clave" tipo="password" permiteRevelar
//     estado="error" mensajeError="Clave incorrecta" />
//
// ACCESIBILIDAD:
//   * aria-invalid y mensaje con id + aria-describedby para lectores.
//   * boton de revelar clave con aria-label.
//   * forwardRef para poder enfocar el campo desde el padre.
// ============================================================================

import { forwardRef, useState } from 'react';
import type { InputHTMLAttributes } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';

export type EstadoCampo = 'default' | 'focus' | 'error' | 'validado';

interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size' | 'value'> {
  tipo?: string;
  /** Valor controlado del campo (API en espanol, como en CampoFormulario). */
  valor?: string;
  estado?: EstadoCampo;
  mensajeError?: string;
  icono?: LucideIcon;
  permiteRevelar?: boolean;
}

// Clases de borde/ring segun el estado del campo.
const ESTILOS_BORDE: Record<EstadoCampo, string> = {
  default: 'border-gray-200 focus:border-dorado-400/60 dark:border-white/10',
  focus: 'border-dorado-400/60 ring-2 ring-dorado-400/15',
  error: 'border-coral-500/70 ring-2 ring-coral-500/10 animate-shake',
  validado: 'border-esmeralda-500/70 ring-2 ring-esmeralda-500/10',
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  {
    id,
    tipo = 'text',
    valor,
    estado = 'default',
    mensajeError,
    icono: Icono,
    permiteRevelar = false,
    className = '',
    ...rest
  },
  ref
) {
  // Estado local para el toggle ver/ocultar contrasena.
  const [visible, setVisible] = useState(false);
  const esContrasena = tipo === 'password';
  const tipoReal = esContrasena && visible ? 'text' : tipo;

  return (
    <div>
      <div className="relative">
        {/* Icono decorativo del campo */}
        {Icono && (
          <Icono
            data-icono-campo
            className={`pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
              estado === 'error' ? 'text-coral-500' : 'text-gray-400 dark:text-hueso-500'
            }`}
            aria-hidden="true"
          />
        )}

        <input
          ref={ref}
          id={id}
          type={tipoReal}
          value={valor}
          aria-invalid={estado === 'error'}
          aria-describedby={
            estado === 'error' && mensajeError ? `${id}-error` : undefined
          }
          className={`w-full rounded-xl border bg-gray-50 py-3 text-sm text-gray-800 outline-none transition-all duration-200 placeholder:text-gray-400 dark:bg-white/[0.04] dark:text-hueso-100 dark:placeholder:text-hueso-500 ${
            Icono ? 'pl-10' : 'pl-4'
          } ${permiteRevelar ? 'pr-11' : 'pr-4'} ${ESTILOS_BORDE[estado]} ${className}`}
          {...rest}
        />

        {/* Icono de estado (check verde o alerta roja) al fondo derecho. */}
        {estado === 'validado' && (
          <CheckCircle2
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-esmeralda-500"
            aria-label="Campo correcto"
          />
        )}
        {estado === 'error' && (
          <AlertCircle
            className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-coral-500"
            aria-label="Campo con error"
          />
        )}

        {/* Boton ver/ocultar contrasena */}
        {permiteRevelar && (
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Ocultar contrasena' : 'Mostrar contrasena'}
            data-icono-campo
            className="focus-dorado absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 transition hover:text-dorado-400 dark:text-hueso-500 dark:hover:text-dorado-400"
          >
            {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
      </div>

      {/* Mensaje de error (con aria-describedby vinculado). */}
      {estado === 'error' && mensajeError && (
        <p
          id={`${id}-error`}
          className="mt-1.5 flex items-center gap-1.5 text-xs text-coral-500"
          role="alert"
        >
          <AlertCircle className="h-3 w-3" />
          {mensajeError}
        </p>
      )}
    </div>
  );
});

export default Input;
