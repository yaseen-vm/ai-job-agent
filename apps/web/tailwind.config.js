/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: { 
    extend: {
      colors: {
        paper: '#f0efe9',
        ink: '#161613',
        acid: '#d7ff35',
        line: 'rgba(22, 22, 19, 0.22)',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['"Instrument Serif"', 'serif'],
        mono: ['"DM Mono"', 'monospace'],
      },
    } 
  },
  plugins: [],
};
