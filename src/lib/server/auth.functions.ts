import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Simple in-memory rate limiter for admin invite code attempts (per IP, per minute)
const ATTEMPTS = new Map<string, { count: number; ts: number }>();
const LIMIT = 5;
const WINDOW_MS = 60_000;

function checkRate(key: string) {
  const now = Date.now();
  const cur = ATTEMPTS.get(key);
  if (!cur || now - cur.ts > WINDOW_MS) {
    ATTEMPTS.set(key, { count: 1, ts: now });
    return true;
  }
  cur.count += 1;
  if (cur.count > LIMIT) return false;
  return true;
}

const SignupInput = z.object({
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(255),
  password: z.string().min(8).max(200),
  role: z.enum(["athlete", "coach", "physio", "admin"]),
  sport: z.string().trim().max(60).optional(),
  position: z.string().trim().max(80).optional(),
  admin_invite_code: z.string().trim().max(120).optional(),
  consent_coach_training: z.boolean(),
  consent_physio_health: z.boolean(),
});

export const signupUser = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => SignupInput.parse(input))
  .handler(async ({ data }) => {
    // POPIA — both consents required to create an account
    if (!data.consent_coach_training || !data.consent_physio_health) {
      return { ok: false, error: "Please accept both consent checkboxes to continue." };
    }

    if (data.role === "admin" || data.role === "coach" || data.role === "physio") {
      const ip = "global";
      if (!checkRate(`${data.role}:${ip}`)) {
        return { ok: false, error: "Too many attempts. Please wait a minute and try again." };
      }
      const supplied = (data.admin_invite_code ?? "").trim().toUpperCase();
      if (!supplied) {
        return { ok: false, error: `An invite code is required to sign up as ${data.role}.` };
      }
      // Validate against invite_codes table for all 3 roles. For admin, the
      // ADMIN_INVITE_CODE env secret is also accepted as a fallback so existing
      // bootstrapping flows keep working.
      const { data: row } = await supabaseAdmin
        .from("invite_codes")
        .select("code")
        .eq("role", data.role)
        .maybeSingle();
      const dbCode = row?.code?.toUpperCase() ?? "";
      const envFallback =
        data.role === "admin" ? (process.env.ADMIN_INVITE_CODE ?? "").trim().toUpperCase() : "";
      if (!dbCode && !envFallback) {
        console.error(`[auth] No invite code configured for role=${data.role}`);
        return {
          ok: false,
          error: `${data.role} signup is unavailable: no invite code is configured.`,
        };
      }
      if (supplied !== dbCode && supplied !== envFallback) {
        return { ok: false, error: `Invalid ${data.role} invite code.` };
      }
    }

    // Use admin client to create the user (auto-confirm is on at the project level)
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        first_name: data.first_name,
        last_name: data.last_name,
        role: data.role,
        sport: data.sport ?? "",
        position: data.position ?? "",
        consent_coach_training: data.consent_coach_training,
        consent_physio_health: data.consent_physio_health,
      },
    });

    if (error || !created.user) {
      const msg = error?.message ?? "";
      if (msg.toLowerCase().includes("already")) {
        return { ok: false, error: "An account with this email already exists." };
      }
      console.error("signupUser failed:", error);
      return { ok: false, error: "Could not create your account. Please try again." };
    }

    return { ok: true };
  });
