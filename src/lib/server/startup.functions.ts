import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./require-admin";

const REQUIRED_ENV = ["ADMIN_INVITE_CODE", "SUPABASE_SERVICE_ROLE_KEY", "SUPABASE_URL"] as const;

function maskCode(code: string | null | undefined): string {
  if (!code) return "—";
  const c = code.trim();
  if (c.length <= 3) return "•".repeat(c.length);
  return `${c.slice(0, 2)}${"•".repeat(Math.max(c.length - 4, 2))}${c.slice(-2)}`;
}

/**
 * Server-side startup health check. Verifies that all required environment
 * configuration is present AND reports which invite-code roles are configured
 * (admin via env, coach/physio via DB). Codes are returned masked so the
 * status page never leaks the secret.
 */
export const checkStartupHealth = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
  const missingEnv = REQUIRED_ENV.filter((k) => {
    const v = process.env[k];
    return !v || v.trim() === "";
  });

  const adminCode = (process.env.ADMIN_INVITE_CODE ?? "").trim();
  const inviteCodes: { role: string; configured: boolean; masked: string; source: string }[] = [
    {
      role: "admin",
      configured: adminCode.length > 0,
      masked: maskCode(adminCode),
      source: "env: ADMIN_INVITE_CODE",
    },
  ];

  // Read coach/physio codes from DB (admin client bypasses RLS — safe here
  // because we only return masked output).
  try {
    const { data } = await supabaseAdmin
      .from("invite_codes")
      .select("role, code")
      .in("role", ["coach", "physio"]);
    for (const role of ["coach", "physio"] as const) {
      const row = (data ?? []).find((r) => r.role === role);
      inviteCodes.push({
        role,
        configured: !!row?.code,
        masked: maskCode(row?.code),
        source: "db: invite_codes",
      });
    }
  } catch (e) {
    console.error("[startup] could not read invite_codes:", e);
    for (const role of ["coach", "physio"] as const) {
      inviteCodes.push({ role, configured: false, masked: "—", source: "db: invite_codes (error)" });
    }
  }

  const missingCodes = inviteCodes.filter((c) => !c.configured).map((c) => c.role);
  const ok = missingEnv.length === 0 && missingCodes.length === 0;

  if (!ok) {
    console.error(
      `[startup] config issues — missing env: [${missingEnv.join(", ")}] · missing invite codes: [${missingCodes.join(", ")}]`,
    );
  }

  return {
    ok,
    missing: missingEnv,
    missingCodes,
    inviteCodes,
    checked: REQUIRED_ENV as readonly string[],
    serverTime: new Date().toISOString(),
  };
});
