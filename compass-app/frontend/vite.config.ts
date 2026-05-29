import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/chat": "http://localhost:8021",
      "/health": "http://localhost:8021",
      "/data": "http://localhost:8021",
    },
  },
});
