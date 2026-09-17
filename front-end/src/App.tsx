// ============================================================================
// COMPONENTE PRINCIPAL DE LA APLICACION
// ----------------------------------------------------------------------------
// Es el punto de montaje de React. Simplemente renderiza el enrutador
// (AppRouter), que se encarga de mostrar la pagina correcta segun la URL.
// ============================================================================

import AppRouter from './router';

export default function App() {
  return <AppRouter />;
}