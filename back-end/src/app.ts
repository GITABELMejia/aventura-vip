// ============================================================================
// APLICACION EXPRESS
// ----------------------------------------------------------------------------
// Este archivo arma la aplicacion de Express: configura los middlewares
// globales y monta las rutas de cada modulo.
//
// Estructura del proyecto:
//   src/
//     app.ts                          <- este archivo (arma la app)
//     server.ts                       <- arranca el servidor HTTP
//     config/
//       database.ts                   <- conexiones a PostgreSQL (pool)
//       env.ts                        <- validacion de variables de entorno
//     middlewares/
//       auth.middleware.ts            <- validacion de tokens JWT
//       error.middleware.ts           <- manejador global de errores
//     controllers/
//       auth.controller.ts            <- logica de login y /me
//     routes/
//       auth.routes.ts                <- endpoints de auth
//     modules/
//       auth/
//         auth.types.ts               <- tipos e interfaces del modulo
// ============================================================================

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { manejadorDeErrores } from './middlewares/error.middleware';
import { env } from './config/env';

// Rutas de los modulos.
import authRoutes from './routes/auth.routes';
import usuariosRoutes from './routes/usuarios.routes';
import catalogosRoutes from './routes/catalogos.routes';
import organizacionRoutes from './routes/organizacion.routes';
import documentosRoutes from './routes/documents.routes';
import reservasRoutes from './routes/reservas.routes';
import serviciosRoutes from './routes/servicios.routes';
import configuracionRoutes from './routes/configuracion.routes';

// Se crea la aplicacion.
const app = express();

// ----------------------------------------------------------------------------
// MIDDLEWARES GLOBALES
// ----------------------------------------------------------------------------
// 1) helmet()  : agrega cabeceras HTTP de seguridad (X-Frame-Options, etc).
// 2) morgan()  : registra en la consola cada peticion HTTP que recibe la API
//    (metodo, ruta, codigo de estado y tiempo de respuesta). Facilita depurar
//    y monitorear el trafico del servidor en tiempo real.
// 3) cors()    : permite que el frontend (otra direccion/puerto) llame a la API.
//    En desarrollo acepta los origenes locales; en produccion se configuran
//    en la variable CORS_ORIGENES del .env.
// 4) express.json() : convierte automaticamente el cuerpo JSON de las
//    peticiones (req.body) a un objeto de JavaScript.
// ----------------------------------------------------------------------------
app.use(helmet());
app.use(morgan('dev'));
app.use(
  cors({
    origin: env.corsOrigenes,
  })
);
// Limite elevado (10mb) para permitir la subida de fotografias en base64
// (documentos del conductor; max 5 MB por imagen + sobrecarga del base64).
app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------------------------------
// RUTAS
// ----------------------------------------------------------------------------
// Todas las rutas de autenticacion viven bajo /api/auth.
//   POST /api/auth/login  -> login
//   GET  /api/auth/me     -> perfil del usuario autenticado
// Gestion de usuarios (requiere permiso GESTIONAR_USUARIOS) bajo /api/usuarios.
// Catalogos para formularios bajo /api/catalogos.
// ----------------------------------------------------------------------------
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/catalogos', catalogosRoutes);
app.use('/api/organizacion', organizacionRoutes);
app.use('/api', documentosRoutes);
app.use('/api/reservas', reservasRoutes);
app.use('/api/servicios', serviciosRoutes);
app.use('/api/configuracion', configuracionRoutes);

// ----------------------------------------------------------------------------
// RUTA RAZ / BIENVENIDA
// ----------------------------------------------------------------------------
// Permite comprobar rapido que el servidor esta vivo desde el navegador:
//   http://localhost:3000/
// ----------------------------------------------------------------------------
app.get('/', (_req, res) => {
  res.json({
    nombre: 'API Aventura Vip de Cusco',
    version: '1.0.0',
    estado: 'Servidor en linea',
    documentacion: 'Consulta la guia de la API para ver los endpoints.',
  });
});

// ----------------------------------------------------------------------------
// FRONTEND (PRODUCCION)
// ----------------------------------------------------------------------------
// Si existe el build del frontend (front-end/dist), se sirve como estatico y
// las rutas que no son /api devuelven index.html (SPA). Asi el backend y el
// frontend comparten el mismo origen y el API_BASE='/api' funciona tal cual.
// ----------------------------------------------------------------------------
const rutaFrontend = path.resolve(__dirname, '../../front-end/dist');
if (fs.existsSync(rutaFrontend)) {
  app.use(express.static(rutaFrontend));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(rutaFrontend, 'index.html'));
  });
}

// ----------------------------------------------------------------------------
// MANEJO DE RUTAS INEXISTENTES (HTTP 404)
// ----------------------------------------------------------------------------
// Si el cliente pide una ruta que no existe, devolvemos un JSON claro.
// ----------------------------------------------------------------------------
app.use((_req, res) => {
  res.status(404).json({ mensaje: 'Ruta no encontrada' });
});

// ----------------------------------------------------------------------------
// MANEJADOR GLOBAL DE ERRORES (SIEMPRE al final)
// ----------------------------------------------------------------------------
// Captura cualquier error inesperado que se propague por los middlewares o
// controladores y responde con un JSON estandarizado en lugar de crashear.
// Debe registrarse despues de las rutas.
// ----------------------------------------------------------------------------
app.use(manejadorDeErrores);

// Se exporta la aplicacion para que server.ts la levante.
export default app;
