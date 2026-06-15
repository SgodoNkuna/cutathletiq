import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { checkStartupHealth } from "@/lib/fns/startup.functions";
import { verifyAdminInviteWiring } from "@/lib/fns/invite-debug.functions";
import { toast } from "sonner";
import { KeyRound, RefreshCw, Copy, Loader2, Eye, EyeOff, ShieldAlert, Bug, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/invites")({
  head: () => ({
    meta: [
      { title: "Invite Codes — Admin · CUT Athletiq" },
      { name: "description", content: "Manage shared coach and physio invite codes." },
    ],
  }),
  component: AdminInvites,
});

type AdminCodeInfo = { configured: boolean; masked: string };

type Role = "coach" | "physio" | "admin";
type CodeRow = { role: Role; code: string; updated_at: string };

function newCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for (let i = 0; i < 8; i++) s += alphabet[Math.floor(Math.random() * alphabet.length)];
  return s;
}

function AdminInvites() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();
  const [rows, setRows] = React.useState<CodeRow[]>([]);
  const [busy, setBusy] = React.useState<string | null>(null);
  const [adminInfo, setAdminInfo] = React.useState<AdminCodeInfo | null>(null);
  const [reveal, setReveal] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    if (loading) return;
    if (!profile || profile.role !== "admin") {
      navigate({ to: "/" });
    }
  }, [profile, loading, navigate]);

  const load = React.useCallback(async () => {
    const [{ data }, health] = await Promise.all([
      supabase
        .from("invite_codes")
        .select("role, code, updated_at")
        .in("role", ["coach", "physio", "admin"]),
      checkStartupHealth().catch(() => null),
    ]);
    setRows((data ?? []) as CodeRow[]);
    if (health) {
      const admin = health.inviteCodes.find((c) => c.role === "admin");
      if (admin) setAdminInfo({ configured: admin.configured, masked: admin.masked });
    }
  }, []);

  React.useEffect(() => {
    if (!loading && profile?.role === "admin") void load();
  }, [profile, loading, load]);

  const mask = (code: string) => {
    const c = code.trim();
    if (c.length <= 3) return "•".repeat(c.length);
    return `${c.slice(0, 2)}${"•".repeat(Math.max(c.length - 4, 2))}${c.slice(-2)}`;
  };

  const rotate = async (role: Role) => {
    setBusy(role);
    const code = newCode();
    const { error } = await supabase
      .from("invite_codes")
      .upsert({ role, code, updated_by: profile?.id, updated_at: new Date().toISOString() });
    setBusy(null);
    if (error) {
      toast.error("Could not rotate code.");
      return;
    }
    toast.success(`${role} code rotated`);
    await load();
  };

  const copy = (code: string) => {
    void navigator.clipboard.writeText(code);
    toast.success("Copied");
  };

  if (!profile) return null;

  return (
    <MobileFrame title="Invite codes">
      <div className="px-5">
        <div className="bg-gradient-to-br from-navy to-navy-deep text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/70">
            <KeyRound className="h-3.5 w-3.5 text-gold" /> Coach & physio access
          </div>
          <div className="font-display text-2xl mt-1">Shared invite codes</div>
          <div className="text-[11px] text-white/60 mt-1">
            Share the code with the new staff member. Rotate any time to invalidate previous codes.
          </div>
        </div>

        {adminInfo && !adminInfo.configured && (
          <div className="mt-3 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-[11px] flex items-center gap-2">
            <ShieldAlert className="h-3.5 w-3.5 text-destructive shrink-0" />
            <span>
              <code>ADMIN_INVITE_CODE</code> env secret is not set. Admin signup will rely on the
              database code below.
            </span>
          </div>
        )}

        <SectionHeader title="Active codes" />
        <div className="space-y-2">
          {(["admin", "coach", "physio"] as const).map((role) => {
            const row = rows.find((r) => r.role === role);
            return (
              <div key={role} className="bg-card rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {role}
                    </div>
                    <div className="font-mono font-bold text-2xl tracking-[0.3em] mt-1 flex items-center gap-2">
                      {row?.code ? (reveal[role] ? row.code : mask(row.code)) : "—"}
                      {row?.code && (
                        <button
                          aria-label={reveal[role] ? "Hide code" : "Reveal code"}
                          onClick={() => setReveal((r) => ({ ...r, [role]: !r[role] }))}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {reveal[role] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                    {row?.updated_at && (
                      <div className="text-[10px] text-muted-foreground mt-1">
                        Last rotated {new Date(row.updated_at).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      onClick={() => row && copy(row.code)}
                      disabled={!row}
                      className="inline-flex items-center gap-1 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-gold hover:text-navy-deep transition-colors disabled:opacity-50"
                    >
                      <Copy className="h-3 w-3" /> Copy
                    </button>
                    <button
                      onClick={() => rotate(role)}
                      disabled={busy === role}
                      className="inline-flex items-center gap-1 rounded-full bg-navy text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-navy-deep transition-colors disabled:opacity-60"
                    >
                      {busy === role ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <RefreshCw className="h-3 w-3" />
                      )}
                      Rotate
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <AdminInviteDebugCard />

        <div className="text-center text-[11px] text-muted-foreground mt-4">
          <Link to="/system-status" className="underline">View system status</Link> ·{" "}
          <Link to="/security" className="underline">Security notes</Link>
        </div>
      </div>
    </MobileFrame>
  );
}

function AdminInviteDebugCard() {
  const [busy, setBusy] = React.useState(false);
  const [probe, setProbe] = React.useState("");
  const [result, setResult] = React.useState<Awaited<ReturnType<typeof verifyAdminInviteWiring>> | null>(null);

  const run = async () => {
    setBusy(true);
    try {
      const res = await verifyAdminInviteWiring({ data: { probe: probe.trim() || undefined } });
      setResult(res);
      if (!res.ok) toast.error("ADMIN_INVITE_CODE not wired in either env or DB.");
      else toast.success("Backend can read ADMIN_INVITE_CODE.");
    } catch (e) {
      console.error(e);
      toast.error("Verification failed.");
    } finally {
      setBusy(false);
    }
  };

  const Pill = ({ ok, label }: { ok: boolean; label: string }) => (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${
        ok ? "bg-emerald-500/15 text-emerald-700" : "bg-destructive/15 text-destructive"
      }`}
    >
      {ok ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />} {label}
    </span>
  );

  return (
    <div className="mt-5 bg-card border-2 border-dashed border-navy/30 rounded-2xl p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Bug className="h-4 w-4 text-navy" />
        <h3 className="font-display text-lg leading-none">Admin invite-code wiring (debug)</h3>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Verifies the backend can read <code>ADMIN_INVITE_CODE</code> from the current environment
        and/or the database. Optionally test a probe code to confirm signup would accept it.
        The actual code is never returned.
      </p>

      <div className="flex gap-2">
        <Input
          value={probe}
          onChange={(e) => setProbe(e.target.value.toUpperCase())}
          placeholder="Probe code (optional)"
          className="uppercase tracking-widest text-xs"
        />
        <button
          onClick={run}
          disabled={busy}
          className="shrink-0 inline-flex items-center gap-1 rounded-full bg-navy text-white px-4 py-2 text-[11px] font-bold uppercase tracking-wider disabled:opacity-60"
        >
          {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          Run check
        </button>
      </div>

      {result && (
        <div className="rounded-lg border bg-secondary/40 p-3 space-y-2 text-xs">
          <div className="flex flex-wrap gap-1.5">
            <Pill ok={result.env.configured} label={`env ${result.env.configured ? `(${result.env.length} chars)` : "missing"}`} />
            <Pill ok={result.db.configured} label={`db ${result.db.configured ? `(${result.db.length} chars)` : "missing"}`} />
            {probe.trim() && (
              <Pill
                ok={result.probeMatches === "env" || result.probeMatches === "db"}
                label={
                  result.probeMatches === "env"
                    ? "probe matches env"
                    : result.probeMatches === "db"
                      ? "probe matches db"
                      : "probe rejected"
                }
              />
            )}
          </div>
          <div className="text-[11px] text-muted-foreground space-y-0.5">
            <div>NODE_ENV: <code>{result.runtime.nodeEnv}</code></div>
            <div>Supabase project ref: <code>{result.runtime.supabaseRef}</code></div>
            {result.db.updated_at && <div>DB code updated: {new Date(result.db.updated_at).toLocaleString()}</div>}
            <div>Checked: {new Date(result.runtime.checkedAt).toLocaleTimeString()}</div>
          </div>
        </div>
      )}
    </div>
  );
}
