import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [preact(), tailwindcss()],
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:8080"
    }
  },
  build: {
    outDir: "dist/client",
    emptyOutDir: true,
    sourcemap: false
  },
  test: {
    environment: "jsdom",
    globals: true
  }
});
