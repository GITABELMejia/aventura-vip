// ============================================================================
// COMPONENTE: CAMPO DE FORMULARIO
// ----------------------------------------------------------------------------
// Composicion de las primitivas reutilizables Label + Input. Mantiene la misma
// API publica de siempre (Login.tsx no cambia al usar este componente).
//
// PROPS:
//   id, etiqueta, tipo, valor, placeholder : control del input.
//   onChange                               : evento de cambio.
//   estado                                 : 'default' | 'focus' | 'error' | 'validado'.
//   mensajeError                           : texto de error bajo el campo.
//   icono (LucideIcon)                     : icono del lado izquierdo.
//   permiteRevelar                         : habilita el boton ver/ocultar.
//
// ACCESIBILIDAD:
//   * <label htmlFor> vinculado al input (Label).
//   * aria-invalid y mensaje con id + aria-describedby (Input).
//   * boton de revelar clave con aria-label.
// ============================================================================

import { forwardRef } from 'react';
import type { LucideIcon } from 'lucide-react';

import Label from './ui/Label';
import Input, { type EstadoCampo } from './ui/Input';

interface CampoFormularioProps {
  id: string;
  etiqueta: string;
  tipo?: string;
  valor: string;
  placeholder?: string;
  onChange: (valor: string) => void;
  onBlur?: () => void;
  onFocus?: () => void;
  estado?: EstadoCampo;
  mensajeError?: string;
  icono?: LucideIcon;
  permiteRevelar?: boolean;
  autocompletar?: string;
  inputmode?: 'none' | 'text' | 'tel' | 'email' | 'numeric' | 'decimal' | 'search';
  required?: boolean;
  deshabilitado?: boolean;
  className?: string;
}

const CampoFormulario = forwardRef<HTMLInputElement, CampoFormularioProps>(
  (
    {
      id,
      etiqueta,
      tipo = 'text',
      valor,
      placeholder,
      onChange,
      onBlur,
      onFocus,
      estado = 'default',
      mensajeError,
      icono,
      permiteRevelar = false,
      autocompletar,
      inputmode,
      required = false,
      deshabilitado = false,
      className,
    },
    ref
  ) => {
    return (
      <div>
        <Label htmlFor={id} requerido={required}>
          {etiqueta}
        </Label>
        <Input
          ref={ref}
          id={id}
          tipo={tipo}
          valor={valor}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          onFocus={onFocus}
          placeholder={placeholder}
          autoComplete={autocompletar}
          inputMode={inputmode}
          required={required}
          disabled={deshabilitado}
          estado={estado}
          mensajeError={mensajeError}
          icono={icono}
          permiteRevelar={permiteRevelar}
          className={className}
        />
      </div>
    );
  }
);

CampoFormulario.displayName = 'CampoFormulario';

export default CampoFormulario;