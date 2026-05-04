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
    trace: "off",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
