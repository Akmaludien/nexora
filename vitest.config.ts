import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    globals: true,
    exclude: ["node_modules/**", "tests/**", "dist/**"],
  },
  resolve: { alias: { "@": new URL("./src", import.meta.url).pathname } },
});
