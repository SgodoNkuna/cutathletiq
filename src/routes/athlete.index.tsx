import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Dumbbell, HeartPulse, Trophy, ChevronRight, Loader2, Users, Moon, ClipboardCheck, History } from "lucide-react";
import { fetchUpcomingSessionsForAthlete } from "@/lib/hooks/use-coach-programme";

export const Route = createFileRoute("/athlete/")({
  head: () => ({
    meta: [
      { title: "Athlete Home — CUT Athletiq" },
      { name: "description", content: "Your daily training, readiness and recovery snapshot." },
    ],
  }),
  component: AthleteHome,
});

type UpcomingSession = { id: string; name: string; session_date: string; programme_name: string };

function AthleteHome() {
  const { profile } = useAuth();
  const [loading, setLoading] = React.useState(true);
  const [upcoming, setUpcoming] = React.useState<UpcomingSession[]>([]);
  const [prCount, setPrCount] = React.useState(0);
  const [logCount, setLogCount] = React.useState(0);
  const [teamName, setTeamName] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    if (!profile) return;
    (async () => {
      const [sessionsData, prRes, logRes, teamRes] = await Promise.all([
        fetchUpcomingSessionsForAthlete(5),
        supabase
          .from("personal_records")
          .select("id", { count: "exact", head: true })
          .eq("athlete_id", profile.id),
        supabase
          .from("workout_logs")
          .select("id", { count: "exact", head: true })
          .eq("athlete_id", profile.id),
        profile.team_id
          ? supabase.from("teams").select("name").eq("id", profile.team_id).maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      const sessions = sessionsData.map((s) => ({
        id: s.id,
        name: s.name,
        session_date: s.session_date,
        programme_name:
          (s as unknown as { programmes?: { name: string } | null }).programmes?.name ??
          "Programme",
      }));
      setUpcoming(sessions);
      setPrCount(prRes.count ?? 0);
      setLogCount(logRes.count ?? 0);
      setTeamName((teamRes.data as { name: string } | null)?.name ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  if (!profile) return null;
  const todayStr = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  const greetingName = profile.first_name?.trim() || profile.email.split("@")[0];

  return (
    <MobileFrame>
      <div className="bg-gradient-to-br from-navy to-navy-deep text-white px-5 pt-5 pb-6 rounded-b-3xl">
        <div className="text-[11px] uppercase tracking-wider text-white/60">{todayStr}</div>
        <div className="font-display text-3xl truncate">Hi {greetingName} 👋</div>
        <div className="text-[11px] text-white/70 mt-1">
          {teamName ? (
            <>
              Squad: <span className="font-bold">{teamName}</span>
            </>
          ) : (
            "Not on a team yet"
          )}
        </div>
      </div>

      <div className="px-5 pt-3">
        {!profile.team_id && (
          <Link
            to="/join-team"
            className="block bg-gold/15 border-2 border-dashed border-gold/60 rounded-2xl p-4 mb-3"
          >
            <div className="text-[11px] uppercase tracking-wider text-gold font-bold flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Join a team
            </div>
            <div className="text-sm font-bold mt-1">Got a team join code from your coach?</div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Tap to enter the 6-character code.
            </div>
          </Link>
        )}

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-2">
              <Stat label="PRs" value={prCount} />
              <Stat label="Sets logged" value={logCount} />
              <Stat label="Upcoming" value={upcoming.length} />
            </div>

            <SectionHeader
              title="Up next"
              action={
                <Link
                  to="/calendar"
                  className="text-[11px] font-bold text-navy uppercase tracking-wider"
                >
                  Calendar →
                </Link>
              }
            />
            {upcoming.length === 0 ? (
              <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
                No sessions scheduled yet. Your coach will publish a programme soon.
              </div>
            ) : (
              <div className="bg-card rounded-xl border divide-y">
                {upcoming.map((s) => (
                  <Link
                    to="/athlete/workout"
                    key={s.id}
                    className="flex items-center gap-3 p-3 hover:bg-secondary/40"
                  >
                    <div className="h-9 w-9 rounded-lg bg-gold/15 text-gold flex items-center justify-center">
                      <Dumbbell className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(s.session_date + "T00:00:00").toLocaleDateString(undefined, {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                        })}{" "}
                        · {s.programme_name}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </Link>
                ))}
              </div>
            )}

            <SectionHeader title="Quick actions" />
            <div className="grid grid-cols-2 gap-3">
              <Link
                to="/athlete/workout"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="bg-gold/15 text-gold rounded-lg p-2">
                  <Dumbbell className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Today's session</div>
                  <div className="text-[11px] text-muted-foreground">Log sets & PRs</div>
                </div>
              </Link>
              <Link
                to="/athlete/progress"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="bg-navy/10 text-navy rounded-lg p-2">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Progress</div>
                  <div className="text-[11px] text-muted-foreground">PRs & charts</div>
                </div>
              </Link>
              <Link
                to="/athlete/injury"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-destructive transition-colors"
              >
                <div className="bg-destructive/10 text-destructive rounded-lg p-2">
                  <HeartPulse className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Body check</div>
                  <div className="text-[11px] text-muted-foreground">Log pain / injury</div>
                </div>
              </Link>
              <Link
                to="/athlete/wellness"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="bg-navy/10 text-navy rounded-lg p-2">
                  <Moon className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Daily wellness</div>
                  <div className="text-[11px] text-muted-foreground">Sleep & readiness</div>
                </div>
              </Link>
              <Link
                to="/athlete/post-workout"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="bg-success/10 text-success rounded-lg p-2">
                  <ClipboardCheck className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">After workout</div>
                  <div className="text-[11px] text-muted-foreground">RPE · fatigue · mood</div>
                </div>
              </Link>
              <Link
                to="/athlete/history"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="bg-navy/10 text-navy rounded-lg p-2">
                  <History className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Daily log history</div>
                  <div className="text-[11px] text-muted-foreground">Pain · function · trends</div>
                </div>
              </Link>
              <Link
                to="/leaderboard"
                className="bg-card rounded-xl border p-3 flex items-center gap-3 hover:border-gold transition-colors"
              >
                <div className="bg-gold/15 text-gold rounded-lg p-2">
                  <Trophy className="h-5 w-5" />
                </div>
                <div>
                  <div className="text-sm font-bold">Leaderboard</div>
                  <div className="text-[11px] text-muted-foreground">Squad ranks</div>
                </div>
              </Link>
            </div>
          </>
        )}
      </div>
    </MobileFrame>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </div>
      <div className="font-display text-2xl mt-0.5">{value}</div>
    </div>
  );
}
