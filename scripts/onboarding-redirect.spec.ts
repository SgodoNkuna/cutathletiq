// Playwright: a freshly-created user with onboarding_complete=false logs in
// and lands on /onboarding. Verifies the welcome heading and the primary
// "Continue" CTA render immediately (not behind a spinner).
//
// Run: bunx playwright test scripts/onboarding-redirect.spec.ts
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

test.use({ viewport: { width: 1280, height: 800 } });

test("new user with onboarding_complete=false sees onboarding heading + CTA after login", async ({ page }) => {
  const email = `e2e-onb-cta-${Date.now()}@cutathletiq.test`;
  const password = "TestPass!2026";
  const { data: created, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { first_name: "Casey", last_name: "New", role: "athlete" },
  });
  if (error) throw error;
  const userId = created.user!.id;
  await admin.from("profiles").update({ onboarding_complete: false, first_name: "Casey" }).eq("id", userId);

  try {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 5000 });

    // Welcome heading mentions the user's first name
    await expect(page.getByText(/welcome, casey/i)).toBeVisible({ timeout: 3000 });

    // Primary CTA is the "Continue" button, visible and enabled
    const cta = page.getByRole("button", { name: /^continue$/i });
    await expect(cta).toBeVisible();
    await expect(cta).toBeEnabled();
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});
