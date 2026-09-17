// ============================================================================
// CONFIGURACION DE TAILWIND CSS
// ----------------------------------------------------------------------------
// Tailwind es un framework de CSS "utility-first": se escribe el estilo
// directamente en el HTML/JSX con clases utilitarias (ej: "bg-antracita").
//
// PALETA OFICIAL DE LA EMPRESA (identidad corporativa):
//   * marron chocolate #3D271C (CMYK 71 83 88 57) -> escala "antracita":
//       fondos y superficies oscuras calidas de la marca.
//   * dorado ambar #C17C26 (CMYK 28 56 96 0) -> escala "dorado":
//       acentos de lujo (botones, logos, bordes).
//   * hueso      : tonos de texto blanco-rosado equilibrados.
//   * esmeralda  : estado "validado" en formularios.
//   * coral      : estado "error" en formularios.
// ============================================================================

/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        antracita: {
          900: '#221610', // mas profundo (loader)
          850: '#2A1B13', // variante
          800: '#3D271C', // MARCA: marron chocolate (fondo principal)
          700: '#4A3022', // superficie elevada
          600: '#573A29', // tarjetas
        },
        dorado: {
          300: '#EBCB8B', // ambar claro (texto decorativo)
          400: '#D9A64F', // ambar brillante (bordes hover)
          500: '#C17C26', // MARCA: dorado ambar (boton principal)
          600: '#A96A1F', // ambar oscuro (hover)
          700: '#8A5719', // sombra
        },
        hueso: {
          50: '#FDFBF7',
          100: '#F5F2EB', // texto primario
          200: '#EDE7DA',
          300: '#D8D0C2',
          400: '#B8AFA1',
          500: '#9B948A', // texto secundario
        },
        esmeralda: {
          500: '#2FBF8F',
        },
        coral: {
          500: '#E5484D',
        },
      },
      fontFamily: {
        'serif-lujo': ['Azonix', 'Georgia', 'serif'],
        'sans-geo': ['Caviar Dreams', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      // Animaciones personalizadas (loader premium + micro-interacciones).
      animation: {
        'spin-lento': 'spin 6s linear infinite',
        'sello-girar': 'selloGirar 3.5s linear infinite',
        'pulso-suave': 'pulsoSuave 2.2s ease-in-out infinite',
        'fade-in-subir': 'fadeInSubir 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'crecer-barra': 'crecerBarra 0.4s cubic-bezier(0.22, 1, 0.36, 1) both',
        'revelar-logo': 'revelarLogo 0.9s cubic-bezier(0.65, 0, 0.35, 1) both',
        shake: 'shake 0.3s ease-in-out',
      },
      keyframes: {
        selloGirar: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        pulsoSuave: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.45' },
        },
        fadeInSubir: {
          '0%': { opacity: '0', transform: 'translateY(28px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        crecerBarra: {
          '0%': { transform: 'scaleX(0)' },
          '100%': { transform: 'scaleX(1)' },
        },
        revelarLogo: {
          '0%': { clipPath: 'inset(0 100% 0 0)' },
          '100%': { clipPath: 'inset(0 0 0 0)' },
        },
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '25%': { transform: 'translateX(-6px)' },
          '75%': { transform: 'translateX(6px)' },
        },
      },
      boxShadow: {
        'glow-dorado': '0 0 24px rgba(193, 124, 38, 0.45)',
        'glow-dorado-fuerte': '0 0 40px rgba(193, 124, 38, 0.55)',
        'card-vip': '0 20px 60px -15px rgba(0, 0, 0, 0.8)',
      },
      backdropBlur: {
        vip: '24px',
      },
    },
  },
  plugins: [],
};