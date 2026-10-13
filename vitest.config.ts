import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    testTimeout: 30000,
    fileParallelism: false,
    // High-volume WebSocket/Redis test logs can race Vitest worker teardown.
    // Keep assertions/errors visible; re-enable console logs with --silent=false for debugging.
    silent: true,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
