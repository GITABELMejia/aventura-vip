// ============================================================================
// COMPONENTE: SELECT REUTILIZABLE
// ----------------------------------------------------------------------------
// Lista desplegable con el mismo estilo premium de los inputs. Preparada para
// los modulos futuros (reservas, usuarios, flota) donde se eligen empresas,
// areas, roles o conductores.
//
// PROPS:
//   * id, etiqueta, requerido : label vinculado al select.
//   * opciones                : arreglo de strings o de {valor, etiqueta}.
//   * valor / onChange        : campo controlado (onChange recibe el string).
//   * placeholder             : opcion inicial deshabilitada ("Seleccionar...").
//   * estado / mensajeError   : estados visuales como en Input.
//
// EJEMPLO:
//   <Select id="empresa" etiqueta="Empresa" opciones={empresas}
//     valor={empresa} onChange={setEmpresa} placeholder="Seleccionar empresa" />
// ============================================================================

import type { SelectHTMLAttributes } from 'react';
import { ChevronDown } from 'lucide-react';

import Label from './Label';
import type { EstadoCampo } from './Input';

/** Opcion de un select: texto simple o par valor/etiqueta. */
export type OpcionSelect = string | { valor: string; etiqueta: string };

interface SelectProps
  extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange' | 'value'> {
  etiqueta: string;
  opciones: OpcionSelect[];
  valor: string;
  onChange: (valor: string) => void;
  placeholder?: string;
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

export default function Select({
  id,
  etiqueta,
  opciones,
  valor,
  onChange,
  placeholder,
  requerido = false,
  estado = 'default',
  mensajeError,
  className = '',
  ...rest
}: SelectProps) {
  return (
    <div>
      <Label htmlFor={id} requerido={requerido}>
        {etiqueta}
      </Label>

      <div className="relative">
        <select
          id={id}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={estado === 'error'}
          aria-describedby={
            estado === 'error' && mensajeError ? `${id}-error` : undefined
          }
          className={`w-full appearance-none rounded-xl border bg-white/[0.04] py-3 pl-4 pr-10 text-sm text-hueso-100 outline-none transition-all duration-200 placeholder:text-hueso-500 ${
            valor === '' ? 'text-hueso-500' : ''
          } ${ESTILOS_BORDE[estado]} ${className}`}
          {...rest}
        >
          {placeholder && (
            <option value="" disabled className="bg-antracita-800">
              {placeholder}
            </option>
          )}
          {opciones.map((opcion) => {
            const valorOpcion =
              typeof opcion === 'string' ? opcion : opcion.valor;
            const etiquetaOpcion =
              typeof opcion === 'string' ? opcion : opcion.etiqueta;
            return (
              <option
                key={valorOpcion}
                value={valorOpcion}
                className="bg-antracita-800"
              >
                {etiquetaOpcion}
              </option>
            );
          })}
        </select>

        {/* Flecha indicadora del desplegable. */}
        <ChevronDown
          className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-hueso-500"
          aria-hidden="true"
        />
      </div>

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
