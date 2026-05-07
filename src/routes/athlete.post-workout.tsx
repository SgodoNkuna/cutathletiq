import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, History } from "lucide-react";

export const Route = createFileRoute("/athlete/post-workout")({
  head: () => ({
    meta: [
      { title: "After workout — CUT Athletiq" },
      { name: "description", content: "Log how you felt after today's session." },
    ],
  }),
  component: PostWorkoutPage,
});

type PWLRow = {
  id: string;
  log_date: string;
  rpe: number;
  fatigue: number;
  soreness: number;
  mood: number;
  notes: string | null;
};

function PostWorkoutPage() {
  const { profile } = useAuth();
  const [rpe, setRpe] = React.useState(7);
  const [fatigue, setFatigue] = React.useState(5);
  const [soreness, setSoreness] = React.useState(3);
  const [mood, setMood] = React.useState(7);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [history, setHistory] = React.useState<PWLRow[]>([]);

  const loadHistory = React.useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("post_workout_logs")
      .select("id, log_date, rpe, fatigue, soreness, mood, notes")
      .eq("athlete_id", profile.id)
      .order("log_date", { ascending: false })
      .limit(14);
    setHistory((data ?? []) as PWLRow[]);
  }, [profile]);

  React.useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  const submit = async () => {
    if (!profile) return;
    setSubmitting(true);
    const { error } = await supabase.from("post_workout_logs").insert({
      athlete_id: profile.id,
      rpe,
      fatigue,
      soreness,
      mood,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error("Could not save log. Try again.");
      return;
    }
    toast.success("Logged · nice work");
    setNotes("");
    void loadHistory();
  };

  return (
    <MobileFrame title="After workout">
      <div className="px-5 space-y-3">
        <p className="text-xs text-muted-foreground">
          Quick rating of how today's session felt. Visible to your coach and physio.
        </p>

        <ScoreCard label="Rate of Perceived Exertion" hint="1 = easy · 10 = max effort" value={rpe} setValue={setRpe} min={1} />
        <ScoreCard label="Fatigue" hint="0 = fresh · 10 = wrecked" value={fatigue} setValue={setFatigue} />
        <ScoreCard label="Soreness" hint="0 = none · 10 = very sore" value={soreness} setValue={setSoreness} />
        <ScoreCard label="Mood" hint="0 = flat · 10 = great" value={mood} setValue={setMood} />

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Felt strong on squats, hamstrings tight."
            className="w-full rounded-xl border bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold mt-1"
          />
        </div>

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full bg-navy text-primary-foreground font-bold uppercase tracking-wider rounded-full py-3 hover:bg-navy-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Save log
        </button>

        <SectionHeader
          title="Recent logs"
          action={
            <Link to="/athlete" className="text-[11px] font-bold text-navy uppercase tracking-wider">
              Home →
            </Link>
          }
        />
        {history.length === 0 ? (
          <div className="bg-card border rounded-xl p-5 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
            <History className="h-5 w-5" /> No logs yet.
          </div>
        ) : (
          <div className="bg-card border rounded-xl divide-y">
            {history.map((h) => (
              <div key={h.id} className="p-3 flex items-center gap-3">
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground w-12 shrink-0">
                  {new Date(h.log_date + "T00:00:00").toLocaleDateString(undefined, {
                    day: "numeric",
                    month: "short",
                  })}
                </div>
                <div className="flex-1 grid grid-cols-4 gap-1 text-center">
                  <Mini label="RPE" v={h.rpe} />
                  <Mini label="Fat" v={h.fatigue} />
                  <Mini label="Sor" v={h.soreness} />
                  <Mini label="Mood" v={h.mood} />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileFrame>
  );
}

function ScoreCard({
  label,
  hint,
  value,
  setValue,
  min = 0,
}: {
  label: string;
  hint: string;
  value: number;
  setValue: (n: number) => void;
  min?: number;
}) {
  return (
    <div className="bg-card border rounded-2xl p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-sm font-bold">{label}</div>
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        </div>
        <div className="font-display text-3xl text-navy leading-none">
          {value}
          <span className="text-xs text-muted-foreground">/10</span>
        </div>
      </div>
      <Slider
        className="mt-3"
        value={[value]}
        onValueChange={(v) => setValue(v[0])}
        min={min}
        max={10}
        step={1}
      />
    </div>
  );
}

function Mini({ label, v }: { label: string; v: number }) {
  return (
    <div className="bg-secondary/60 rounded-md py-1">
      <div className="text-[8px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-sm text-navy leading-none">{v}</div>
    </div>
  );
}
