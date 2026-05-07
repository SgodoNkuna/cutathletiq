import * as React from "react";
import { createFileRoute, Link, useNavigate, useSearch } from "@tanstack/react-router";
import { z } from "zod";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, ArrowLeft, CheckCircle2, FileText, Plus } from "lucide-react";
import { Input } from "@/components/ui/input";

const search = z.object({ athleteId: z.string().uuid().optional() });

export const Route = createFileRoute("/physio/case")({
  validateSearch: (s) => search.parse(s),
  head: () => ({
    meta: [
      { title: "Case notes — CUT Athletiq" },
      { name: "description", content: "Daily case notes and return-to-play status." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PhysioCasePage,
});

type Athlete = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  sport: string | null;
};

type Note = {
  id: string;
  case_date: string;
  note: string;
  created_at: string;
};

type Injury = {
  id: string;
  body_region: string;
  injury_type: string;
  rtp_status: "unavailable" | "modified" | "cleared";
  expected_rtp_date: string | null;
  actual_rtp_date: string | null;
  rtp_notes: string | null;
  date_of_injury: string;
};

function PhysioCasePage() {
  const { athleteId } = useSearch({ from: "/physio/case" });
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [selectedId, setSelectedId] = React.useState<string | null>(athleteId ?? null);
  const [notes, setNotes] = React.useState<Note[]>([]);
  const [injuries, setInjuries] = React.useState<Injury[]>([]);
  const [newNote, setNewNote] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  // RTP form state (per latest open injury)
  const [rtpDate, setRtpDate] = React.useState<string>("");
  const [rtpNotes, setRtpNotes] = React.useState<string>("");

  React.useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, first_name, last_name, sport, role")
        .eq("role", "athlete")
        .order("first_name");
      setAthletes(((data ?? []) as Athlete[]).filter((a) => !!a.id));
    })();
  }, []);

  const loadAthleteData = React.useCallback(async (id: string) => {
    const [n, i] = await Promise.all([
      supabase
        .from("physio_case_notes")
        .select("id, case_date, note, created_at")
        .eq("athlete_id", id)
        .order("case_date", { ascending: false })
        .limit(20),
      supabase
        .from("injury_records")
        .select("id, body_region, injury_type, rtp_status, expected_rtp_date, actual_rtp_date, rtp_notes, date_of_injury")
        .eq("athlete_id", id)
        .order("updated_at", { ascending: false }),
    ]);
    setNotes((n.data ?? []) as Note[]);
    setInjuries((i.data ?? []) as Injury[]);
  }, []);

  React.useEffect(() => {
    if (!selectedId) return;
    void loadAthleteData(selectedId);
  }, [selectedId, loadAthleteData]);

  const addNote = async () => {
    if (!profile || !selectedId) return;
    const text = newNote.trim();
    if (!text) {
      toast.error("Note can't be empty");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("physio_case_notes").insert({
      athlete_id: selectedId,
      physio_id: profile.id,
      note: text,
    });
    setBusy(false);
    if (error) {
      toast.error("Could not save note");
      return;
    }
    setNewNote("");
    toast.success("Note saved");
    void loadAthleteData(selectedId);
  };

  const markRTP = async (injuryId: string) => {
    if (!profile) return;
    if (!rtpDate) {
      toast.error("Pick a return-to-play date");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("injury_records")
      .update({
        rtp_status: "cleared",
        actual_rtp_date: rtpDate,
        rtp_notes: rtpNotes.trim() || null,
      })
      .eq("id", injuryId);
    setBusy(false);
    if (error) {
      toast.error("Could not mark RTP");
      return;
    }
    toast.success("Athlete marked Return to Play");
    setRtpDate("");
    setRtpNotes("");
    if (selectedId) void loadAthleteData(selectedId);
  };

  const selectedAthlete = athletes.find((a) => a.id === selectedId);
  const openInjuries = injuries.filter((i) => !i.actual_rtp_date);

  return (
    <MobileFrame title="Case notes & RTP">
      <div className="px-5 space-y-3">
        <button
          onClick={() => navigate({ to: "/physio" })}
          className="text-[11px] text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
        >
          <ArrowLeft className="h-3 w-3" /> Back to inbox
        </button>

        <div>
          <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Athlete
          </label>
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(e.target.value || null)}
            className="w-full h-10 rounded-md border bg-card px-3 text-sm mt-1"
          >
            <option value="">Pick an athlete…</option>
            {athletes.map((a) => (
              <option key={a.id} value={a.id}>
                {[a.first_name, a.last_name].filter(Boolean).join(" ") || "Athlete"}
                {a.sport ? ` · ${a.sport}` : ""}
              </option>
            ))}
          </select>
        </div>

        {selectedAthlete && (
          <>
            <SectionHeader title="Open injuries" />
            {openInjuries.length === 0 ? (
              <div className="bg-card border rounded-xl p-4 text-sm text-muted-foreground">
                No open injuries.{" "}
                <Link to="/physio/log" className="underline font-bold text-navy">
                  Log a case
                </Link>
                .
              </div>
            ) : (
              openInjuries.map((inj) => (
                <div key={inj.id} className="bg-card border rounded-2xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-sm font-bold">
                        {inj.body_region} · {inj.injury_type}
                      </div>
                      <div className="text-[10px] text-muted-foreground uppercase tracking-wider">
                        Status: {inj.rtp_status}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        RTP date
                      </label>
                      <Input
                        type="date"
                        value={rtpDate}
                        onChange={(e) => setRtpDate(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        RTP notes
                      </label>
                      <Input
                        value={rtpNotes}
                        onChange={(e) => setRtpNotes(e.target.value)}
                        placeholder="Cleared for full training"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => markRTP(inj.id)}
                    disabled={busy}
                    className="w-full bg-success text-white font-bold uppercase tracking-wider rounded-full py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-60"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark Return to Play
                  </button>
                </div>
              ))
            )}

            <SectionHeader title="Add case note" />
            <div className="bg-card border rounded-2xl p-3 space-y-2">
              <textarea
                value={newNote}
                onChange={(e) => setNewNote(e.target.value)}
                rows={3}
                maxLength={1000}
                placeholder="Today's session: ROM improving, no swelling, started progressive loading."
                className="w-full rounded-xl border bg-background p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                onClick={addNote}
                disabled={busy}
                className="w-full bg-navy text-white font-bold uppercase tracking-wider rounded-full py-2 text-xs flex items-center justify-center gap-1 disabled:opacity-60"
              >
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                Save note
              </button>
            </div>

            <SectionHeader title="Case history" />
            {notes.length === 0 ? (
              <div className="bg-card border rounded-xl p-4 text-sm text-muted-foreground">
                No notes yet.
              </div>
            ) : (
              <div className="bg-card border rounded-xl divide-y">
                {notes.map((n) => (
                  <div key={n.id} className="p-3 flex gap-3">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground w-12 shrink-0">
                      {new Date(n.case_date + "T00:00:00").toLocaleDateString(undefined, {
                        day: "numeric",
                        month: "short",
                      })}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-foreground/90 whitespace-pre-wrap">{n.note}</div>
                    </div>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </MobileFrame>
  );
}
