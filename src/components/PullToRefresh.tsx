import * as React from "react";
import { RefreshCw } from "lucide-react";

const THRESHOLD = 70;
const MAX_PULL = 120;

/**
 * Pull-to-refresh wrapper. Attaches touch listeners to the given scroll
 * container ref and, when the user pulls down past THRESHOLD while at the
 * top of the scroll, triggers `onRefresh`. Pure touch — desktop is unaffected.
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

  React.useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onStart = (e: TouchEvent) => {
      if (el.scrollTop > 0) return;
      startY.current = e.touches[0].clientY;
    };
    const onMove = (e: TouchEvent) => {
      if (startY.current == null || refreshing) return;
      const dy = e.touches[0].clientY - startY.current;
      if (dy <= 0) {
        setPull(0);
        return;
      }
      // dampened
      setPull(Math.min(MAX_PULL, dy * 0.5));
    };
    const onEnd = async () => {
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
  return (
    <div
      aria-hidden
      style={{ height: refreshing ? 48 : pull }}
      className="flex items-center justify-center text-navy transition-[height] duration-100"
    >
      <RefreshCw
        className={`h-5 w-5 ${refreshing ? "animate-spin" : ""}`}
        style={{ transform: refreshing ? undefined : `rotate(${progress * 270}deg)`, opacity: 0.4 + progress * 0.6 }}
      />
    </div>
  );
}
