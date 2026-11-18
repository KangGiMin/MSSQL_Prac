import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pages",
  workers: 1,
  timeout: 45000,
  expect: { timeout: 15000 },
  outputDir: "tmp/pages-test-results",
  reporter: [["list"]],
  use: {
    baseURL: process.env.TEST_BASE_URL || "http://127.0.0.1:4174/MSSQL_Prac/",
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: process.env.TEST_BASE_URL
    ? undefined
    : {
        command:
          "node node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4174 --strictPort --base /MSSQL_Prac/",
        url: "http://127.0.0.1:4174/MSSQL_Prac/",
        reuseExistingServer: false,
      },
});
