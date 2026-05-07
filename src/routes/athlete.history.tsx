import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { Sparkline } from "@/components/Sparkline";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, HeartPulse, Activity } from "lucide-react";

export const Route = createFileRoute("/athlete/history")({
  head: () => ({
    meta: [
      { title: "Daily log history — CUT Athletiq" },
      { name: "description", content: "Review your last function-score, pain and post-workout entries." },
    ],
  }),
  component: HistoryPage,
});

type Checkin = {
  id: string;
  submitted_at: string;
  pain_level: number;
  function_score: number | null;
  body_regions: string[];
  notes: string | null;
};

type PWL = {
  id: string;
  log_date: string;
  rpe: number;
  fatigue: number;
  soreness: number;
  mood: number;
};

function HistoryPage() {
  const { profile } = useAuth();
  const [checkins, setCheckins] = React.useState<Checkin[]>([]);
  const [pwl, setPwl] = React.useState<PWL[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    if (!profile) return;
    void (async () => {
      const [c, p] = await Promise.all([
        supabase
          .from("injury_checkins")
          .select("id, submitted_at, pain_level, function_score, body_regions, notes")
          .eq("athlete_id", profile.id)
          .order("submitted_at", { ascending: false })
          .limit(30),
        supabase
          .from("post_workout_logs")
          .select("id, log_date, rpe, fatigue, soreness, mood")
          .eq("athlete_id", profile.id)
          .order("log_date", { ascending: false })
          .limit(30),
      ]);
      setCheckins((c.data ?? []) as Checkin[]);
      setPwl((p.data ?? []) as PWL[]);
      setLoading(false);
    })();
  }, [profile]);

  const fnSpark = [...checkins]
    .filter((c) => typeof c.function_score === "number")
    .reverse()
    .slice(-14)
    .map((c, i) => ({ label: String(i), value: c.function_score! }));
  const painSpark = [...checkins]
    .reverse()
    .slice(-14)
    .map((c, i) => ({ label: String(i), value: c.pain_level }));

  return (
    <MobileFrame title="Daily log history">
      <div className="px-5 space-y-3">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-card border rounded-2xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <Activity className="h-3 w-3" /> Function /10
                </div>
                {fnSpark.length > 0 ? (
                  <Sparkline data={fnSpark} yMin={0} yMax={10} />
                ) : (
                  <div className="text-xs text-muted-foreground py-3 text-center">No data yet</div>
                )}
              </div>
              <div className="bg-card border rounded-2xl p-3">
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                  <HeartPulse className="h-3 w-3 text-destructive" /> Pain /10
                </div>
                {painSpark.length > 0 ? (
                  <Sparkline data={painSpark} stroke="var(--destructive)" yMin={0} yMax={10} />
                ) : (
                  <div className="text-xs text-muted-foreground py-3 text-center">No data yet</div>
                )}
              </div>
            </div>

            <SectionHeader
              title="Body check-ins"
              action={
                <Link to="/athlete/injury" className="text-[11px] font-bold text-navy uppercase tracking-wider">
                  Log →
                </Link>
              }
            />
            {checkins.length === 0 ? (
              <div className="bg-card border rounded-xl p-5 text-center text-sm text-muted-foreground">
                No body check-ins yet.
              </div>
            ) : (
              <div className="bg-card border rounded-xl divide-y">
                {checkins.map((c) => (
                  <div key={c.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-bold">
                        Pain {c.pain_level}/10
                        {typeof c.function_score === "number"
                          ? ` · Function ${c.function_score}/10`
                          : ""}
                      </div>
                      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                        {new Date(c.submitted_at).toLocaleDateString(undefined, {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      {c.body_regions.length > 0 ? c.body_regions.join(", ") : "—"}
                    </div>
                    {c.notes && (
                      <div className="text-xs text-foreground/80 mt-1">{c.notes}</div>
                    )}
                  </div>
                ))}
              </div>
            )}

            <SectionHeader
              title="After-workout logs"
              action={
                <Link to="/athlete/post-workout" className="text-[11px] font-bold text-navy uppercase tracking-wider">
                  Log →
                </Link>
              }
            />
            {pwl.length === 0 ? (
              <div className="bg-card border rounded-xl p-5 text-center text-sm text-muted-foreground">
                No post-workout logs yet.
              </div>
            ) : (
              <div className="bg-card border rounded-xl divide-y">
                {pwl.map((p) => (
                  <div key={p.id} className="p-3 flex items-center gap-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground w-12 shrink-0">
                      {new Date(p.log_date + "T00:00:00").toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                      <Tag label="RPE" v={p.rpe} />
                      <Tag label="Fat" v={p.fatigue} />
                      <Tag label="Sor" v={p.soreness} />
                      <Tag label="Mood" v={p.mood} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileFrame>
  );
}

function Tag({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-secondary/60 rounded-md py-1">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-navy leading-none">{v}</div>
    </div>
  );
}
