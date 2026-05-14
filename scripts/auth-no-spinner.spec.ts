// Playwright: sign-in lands on the exact role home in <2s, and the page does
// NOT sit on an auth-context profile-fetch spinner or any other indefinite
// loading state while we wait. Guards against regressions that re-introduce
// `await loadProfile(...)` on the login submit path.
//
// Run: bunx playwright test scripts/auth-no-spinner.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("sign-in routes to /athlete in <2s with no spinner / loading screen", async ({ page }) => {
  await page.goto("/login");
  await page.fill('input[type="email"]', "demo-athlete@cutathletiq.test");
  await page.fill('input[type="password"]', "DemoAthlete!2026");

  const t0 = Date.now();
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/athlete$/, { timeout: 2000 });
  const elapsed = Date.now() - t0;
  expect(elapsed).toBeLessThan(2000);

  // Once on /athlete, the page must not be stuck on a global spinner or
  // "Loading…" placeholder driven by an auth-context profile fetch.
  // We allow tiny inline spinners (e.g. avatar) but not full-screen ones.
  const spinners = page.locator('[role="status"], .animate-spin');
  // No more than 0 visible full-screen-ish loaders; tolerate brief flashes
  // by re-checking after a tick.
  await page.waitForTimeout(150);
  const visibleSpinners = await spinners.evaluateAll((els) =>
    els.filter((el) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      const style = getComputedStyle(el as HTMLElement);
      return style.visibility !== "hidden" && style.display !== "none" && r.width >= 32 && r.height >= 32;
    }).length,
  );
  expect(visibleSpinners).toBe(0);

  // No "Loading…" text anywhere visible on the landed page.
  await expect(page.getByText(/^loading\.?\.?\.?$/i)).toHaveCount(0);
});
