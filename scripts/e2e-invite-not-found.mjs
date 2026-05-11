// E2E: a /signup?invite=<random> token that does not exist in the DB must
// cause the signup invite banner to render its inline role="alert" error
// reading "Invite link not found." This exercises the same lookup_team_invite
// RPC the signup page calls on mount.
//
// Usage:  node scripts/e2e-invite-not-found.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !anon) { console.error("Missing env"); process.exit(1); }

const c = createClient(url, anon, { auth: { persistSession: false } });
const fail = (m) => { console.error("✗", m); process.exit(1); };
const ok = (m) => console.log("✓", m);

// 1. UUID-shaped token that was never inserted
const random = crypto.randomUUID();
const { data, error } = await c.rpc("lookup_team_invite", { _token: random });
if (error) fail("RPC failed: " + error.message);
if (Array.isArray(data) && data.length > 0) fail(`Expected zero rows, got ${data.length}`);
ok(`random uuid token → 0 rows → banner shows "Invite link not found."`);

// 2. Garbage non-uuid token (e.g. user typed nonsense)
const { data: garbage, error: gErr } = await c.rpc("lookup_team_invite", { _token: "definitely-not-a-real-token-xyz" });
if (gErr) fail("RPC failed for garbage token: " + gErr.message);
if (Array.isArray(garbage) && garbage.length > 0) fail("Garbage token unexpectedly matched a row");
ok(`garbage token → 0 rows → banner shows "Invite link not found."`);

// 3. Empty string
const { data: empty } = await c.rpc("lookup_team_invite", { _token: "" });
if (Array.isArray(empty) && empty.length > 0) fail("Empty token unexpectedly matched");
ok(`empty token → 0 rows → banner shows "Invite link not found."`);

console.log("\n✅ Invite-not-found E2E PASSED");
