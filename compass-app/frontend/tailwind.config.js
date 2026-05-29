/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        void:  "#0a0a18",
        dark:  "#12122a",
        panel: "#1a1a35",
        rim:   "#252550",
        compass: {
          purple: "#7c3aed",
          violet: "#a855f7",
          pink:   "#ec4899",
          cyan:   "#06b6d4",
          white:  "#f0f0ff",
          muted:  "#6b6b9a",
        },
      },
      boxShadow: {
        purple: "0 0 20px rgba(124,58,237,0.4)",
        pink:   "0 0 20px rgba(236,72,153,0.35)",
        cyan:   "0 0 20px rgba(6,182,212,0.35)",
      },
      keyframes: {
        pulse_purple: {
          "0%, 100%": { opacity: "0.5", transform: "scale(1)" },
          "50%":       { opacity: "1",   transform: "scale(1.12)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "33%":      { transform: "translateY(-18px) translateX(12px)" },
          "66%":      { transform: "translateY(10px) translateX(-10px)" },
        },
        spin_slow: {
          "0%":   { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        pulse_purple: "pulse_purple 3s ease-in-out infinite",
        float:        "float 6s ease-in-out infinite",
        spin_slow:    "spin_slow 28s linear infinite",
      },
    },
  },
  plugins: [],
};
