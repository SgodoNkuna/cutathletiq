import * as React from "react";
import { Download, X, Smartphone } from "lucide-react";

const DISMISS_KEY = "cut-pwa-install-dismissed";

type BIPEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    // iOS Safari
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !("MSStream" in window);
}

/**
 * Visible "Install app" banner. Uses native beforeinstallprompt where
 * available (Chrome/Edge/Android), shows iOS-specific instructions on Safari,
 * and stays hidden once already installed or dismissed for the session.
 */
export function InstallBanner() {
  const [deferred, setDeferred] = React.useState<BIPEvent | null>(null);
  const [show, setShow] = React.useState(false);
  const [showIosHelp, setShowIosHelp] = React.useState(false);

  React.useEffect(() => {
    if (typeof window === "undefined") return;
    if (isStandalone()) return;
    if (sessionStorage.getItem(DISMISS_KEY)) return;

    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e as BIPEvent);
      setShow(true);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);

    // iOS doesn't fire beforeinstallprompt — show the help banner instead
    if (isIos()) setShow(true);

    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  const dismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "1");
    setShow(false);
    setShowIosHelp(false);
  };

  const install = async () => {
    if (deferred) {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice.outcome === "accepted") setShow(false);
      return;
    }
    if (isIos()) setShowIosHelp(true);
  };

  if (!show) return null;

  return (
    <>
      <div
        role="region"
        aria-label="Install CUT Athletiq"
        className="fixed bottom-3 inset-x-3 z-[55] mx-auto max-w-md rounded-2xl bg-navy-deep text-white shadow-2xl border border-gold/40 p-3 flex items-center gap-3 animate-fade-up"
      >
        <div className="h-10 w-10 rounded-xl bg-gold text-navy-deep flex items-center justify-center shrink-0">
          <Smartphone className="h-5 w-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-[11px] uppercase tracking-wider font-bold text-gold">
            Install on your phone
          </div>
          <div className="text-xs text-white/85 truncate">
            Open faster, log on the field. No app store.
          </div>
        </div>
        <button
          onClick={install}
          className="inline-flex items-center gap-1 rounded-full bg-gold text-navy-deep px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:scale-[1.02] transition-transform"
        >
          <Download className="h-3 w-3" /> Install
        </button>
        <button
          onClick={dismiss}
          aria-label="Dismiss install banner"
          className="h-7 w-7 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {showIosHelp && (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-3"
          onClick={dismiss}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl bg-card border-2 border-gold/40 p-5 shadow-2xl"
          >
            <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
              Install on iPhone
            </div>
            <h3 className="font-display text-2xl mt-1">Add to Home Screen</h3>
            <ol className="mt-3 space-y-2 text-sm">
              <li>
                <span className="font-bold">1.</span> Tap the{" "}
                <span className="font-bold">Share</span> icon in Safari (square with arrow up).
              </li>
              <li>
                <span className="font-bold">2.</span> Scroll and tap{" "}
                <span className="font-bold">"Add to Home Screen"</span>.
              </li>
              <li>
                <span className="font-bold">3.</span> Tap{" "}
                <span className="font-bold">Add</span>. Open from your home screen.
              </li>
            </ol>
            <button
              onClick={dismiss}
              className="mt-5 w-full rounded-full bg-navy text-white font-bold uppercase tracking-wider py-2.5 text-xs"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
