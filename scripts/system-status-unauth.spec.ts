// Playwright: unauthenticated visitors must see a rendered access-denied
// state on /system-status, not a blank screen or unhandled _serverFn error.
//
// Run: bunx playwright test scripts/system-status-unauth.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("/system-status renders safely for unauthenticated users", async ({ page }) => {
  const unhandled: string[] = [];

  page.on("pageerror", (error) => unhandled.push(error.message));
  page.on("console", (message) => {
    if (message.type() !== "error") return;
    const text = message.text();
    if (/_serverFn|\[object Response\]|Runtime error|Unhandled|checkStartupHealth/i.test(text)) {
      unhandled.push(text);
    }
  });

  await page.context().clearCookies();
  await page.goto("/system-status");

  await expect(
    page.getByRole("alert").filter({ hasText: /only admins can view system status/i }),
  ).toBeVisible({ timeout: 5000 });

  await expect(page.locator("body")).not.toBeEmpty();
  await expect(page.getByText(/secure check could not finish|something went wrong|runtime error/i)).toHaveCount(0);
  expect(unhandled).toEqual([]);
});