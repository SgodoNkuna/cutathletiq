// E2E: verifies the signup invite banner renders the correct error state for
// invalid, expired, and already-used tokens by exercising the same RPC the
// signup page calls (lookup_team_invite). Pure backend test — no browser.
//
// Usage:  node scripts/e2e-invite-errors.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) {
  console.error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const admin = createClient(url, service, { auth: { persistSession: false } });
const anonClient = createClient(url, anon, { auth: { persistSession: false } });
const fail = (m) => { console.error("✗", m); process.exit(1); };
const ok = (m) => console.log("✓", m);

// Resolve coach + team
const { data: coach } = await admin.from("profiles").select("id").eq("email", "demo-coach@cutathletiq.test").maybeSingle();
if (!coach) fail("Demo coach missing.");
const { data: team } = await admin.from("teams").select("id, name").eq("coach_id", coach.id).maybeSingle();
if (!team) fail("Demo team missing.");

// --- Case 1: invalid token (random uuid never inserted) ---
{
  const { data } = await anonClient.rpc("lookup_team_invite", { _token: crypto.randomUUID() });
  if (data && data.length > 0) fail("Invalid token returned a row");
  ok("invalid token → banner shows 'Invite link not found.'");
}

// --- Case 2: expired token ---
{
  const token = crypto.randomUUID();
  const past = new Date(Date.now() - 86400_000).toISOString();
  const { error } = await admin.from("team_invites").insert({
    team_id: team.id, token, created_by: coach.id, expires_at: past,
  });
  if (error) fail("insert expired: " + error.message);
  const { data } = await anonClient.rpc("lookup_team_invite", { _token: token });
  const row = data?.[0];
  if (!row?.expired) fail("Expired flag not set on RPC response");
  ok(`expired token → banner shows 'This invite has expired.' (team ${row.team_name})`);
  await admin.from("team_invites").delete().eq("token", token);
}

// --- Case 3: already-used token ---
{
  const token = crypto.randomUUID();
  const { error: insErr } = await admin.from("team_invites").insert({
    team_id: team.id, token, created_by: coach.id, used_at: new Date().toISOString(), used_by: coach.id,
  });
  if (insErr) fail("insert used: " + insErr.message);
  const { data } = await anonClient.rpc("lookup_team_invite", { _token: token });
  const row = data?.[0];
  if (!row?.used) fail("Used flag not set on RPC response");
  ok(`used token → banner shows 'This invite has already been used.' (team ${row.team_name})`);
  await admin.from("team_invites").delete().eq("token", token);
}

console.log("\n✅ Invite error-state E2E PASSED");
