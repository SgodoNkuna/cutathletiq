import * as React from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import logoUrl from "@/assets/cut-logo.png";
import { TestModeStamp } from "@/components/TestModeStamp";
import { useAuth, ROLE_HOME } from "@/lib/auth-context";

const HOME_TITLE = "CUT Athletiq — sport-performance for CUT athletes, coaches & physios";
const HOME_DESC = "One app for the Central University of Technology sports community: log wellness, follow training programmes, track injuries and prep for game day.";
const HOME_URL = "https://cutathletiq.lovable.app/";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: HOME_TITLE },
      { name: "description", content: HOME_DESC },
      { property: "og:title", content: HOME_TITLE },
      { property: "og:description", content: HOME_DESC },
      { property: "og:url", content: HOME_URL },
      { name: "twitter:title", content: HOME_TITLE },
      { name: "twitter:description", content: HOME_DESC },
    ],
    links: [{ rel: "canonical", href: HOME_URL }],
  }),
  component: SplashPage,
});

function SplashPage() {
  const { profile, loading } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (loading) return;
    if (profile) {
      if (!profile.onboarding_complete) {
        navigate({ to: "/onboarding" });
      } else {
        navigate({ to: ROLE_HOME[profile.role] });
      }
    }
  }, [profile, loading, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 flex items-center justify-center py-4 px-2">
      <div className="relative w-full max-w-[430px] min-h-[calc(100vh-2rem)] sm:min-h-[860px] bg-gradient-to-b from-navy via-navy to-navy-deep rounded-[2.25rem] sm:border-[10px] border-navy-deep shadow-2xl overflow-hidden flex flex-col">
        {/* Decorative gold rings */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full border-2 border-gold/20" />
          <div className="absolute -bottom-32 -left-24 h-96 w-96 rounded-full border-2 border-gold/10" />
          <div className="absolute top-1/3 -right-8 h-40 w-40 rounded-full bg-gold/10 blur-3xl" />
        </div>

        <div className="flex-1 flex flex-col items-center justify-center px-8 text-center relative z-10">
          <div className="rounded-full bg-white p-6 mb-6 animate-pulse-gold">
            <img src={logoUrl} alt="Central University of Technology" className="h-20 w-auto" />
          </div>
          <h1 className="font-display text-6xl text-white tracking-wider leading-none">
            CUT <span className="text-gold">ATHLETIQ</span>
          </h1>
          <p className="mt-4 text-white/80 text-sm max-w-xs text-balance">
            One platform for athletes, coaches and physios. Train smarter. Recover faster. Win more.
          </p>

          <div className="mt-10 flex flex-col gap-3 w-full max-w-xs">
            <Link
              to="/login"
              className="bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-3.5 text-center hover:scale-[1.02] transition-transform shadow-xl"
            >
              Get Started
            </Link>
            <Link
              to="/login"
              className="text-white/70 text-xs uppercase tracking-wider py-2 hover:text-white"
            >
              I already have an account →
            </Link>
          </div>
        </div>

        <div className="text-center text-[10px] text-white/40 py-4 relative z-10">
          Phase 1 Test Build — Authorised Users Only
        </div>

        <TestModeStamp />
      </div>
    </div>
  );
}
