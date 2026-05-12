import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0F0F1A',
        surface: '#1C1C2E',
        'surface-2': '#252535',
        border: '#2A2A3E',
        primary: '#FF5A1F',
        ai: '#8B5CF6',
        muted: '#9090A0',
        dim: '#5A5A6A',
        success: '#22C55E',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body: ['DM Sans', 'sans-serif'],
      },
      animation: {
        float: 'float 5s ease-in-out infinite',
        orbit: 'orbit 12s linear infinite',
        'orbit-sm': 'orbit-sm 8s linear infinite',
        shimmer: 'shimmer 1.8s infinite',
      },
    },
  },
  plugins: [],
};

export default config;
