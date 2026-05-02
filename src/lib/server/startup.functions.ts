import { createServerFn } from "@tanstack/react-start";

/**
 * Server-side startup health check. Verifies that all required environment
 * configuration is present. Called once on app boot from the root layout —
 * if anything critical is missing, the UI surfaces a clear error instead of
 * letting a downstream feature blow up with a confusing message.
 */
export const checkStartupHealth = createServerFn({ method: "GET" }).handler(async () => {
  const required = ["ADMIN_INVITE_CODE", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"];
  const missing = required.filter((k) => {
    const v = process.env[k];
    return !v || v.trim() === "";
  });

  if (missing.length > 0) {
    // Server log so it's findable in worker logs as well.
    console.error(`[startup] missing required env vars: ${missing.join(", ")}`);
  }

  return {
    ok: missing.length === 0,
    missing,
    checked: required,
  };
});
