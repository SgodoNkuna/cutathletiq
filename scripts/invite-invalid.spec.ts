// Playwright: visiting /signup with a totally invalid invite token must
// render the inline "Invite link not found." error inside the banner. This
// is a focused smoke that complements scripts/invite-banner.spec.ts.
//
// Run: bunx playwright test scripts/invite-invalid.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

for (const token of [
  "definitely-not-a-real-token-xyz",
  "00000000-0000-0000-0000-000000000000",
  "!!!invalid!!!",
]) {
  test(`invalid invite token "${token}" → not-found banner`, async ({ page }) => {
    await page.goto(`/signup?invite=${encodeURIComponent(token)}`);
    const banner = page.getByRole("status").filter({ hasText: /invite link not found/i });
    await expect(banner).toBeVisible({ timeout: 5000 });
  });
}
