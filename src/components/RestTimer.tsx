import * as React from "react";
import { Timer, Plus, X } from "lucide-react";

/**
 * Auto-countdown rest timer overlay.
 * - Counts down from `seconds` then calls onDone() (auto-advance).
 * - +30s button is capped at 2× the original seconds.
 * - Tap × to skip immediately.
 *
 * Mounted with a `key` per rest event so each rest starts fresh.
 */
export function RestTimer({
  seconds,
  label,
  onDone,
}: {
  seconds: number;
  label?: string;
  onDone: () => void;
}) {
  const original = React.useRef(seconds);
  const [total, setTotal] = React.useState(seconds);
  const [remaining, setRemaining] = React.useState(seconds);

  React.useEffect(() => {
    if (remaining <= 0) {
      // Haptic + audio cue.
      try {
        navigator.vibrate?.(200);
      } catch {
        /* noop */
      }
      try {
        const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.frequency.value = 880;
        g.gain.value = 0.08;
        o.connect(g);
        g.connect(ctx.destination);
        o.start();
        setTimeout(() => {
          o.stop();
          ctx.close();
        }, 220);
      } catch {
        /* noop */
      }
      onDone();
      return;
    }
    const id = setTimeout(() => setRemaining((r) => r - 1), 1000);
    return () => clearTimeout(id);
  }, [remaining, onDone]);

  const cap = original.current * 2;
  const canExtend = total + 30 <= cap;
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;

  const addThirty = () => {
    if (!canExtend) return;
    setTotal((t) => t + 30);
    setRemaining((r) => r + 30);
  };

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 pointer-events-none"
      role="status"
      aria-live="polite"
    >
      <div className="mx-auto max-w-md bg-navy-deep text-white rounded-2xl shadow-2xl border border-gold/40 p-3 pointer-events-auto">
        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 shrink-0">
            <svg viewBox="0 0 36 36" className="h-12 w-12 -rotate-90">
              <circle cx="18" cy="18" r="16" stroke="rgba(255,255,255,0.15)" strokeWidth="3" fill="none" />
              <circle
                cx="18"
                cy="18"
                r="16"
                stroke="#F5A800"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={2 * Math.PI * 16}
                strokeDashoffset={2 * Math.PI * 16 * (1 - pct / 100)}
                fill="none"
                className="transition-[stroke-dashoffset] duration-1000 ease-linear"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-sm font-black tabular-nums">
              {remaining}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider opacity-80 flex items-center gap-1">
              <Timer className="h-3 w-3" /> Rest
            </div>
            <div className="text-sm font-bold truncate">{label ?? "Get ready for next set"}</div>
          </div>
          <button
            onClick={addThirty}
            disabled={!canExtend}
            className="text-[10px] font-bold uppercase tracking-wider bg-white/10 hover:bg-white/20 rounded-full px-2.5 py-1.5 flex items-center gap-1 disabled:opacity-40"
            aria-label="Add 30 seconds"
            title={canExtend ? "+30 seconds" : `Capped at ${cap}s`}
          >
            <Plus className="h-3 w-3" /> 30s
          </button>
          <button
            onClick={onDone}
            className="h-8 w-8 rounded-full bg-gold text-navy-deep flex items-center justify-center"
            aria-label="Skip rest"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
