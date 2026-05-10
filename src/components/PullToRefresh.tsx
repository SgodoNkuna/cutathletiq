import * as React from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 120;

function isInteractiveTarget(t: EventTarget | null): boolean {
  if (!(t instanceof Element)) return false;
  // Skip pull-to-refresh while interacting with form fields, scrollable
  // sub-regions, modals/sheets, sliders, etc.
  if (t.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']"))
    return true;
  if (t.closest('[role="slider"], [role="dialog"], [role="alertdialog"], [data-no-ptr]'))
    return true;
  // Any scrollable ancestor that itself isn't already at scrollTop 0 should
  // own the gesture (e.g. nested overflow lists, body maps).
  let el: Element | null = t;
  while (el && el !== document.body) {
    if (el instanceof HTMLElement) {
      const oy = getComputedStyle(el).overflowY;
      if ((oy === "auto" || oy === "scroll") && el.scrollHeight > el.clientHeight && el.scrollTop > 0) {
        return true;
      }
    }
    el = el.parentElement;
  }
  return false;
}

/**
 * Pull-to-refresh wrapper. Touch only — desktop is unaffected. Ignores
 * gestures that start on inputs, scrollable sub-regions, modals, or sliders
 * so users don't accidentally trigger a refresh while typing or adjusting
 * RPE. Shows a clear loading state while the refresh runs.
 */
export function PullToRefresh({
  scrollRef,
  onRefresh,
}: {
  scrollRef: React.RefObject<HTMLElement | null>;
  onRefresh?: () => void | Promise<void>;
}) {
  const [pull, setPull] = React.useState(0);
  const [refreshing, setRefreshing] = React.useState(false);
  const startY = React.useRef<number | null>(null);
  const blocked = React.useRef(false);

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (refreshing) return;
      if (el.scrollTop > 0) return;
      if (isInteractiveTarget(e.target)) {
        blocked.current = true;
        return;
      }
      blocked.current = false;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (blocked.current || startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      setPull(Math.min(MAX_PULL, dy * 0.5));
    };
    const onEnd = async () => {
      if (blocked.current) {
        blocked.current = false;
        return;
      }
      if (startY.current == null) return;
      startY.current = null;
      if (pull >= THRESHOLD && !refreshing) {
        setRefreshing(true);
        try {
          if (onRefresh) await onRefresh();
          else window.location.reload();
        } finally {
          setRefreshing(false);
          setPull(0);
        }
      } else {
        setPull(0);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onEnd);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [scrollRef, pull, refreshing, onRefresh]);

  if (pull === 0 && !refreshing) return null;
  const progress = Math.min(1, pull / THRESHOLD);
  const ready = pull >= THRESHOLD;
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy={refreshing}
      data-testid="ptr-indicator"
      style={{ height: refreshing ? 56 : pull }}
      className="flex flex-col items-center justify-center gap-1 text-navy transition-[height] duration-100 select-none pointer-events-none"
    >
      <RefreshCw
        className={`h-5 w-5 ${refreshing ? "animate-spin text-gold" : ready ? "text-navy" : "text-navy/60"}`}
        style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
      />
      {refreshing && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-navy/80">Refreshing…</span>
      )}
    </div>
  );
}
