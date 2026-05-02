/** @type {import('tailwindcss').Config} */
export default {
    content: [
      "./index.html",
      "./src/**/*.{js,ts,jsx,tsx}", // C'est cette ligne qui indique à Tailwind de lire App.jsx
    ],
    theme: {
      extend: {},
    },
    plugins: [],
  }