/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#FF5A1F',
        'primary-dark': '#E04010',
        secondary: '#1A1A2E',
        accent: '#FFD700',
        background: '#0F0F1A',
        surface: '#1C1C2E',
        'surface-light': '#252535',
        border: '#2A2A3E',
        ai: '#8B5CF6',
      },
    },
  },
  plugins: [],
};
