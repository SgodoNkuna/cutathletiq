// E2E: verifies that minting a team invite without permission fails with a
// 42501 RLS error — which is what InviteLinkCard surfaces inline via the
// role="alert" banner ("You don't have permission to mint invites for this team.").
//
// Runs the same insert path as InviteLinkCard.generate() but as an athlete
// who is not the team's coach/physio/admin. Asserts the insert is rejected.
//
// Usage:  node scripts/e2e-invite-permission.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) { console.error("Missing env"); process.exit(1); }

const admin = createClient(url, service, { auth: { persistSession: false } });
const fail = (m) => { console.error("✗", m); process.exit(1); };
const ok = (m) => console.log("✓", m);

// Find the demo coach + their team
const { data: coach } = await admin.from("profiles").select("id")
  .eq("email", "demo-coach@cutathletiq.test").maybeSingle();
if (!coach) fail("Demo coach missing — run scripts/seed-demo-accounts.mjs first.");
const { data: team } = await admin.from("teams").select("id, name")
  .eq("coach_id", coach.id).maybeSingle();
if (!team) fail("Demo team missing.");

// Create an unrelated athlete (not on the coach's team)
const email = `nopermit-${Date.now()}@cutathletiq.test`;
const password = "NoPermit!2026";
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { first_name: "No", last_name: "Permit", role: "athlete",
    consent_coach_training: true, consent_physio_health: true },
});
if (cErr) fail("createUser: " + cErr.message);
await admin.from("profiles").upsert({
  id: created.user.id, email, first_name: "No", last_name: "Permit",
  role: "athlete", consent_coach_training: true, consent_physio_health: true,
  consent_at: new Date().toISOString(),
});

const userClient = createClient(url, anon, { auth: { persistSession: false } });
const { error: signErr } = await userClient.auth.signInWithPassword({ email, password });
if (signErr) fail("signin: " + signErr.message);
ok(`signed in as unrelated athlete ${email}`);

// Mirror InviteLinkCard.generate() — try to insert an invite for a team the
// user does not own. RLS should block this.
const newToken = crypto.randomUUID().replace(/-/g, "");
const { data, error } = await userClient
  .from("team_invites")
  .insert({ team_id: team.id, token: newToken, created_by: created.user.id })
  .select("token, expires_at")
  .maybeSingle();

if (!error) fail(`Insert unexpectedly succeeded: ${JSON.stringify(data)}`);
ok(`mint blocked by RLS: code=${error.code} msg="${error.message}"`);

// InviteLinkCard maps code 42501 → "You don't have permission to mint invites for this team."
// Any other RLS rejection (e.g. 42501 from policy) still trips the inline alert
// because data is null → mintError set from error.message.
if (error.code !== "42501" && !/row-level security|permission|denied/i.test(error.message)) {
  fail("Expected RLS / permission error but got: " + JSON.stringify(error));
}
ok("InviteLinkCard would render role=\"alert\" with the permission message");

// Cleanup
await admin.auth.admin.deleteUser(created.user.id);
await admin.from("team_invites").delete().eq("token", newToken); // no-op if blocked
ok("cleanup done");

console.log("\n✅ Invite permission E2E PASSED");
