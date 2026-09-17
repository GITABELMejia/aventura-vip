// ============================================================================
// CONFIGURACION DE POSTCSS
// ----------------------------------------------------------------------------
// PostCSS es el procesador de CSS que usa Vite. Aqui se registra Tailwind
// y Autoprefixer para que funcionen durante el build y el servidor de dev.
// ============================================================================

export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};