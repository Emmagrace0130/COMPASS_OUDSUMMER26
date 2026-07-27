/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        void:  "rgb(var(--tw-c-void)  / <alpha-value>)",
        dark:  "rgb(var(--tw-c-dark)  / <alpha-value>)",
        panel: "rgb(var(--tw-c-panel) / <alpha-value>)",
        rim:   "rgb(var(--tw-c-rim)   / <alpha-value>)",
        compass: {
          purple: "rgb(var(--tw-c-purple) / <alpha-value>)",
          violet: "rgb(var(--tw-c-violet) / <alpha-value>)",
          pink:   "rgb(var(--tw-c-pink)   / <alpha-value>)",
          cyan:   "rgb(var(--tw-c-cyan)   / <alpha-value>)",
          white:  "rgb(var(--tw-c-white)  / <alpha-value>)",
          muted:  "rgb(var(--tw-c-muted)  / <alpha-value>)",
          // Aliases for components that reference amber/teal directly
          amber:  "#f59e0b",
          teal:   "rgb(var(--tw-c-cyan)   / <alpha-value>)",
        },
      },
      boxShadow: {
        purple: "0 2px 12px rgba(79,70,229,0.18)",
        pink:   "0 2px 12px rgba(220,38,38,0.18)",
        cyan:   "0 2px 12px rgba(5,150,105,0.18)",
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
