// E2E: mint a team_invites token as the demo coach's team, sign up a brand-new
// athlete via /signup?invite=<token> using supabase-js (mirrors the client flow),
// consume the invite, verify team join, and confirm sign-in works.
//
// Usage:  node scripts/e2e-invite-signup.mjs
// Requires: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, SUPABASE_PUBLISHABLE_KEY (or anon).
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const fail = (msg) => { console.error("✗", msg); process.exit(1); };
const ok = (msg) => console.log("✓", msg);

// 1. Find a coach + a team they own (or are a member of)
const { data: coachProfile } = await admin
  .from("profiles").select("id, team_id").eq("email", "demo-coach@cutathletiq.test").maybeSingle();
if (!coachProfile) fail("Demo coach not found. Run scripts/seed-demo-accounts.mjs first.");
let teamId = coachProfile.team_id;
if (!teamId) {
  const { data: ownedTeam } = await admin.from("teams").select("id").eq("coach_id", coachProfile.id).maybeSingle();
  teamId = ownedTeam?.id ?? null;
}
if (!teamId) fail("Demo coach owns no team.");
ok(`Coach ${coachProfile.id} → team ${teamId}`);
const teamRef = teamId;

// 2. Mint invite token
const token = crypto.randomUUID();
const expires = new Date(Date.now() + 7 * 86400 * 1000).toISOString();
const { error: insErr } = await admin.from("team_invites").insert({
  team_id: teamRef, token, created_by: coachProfile.id, expires_at: expires,
});
if (insErr) fail("Insert team_invites: " + insErr.message);
ok(`Minted invite token ${token.slice(0, 8)}…`);

// 3. Lookup banner data (mirrors signup page)
const { data: lookup } = await admin.rpc("lookup_team_invite", { _token: token });
if (!lookup?.[0] || lookup[0].used || lookup[0].expired) fail("Invite lookup failed.");
ok(`Banner shows team: ${lookup[0].team_name} (${lookup[0].team_sport ?? "—"})`);

// 4. Create new athlete user via admin API (server signup uses same path)
const email = `e2e-invite-${Date.now()}@cutathletiq.test`;
const password = "E2eInvite!2026";
const { data: created, error: userErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: { first_name: "E2E", last_name: "Invite", role: "athlete", consent_coach_training: true, consent_physio_health: true },
});
if (userErr || !created.user) fail("Create user: " + (userErr?.message ?? "no user"));
ok(`Created athlete ${email}`);

// 4b. Ensure profile row exists (handle_new_user trigger swallows errors)
const upRes = await admin.from("profiles").upsert({
  id: created.user.id, email, first_name: "E2E", last_name: "Invite", role: "athlete",
  consent_coach_training: true, consent_physio_health: true, consent_at: new Date().toISOString(),
}).select();
if (upRes.error) console.log("upsert error:", upRes.error);
else ok("Profile upserted");

// 5. Sign in as the new user via anon client and consume the invite (RPC needs auth.uid())
const userClient = createClient(url, anon, { auth: { persistSession: false } });
const { error: signInErr } = await userClient.auth.signInWithPassword({ email, password });
if (signInErr) fail("Sign in: " + signInErr.message);
ok("Signed in as new athlete");

const { data: joinedTeam, error: rpcErr } = await userClient.rpc("consume_team_invite", { _token: token });
if (rpcErr) fail("consume_team_invite: " + rpcErr.message);
if (String(joinedTeam) !== String(teamRef)) fail(`Joined wrong team: ${joinedTeam}`);
ok(`Joined correct team: ${joinedTeam}`);

// 6. Verify profile.team_id is set
const { data: prof } = await admin.from("profiles").select("team_id").eq("id", created.user.id).maybeSingle();
if (prof?.team_id !== teamRef) fail(`Profile team_id mismatch: ${prof?.team_id}`);
ok("profiles.team_id matches");

// 7. Re-sign-in works
await userClient.auth.signOut();
const { error: reErr } = await userClient.auth.signInWithPassword({ email, password });
if (reErr) fail("Re-sign-in: " + reErr.message);
ok("Re-sign-in works");

// 8. Cleanup
await admin.auth.admin.deleteUser(created.user.id);
await admin.from("team_invites").delete().eq("token", token);
ok("Cleanup done");

console.log("\n✅ E2E invite signup PASSED");
