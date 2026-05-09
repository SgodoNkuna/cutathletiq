import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import logoUrl from "@/assets/cut-logo.png";
import { Input } from "@/components/ui/input";
import { signupUser } from "@/lib/server/auth.functions";
import { supabase } from "@/integrations/supabase/client";
import { TestModeStamp } from "@/components/TestModeStamp";
import { ROLES, SPORTS } from "@/data/mock";
import { ROLE_HOME, type Role } from "@/lib/auth-context";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/signup")({
  validateSearch: (s: Record<string, unknown>) => ({
    invite: typeof s.invite === "string" ? s.invite : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Create account — CUT Athletiq" },
      { name: "description", content: "Sign up as an athlete, coach, physio, or admin." },
    ],
  }),
  component: SignupPage,
});

function SignupPage() {
  const navigate = useNavigate();
  const { invite: inviteToken } = Route.useSearch();
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [role, setRole] = React.useState<Role>("athlete");
  const [sport, setSport] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [adminCode, setAdminCode] = React.useState("");
  const [consentCoach, setConsentCoach] = React.useState(false);
  const [consentPhysio, setConsentPhysio] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [inviteInfo, setInviteInfo] = React.useState<{
    teamName: string;
    teamSport: string;
    error?: string;
  } | null>(null);

  // Look up invite token (read-only) on mount
  React.useEffect(() => {
    if (!inviteToken) return;
    void (async () => {
      const { data, error } = await supabase.rpc("lookup_team_invite", { _token: inviteToken });
      const row = (data as Array<{
        team_name: string;
        team_sport: string;
        used: boolean;
        expired: boolean;
      }> | null)?.[0];
      if (error || !row) {
        setInviteInfo({ teamName: "", teamSport: "", error: "Invite link not found." });
        return;
      }
      if (row.used) {
        setInviteInfo({ teamName: row.team_name, teamSport: row.team_sport, error: "This invite has already been used." });
        return;
      }
      if (row.expired) {
        setInviteInfo({ teamName: row.team_name, teamSport: row.team_sport, error: "This invite has expired. Ask your coach for a new one." });
        return;
      }
      setInviteInfo({ teamName: row.team_name, teamSport: row.team_sport });
      setRole("athlete");
      if (row.team_sport) setSport(row.team_sport);
    })();
  }, [inviteToken]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentCoach || !consentPhysio) {
      toast.error("Please tick both consent boxes to continue.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    if (role === "coach" || role === "physio" || role === "admin") {
      const raw = adminCode;
      const trimmed = raw.trim();
      if (!trimmed) {
        toast.error(`Enter the ${role} invite code.`);
        return;
      }
      if (raw !== trimmed) {
        toast.error("Invite code has extra spaces — remove them and try again.");
        return;
      }
      if (trimmed !== trimmed.toUpperCase()) {
        toast.error("Invite codes are uppercase only.");
        return;
      }
      if (!/^[A-Z0-9]{4,16}$/.test(trimmed)) {
        toast.error("That doesn't look like a valid invite code.");
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await signupUser({
        data: {
          first_name: first,
          last_name: last,
          email,
          password,
          role,
          sport: sport || undefined,
          position: position || undefined,
          admin_invite_code:
            role === "coach" || role === "physio" || role === "admin" ? adminCode : undefined,
          consent_coach_training: consentCoach,
          consent_physio_health: consentPhysio,
        },
      });
      if (!res.ok) {
        toast.error(res.error ?? "Could not create account.");
        setSubmitting(false);
        return;
      }
      // Auto sign-in
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.success("Account created. Please sign in.");
        navigate({ to: "/login" });
        return;
      }
      // If we arrived via invite link, consume it now (joins team)
      if (inviteToken && !inviteInfo?.error) {
        const { error: cErr } = await supabase.rpc("consume_team_invite", { _token: inviteToken });
        if (cErr) {
          toast.error("Could not join team automatically. You can join manually.");
        } else {
          toast.success(`Joined ${inviteInfo?.teamName ?? "your team"}!`);
        }
      }
      toast.success("Welcome to CUT Athletiq!");
      navigate({ to: "/onboarding" });
    } catch (err) {
      console.error(err);
      toast.error("Could not create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 flex items-center justify-center py-4 px-2 md:py-10">
      <div className="relative w-full max-w-[430px] md:max-w-xl min-h-[calc(100vh-2rem)] sm:min-h-[860px] md:min-h-0 bg-background rounded-[2.25rem] md:rounded-3xl sm:border-[10px] md:border-2 border-navy-deep shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-navy text-white px-6 pt-8 pb-8">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5">
              <img src={logoUrl} alt="CUT" className="h-7 w-auto" />
            </div>
            <div>
              <div className="font-display text-xl tracking-wide leading-none">CREATE ACCOUNT</div>
              <div className="text-[11px] text-white/60">Join the CUT Athletiq squad</div>
            </div>
          </div>
        </div>

        {inviteInfo && (
          <div
            className={cn(
              "mx-5 mt-4 rounded-xl border p-3 text-xs",
              inviteInfo.error
                ? "border-destructive/40 bg-destructive/5 text-destructive"
                : "border-gold/50 bg-gold/10 text-navy-deep",
            )}
          >
            {inviteInfo.error ? (
              <div className="font-bold">{inviteInfo.error}</div>
            ) : (
              <>
                <div className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  Team invite
                </div>
                <div className="font-bold mt-0.5">
                  Joining {inviteInfo.teamName}
                  {inviteInfo.teamSport ? ` · ${inviteInfo.teamSport}` : ""}
                </div>
                <div className="text-[11px] mt-0.5 opacity-80">
                  Finish signing up and you'll be added automatically.
                </div>
              </>
            )}
          </div>
        )}

        <form onSubmit={submit} className="flex-1 overflow-y-auto px-5 py-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                First name
              </label>
              <Input
                value={first}
                onChange={(e) => setFirst(e.target.value)}
                required
                maxLength={80}
              />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Last name
              </label>
              <Input
                value={last}
                onChange={(e) => setLast(e.target.value)}
                required
                maxLength={80}
              />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Email
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
              Password (min 8 chars)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
            />
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
              I am a…
            </div>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  type="button"
                  key={r.id}
                  onClick={() => setRole(r.id as Role)}
                  className={cn(
                    "rounded-xl border-2 px-3 py-2 text-left transition-all",
                    role === r.id ? "border-gold bg-gold/10" : "border-border hover:border-navy/40",
                  )}
                >
                  <div className="text-xl">{r.emoji}</div>
                  <div className="text-sm font-bold mt-0.5">{r.label}</div>
                </button>
              ))}
            </div>
          </div>

          {role === "athlete" && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sport
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full h-9 rounded-md border bg-card px-3 text-sm"
                >
                  <option value="">Select sport…</option>
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Position
                </label>
                <Input
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  placeholder="Flanker"
                />
              </div>
            </div>
          )}

          {role === "coach" && (
            <div className="space-y-2">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Sport
                </label>
                <select
                  value={sport}
                  onChange={(e) => setSport(e.target.value)}
                  className="w-full h-9 rounded-md border bg-card px-3 text-sm"
                >
                  <option value="">Select sport…</option>
                  {SPORTS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {(role === "coach" || role === "physio" || role === "admin") && (
            <div>
              <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {role === "admin" ? "Admin" : role === "coach" ? "Coach" : "Physio"} invite code
              </label>
              <Input
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                required
                placeholder="From CUT Sports Dept."
                className="uppercase tracking-widest"
              />
            </div>
          )}

          <div className="rounded-lg border bg-secondary/30 p-3 space-y-2 text-xs">
            <div className="font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
              POPIA Consent (both required)
            </div>
            <label className="flex gap-2 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={consentCoach}
                onChange={(e) => setConsentCoach(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I consent to my training data (workouts, RPE, attendance, readiness) being shared
                with my coach and team admins.
              </span>
            </label>
            <label className="flex gap-2 items-start cursor-pointer">
              <input
                type="checkbox"
                checked={consentPhysio}
                onChange={(e) => setConsentPhysio(e.target.checked)}
                className="mt-0.5"
              />
              <span>
                I consent to my injury check-ins and clinical records being shared{" "}
                <strong>only with the physio</strong> assigned to my team. Coaches do not see this
                data.
              </span>
            </label>
            <Link to="/privacy" className="text-[11px] underline hover:text-foreground">
              Read the full Privacy Notice →
            </Link>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-3 hover:scale-[1.01] transition-transform shadow-lg disabled:opacity-60 flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Create my account
          </button>
          <p className="text-center text-[11px] text-muted-foreground">
            Already have an account?{" "}
            <Link to="/login" className="font-bold underline">
              Sign in
            </Link>
          </p>
        </form>

        <TestModeStamp />
      </div>
    </div>
  );
}
