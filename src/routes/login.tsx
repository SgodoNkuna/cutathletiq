import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import logoUrl from "@/assets/cut-logo.png";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth, ROLE_HOME } from "@/lib/auth-context";
import { Input } from "@/components/ui/input";
import { TestModeStamp } from "@/components/TestModeStamp";
import { toast } from "sonner";
import { Loader2, FlaskConical, Copy, Mail, Phone } from "lucide-react";
import { devMockResetPassword } from "@/lib/server/dev.functions";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in — CUT Athletiq" },
      { name: "description", content: "Sign in to your CUT Athletiq locker." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { profile, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = React.useState<"email" | "phone">("email");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [otpSent, setOtpSent] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [resetEmail, setResetEmail] = React.useState("");
  const [showReset, setShowReset] = React.useState(false);
  const [oauthBusy, setOauthBusy] = React.useState<"google" | "apple" | null>(null);

  React.useEffect(() => {
    if (authLoading || !profile) return;
    if (!profile.onboarding_complete) navigate({ to: "/onboarding" });
    else navigate({ to: ROLE_HOME[profile.role] });
  }, [profile, authLoading, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      toast.error("Enter your email and password");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    setSubmitting(false);
    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes("invalid")) toast.error("Wrong email or password.");
      else if (msg.includes("not confirmed")) toast.error("Please verify your email first.");
      else toast.error("Could not sign in. Please try again.");
      return;
    }
    toast.success("Signed in");
  };

  const sendReset = async () => {
    if (!resetEmail.trim()) {
      toast.error("Enter the email on your account");
      return;
    }
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error("Could not send reset email. Try again.");
      return;
    }
    toast.success("Check your inbox for a reset link.");
    setShowReset(false);
    setResetEmail("");
  };

  const oauth = async (provider: "google" | "apple") => {
    setOauthBusy(provider);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error(`Could not sign in with ${provider}.`);
        return;
      }
      if (result.redirected) return;
      toast.success("Signed in");
    } catch {
      toast.error(`Could not sign in with ${provider}.`);
    } finally {
      setOauthBusy(null);
    }
  };

  const sendOtp = async () => {
    const trimmed = phone.trim();
    if (!/^\+\d{8,15}$/.test(trimmed)) {
      toast.error("Enter your phone in international format, e.g. +27821234567");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.signInWithOtp({ phone: trimmed });
    setSubmitting(false);
    if (error) {
      toast.error(
        error.message.toLowerCase().includes("provider")
          ? "SMS provider not configured yet. Use email or Google for now."
          : "Could not send code. Try again.",
      );
      return;
    }
    setOtpSent(true);
    toast.success("Code sent. Check your SMS.");
  };

  const verifyOtp = async () => {
    const trimmed = phone.trim();
    if (otp.length < 4) {
      toast.error("Enter the 6-digit code");
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.verifyOtp({
      phone: trimmed,
      token: otp.trim(),
      type: "sms",
    });
    setSubmitting(false);
    if (error) {
      toast.error("Invalid or expired code.");
      return;
    }
    toast.success("Signed in");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 flex items-center justify-center py-4 px-2 md:py-10">
      <div className="relative w-full max-w-[430px] md:max-w-lg min-h-[calc(100vh-2rem)] sm:min-h-[860px] md:min-h-0 bg-background rounded-[2.25rem] md:rounded-3xl sm:border-[10px] md:border-2 border-navy-deep shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-navy text-white px-6 pt-10 pb-12 relative">
          <div className="flex items-center gap-3">
            <div className="bg-white rounded-lg p-1.5">
              <img src={logoUrl} alt="CUT" className="h-8 w-auto" />
            </div>
            <div>
              <div className="font-display text-2xl tracking-wide leading-none">CUT ATHLETIQ</div>
              <div className="text-[11px] text-white/60">Sign in to your locker</div>
            </div>
          </div>
        </div>

        <div className="px-6 -mt-6 flex-1 overflow-y-auto pb-8 space-y-3">
          {/* Social */}
          <div className="bg-card rounded-2xl shadow-lg p-4 border space-y-2">
            <button
              type="button"
              onClick={() => oauth("google")}
              disabled={!!oauthBusy}
              className="w-full bg-white text-navy-deep border-2 border-border font-bold uppercase tracking-wider rounded-full py-2.5 text-xs hover:border-navy transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {oauthBusy === "google" ? <Loader2 className="h-4 w-4 animate-spin" /> : <GoogleGlyph />}
              Continue with Google
            </button>
            <button
              type="button"
              onClick={() => oauth("apple")}
              disabled={!!oauthBusy}
              className="w-full bg-black text-white font-bold uppercase tracking-wider rounded-full py-2.5 text-xs hover:bg-navy-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {oauthBusy === "apple" ? <Loader2 className="h-4 w-4 animate-spin" /> : <AppleGlyph />}
              Continue with Apple
            </button>
          </div>

          <div className="flex items-center gap-2">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="bg-card rounded-2xl shadow-lg p-5 border space-y-3">
            <div className="flex rounded-full bg-secondary p-1 text-[11px] font-bold uppercase tracking-wider">
              <button
                type="button"
                onClick={() => setMode("email")}
                className={`flex-1 rounded-full py-1.5 flex items-center justify-center gap-1 transition-colors ${mode === "email" ? "bg-navy text-white" : "text-muted-foreground"}`}
              >
                <Mail className="h-3 w-3" /> Email
              </button>
              <button
                type="button"
                onClick={() => setMode("phone")}
                className={`flex-1 rounded-full py-1.5 flex items-center justify-center gap-1 transition-colors ${mode === "phone" ? "bg-navy text-white" : "text-muted-foreground"}`}
              >
                <Phone className="h-3 w-3" /> Phone
              </button>
            </div>

            {mode === "email" ? (
              <form onSubmit={submit} className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Email
                  </label>
                  <Input
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@cut.ac.za"
                    className="mt-1"
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Password
                  </label>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mt-1"
                    required
                    minLength={8}
                  />
                </div>
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-navy text-primary-foreground font-bold uppercase tracking-wider rounded-full py-3 hover:bg-navy-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Sign in
                </button>
                <div className="text-center text-[11px] text-muted-foreground">
                  <button
                    type="button"
                    onClick={() => setShowReset((v) => !v)}
                    className="hover:text-foreground underline"
                  >
                    Forgot password?
                  </button>
                  <span className="mx-2">·</span>
                  <Link to="/signup" className="hover:text-foreground underline font-bold">
                    Create account
                  </Link>
                </div>
                {showReset && (
                  <div className="rounded-lg border bg-secondary/40 p-3 mt-2 space-y-2">
                    <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Reset password
                    </div>
                    <Input
                      type="email"
                      placeholder="email on account"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={sendReset}
                      className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-2 text-xs hover:scale-[1.01] transition-transform"
                    >
                      Send reset link
                    </button>
                    {import.meta.env.DEV && <DevMockResetBlock email={resetEmail} />}
                  </div>
                )}
              </form>
            ) : (
              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Mobile number
                  </label>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+27 82 123 4567"
                    className="mt-1"
                    disabled={otpSent}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Use international format starting with +.
                  </p>
                </div>
                {otpSent && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      6-digit code
                    </label>
                    <Input
                      inputMode="numeric"
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                      className="mt-1 tracking-[0.5em] text-center font-bold"
                    />
                  </div>
                )}
                <button
                  type="button"
                  onClick={otpSent ? verifyOtp : sendOtp}
                  disabled={submitting}
                  className="w-full bg-navy text-primary-foreground font-bold uppercase tracking-wider rounded-full py-3 hover:bg-navy-deep transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {otpSent ? "Verify & sign in" : "Send code"}
                </button>
                {otpSent && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpSent(false);
                      setOtp("");
                    }}
                    className="w-full text-[11px] underline text-muted-foreground"
                  >
                    Use a different number
                  </button>
                )}
                <p className="text-[10px] text-muted-foreground text-center">
                  SMS may be unavailable until an SMS provider is configured.
                </p>
              </div>
            )}
          </div>

          <p className="text-center text-[10px] text-muted-foreground">
            Phase 1 Test Build — Authorised Users Only ·{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy
            </Link>
          </p>
        </div>

        <TestModeStamp />
      </div>
    </div>
  );
}

function DevMockResetBlock({ email }: { email: string }) {
  const [busy, setBusy] = React.useState(false);
  const [link, setLink] = React.useState<string | null>(null);

  const run = async () => {
    if (!email.trim()) {
      toast.error("Enter the email above first");
      return;
    }
    setBusy(true);
    setLink(null);
    try {
      const res = await devMockResetPassword({
        data: {
          email: email.trim(),
          redirectTo: `${window.location.origin}/reset-password`,
        },
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      setLink(res.action_link);
      toast.success("Mock recovery link generated (no email sent).");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-md border border-dashed border-gold/60 bg-gold/5 p-2.5 space-y-2">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-gold">
        <FlaskConical className="h-3 w-3" /> Dev only · mock reset (no email)
      </div>
      <button
        type="button"
        onClick={run}
        disabled={busy}
        className="w-full bg-navy text-white font-bold uppercase tracking-wider rounded-full py-1.5 text-[11px] disabled:opacity-60 flex items-center justify-center gap-1.5"
      >
        {busy && <Loader2 className="h-3 w-3 animate-spin" />}
        Generate mock recovery link
      </button>
      {link && (
        <div className="space-y-1.5">
          <div className="text-[10px] break-all font-mono bg-card border rounded p-2 max-h-24 overflow-auto">
            {link}
          </div>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => {
                void navigator.clipboard.writeText(link);
                toast.success("Copied");
              }}
              className="inline-flex items-center gap-1 rounded-full bg-card border px-2.5 py-1 text-[10px] font-bold"
            >
              <Copy className="h-2.5 w-2.5" /> Copy
            </button>
            <a
              href={link}
              className="inline-flex items-center gap-1 rounded-full bg-gold text-navy-deep px-2.5 py-1 text-[10px] font-bold"
            >
              Open →
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.56c2.08-1.92 3.28-4.74 3.28-8.09Z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.56-2.76c-.99.66-2.25 1.05-3.72 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23Z" />
      <path fill="#FBBC05" d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.06H2.18A11 11 0 0 0 1 12c0 1.78.43 3.46 1.18 4.94l3.66-2.84Z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.07.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38Z" />
    </svg>
  );
}

function AppleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
      <path d="M16.37 12.62c.02-2.36 1.93-3.49 2.02-3.55-1.1-1.6-2.81-1.83-3.42-1.85-1.46-.15-2.84.85-3.58.85-.74 0-1.88-.83-3.09-.81-1.59.02-3.06.92-3.88 2.34-1.65 2.86-.42 7.09 1.19 9.42.79 1.14 1.72 2.42 2.93 2.37 1.18-.05 1.62-.76 3.05-.76s1.83.76 3.07.74c1.27-.02 2.07-1.16 2.84-2.31.9-1.32 1.27-2.6 1.29-2.67-.03-.01-2.47-.95-2.42-3.77ZM14.13 5.45c.65-.79 1.09-1.89.97-2.99-.94.04-2.08.63-2.75 1.42-.6.7-1.13 1.83-.99 2.91 1.05.08 2.12-.53 2.77-1.34Z"/>
    </svg>
  );
}
