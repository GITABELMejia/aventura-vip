// ============================================================================
// HOOK: useMediaQuery
// ----------------------------------------------------------------------------
// Detecta si una consulta de medios CSS coincide (breakpoints del layout).
// Se usa para saber si la pantalla es movil (<768), tablet (768-1023) o
// escritorio (>=1024) y adaptar la barra lateral.
// ============================================================================

import { useEffect, useState } from 'react';

export function useMediaQuery(consulta: string): boolean {
  const [coincide, setCoincide] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(consulta).matches
  );

  useEffect(() => {
    const media = window.matchMedia(consulta);
    const manejarCambio = () => setCoincide(media.matches);

    setCoincide(media.matches);
    media.addEventListener('change', manejarCambio);
    return () => media.removeEventListener('change', manejarCambio);
  }, [consulta]);

  return coincide;
}
