/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        surface: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#134e4a',
          800: '#0f2a2e',
          900: '#0a1a1e',
          950: '#060f12',
        },
        accent: '#06b6d4',
        'accent-hover': '#0891b2',
        'accent-muted': 'rgba(6,182,212,0.12)',
        'accent-soft': 'rgba(6,182,212,0.25)',
        success: '#22c55e',
        danger: '#ef4444',
        glass: {
          white: 'rgba(255,255,255,0.07)',
          border: 'rgba(255,255,255,0.12)',
          'border-light': 'rgba(255,255,255,0.15)',
          subtle: 'rgba(255,255,255,0.04)',
          highlight: 'rgba(255,255,255,0.10)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      backdropBlur: {
        glass: '30px',
        'glass-heavy': '40px',
      },
      borderRadius: {
        glass: '14px',
        'glass-lg': '16px',
      },
      boxShadow: {
        glass: 'inset 0 1px 0 rgba(255,255,255,0.08), 0 4px 24px rgba(0,0,0,0.2)',
        'glass-lg': 'inset 0 1px 0 rgba(255,255,255,0.1), 0 8px 32px rgba(0,0,0,0.3)',
        glow: '0 0 12px rgba(6,182,212,0.4)',
        'glow-lg': '0 0 20px rgba(6,182,212,0.3)',
      },
    },
  },
  plugins: [],
};
