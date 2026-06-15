import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin } from "./require-admin.server";

/**
 * Dev mode is enabled when DEV_MODE=true is set as a runtime secret.
 * This gates ALL dev tooling (mock reset, diagnostics) so they cannot
 * run in production unless explicitly enabled.
 */
function devEnabled() {
  return process.env.DEV_MODE === "true" || process.env.NODE_ENV !== "production";
}

/* -------------------------------------------------------------------------- */
/*  1) Mock password reset                                                    */
/* -------------------------------------------------------------------------- */

const MockResetInput = z.object({
  email: z.string().trim().email().max(255),
  redirectTo: z.string().url().optional(),
});

/**
 * Dev-only: generates a recovery link directly via the admin API and
 * returns it to the caller WITHOUT sending an email. The link is the
 * exact same magic URL Supabase would have emailed, so opening it in
 * the browser triggers the standard PASSWORD_RECOVERY flow.
 */
export const devMockResetPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => MockResetInput.parse(input))
  .handler(async ({ data, context }) => {
    if (!devEnabled()) {
      return { ok: false as const, error: "Dev mode is disabled in this environment." };
    }
    await assertAdmin(context.userId);
    const { data: link, error } = await supabaseAdmin.auth.admin.generateLink({
      type: "recovery",
      email: data.email,
      options: { redirectTo: data.redirectTo },
    });
    if (error || !link?.properties?.action_link) {
      return { ok: false as const, error: error?.message ?? "Could not generate link." };
    }
    return {
      ok: true as const,
      action_link: link.properties.action_link,
      hashed_token: link.properties.hashed_token,
      email_otp: link.properties.email_otp,
    };
  });

/* -------------------------------------------------------------------------- */
/*  2) Role data snapshot (uses the calling user's session, RLS-respecting)  */
/* -------------------------------------------------------------------------- */

/**
 * Returns every row the current authenticated user can see across all
 * primary tables, exactly as their role/RLS allows. Useful for audit
 * reviews — confirms what data a given role can actually see in prod.
 */
export const roleDataSnapshot = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    const tables = [
      "profiles",
      "teams",
      "programmes",
      "sessions",
      "exercises",
      "workout_logs",
      "personal_records",
      "injury_checkins",
      "injury_records",
      "nudges",
      "consent_log",
    ] as const;

    const tableResults: Record<string, { count: number; rows_json: string; error: string | null }> = {};
    for (const t of tables) {
      const { data, error } = await supabase.from(t).select("*").limit(1000);
      tableResults[t] = {
        count: error ? 0 : data?.length ?? 0,
        rows_json: JSON.stringify(error ? [] : data ?? []),
        error: error?.message ?? null,
      };
    }

    return {
      _meta: {
        snapshot_at: new Date().toISOString(),
        viewer_id: userId,
        viewer_role: profile?.role ?? "unknown",
        viewer_team_id: profile?.team_id ?? null,
      },
      tables: tableResults,
    };
  });

/* -------------------------------------------------------------------------- */
/*  3) RLS regression diagnostic                                              */
/* -------------------------------------------------------------------------- */

type CheckResult = {
  name: string;
  expected: "allow" | "deny";
  actual: "allow" | "deny" | "error";
  pass: boolean;
  detail?: string;
};

export const runRlsDiagnostic = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
  if (!devEnabled()) {
    return { ok: false as const, error: "Dev mode is disabled." };
  }
  await assertAdmin(context.userId);

  const url = process.env.SUPABASE_URL!;
  const anon = process.env.SUPABASE_PUBLISHABLE_KEY!;
  const { createClient } = await import("@supabase/supabase-js");
  const stamp = Date.now();
  const created: string[] = [];
  const checks: CheckResult[] = [];

  const mk = (role: string) => `rls-diag+${role}+${stamp}@cuttest.local`;
  const password = "DiagPass123!";
  const make = async (role: "coach" | "athlete" | "physio") => {
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email: mk(role),
      password,
      email_confirm: true,
      user_metadata: {
        first_name: "Diag",
        last_name: role,
        role,
        sport: "Rugby",
        consent_coach_training: true,
        consent_physio_health: true,
      },
    });
    if (error || !data.user) throw new Error(`Create ${role} failed: ${error?.message}`);
    created.push(data.user.id);
    return data.user.id;
  };
  const sess = async (email: string) => {
    const c = createClient(url, anon, { auth: { persistSession: false } });
    const { data, error } = await c.auth.signInWithPassword({ email, password });
    if (error || !data.session) throw new Error(`Login failed: ${error?.message}`);
    return c;
  };
  const expect = async (
    name: string,
    expected: "allow" | "deny",
    fn: () => PromiseLike<{ data: unknown; error: { message: string } | null }>,
  ) => {
    try {
      const { data, error } = await fn();
      if (error) {
        checks.push({ name, expected, actual: "deny", pass: expected === "deny", detail: error.message });
        return;
      }
      const hasRows = Array.isArray(data) ? data.length > 0 : !!data;
      const actual: "allow" | "deny" = hasRows ? "allow" : "deny";
      checks.push({ name, expected, actual, pass: actual === expected });
    } catch (e) {
      checks.push({ name, expected, actual: "error", pass: false, detail: (e as Error).message });
    }
  };

  try {
    // Build two teams so we can test cross-team isolation
    const coachA = await make("coach");
    const athleteA = await make("athlete");
    const physioA = await make("physio");
    const coachB = await make("coach");
    const athleteB = await make("athlete");

    await new Promise((r) => setTimeout(r, 700)); // wait for triggers

    const sCoachA = await sess(mk("coach"));
    const sAthleteA = await sess(mk("athlete"));
    const sPhysioA = await sess(mk("physio"));
    const sCoachB = await sess(mk("coach").replace("coach", "coach")); // same address pattern - need fix
    // ^ correction: distinguishing requires per-call session; recreate:
    const allEmails = {
      coachA: mk("coach"),
      athleteA: mk("athlete"),
      physioA: mk("physio"),
      coachB: `rls-diag+coachB+${stamp}@cuttest.local`,
      athleteB: `rls-diag+athleteB+${stamp}@cuttest.local`,
    };

    // Re-create coachB and athleteB with distinct emails since the helper used the same key
    // Delete the duplicate-email accidental users first:
    await supabaseAdmin.auth.admin.deleteUser(coachB);
    await supabaseAdmin.auth.admin.deleteUser(athleteB);
    created.splice(created.indexOf(coachB), 1);
    created.splice(created.indexOf(athleteB), 1);

    const realCoachB = (
      await supabaseAdmin.auth.admin.createUser({
        email: allEmails.coachB,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: "Diag",
          last_name: "coachB",
          role: "coach",
          consent_coach_training: true,
          consent_physio_health: true,
        },
      })
    ).data.user!.id;
    created.push(realCoachB);
    const realAthleteB = (
      await supabaseAdmin.auth.admin.createUser({
        email: allEmails.athleteB,
        password,
        email_confirm: true,
        user_metadata: {
          first_name: "Diag",
          last_name: "athleteB",
          role: "athlete",
          consent_coach_training: true,
          consent_physio_health: true,
        },
      })
    ).data.user!.id;
    created.push(realAthleteB);
    await new Promise((r) => setTimeout(r, 600));
    const sCoachBSess = await sess(allEmails.coachB);
    const sAthleteBSess = await sess(allEmails.athleteB);

    // Coach A creates team
    const { data: teamA } = await sCoachA
      .from("teams")
      .insert({ name: "Diag Team A", sport: "Rugby", coach_id: coachA, join_code: "" })
      .select("id, join_code")
      .maybeSingle();
    await sCoachA.from("profiles").update({ team_id: teamA!.id }).eq("id", coachA);
    await sAthleteA.from("profiles").update({ team_id: teamA!.id }).eq("id", athleteA);
    await sPhysioA.from("profiles").update({ team_id: teamA!.id }).eq("id", physioA);

    // Coach B creates team
    const { data: teamB } = await sCoachBSess
      .from("teams")
      .insert({ name: "Diag Team B", sport: "Rugby", coach_id: realCoachB, join_code: "" })
      .select("id, join_code")
      .maybeSingle();
    await sCoachBSess.from("profiles").update({ team_id: teamB!.id }).eq("id", realCoachB);
    await sAthleteBSess.from("profiles").update({ team_id: teamB!.id }).eq("id", realAthleteB);

    // Coach A creates programme + session + exercise
    const { data: progA } = await sCoachA
      .from("programmes")
      .insert({ name: "Diag Prog A", coach_id: coachA, team_id: teamA!.id })
      .select("id")
      .maybeSingle();
    const { data: sessA } = await sCoachA
      .from("sessions")
      .insert({
        name: "Diag Sess A",
        programme_id: progA!.id,
        session_date: new Date().toISOString().slice(0, 10),
      })
      .select("id")
      .maybeSingle();
    const { data: exA } = await sCoachA
      .from("exercises")
      .insert({ name: "Squat", session_id: sessA!.id, sets: 3, reps: 5, weight_kg: 100 })
      .select("id")
      .maybeSingle();

    // Athlete A logs a workout, creates a PR, an injury checkin
    await sAthleteA.from("workout_logs").insert({
      athlete_id: athleteA,
      exercise_id: exA!.id,
      session_id: sessA!.id,
      set_number: 1,
      actual_reps: 5,
      actual_weight_kg: 110,
      is_pr: true,
    });
    await sAthleteA
      .from("personal_records")
      .insert({ athlete_id: athleteA, exercise_name: "Squat", weight_kg: 110, reps: 5 });
    await sAthleteA
      .from("injury_checkins")
      .insert({ athlete_id: athleteA, body_regions: ["knee"], pain_level: 6 });

    // Physio A creates injury record
    await sPhysioA.from("injury_records").insert({
      athlete_id: athleteA,
      physio_id: physioA,
      body_region: "knee",
      injury_type: "sprain",
      severity: 3,
      date_of_injury: new Date().toISOString().slice(0, 10),
      rtp_status: "modified",
    });

    /* ---------- POSITIVE checks (should ALLOW) ---------- */
    await expect("athlete reads OWN workout_logs", "allow", () =>
      sAthleteA.from("workout_logs").select("id").eq("athlete_id", athleteA),
    );
    await expect("coach reads team athlete workout_logs", "allow", () =>
      sCoachA.from("workout_logs").select("id").eq("athlete_id", athleteA),
    );
    await expect("athlete reads team programme", "allow", () =>
      sAthleteA.from("programmes").select("id").eq("id", progA!.id).maybeSingle(),
    );
    await expect("athlete reads team exercise", "allow", () =>
      sAthleteA.from("exercises").select("id").eq("id", exA!.id).maybeSingle(),
    );
    await expect("physio reads team athlete injury_checkins", "allow", () =>
      sPhysioA.from("injury_checkins").select("id").eq("athlete_id", athleteA),
    );
    await expect("physio reads team injury_records", "allow", () =>
      sPhysioA.from("injury_records").select("id").eq("athlete_id", athleteA),
    );
    await expect("coach reads team athlete personal_records", "allow", () =>
      sCoachA.from("personal_records").select("id").eq("athlete_id", athleteA),
    );

    /* ---------- NEGATIVE checks (should DENY / return empty) ---------- */
    await expect("coach CANNOT read injury_records (physio-only)", "deny", () =>
      sCoachA.from("injury_records").select("id").eq("athlete_id", athleteA),
    );
    await expect("coach CANNOT read injury_checkins (physio-only)", "deny", () =>
      sCoachA.from("injury_checkins").select("id").eq("athlete_id", athleteA),
    );
    await expect("athlete CANNOT read other team's workout_logs", "deny", () =>
      sAthleteBSess.from("workout_logs").select("id").eq("athlete_id", athleteA),
    );
    await expect("coach B CANNOT read team A workout_logs", "deny", () =>
      sCoachBSess.from("workout_logs").select("id").eq("athlete_id", athleteA),
    );
    await expect("coach B CANNOT read team A programme", "deny", () =>
      sCoachBSess.from("programmes").select("id").eq("id", progA!.id).maybeSingle(),
    );
    await expect("athlete CANNOT read other athlete's personal_records", "deny", () =>
      sAthleteBSess.from("personal_records").select("id").eq("athlete_id", athleteA),
    );
    await expect("athlete CANNOT insert into other athlete's workout_logs", "deny", async () => {
      const r = await sAthleteBSess.from("workout_logs").insert({
        athlete_id: athleteA,
        exercise_id: exA!.id,
        session_id: sessA!.id,
        set_number: 99,
        actual_reps: 1,
        actual_weight_kg: 1,
        is_pr: false,
      });
      // RLS violation returns error, so map to deny
      return { data: r.data, error: r.error };
    });

    return {
      ok: true as const,
      ran_at: new Date().toISOString(),
      total: checks.length,
      passed: checks.filter((c) => c.pass).length,
      failed: checks.filter((c) => !c.pass).length,
      checks,
    };
  } catch (e) {
    return {
      ok: false as const,
      error: (e as Error).message,
      partial: checks,
    };
  } finally {
    // Cleanup
    for (const id of created) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(id);
      } catch {
        /* swallow */
      }
    }
  }
});
