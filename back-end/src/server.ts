// ============================================================================
// PUNTO DE ENTRADA DEL SERVIDOR
// ----------------------------------------------------------------------------
// Este archivo ARRANCA el servidor HTTP. Importa la aplicacion armada en
// app.ts y la pone a escuchar en el puerto indicado en config/env.ts.
//
// Comandos para ejecutarlo:
//   npm run dev    -> modo desarrollo (se reinicia al guardar cambios).
//   npm run build && npm start -> modo produccion (compila y ejecuta).
// ============================================================================

import app from './app';
import { env } from './config/env';

// Puerto del servidor (validado y centralizado en config/env.ts).
const PORT = env.port;

// Se arranca el servidor. El callback se ejecuta cuando ya esta escuchando.
app.listen(PORT, () => {
  console.log('=================================================');
  console.log('  API Aventura Vip de Cusco - SERVIDOR EN LINEA');
  console.log('=================================================');
  console.log(`  Direccion:      http://localhost:${PORT}`);
  console.log('  Endpoints:');
  console.log(`    POST  /api/auth/login   -> iniciar sesion`);
  console.log(`    GET   /api/auth/me      -> perfil del usuario`);
  console.log('=================================================');
});
