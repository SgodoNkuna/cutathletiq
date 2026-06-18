import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type DBExercise = {
  id: string;
  name: string;
  sets: number;
  reps: number;
  weight_kg: number | null;
  order_index: number;
  notes: string | null;
  session_id: string;
  instructions: string | null;
  manual_finish: boolean;
  duration_seconds: number | null;
  group_id: string | null;
  group_label: string | null;
  group_color: string | null;
  rest_seconds: number | null;
  video_url: string | null;
};

export type DBSession = {
  id: string;
  name: string;
  session_date: string;
  notes: string | null;
  programme_id: string;
  is_rest_day: boolean;
  day_index: number;
  is_circuit: boolean;
  circuit_rounds: number;
  circuit_rest_seconds: number;
  exercises: DBExercise[];
};

export type DBProgramme = {
  id: string;
  name: string;
  sport: string | null;
  team_id: string | null;
  coach_id: string;
  start_date: string | null;
  end_date: string | null;
  sessions: DBSession[];
};

/** Coach-side: fetch (or lazily create) the active programme for this coach's team. */
export function useCoachProgramme(coachId: string | null, teamId: string | null) {
  const [programme, setProgramme] = React.useState<DBProgramme | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  const reload = React.useCallback(async () => {
    if (!coachId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: programmes, error } = await supabase
      .from("programmes")
      .select(
        "id, name, sport, team_id, coach_id, start_date, end_date, sessions(id, name, session_date, notes, programme_id, is_rest_day, day_index, is_circuit, circuit_rounds, circuit_rest_seconds, exercises(id, name, sets, reps, weight_kg, order_index, notes, session_id, instructions, manual_finish, duration_seconds, group_id, group_label, group_color, rest_seconds, video_url))",
      )
      .eq("coach_id", coachId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error("Could not load programme");
      setLoading(false);
      return;
    }

    if (!programmes) {
      // Auto-create empty programme for the coach's team
      const { data: created, error: createErr } = await supabase
        .from("programmes")
        .insert({ coach_id: coachId, team_id: teamId, name: "Week 1 Programme" })
        .select("id, name, sport, team_id, coach_id, start_date, end_date")
        .single();
      if (createErr || !created) {
        toast.error("Could not create programme");
        setLoading(false);
        return;
      }
      setProgramme({ ...created, sessions: [] });
    } else {
      const p = programmes as unknown as DBProgramme;
      // Sort sessions and exercises
      p.sessions = (p.sessions ?? []).sort((a, b) => a.session_date.localeCompare(b.session_date));
      for (const s of p.sessions) {
        s.exercises = (s.exercises ?? []).sort((a, b) => a.order_index - b.order_index);
      }
      setProgramme(p);
    }
    setLoading(false);
  }, [coachId, teamId]);

  React.useEffect(() => {
    void reload();
  }, [reload]);

  const addSession = async (date: string, name: string) => {
    if (!programme) return;
    setSaving(true);
    const nextDayIndex = programme.sessions.length;
    const { data, error } = await supabase
      .from("sessions")
      .insert({ programme_id: programme.id, session_date: date, name, day_index: nextDayIndex })
      .select("id, name, session_date, notes, programme_id, is_rest_day, day_index, is_circuit, circuit_rounds, circuit_rest_seconds")
      .single();
    setSaving(false);
    if (error || !data) {
      toast.error("Add session failed");
      return;
    }
    setProgramme((p) => (p ? { ...p, sessions: [...p.sessions, { ...data, exercises: [] }] } : p));
  };

  const removeSession = async (sessionId: string) => {
    setSaving(true);
    const { error } = await supabase.from("sessions").delete().eq("id", sessionId);
    setSaving(false);
    if (error) {
      toast.error("Remove failed");
      return;
    }
    setProgramme((p) => (p ? { ...p, sessions: p.sessions.filter((s) => s.id !== sessionId) } : p));
  };

  const updateSession = async (
    sessionId: string,
    patch: Partial<Pick<DBSession, "name" | "session_date" | "is_rest_day" | "day_index" | "is_circuit" | "circuit_rounds" | "circuit_rest_seconds">>,
  ) => {
    setProgramme((p) =>
      p
        ? {
            ...p,
            sessions: p.sessions.map((s) => (s.id === sessionId ? { ...s, ...patch } : s)),
          }
        : p,
    );
    const { error } = await supabase.from("sessions").update(patch).eq("id", sessionId);
    if (error) toast.error("Save failed");
  };

  const addExercise = async (
    sessionId: string,
    prefill?: Partial<
      Pick<
        DBExercise,
        "name" | "sets" | "reps" | "rest_seconds" | "instructions" | "video_url" | "notes"
      >
    >,
  ) => {
    const session = programme?.sessions.find((s) => s.id === sessionId);
    if (!session) return;
    const order = session.exercises.length;
    const { data, error } = await supabase
      .from("exercises")
      .insert({
        session_id: sessionId,
        name: prefill?.name ?? "New exercise",
        sets: prefill?.sets ?? 3,
        reps: prefill?.reps ?? 8,
        rest_seconds: prefill?.rest_seconds ?? null,
        instructions: prefill?.instructions ?? null,
        video_url: prefill?.video_url ?? null,
        notes: prefill?.notes ?? null,
        order_index: order,
      })
      .select(
        "id, name, sets, reps, weight_kg, order_index, notes, session_id, instructions, manual_finish, duration_seconds, group_id, group_label, group_color, rest_seconds, video_url",
      )
      .single();
    if (error || !data) {
      toast.error("Add exercise failed");
      return;
    }
    setProgramme((p) =>
      p
        ? {
            ...p,
            sessions: p.sessions.map((s) =>
              s.id === sessionId ? { ...s, exercises: [...s.exercises, data] } : s,
            ),
          }
        : p,
    );
  };

  const updateExercise = async (
    exId: string,
    sessionId: string,
    patch: Partial<
      Pick<
        DBExercise,
        | "name"
        | "sets"
        | "reps"
        | "weight_kg"
        | "notes"
        | "instructions"
        | "manual_finish"
        | "duration_seconds"
        | "order_index"
        | "group_id"
        | "group_label"
        | "group_color"
        | "rest_seconds"
        | "video_url"
      >
    >,
  ) => {
    setProgramme((p) =>
      p
        ? {
            ...p,
            sessions: p.sessions.map((s) =>
              s.id === sessionId
                ? {
                    ...s,
                    exercises: s.exercises.map((x) => (x.id === exId ? { ...x, ...patch } : x)),
                  }
                : s,
            ),
          }
        : p,
    );
    const { error } = await supabase.from("exercises").update(patch).eq("id", exId);
    if (error) {
      // Surface DB CHECK constraint failures (Section 9) to the coach.
      if (error.code === "23514") {
        toast.error("Drill is invalid: needs sets > 0 and either reps > 0 or duration > 0");
      } else {
        toast.error("Save failed");
      }
    }
  };

  const removeExercise = async (exId: string, sessionId: string) => {
    const { error } = await supabase.from("exercises").delete().eq("id", exId);
    if (error) {
      toast.error("Remove failed");
      return;
    }
    setProgramme((p) =>
      p
        ? {
            ...p,
            sessions: p.sessions.map((s) =>
              s.id === sessionId
                ? { ...s, exercises: s.exercises.filter((x) => x.id !== exId) }
                : s,
            ),
          }
        : p,
    );
  };

  const renameProgramme = async (name: string) => {
    if (!programme) return;
    setProgramme({ ...programme, name });
    const { error } = await supabase.from("programmes").update({ name }).eq("id", programme.id);
    if (error) toast.error("Rename failed");
  };

  return {
    programme,
    loading,
    saving,
    reload,
    addSession,
    removeSession,
    updateSession,
    addExercise,
    updateExercise,
    removeExercise,
    renameProgramme,
  };
}

/** Athlete-side: fetch the next upcoming session in their team's programme. */
export async function fetchTodaysSessionForAthlete(): Promise<DBSession | null> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: userData } = await supabase.auth.getUser();
  const athleteId = userData.user?.id;
  const supabaseAny = supabase as any;
  const [{ data }, { data: completedRows }, { data: loggedRows }] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, name, session_date, notes, programme_id, programmes(name), is_rest_day, day_index, is_circuit, circuit_rounds, circuit_rest_seconds, exercises(id, name, sets, reps, weight_kg, order_index, notes, session_id, instructions, manual_finish, duration_seconds, group_id, group_label, group_color, rest_seconds, video_url)",
      )
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .limit(12),
    athleteId
      ? supabaseAny.from("session_completions").select("session_id").eq("athlete_id", athleteId)
      : Promise.resolve({ data: [] }),
    athleteId
      ? supabase.from("workout_logs").select("session_id").eq("athlete_id", athleteId)
      : Promise.resolve({ data: [] }),
  ]);
  const completed = new Set<string>([
    ...((completedRows ?? []) as Array<{ session_id: string }>).map((r) => r.session_id),
    ...((loggedRows ?? []) as Array<{ session_id: string }>).map((r) => r.session_id),
  ]);
  const next = (data ?? []).find((s) => !completed.has(s.id));
  if (!next) return null;
  const s = next as unknown as DBSession;
  s.exercises = (s.exercises ?? []).sort((a, b) => a.order_index - b.order_index);
  return s;
}

/** Athlete-side: fetch upcoming sessions excluding completed/logged sessions. */
export async function fetchUpcomingSessionsForAthlete(limit = 5): Promise<DBSession[]> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: userData } = await supabase.auth.getUser();
  const athleteId = userData.user?.id;
  const supabaseAny = supabase as any;
  const [{ data }, { data: completedRows }, { data: loggedRows }] = await Promise.all([
    supabase
      .from("sessions")
      .select(
        "id, name, session_date, notes, programme_id, programmes(name), is_rest_day, day_index, is_circuit, circuit_rounds, circuit_rest_seconds, exercises(id, name, sets, reps, weight_kg, order_index, notes, session_id, instructions, manual_finish, duration_seconds, group_id, group_label, group_color, rest_seconds, video_url)",
      )
      .gte("session_date", today)
      .order("session_date", { ascending: true })
      .limit(20),
    athleteId
      ? supabaseAny.from("session_completions").select("session_id").eq("athlete_id", athleteId)
      : Promise.resolve({ data: [] }),
    athleteId
      ? supabase.from("workout_logs").select("session_id").eq("athlete_id", athleteId)
      : Promise.resolve({ data: [] }),
  ]);
  const completed = new Set<string>([
    ...((completedRows ?? []) as Array<{ session_id: string }>).map((r) => r.session_id),
    ...((loggedRows ?? []) as Array<{ session_id: string }>).map((r) => r.session_id),
  ]);
  return (data ?? [])
    .filter((s) => !completed.has(s.id))
    .slice(0, limit)
    .map((s) => {
      const session = s as unknown as DBSession;
      session.exercises = (session.exercises ?? []).sort((a, b) => a.order_index - b.order_index);
      return session;
    });
}
