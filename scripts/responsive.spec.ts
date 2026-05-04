/**
 * Real-browser regression for MobileFrame at the 768px (md) breakpoint.
 *
 * Verifies:
 *   • Below 768px → mobile phone-shell card is rendered (rounded border-navy-deep frame).
 *   • At/above 768px → desktop sidebar (<aside> with role nav) is rendered.
 *   • Live resize across the boundary in BOTH directions flips the layout
 *     without a page reload.
 *
 * This test requires an authenticated user. To skip auth, set TEST_AUTH_EMAIL
 * and TEST_AUTH_PASSWORD env vars. If unset, the test signs in via the /login
 * page using SMOKE_EMAIL / SMOKE_PASSWORD (created by smoke-test.mjs).
 *
 * Run: `bunx playwright test scripts/responsive.spec.ts`
 */
import { test, expect, type Page } from "@playwright/test";

const EMAIL = process.env.TEST_AUTH_EMAIL ?? process.env.SMOKE_EMAIL;
const PASSWORD = process.env.TEST_AUTH_PASSWORD ?? process.env.SMOKE_PASSWORD;

async function loginIfNeeded(page: Page) {
  if (!EMAIL || !PASSWORD) {
    test.skip(true, "TEST_AUTH_EMAIL/PASSWORD not provided");
    return;
  }
  await page.goto("/login");
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(athlete|coach|physio|admin|onboarding)/, { timeout: 10_000 });
}

test.describe("MobileFrame breakpoint regression", () => {
  test("renders phone shell below 768px", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 900 });
    await loginIfNeeded(page);
    // Phone shell: the rounded card with the chunky navy border.
    const shell = page.locator('div.border-navy-deep').first();
    await expect(shell).toBeVisible({ timeout: 5_000 });
    await expect(page.locator("aside")).toHaveCount(0);
  });

  test("renders desktop sidebar at/above 768px", async ({ page }) => {
    await page.setViewportSize({ width: 1200, height: 900 });
    await loginIfNeeded(page);
    await expect(page.locator("aside").first()).toBeVisible({ timeout: 5_000 });
  });

  test("live resize flips layout without reload", async ({ page }) => {
    await page.setViewportSize({ width: 500, height: 900 });
    await loginIfNeeded(page);
    await expect(page.locator('div.border-navy-deep').first()).toBeVisible();

    // Grow → desktop
    await page.setViewportSize({ width: 1200, height: 900 });
    await expect(page.locator("aside").first()).toBeVisible({ timeout: 3_000 });
    await expect(page.locator('div.border-navy-deep')).toHaveCount(0);

    // Shrink → mobile
    await page.setViewportSize({ width: 500, height: 900 });
    await expect(page.locator('div.border-navy-deep').first()).toBeVisible({ timeout: 3_000 });
    await expect(page.locator("aside")).toHaveCount(0);
  });

  test("md boundary itself (768px) is desktop", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 900 });
    await loginIfNeeded(page);
    await expect(page.locator("aside").first()).toBeVisible({ timeout: 5_000 });
  });

  test("just-below md (767px) is mobile", async ({ page }) => {
    await page.setViewportSize({ width: 767, height: 900 });
    await loginIfNeeded(page);
    await expect(page.locator('div.border-navy-deep').first()).toBeVisible({ timeout: 5_000 });
  });
});
