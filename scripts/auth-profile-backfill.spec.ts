// Playwright: profile self-repair on sign-in.
// Creates an auth user, deletes their public.profiles row to simulate a
// missed trigger / OAuth gap, signs in via the UI, and verifies that
// `ensureUserProfile` backfills the row and the user lands on the exact
// expected URL for their state.
//
// Because a freshly-backfilled profile defaults `onboarding_complete = false`,
// the login page must route to /onboarding (not the role home). Once we mark
// onboarding complete and reload, the next visit must land on the exact role
// home for an athlete: /athlete.
//
// Run: bunx playwright test scripts/auth-profile-backfill.spec.ts
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

test.use({ viewport: { width: 1280, height: 800 } });

test("missing profiles row is backfilled and redirects to the exact expected URL", async ({ page }) => {
  const email = `e2e-backfill-${Date.now()}@cutathletiq.test`;
  const password = "TestPass!2026";

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: "Back",
      last_name: "Fill",
      role: "athlete",
      consent_coach_training: true,
      consent_physio_health: true,
    },
  });
  if (error) throw error;
  const userId = created.user!.id;

  // Simulate the failure mode: auth.users exists but public.profiles row is missing.
  await admin.from("profiles").delete().eq("id", userId);
  const { data: gone } = await admin.from("profiles").select("id").eq("id", userId).maybeSingle();
  expect(gone).toBeNull();

  try {
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');

    // Backfilled profile defaults onboarding_complete=false → exact /onboarding.
    await expect(page).toHaveURL(/\/onboarding$/, { timeout: 5000 });
    expect(new globalThis.URL(page.url()).pathname).toBe("/onboarding");

    // Backfill happened with the right shape.
    const { data: repaired } = await admin
      .from("profiles")
      .select("id, role, email, onboarding_complete")
      .eq("id", userId)
      .maybeSingle();
    expect(repaired).not.toBeNull();
    expect(repaired!.role).toBe("athlete");
    expect(repaired!.email).toBe(email);
    expect(repaired!.onboarding_complete).toBe(false);

    // Mark onboarding complete and confirm the next sign-in lands on the
    // exact role home for an athlete.
    await admin.from("profiles").update({ onboarding_complete: true }).eq("id", userId);
    await page.context().clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/athlete$/, { timeout: 5000 });
    expect(new globalThis.URL(page.url()).pathname).toBe("/athlete");
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});
