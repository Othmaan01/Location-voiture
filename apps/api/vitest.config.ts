import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts", "test/**/*.test.ts"],
    // Les tests d'integration partagent une base : pas de parallelisme entre fichiers.
    fileParallelism: false,
    testTimeout: 20000,
  },
});
