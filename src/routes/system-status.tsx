import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { checkStartupHealth } from "@/lib/server/startup.functions";
import { useAuth } from "@/lib/auth-context";
import { AlertTriangle, RefreshCw, KeyRound, ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/system-status")({
  head: () => ({
    meta: [
      { title: "System Status — CUT Athletiq" },
      { name: "description", content: "Server configuration health for CUT Athletiq." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SystemStatusPage,
});

type StartupHealth = Awaited<ReturnType<typeof checkStartupHealth>>;

function SystemStatusPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = React.useState<StartupHealth | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  React.useEffect(() => {
    if (profile?.role === "admin") void checkStartupHealth().then(setData);
  }, [profile]);

  const refresh = async () => {
    if (profile?.role !== "admin") return;
    setRefreshing(true);
    try {
      setData(await checkStartupHealth());
    } finally {
      setRefreshing(false);
    }
  };

  if (loading) {
    return <SystemStatusShell><Loader2 className="h-6 w-6 animate-spin text-navy" /></SystemStatusShell>;
  }

  if (!profile || profile.role !== "admin") {
    return (
      <SystemStatusShell>
        <div role="alert" className="max-w-md rounded-2xl border border-destructive/40 bg-card p-6 text-center shadow-lg">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-destructive" />
          <h1 className="font-display text-3xl text-navy">Access denied</h1>
          <p className="mt-2 text-sm text-muted-foreground">Only admins can view system status.</p>
          <button onClick={() => navigate({ to: "/" })} className="mt-5 rounded-full bg-navy px-4 py-2 text-xs font-bold uppercase tracking-wider text-primary-foreground">
            Go home
          </button>
        </div>
      </SystemStatusShell>
    );
  }

  if (!data) {
    return <SystemStatusShell><Loader2 className="h-6 w-6 animate-spin text-navy" /></SystemStatusShell>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 px-4 py-10">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          {data.ok ? (
            <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
              <ShieldAlert className="h-5 w-5 text-emerald-600" />
            </div>
          ) : (
            <div className="h-10 w-10 rounded-full bg-destructive/15 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
          )}
          <div>
            <h1 className="font-display text-3xl text-navy">System status</h1>
            <p className="text-sm text-muted-foreground">
              {data.ok
                ? "All required configuration is present."
                : "The server is missing required configuration."}
            </p>
          </div>
          <button
            onClick={refresh}
            className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-navy text-white px-3 py-1.5 text-xs font-bold uppercase tracking-wider hover:bg-navy-deep"
          >
            {refreshing ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
            Re-check
          </button>
        </div>

        {!data.ok && (
          <div className="mb-6 rounded-2xl border border-destructive/40 bg-destructive/5 p-4 text-sm">
            <div className="font-bold text-destructive mb-1">Action required</div>
            <p className="text-muted-foreground">
              The app will boot, but features that depend on missing values will fail. Set the values
              listed below — environment secrets in Lovable Cloud → Secrets, invite codes in{" "}
              <Link to="/admin/invites" className="underline">/admin/invites</Link>.
            </p>
          </div>
        )}

        <section className="bg-card border rounded-2xl p-5 mb-4">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3">
            Environment secrets
          </h2>
          <ul className="space-y-2">
            {(data.checked as readonly string[]).map((key: string) => {
              const missing = (data.missing as string[]).includes(key);
              return (
                <li key={key} className="flex items-center justify-between text-sm">
                  <code className="font-mono">{key}</code>
                  <span
                    className={
                      missing
                        ? "text-destructive font-bold text-xs uppercase"
                        : "text-emerald-600 font-bold text-xs uppercase"
                    }
                  >
                    {missing ? "Missing" : "Set"}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="bg-card border rounded-2xl p-5">
          <h2 className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
            <KeyRound className="h-4 w-4" /> Invite codes
          </h2>
          <ul className="space-y-3">
            {data.inviteCodes.map((c: { role: string; configured: boolean; masked: string; source: string }) => (
              <li
                key={c.role}
                className="flex items-center justify-between border-b last:border-b-0 pb-3 last:pb-0"
              >
                <div>
                  <div className="font-bold capitalize">{c.role}</div>
                  <div className="text-[11px] text-muted-foreground">{c.source}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono tracking-[0.2em] text-sm">{c.masked}</div>
                  <div
                    className={
                      c.configured
                        ? "text-[10px] uppercase font-bold text-emerald-600"
                        : "text-[10px] uppercase font-bold text-destructive"
                    }
                  >
                    {c.configured ? "Configured" : "Missing"}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <E2ESuitePanel />

        <div className="mt-6 text-xs text-muted-foreground text-center">
          Last checked {new Date(data.serverTime).toLocaleString()} ·{" "}
          <Link to="/security" className="underline">Security notes</Link> ·{" "}
          <Link to="/" className="underline">Home</Link>
        </div>
      </div>
    </div>
  );
}

function SystemStatusShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 px-4 py-10 flex items-center justify-center">{children}</div>;
}

// Admin-facing inventory of the Playwright E2E suites that live in /scripts.
// Read-only — gives admins one place to see which login / invite / onboarding
// flows are covered and how to run them.
const E2E_SUITES: Array<{ file: string; area: string; covers: string }> = [
  { file: "scripts/auth-redirect.spec.ts",          area: "Login",        covers: "New-user → /onboarding; demo athlete → /athlete under 2s" },
  { file: "scripts/auth-profile-backfill.spec.ts",  area: "Login",        covers: "Auth user without profiles row is backfilled on sign-in (asserts exact /onboarding then /athlete URLs)" },
  { file: "scripts/auth-no-spinner.spec.ts",        area: "Login",        covers: "Sign-in → /athlete <2s with no full-screen spinner / 'Loading…' state" },
  { file: "scripts/auth-timing.spec.ts",         area: "Login",        covers: "Repeated random-account sign-in stays under 2s (screenshots)" },
  { file: "scripts/auth-layout.spec.ts",         area: "Login/Signup", covers: "Desktop 1280×800 layout stable, brand aside visible, no reflow" },
  { file: "scripts/onboarding-redirect.spec.ts", area: "Onboarding",   covers: "Welcome heading + Continue CTA render after first login" },
  { file: "scripts/invite-banner.spec.ts",       area: "Invites",      covers: "Banner role=status: not-found / expired / used" },
  { file: "scripts/invite-banner-a11y.spec.ts",  area: "Invites",      covers: "Banner aria-live + keyboard reachability" },
  { file: "scripts/invite-invalid.spec.ts",      area: "Invites",      covers: "Garbage / zero / non-uuid tokens → not-found banner" },
  { file: "scripts/no-phone-auth.spec.ts",       area: "Auth UI",      covers: "Asserts no phone/SMS/OTP inputs render on login or signup" },
  { file: "scripts/update-prompt.spec.ts",       area: "PWA",          covers: "Update banner appears + dismisses on version.json change" },
];

function E2ESuitePanel() {
  return (
    <section className="bg-card border rounded-2xl p-5 mt-4" aria-labelledby="e2e-suite-heading">
      <h2 id="e2e-suite-heading" className="font-bold text-sm uppercase tracking-wider text-muted-foreground mb-1">
        E2E test suite (admin)
      </h2>
      <p className="text-[11px] text-muted-foreground mb-3">
        Run all from the project root: <code className="font-mono bg-secondary/40 px-1 rounded">bunx playwright test</code>.
        Trace + screenshots are retained on failure.
      </p>
      <ul className="divide-y">
        {E2E_SUITES.map((s) => (
          <li key={s.file} className="py-2 flex items-start justify-between gap-3 text-sm">
            <div className="min-w-0">
              <div className="font-mono text-[11px] truncate">{s.file}</div>
              <div className="text-xs text-muted-foreground">{s.covers}</div>
            </div>
            <span className="shrink-0 text-[10px] uppercase font-bold tracking-wider text-navy bg-navy/10 rounded-full px-2 py-0.5">
              {s.area}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
