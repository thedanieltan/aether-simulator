import { defineConfig } from "vite";

export default defineConfig({
  build: {
    outDir: "dist",
    emptyOutDir: true,
    sourcemap: false,
    target: "es2022",
  },
  server: {
    host: "localhost",
    port: 4173,
    strictPort: true,
  },
  preview: {
    host: "localhost",
    port: 4173,
    strictPort: true,
  },
});
