/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        stone: {
          50: '#FAFAF8',
          100: '#F4F4F2',
          200: '#E2E2DE',
          DEFAULT: '#F4F4F2',
        },
        paper: '#FAFAF8',
        charcoal: '#1F1F1F',
        graphite: '#6B6B6B',
        trust: '#2F6F4E',
        clay: '#B07D62',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        tight: ['Inter Tight', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
