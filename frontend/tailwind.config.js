/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Calm, earthy yoga-studio palette
        sage: {
          50: '#f4f7f4',
          100: '#e6ede6',
          200: '#cddccd',
          300: '#a8c2a8',
          400: '#7fa17f',
          500: '#5d845d',
          600: '#466a46',
          700: '#3a543a',
          800: '#304330',
          900: '#293829',
        },
        sand: {
          50: '#fbf8f3',
          100: '#f5efe2',
          200: '#e9dec6',
          300: '#d8c69e',
          400: '#c4a96f',
          500: '#b3914f',
        },
        terracotta: {
          400: '#d98a6b',
          500: '#c66a48',
          600: '#a8542f',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
