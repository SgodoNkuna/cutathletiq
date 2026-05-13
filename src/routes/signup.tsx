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
import { Loader2, ShieldCheck, Trophy, Activity } from "lucide-react";

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
  const [formError, setFormError] = React.useState<string | null>(null);
  const [inviteInfo, setInviteInfo] = React.useState<{
    teamName: string;
    teamSport: string;
    error?: string;
  } | null>(null);

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

  const fail = (m: string) => {
    setFormError(m);
    toast.error(m);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!consentCoach || !consentPhysio) return fail("Please tick both consent boxes to continue.");
    if (password.length < 8) return fail("Password must be at least 8 characters.");
    if (role === "coach" || role === "physio" || role === "admin") {
      const raw = adminCode;
      const trimmed = raw.trim();
      if (!trimmed) return fail(`Enter the ${role} invite code.`);
      if (raw !== trimmed) return fail("Invite code has extra spaces — remove them and try again.");
      if (trimmed !== trimmed.toUpperCase()) return fail("Invite codes are uppercase only.");
      if (!/^[A-Z0-9]{4,16}$/.test(trimmed)) return fail("That doesn't look like a valid invite code.");
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
        fail(res.error ?? "Could not create account.");
        setSubmitting(false);
        return;
      }
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        toast.success("Account created. Please sign in.");
        navigate({ to: "/login" });
        return;
      }
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
      fail("Could not create account. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const needsCode = role === "coach" || role === "physio" || role === "admin";

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40">
      <main className="mx-auto grid min-h-screen w-full max-w-6xl grid-cols-1 lg:grid-cols-[1fr_1.1fr]">
        {/* Brand panel — desktop only */}
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden bg-navy-deep text-white p-12">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--gold)/0.18),transparent_60%),radial-gradient(circle_at_100%_100%,hsl(var(--navy)/0.6),transparent_50%)]" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="bg-white rounded-xl p-2">
                <img src={logoUrl} alt="CUT Athletiq" className="h-9 w-auto" />
              </div>
              <div>
                <div className="font-display text-2xl tracking-wide leading-none">CUT ATHLETIQ</div>
                <div className="text-xs text-white/60 mt-1">Join the squad</div>
              </div>
            </div>
          </div>
          <div className="relative space-y-6">
            <h1 className="font-display text-4xl xl:text-5xl leading-tight">
              Built for <span className="text-gold">student-athletes.</span>
            </h1>
            <p className="text-white/70 text-sm max-w-md">
              One account. Connect with your coach, log your wellness, and stay match-ready —
              wherever you train.
            </p>
            <ul className="space-y-3 text-sm">
              <Feature icon={<Activity className="h-4 w-4" />} label="Daily readiness in 30 seconds" />
              <Feature icon={<Trophy className="h-4 w-4" />} label="Squad fixtures & training plans" />
              <Feature icon={<ShieldCheck className="h-4 w-4" />} label="POPIA-compliant by default" />
            </ul>
          </div>
          <div className="relative text-[11px] text-white/40">
            Phase 1 Test Build · Authorised users only
          </div>
        </aside>

        {/* Form panel */}
        <section className="flex items-center justify-center p-4 sm:p-6 lg:p-10">
          <div className="relative w-full max-w-[480px] bg-card text-card-foreground rounded-3xl border border-border shadow-2xl overflow-hidden flex flex-col">
            {/* Mobile header */}
            <header className="lg:hidden bg-navy text-white px-6 pt-7 pb-7">
              <div className="flex items-center gap-3">
                <div className="bg-white rounded-lg p-1.5">
                  <img src={logoUrl} alt="CUT Athletiq" className="h-7 w-auto" />
                </div>
                <div>
                  <div className="font-display text-xl tracking-wide leading-none">CREATE ACCOUNT</div>
                  <div className="text-[11px] text-white/60 mt-1">Join the CUT Athletiq squad</div>
                </div>
              </div>
            </header>

            <div className="hidden lg:block px-8 pt-10 pb-2">
              <h2 className="font-display text-2xl tracking-wide">Create your account</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Takes about a minute. Your data is yours.
              </p>
            </div>

            {inviteInfo && (
              <div
                role={inviteInfo.error ? "alert" : "status"}
                aria-live={inviteInfo.error ? "assertive" : "polite"}
                aria-atomic="true"
                className={cn(
                  "mx-5 lg:mx-8 mt-4 rounded-xl border p-3 text-xs",
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

            <form onSubmit={submit} noValidate className="flex-1 overflow-y-auto px-5 lg:px-8 py-5 space-y-3">
              {/* Live error region */}
              <div
                role="alert"
                aria-live="polite"
                className={
                  formError
                    ? "rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
                    : "sr-only"
                }
              >
                {formError ?? ""}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label htmlFor="su-first" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    First name
                  </label>
                  <Input id="su-first" value={first} onChange={(e) => setFirst(e.target.value)} required maxLength={80} autoComplete="given-name" />
                </div>
                <div>
                  <label htmlFor="su-last" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Last name
                  </label>
                  <Input id="su-last" value={last} onChange={(e) => setLast(e.target.value)} required maxLength={80} autoComplete="family-name" />
                </div>
              </div>
              <div>
                <label htmlFor="su-email" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Email
                </label>
                <Input id="su-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              </div>
              <div>
                <label htmlFor="su-password" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                  Password (min 8 chars)
                </label>
                <Input id="su-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete="new-password" />
              </div>

              <fieldset>
                <legend className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                  I am a…
                </legend>
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  {ROLES.map((r) => (
                    <button
                      type="button"
                      role="radio"
                      aria-checked={role === r.id}
                      key={r.id}
                      onClick={() => setRole(r.id as Role)}
                      className={cn(
                        "rounded-xl border-2 px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy",
                        role === r.id ? "border-gold bg-gold/10" : "border-border hover:border-navy/40",
                      )}
                    >
                      <div className="text-xl">{r.emoji}</div>
                      <div className="text-sm font-bold mt-0.5">{r.label}</div>
                    </button>
                  ))}
                </div>
              </fieldset>

              {role === "athlete" && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label htmlFor="su-sport" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Sport
                    </label>
                    <select id="su-sport" value={sport} onChange={(e) => setSport(e.target.value)} className="w-full h-9 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy">
                      <option value="">Select sport…</option>
                      {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="su-pos" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      Position
                    </label>
                    <Input id="su-pos" value={position} onChange={(e) => setPosition(e.target.value)} placeholder="Flanker" />
                  </div>
                </div>
              )}

              {role === "coach" && (
                <div>
                  <label htmlFor="su-csport" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    Sport
                  </label>
                  <select id="su-csport" value={sport} onChange={(e) => setSport(e.target.value)} className="w-full h-9 rounded-md border bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy">
                    <option value="">Select sport…</option>
                    {SPORTS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              )}

              {needsCode && (
                <div>
                  <label htmlFor="su-code" className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {role === "admin" ? "Admin" : role === "coach" ? "Coach" : "Physio"} invite code
                  </label>
                  <Input
                    id="su-code"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value.toUpperCase())}
                    required
                    placeholder="From CUT Sports Dept."
                    className="uppercase tracking-widest"
                  />
                </div>
              )}

              <fieldset className="rounded-lg border bg-secondary/30 p-3 space-y-2 text-xs">
                <legend className="px-1 font-bold uppercase tracking-wider text-[10px] text-muted-foreground">
                  POPIA Consent (both required)
                </legend>
                <label className="flex gap-2 items-start cursor-pointer">
                  <input type="checkbox" checked={consentCoach} onChange={(e) => setConsentCoach(e.target.checked)} className="mt-0.5" />
                  <span>
                    I consent to my training data (workouts, RPE, attendance, readiness) being shared
                    with my coach and team admins.
                  </span>
                </label>
                <label className="flex gap-2 items-start cursor-pointer">
                  <input type="checkbox" checked={consentPhysio} onChange={(e) => setConsentPhysio(e.target.checked)} className="mt-0.5" />
                  <span>
                    I consent to my injury check-ins and clinical records being shared{" "}
                    <strong>only with the physio</strong> assigned to my team. Coaches do not see this
                    data.
                  </span>
                </label>
                <Link to="/privacy" className="text-[11px] underline hover:text-foreground">
                  Read the full Privacy Notice →
                </Link>
              </fieldset>

              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-3 hover:scale-[1.01] transition-transform shadow-lg disabled:opacity-60 flex items-center justify-center gap-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy focus-visible:ring-offset-2"
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
        </section>
      </main>
    </div>
  );
}

function Feature({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="grid place-items-center h-7 w-7 rounded-full bg-white/10 text-gold">{icon}</span>
      <span className="text-white/80">{label}</span>
    </li>
  );
}
