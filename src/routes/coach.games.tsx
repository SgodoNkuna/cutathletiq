import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Plus, Calendar as CalendarIcon, Check, AlertCircle } from "lucide-react";

export const Route = createFileRoute("/coach/games")({
  head: () => ({
    meta: [
      { title: "Game Minutes — CUT Athletiq" },
      { name: "description", content: "Record minutes played per athlete for each game." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CoachGamesPage,
});

type Game = {
  id: string;
  opponent: string;
  game_date: string;
  game_time: string | null;
  location: string | null;
  team_id: string;
  coach_id: string;
};

type Athlete = {
  id: string;
  first_name: string | null;
  last_name: string | null;
};

type MinutesRow = {
  athlete_id: string;
  minutes_played: number;
  notes: string;
};

function CoachGamesPage() {
  const { profile } = useAuth();
  const [games, setGames] = React.useState<Game[]>([]);
  const [athletes, setAthletes] = React.useState<Athlete[]>([]);
  const [selectedGameId, setSelectedGameId] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<Record<string, MinutesRow>>({});
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const [showCreate, setShowCreate] = React.useState(false);
  const [newGame, setNewGame] = React.useState({
    opponent: "",
    game_date: new Date().toISOString().slice(0, 10),
    location: "",
  });

  const teamId = profile?.team_id ?? null;

  const load = React.useCallback(async () => {
    if (!profile || !teamId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const [gRes, aRes] = await Promise.all([
      supabase
        .from("games")
        .select("*")
        .eq("team_id", teamId)
        .order("game_date", { ascending: false })
        .limit(50),
      supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .eq("team_id", teamId)
        .eq("role", "athlete")
        .order("first_name"),
    ]);
    setGames((gRes.data as Game[]) ?? []);
    setAthletes((aRes.data as Athlete[]) ?? []);
    if ((gRes.data?.length ?? 0) > 0 && !selectedGameId) {
      setSelectedGameId(gRes.data![0].id);
    }
    setLoading(false);
  }, [profile, teamId, selectedGameId]);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Hydrate minutes form when game selection or athletes change
  React.useEffect(() => {
    if (!selectedGameId) {
      setRows({});
      return;
    }
    void (async () => {
      const { data } = await supabase
        .from("game_minutes")
        .select("athlete_id, minutes_played, notes")
        .eq("game_id", selectedGameId);
      const map: Record<string, MinutesRow> = {};
      athletes.forEach((a) => {
        map[a.id] = { athlete_id: a.id, minutes_played: 0, notes: "" };
      });
      (data ?? []).forEach((r) => {
        map[r.athlete_id] = {
          athlete_id: r.athlete_id,
          minutes_played: r.minutes_played ?? 0,
          notes: r.notes ?? "",
        };
      });
      setRows(map);
    })();
  }, [selectedGameId, athletes]);

  const updateRow = (athleteId: string, patch: Partial<MinutesRow>) => {
    setRows((r) => ({
      ...r,
      [athleteId]: { ...r[athleteId], ...patch, athlete_id: athleteId },
    }));
  };

  const validRows = React.useMemo(
    () =>
      Object.values(rows).filter(
        (r) => Number.isFinite(r.minutes_played) && r.minutes_played >= 0,
      ),
    [rows],
  );

  const totalMinutes = validRows.reduce((acc, r) => acc + (r.minutes_played || 0), 0);
  const playedCount = validRows.filter((r) => r.minutes_played > 0).length;

  const handleCreateGame = async () => {
    if (!profile || !teamId) return;
    if (!newGame.opponent.trim()) {
      toast.error("Opponent is required");
      return;
    }
    const { data, error } = await supabase
      .from("games")
      .insert({
        opponent: newGame.opponent.trim(),
        game_date: newGame.game_date,
        location: newGame.location.trim() || null,
        team_id: teamId,
        coach_id: profile.id,
      })
      .select("*")
      .single();
    if (error || !data) {
      toast.error(error?.message ?? "Could not create game");
      return;
    }
    setGames((g) => [data as Game, ...g]);
    setSelectedGameId((data as Game).id);
    setShowCreate(false);
    setNewGame({
      opponent: "",
      game_date: new Date().toISOString().slice(0, 10),
      location: "",
    });
    toast.success("Game created");
  };

  const handleSave = async () => {
    if (!selectedGameId) return;
    // Client-side validation: 0..240
    const invalid = validRows.find((r) => r.minutes_played < 0 || r.minutes_played > 240);
    if (invalid) {
      toast.error("Minutes must be between 0 and 240");
      return;
    }
    setSaving(true);
    const payload = validRows.map((r) => ({
      athlete_id: r.athlete_id,
      minutes_played: Math.trunc(r.minutes_played),
      notes: r.notes || null,
    }));
    const { error } = await supabase.rpc("save_game_minutes_bulk", {
      _game_id: selectedGameId,
      _rows: payload,
    });
    setSaving(false);
    setConfirmOpen(false);
    if (error) {
      toast.error(error.message ?? "Save failed");
      return;
    }
    toast.success(`Saved minutes for ${payload.length} athlete${payload.length === 1 ? "" : "s"}`);
  };

  if (!profile) return null;

  if (profile.role !== "coach" && profile.role !== "admin") {
    return (
      <MobileFrame title="Game Minutes">
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Only coaches and admins can manage game minutes.
        </div>
      </MobileFrame>
    );
  }

  if (!teamId) {
    return (
      <MobileFrame title="Game Minutes">
        <div className="px-5 py-8 text-center text-sm text-muted-foreground">
          Create or join a team first.
        </div>
      </MobileFrame>
    );
  }

  const selectedGame = games.find((g) => g.id === selectedGameId) ?? null;

  return (
    <MobileFrame title="Game Minutes">
      <div className="px-5 pb-6">
        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-gold" />
          </div>
        ) : (
          <>
            <SectionHeader
              title="Games"
              action={
                <button
                  onClick={() => setShowCreate((s) => !s)}
                  className="text-[11px] font-bold text-navy uppercase tracking-wider inline-flex items-center gap-1"
                >
                  <Plus className="h-3 w-3" /> New
                </button>
              }
            />

            {showCreate && (
              <div className="bg-card rounded-2xl border p-3 mb-3 space-y-2">
                <input
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Opponent"
                  value={newGame.opponent}
                  onChange={(e) => setNewGame((g) => ({ ...g, opponent: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    value={newGame.game_date}
                    onChange={(e) => setNewGame((g) => ({ ...g, game_date: e.target.value }))}
                  />
                  <input
                    className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
                    placeholder="Location"
                    value={newGame.location}
                    onChange={(e) => setNewGame((g) => ({ ...g, location: e.target.value }))}
                  />
                </div>
                <button
                  onClick={handleCreateGame}
                  className="w-full rounded-full bg-navy text-white text-sm font-bold uppercase tracking-wider py-2"
                >
                  Create game
                </button>
              </div>
            )}

            {games.length === 0 ? (
              <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
                No games yet. Tap "New" to add one.
              </div>
            ) : (
              <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                {games.map((g) => {
                  const active = g.id === selectedGameId;
                  return (
                    <button
                      key={g.id}
                      onClick={() => setSelectedGameId(g.id)}
                      className={`shrink-0 rounded-2xl border px-3 py-2 text-left transition-colors ${
                        active
                          ? "bg-navy text-white border-navy"
                          : "bg-card border-border hover:bg-secondary/40"
                      }`}
                    >
                      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider opacity-80">
                        <CalendarIcon className="h-3 w-3" /> {g.game_date}
                      </div>
                      <div className="text-sm font-bold mt-0.5 max-w-[160px] truncate">
                        vs {g.opponent}
                      </div>
                      {g.location && (
                        <div className="text-[10px] opacity-70 truncate max-w-[160px]">
                          {g.location}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {selectedGame && (
              <>
                <SectionHeader
                  title={`Minutes vs ${selectedGame.opponent}`}
                  action={
                    <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {playedCount} played · {totalMinutes} min total
                    </span>
                  }
                />

                {athletes.length === 0 ? (
                  <div className="bg-card rounded-xl border p-5 text-center text-sm text-muted-foreground">
                    No athletes on the team yet.
                  </div>
                ) : (
                  <div className="bg-card rounded-2xl border divide-y">
                    {athletes.map((a) => {
                      const row = rows[a.id] ?? {
                        athlete_id: a.id,
                        minutes_played: 0,
                        notes: "",
                      };
                      const full =
                        `${a.first_name ?? ""} ${a.last_name ?? ""}`.trim() || "Athlete";
                      const invalid = row.minutes_played < 0 || row.minutes_played > 240;
                      return (
                        <div key={a.id} className="p-3 flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-navy to-navy-deep text-white font-bold flex items-center justify-center text-[10px] shrink-0">
                            {full
                              .split(" ")
                              .map((n) => n[0])
                              .join("")
                              .slice(0, 2)
                              .toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-bold truncate">{full}</div>
                            <input
                              className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1 text-[11px] text-muted-foreground focus:text-foreground"
                              placeholder="Notes (optional)"
                              value={row.notes}
                              onChange={(e) => updateRow(a.id, { notes: e.target.value })}
                            />
                          </div>
                          <div className="flex flex-col items-end">
                            <input
                              type="number"
                              min={0}
                              max={240}
                              inputMode="numeric"
                              className={`w-16 rounded-md border bg-background px-2 py-1 text-sm text-right font-bold ${
                                invalid ? "border-destructive text-destructive" : "border-border"
                              }`}
                              value={row.minutes_played}
                              onChange={(e) =>
                                updateRow(a.id, {
                                  minutes_played: Math.max(
                                    0,
                                    Math.min(240, Number(e.target.value) || 0),
                                  ),
                                })
                              }
                            />
                            <span className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                              minutes
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                <button
                  disabled={saving || athletes.length === 0}
                  onClick={() => setConfirmOpen(true)}
                  className="mt-4 w-full rounded-full bg-gold text-navy-deep font-bold uppercase tracking-wider py-3 text-sm disabled:opacity-50 inline-flex items-center justify-center gap-2"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save & notify physio
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Physio confirm modal */}
      {confirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => !saving && setConfirmOpen(false)}
        >
          <div
            className="bg-card rounded-2xl border shadow-xl max-w-sm w-full p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 text-navy">
              <AlertCircle className="h-5 w-5" />
              <h2 className="font-display text-xl">Confirm minutes</h2>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              You're about to save minutes for{" "}
              <span className="font-bold text-foreground">{playedCount}</span> athlete
              {playedCount === 1 ? "" : "s"} ({totalMinutes} total minutes). The team physio will
              be able to review load on these athletes.
            </p>
            <div className="mt-4 flex gap-2">
              <button
                disabled={saving}
                onClick={() => setConfirmOpen(false)}
                className="flex-1 rounded-full border border-border py-2 text-sm font-bold uppercase tracking-wider"
              >
                Cancel
              </button>
              <button
                disabled={saving}
                onClick={handleSave}
                className="flex-1 rounded-full bg-navy text-white py-2 text-sm font-bold uppercase tracking-wider inline-flex items-center justify-center gap-1.5"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Confirm save
              </button>
            </div>
          </div>
        </div>
      )}
    </MobileFrame>
  );
}
