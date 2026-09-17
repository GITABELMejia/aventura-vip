// ============================================================================
// COMPONENTE: HEADER DEL DASHBOARD
// ----------------------------------------------------------------------------
// Barra superior con:
//   * Hamburguesa: abre el drawer (movil) o colapsa la sidebar (tablet).
//   * Tema oscuro/claro.
//   * Campana de notificaciones con badge de pendientes.
//   * Avatar del usuario con su rol y menu de salir.
// ============================================================================

import { Bell, LogOut, Menu, Moon, Sun } from 'lucide-react';

import Badge from '../components/ui/Badge';
import { useNavegacion } from '../context/NavegacionContext';
import { useTema } from '../context/TemaContext';
import { leerUsuario, cerrarSesion } from '../services/auth.service';
import { useNavigate } from 'react-router-dom';

interface Props {
  notificacionesPendientes?: number;
}

export default function Header({ notificacionesPendientes = 0 }: Props) {
  const { colapsada, alternarColapsada, abrirDrawer } = useNavegacion();
  const { tema, alternarTema } = useTema();
  const navigate = useNavigate();
  const usuario = leerUsuario();

  const iniciales = usuario
    ? `${usuario.nombres?.[0] ?? ''}${usuario.apellidos?.[0] ?? ''}`.toUpperCase()
    : 'AV';

  function manejarSalir() {
    cerrarSesion();
    navigate('/login', { replace: true });
  }

  function manejarMenu() {
    if (window.innerWidth < 768) {
      abrirDrawer();
    } else {
      alternarColapsada();
    }
  }

  return (
    <header className="flex h-16 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 dark:border-white/10 dark:bg-antracita-900 sm:px-6">
      {/* Izquierda: hamburguesa + titulo de la seccion */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={manejarMenu}
          aria-label={colapsada ? 'Expandir menu' : 'Colapsar menu'}
          aria-expanded={!colapsada}
          className="focus-dorado rounded-lg p-2.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-hueso-300 dark:hover:bg-white/5"
        >
          <Menu className="h-5 w-5" aria-hidden="true" />
        </button>
        <span className="hidden font-serif-lujo text-sm tracking-[0.2em] text-gray-800 dark:text-hueso-100 sm:block">
          AVENTURA VIP
        </span>
      </div>

      {/* Derecha: acciones */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Tema oscuro/claro */}
        <button
          type="button"
          onClick={alternarTema}
          aria-label={
            tema === 'oscuro' ? 'Activar modo claro' : 'Activar modo oscuro'
          }
          className="focus-dorado rounded-lg p-2.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-hueso-300 dark:hover:bg-white/5"
        >
          {tema === 'oscuro' ? (
            <Sun className="h-5 w-5" aria-hidden="true" />
          ) : (
            <Moon className="h-5 w-5" aria-hidden="true" />
          )}
        </button>

        {/* Notificaciones */}
        <button
          type="button"
          aria-label="Notificaciones"
          className="focus-dorado relative rounded-lg p-2.5 text-gray-600 transition-colors hover:bg-gray-100 dark:text-hueso-300 dark:hover:bg-white/5"
        >
          <Bell className="h-5 w-5" aria-hidden="true" />
          <span className="absolute right-1 top-1">
            <Badge numero={notificacionesPendientes} />
          </span>
        </button>

        {/* Avatar del usuario */}
        <div className="flex items-center gap-3 border-l border-gray-200 pl-3 dark:border-white/10">
          {usuario?.foto_b64 ? (
            <img
              src={`data:${usuario.foto_mime ?? 'image/jpeg'};base64,${usuario.foto_b64}`}
              alt={`${usuario.nombres} ${usuario.apellidos}`}
              className="h-9 w-9 rounded-full object-cover"
            />
          ) : (
            <div
              className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-dorado-500 to-dorado-700 text-xs font-bold text-black"
              aria-hidden="true"
            >
              {iniciales}
            </div>
          )}
          <div className="hidden leading-tight lg:block">
            <p className="text-sm font-semibold text-gray-800 dark:text-hueso-100">
              {usuario?.nombres} {usuario?.apellidos}
            </p>
            <p className="text-xs text-gray-500 dark:text-hueso-500">
              {usuario?.rol} {usuario?.empresa ? `· ${usuario.empresa}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={manejarSalir}
            aria-label="Cerrar sesion"
            title="Cerrar sesion"
            className="focus-dorado rounded-lg p-2.5 text-gray-500 transition-colors hover:bg-gray-100 hover:text-coral-500 dark:text-hueso-500 dark:hover:bg-white/5"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
