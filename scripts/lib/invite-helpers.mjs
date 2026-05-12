// Shared helpers for invite-related E2E scripts. Centralises Supabase client
// bootstrap, demo coach/team lookup, and invite row factories so individual
// test scripts (errors, not-found, race, permission, smoke) stay tiny.
import { createClient } from "@supabase/supabase-js";

export function envOrDie() {
  const url = process.env.SUPABASE_URL;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !anon) {
    console.error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY");
    process.exit(1);
  }
  return { url, service, anon };
}

export function makeClients({ requireService = true } = {}) {
  const { url, service, anon } = envOrDie();
  if (requireService && !service) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }
  return {
    admin: service ? createClient(url, service, { auth: { persistSession: false } }) : null,
    anon: createClient(url, anon, { auth: { persistSession: false } }),
  };
}

export const log = {
  ok: (m) => console.log("✓", m),
  fail: (m) => { console.error("✗", m); process.exit(1); },
  done: (m) => console.log(`\n✅ ${m}`),
};

export async function getDemoCoachAndTeam(admin) {
  const { data: coach } = await admin
    .from("profiles").select("id").eq("email", "demo-coach@cutathletiq.test").maybeSingle();
  if (!coach) log.fail("Demo coach missing — run scripts/seed-demo-accounts.mjs first.");
  const { data: team } = await admin
    .from("teams").select("id, name").eq("coach_id", coach.id).maybeSingle();
  if (!team) log.fail("Demo team missing.");
  return { coach, team };
}

export async function mintInvite(admin, { team, coach, expiresInMs = 86400_000, used = false }) {
  const token = crypto.randomUUID();
  const expires_at = new Date(Date.now() + expiresInMs).toISOString();
  const row = { team_id: team.id, token, created_by: coach.id, expires_at };
  if (used) {
    row.used_at = new Date().toISOString();
    row.used_by = coach.id;
  }
  const { error } = await admin.from("team_invites").insert(row);
  if (error) log.fail(`mintInvite insert: ${error.message}`);
  return token;
}

export async function cleanupInvite(admin, token) {
  await admin.from("team_invites").delete().eq("token", token);
}

export async function lookupInvite(anon, token) {
  const { data, error } = await anon.rpc("lookup_team_invite", { _token: token });
  return { row: data?.[0] ?? null, error };
}
