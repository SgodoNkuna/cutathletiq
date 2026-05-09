import * as React from "react";
import { CheckCircle2, XCircle, Smartphone, Download, Info } from "lucide-react";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

/**
 * In-app PWA status widget. Tells the user, in plain English, whether:
 *  - the manifest is reachable
 *  - the service worker is registered (if any)
 *  - the install prompt is currently available
 *  - the app is already running as an installed PWA
 * and walks them through "Add to Home Screen" if not.
 */
export function PWAStatusCard() {
  const [manifestOk, setManifestOk] = React.useState<boolean | null>(null);
  const [swRegistered, setSwRegistered] = React.useState<boolean | null>(null);
  const [installed, setInstalled] = React.useState(isStandalone());
  const [deferred, setDeferred] = React.useState<BIPEvent | null>(null);
  const [showHelp, setShowHelp] = React.useState(false);

  React.useEffect(() => {
    fetch("/manifest.webmanifest", { cache: "no-store" })
      .then((r) => setManifestOk(r.ok))
      .catch(() => setManifestOk(false));

    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .getRegistrations()
        .then((regs) => setSwRegistered(regs.length > 0))
        .catch(() => setSwRegistered(false));
    } else {
      setSwRegistered(false);
    }

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
    };
    const onInstalled = () => setInstalled(true);
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      if (choice.outcome === "accepted") setInstalled(true);
      setDeferred(null);
      return;
    }
    setShowHelp(true);
  };

  const Row = ({ ok, label, hint }: { ok: boolean | null; label: string; hint?: string }) => (
    <div className="flex items-start gap-2 text-xs">
      {ok === null ? (
        <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      ) : ok ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
      ) : (
        <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
      )}
      <div className="flex-1">
        <div className="font-bold">{label}</div>
        {hint && <div className="text-[11px] text-muted-foreground">{hint}</div>}
      </div>
    </div>
  );

  return (
    <div className="bg-card border rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Smartphone className="h-4 w-4 text-navy" />
        <h3 className="font-display text-lg leading-none">Install on your phone</h3>
      </div>

      <div className="space-y-2">
        <Row
          ok={installed}
          label={installed ? "Installed — running from home screen" : "Not installed yet"}
          hint={installed ? undefined : "Add to home screen for one-tap launching."}
        />
        <Row
          ok={manifestOk}
          label={manifestOk ? "App manifest detected" : "App manifest unreachable"}
        />
        <Row
          ok={swRegistered}
          label={swRegistered ? "Service worker active" : "No service worker (install still works)"}
          hint={swRegistered ? undefined : "Manifest-only install — fine for everyday use."}
        />
        <Row
          ok={!!deferred || installed}
          label={
            installed
              ? "Already installed"
              : deferred
                ? "Install prompt ready"
                : isIos()
                  ? "Use Safari Share → Add to Home Screen"
                  : "Install prompt not yet available"
          }
          hint={
            !installed && !deferred && !isIos()
              ? "Open in Chrome/Edge on your phone, or visit the published URL."
              : undefined
          }
        />
      </div>

      {!installed && (
        <button
          onClick={install}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-gold text-navy-deep px-4 py-2.5 text-xs font-bold uppercase tracking-wider hover:scale-[1.01] transition-transform"
        >
          <Download className="h-3.5 w-3.5" />
          {deferred ? "Install now" : "Show install steps"}
        </button>
      )}

      {showHelp && !deferred && !installed && (
        <div className="rounded-xl bg-secondary/40 border p-3 text-xs space-y-1.5">
          <div className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
            {isIos() ? "iPhone / iPad" : "Android / Desktop"}
          </div>
          {isIos() ? (
            <ol className="space-y-1 list-decimal list-inside">
              <li>Tap the Share icon in Safari.</li>
              <li>Choose “Add to Home Screen”.</li>
              <li>Tap Add — open the app from your home screen.</li>
            </ol>
          ) : (
            <ol className="space-y-1 list-decimal list-inside">
              <li>Open the menu (⋮) in Chrome or Edge.</li>
              <li>Tap “Install app” or “Add to Home Screen”.</li>
              <li>Confirm — launch from your home screen.</li>
            </ol>
          )}
        </div>
      )}
    </div>
  );
}
