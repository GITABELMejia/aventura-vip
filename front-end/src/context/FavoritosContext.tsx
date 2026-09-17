// ============================================================================
// CONTEXTO: FAVORITOS
// ----------------------------------------------------------------------------
// Accesos directos personalizables: el usuario puede marcar con una estrella
// los modulos que usa seguido. Se persiste por dispositivo (localStorage).
//
// Uso:
//   const { favoritos, esFavorito, alternarFavorito } = useFavoritos();
// ============================================================================

import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

const CLAVE_FAVORITOS = 'aventura_favoritos';

interface FavoritosContexto {
  favoritos: string[];
  esFavorito: (id: string) => boolean;
  alternarFavorito: (id: string) => void;
}

const ContextoFavoritos = createContext<FavoritosContexto | null>(null);

function favoritosIniciales(): string[] {
  try {
    const guardado = localStorage.getItem(CLAVE_FAVORITOS);
    return guardado ? (JSON.parse(guardado) as string[]) : ['inicio'];
  } catch {
    return ['inicio'];
  }
}

export function FavoritosProvider({ children }: { children: ReactNode }) {
  const [favoritos, setFavoritos] = useState<string[]>(favoritosIniciales);

  function esFavorito(id: string): boolean {
    return favoritos.includes(id);
  }

  function alternarFavorito(id: string) {
    setFavoritos((actuales) => {
      const nuevos = actuales.includes(id)
        ? actuales.filter((f) => f !== id)
        : [...actuales, id];
      localStorage.setItem(CLAVE_FAVORITOS, JSON.stringify(nuevos));
      return nuevos;
    });
  }

  return (
    <ContextoFavoritos.Provider value={{ favoritos, esFavorito, alternarFavorito }}>
      {children}
    </ContextoFavoritos.Provider>
  );
}

export function useFavoritos(): FavoritosContexto {
  const contexto = useContext(ContextoFavoritos);
  if (!contexto) {
    throw new Error('useFavoritos debe usarse dentro de <FavoritosProvider>');
  }
  return contexto;
}
