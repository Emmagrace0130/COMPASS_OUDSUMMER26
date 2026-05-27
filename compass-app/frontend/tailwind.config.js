/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        compass: {
          blue: "#1e40af",
          teal: "#0d9488",
          slate: "#475569",
        },
      },
    },
  },
  plugins: [],
};
