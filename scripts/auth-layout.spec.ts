// Playwright: desktop layout stability for /login and /signup at 1280x800.
// Verifies the brand <aside> is visible, the form panel is horizontally
// centered within tolerance, and bounding boxes do NOT shift while the
// Supabase auth listener fires (no reflow flicker on auth state changes).
//
// Run:  bunx playwright test scripts/auth-layout.spec.ts
import { test, expect, type Page } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

async function boxOf(page: Page, selector: string) {
  const el = page.locator(selector).first();
  await expect(el).toBeVisible();
  const box = await el.boundingBox();
  if (!box) throw new Error(`No bounding box for ${selector}`);
  return box;
}

for (const path of ["/login", "/signup"]) {
  test(`${path} — desktop layout is stable and centered`, async ({ page }) => {
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    // Brand aside visible at lg: breakpoint
    const aside = await boxOf(page, "aside");
    expect(aside.width).toBeGreaterThan(400);

    // Form panel exists, sits to the right of the aside
    const form = await boxOf(page, "form");
    expect(form.x).toBeGreaterThan(aside.x + aside.width - 1);

    // Form panel is roughly centered within the right column (within ~80px)
    const panelCol = 1280 - (aside.x + aside.width);
    const formCenter = form.x + form.width / 2;
    const colCenter = aside.x + aside.width + panelCol / 2;
    expect(Math.abs(formCenter - colCenter)).toBeLessThan(80);

    // Capture box, wait for any deferred auth listener tick, re-measure.
    const before = await form.x;
    await page.waitForTimeout(750); // auth-context onAuthStateChange + getSession settle
    const after = (await boxOf(page, "form")).x;
    expect(Math.abs(after - before)).toBeLessThan(2); // no reflow
  });
}
