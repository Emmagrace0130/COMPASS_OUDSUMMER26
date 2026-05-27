/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        space:   "#05141c",
        deep:    "#0a2535",
        mid:     "#0f3d52",
        compass: {
          slate: "#36565F",
          steel: "#5F8190",
          mist:  "#E2F0F0",
          black: "#141414",
          glow:  "#00d4e0",
          bright:"#7ef0f7",
        },
      },
      backgroundImage: {
        "radial-glow": "radial-gradient(ellipse at 60% 40%, #0f3d52 0%, #0a2535 50%, #05141c 100%)",
      },
      boxShadow: {
        glow: "0 0 20px rgba(0,212,224,0.35)",
        "glow-lg": "0 0 40px rgba(0,212,224,0.25)",
      },
      keyframes: {
        pulse_glow: {
          "0%, 100%": { opacity: "0.4", transform: "scale(1)" },
          "50%":       { opacity: "0.9", transform: "scale(1.15)" },
        },
        float: {
          "0%, 100%": { transform: "translateY(0px) translateX(0px)" },
          "33%":      { transform: "translateY(-18px) translateX(12px)" },
          "66%":      { transform: "translateY(10px) translateX(-10px)" },
        },
        drift: {
          "0%":   { transform: "translateX(0) translateY(0)" },
          "100%": { transform: "translateX(-50%) translateY(-20px)" },
        },
      },
      animation: {
        pulse_glow: "pulse_glow 3s ease-in-out infinite",
        float:      "float 6s ease-in-out infinite",
        drift:      "drift 20s linear infinite",
      },
    },
  },
  plugins: [],
};
