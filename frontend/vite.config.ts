import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  // Relative assets work at both /thewhitecoder/ and the custom domain root.
  base: process.env.VITE_STATIC_SITE === "1" ? "./" : "/",
  plugins: [react(), tailwindcss()],
  server: {
    port: 5173,
    headers: { "Referrer-Policy": "no-referrer-when-downgrade" },
    proxy: { "/api": "http://127.0.0.1:8000" },
  },
});
