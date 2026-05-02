#!/usr/bin/env node
/**
 * E2E smoke test for CUT Athletiq.
 *
 * Validates:
 *  - signupUser server function works for athlete/coach/physio/admin
 *  - admin invite flow rejects wrong codes and accepts the configured one
 *  - email/password sign-in works
 *  - session persists across "page refresh" (new client w/ same storage)
 *  - role-protected pages return 200 and the route renders
 *  - ADMIN_INVITE_CODE missing-secret guard (smoke check via wrong code)
 *
 * Runs against the local dev server (http://localhost:8080) by default.
 * Override with BASE_URL env var.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";

// --- env ---
const env = Object.fromEntries(
  readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
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

// --- pretty logger ---
const results = [];
const log = (name, ok, detail = "") => {
  results.push({ name, ok, detail });
  const tag = ok ? "\x1b[32m✓\x1b[0m" : "\x1b[31m✗\x1b[0m";
  console.log(`${tag} ${name}${detail ? `  — ${detail}` : ""}`);
};

const stamp = Date.now();
const mkEmail = (role) => `smoke-${role}-${stamp}@cut.test`;
const PASSWORD = "SmokeTest!2026";

// --- in-memory storage so we can simulate "page refresh" ---
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

// --- call the TanStack Start server function over HTTP ---
async function callServerFn(name, body) {
  // TanStack Start exposes server functions at /_serverFn/<filename>.ts/<exportName>
  // We use the simpler public POST form by hitting the endpoint with payload.
  const url = `${BASE_URL}/_serverFn/src/lib/server/auth.functions.ts/${name}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ data: body }),
  });
  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    return { httpOk: res.ok, status: res.status, raw: text };
  }
  return { httpOk: res.ok, status: res.status, json };
}

async function signup(role, extra = {}) {
  return callServerFn("signupUser", {
    first_name: "Smoke",
    last_name: role[0].toUpperCase() + role.slice(1),
    email: mkEmail(role),
    password: PASSWORD,
    role,
    sport: "Rugby",
    position: role === "athlete" ? "Wing" : "",
    consent_coach_training: true,
    consent_physio_health: true,
    ...extra,
  });
}

async function loadRoute(path, accessToken) {
  const headers = {};
  if (accessToken) headers.cookie = ""; // TanStack uses sb-* localStorage, not cookies; this just hits the SSR shell
  const res = await fetch(`${BASE_URL}${path}`, { headers });
  return { status: res.status, ok: res.ok };
}

// ---------- TESTS ----------

async function testRoleSignupAndLogin(role, extra = {}) {
  const email = mkEmail(role);
  const su = await signup(role, extra);
  const okSignup = su.json?.ok === true;
  log(`signup ${role}`, okSignup, okSignup ? email : `${su.status} ${JSON.stringify(su.json || su.raw)}`);
  if (!okSignup) return null;

  const storage = memStorage();
  const c1 = newClient(storage);
  const { data: signIn, error: signErr } = await c1.auth.signInWithPassword({ email, password: PASSWORD });
  log(`login ${role}`, !signErr && !!signIn.session, signErr?.message || `uid=${signIn.user?.id}`);
  if (signErr || !signIn.session) return null;

  // session persistence — fresh client, same storage
  const c2 = newClient(storage);
  const { data: got } = await c2.auth.getSession();
  log(
    `session persists after refresh (${role})`,
    !!got.session && got.session.user.id === signIn.user.id,
    got.session ? `expires_at=${got.session.expires_at}` : "no session",
  );

  return { client: c1, user: signIn.user, session: signIn.session };
}

async function testRouteServes(path) {
  const r = await loadRoute(path);
  log(`GET ${path}`, r.ok, `status=${r.status}`);
}

async function testAdminInviteFlow() {
  // 1) wrong code rejected
  const wrong = await signup("admin", { admin_invite_code: "DEFINITELY-WRONG-CODE" });
  log(
    "admin signup rejects wrong invite code",
    wrong.json?.ok === false && /invalid|invite/i.test(wrong.json?.error || ""),
    wrong.json?.error || JSON.stringify(wrong.json),
  );

  // 2) missing code rejected
  const missing = await signup("admin", { admin_invite_code: "" });
  log(
    "admin signup rejects missing invite code",
    missing.json?.ok === false,
    missing.json?.error || JSON.stringify(missing.json),
  );

  // 3) correct code -> works (only run if we have it)
  if (!ADMIN_INVITE_CODE) {
    log("admin signup with correct code", false, "ADMIN_INVITE_CODE not exposed to test runner — skipping positive case");
    return;
  }
  const ok = await signup("admin", { admin_invite_code: ADMIN_INVITE_CODE });
  const okSignup = ok.json?.ok === true;
  log("admin signup with correct ADMIN_INVITE_CODE", okSignup, ok.json?.error || "ok");
  if (!okSignup) return;

  const storage = memStorage();
  const c = newClient(storage);
  const { data: signIn, error } = await c.auth.signInWithPassword({
    email: mkEmail("admin"),
    password: PASSWORD,
  });
  log("admin can log in after invite", !error && !!signIn.session, error?.message || "ok");
}

// ---------- runner ----------

(async () => {
  console.log(`\n→ Smoke test against ${BASE_URL}\n`);

  // 0) preview server is up
  const home = await loadRoute("/login");
  log("preview /login serves", home.ok, `status=${home.status}`);
  if (!home.ok) {
    console.error("\nDev server not reachable — aborting.");
    process.exit(1);
  }

  // 1) public route shells
  for (const p of ["/login", "/signup", "/privacy", "/reset-password"]) {
    // eslint-disable-next-line no-await-in-loop
    await testRouteServes(p);
  }

  // 2) per-role signup + login + session persistence
  await testRoleSignupAndLogin("athlete");
  await testRoleSignupAndLogin("coach");
  await testRoleSignupAndLogin("physio");

  // 3) admin invite flow
  await testAdminInviteFlow();

  // 4) protected role landing pages still serve their HTML shell (auth gate is client-side)
  for (const p of ["/athlete", "/coach", "/physio", "/admin", "/onboarding"]) {
    // eslint-disable-next-line no-await-in-loop
    await testRouteServes(p);
  }

  // --- summary ---
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
