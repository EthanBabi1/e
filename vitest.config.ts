import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  // tsconfig.json sets jsx:"preserve" for Next's own SWC transform — the
  // React plugin here does Vite's own JSX transform for test files that
  // import .tsx (e.g. the email templates), independently of that setting.
  plugins: [react()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    // Image-pipeline tests do real sharp/AVIF encoding work, which is
    // CPU-bound and slower than the default 5s timeout allows.
    testTimeout: 30000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
});
