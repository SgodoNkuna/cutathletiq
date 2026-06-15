import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import {
  devMockResetPassword,
  roleDataSnapshot,
  runRlsDiagnostic,
} from "@/lib/fns/dev.functions";
import { useAuth } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Loader2, Copy, Download, ShieldCheck, Mail, CheckCircle2, XCircle } from "lucide-react";

export const Route = createFileRoute("/dev/diagnostics")({
  head: () => ({
    meta: [
      { title: "Dev Diagnostics — CUT Athletiq" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: DevDiagnosticsPage,
});

type RlsCheck = {
  name: string;
  expected: "allow" | "deny";
  actual: "allow" | "deny" | "error";
  pass: boolean;
  detail?: string;
};
type RlsResult =
  | { ok: true; ran_at: string; total: number; passed: number; failed: number; checks: RlsCheck[] }
  | { ok: false; error: string; partial?: RlsCheck[] };

function DevDiagnosticsPage() {
  const { profile } = useAuth();
  const [resetEmail, setResetEmail] = React.useState("");
  const [resetLink, setResetLink] = React.useState<string | null>(null);
  const [resetBusy, setResetBusy] = React.useState(false);

  const [snapBusy, setSnapBusy] = React.useState(false);

  const [rlsBusy, setRlsBusy] = React.useState(false);
  const [rlsResult, setRlsResult] = React.useState<RlsResult | null>(null);

  const onMockReset = async () => {
    if (!resetEmail.trim()) {
      toast.error("Enter an email");
      return;
    }
    setResetBusy(true);
    setResetLink(null);
    try {
      const res = await devMockResetPassword({
        data: {
          email: resetEmail.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setResetLink(res.action_link);
      toast.success("Recovery link generated (no email sent).");
    } finally {
      setResetBusy(false);
    }
  };

  const onSnapshot = async () => {
    setSnapBusy(true);
    try {
      const data = await roleDataSnapshot();
      // Inflate rows_json strings into real arrays for a friendlier file
      const inflated = {
        ...data,
        tables: Object.fromEntries(
          Object.entries(data.tables).map(([k, v]) => [
            k,
            { count: v.count, error: v.error, rows: JSON.parse(v.rows_json) as unknown[] },
          ]),
        ),
      };
      const blob = new Blob([JSON.stringify(inflated, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const role = profile?.role ?? "user";
      a.href = url;
      a.download = `cut-snapshot-${role}-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Snapshot downloaded (${Object.keys(inflated.tables).length} tables)`);
    } catch (e) {
      console.error(e);
      toast.error("Snapshot failed");
    } finally {
      setSnapBusy(false);
    }
  };

  const onRunRls = async () => {
    setRlsBusy(true);
    setRlsResult(null);
    try {
      const res = await runRlsDiagnostic();
      setRlsResult(res as RlsResult);
      if (res.ok) {
        if (res.failed === 0) toast.success(`All ${res.total} RLS checks passed`);
        else toast.error(`${res.failed} of ${res.total} RLS checks FAILED`);
      } else {
        toast.error(res.error);
      }
    } catch (e) {
      console.error(e);
      toast.error("Diagnostic crashed");
    } finally {
      setRlsBusy(false);
    }
  };

  return (
    <MobileFrame title="Dev Diagnostics">
      <div className="px-5 space-y-5 pb-8">
        <div className="rounded-2xl bg-navy text-white p-4">
          <div className="flex items-center gap-2 text-gold text-[11px] font-bold uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" /> Developer-only tools
          </div>
          <p className="text-xs text-white/70 mt-1">
            These bypass normal flows for testing and audit. Available only when DEV_MODE is on or
            in non-production builds.
          </p>
        </div>

        {/* 1. Mock password reset */}
        <section className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-navy" />
            <h2 className="font-display text-lg leading-none">Mock password reset</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Generates the recovery link directly via the admin API — no email is sent. Open the link
            in this browser to test the full reset flow.
          </p>
          <Input
            type="email"
            placeholder="user@example.com"
            value={resetEmail}
            onChange={(e) => setResetEmail(e.target.value)}
          />
          <button
            onClick={onMockReset}
            disabled={resetBusy}
            className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {resetBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate recovery link
          </button>
          {resetLink && (
            <div className="rounded-lg bg-secondary/50 border p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-wider font-bold text-muted-foreground">
                Recovery link
              </div>
              <div className="text-[11px] break-all font-mono text-foreground/80 max-h-32 overflow-auto">
                {resetLink}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(resetLink);
                    toast.success("Copied");
                  }}
                  className="inline-flex items-center gap-1 rounded-full bg-navy text-white px-3 py-1.5 text-[11px] font-bold"
                >
                  <Copy className="h-3 w-3" /> Copy
                </button>
                <a
                  href={resetLink}
                  className="inline-flex items-center gap-1 rounded-full border-2 border-navy text-navy px-3 py-1.5 text-[11px] font-bold"
                >
                  Open link →
                </a>
              </div>
            </div>
          )}
        </section>

        {/* 2. Role data snapshot */}
        <section className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download className="h-4 w-4 text-navy" />
            <h2 className="font-display text-lg leading-none">Role data snapshot</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            One-click JSON export of every row your current role+team can see across all tables.
            Run this signed in as each role for an audit review.
          </p>
          <div className="text-[11px] text-muted-foreground">
            Signed in as <span className="font-bold">{profile?.role ?? "—"}</span>
            {profile?.team_id && <> · team {profile.team_id.slice(0, 8)}…</>}
          </div>
          <button
            onClick={onSnapshot}
            disabled={snapBusy || !profile}
            className="w-full bg-navy text-white font-bold uppercase tracking-wider rounded-full py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {snapBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            Download snapshot
          </button>
        </section>

        {/* 3. RLS regression */}
        <section className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-navy" />
            <h2 className="font-display text-lg leading-none">RLS regression checks</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Spins up 5 ephemeral users (2 teams) and runs ~15 access-control assertions. Cleans up
            automatically. Takes ~10s.
          </p>
          <button
            onClick={onRunRls}
            disabled={rlsBusy}
            className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-2.5 text-xs disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {rlsBusy && <Loader2 className="h-4 w-4 animate-spin" />}
            Run diagnostic
          </button>

          {rlsResult && rlsResult.ok && (
            <div className="space-y-2">
              <div
                className={`rounded-lg p-3 text-xs font-bold ${
                  rlsResult.failed === 0
                    ? "bg-success/15 text-success border border-success/40"
                    : "bg-destructive/15 text-destructive border border-destructive/40"
                }`}
              >
                {rlsResult.passed} / {rlsResult.total} passed
              </div>
              <div className="space-y-1 max-h-80 overflow-auto">
                {rlsResult.checks.map((c, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2 rounded-md border p-2 text-[11px] ${
                      c.pass ? "bg-card" : "bg-destructive/10 border-destructive/40"
                    }`}
                  >
                    {c.pass ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="h-3.5 w-3.5 text-destructive shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-foreground">{c.name}</div>
                      <div className="text-muted-foreground">
                        expected <span className="font-bold">{c.expected}</span> · got{" "}
                        <span className="font-bold">{c.actual}</span>
                      </div>
                      {c.detail && (
                        <div className="text-muted-foreground/80 mt-0.5 break-all">{c.detail}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {rlsResult && !rlsResult.ok && (
            <div className="rounded-lg bg-destructive/15 text-destructive border border-destructive/40 p-3 text-xs">
              {rlsResult.error}
            </div>
          )}
        </section>
      </div>
    </MobileFrame>
  );
}
