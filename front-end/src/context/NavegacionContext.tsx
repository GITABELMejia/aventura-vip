// ============================================================================
// CONTEXTO: NAVEGACION DEL DASHBOARD
// ----------------------------------------------------------------------------
// Gestiona el comportamiento responsive de la barra lateral:
//   * Escritorio (>=1024px): sidebar expandida (264px).
//   * Tablet (768-1023px)  : colapsada a iconos (72px), se alterna con el
//     boton del header.
//   * Movil (<768px)       : drawer deslizante con overlay (hamburguesa).
//
// Uso:
//   const { colapsada, alternarColapsada, drawerAbierto, abrirDrawer, cerrarDrawer } =
//     useNavegacion();
// ============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

import { useMediaQuery } from '../hooks/useMediaQuery';

interface NavegacionContexto {
  colapsada: boolean;
  alternarColapsada: () => void;
  drawerAbierto: boolean;
  abrirDrawer: () => void;
  cerrarDrawer: () => void;
}

const ContextoNavegacion = createContext<NavegacionContexto | null>(null);

export function NavegacionProvider({ children }: { children: ReactNode }) {
  const esMovil = !useMediaQuery('(min-width: 768px)');
  const esEscritorio = useMediaQuery('(min-width: 1024px)');

  // En tablet la sidebar arranca colapsada; en movil se usa el drawer.
  const [colapsada, setColapsada] = useState(!esMovil);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // Al pasar a escritorio se fuerza la expansion; al bajar a movil se
  // cierra el drawer para no dejarlo abierto.
  useEffect(() => {
    if (esEscritorio) setColapsada(false);
    if (esMovil) setDrawerAbierto(false);
  }, [esEscritorio, esMovil]);

  return (
    <ContextoNavegacion.Provider
      value={{
        colapsada,
        alternarColapsada: () => setColapsada((c) => !c),
        drawerAbierto,
        abrirDrawer: () => setDrawerAbierto(true),
        cerrarDrawer: () => setDrawerAbierto(false),
      }}
    >
      {children}
    </ContextoNavegacion.Provider>
  );
}

export function useNavegacion(): NavegacionContexto {
  const contexto = useContext(ContextoNavegacion);
  if (!contexto) {
    throw new Error('useNavegacion debe usarse dentro de <NavegacionProvider>');
  }
  return contexto;
}
