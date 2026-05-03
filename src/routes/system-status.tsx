import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { checkStartupHealth } from "@/lib/server/startup.functions";
import { AlertTriangle, RefreshCw, KeyRound, ShieldAlert, Loader2 } from "lucide-react";

export const Route = createFileRoute("/system-status")({
  head: () => ({
    meta: [
      { title: "System Status — CUT Athletiq" },
      { name: "description", content: "Server configuration health for CUT Athletiq." },
      { name: "robots", content: "noindex" },
    ],
  }),
  loader: () => checkStartupHealth(),
  component: SystemStatusPage,
});

function SystemStatusPage() {
  const data = Route.useLoaderData();
  const navigate = useNavigate();
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await checkStartupHealth();
    } finally {
      setRefreshing(false);
      navigate({ to: "/system-status", reloadDocument: true });
    }
  };

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
            {data.checked.map((key) => {
              const missing = data.missing.includes(key);
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
            {data.inviteCodes.map((c) => (
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

        <div className="mt-6 text-xs text-muted-foreground text-center">
          Last checked {new Date(data.serverTime).toLocaleString()} ·{" "}
          <Link to="/security" className="underline">Security notes</Link> ·{" "}
          <Link to="/" className="underline">Home</Link>
        </div>
      </div>
    </div>
  );
}
