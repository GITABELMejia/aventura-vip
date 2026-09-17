// ============================================================================
// PUNTO DE ENTRADA DE REACT (main.tsx)
// ----------------------------------------------------------------------------
// Monta la aplicacion React dentro del elemento #root del index.html.
// Envuelve la app con los proveedores de contexto del dashboard:
//   * TemaProvider      -> modo oscuro/claro.
//   * NavegacionProvider-> sidebar responsive (colapso / drawer).
//   * FavoritosProvider -> accesos directos con estrella.
// ============================================================================

import React from 'react';
import ReactDOM from 'react-dom/client';

import App from './App';
import { TemaProvider } from './context/TemaContext';
import { NavegacionProvider } from './context/NavegacionContext';
import { FavoritosProvider } from './context/FavoritosContext';
import './index.css';

// Se busca el contenedor raiz definido en index.html.
const raiz = document.getElementById('root');

if (raiz) {
  // Se crea la raiz de React y se monta la aplicacion.
  ReactDOM.createRoot(raiz).render(
    <React.StrictMode>
      <TemaProvider>
        <NavegacionProvider>
          <FavoritosProvider>
            <App />
          </FavoritosProvider>
        </NavegacionProvider>
      </TemaProvider>
    </React.StrictMode>
  );
}
