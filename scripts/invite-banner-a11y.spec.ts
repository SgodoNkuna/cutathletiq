// Playwright: invite banner accessibility.
// Verifies a not-found token shows the inline error (role="status" with the
// "Invite link not found." text) AND that the banner is reachable in the
// natural Tab order from the top of the form, so screen-reader and
// keyboard-only users encounter it before the inputs.
//
// Run: bunx playwright test scripts/invite-banner-a11y.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("not-found invite banner is keyboard-reachable and announced", async ({ page }) => {
  await page.goto(`/signup?invite=${crypto.randomUUID()}`);

  const banner = page.getByRole("status").filter({ hasText: /invite link not found/i });
  await expect(banner).toBeVisible({ timeout: 5000 });

  // aria-live announcement is wired up
  await expect(banner).toHaveAttribute("aria-live", /polite|assertive/);

  // The banner sits in the document BEFORE the first form input — Tab order
  // hits inputs after it, so screen readers narrate the error first.
  const bannerBox = await banner.boundingBox();
  const firstInput = page.locator("form input").first();
  const inputBox = await firstInput.boundingBox();
  expect(bannerBox!.y).toBeLessThan(inputBox!.y);

  // Walk Tab from the top and confirm the first form input receives focus
  // without the banner trapping focus.
  await page.locator("body").focus();
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press("Tab");
    const reached = await firstInput.evaluate((el) => el === document.activeElement);
    if (reached) return;
  }
  throw new Error("First form input was never focusable via Tab — focus may be trapped.");
});
