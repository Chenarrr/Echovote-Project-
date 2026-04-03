/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          purple: '#7C3AED',
          pink: '#EC4899',
          dark: '#0F0F1A',
          card: '#1A1A2E',
          border: '#2D2D4E',
        },
      },
    },
  },
  plugins: [],
};
