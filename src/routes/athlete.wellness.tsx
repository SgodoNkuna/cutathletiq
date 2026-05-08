import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { ScaleSlider } from "@/components/WellnessGate";
import { Slider } from "@/components/ui/slider";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Moon, Activity, Loader2, Sparkles, Zap } from "lucide-react";
import { z } from "zod";

export const Route = createFileRoute("/athlete/wellness")({
  head: () => ({
    meta: [
      { title: "Daily Wellness — CUT Athletiq" },
      { name: "description", content: "Log how you slept and how ready you feel today (out of 10)." },
    ],
  }),
  component: AthleteWellness,
});

const Schema = z.object({
  sleep_hours: z.number().min(0).max(24),
  sleep_quality: z.number().int().min(0).max(10),
  readiness: z.number().int().min(0).max(10),
  notes: z.string().max(500).optional(),
});

type Row = {
  id: string;
  checkin_date: string;
  sleep_hours: number;
  sleep_quality: number;
  readiness: number;
  notes: string | null;
};

function AthleteWellness() {
  const { profile } = useAuth();
  const [sleep, setSleep] = React.useState(8);
  const [quality, setQuality] = React.useState(7);
  const [ready, setReady] = React.useState(7);
  const [notes, setNotes] = React.useState("");
  const [saving, setSaving] = React.useState(false);
  const [history, setHistory] = React.useState<Row[]>([]);

  const today = new Date().toISOString().slice(0, 10);

  const load = React.useCallback(async () => {
    if (!profile) return;
    const { data } = await supabase
      .from("wellness_checkins")
      .select("id, checkin_date, sleep_hours, sleep_quality, readiness, notes")
      .eq("athlete_id", profile.id)
      .order("checkin_date", { ascending: false })
      .limit(14);
    const rows = (data ?? []) as Row[];
    setHistory(rows);
    const todayRow = rows.find((r) => r.checkin_date === today);
    if (todayRow) {
      setSleep(Number(todayRow.sleep_hours));
      setQuality(todayRow.sleep_quality);
      setReady(todayRow.readiness);
      setNotes(todayRow.notes ?? "");
    }
  }, [profile, today]);

  React.useEffect(() => {
    void load();
  }, [load]);

  const submit = async () => {
    if (!profile) return;
    const parsed = Schema.safeParse({
      sleep_hours: sleep,
      sleep_quality: quality,
      readiness: ready,
      notes: notes.trim() || undefined,
    });
    if (!parsed.success) {
      toast.error("Check your inputs (0–24h sleep; 0–10 ratings).");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("wellness_checkins").upsert(
      { athlete_id: profile.id, checkin_date: today, ...parsed.data },
      { onConflict: "athlete_id,checkin_date" },
    );
    setSaving(false);
    if (error) {
      toast.error("Could not save. Try again.");
      return;
    }
    toast.success("Wellness saved for today");
    void load();
  };

  const tone = (n: number) => (n <= 3 ? "text-destructive" : n <= 6 ? "text-warn" : "text-success");

  return (
    <MobileFrame title="Daily wellness">
      <div className="px-5">
        <div className="bg-gradient-to-br from-navy to-navy-deep text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/70">
            <Moon className="h-3.5 w-3.5 text-gold" /> Today · {new Date().toLocaleDateString()}
          </div>
          <div className="font-display text-2xl mt-1">How did you sleep & feel?</div>
          <div className="text-[11px] text-white/60 mt-0.5">All ratings out of 10.</div>
        </div>

        <SectionHeader title="Today's check-in" />
        <div className="bg-card rounded-2xl border p-5 space-y-5">
          <div>
            <div className="flex items-baseline justify-between mb-1.5">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                Sleep hours
              </div>
              <div className="font-display text-2xl text-navy leading-none">
                {sleep.toFixed(1)}
                <span className="text-xs text-muted-foreground ml-1">h</span>
              </div>
            </div>
            <Slider
              min={0}
              max={12}
              step={0.5}
              value={[sleep]}
              onValueChange={(v) => setSleep(v[0] ?? 0)}
            />
            <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
            </div>
          </div>
          <ScaleSlider
            label="Sleep quality"
            value={quality}
            onChange={setQuality}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            lowLabel="Restless"
            highLabel="Deep"
          />
          <ScaleSlider
            label="Gym readiness"
            value={ready}
            onChange={setReady}
            icon={<Zap className="h-3.5 w-3.5" />}
            lowLabel="Drained"
            highLabel="Locked-in"
          />
          <div>
            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              Notes (optional)
            </label>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value.slice(0, 500))}
              placeholder="Soreness, mood, etc."
              className="mt-1"
            />
          </div>
          <button
            onClick={submit}
            disabled={saving}
            className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-3 hover:scale-[1.01] transition-transform disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save today
          </button>
        </div>

        <SectionHeader title="Last 14 days" />
        {history.length === 0 ? (
          <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
            No history yet.
          </div>
        ) : (
          <div className="bg-card rounded-xl border divide-y">
            {history.map((h) => (
              <div key={h.id} className="flex items-center gap-3 p-3">
                <Activity className="h-4 w-4 text-gold" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">
                    {new Date(h.checkin_date).toLocaleDateString(undefined, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {h.sleep_hours}h sleep · quality{" "}
                    <span className={`font-bold ${tone(h.sleep_quality)}`}>{h.sleep_quality}/10</span>{" "}
                    · ready{" "}
                    <span className={`font-bold ${tone(h.readiness)}`}>{h.readiness}/10</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
