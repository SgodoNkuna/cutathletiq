// Playwright: at desktop viewport (1280x800), verify /login and /signup render
// the email-only auth UI and never expose a phone-number, SMS, or OTP input.
// This guards against accidental reintroduction of phone-based auth paths.
//
// Run: bunx playwright test scripts/no-phone-auth.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

const PHONE_INPUT_SELECTOR = [
  'input[type="tel"]',
  'input[name*="phone" i]',
  'input[id*="phone" i]',
  'input[autocomplete="tel"]',
  'input[autocomplete="one-time-code"]',
  'input[name*="otp" i]',
  'input[id*="otp" i]',
].join(", ");

for (const path of ["/login", "/signup"]) {
  test(`${path} renders desktop email-only auth (no phone UI)`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Email + password inputs must exist
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]').first()).toBeVisible();

    // No phone/sms/otp inputs anywhere — including hidden ones
    expect(await page.locator(PHONE_INPUT_SELECTOR).count()).toBe(0);

    // No visible "phone", "SMS", or "OTP" auth labels in the form area.
    // (PWA install copy mentioning "phone" lives in protected routes only.)
    const bodyText = (await page.locator("main").innerText()).toLowerCase();
    for (const banned of ["phone number", "sms code", "one-time code", "verify by sms", "send code"]) {
      expect(bodyText).not.toContain(banned);
    }

    // Brand panel should be visible at desktop width (lg: breakpoint)
    await expect(page.locator("aside").first()).toBeVisible();
  });
}
