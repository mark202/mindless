/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,ts,jsx,tsx}", "./components/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['"Inter"', 'sans-serif']
      },
      colors: {
        brand: {
          50: '#ecf5ff',
          100: '#d7eaff',
          200: '#b6d8ff',
          300: '#89bfff',
          400: '#5198ff',
          500: '#256eff',
          600: '#1754e6',
          700: '#1342b4',
          800: '#133b8f',
          900: '#143674'
        }
      }
    }
  },
  plugins: []
};
