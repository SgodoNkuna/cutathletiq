import * as React from "react";
import { RefreshCw, X } from "lucide-react";

/**
 * Lightweight "new version available" banner. Polls /version.json (cached as
 * `no-store` by the Lovable proxy) every 60s; if the value changes from the
 * version captured at first load, prompts the user to refresh. No service
 * worker required — works inside the editor preview iframe too.
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

    const id = window.setInterval(async () => {
      const v = await fetchVersion();
      if (!cancelled && v) setLatest(v);
    }, 60_000);

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
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 max-w-sm w-[calc(100%-2rem)] bg-navy-deep text-white rounded-2xl shadow-2xl border border-gold/40 px-4 py-3 flex items-center gap-3 animate-fade-up"
    >
      <RefreshCw className="h-4 w-4 text-gold shrink-0" />
      <div className="flex-1 text-xs">
        <div className="font-bold uppercase tracking-wider text-[10px] text-gold">Update ready</div>
        <div className="text-white/80 mt-0.5">A new version is available — refresh to load it.</div>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="rounded-full bg-gold text-navy-deep px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
      >
        Refresh
      </button>
      <button
        aria-label="Dismiss update prompt"
        onClick={() => setDismissed(true)}
        className="text-white/60 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
