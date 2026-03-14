/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: '#141414',
        surface: '#1f1f1f',
        primary: '#e50914',
        textPrimary: '#ffffff',
        textSecondary: '#b3b3b3',
      },
    },
  },
  plugins: [],
}
