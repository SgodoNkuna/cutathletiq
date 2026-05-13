// Playwright: /system-status is admin-only.
// Verifies admins can see the status panel, while non-admin users see an
// access-denied state instead of configuration details.
//
// Run: bunx playwright test scripts/system-status-access.spec.ts
import { test, expect, type Page } from "@playwright/test";

async function signInUI(page: Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
}

test.use({ viewport: { width: 1280, height: 800 } });

test("admin can access /system-status", async ({ page }) => {
  await signInUI(page, "demo-admin@cutathletiq.test", "DemoAdmin!2026");
  await expect(page).toHaveURL(/\/admin(\/|$)/, { timeout: 5000 });

  await page.goto("/system-status");
  await expect(page.getByRole("heading", { name: /system status/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/environment secrets/i)).toBeVisible();
});

test("non-admin cannot access /system-status", async ({ page }) => {
  await signInUI(page, "demo-athlete@cutathletiq.test", "DemoAthlete!2026");
  await expect(page).toHaveURL(/\/athlete(\/|$)/, { timeout: 5000 });

  await page.goto("/system-status");
  await expect(page.getByRole("alert").filter({ hasText: /only admins can view system status/i })).toBeVisible({ timeout: 5000 });
  await expect(page.getByText(/environment secrets/i)).toHaveCount(0);
});
