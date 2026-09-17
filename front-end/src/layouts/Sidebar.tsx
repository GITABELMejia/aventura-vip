// ============================================================================
// COMPONENTE: BARRA LATERAL (SIDEBAR)
// ----------------------------------------------------------------------------
// Menu principal del dashboard con iconos por modulo.
//
// Comportamiento responsive:
//   * Escritorio : expandida (264px), se muestra siempre.
//   * Tablet     : colapsada a iconos (72px) con tooltips.
//   * Movil      : drawer deslizante con overlay (se cierra al navegar).
//
// Secciones:
//   * FAVORITOS: accesos directos marcados con estrella (arriba).
//   * MODULOS  : segun la configuracion de navegacion; los modulos sin
//     permiso (PBAC) se ocultan automaticamente.
//
// Accesibilidad: aria-label, navegacion por teclado (flechas arriba/abajo).
// ============================================================================

import { Star } from 'lucide-react';
import { useLocation } from 'react-router-dom';

import { NAVEGACION } from '../config/navegacion';
import { useFavoritos } from '../context/FavoritosContext';
import { usePermisos } from '../hooks/usePermisos';
import SidebarItem from './SidebarItem';

interface Props {
  colapsada?: boolean;
  onNavegar?: () => void;
}

export default function Sidebar({ colapsada = false, onNavegar }: Props) {
  const { favoritos } = useFavoritos();
  const { tienePermiso, rol } = usePermisos();
  const { pathname } = useLocation();

  // Filtrar modulos visibles segun permisos (PBAC) y rol: basta con cumplir
  // el permiso unico, cualquiera de la lista alternativa, o el rol requerido.
  const modulosVisibles = NAVEGACION.filter((m) => {
    if (m.rol) return rol === m.rol;
    if (m.permisos?.length) return m.permisos.some((p) => tienePermiso(p));
    if (m.permiso) return tienePermiso(m.permiso);
    return true;
  });

  // Favoritos: modulos visibles marcados con estrella (sin grupos).
  const favoritosVisibles = modulosVisibles
    .filter((m) => favoritos.includes(m.id) && !m.children?.length)
    .filter((m) => m.ruta && m.ruta !== pathname);

  // Navegacion por teclado (flechas arriba/abajo entre los enlaces).
  function manejarTeclas(evento: React.KeyboardEvent<HTMLElement>) {
    if (evento.key !== 'ArrowDown' && evento.key !== 'ArrowUp') return;
    evento.preventDefault();
    const opciones = Array.from(
      document.querySelectorAll<HTMLElement>('[data-nav-item]')
    );
    const actual = opciones.indexOf(document.activeElement as HTMLElement);
    const delta = evento.key === 'ArrowDown' ? 1 : -1;
    opciones[actual + delta]?.focus();
  }

  return (
    <aside
      aria-label="Menu principal"
      onKeyDown={manejarTeclas}
      className={`flex h-full flex-col overflow-y-auto bg-antracita-900 text-hueso-300 transition-[width] duration-300 ${
        colapsada ? 'w-[72px]' : 'w-64'
      }`}
    >
      {/* Marca */}
      <div
        className={`flex h-16 items-center border-b border-white/5 px-4 ${
          colapsada ? 'justify-center px-0' : 'gap-3'
        }`}
      >
        <img
          src="/Logo.svg"
          alt="Aventura Vip"
          className={`${colapsada ? 'h-9 w-9' : 'h-10 w-auto'} object-contain`}
        />
        {!colapsada && (
          <span className="font-serif-lujo text-sm tracking-[0.2em] text-hueso-100">
            AVENTURA VIP
          </span>
        )}
      </div>

      {/* Favoritos */}
      {!colapsada && favoritosVisibles.length > 0 && (
        <nav aria-label="Accesos directos" className="mt-4 px-3">
          <p className="mb-2 flex items-center gap-1.5 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-hueso-500">
            <Star className="h-3 w-3 text-dorado-500" aria-hidden="true" />
            Favoritos
          </p>
          <ul className="space-y-1">
            {favoritosVisibles.map((modulo) => (
              <SidebarItem
                key={modulo.id}
                item={modulo}
                colapsada={false}
                onNavegar={onNavegar}
              />
            ))}
          </ul>
        </nav>
      )}

      {/* Modulos */}
      <nav aria-label="Modulos" className="mt-4 flex-1 px-3 pb-4">
        {!colapsada && (
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.2em] text-hueso-500">
            Modulos
          </p>
        )}
        <ul className="space-y-1">
          {modulosVisibles.map((modulo) => (
            <SidebarItem
              key={modulo.id}
              item={modulo}
              colapsada={colapsada}
              onNavegar={onNavegar}
            />
          ))}
        </ul>
      </nav>

      {/* Pie */}
      {!colapsada && (
        <div className="border-t border-white/5 px-6 py-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-hueso-500">
            Movilidad privada corporativa
          </p>
        </div>
      )}
    </aside>
  );
}
