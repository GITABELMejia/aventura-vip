// ============================================================================
// COMPONENTE: CHECKBOX PREMIUM REUTILIZABLE
// ----------------------------------------------------------------------------
// Casilla de verificacion con estilo custom (VIP):
//   * Oculta el <input> nativo con la tecnica "peer sr-only".
//   * Dibuja una casilla con borde dorado que se rellena al marcar.
//   * La marca es una flecha dorada rotada (identidad de la casa).
//
// PROPS:
//   * marcado   : estado booleano controlado por el padre.
//   * onChange  : recibe el nuevo valor (boolean).
//   * etiqueta  : texto que acompaña a la casilla.
//   * ariaLabel : descripcion para lectores de pantalla.
//
// EJEMPLO:
//   <Checkbox marcado={recordarme} onChange={setRecordarme}
//     etiqueta="Recordarme" ariaLabel="Recordarme en este dispositivo" />
//
// ACCESIBILIDAD:
//   * aria-label sobre el input oculto.
//   * El <label> envuelve todo: clic en el texto tambien alterna la casilla.
// ============================================================================

import { useId } from 'react';
import { ArrowRight } from 'lucide-react';

interface CheckboxProps {
  marcado: boolean;
  onChange: (marcado: boolean) => void;
  etiqueta: string;
  ariaLabel?: string;
  className?: string;
}

export default function Checkbox({
  marcado,
  onChange,
  etiqueta,
  ariaLabel,
  className = '',
}: CheckboxProps) {
  // id unico por instancia (permite varias casillas en la misma pagina).
  const id = useId();

  return (
    <label
      htmlFor={id}
      className={`focus-dorado flex cursor-pointer items-center gap-2.5 select-none ${className}`}
    >
      <input
        id={id}
        type="checkbox"
        checked={marcado}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
        aria-label={ariaLabel ?? etiqueta}
      />
      <span
        className="flex h-4.5 w-4.5 items-center justify-center rounded border border-dorado-500/50 bg-white/5 transition-all duration-200 peer-checked:border-dorado-500 peer-checked:bg-dorado-500"
        aria-hidden="true"
      >
        {marcado && (
          <ArrowRight className="h-3 w-3 -rotate-90 text-antracita-800" />
        )}
      </span>
      <span className="text-hueso-400 transition-colors hover:text-hueso-200">
        {etiqueta}
      </span>
    </label>
  );
}
