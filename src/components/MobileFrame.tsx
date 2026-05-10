import * as React from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { ROLE_LABEL, useAuth, type Role } from "@/lib/auth-context";
import {
  Home,
  Dumbbell,
  LineChart,
  HeartPulse,
  Users,
  Trophy,
  Newspaper,
  ClipboardList,
  ShieldCheck,
  Calendar,
  LogOut,
  User as UserIcon,
} from "lucide-react";
import { NotificationBell } from "./NotificationBell";
import { TestModeStamp } from "./TestModeStamp";
import { WellnessGate } from "./WellnessGate";
import { HelpDrawer } from "./HelpDrawer";
import { PullToRefresh } from "./PullToRefresh";
import { useRouter } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: React.ComponentType<{ className?: string }> };

const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  athlete: [
    { to: "/athlete", label: "Home", icon: Home },
    { to: "/athlete/workout", label: "Workout", icon: Dumbbell },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/feed", label: "Feed", icon: Newspaper },
    { to: "/athlete/injury", label: "Body", icon: HeartPulse },
  ],
  coach: [
    { to: "/coach", label: "Squad", icon: Users },
    { to: "/coach/program", label: "Program", icon: ClipboardList },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/leaderboard", label: "Ranks", icon: Trophy },
    { to: "/feed", label: "Feed", icon: Newspaper },
  ],
  physio: [
    { to: "/physio", label: "Cases", icon: HeartPulse },
    { to: "/physio/log", label: "Log", icon: ClipboardList },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/feed", label: "Feed", icon: Newspaper },
  ],
  admin: [
    { to: "/admin", label: "Dept", icon: ShieldCheck },
    { to: "/calendar", label: "Calendar", icon: Calendar },
    { to: "/leaderboard", label: "Ranks", icon: Trophy },
    { to: "/coach", label: "Squad", icon: Users },
    { to: "/feed", label: "Feed", icon: Newspaper },
  ],
};

/**
 * Detect a desktop viewport. md breakpoint = 768px (matches Tailwind's md:).
 * SSR-safe: starts as false, then upgrades after mount.
 */
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = React.useState(false);
  React.useEffect(() => {
    const mql = window.matchMedia("(min-width: 768px)");
    const update = () => setIsDesktop(mql.matches);
    update();
    mql.addEventListener("change", update);
    return () => mql.removeEventListener("change", update);
  }, []);
  return isDesktop;
}

export function MobileFrame({
  children,
  hideNav = false,
  title,
}: {
  children: React.ReactNode;
  hideNav?: boolean;
  title?: string;
}) {
  const { profile, loading, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const router = useRouter();
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isDesktop = useIsDesktop();
  const handleRefresh = React.useCallback(async () => {
    await router.invalidate();
  }, [router]);

  // Auth gate — bounce to /login if no profile
  React.useEffect(() => {
    if (loading) return;
    if (!profile) {
      navigate({ to: "/login" });
    } else if (!profile.onboarding_complete && location.pathname !== "/onboarding") {
      navigate({ to: "/onboarding" });
    }
  }, [profile, loading, navigate, location.pathname]);

  // Scroll to top on route change so the user always lands at the top of the new view.
  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 rounded-full border-2 border-gold border-t-transparent animate-spin" />
      </div>
    );
  }

  const role = profile.role;
  const items = NAV_BY_ROLE[role];
  const roleLabel = ROLE_LABEL[role];

  const handleSignOut = async () => {
    await signOut();
    navigate({ to: "/login" });
  };

  // ============================================================
  // DESKTOP LAYOUT — true full-width app shell with sidebar nav
  // ============================================================
  if (isDesktop) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 flex">
        {/* Sidebar */}
        {!hideNav && (
          <aside className="w-64 shrink-0 bg-navy text-white flex flex-col">
            <div className="px-5 py-5 border-b border-white/10">
              <div className="text-[11px] uppercase tracking-[0.2em] text-gold font-bold">
                CUT Athletiq
              </div>
              <div className="mt-1 text-sm font-medium truncate">
                {profile.first_name || profile.email.split("@")[0]}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-white/60 mt-0.5">
                {roleLabel}
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1">
              {items.map((item) => {
                const active = location.pathname === item.to;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors",
                      active
                        ? "bg-gold text-navy-deep"
                        : "text-white/80 hover:bg-white/10 hover:text-white",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="px-3 py-3 border-t border-white/10 space-y-1">
              <Link
                to="/profile"
                className="flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                <UserIcon className="h-4 w-4" /> Profile
              </Link>
              <button
                onClick={handleSignOut}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-white/80 hover:bg-white/10 hover:text-white"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </div>
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 border-b bg-card/95 backdrop-blur flex items-center justify-between px-6">
            <div className="flex items-center gap-3 min-w-0">
              {title && (
                <h1 className="font-display text-xl text-foreground truncate">{title}</h1>
              )}
            </div>
            <div className="flex items-center gap-2">
              <HelpDrawer role={role} />
              <NotificationBell />
            </div>
          </header>
          <main
            ref={scrollRef}
            className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth"
          >
            <div className="max-w-6xl mx-auto px-6 py-6 animate-fade-up">{children}</div>
            <div className="text-center text-[11px] text-muted-foreground py-4">
              Phase 1 Test Build ·{" "}
              <Link to="/privacy" className="underline hover:text-foreground">
                Privacy
              </Link>
            </div>
          </main>
        </div>

        <TestModeStamp />
        <WellnessGate />
      </div>
    );
  }

  // ============================================================
  // MOBILE LAYOUT — phone-shell card (unchanged)
  // ============================================================
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 flex items-center justify-center py-4 px-2">
      <div className="relative w-full max-w-[430px] min-h-[calc(100vh-2rem)] sm:min-h-[860px] bg-background rounded-[2.25rem] border-[10px] border-navy-deep shadow-2xl overflow-hidden flex flex-col">
        {/* Status bar / role tag */}
        <div className="flex items-center justify-between px-4 py-2 bg-navy/95 backdrop-blur text-primary-foreground text-[11px] font-medium tracking-wide">
          <span className="opacity-80">CUT ATHLETIQ</span>
          <div className="flex items-center gap-2">
            <span className="font-bold truncate max-w-[100px]">
              {profile.first_name || profile.email.split("@")[0]}
            </span>
            <span className="opacity-50">·</span>
            <span className="font-bold uppercase opacity-80">{roleLabel}</span>
            <NotificationBell />
            <HelpDrawer role={role} />
            <Link
              to="/profile"
              aria-label="Profile"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <UserIcon className="h-4 w-4 text-white" />
            </Link>
            <button
              onClick={handleSignOut}
              aria-label="Sign out"
              className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"
            >
              <LogOut className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>

        {title && (
          <div className="px-5 pt-4 pb-2 flex items-center justify-between gap-2">
            <h1 className="text-2xl text-foreground">{title}</h1>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden scroll-smooth overscroll-contain">
          <PullToRefresh scrollRef={scrollRef} onRefresh={handleRefresh} />
          <div className="animate-fade-up">{children}</div>
          <div className="text-center text-[10px] text-muted-foreground py-3">
            Phase 1 Test Build ·{" "}
            <Link to="/privacy" className="underline hover:text-foreground">
              Privacy
            </Link>
          </div>
        </div>

        {!hideNav && (
          <nav className="border-t bg-card/95 backdrop-blur-md px-1 py-1.5 flex items-center justify-around">
            {items.map((item) => {
              const active = location.pathname === item.to;
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex flex-col items-center gap-0.5 px-2.5 py-1.5 rounded-2xl transition-all min-w-[52px]",
                    active
                      ? "text-navy bg-gold/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                  )}
                >
                  <Icon
                    className={cn("h-5 w-5 transition-transform", active && "text-navy scale-110")}
                  />
                  <span className={cn("text-[10px] font-medium", active && "font-bold")}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
          </nav>
        )}

        <TestModeStamp />
      </div>
      <WellnessGate />
    </div>
  );
}
