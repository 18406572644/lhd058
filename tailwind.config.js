/** @type {import('tailwindcss').Config} */

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,ts,vue}'],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        'space-dark': '#1a1a2e',
        'space-deep': '#16213e',
        'electric': '#0fbcf9',
        'electric-light': '#00d2ff',
        'status-ok': '#00e676',
        'status-warn': '#ff9100',
        'status-danger': '#ff1744',
        'text-primary': '#ffffff',
        'text-muted': '#8892b0',
      },
      fontFamily: {
        heading: ['Rajdhani', 'sans-serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
