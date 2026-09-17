// ============================================================================
// COMPONENTE: BOTON REUTILIZABLE
// ----------------------------------------------------------------------------
// Primitiva de interfaz para todos los botones del sistema.
//
// PROPS:
//   * variante : 'principal' (relleno) | 'outline' (borde) | 'ghost' (transparente).
//   * tono     : 'dorado' (VIP) | 'institucional' (azul) | 'peligro' (rojo).
//   * tamano   : 'sm' | 'md' | 'lg'.
//   * cargando : muestra un spinner integrado (reusa Loader) y deshabilita.
//   * textoCargando : texto que se muestra mientras esta cargando.
//   * iconoIzq / iconoDer : iconos (lucide-react) al inicio o al final.
//   * renderAs : 'button' (default) | 'link' (dibuja un <a href> con el mismo
//                estilo, ideal para mailto o enlaces con apariencia de boton).
//
// EJEMPLOS:
//   <Button tono="dorado" cargando={cargando} textoCargando="Verificando...">
//     Iniciar sesion
//   </Button>
//   <Button renderAs="link" href="mailto:concierge@aventuravip.com"
//     variante="outline" iconoIzq={Crown}>Solicitar acceso VIP</Button>
//
// ACCESIBILIDAD:
//   * aria-busy mientras carga y disabled (evita dobles envios).
//   * focus visible dorado (focus-dorado) para navegacion por teclado.
// ============================================================================

import type {
  ReactNode,
  ButtonHTMLAttributes,
  AnchorHTMLAttributes,
} from 'react';
import type { LucideIcon } from 'lucide-react';

import Loader from '../Loader';

type TonoButton = 'dorado' | 'institucional' | 'peligro';
type VarianteButton = 'principal' | 'outline' | 'ghost';
type TamanoButton = 'sm' | 'md' | 'lg';

interface PropsComunes {
  variante?: VarianteButton;
  tono?: TonoButton;
  tamano?: TamanoButton;
  cargando?: boolean;
  textoCargando?: string;
  iconoIzq?: LucideIcon;
  iconoDer?: LucideIcon;
  children?: ReactNode;
}

interface PropsBoton extends ButtonHTMLAttributes<HTMLButtonElement>, PropsComunes {
  renderAs?: 'button';
}

interface PropsEnlace extends AnchorHTMLAttributes<HTMLAnchorElement>, PropsComunes {
  renderAs: 'link';
  href: string;
}

type PropsButton = PropsBoton | PropsEnlace;

// Clases compartidas por toda variante.
const CLASES_BASE =
  'focus-dorado group inline-flex items-center justify-center gap-2 rounded-xl ' +
  'font-semibold uppercase tracking-[0.15em] transition-all duration-300 ' +
  'disabled:cursor-not-allowed disabled:opacity-70';

// Estilos por combinacion variante + tono.
const ESTILOS_VARIANTE: Record<VarianteButton, Record<TonoButton, string>> = {
  principal: {
    dorado:
      'bg-gradient-to-r from-dorado-600 via-dorado-500 to-dorado-400 ' +
      'text-antracita-900 hover:shadow-glow-dorado hover:brightness-110',
    institucional: 'bg-institucional-500 text-white hover:bg-institucional-600',
    peligro: 'bg-coral-500 text-white hover:brightness-110',
  },
  outline: {
    dorado:
      'border border-dorado-500/25 text-hueso-300 ' +
      'hover:border-dorado-500/60 hover:text-dorado-400',
    institucional:
      'border border-institucional-500/40 text-institucional-500 hover:bg-institucional-50',
    peligro: 'border border-coral-500/40 text-coral-500 hover:bg-coral-500/10',
  },
  ghost: {
    dorado: 'text-hueso-400 hover:bg-white/5 hover:text-hueso-100',
    institucional: 'text-institucional-500 hover:bg-institucional-50',
    peligro: 'text-coral-500 hover:bg-coral-500/10',
  },
};

// Tamano de la fuente y el espaciado segun la escala.
const ESTILOS_TAMANO: Record<TamanoButton, string> = {
  sm: 'px-3 py-2 text-[10px]',
  md: 'px-4 py-2.5 text-xs',
  lg: 'px-6 py-3.5 text-sm',
};

export default function Button(props: PropsButton) {
  const {
    variante = 'principal',
    tono = 'dorado',
    tamano = 'md',
    cargando = false,
    textoCargando,
    iconoIzq: IconoIzq,
    iconoDer: IconoDer,
    children,
  } = props;

  const clases = `${CLASES_BASE} ${ESTILOS_VARIANTE[variante][tono]} ${ESTILOS_TAMANO[tamano]}`;

  // Color del spinner: sobre el boton dorado usa tinta oscura (contraste VIP);
  // sobre el resto usa el color de texto actual.
  const colorSpinner =
    variante === 'principal' && tono === 'dorado'
      ? 'text-antracita-800'
      : 'text-current';

  const contenido = cargando ? (
    <>
      <Loader tamano={14} color={colorSpinner} />
      <span>{textoCargando ?? 'Procesando...'}</span>
    </>
  ) : (
    <>
      {IconoIzq && (
        <IconoIzq className="h-4 w-4 shrink-0" aria-hidden="true" />
      )}
      {children}
      {IconoDer && (
        <IconoDer
          className="h-4 w-4 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
          aria-hidden="true"
        />
      )}
    </>
  );

  // --------------------------------------------------------------------------
  // MODO ENLACE: dibuja un <a> con la misma apariencia (mailto, rutas, etc.).
  // --------------------------------------------------------------------------
  if (props.renderAs === 'link') {
    const {
      renderAs: _renderAs,
      variante: _variante,
      tono: _tono,
      tamano: _tamano,
      cargando: _cargando,
      textoCargando: _textoCargando,
      iconoIzq: _iconoIzq,
      iconoDer: _iconoDer,
      children: _children,
      className,
      ...rest
    } = props;
    return (
      <a className={`${clases} ${className ?? ''}`} {...rest}>
        {contenido}
      </a>
    );
  }

  // --------------------------------------------------------------------------
  // MODO BOTON: <button> con soporte de carga y deshabilitado.
  // --------------------------------------------------------------------------
  const {
    renderAs: _renderAs,
    variante: _variante,
    tono: _tono,
    tamano: _tamano,
    cargando: _cargando,
    textoCargando: _textoCargando,
    iconoIzq: _iconoIzq,
    iconoDer: _iconoDer,
    children: _children,
    className,
    disabled,
    ...rest
  } = props;

  return (
    <button
      type="button"
      disabled={cargando || disabled}
      aria-busy={cargando}
      className={`${clases} ${className ?? ''}`}
      {...rest}
    >
      {contenido}
    </button>
  );
}
