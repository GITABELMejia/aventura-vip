// ============================================================================
// LAYOUT: DASHBOARD INTEGRAL
// ----------------------------------------------------------------------------
// Estructura general del sistema autenticado:
//   [Sidebar] [ Header                ]
//   [Sidebar] [ Contenido (<Outlet/>) ]
//
// Responsive:
//   * Escritorio : sidebar expandida fija (264px).
//   * Tablet     : sidebar colapsada a iconos (72px).
//   * Movil      : drawer deslizante con overlay oscuro.
//
// El tema oscuro/claro se aplica con la clase "dark" en <html>.
// ============================================================================

import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';

import { useMediaQuery } from '../hooks/useMediaQuery';
import { useNavegacion } from '../context/NavegacionContext';
import Header from './Header';
import Sidebar from './Sidebar';

export default function DashboardLayout() {
  const esEscritorio = useMediaQuery('(min-width: 1024px)');
  const esMovil = !useMediaQuery('(min-width: 768px)');
  const { colapsada, drawerAbierto, cerrarDrawer } = useNavegacion();

  // Bloquea el scroll del fondo cuando el drawer movil esta abierto.
  useEffect(() => {
    document.body.style.overflow = drawerAbierto ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [drawerAbierto]);

  // Cierra el drawer con la tecla Escape.
  useEffect(() => {
    if (!drawerAbierto) return;
    function alPresionarEsc(evento: KeyboardEvent) {
      if (evento.key === 'Escape') cerrarDrawer();
    }
    window.addEventListener('keydown', alPresionarEsc);
    return () => window.removeEventListener('keydown', alPresionarEsc);
  }, [drawerAbierto, cerrarDrawer]);

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900 transition-colors duration-200 dark:bg-black dark:text-hueso-100">
      {/* Sidebar fija: escritorio + tablet */}
      <div
        className={`sticky top-0 hidden h-screen shrink-0 md:block ${
          esEscritorio ? '' : ''
        }`}
      >
        <Sidebar colapsada={!esEscritorio && colapsada} />
      </div>

      {/* Drawer movil con overlay */}
      {esMovil && (
        <>
          {drawerAbierto && (
            <div
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
              onClick={cerrarDrawer}
              aria-hidden="true"
            />
          )}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegacion"
            className={`fixed inset-y-0 left-0 z-50 transition-transform duration-300 ${
              drawerAbierto ? 'translate-x-0' : '-translate-x-full'
            }`}
          >
            <Sidebar onNavegar={cerrarDrawer} />
          </div>
        </>
      )}

      {/* Columna principal */}
      <div className="flex min-w-0 flex-1 flex-col">
        <Header />
        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
