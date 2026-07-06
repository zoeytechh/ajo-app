/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './src/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}'
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        white: '#FFFFFF',
        plum: '#5C2D5E',
        pink: '#E07DA0',
        lightPink: '#F4B8CE',
        mauve: '#9B6B8E',
        black: '#1A1A1A',
        gray100: '#F7F7F7',
        gray200: '#EEEEEE',
        gray400: '#AAAAAA',
        gray600: '#666666',
        success: '#2ECC71',
        error: '#E74C3C',
        warning: '#F39C12',
        danger: '#E24B4A', // keeping existing
        dark: '#1A1A1A',   // keeping existing
        surface: '#F9F9F9' // keeping existing
      },
      fontSize: {
        xs: 11,
        sm: 13,
        base: 15,
        md: 17,
        lg: 20,
        xl: 24,
        xxl: 30,
        hero: 38,
      },
      borderRadius: {
        sm: 8,
        md: 12,
        lg: 16,
        xl: 24,
        full: 999,
      }
    }
  },
  plugins: []
}
