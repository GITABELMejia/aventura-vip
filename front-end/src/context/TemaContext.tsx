// ============================================================================
// CONTEXTO: TEMA (OSCURO/CLARO)
// ----------------------------------------------------------------------------
// Gestiona el modo oscuro/claro del dashboard. El modo oscuro (negro de la
// marca) es el predeterminado. La preferencia se guarda en localStorage.
//
// Uso:
//   const { tema, alternarTema } = useTema();
// ============================================================================

import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

export type Tema = 'oscuro' | 'claro';

const CLAVE_TEMA = 'aventura_tema';

interface TemaContexto {
  tema: Tema;
  alternarTema: () => void;
}

const ContextoTema = createContext<TemaContexto | null>(null);

function temaInicial(): Tema {
  const guardado = localStorage.getItem(CLAVE_TEMA);
  if (guardado === 'oscuro' || guardado === 'claro') return guardado;
  return 'oscuro'; // identidad de marca: oscuro por defecto
}

export function TemaProvider({ children }: { children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(temaInicial);

  // Aplica la clase "dark" en <html> (configurada con darkMode:'class').
  useEffect(() => {
    document.documentElement.classList.toggle('dark', tema === 'oscuro');
    localStorage.setItem(CLAVE_TEMA, tema);
  }, [tema]);

  function alternarTema() {
    setTema((t) => (t === 'oscuro' ? 'claro' : 'oscuro'));
  }

  return (
    <ContextoTema.Provider value={{ tema, alternarTema }}>
      {children}
    </ContextoTema.Provider>
  );
}

export function useTema(): TemaContexto {
  const contexto = useContext(ContextoTema);
  if (!contexto) {
    throw new Error('useTema debe usarse dentro de <TemaProvider>');
  }
  return contexto;
}
