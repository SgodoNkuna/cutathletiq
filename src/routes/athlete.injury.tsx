import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { BodyMap, BODY_LABELS, type BodyRegion } from "@/components/BodyMap";
import { SectionHeader } from "@/components/primitives";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/athlete/injury")({
  head: () => ({
    meta: [
      { title: "Body Check — CUT Athletiq" },
      {
        name: "description",
        content: "Tap any body part to log soreness or injury for your physio.",
      },
    ],
  }),
  component: InjuryPage,
});

function InjuryPage() {
  const { profile } = useAuth();
  const [pains, setPains] = React.useState<Record<string, number>>({});
  const [activeRegion, setActiveRegion] = React.useState<BodyRegion | null>(null);
  const [pain, setPain] = React.useState(4);
  const [notes, setNotes] = React.useState("");
  const [functionScore, setFunctionScore] = React.useState(8);
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const toggle = (region: BodyRegion) => {
    setActiveRegion(region);
    setPain(pains[region] ?? 4);
  };

  const apply = () => {
    if (!activeRegion) return;
    setPains((p) => ({ ...p, [activeRegion]: pain }));
    toast(`${BODY_LABELS[activeRegion]} flagged · pain ${pain}/10`);
    setActiveRegion(null);
  };

  const remove = () => {
    if (!activeRegion) return;
    setPains((p) => {
      const next = { ...p };
      delete next[activeRegion];
      return next;
    });
    setActiveRegion(null);
  };

  const submit = async () => {
    if (!profile) return;
    if (Object.keys(pains).length === 0) {
      toast.error("Tap at least one body part first");
      return;
    }
    const maxPain = Math.max(...Object.values(pains));
    setSubmitting(true);
    const { error } = await supabase.from("injury_checkins").insert({
      athlete_id: profile.id,
      body_regions: Object.keys(pains),
      pain_level: maxPain,
      function_score: functionScore,
      notes: notes.trim() || null,
    });
    setSubmitting(false);
    if (error) {
      console.error(error);
      toast.error("Could not submit. Try again.");
      return;
    }
    setSubmitted(new Date().toLocaleString());
    setPains({});
    setNotes("");
    toast.success("Sent to your physio");
  };

  return (
    <MobileFrame title="Body check-in">
      <div className="px-5">
        <p className="text-xs text-muted-foreground">
          Tap any body part to flag soreness. Your physio sees this — your coach does not.
        </p>

        <div className="bg-card rounded-2xl border p-3 mt-3">
          <BodyMap selected={pains} onToggle={toggle} />

          {Object.keys(pains).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5 justify-center">
              {Object.entries(pains).map(([region, p]) => (
                <span
                  key={region}
                  className="inline-flex items-center gap-1 rounded-full bg-warn/15 text-warn border border-warn/40 px-2 py-0.5 text-[10px] font-bold"
                >
                  {BODY_LABELS[region as BodyRegion]} · {p}/10
                </span>
              ))}
            </div>
          )}
        </div>

        <SectionHeader title="Daily function score" />
        <div className="bg-card rounded-2xl border p-4">
          <p className="text-[11px] text-muted-foreground">
            How well can your body perform today? <strong>10</strong> = fully ready · <strong>0</strong>{" "}
            = can't train.
          </p>
          <div className="mt-3 flex items-end justify-between">
            <span className="text-[11px] text-muted-foreground">Can't train</span>
            <span className="font-display text-5xl text-navy leading-none">
              {functionScore}
              <span className="text-base text-muted-foreground">/10</span>
            </span>
            <span className="text-[11px] text-muted-foreground">Fully ready</span>
          </div>
          <Slider
            className="mt-3"
            value={[functionScore]}
            onValueChange={(v) => setFunctionScore(v[0])}
            min={0}
            max={10}
            step={1}
          />
        </div>

        <SectionHeader title="Notes (optional)" />
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Tight after sprints, eased with mobility…"
          className="w-full rounded-xl border bg-card p-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold"
        />

        <button
          onClick={submit}
          disabled={submitting}
          className="mt-4 w-full bg-navy text-primary-foreground font-bold uppercase tracking-wider rounded-full py-3 hover:bg-navy-deep transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Send to physio
        </button>

        {submitted && (
          <div className="mt-3 bg-success/10 border border-success/40 rounded-xl p-3 text-sm">
            ✅ Submitted · {submitted}
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Your physio will follow up.
            </div>
          </div>
        )}
      </div>

      {/* Pain modal */}
      {activeRegion && (
        <div
          className="absolute inset-0 z-40 bg-black/40 flex items-end"
          onClick={() => setActiveRegion(null)}
        >
          <div
            className="w-full bg-card rounded-t-3xl p-5 animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mx-auto h-1.5 w-10 rounded-full bg-border mb-3" />
            <div className="font-display text-2xl">{BODY_LABELS[activeRegion]}</div>
            <p className="text-xs text-muted-foreground">How much does it hurt right now?</p>

            <div className="mt-4 flex items-end justify-between">
              <span className="text-[11px] text-muted-foreground">No pain</span>
              <span className="font-display text-5xl text-navy leading-none">
                {pain}
                <span className="text-base text-muted-foreground">/10</span>
              </span>
              <span className="text-[11px] text-muted-foreground">Worst</span>
            </div>

            <Slider
              className="mt-3"
              value={[pain]}
              onValueChange={(v) => setPain(v[0])}
              min={0}
              max={10}
              step={1}
            />

            <div className="mt-5 flex gap-2">
              {pains[activeRegion] !== undefined && (
                <button
                  onClick={remove}
                  className="flex-1 rounded-full border-2 border-destructive text-destructive font-bold uppercase tracking-wider py-2.5 text-sm"
                >
                  Remove
                </button>
              )}
              <button
                onClick={apply}
                className="flex-1 rounded-full bg-gold text-navy-deep font-bold uppercase tracking-wider py-2.5 text-sm"
              >
                {pains[activeRegion] !== undefined ? "Update" : "Add flag"}
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
