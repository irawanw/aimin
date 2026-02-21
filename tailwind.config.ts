import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef2ff',
          100: '#e0e7ff',
          200: '#c7d2fe',
          300: '#a5b4fc',
          400: '#818cf8',
          500: '#6366f1',
          600: '#4f46e5',
          700: '#4338ca',
          800: '#3730a3',
          900: '#312e81',
          950: '#1e1b4b',
        },
        mint: {
          50: '#f0fdf9',    // Very light mint
          100: '#ccfbf1',   // Light mint
          200: '#99f6e4',   // Soft mint
          300: '#5eead4',   // Medium mint
          400: '#2dd4bf',   // Primary mint
          500: '#14b8a6',   // Brand color (WhatsApp-like but softer)
          600: '#0d9488',   // Darker mint
          700: '#0f766e',   // Dark mint
          800: '#115e59',   // Deep mint
          900: '#134e4a',   // Very deep mint
          950: '#042f2e',   // Almost black with mint tint
        },
      },
      fontFamily: {
        sans: ['Space Grotesk', 'system-ui', 'sans-serif'],
        mono: ['Space Mono', 'monospace'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
