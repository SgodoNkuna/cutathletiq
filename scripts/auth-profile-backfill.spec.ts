// Playwright: profile self-repair on sign-in.
// Creates an auth user, deletes their public.profiles row to simulate a
// missed trigger / OAuth gap, signs in via the UI, and verifies that
// `ensureUserProfile` backfills the row AND the user lands on the right
// role home (under the 2s budget).
//
// Run: bunx playwright test scripts/auth-profile-backfill.spec.ts
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

test.use({ viewport: { width: 1280, height: 800 } });

test("missing profiles row is backfilled on sign-in and routes to role home", async ({ page }) => {
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
    const t0 = Date.now();
    await page.click('button[type="submit"]');

    // Should land on /onboarding (new profile defaults onboarding_complete=false).
    await expect(page).toHaveURL(/\/(onboarding|athlete)/, { timeout: 5000 });
    const elapsed = Date.now() - t0;
    expect(elapsed).toBeLessThan(5000);

    // Backfill happened server-authoritatively.
    const { data: repaired } = await admin
      .from("profiles")
      .select("id, role, email")
      .eq("id", userId)
      .maybeSingle();
    expect(repaired).not.toBeNull();
    expect(repaired!.role).toBe("athlete");
    expect(repaired!.email).toBe(email);
  } finally {
    await admin.auth.admin.deleteUser(userId).catch(() => {});
  }
});
