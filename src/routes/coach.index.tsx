import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { Sparkline, type SparkPoint } from "@/components/Sparkline";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Copy, Loader2, Plus, RefreshCw, Users, AlertCircle, ClipboardList } from "lucide-react";
import { toast } from "sonner";

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

function CoachHome() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [team, setTeam] = React.useState<Team | null>(null);
  const [members, setMembers] = React.useState<Member[]>([]);
  const [loading, setLoading] = React.useState(true);

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
    }
    setLoading(false);
  }, [profile]);

  React.useEffect(() => {
    void loadTeam();
  }, [loadTeam]);

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

  if (!profile) return null;

  const greetingName = profile.first_name?.trim() ? `Coach ${profile.first_name}` : "Coach";
  const athletes = members.filter((m) => m.role === "athlete");

  return (
    <MobileFrame title={greetingName}>
      <div className="px-5">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
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
              title="Squad"
              action={
                <Link
                  to="/coach/program"
                  className="text-[11px] font-bold text-navy uppercase tracking-wider"
                >
                  Program →
                </Link>
              }
            />

            {athletes.length === 0 ? (
              <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
                No athletes have joined yet. Share the join code above.
              </div>
            ) : (
              <div className="bg-card rounded-xl border divide-y">
                {athletes.map((a) => {
                  const full = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Athlete";
                  return (
                    <Link
                      key={a.id}
                      to="/coach/athlete/$athleteId"
                      params={{ athleteId: a.id }}
                      className="flex items-center gap-3 p-3 hover:bg-secondary/40 transition-colors"
                    >
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-navy to-navy-deep text-white font-bold flex items-center justify-center text-sm">
                        {full
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-bold truncate">{full}</div>
                        <div className="text-[10px] text-muted-foreground truncate">
                          {a.sport ?? "—"}
                          {a.position ? ` · ${a.position}` : ""}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                        View →
                      </span>
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
