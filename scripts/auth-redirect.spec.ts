// Playwright: end-to-end auth-redirect timing.
//
// 1. New user with onboarding_complete=false → after sign-in lands on
//    /onboarding immediately (not the role home).
// 2. Demo athlete (onboarding complete) → after sign-in lands on /athlete in
//    under 2s. The login page fast-paths the navigate after
//    signInWithPassword without waiting for the auth-context listener, so
//    this guards against regressions that re-introduce that wait.
//
// Run:  bunx playwright test scripts/auth-redirect.spec.ts
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

test.use({ viewport: { width: 1280, height: 800 } });

async function signInUI(page: import("@playwright/test").Page, email: string, password: string) {
  await page.goto("/login");
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  const t0 = Date.now();
  await page.click('button[type="submit"]');
  return t0;
}

test("new user with onboarding_complete=false lands on /onboarding", async ({ page }) => {
  const email = `e2e-onb-${Date.now()}@cutathletiq.test`;
  const password = "TestPass!2026";
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { first_name: "New", last_name: "User", role: "athlete" },
  });
  if (error) throw error;
  const userId = created.user!.id;

  // Force onboarding flag false (handle_new_user trigger may default it).
  await admin.from("profiles").update({ onboarding_complete: false }).eq("id", userId);

  try {
    await signInUI(page, email, password);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 5000 });
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});

test("sign-in routes to role home in under 2s without waiting on profile listener", async ({ page }) => {
  // Use the seeded demo athlete (onboarding_complete=true).
  const email = "demo-athlete@cutathletiq.test";
  const password = "DemoAthlete!2026";

  const t0 = await signInUI(page, email, password);
  await expect(page).toHaveURL(/\/athlete(\/|$)/, { timeout: 2000 });
  const elapsed = Date.now() - t0;
  console.log(`sign-in → /athlete navigation: ${elapsed}ms`);
  expect(elapsed).toBeLessThan(2000);
});
