/** @type {import('tailwindcss').Config} */
export default {
  // CRITICAL: This enables class-based dark mode
  darkMode: 'class', 
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        earth: {
          50: '#faf8f3',
          100: '#f5f1e6',
          200: '#e8dfc7',
          300: '#d9c9a0',
          400: '#c9b27a',
          500: '#b89b5c',
          600: '#a17f4a',
          700: '#85653d',
          800: '#6c5335',
          900: '#58442d',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'sans-serif'],
        display: ['Space Grotesk', 'sans-serif'],
      },
    },
  },
  plugins: [],
}