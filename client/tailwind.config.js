/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'brand': {
          'dark-green': '#1a5f3c',
          'muted-green': '#2d7a4f',
          'neon-green': '#77dd3c',
          'black': '#1a1a1a'
        },
        'neutral': {
          '50': '#f9fafb',
          '200': '#e5e7eb',
          '400': '#9ca3af',
          '600': '#4b5563'
        },
        'system': {
          'success-green': '#10b981'
        }
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
} 