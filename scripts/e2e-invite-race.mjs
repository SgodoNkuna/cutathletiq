// Verifies consume_team_invite is strictly single-use even under concurrent
// callers: fires N parallel RPC calls for the same token and asserts exactly
// one succeeds. Also verifies expired tokens are rejected.
//
// Usage:  node scripts/e2e-invite-race.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) {
  console.error("Missing env");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const fail = (m) => { console.error("✗", m); process.exit(1); };
const ok = (m) => console.log("✓", m);

const { data: coach } = await admin.from("profiles").select("id")
  .eq("email", "demo-coach@cutathletiq.test").maybeSingle();
const { data: team } = await admin.from("teams").select("id").eq("coach_id", coach.id).maybeSingle();

// --- Race test: spawn N athletes, all attempt to consume the SAME token ---
const N = 5;
const token = crypto.randomUUID();
await admin.from("team_invites").insert({
  team_id: team.id, token, created_by: coach.id,
});

const users = [];
for (let i = 0; i < N; i++) {
  const email = `race-${Date.now()}-${i}@cutathletiq.test`;
  const password = "Race!2026Race";
  const { data, error } = await admin.auth.admin.createUser({
    email, password, email_confirm: true,
    user_metadata: { first_name: "R", last_name: String(i), role: "athlete",
      consent_coach_training: true, consent_physio_health: true },
  });
  if (error) fail("createUser: " + error.message);
  await admin.from("profiles").upsert({
    id: data.user.id, email, first_name: "R", last_name: String(i),
    role: "athlete", consent_coach_training: true, consent_physio_health: true,
    consent_at: new Date().toISOString(),
  });
  users.push({ id: data.user.id, email, password });
}

const results = await Promise.all(users.map(async (u) => {
  const c = createClient(url, anon, { auth: { persistSession: false } });
  const { error: signInErr } = await c.auth.signInWithPassword({ email: u.email, password: u.password });
  if (signInErr) return { ok: false, err: "signin: " + signInErr.message };
  const { data, error } = await c.rpc("consume_team_invite", { _token: token });
  return { ok: !error, data, err: error?.message };
}));

const succeeded = results.filter((r) => r.ok);
const failed = results.filter((r) => !r.ok);
if (succeeded.length !== 1) {
  fail(`Expected exactly 1 success, got ${succeeded.length}. Results: ${JSON.stringify(results)}`);
}
ok(`race: 1/${N} succeeded, ${failed.length} rejected as 'already used or expired'`);
for (const f of failed) {
  if (!/already used|expired|not found/i.test(f.err || "")) {
    fail("Unexpected error message: " + f.err);
  }
}
ok("all losers got a clean 'already used or expired' error");

// --- Expired token still rejected ---
const expired = crypto.randomUUID();
await admin.from("team_invites").insert({
  team_id: team.id, token: expired, created_by: coach.id,
  expires_at: new Date(Date.now() - 86400_000).toISOString(),
});
const c = createClient(url, anon, { auth: { persistSession: false } });
await c.auth.signInWithPassword({ email: users[0].email, password: users[0].password });
const { error: expErr } = await c.rpc("consume_team_invite", { _token: expired });
if (!expErr) fail("Expired token was accepted");
ok(`expired token rejected: ${expErr.message}`);

// --- Cleanup ---
for (const u of users) await admin.auth.admin.deleteUser(u.id);
await admin.from("team_invites").delete().eq("token", token);
await admin.from("team_invites").delete().eq("token", expired);
ok("cleanup done");

console.log("\n✅ Single-use invite race test PASSED");
