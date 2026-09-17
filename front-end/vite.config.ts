// ============================================================================
// CONFIGURACION DE VITE
// ----------------------------------------------------------------------------
// Vite es el empaquetador (bundler) y servidor de desarrollo del frontend.
//
// Configuracion clave:
//   * plugin: react()   -> compila los archivos JSX/TSX de React.
//   * plugin: VitePWA() -> convierte la app en una PWA (Progressive Web App):
//       - Genera el manifest.json (nombre, colores, iconos, modo standalone).
//       - Genera y registra un Service Worker que guarda en cache los archivos
//         estaticos de la app (funciona sin internet, precache del shell).
//       - Permite "instalar" la app en el movil/desktop como app nativa.
//   * server.proxy      -> redirige /api hacia el backend (localhost:3000).
// ============================================================================

import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Base de la aplicacion en produccion: raiz del dominio (Netlify).
  base: '/',

  plugins: [
    react(),

    // ------------------------------------------------------------------
    // PLUGIN DE PWA
    // ------------------------------------------------------------------
    VitePWA({
      // registerType: 'autoUpdate' -> el Service Worker se actualiza solo
      // cuando hay una nueva version de la app.
      registerType: 'autoUpdate',

      // Si TRUE, el Service Worker se registra automaticamente al construir.
      // (Asi NO necesitamos tocar main.tsx ni index.html manualmente.)
      injectRegister: 'auto',

      // Configuracion del manifest.json (metadata de la app instalable).
      manifest: {
        name: 'Aventura Vip - Sistema de Movilidad',
        short_name: 'Aventura VIP',
        description:
          'Sistema de movilidad privada para la empresa Aventura Vip de Cusco. Gestion de reservas, flota y conductores.',
        theme_color: '#3D271C', // color oficial: marron chocolate (barra del navegador)
        background_color: '#3D271C',
        display: 'standalone', // se abre como app nativa (sin barra del navegador)
        orientation: 'portrait',
        start_url: '/',
        lang: 'es',
        categories: ['transportation', 'business'],
        icons: [
          {
            src: 'icono-192x192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icono-512x512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icono-mascara.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable', // icono con area segura para pantallas adaptativas
          },
        ],
      },

      // Configuracion del Service Worker (workbox).
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // Rutas de la API que se cachean para modo offline (login desde cache).
        navigateFallback: 'index.html',
      },
    }),
  ],

  server: {
    // host: true permite probar la app desde otros dispositivos de la red
    // Wi-Fi local (ej. el celular) usando la IP LAN del Mac.
    host: true,
    port: 5173, // Puerto del servidor de desarrollo del frontend.
    proxy: {
      // Toda peticion a /api se reenvia al backend (Express, puerto 3000).
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },

  // Configuracion del servidor de vista previa (npm run preview), que sirve
  // el build de produccion (dist/) en donde esta la PWA (manifest + sw.js).
  preview: {
    host: true,
    port: 4173,
    // Habilita cualquier nombre de host: necesario para que el tunel HTTPS de
    // Cloudflare (URL ...trycloudflare.com) pueda acceder a la app.
    allowedHosts: true,
  },
});