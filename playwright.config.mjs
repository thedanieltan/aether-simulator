import { defineConfig } from "@playwright/test";

const liveBaseUrl = process.env.AETHER_BASE_URL;

export default defineConfig({
  testDir: "./tests/browser",
  timeout: 45_000,
  retries: 0,
  workers: 1,
  reporter: "line",
  use: {
    baseURL: liveBaseUrl ?? "http://localhost:4173",
    browserName: "chromium",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: liveBaseUrl
    ? undefined
    : {
        command: "npm run preview:studio",
        port: 4173,
        reuseExistingServer: false,
        timeout: 30_000,
      },
});
