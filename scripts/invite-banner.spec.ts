// Playwright: verifies the signup invite banner renders the correct inline
// role="alert" / role="status" message for not-found, expired, and used
// tokens. Mints real tokens via Supabase service role so the lookup RPC the
// page calls returns the expected `expired` / `used` flags.
//
// Run:  bunx playwright test scripts/invite-banner.spec.ts
import { test, expect } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

const URL = process.env.SUPABASE_URL!;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } });

async function getDemoTeam() {
  const { data: coach } = await admin
    .from("profiles").select("id").eq("email", "demo-coach@cutathletiq.test").maybeSingle();
  if (!coach) throw new Error("Run scripts/seed-demo-accounts.mjs first.");
  const { data: team } = await admin
    .from("teams").select("id, name").eq("coach_id", coach.id).maybeSingle();
  if (!team) throw new Error("Demo team missing.");
  return { coachId: coach.id as string, team };
}

async function mint(team_id: string, created_by: string, opts: { expiresInMs?: number; used?: boolean } = {}) {
  const token = crypto.randomUUID();
  const row: Record<string, unknown> = {
    team_id, token, created_by,
    expires_at: new Date(Date.now() + (opts.expiresInMs ?? 86400_000)).toISOString(),
  };
  if (opts.used) { row.used_at = new Date().toISOString(); row.used_by = created_by; }
  const { error } = await admin.from("team_invites").insert(row);
  if (error) throw error;
  return token;
}

test.use({ viewport: { width: 1280, height: 800 } });

test("invite banner — not found", async ({ page }) => {
  await page.goto(`/signup?invite=${crypto.randomUUID()}`);
  const banner = page.getByRole("status").filter({ hasText: /invite link not found/i });
  await expect(banner).toBeVisible({ timeout: 5000 });
});

test("invite banner — expired", async ({ page }) => {
  const { coachId, team } = await getDemoTeam();
  const token = await mint(team.id, coachId, { expiresInMs: -86400_000 });
  try {
    await page.goto(`/signup?invite=${token}`);
    const banner = page.getByRole("status").filter({ hasText: /invite has expired/i });
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText(team.name);
  } finally {
    await admin.from("team_invites").delete().eq("token", token);
  }
});

test("invite banner — already used", async ({ page }) => {
  const { coachId, team } = await getDemoTeam();
  const token = await mint(team.id, coachId, { used: true });
  try {
    await page.goto(`/signup?invite=${token}`);
    const banner = page.getByRole("status").filter({ hasText: /already been used/i });
    await expect(banner).toBeVisible({ timeout: 5000 });
    await expect(banner).toContainText(team.name);
  } finally {
    await admin.from("team_invites").delete().eq("token", token);
  }
});
