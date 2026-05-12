import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright config for the responsive regression test.
 * Run: `bunx playwright test scripts/responsive.spec.ts`
 *
 * One-time setup: `bunx playwright install chromium`.
 */
export default defineConfig({
  testDir: "./scripts",
  testMatch: /.*\.spec\.ts$/,
  timeout: 30_000,
  fullyParallel: false,
  reporter: "list",
  use: {
    baseURL: process.env.BASE_URL ?? "http://localhost:8080",
    headless: true,
    // Capture trace + screenshot on first retry / failure so the
    // invite-banner and auth-layout suites are fast to debug in CI.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  retries: process.env.CI ? 1 : 0,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
