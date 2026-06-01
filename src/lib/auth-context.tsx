import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import type { Session, User } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = Database["public"]["Enums"]["app_role"];

const APP_ROLES: Role[] = ["athlete", "coach", "physio", "admin"];

function stringMeta(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function profileSeedFromUser(user: User) {
  const meta = user.user_metadata ?? {};
  const fullName = stringMeta(meta.full_name) || stringMeta(meta.name);
  const [fallbackFirst = "", ...fallbackLast] = fullName.split(/\s+/).filter(Boolean);
  const roleMeta = stringMeta(meta.role) as Role;
  return {
    id: user.id,
    email: user.email ?? `${user.id}@missing-email.local`,
    first_name: stringMeta(meta.first_name) || fallbackFirst,
    last_name: stringMeta(meta.last_name) || fallbackLast.join(" "),
    role: APP_ROLES.includes(roleMeta) ? roleMeta : "athlete",
    sport: stringMeta(meta.sport) || null,
    position: stringMeta(meta.position) || null,
    consent_coach_training: meta.consent_coach_training === true,
    consent_physio_health: meta.consent_physio_health === true,
    consent_at:
      meta.consent_coach_training === true || meta.consent_physio_health === true
        ? new Date().toISOString()
        : null,
  };
}

export async function ensureUserProfile(user: User): Promise<Profile | null> {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();
  if (existing) return existing;
  if (readError) console.warn("Could not read profile; attempting repair", readError);

  const { data: inserted, error: insertError } = await supabase
    .from("profiles")
    .insert(profileSeedFromUser(user))
    .select("*")
    .maybeSingle();
  if (insertError) {
    console.error("Could not repair missing profile", insertError);
    return null;
  }
  return inserted ?? null;
}

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = React.useState<Session | null>(null);
  const [profile, setProfile] = React.useState<Profile | null>(null);
  const [loading, setLoading] = React.useState(true);

  const loadProfile = React.useCallback(async (user: User) => {
    const data = await ensureUserProfile(user);
    setProfile(data ?? null);
  }, []);

  React.useEffect(() => {
    // Set up listener FIRST, then check existing session.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setLoading(true);
      setSession(newSession);
      if (newSession?.user) {
        setProfile(null);
        // Defer to avoid deadlock with Supabase auth callback
        setTimeout(() => {
          void loadProfile(newSession.user).finally(() => setLoading(false));
        }, 0);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    void supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) {
        void loadProfile(data.session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    return () => sub.subscription.unsubscribe();
  }, [loadProfile]);

  const signOut = React.useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } finally {
      setSession(null);
      setProfile(null);
    }
  }, []);

  const refreshProfile = React.useCallback(async () => {
    if (session?.user) await loadProfile(session.user);
  }, [session, loadProfile]);

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

export function useRequireProfile() {
  const { profile, loading } = useAuth();
  return { profile, loading };
}

export const ROLE_HOME: Record<Role, string> = {
  athlete: "/athlete",
  coach: "/coach",
  physio: "/physio",
  admin: "/admin",
};

export const ROLE_LABEL: Record<Role, string> = {
  athlete: "Athlete",
  coach: "Coach",
  physio: "Physio",
  admin: "Admin",
};
