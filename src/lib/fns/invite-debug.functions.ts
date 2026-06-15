import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./require-admin.server";

/**
 * Admin-only debug: verify ADMIN_INVITE_CODE is being read by the backend
 * (env vs DB) and that a probe code would be accepted by the signup flow.
 * Never returns the actual code value.
 *
 * SECURITY: requires authenticated admin caller. Without this gate, the
 * `probeMatches` response turns this function into an unauthenticated
 * brute-force oracle for the admin invite code.
 */
export const verifyAdminInviteWiring = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ probe: z.string().trim().max(120).optional() }).parse(input ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);

    const env = (process.env.ADMIN_INVITE_CODE ?? "").trim();
    const envSource = env.length > 0 ? "env: ADMIN_INVITE_CODE" : null;
    const envLength = env.length;

    const { data: row } = await supabaseAdmin
      .from("invite_codes")
      .select("code, updated_at")
      .eq("role", "admin")
      .maybeSingle();
    const dbCode = (row?.code ?? "").trim();
    const dbSource = dbCode.length > 0 ? "db: invite_codes" : null;
    const dbLength = dbCode.length;

    const probe = (data.probe ?? "").trim().toUpperCase();
    let probeMatches: "env" | "db" | "none" | "no-probe" = "no-probe";
    if (probe) {
      if (env && probe === env.toUpperCase()) probeMatches = "env";
      else if (dbCode && probe === dbCode.toUpperCase()) probeMatches = "db";
      else probeMatches = "none";
    }

    const nodeEnv = process.env.NODE_ENV ?? "unknown";
    const supabaseRef =
      (process.env.SUPABASE_URL ?? "").match(/https?:\/\/([^.]+)\./)?.[1] ?? "unknown";

    return {
      ok: envSource !== null || dbSource !== null,
      env: { configured: !!envSource, length: envLength, source: envSource },
      db: {
        configured: !!dbSource,
        length: dbLength,
        source: dbSource,
        updated_at: row?.updated_at ?? null,
      },
      probeMatches,
      runtime: { nodeEnv, supabaseRef, checkedAt: new Date().toISOString() },
    };
  });
