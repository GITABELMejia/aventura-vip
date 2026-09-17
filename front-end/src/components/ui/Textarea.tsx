// ============================================================================
// COMPONENTE: TEXTAREA REUTILIZABLE
// ----------------------------------------------------------------------------
// Area de texto multilinea con el estilo premium de los inputs. Lista para los
// modulos futuros (notas en reservas, observaciones de conductores, etc.).
//
// PROPS (ademas de las heredadas de <textarea>):
//   * etiqueta / requerido : label vinculado.
//   * estado / mensajeError : estados visuales como en Input.
//
// EJEMPLO:
//   <Textarea id="notas" etiqueta="Notas" filas={4}
//     valor={notas} onChange={setNotas} placeholder="Observaciones del viaje" />
// ============================================================================

import { forwardRef } from 'react';
import type { TextareaHTMLAttributes } from 'react';

import Label from './Label';
import type { EstadoCampo } from './Input';

interface TextareaProps
  extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value' | 'onChange'> {
  etiqueta: string;
  valor: string;
  onChange: (valor: string) => void;
  requerido?: boolean;
  estado?: EstadoCampo;
  mensajeError?: string;
}

// Clases de borde segun el estado (mismas que en Input).
const ESTILOS_BORDE: Record<EstadoCampo, string> = {
  default: 'border-white/10 focus:border-dorado-400/60',
  focus: 'border-dorado-400/60 ring-2 ring-dorado-400/15',
  error: 'border-coral-500/70 ring-2 ring-coral-500/10',
  validado: 'border-esmeralda-500/70 ring-2 ring-esmeralda-500/10',
};

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  function Textarea(
    {
      id,
      etiqueta,
      valor,
      onChange,
      requerido = false,
      estado = 'default',
      mensajeError,
      className = '',
      ...rest
    },
    ref
  ) {
    return (
      <div>
        <Label htmlFor={id} requerido={requerido}>
          {etiqueta}
        </Label>

        <textarea
          ref={ref}
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={estado === 'error'}
          aria-describedby={
            estado === 'error' && mensajeError ? `${id}-error` : undefined
          }
          className={`w-full resize-y rounded-xl border bg-white/[0.04] px-4 py-3 text-sm text-hueso-100 outline-none transition-all duration-200 placeholder:text-hueso-500 ${ESTILOS_BORDE[estado]} ${className}`}
          {...rest}
        />

        {estado === 'error' && mensajeError && (
          <p
            id={`${id}-error`}
            className="mt-1.5 text-xs text-coral-500"
            role="alert"
          >
            {mensajeError}
          </p>
        )}
      </div>
    );
  }
);

export default Textarea;
