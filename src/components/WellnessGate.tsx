import * as React from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Moon, X } from "lucide-react";
import { toast } from "sonner";

const STORAGE_KEY = (uid: string) => `wellness-gate:${uid}:${new Date().toISOString().slice(0, 10)}`;

/**
 * Daily wellness gate — first open per day intercepts athletes (and only athletes).
 * Suppressed if already submitted today, skipped today, or dismissed locally today.
 */
export function WellnessGate() {
  const { profile } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [sleep, setSleep] = React.useState("8");
  const [quality, setQuality] = React.useState(4);
  const [ready, setReady] = React.useState(4);
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
        (supabase as any)
          .from("wellness_skips")
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
    // Persist skip so it carries across devices for today
    await (supabase as any)
      .from("wellness_skips")
      .upsert(
        { athlete_id: profile.id, skip_date: new Date().toISOString().slice(0, 10) },
        { onConflict: "athlete_id,skip_date" },
      );
  };

  const submit = async () => {
    const hours = Number(sleep);
    if (!Number.isFinite(hours) || hours < 0 || hours > 24) {
      toast.error("Enter a valid sleep value (0–24)");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("wellness_checkins").insert({
      athlete_id: profile.id,
      checkin_date: new Date().toISOString().slice(0, 10),
      sleep_hours: hours,
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
    toast.success("Logged — have a good session");
    close();
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-card rounded-3xl border-2 border-gold/40 shadow-2xl w-full max-w-[420px] p-5 relative">
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
        <h2 className="font-display text-2xl leading-tight">How did you sleep?</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Quick log helps your coach manage today's session load.
        </p>

        <div className="space-y-3 mt-4">
          <label className="block">
            <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
              Sleep (hours)
            </div>
            <input
              type="number"
              min={0}
              max={24}
              step={0.5}
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              className="w-full rounded-md border bg-background px-3 py-2 text-sm font-bold"
            />
          </label>
          <Scale label="Sleep quality" value={quality} onChange={setQuality} />
          <Scale label="Readiness for training" value={ready} onChange={setReady} />
        </div>

        <div className="flex gap-2 mt-5">
          <button
            onClick={close}
            className="flex-1 rounded-full border py-2.5 text-xs font-bold uppercase tracking-wider"
          >
            Skip today
          </button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 rounded-full bg-gold text-navy-deep py-2.5 text-xs font-bold uppercase tracking-wider disabled:opacity-60"
          >
            {saving ? "Saving…" : "Log"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Scale({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-1">
        {label}
      </div>
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`flex-1 py-2 rounded-md border-2 text-sm font-bold transition-colors ${
              value === n
                ? "bg-gold text-navy-deep border-gold"
                : "bg-background border-muted text-muted-foreground"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
