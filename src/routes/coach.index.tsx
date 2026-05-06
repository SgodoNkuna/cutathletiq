import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { Sparkline, type SparkPoint } from "@/components/Sparkline";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Plus, RefreshCw, Users, AlertCircle, ClipboardList, Activity, Bell } from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/coach/")({
  head: () => ({
    meta: [
      { title: "Coach Dashboard — CUT Athletiq" },
      { name: "description", content: "Your team, your join code, recent training activity." },
    ],
  }),
  component: CoachHome,
});

type Team = { id: string; name: string; sport: string; join_code: string };
type Member = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  sport: string | null;
  position: string | null;
  role: string | null;
};

type SquadStat = {
  athlete_id: string;
  first_name: string | null;
  last_name: string | null;
  sport: string | null;
  athlete_position: string | null;
  scheduled_sessions: number;
  completed_sessions: number;
  last_logged_at: string | null;
  last_exercise_name: string | null;
  total_game_minutes: number;
  has_active_injury: boolean;
};

function CoachHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = React.useState<Team | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [stats, setStats] = React.useState<SquadStat[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [refreshing, setRefreshing] = React.useState(false);
  const refreshTimer = React.useRef<number | null>(null);

  const loadTeam = React.useCallback(async () => {
    if (!profile) return;
    const { data: t } = await supabase
      .from("teams")
      .select("id, name, sport, join_code")
      .eq("coach_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setTeam(t ?? null);
    if (t) {
      const { data: m } = await supabase
        .from("team_members_safe")
        .select("id, first_name, last_name, sport, position, role")
        .eq("team_id", t.id);
      const cleaned: Member[] = (m ?? [])
        .filter((r) => !!r.id)
        .map((r) => ({
          id: r.id as string,
          first_name: r.first_name,
          last_name: r.last_name,
          sport: r.sport,
          position: r.position,
          role: r.role,
        }));
      setMembers(cleaned);

      // Squad stats — last 14 days completion + game minutes + injury flag
      const to = new Date();
      const from = new Date();
      from.setDate(to.getDate() - 13);
      const fromIso = from.toISOString().slice(0, 10);
      const toIso = to.toISOString().slice(0, 10);
      const { data: s, error: statsErr } = await supabase.rpc("team_completion_stats", {
        _from: fromIso,
        _to: toIso,
      });
      if (!statsErr && s) setStats(s as SquadStat[]);
    }
    setLoading(false);
  }, [profile]);

  React.useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

  // Section 7 — realtime pulse: refresh squad when athletes log set_completions
  React.useEffect(() => {
    if (!team) return;
    const channel = supabase
      .channel(`coach-pulse-${team.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "set_completions" },
        () => {
          setRefreshing(true);
          if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
          refreshTimer.current = window.setTimeout(() => {
            void loadTeam().finally(() => setRefreshing(false));
          }, 250);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
      if (refreshTimer.current) window.clearTimeout(refreshTimer.current);
    };
  }, [team, loadTeam]);

  const regenerate = async () => {
    if (!team) return;
    const { data: rpc } = await supabase.rpc("generate_join_code");
    const newCode = (rpc as unknown as string) ?? "";
    if (!newCode) {
      toast.error("Could not generate code");
      return;
    }
    const { data, error } = await supabase
      .from("teams")
      .update({ join_code: newCode })
      .eq("id", team.id)
      .select("id, name, sport, join_code")
      .maybeSingle();
    if (error || !data) {
      toast.error("Could not regenerate");
      return;
    }
    setTeam(data);
    toast.success("New code generated");
  };

  const copyCode = async () => {
    if (!team) return;
    try {
      await navigator.clipboard.writeText(team.join_code);
      toast.success("Code copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const nudgeAthlete = async (athleteId: string, name: string) => {
    if (!profile) return;
    const { error } = await supabase.from("nudges").insert({
      recipient_id: athleteId,
      sender_id: profile.id,
      type: "checkin_reminder",
      message: `Coach ${profile.first_name ?? ""} reminded you to complete your daily check-in.`.trim(),
      link_path: "/athlete/wellness",
    });
    if (error) {
      toast.error("Could not send nudge");
      return;
    }
    toast.success(`Nudge sent to ${name}`);
  };

  if (!profile) return null;

  const greetingName = profile.first_name?.trim() ? `Coach ${profile.first_name}` : "Coach";
  const athletes = members.filter((m) => m.role === "athlete");

  return (
    <MobileFrame title={greetingName}>
      <div className="px-5">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-6 w-40" />
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          </div>
        ) : !team ? (
          <div className="bg-gold/10 border border-gold/40 rounded-2xl p-5 text-center">
            <Users className="h-6 w-6 text-gold mx-auto" />
            <div className="font-display text-xl mt-2">No team yet</div>
            <p className="text-xs text-muted-foreground mt-1">
              Create your first team. You'll get a 6-character join code (like Zoom) to share with
              athletes.
            </p>
            <button
              onClick={() => navigate({ to: "/create-team" })}
              className="mt-4 bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-2.5 px-6 text-sm"
            >
              <Plus className="inline h-3.5 w-3.5 mr-1" /> Create team
            </button>
          </div>
        ) : (
          <>
            {/* Team + join code banner */}
            <div className="bg-gradient-to-br from-navy to-navy-deep text-white rounded-2xl p-4 relative overflow-hidden">
              <div className="text-[11px] uppercase tracking-wider text-white/70 flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-gold" /> Your team
              </div>
              <div className="font-display text-2xl mt-1">{team.name}</div>
              <div className="text-[11px] text-white/70">
                {team.sport} · {athletes.length} athlete{athletes.length === 1 ? "" : "s"}
              </div>

              <div className="mt-3 rounded-xl bg-white/10 border border-white/20 p-3 text-center">
                <div className="text-[10px] uppercase tracking-wider text-white/70 font-bold">
                  Join code — share with athletes
                </div>
                <div className="font-display text-4xl tracking-[0.4em] text-gold mt-1">
                  {team.join_code}
                </div>
                <div className="mt-2 flex gap-2 justify-center">
                  <button
                    onClick={copyCode}
                    className="inline-flex items-center gap-1 rounded-full bg-gold text-navy-deep px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  >
                    <Copy className="h-3 w-3" /> Copy
                  </button>
                  <button
                    onClick={regenerate}
                    className="inline-flex items-center gap-1 rounded-full bg-white/10 text-white border border-white/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
                  >
                    <RefreshCw className="h-3 w-3" /> New code
                  </button>
                </div>
              </div>
            </div>

            <SectionHeader
              title="Squad — last 14 days"
              action={
                <div className="flex items-center gap-3">
                  {refreshing && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-success animate-pulse">
                      <Activity className="h-3 w-3" /> Live
                    </span>
                  )}
                  <Link
                    to="/coach/games"
                    className="text-[11px] font-bold text-navy uppercase tracking-wider inline-flex items-center gap-1"
                  >
                    <ClipboardList className="h-3 w-3" /> Minutes
                  </Link>
                  <Link
                    to="/coach/program"
                    className="text-[11px] font-bold text-navy uppercase tracking-wider"
                  >
                    Program →
                  </Link>
                </div>
              }
            />

            {athletes.length === 0 ? (
              <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
                No athletes have joined yet. Share the join code above.
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3">
                {athletes.map((a) => {
                  const full = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Athlete";
                  const stat = stats.find((s) => s.athlete_id === a.id);
                  const scheduled = stat?.scheduled_sessions ?? 0;
                  const completed = stat?.completed_sessions ?? 0;
                  const pct = scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0;
                  const showAmber = scheduled > 0 && pct < 60;
                  const injured = stat?.has_active_injury ?? false;
                  // Build a tiny synthetic spark: spread completed across 7 buckets for shape.
                  const spark: SparkPoint[] = Array.from({ length: 7 }).map((_, i) => ({
                    label: String(i),
                    value:
                      completed === 0
                        ? 0
                        : Math.max(
                            0,
                            Math.round(
                              (completed / 7) *
                                (1 + 0.6 * Math.sin((i + a.id.charCodeAt(0)) * 0.9)),
                            ),
                          ),
                  }));
                  return (
                    <Link
                      key={a.id}
                      to="/coach/athlete/$athleteId"
                      params={{ athleteId: a.id }}
                      className="bg-card rounded-2xl border p-3 hover:shadow-md transition-shadow relative"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-navy to-navy-deep text-white font-bold flex items-center justify-center text-sm shrink-0">
                          {full
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)
                            .toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-bold truncate flex items-center gap-1.5">
                            {full}
                            {showAmber && (
                              <span
                                title="Below 60% completion"
                                className="h-2 w-2 rounded-full bg-amber-500 shrink-0"
                              />
                            )}
                            {injured && (
                              <AlertCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                            )}
                          </div>
                          <div className="text-[10px] text-muted-foreground truncate">
                            {a.sport ?? "—"}
                            {a.position ? ` · ${a.position}` : ""}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-display text-lg leading-none text-navy">{pct}%</div>
                          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">
                            {completed}/{scheduled}
                          </div>
                        </div>
                      </div>
                      <div className="mt-2">
                        <Sparkline data={spark} height={36} showLastLabel={false} />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-[10px] text-muted-foreground">
                        <span className="truncate">
                          {stat?.last_exercise_name
                            ? `Last: ${stat.last_exercise_name}`
                            : "No recent log"}
                        </span>
                        <span>{stat?.total_game_minutes ?? 0} min</span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          void nudgeAthlete(a.id, full);
                        }}
                        className="mt-2 w-full inline-flex items-center justify-center gap-1 rounded-full bg-secondary hover:bg-gold hover:text-navy-deep transition-colors px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider"
                      >
                        <Bell className="h-3 w-3" /> Nudge to check in
                      </button>
                    </Link>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </MobileFrame>
  );
}
