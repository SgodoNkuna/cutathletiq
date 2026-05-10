import { test, expect } from "@playwright/test";

/**
 * E2E for the "New version available" banner. Mocks /version.json to return
 * one value on first hit and a different value on subsequent polls, then
 * verifies the banner appears and can be dismissed without a full reload.
 *
 * Run:  bunx playwright test scripts/update-prompt.spec.ts
 *       (set BASE_URL to the running preview if not http://localhost:8080)
 */
test("update prompt appears and is dismissable on desktop", async ({ page }) => {
  // Speed up polling to ~250ms inside the app (UpdatePrompt reads this).
  await page.addInitScript(() => {
    (window as unknown as { __UPDATE_POLL_MS?: number }).__UPDATE_POLL_MS = 250;
  });

  let calls = 0;
  await page.route("**/version.json**", async (route) => {
    calls += 1;
    const body = JSON.stringify({ version: calls === 1 ? "v1-initial" : "v2-new" });
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      headers: { "cache-control": "no-store" },
      body,
    });
  });

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/login"); // public route — doesn't need auth

  // Banner appears once the second poll resolves with a new version.
  const prompt = page.getByTestId("update-prompt");
  await expect(prompt).toBeVisible({ timeout: 5000 });
  await expect(prompt).toContainText(/new version is available/i);

  // Capture URL to assert no full navigation happens on dismiss.
  const before = page.url();
  await page.getByTestId("update-prompt-dismiss").click();
  await expect(prompt).toBeHidden();
  expect(page.url()).toBe(before);
});

test("update prompt also visible on mobile viewport", async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __UPDATE_POLL_MS?: number }).__UPDATE_POLL_MS = 250;
  });
  let calls = 0;
  await page.route("**/version.json**", async (route) => {
    calls += 1;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ version: calls === 1 ? "a" : "b" }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/login");
  await expect(page.getByTestId("update-prompt")).toBeVisible({ timeout: 5000 });
});
