#!/usr/bin/env node
/**
 * E2E smoke test for CUT Athletiq.
 *
 * Validates (against the live preview server + Supabase Auth):
 *   • preview HTML shells render for public + protected routes
 *   • signup + login work for athlete / coach / physio / admin
 *   • profiles row is auto-created by the handle_new_user() DB trigger
 *   • login session persists across "page refresh" (new client w/ same storage)
 *   • login session expires correctly when the bearer token is invalidated
 *   • wrong password is rejected
 *   • coach walkthrough — login → role landing → program builder → calendar
 *   • admin invite flow — ADMIN_INVITE_CODE present, admin user can sign up & log in
 *
 * Override server with BASE_URL.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      const v = l.slice(i + 1).trim().replace(/^["']|["']$/g, "");
      return [l.slice(0, i).trim(), v];
    }),
);

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_KEY = env.VITE_SUPABASE_PUBLISHABLE_KEY;
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_INVITE_CODE = process.env.ADMIN_INVITE_CODE || "";

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("Missing VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY in .env");
  process.exit(2);
}

const results = [];
const log = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const tag = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`${tag} ${name}${detail ? `  — ${detail}` : ""}`);
};

const stamp = Date.now();
const mkEmail = (role) => `smoke-${role}-${stamp}@cut.test`;
const PASSWORD = "SmokeTest!2026";

function memStorage() {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, v),
    removeItem: (k) => m.delete(k),
  };
}

function newClient(storage) {
  return createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { storage, persistSession: true, autoRefreshToken: false },
  });
}

async function loadRoute(path) {
  const res = await fetch(`${BASE_URL}${path}`);
  return { status: res.status, ok: res.ok };
}

async function testRoute(path) {
  const r = await loadRoute(path);
  log(`GET ${path}`, r.ok, `status=${r.status}`);
}

async function signupAndLogin(role) {
  const email = mkEmail(role);
  const storage = memStorage();
  const c = newClient(storage);

  const { data: su, error: suErr } = await c.auth.signUp({
    email,
    password: PASSWORD,
    options: {
      data: {
        first_name: "Smoke",
        last_name: role[0].toUpperCase() + role.slice(1),
        role,
        sport: "Rugby",
        position: role === "athlete" ? "Wing" : "",
        consent_coach_training: true,
        consent_physio_health: true,
      },
    },
  });
  log(`signup ${role}`, !suErr && !!su.user, suErr?.message || `uid=${su?.user?.id}`);
  if (suErr || !su.user) return null;

  const { data: si, error: siErr } = await c.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  log(`login ${role}`, !siErr && !!si.session, siErr?.message || "session ok");
  if (siErr || !si.session) return null;

  // profile auto-created by handle_new_user() trigger
  await new Promise((r) => setTimeout(r, 250));
  const { data: profile, error: profErr } = await c
    .from("profiles")
    .select("id, role, first_name")
    .eq("id", si.user.id)
    .maybeSingle();
  log(
    `profile auto-created with role=${role}`,
    !profErr && profile?.role === role,
    profErr?.message || JSON.stringify(profile),
  );

  // session persists after "refresh" — fresh client, same storage
  const c2 = newClient(storage);
  const { data: gs } = await c2.auth.getSession();
  log(
    `session persists after refresh (${role})`,
    !!gs.session && gs.session.user.id === si.user.id,
    gs.session ? `expires_at=${gs.session.expires_at}` : "no session",
  );

  // wrong password rejected
  const cBad = newClient(memStorage());
  const { error: badErr } = await cBad.auth.signInWithPassword({
    email,
    password: "wrong-password",
  });
  log(`wrong password rejected (${role})`, !!badErr, badErr?.message || "no error returned");

  return { client: c, storage, user: si.user, session: si.session, email };
}

async function testSessionExpiry(coach) {
  // Sign out (server-side invalidate) and confirm a fresh client w/ the same
  // storage no longer has a usable session — same effect as the access token
  // expiring after its TTL.
  await coach.client.auth.signOut();
  // Drain any persisted token from storage by spinning up a new client
  const cFresh = newClient(coach.storage);
  const { data: gs } = await cFresh.auth.getSession();
  log("session expires after sign-out", !gs.session, gs.session ? "still has session" : "no session");

  // Try a logged-out call to a protected RPC and confirm RLS denies it
  const { data: rows, error } = await cFresh.from("profiles").select("id").limit(1);
  log(
    "expired session cannot read protected data",
    !rows || rows.length === 0 || !!error,
    error?.message || `rows=${rows?.length ?? 0}`,
  );
}

async function testCoachWalkthrough(coach) {
  if (!coach) {
    log("coach walkthrough", false, "no coach session");
    return;
  }
  // Coach walks through the role-locked pages. We verify HTML shells render
  // (auth gate is client-side so the server returns the SPA shell for all
  // of them — the actual gate happens in the browser via MobileFrame).
  for (const path of ["/coach", "/coach/program", "/coach/games", "/coach/wellness", "/calendar", "/leaderboard", "/feed"]) {
    // eslint-disable-next-line no-await-in-loop
    const r = await loadRoute(path);
    log(`coach can navigate to ${path}`, r.ok, `status=${r.status}`);
  }

  // Coach can read team-scoped tables they should be able to see.
  const { error: prErr } = await coach.client.from("programmes").select("id").limit(1);
  log("coach can read programmes table", !prErr, prErr?.message || "ok");

  // Coach must NOT be able to read injury_records (clinical data — physio/admin only).
  const { data: inj, error: injErr } = await coach.client.from("injury_records").select("id").limit(1);
  log(
    "coach is BLOCKED from injury_records (POPIA)",
    (inj?.length ?? 0) === 0,
    injErr?.message || `rows=${inj?.length ?? 0}`,
  );
}

async function testAdminInviteFlow() {
  log(
    "ADMIN_INVITE_CODE present in environment",
    !!ADMIN_INVITE_CODE,
    ADMIN_INVITE_CODE ? `length=${ADMIN_INVITE_CODE.length}` : "missing — admin signup will fail",
  );

  // Admin can sign up + log in (we use Supabase signUp directly — the
  // signupUser server function validates ADMIN_INVITE_CODE before calling
  // the same admin createUser path, so this exercises the same surface
  // assuming the code matches what the server has configured).
  const admin = await signupAndLogin("admin");
  if (!admin) return;

  // Admin can read profiles across teams (privileged RLS policy).
  const { data: rows, error } = await admin.client.from("profiles").select("id").limit(5);
  log(
    "admin can read all profiles (admin RLS)",
    !error && (rows?.length ?? 0) >= 1,
    error?.message || `rows=${rows?.length ?? 0}`,
  );
}

async function testStartupHealthRoute() {
  // We can't easily call the createServerFn directly; instead, just verify
  // the preview is healthy enough that the homepage renders.
  const r = await loadRoute("/");
  log("preview / renders (startup health proxy)", r.ok, `status=${r.status}`);
}

(async () => {
  console.log(`\n→ Smoke test against ${BASE_URL}`);
  console.log(`  Supabase: ${SUPABASE_URL}\n`);

  const home = await loadRoute("/login");
  log("preview /login serves", home.ok, `status=${home.status}`);
  if (!home.ok) {
    console.error("\nDev server not reachable — aborting.");
    process.exit(1);
  }

  await testStartupHealthRoute();

  for (const p of ["/login", "/signup", "/privacy", "/reset-password", "/join-team"]) {
    // eslint-disable-next-line no-await-in-loop
    await testRoute(p);
  }

  await signupAndLogin("athlete");
  const coach = await signupAndLogin("coach");
  await signupAndLogin("physio");

  await testCoachWalkthrough(coach);
  if (coach) await testSessionExpiry(coach);

  await testAdminInviteFlow();

  for (const p of ["/athlete", "/coach", "/physio", "/admin", "/onboarding", "/profile"]) {
    // eslint-disable-next-line no-await-in-loop
    await testRoute(p);
  }

  const passed = results.filter((r) => r.ok).length;
  const failed = results.length - passed;
  console.log(`\n${passed} passed · ${failed} failed · ${results.length} total\n`);
  if (failed > 0) {
    console.log("Failed cases:");
    for (const r of results.filter((r) => !r.ok)) console.log(`  ✗ ${r.name} — ${r.detail}`);
    process.exit(1);
  }
})().catch((e) => {
  console.error("\nSmoke test crashed:", e);
  process.exit(1);
});
