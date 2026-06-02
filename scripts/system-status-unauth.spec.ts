// Playwright: verify the actual behavior of /system-status for an
// unauthenticated visitor.
//
// VERIFIED BEHAVIOR (src/routes/system-status.tsx):
//   - The route does NOT redirect anonymous users.
//   - It first shows a brief loading spinner while the auth context hydrates
//     (`loading` flag from useAuth).
//   - Once `loading === false` and no admin profile is present, it renders
//     an in-place `role="alert"` access-denied panel with the copy
//     "Only admins can view system status." and a "Go home" button.
//   - `checkStartupHealth` is gated behind `!loading && profile?.role === "admin"`
//     so no _serverFn call is made for anonymous users.
//
// This test asserts that contract holds: no redirect, no blank screen, no
// unhandled _serverFn / [object Response] error, and the access-denied
// alert is visible.
//
// Run: bunx playwright test scripts/system-status-unauth.spec.ts
import { test, expect } from "@playwright/test";

test.use({ viewport: { width: 1280, height: 800 } });

test("/system-status renders the access-denied alert for unauthenticated users", async ({ page }) => {
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

  // No redirect — URL stays on /system-status.
  await expect(page).toHaveURL(/\/system-status$/);

  // Access-denied alert renders (up to 8s to allow auth hydration).
  await expect(
    page.getByRole("alert").filter({ hasText: /only admins can view system status/i }),
  ).toBeVisible({ timeout: 8000 });

  // "Go home" recovery button is present and focusable.
  await expect(page.getByRole("button", { name: /go home/i })).toBeVisible();

  // Page is not blank and no error-fallback copy leaked through.
  await expect(page.locator("body")).not.toBeEmpty();
  await expect(
    page.getByText(/secure check could not finish|something went wrong|runtime error/i),
  ).toHaveCount(0);

  // No _serverFn call should have been attempted while unauthenticated.
  expect(unhandled).toEqual([]);
});
