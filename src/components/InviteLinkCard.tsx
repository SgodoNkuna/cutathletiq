import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Copy, AlertTriangle } from "lucide-react";

/**
 * Map a Postgres / PostgREST error from a `team_invites` insert to a
 * user-friendly message. Any RLS rejection (code 42501, or a message
 * mentioning row-level security / permission / denied) collapses to the
 * same actionable line so coaches/physios/admins always see the same
 * "you don't have permission" copy regardless of which RLS policy fired.
 */
export function mapInviteMintError(err: { code?: string; message?: string } | null): string {
  if (!err) return "Could not create invite link. Please try again.";
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  const isRls =
    code === "42501" ||
    /row-level security|permission denied|not authorized|forbidden/.test(msg);
  if (isRls) return "You don't have permission to mint invites for this team.";
  if (code === "23505" || msg.includes("duplicate")) {
    return "An invite with that token already exists. Try again.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Network error — check your connection and try again.";
  }
  return err.message ?? "Could not create invite link. Please try again.";
}

/**
 * Single-use team invite link generator. Used by coach home and admin teams
 * page. Mints a row in `team_invites` and renders a copyable /signup?invite=…
 * URL. Expires after 7 days (DB default).
 */
export function InviteLinkCard({
  teamId,
  createdBy,
  compact = false,
}: {
  teamId: string;
  createdBy: string;
  compact?: boolean;
}) {
  const [token, setToken] = React.useState<string | null>(null);
  const [expiresAt, setExpiresAt] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [mintError, setMintError] = React.useState<string | null>(null);

  const loadLatest = React.useCallback(async () => {
    const { data } = await supabase
      .from("team_invites")
      .select("token, expires_at, used_at")
      .eq("team_id", teamId)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data) {
      setToken(data.token);
      setExpiresAt(data.expires_at);
    } else {
      setToken(null);
      setExpiresAt(null);
    }
  }, [teamId]);

  React.useEffect(() => {
    void loadLatest();
  }, [loadLatest]);

  const generate = async () => {
    setBusy(true);
    setMintError(null);
    const newToken =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
    const { data, error } = await supabase
      .from("team_invites")
      .insert({ team_id: teamId, token: newToken, created_by: createdBy })
      .select("token, expires_at")
      .maybeSingle();
    setBusy(false);
    if (error || !data) {
      const msg =
        error?.code === "42501"
          ? "You don't have permission to mint invites for this team."
          : (error?.message ?? "Could not create invite link. Please try again.");
      setMintError(msg);
      toast.error(msg);
      return;
    }
    setToken(data.token);
    setExpiresAt(data.expires_at);
    toast.success("Invite link ready — copy & share");
  };

  const link = token ? `${window.location.origin}/signup?invite=${token}` : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Invite link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <div className={compact ? "" : "mt-3 bg-card border rounded-2xl p-4"}>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Single-use invite link
          </div>
          <div className="text-[11px] text-muted-foreground mt-0.5">
            Each link works once and expires after 7 days.
          </div>
        </div>
        <button
          type="button"
          onClick={generate}
          disabled={busy}
          className="inline-flex items-center gap-1 rounded-full bg-navy text-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider hover:bg-navy-deep disabled:opacity-60"
        >
          <Plus className="h-3 w-3" /> {token ? "New" : "Create"}
        </button>
      </div>
      {mintError && (
        <div
          role="alert"
          className="mt-2 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-2 text-[11px] text-destructive"
        >
          <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
          <span>{mintError}</span>
        </div>
      )}
      {token && (
        <div className="mt-3 space-y-2">
          <div className="text-[11px] font-mono break-all bg-secondary rounded-lg p-2 border">
            {link}
          </div>
          <div className="flex items-center justify-between">
            <div className="text-[10px] text-muted-foreground">
              Expires {expiresAt ? new Date(expiresAt).toLocaleDateString() : "—"}
            </div>
            <button
              type="button"
              onClick={copy}
              className="inline-flex items-center gap-1 rounded-full bg-gold text-navy-deep px-3 py-1 text-[11px] font-bold uppercase tracking-wider"
            >
              <Copy className="h-3 w-3" /> Copy link
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
