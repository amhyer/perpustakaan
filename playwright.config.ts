import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright E2E test configuration.
 *
 * Usage:
 *   bunx playwright test          # run all tests
 *   bunx playwright test --ui     # UI mode
 *   bunx playwright codegen       # generate tests via browser
 *
 * Required env vars:
 *   BASE_URL — e.g. http://localhost:3001
 */

const PORT = process.env.PORT || "3001";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? "github" : "html",
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    actionTimeout: 10_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    // Uncomment untuk test di browser lain
    // {
    //   name: "firefox",
    //   use: { ...devices["Desktop Firefox"] },
    // },
    // {
    //   name: "webkit",
    //   use: { ...devices["Desktop Safari"] },
    // },
    {
      name: "mobile-chrome",
      use: { ...devices["Pixel 5"] },
    },
  ],
  webServer: process.env.CI
    ? undefined
    : {
        command: "bun run dev",
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 60_000,
        stdout: "pipe",
        stderr: "pipe",
      },
});
