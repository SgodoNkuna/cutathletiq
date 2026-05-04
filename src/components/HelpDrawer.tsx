import * as React from "react";
import { Link, useLocation } from "@tanstack/react-router";
import { HelpCircle, X, BookOpen, Mail, ShieldCheck } from "lucide-react";
import { useAuth, type Role } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

/**
 * Contextual help drawer rendered from MobileFrame. The "?" button is always
 * visible in the header; clicking it slides in a panel with role-specific tips
 * and a deep-link to the full /help page.
 */

const TIPS_BY_ROLE: Record<Role, { title: string; body: string }[]> = {
  athlete: [
    { title: "Daily check-in", body: "Log sleep + readiness every morning so coaches can adjust load." },
    { title: "Logging workouts", body: "Tap the workout card to record sets, reps, weight, and RPE." },
    { title: "Injuries", body: "Use the Body tab to flag pain — high pain (≥7) auto-notifies the physio." },
  ],
  coach: [
    { title: "Programmes", body: "Build a programme, add sessions, then assign to a team. Athletes see it instantly." },
    { title: "Squad pulse", body: "The Squad screen shows readiness, completion rate, and active injuries." },
    { title: "Game minutes", body: "After a match, log minutes per athlete from the Games screen." },
  ],
  physio: [
    { title: "RTP status", body: "Update Cleared / Modified / Unavailable — the athlete is notified automatically." },
    { title: "Pain alerts", body: "High-pain check-ins land in your Cases inbox in real time." },
  ],
  admin: [
    { title: "Invite codes", body: "Rotate coach/physio/admin codes from /admin/invites." },
    { title: "System status", body: "Check /system-status for missing config or env secrets." },
    { title: "Teams", body: "Manage all teams and reassign coaches from /admin/teams." },
  ],
};

export function HelpDrawer({ role }: { role: Role }) {
  const [open, setOpen] = React.useState(false);
  const tips = TIPS_BY_ROLE[role];
  const location = useLocation();

  // Close on route change
  React.useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Help"
        className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
      >
        <HelpCircle className="h-4 w-4" />
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Help"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40"
          onClick={() => setOpen(false)}
        >
          <div
            className={cn(
              "w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border shadow-2xl p-5 max-h-[85vh] overflow-y-auto",
            )}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Quick help · {role}
                </div>
                <h2 className="font-display text-xl mt-0.5">How can we help?</h2>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close help"
                className="h-8 w-8 rounded-full bg-secondary hover:bg-muted flex items-center justify-center"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <ul className="space-y-3">
              {tips.map((t) => (
                <li key={t.title} className="rounded-xl border bg-background p-3">
                  <div className="font-bold text-sm">{t.title}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.body}</p>
                </li>
              ))}
            </ul>

            <div className="mt-4 grid grid-cols-3 gap-2">
              <Link
                to="/help"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] font-bold uppercase tracking-wider hover:bg-secondary"
              >
                <BookOpen className="h-4 w-4" />
                Full guide
              </Link>
              <Link
                to="/privacy"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] font-bold uppercase tracking-wider hover:bg-secondary"
              >
                <ShieldCheck className="h-4 w-4" />
                Privacy
              </Link>
              <a
                href="mailto:sports@cut.ac.za"
                className="flex flex-col items-center justify-center gap-1 rounded-xl border p-2 text-[10px] font-bold uppercase tracking-wider hover:bg-secondary"
              >
                <Mail className="h-4 w-4" />
                Email
              </a>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export function HelpDrawerForCurrentUser() {
  const { profile } = useAuth();
  if (!profile) return null;
  return <HelpDrawer role={profile.role} />;
}
