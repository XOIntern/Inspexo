import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "."),
    },
  },
  test: {
    globals: true,
    // Server-side auth tests must NEVER run under jsdom: projects pin the
    // environment per directory instead of relying on per-file docblocks.
    projects: [
      {
        test: {
          name: "web",
          environment: "jsdom",
          setupFiles: ["./vitest.setup.ts"],
          include: ["tests/*.test.{ts,tsx}"],
        },
      },
      {
        test: {
          name: "auth",
          environment: "node",
          include: ["tests/auth/**/*.test.ts"],
        },
      },
    ],
  },
});
