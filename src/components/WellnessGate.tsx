import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Moon, X, Zap, Sparkles } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";

const STORAGE_KEY = (uid: string) => `wellness-gate:${uid}:${new Date().toISOString().slice(0, 10)}`;

/**
 * Daily wellness gate — first open per day intercepts athletes (and only athletes).
 * Suppressed if already submitted today, skipped today, or dismissed locally today.
 *
 * All ratings are now on a 0–10 scale (sliders) for consistency with RPE / RTP.
 */
export function WellnessGate() {
  const { profile } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [sleep, setSleep] = React.useState(8);
  const [quality, setQuality] = React.useState(7);
  const [ready, setReady] = React.useState(7);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!profile || profile.role !== "athlete") return;
    const today = new Date().toISOString().slice(0, 10);
    const dismissed = typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY(profile.id));
    if (dismissed) return;
    void (async () => {
      const [{ data: wellness }, { data: skip }] = await Promise.all([
        supabase
          .from("wellness_checkins")
          .select("id")
          .eq("athlete_id", profile.id)
          .eq("checkin_date", today)
          .maybeSingle(),
        (supabase as never as { from: (t: string) => { select: (s: string) => { eq: (a: string, b: unknown) => { eq: (a: string, b: unknown) => { maybeSingle: () => Promise<{ data: unknown }> } } } } }).from("wellness_skips")
          .select("id")
          .eq("athlete_id", profile.id)
          .eq("skip_date", today)
          .maybeSingle(),
      ]);
      if (!wellness && !skip) setOpen(true);
    })();
  }, [profile]);

  if (!open || !profile) return null;

  const close = async () => {
    localStorage.setItem(STORAGE_KEY(profile.id), "1");
    setOpen(false);
    await (supabase as never as { from: (t: string) => { upsert: (r: unknown, o: unknown) => Promise<unknown> } })
      .from("wellness_skips")
      .upsert(
        { athlete_id: profile.id, skip_date: new Date().toISOString().slice(0, 10) },
        { onConflict: "athlete_id,skip_date" },
      );
  };

  const submit = async () => {
    if (sleep < 0 || sleep > 24) {
      toast.error("Enter a valid sleep value (0–24)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("wellness_checkins").insert({
      athlete_id: profile.id,
      checkin_date: new Date().toISOString().slice(0, 10),
      sleep_hours: sleep,
      sleep_quality: quality,
      readiness: ready,
    });
    setSaving(false);
    if (error) {
      if (error.code === "23505") {
        toast.success("Already logged today");
        close();
        return;
      }
      toast.error("Could not save");
      return;
    }
    toast.success("Logged — have a good session 🔥");
    close();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-up">
      <div className="bg-card rounded-3xl border-2 border-gold/40 shadow-2xl w-full max-w-[440px] p-5 relative">
        <button
          onClick={close}
          aria-label="Skip today"
          className="absolute top-3 right-3 h-8 w-8 rounded-full bg-secondary flex items-center justify-center hover:bg-secondary/70"
        >
          <X className="h-4 w-4" />
        </button>
        <div className="flex items-center gap-2 mb-1">
          <Moon className="h-5 w-5 text-gold" />
          <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
            Daily wellness check
          </div>
        </div>
        <h2 className="font-display text-2xl leading-tight">How's your body today?</h2>
        <p className="text-xs text-muted-foreground mt-1">
          30 seconds. Helps your coach manage today's load.
        </p>

        <div className="space-y-4 mt-5">
          <SleepInput value={sleep} onChange={setSleep} />
          <ScaleSlider
            label="Sleep quality"
            value={quality}
            onChange={setQuality}
            icon={<Sparkles className="h-3.5 w-3.5" />}
            lowLabel="Restless"
            highLabel="Deep"
          />
          <ScaleSlider
            label="Readiness for training"
            value={ready}
            onChange={setReady}
            icon={<Zap className="h-3.5 w-3.5" />}
            lowLabel="Drained"
            highLabel="Locked-in"
          />
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={close}
            className="flex-1 rounded-full border-2 py-3 text-xs font-bold uppercase tracking-wider hover:bg-secondary"
          >
            Skip today
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-[1.6] rounded-full bg-gold text-navy-deep py-3 text-xs font-bold uppercase tracking-wider disabled:opacity-60 hover:scale-[1.02] transition-transform shadow-lg"
          >
            {saving ? "Saving…" : "Log check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SleepInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
          Sleep hours
        </div>
        <div className="font-display text-2xl text-navy leading-none">
          {value.toFixed(1)}
          <span className="text-xs text-muted-foreground ml-1">h</span>
        </div>
      </div>
      <Slider
        min={0}
        max={12}
        step={0.5}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      />
      <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
        <span>0h</span>
        <span>6h</span>
        <span>12h</span>
      </div>
    </div>
  );
}

export function ScaleSlider({
  label,
  value,
  onChange,
  icon,
  lowLabel,
  highLabel,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  icon?: React.ReactNode;
  lowLabel?: string;
  highLabel?: string;
}) {
  const tone =
    value <= 3 ? "text-destructive" : value <= 6 ? "text-warn" : "text-success";
  return (
    <div>
      <div className="flex items-baseline justify-between mb-1.5">
        <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1">
          {icon}
          {label}
        </div>
        <div className={`font-display text-2xl leading-none ${tone}`}>
          {value}
          <span className="text-xs text-muted-foreground ml-0.5">/10</span>
        </div>
      </div>
      <Slider
        min={0}
        max={10}
        step={1}
        value={[value]}
        onValueChange={(v) => onChange(v[0] ?? 0)}
      />
      <div className="flex justify-between text-[9px] text-muted-foreground uppercase tracking-wider mt-1">
        <span>{lowLabel ?? "Low"}</span>
        <span>{highLabel ?? "High"}</span>
      </div>
    </div>
  );
}
