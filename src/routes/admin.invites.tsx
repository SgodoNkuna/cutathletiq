import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { checkStartupHealth } from "@/lib/server/startup.functions";
import { toast } from "sonner";
import { KeyRound, RefreshCw, Copy, Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";

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

type CodeRow = { role: "coach" | "physio"; code: string; updated_at: string };

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
      supabase.from("invite_codes").select("role, code, updated_at").in("role", ["coach", "physio"]),
      checkStartupHealth().catch(() => null),
    ]);
    setRows((data ?? []) as CodeRow[]);
    if (health) {
      const admin = health.inviteCodes.find((c) => c.role === "admin");
      if (admin) setAdminInfo({ configured: admin.configured, masked: admin.masked });
    }
  }, []);

  React.useEffect(() => {
    if (profile?.role === "admin") void load();
  }, [profile, load]);

  const mask = (code: string) => {
    const c = code.trim();
    if (c.length <= 3) return "•".repeat(c.length);
    return `${c.slice(0, 2)}${"•".repeat(Math.max(c.length - 4, 2))}${c.slice(-2)}`;
  };

  const rotate = async (role: "coach" | "physio") => {
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

        <SectionHeader title="Active codes" />
        <div className="space-y-2">
          {(["coach", "physio"] as const).map((role) => {
            const row = rows.find((r) => r.role === role);
            return (
              <div key={role} className="bg-card rounded-2xl border p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {role}
                    </div>
                    <div className="font-mono font-bold text-2xl tracking-[0.3em] mt-1">
                      {row?.code ?? "—"}
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
      </div>
    </MobileFrame>
  );
}
