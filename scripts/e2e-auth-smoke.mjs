// Quick auth smoke: creates a fresh athlete via the public signup path,
// signs in with the new credentials, and verifies the profile row landed.
// Mirrors the login + signup screens' use of supabase-js.
//
// Usage:  node scripts/e2e-auth-smoke.mjs
import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anon = process.env.SUPABASE_PUBLISHABLE_KEY ?? process.env.SUPABASE_ANON_KEY;
if (!url || !service || !anon) { console.error("Missing env"); process.exit(1); }

const admin = createClient(url, service, { auth: { persistSession: false } });
const fail = (m) => { console.error("✗", m); process.exit(1); };
const ok = (m) => console.log("✓", m);

// 1. Sign up via the same admin createUser path our signup server fn uses
const email = `smoke-${Date.now()}@cutathletiq.test`;
const password = "Smoke!2026Test";
const { data: created, error: cErr } = await admin.auth.admin.createUser({
  email, password, email_confirm: true,
  user_metadata: {
    first_name: "Smoke", last_name: "Test", role: "athlete",
    consent_coach_training: true, consent_physio_health: true,
  },
});
if (cErr) fail("signup: " + cErr.message);
ok(`signup created user ${created.user.id}`);

// 2. Verify profile row was auto-created by handle_new_user trigger
await new Promise((r) => setTimeout(r, 500));
const { data: profile } = await admin.from("profiles")
  .select("id, role, email").eq("id", created.user.id).maybeSingle();
if (!profile) fail("profile row not created by trigger");
if (profile.role !== "athlete") fail("profile role mismatch: " + profile.role);
ok(`profile row present, role=${profile.role}`);

// 3. Sign in like the login page does
const c = createClient(url, anon, { auth: { persistSession: false } });
const { data: sess, error: signErr } = await c.auth.signInWithPassword({ email, password });
if (signErr || !sess.session) fail("signin failed: " + signErr?.message);
ok(`signin OK, session expires ${new Date(sess.session.expires_at * 1000).toISOString()}`);

// 4. Authed select on profiles (RLS: read own)
const { data: me } = await c.from("profiles").select("id, email").eq("id", created.user.id).maybeSingle();
if (!me || me.email !== email) fail("authed self-read failed");
ok("authed self-read OK");

// Cleanup
await admin.auth.admin.deleteUser(created.user.id);
ok("cleanup done");

// Sanity-check demo logins still work
const demos = [
  ["demo-athlete@cutathletiq.test", "Demo!2026Athlete"],
  ["demo-coach@cutathletiq.test",   "Demo!2026Coach"],
  ["demo-physio@cutathletiq.test",  "Demo!2026Physio"],
  ["demo-admin@cutathletiq.test",   "Demo!2026Admin"],
];
for (const [e, p] of demos) {
  const dc = createClient(url, anon, { auth: { persistSession: false } });
  const { error } = await dc.auth.signInWithPassword({ email: e, password: p });
  if (error) fail(`demo login failed for ${e}: ${error.message}`);
  ok(`demo login OK: ${e}`);
}

console.log("\n✅ Auth smoke + demo logins PASSED");
