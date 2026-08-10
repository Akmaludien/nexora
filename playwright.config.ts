import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: 1,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3200",
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm run start -- -p 3200",
    port: 3200,
    reuseExistingServer: true,
    timeout: 180_000,
    env: { COOKIE_SECURE: "false", ...process.env } as Record<string, string>,
  },
});