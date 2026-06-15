import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

/**
 * POPIA s.23 — data subject access. Returns a JSON dump of every row
 * that references this user across the schema, plus consent log.
 */
export const exportMyData = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { userId } = context;

    const [profile, logs, prs, checkins, injuries, nudges, consent] = await Promise.all([
      supabaseAdmin.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabaseAdmin.from("workout_logs").select("*").eq("athlete_id", userId),
      supabaseAdmin.from("personal_records").select("*").eq("athlete_id", userId),
      supabaseAdmin.from("injury_checkins").select("*").eq("athlete_id", userId),
      supabaseAdmin.from("injury_records").select("*").eq("athlete_id", userId),
      supabaseAdmin.from("nudges").select("*").eq("recipient_id", userId),
      supabaseAdmin.from("consent_log").select("*").eq("user_id", userId),
    ]);

    return {
      exported_at: new Date().toISOString(),
      profile: profile.data,
      workout_logs: logs.data ?? [],
      personal_records: prs.data ?? [],
      injury_checkins: checkins.data ?? [],
      injury_records: injuries.data ?? [],
      nudges: nudges.data ?? [],
      consent_log: consent.data ?? [],
    };
  });

/**
 * POPIA s.24 — right to deletion with a 7-day grace.
 * We mark the account for deletion via a profile flag (no extra table needed for v1)
 * by simply scheduling: email is kept, but role/team are nulled and a tag is added
 * to the email. For Phase 1 we hard-delete via admin API after recording it in
 * data_access_log so admins have an audit trail.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ confirm: z.literal("DELETE") }).parse(input))
  .handler(async ({ context }) => {
    const { userId } = context;

    // Audit
    await supabaseAdmin.from("data_access_log").insert({
      actor_id: userId,
      subject_id: userId,
      resource: "account",
      action: "delete_request",
      context: "user-initiated POPIA s.24",
    });

    // Hard delete (cascades remove every dependent row via FK)
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) {
      console.error("deleteMyAccount failed:", error);
      return { ok: false, error: "Could not delete your account. Please contact support." };
    }
    return { ok: true };
  });

const LogReadInput = z.object({
  subject_id: z.string().uuid(),
  resource: z.enum(["injury_checkins", "injury_records"]),
  context: z.string().max(200).optional(),
});

/** Called by physio screens after they read injury data, for the audit trail. */
export const logInjuryRead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => LogReadInput.parse(input))
  .handler(async ({ data, context }) => {
    const { userId } = context;
    const { error } = await supabaseAdmin.from("data_access_log").insert({
      actor_id: userId,
      subject_id: data.subject_id,
      resource: data.resource,
      action: "read",
      context: data.context ?? null,
    });
    if (error) {
      console.error("logInjuryRead failed:", error);
    }
    return { ok: true };
  });
