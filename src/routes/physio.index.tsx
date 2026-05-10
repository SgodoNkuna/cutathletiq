import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { InviteLinkCard } from "@/components/InviteLinkCard";
import { SectionHeader, SportTag, StatusPill } from "@/components/primitives";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Calendar, HeartPulse, Users } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Injury = Database["public"]["Tables"]["injury_records"]["Row"];
type Checkin = Database["public"]["Tables"]["injury_checkins"]["Row"] & {
  athlete_name: string;
  sport: string | null;
};
type Athlete = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  sport: string | null;
  position: string | null;
};

export const Route = createFileRoute("/physio/")({
  head: () => ({
    meta: [
      { title: "Physio Cases — CUT Athletiq" },
      {
        name: "description",
        content: "Track injury check-ins, rehab and return-to-play timelines.",
      },
    ],
  }),
  component: PhysioHome,
});

function statusFromRtp(s: Injury["rtp_status"]): string {
  if (s === "cleared") return "cleared-soon";
  if (s === "modified") return "monitor";
  return "rehab";
}

function PhysioHome() {
  const { profile } = useAuth();
  const [injuries, setInjuries] = React.useState<
    Array<Injury & { athlete_name: string; sport: string | null }>
  >([]);
  const [checkins, setCheckins] = React.useState<Checkin[]>([]);
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    if (!profile) return;
    const [injRes, checkRes, athleteRes] = await Promise.all([
      supabase
        .from("injury_records")
        .select("*, profiles!injury_records_athlete_id_fkey(first_name, last_name, sport)")
        .order("updated_at", { ascending: false }),
      supabase
        .from("injury_checkins")
        .select("*, profiles!injury_checkins_athlete_id_fkey(first_name, last_name, sport)")
        .order("submitted_at", { ascending: false })
        .limit(30),
      supabase
        .from("profiles")
        .select("id, first_name, last_name, sport, position, role")
        .eq("role", "athlete")
        .order("first_name", { ascending: true }),
    ]);

    const injuryRows = (injRes.data ?? []).map((r) => {
      const p = r.profiles as {
        first_name?: string;
        last_name?: string;
        sport?: string | null;
      } | null;
      const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "Athlete";
      return { ...r, athlete_name: name, sport: p?.sport ?? null } as Injury & {
        athlete_name: string;
        sport: string | null;
      };
    });
    const checkinRows = (checkRes.data ?? []).map((r) => {
      const p = r.profiles as {
        first_name?: string;
        last_name?: string;
        sport?: string | null;
      } | null;
      const name = `${p?.first_name ?? ""} ${p?.last_name ?? ""}`.trim() || "Athlete";
      return { ...r, athlete_name: name, sport: p?.sport ?? null } as Checkin;
    });
    setInjuries(injuryRows);
    setCheckins(checkinRows);
    setAthletes((athleteRes.data ?? []).filter((r) => !!r.id) as Athlete[]);
    setLoading(false);
  }, [profile]);

  React.useEffect(() => {
    if (!profile) return;
    void load();
    const ch = supabase
      .channel(`physio:${profile.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "injury_records" },
        () => void load(),
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "injury_checkins" },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [profile, load]);

  if (!profile) return null;

  const greetingName = profile.first_name?.trim() ? `Physio ${profile.first_name}` : "Physio";
  const active = injuries.filter((i) => i.actual_rtp_date == null).length;
  const high = checkins.filter((i) => i.pain_level >= 7).length;

  return (
    <MobileFrame title={greetingName}>
      <div className="px-5">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Active" value={active} />
          <Stat label="High pain" value={high} />
          <Stat label="Players" value={athletes.length} />
        </div>

        <div className="mt-3 rounded-xl border bg-success/10 border-success/30 p-3 text-[11px] text-foreground/80">
          Cross-team inbox: as a physio you can see and log injuries for every athlete in the
          system, and schedule rehab or meetings on the calendar.
        </div>

        {profile.team_id && (
          <InviteLinkCard teamId={profile.team_id} createdBy={profile.id} />
        )}

        <SectionHeader
          title="Injury inbox"
          action={
            <div className="flex items-center gap-3">
              <Link
                to="/physio/case"
                className="text-[11px] font-bold text-navy uppercase tracking-wider"
              >
                Notes & RTP →
              </Link>
              <Link
                to="/physio/log"
                className="text-[11px] font-bold text-navy uppercase tracking-wider"
              >
                Log case →
              </Link>
            </div>
          }
        />

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : checkins.length === 0 ? (
          <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
            No athlete check-ins visible for your team yet.
          </div>
        ) : (
          <div className="space-y-2">
            {checkins.map((check) => (
              <div key={check.id} className="bg-card rounded-2xl border p-3">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
                    <HeartPulse className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="text-sm font-bold truncate">{check.athlete_name}</div>
                      {check.sport && <SportTag sport={check.sport} />}
                    </div>
                    <div className="text-[11px] text-muted-foreground mt-0.5">
                      Pain {check.pain_level}/10
                      {typeof check.function_score === "number"
                        ? ` · Function ${check.function_score}/10`
                        : ""}{" "}
                      · {check.body_regions.join(", ") || "Body check"}
                    </div>
                    {check.notes && (
                      <p className="text-xs text-foreground/80 mt-2">{check.notes}</p>
                    )}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {new Date(check.submitted_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        <SectionHeader title="Players" />
        {athletes.length === 0 ? (
          <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
            No players are visible. Join the same team as athletes to manage cases.
          </div>
        ) : (
          <div className="bg-card rounded-xl border divide-y">
            {athletes.map((a) => {
              const name = `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Athlete";
              return (
                <div key={a.id} className="p-3 flex items-center gap-3">
                  <Users className="h-4 w-4 text-navy" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold truncate">{name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {a.sport ?? "—"}
                      {a.position ? ` · ${a.position}` : ""}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <SectionHeader title="Open cases" />
        {injuries.length === 0 ? (
          <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
            No injury records yet. Use <span className="font-bold">Log</span> to open a new case.
          </div>
        ) : (
          <div className="space-y-3">
            {injuries.map((inj) => (
              <div key={inj.id} className="bg-card rounded-2xl border shadow-sm overflow-hidden">
                <div className="p-3 flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold">{inj.athlete_name}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {inj.sport && <SportTag sport={inj.sport} />}
                      <span className="text-[11px] text-muted-foreground">{inj.body_region}</span>
                    </div>
                  </div>
                  <StatusPill status={statusFromRtp(inj.rtp_status)} />
                </div>
                <div className="px-3 pb-3 grid grid-cols-3 gap-2 text-center">
                  <Cell label="Severity" value={`${inj.severity}/10`} />
                  <Cell label="Type" value={inj.injury_type} />
                  <Cell
                    label="Logged"
                    value={new Date(inj.created_at).toLocaleDateString(undefined, {
                      day: "numeric",
                      month: "short",
                    })}
                  />
                </div>
                {inj.expected_rtp_date && (
                  <div className="px-3 pb-3 flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Calendar className="h-3 w-3" /> Expected RTP:{" "}
                    {new Date(inj.expected_rtp_date).toLocaleDateString()}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </MobileFrame>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-card rounded-2xl border p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
        {label}
      </div>
      <div className="font-display text-2xl mt-0.5">{value}</div>
    </div>
  );
}

function Cell({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-secondary/60 rounded-lg py-1.5">
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="font-display text-sm leading-none mt-0.5 truncate px-1">{value}</div>
    </div>
  );
}
