import { clientUrl } from "./shared/runtime.mjs";

import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  workers: 1,
  fullyParallel: false,
  timeout: 30000,
  expect: { timeout: 10000 },
  outputDir: "tmp/playwright-results",
  reporter: [["list"]],
  use: {
    baseURL: process.env.TEST_BASE_URL || clientUrl(),
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command: "npm.cmd run dev",
    url: process.env.TEST_BASE_URL || clientUrl(),
    reuseExistingServer: !process.env.CI,
    timeout: 60000,
  },
});
