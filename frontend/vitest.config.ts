import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    env: {
      VITE_GOOGLE_CLIENT_ID: "workspace-test-client",
      VITE_API_BASE_URL: "",
      VITE_STATIC_SITE: "0",
    },
  },
});
