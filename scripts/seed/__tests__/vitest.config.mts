import { defineConfig } from "vitest/config";
import { resolve } from "node:path";

export default defineConfig({
  test: {
    include: [resolve(__dirname, "*.test.ts")],
    environment: "node",
    globals: false,
  },
});
