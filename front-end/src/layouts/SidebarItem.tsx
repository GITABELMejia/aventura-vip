// ============================================================================
// COMPONENTE: ITEM DE LA BARRA LATERAL
// ----------------------------------------------------------------------------
// Renderiza un elemento del menu de forma recursiva:
//   * Hoja  : enlace (NavLink) con estados activo/hover.
//   * Grupo : boton expandible con chevron para submodulos (2 y 3 niveles).
//
// Estados visuales:
//   * Activo       : fondo dorado translucido + borde dorado + texto ambar.
//   * Hover        : fondo blanco sutil.
//   * Favorito     : estrella ambar rellena (toggle).
//   * Deshabilitado: opacidad reducida y cursor no permitido (sin permiso).
//
// Accesibilidad: aria-expanded, aria-current="page" y navegacion por teclado.
// ============================================================================

import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronDown, Star } from 'lucide-react';

import type { ItemNavegacion } from '../config/navegacion';
import { useFavoritos } from '../context/FavoritosContext';
import { usePermisos } from '../hooks/usePermisos';

interface Props {
  item: ItemNavegacion;
  nivel?: number;
  colapsada?: boolean;
  onNavegar?: () => void;
}

export default function SidebarItem({
  item,
  nivel = 0,
  colapsada = false,
  onNavegar,
}: Props) {
  const [abierto, setAbierto] = useState(nivel === 0 && item.children ? true : false);
  const { esFavorito, alternarFavorito } = useFavoritos();
  const { tienePermiso, rol } = usePermisos();
  const { pathname, search } = useLocation();
  const Icono = item.icono;
  const esGrupo = Boolean(item.children?.length);
  const margen = { paddingLeft: `${12 + nivel * 16}px` };

  // Visibilidad de un submodulo segun permiso (PBAC) o rol.
  function esVisible(it: ItemNavegacion): boolean {
    if (it.rol) return rol === it.rol;
    if (it.permisos?.length) return it.permisos.some((p) => tienePermiso(p));
    if (it.permiso) return tienePermiso(it.permiso);
    return true;
  }

  // Estado activo: React Router marca activo solo por pathname; aqui se
  // compara tambien el search para distinguir /usuarios?rol=CONDUCTOR, etc.
  const ruta = item.ruta ?? '#';
  const [rutaPath, rutaSearch] = ruta.split('?');
  const esActiva =
    ruta !== '#' &&
    pathname === rutaPath &&
    (rutaSearch ? search === `?${rutaSearch}` : search === '');

  const clasesBase =
    'group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-dorado-400 focus-visible:outline-offset-2';
  const estiloHoja = colapsada ? 'justify-center px-0' : '';

  const botonFavorito = item.favoritable && (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        alternarFavorito(item.id);
      }}
      aria-label={esFavorito(item.id) ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      aria-pressed={esFavorito(item.id)}
      title="Favorito"
      className={`ml-auto shrink-0 rounded p-1 transition-colors ${
        esFavorito(item.id)
          ? 'text-dorado-500'
          : 'text-transparent group-hover:text-hueso-500 hover:!text-dorado-500'
      } ${colapsada ? 'hidden' : ''}`}
    >
      <Star className="h-4 w-4 fill-current" />
    </button>
  );

  // --------------------------------------------------------------------------
  // GRUPO: submodulos expandibles (chevron)
  // --------------------------------------------------------------------------
  if (esGrupo) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setAbierto((a) => !a)}
          aria-expanded={abierto}
          style={colapsada ? undefined : margen}
          className={`${clasesBase} ${estiloHoja} text-hueso-400 hover:bg-white/5 hover:text-hueso-100 dark:text-hueso-400 dark:hover:bg-white/5 dark:hover:text-hueso-100`}
        >
          <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
          {!colapsada && (
            <>
              <span className="flex-1 truncate text-left">{item.titulo}</span>
              {botonFavorito}
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-hueso-500 transition-transform duration-200 ${
                  abierto ? 'rotate-180' : ''
                }`}
                aria-hidden="true"
              />
            </>
          )}
        </button>

        {!colapsada && abierto && (
          <ul className="mt-1 space-y-1">
            {item.children
              ?.filter(esVisible)
              .map((hijo) => (
                <SidebarItem
                  key={hijo.id}
                  item={hijo}
                  nivel={nivel + 1}
                  onNavegar={onNavegar}
                />
              ))}
          </ul>
        )}
      </li>
    );
  }

  // --------------------------------------------------------------------------
  // HOJA: enlace navegable
  // --------------------------------------------------------------------------
  return (
    <li>
      <Link
        to={item.ruta ?? '#'}
        onClick={onNavegar}
        style={colapsada ? undefined : margen}
        aria-current={esActiva ? 'page' : undefined}
        className={`${clasesBase} ${estiloHoja} ${
          esActiva
            ? 'border-r-2 border-dorado-500 bg-dorado-500/10 font-medium text-dorado-400 dark:bg-dorado-500/10 dark:text-dorado-400'
            : 'text-hueso-400 hover:bg-white/5 hover:text-hueso-100 dark:text-hueso-400 dark:hover:bg-white/5 dark:hover:text-hueso-100'
        }`}
      >
        <Icono className="h-5 w-5 shrink-0" aria-hidden="true" />
        {!colapsada && (
          <>
            <span className="flex-1 truncate">{item.titulo}</span>
            {botonFavorito}
            {esActiva && (
              <span className="sr-only">(página actual)</span>
            )}
          </>
        )}
      </Link>
    </li>
  );
}
