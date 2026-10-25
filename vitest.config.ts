import { defineConfig } from "vitest/config";
export default defineConfig({
  test: {
    include: [
      "packages/**/*.test.ts",
      "apps/api/tests/**/*.test.ts",
      "apps/miniapp/src/**/*.test.ts",
    ],
    testTimeout: 15000,
    fileParallelism: false,
  },
});
