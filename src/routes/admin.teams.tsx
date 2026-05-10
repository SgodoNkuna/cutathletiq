import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { InviteLinkCard } from "@/components/InviteLinkCard";
import { ChevronLeft, Loader2, Users, Search, Link2 } from "lucide-react";

export const Route = createFileRoute("/admin/teams")({
  head: () => ({
    meta: [
      { title: "All teams — Admin" },
      { name: "description", content: "Browse all coach teams." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AdminTeams,
});

type Row = {
  id: string;
  name: string;
  sport: string;
  join_code: string;
  created_at: string;
  coach?: { first_name: string | null; last_name: string | null } | null;
  member_count?: number;
};

function AdminTeams() {
  const { profile } = useAuth();
  const [rows, setRows] = React.useState<Row[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [openInvite, setOpenInvite] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("teams")
        .select(
          "id, name, sport, join_code, created_at, coach:profiles!teams_coach_id_fkey(first_name, last_name)",
        )
        .order("created_at", { ascending: false });
      if (cancelled) return;
      const teams = (data ?? []) as unknown as Row[];
      // get member counts
      const counts = await Promise.all(
        teams.map((t) =>
          supabase
            .from("profiles")
            .select("id", { count: "exact", head: true })
            .eq("team_id", t.id)
            .then((r) => r.count ?? 0),
        ),
      );
      teams.forEach((t, i) => (t.member_count = counts[i]));
      if (!cancelled) {
        setRows(teams);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  const filtered = rows.filter(
    (r) =>
      !q ||
      r.name.toLowerCase().includes(q.toLowerCase()) ||
      r.sport.toLowerCase().includes(q.toLowerCase()),
  );

  if (!profile) return null;

  return (
    <MobileFrame title="All teams">
      <div className="px-5 space-y-3">
        <Link
          to="/admin"
          className="inline-flex items-center gap-1 text-[11px] font-bold text-navy uppercase tracking-wider"
        >
          <ChevronLeft className="h-3.5 w-3.5" /> Back to dept
        </Link>

        <div className="relative">
          <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search team or sport"
            className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-card border text-sm focus:outline-none focus:border-gold"
          />
        </div>

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-card rounded-xl border p-6 text-center text-sm text-muted-foreground">
            No teams found.
          </div>
        ) : (
          <div className="bg-card rounded-xl border divide-y">
            {filtered.map((t) => {
              const coach =
                `${t.coach?.first_name ?? ""} ${t.coach?.last_name ?? ""}`.trim() || "Coach";
              const open = openInvite === t.id;
              return (
                <div key={t.id} className="p-3">
                  <div className="flex items-center gap-3">
                    <div className="bg-gold/15 text-gold rounded-lg p-2">
                      <Users className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-bold truncate">{t.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">
                        {coach} · {t.sport} · {t.member_count ?? 0} members
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-navy uppercase tracking-wider">
                      {t.join_code}
                    </span>
                    <button
                      onClick={() => setOpenInvite(open ? null : t.id)}
                      aria-expanded={open}
                      aria-label={open ? "Hide invite link" : "Create invite link"}
                      className="ml-1 inline-flex items-center gap-1 rounded-full bg-navy text-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider hover:bg-navy-deep"
                    >
                      <Link2 className="h-3 w-3" /> Invite
                    </button>
                  </div>
                  {open && profile && (
                    <div className="mt-3">
                      <InviteLinkCard teamId={t.id} createdBy={profile.id} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </MobileFrame>
  );
}
