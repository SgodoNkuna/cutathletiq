import { createFileRoute, Link } from "@tanstack/react-router";
import { ShieldCheck, ExternalLink } from "lucide-react";

export const Route = createFileRoute("/security")({
  head: () => ({
    meta: [
      { title: "Security notes — CUT Athletiq" },
      {
        name: "description",
        content:
          "Why CUT Athletiq accepts the remaining Supabase security linter warnings, and the exact functions affected.",
      },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SecurityPage,
});

const ACCEPTED = [
  {
    name: "has_role(uuid, app_role)",
    why: "Required by every RLS policy that gates by role. If authenticated callers cannot execute it, RLS evaluation fails and the entire app loses access. EXECUTE is revoked from anon and PUBLIC.",
  },
  {
    name: "my_team_id()",
    why: "Returns the caller's team_id. Used inside RLS USING / WITH CHECK clauses. Same constraint as has_role — RLS cannot evaluate without it.",
  },
  {
    name: "user_team_id(uuid)",
    why: "Returns a target user's team_id, used by team-scoped RLS policies (e.g. coach can read team athletes' wellness). Required for RLS evaluation.",
  },
  {
    name: "validate_invite_code(app_role, text)",
    why: "Authenticated clients call this to check a coach/physio invite code before signup. Returns boolean only — no row data leaks.",
  },
  {
    name: "find_team_by_code(text)",
    why: "Authenticated client RPC for the join-team flow. Returns only public team metadata (name, sport, coach_id) when the code matches.",
  },
  {
    name: "save_game_minutes_bulk(uuid, jsonb)",
    why: "Coach RPC to upsert game minutes for their team. The function raises 'forbidden' (42501) unless the caller owns the game, so SECURITY DEFINER does not grant horizontal access.",
  },
  {
    name: "team_completion_stats(date, date)",
    why: "Aggregates completion data scoped by my_team_id() / has_role inside the SQL body. Only returns rows the caller is already entitled to under RLS.",
  },
  {
    name: "team_rtp_pulse()",
    why: "Returns return-to-play status for the caller's team only. Filtered by my_team_id() and role check inside the function body.",
  },
];

function SecurityPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 px-4 py-10">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <div className="h-10 w-10 rounded-full bg-emerald-500/15 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-emerald-600" />
          </div>
          <div>
            <h1 className="font-display text-3xl text-navy">Security notes</h1>
            <p className="text-sm text-muted-foreground">
              Accepted Supabase database-linter findings and rationale.
            </p>
          </div>
        </div>

        <section className="bg-card border rounded-2xl p-5 mb-6">
          <h2 className="font-bold text-base mb-2">Linter rule 0029 — accepted</h2>
          <p className="text-sm text-muted-foreground mb-3">
            <em>"Signed-In Users Can Execute SECURITY DEFINER Function"</em> — the linter flags any
            SECURITY DEFINER function that authenticated users can call. Eight of ours fall into
            that bucket by design. Each one is required either by the RLS policy machinery or as an
            explicit, intentionally-exposed RPC. EXECUTE is revoked from <code>PUBLIC</code> and{" "}
            <code>anon</code>; every function is marked{" "}
            <code>SET search_path = public</code> to prevent search-path hijacking; and the RPCs
            that perform writes (e.g. <code>save_game_minutes_bulk</code>) re-check authorization
            inside the function body.
          </p>
          <p className="text-sm text-muted-foreground">
            Moving these helpers to a private schema would require dropping and recreating roughly
            forty RLS policies across the database for zero net security gain — the same callers,
            the same checks, behind a different namespace.
          </p>
          <a
            href="https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 mt-3 text-sm text-navy underline"
          >
            Supabase docs for rule 0029 <ExternalLink className="h-3 w-3" />
          </a>
        </section>

        <section className="bg-card border rounded-2xl p-5">
          <h2 className="font-bold text-base mb-3">Affected functions</h2>
          <ul className="space-y-3">
            {ACCEPTED.map((f) => (
              <li key={f.name} className="border-b last:border-b-0 pb-3 last:pb-0">
                <code className="font-mono text-sm text-navy">public.{f.name}</code>
                <p className="text-sm text-muted-foreground mt-1">{f.why}</p>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-6 text-xs text-muted-foreground text-center">
          <Link to="/system-status" className="underline">System status</Link> ·{" "}
          <Link to="/" className="underline">Home</Link>
        </div>
      </div>
    </div>
  );
}
