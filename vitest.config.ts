import { defineConfig } from "vitest/config";
import path from "path";
import dotenv from "dotenv";

// Load test environment variables from .env.test
dotenv.config({ path: ".env.test" });

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/server/**/*.{test,spec}.ts"],
    setupFiles: ["src/server/__tests__/setup.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 20000,
  },
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "./src"),
    },
  },
});

