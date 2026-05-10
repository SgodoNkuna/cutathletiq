import * as React from "react";
import { RefreshCw, X } from "lucide-react";

declare global {
  interface Window {
    __UPDATE_POLL_MS?: number;
  }
}

/**
 * Lightweight "new version available" banner. Polls /version.json (cached as
 * `no-store` by the Lovable proxy) and prompts the user to refresh when the
 * value changes from what it was at first load. No service worker required —
 * works inside the editor preview iframe and on desktop too. Mounted globally
 * (root layout) so it appears on every screen, including auth.
 *
 * For E2E tests, set `window.__UPDATE_POLL_MS = 200` before navigation to
 * speed up polling.
 */
export function UpdatePrompt() {
  const [initial, setInitial] = React.useState<string | null>(null);
  const [latest, setLatest] = React.useState<string | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const fetchVersion = async () => {
      try {
        const res = await fetch(`/version.json?t=${Date.now()}`, { cache: "no-store" });
        if (!res.ok) return null;
        const j = (await res.json()) as { version?: string };
        return typeof j.version === "string" ? j.version : null;
      } catch {
        return null;
      }
    };

    void fetchVersion().then((v) => {
      if (!cancelled) setInitial(v);
    });

    const interval =
      typeof window !== "undefined" && typeof window.__UPDATE_POLL_MS === "number"
        ? window.__UPDATE_POLL_MS
        : 60_000;

    const id = window.setInterval(async () => {
      const v = await fetchVersion();
      if (!cancelled && v) setLatest(v);
    }, interval);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const updateAvailable = !!initial && !!latest && initial !== latest && !dismissed;
  if (!updateAvailable) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      data-testid="update-prompt"
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] bg-navy-deep text-white rounded-2xl shadow-2xl border border-gold/40 px-4 py-3 flex items-center gap-3 animate-fade-up"
    >
      <RefreshCw className="h-4 w-4 text-gold shrink-0" />
      <div className="flex-1 text-xs">
        <div className="font-bold uppercase tracking-wider text-[10px] text-gold">Update ready</div>
        <div className="text-white/80 mt-0.5">A new version is available — refresh to load it.</div>
      </div>
      <button
        data-testid="update-prompt-refresh"
        onClick={() => window.location.reload()}
        className="rounded-full bg-gold text-navy-deep px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
      >
        Refresh
      </button>
      <button
        data-testid="update-prompt-dismiss"
        aria-label="Dismiss update prompt"
        onClick={() => setDismissed(true)}
        className="text-white/60 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
