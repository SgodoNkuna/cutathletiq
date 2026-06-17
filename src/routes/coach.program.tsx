import * as React from "react";
import { createFileRoute } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import {
  Plus,
  Trash2,
  Loader2,
  Hand,
  CircleStop,
  Moon,
  Link2,
  Unlink,
  ArrowUp,
  ArrowDown,
  Timer,
  Youtube,
  Repeat,
} from "lucide-react";
import { isValidYouTubeUrl } from "@/lib/youtube";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { useCoachProgramme, type DBExercise } from "@/lib/hooks/use-coach-programme";
import {
  metaFromRow,
  notesFromMeta,
  parseExerciseNotes,
  validateExercise,
  validateProgrammeForPublish,
  previewReps,
  formatDuration,
  type ExerciseKind,
} from "@/lib/exercise-meta";

export const Route = createFileRoute("/coach/program")({
  head: () => ({
    meta: [
      { title: "Program Builder — CUT Athletiq" },
      { name: "description", content: "Plan team or individual training cycles." },
    ],
  }),
  component: ProgramPage,
});

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
function dayLabel(iso: string) {
  return DOW[new Date(iso + "T00:00:00").getDay()] ?? "—";
}

// Soft palette for superset chips (Tailwind-safe class strings).
const GROUP_COLORS = [
  { token: "amber", chip: "bg-amber-100 text-amber-900 border-amber-300" },
  { token: "sky", chip: "bg-sky-100 text-sky-900 border-sky-300" },
  { token: "emerald", chip: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { token: "violet", chip: "bg-violet-100 text-violet-900 border-violet-300" },
  { token: "rose", chip: "bg-rose-100 text-rose-900 border-rose-300" },
];
function colorClass(token: string | null | undefined) {
  return GROUP_COLORS.find((c) => c.token === token)?.chip ?? GROUP_COLORS[0].chip;
}
function nextGroupColor(existing: Set<string>) {
  return GROUP_COLORS.find((c) => !existing.has(c.token)) ?? GROUP_COLORS[0];
}
function nextGroupLabel(existing: Set<string>) {
  for (let i = 0; i < 26; i++) {
    const label = String.fromCharCode(65 + i);
    if (!existing.has(label)) return label;
  }
  return "X";
}

function ProgramPage() {
  const { profile } = useAuth();
  const coachId = profile?.id ?? null;
  const teamId = profile?.team_id ?? null;
  const {
    programme,
    loading,
    addSession,
    removeSession,
    updateSession,
    addExercise,
    updateExercise,
    removeExercise,
    renameProgramme,
  } = useCoachProgramme(coachId, teamId);

  const [activeIdx, setActiveIdx] = React.useState(0);

  const handleAddSession = () => {
    const next = new Date();
    next.setDate(next.getDate() + (programme?.sessions.length ?? 0));
    void addSession(next.toISOString().slice(0, 10), `Day ${(programme?.sessions.length ?? 0) + 1}`);
    setTimeout(() => setActiveIdx((programme?.sessions.length ?? 0)), 50);
  };

  const publish = () => {
    if (!teamId) {
      toast.error("Create or join a team first to publish");
      return;
    }
    if (!programme) return;
    const { ok, errors } = validateProgrammeForPublish({
      sessions: programme.sessions.filter((s) => !s.is_rest_day),
    });
    if (!ok) {
      toast.error(errors[0] ?? "Programme is not ready");
      return;
    }
    toast.success("Programme is live — athletes have been notified.");
  };

  if (loading || !programme) {
    return (
      <MobileFrame title="Program Builder">
        <div className="px-5 py-12 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-gold" />
        </div>
      </MobileFrame>
    );
  }

  const sessions = programme.sessions;
  const safeIdx = Math.min(activeIdx, Math.max(sessions.length - 1, 0));
  const active = sessions[safeIdx];

  const publishCheck = validateProgrammeForPublish({
    sessions: sessions.filter((s) => !s.is_rest_day),
  });
  const canPublish = !!teamId && publishCheck.ok;

  // Group exercises in active session: keep stable order; rows are grouped by group_id.
  const groups = React.useMemo(() => {
    if (!active) return [];
    const out: Array<{ id: string | null; label: string | null; color: string | null; items: DBExercise[] }> = [];
    const map = new Map<string, number>();
    for (const x of active.exercises) {
      if (!x.group_id) {
        out.push({ id: null, label: null, color: null, items: [x] });
      } else {
        const idx = map.get(x.group_id);
        if (idx === undefined) {
          map.set(x.group_id, out.length);
          out.push({ id: x.group_id, label: x.group_label, color: x.group_color, items: [x] });
        } else {
          out[idx].items.push(x);
        }
      }
    }
    return out;
  }, [active]);

  const usedLabels = new Set<string>();
  const usedColors = new Set<string>();
  active?.exercises.forEach((x) => {
    if (x.group_label) usedLabels.add(x.group_label);
    if (x.group_color) usedColors.add(x.group_color);
  });

  const toggleGroupWithPrev = async (x: DBExercise) => {
    if (!active) return;
    const idx = active.exercises.findIndex((e) => e.id === x.id);
    if (idx <= 0) {
      toast.error("Nothing above to group with");
      return;
    }
    const prev = active.exercises[idx - 1];
    if (x.group_id && x.group_id === prev.group_id) {
      // Ungroup: clear this row's group
      await updateExercise(x.id, active.id, {
        group_id: null,
        group_label: null,
        group_color: null,
      });
      return;
    }
    let groupId = prev.group_id;
    let label = prev.group_label;
    let color = prev.group_color;
    if (!groupId) {
      groupId = crypto.randomUUID();
      label = nextGroupLabel(usedLabels);
      color = nextGroupColor(usedColors).token;
      await updateExercise(prev.id, active.id, {
        group_id: groupId,
        group_label: label,
        group_color: color,
      });
    }
    await updateExercise(x.id, active.id, {
      group_id: groupId,
      group_label: label,
      group_color: color,
    });
  };

  const moveExercise = async (x: DBExercise, dir: -1 | 1) => {
    if (!active) return;
    const list = [...active.exercises];
    const i = list.findIndex((e) => e.id === x.id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    // Persist new order_index pairwise for the two rows.
    await Promise.all([
      updateExercise(list[i].id, active.id, { order_index: i }),
      updateExercise(list[j].id, active.id, { order_index: j }),
    ]);
  };

  return (
    <MobileFrame title="Program Builder">
      <div className="px-4 pb-24">
        {/* Programme header */}
        <div className="bg-card rounded-xl border p-3 mb-3">
          <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
            Programme name
          </label>
          <input
            value={programme.name}
            onChange={(e) => renameProgramme(e.target.value)}
            maxLength={120}
            className="w-full bg-transparent text-base font-bold focus:outline-none mt-1"
          />
          <div className="text-[11px] text-muted-foreground mt-1">
            {teamId
              ? "Visible to your team. Athletes get a nudge on publish."
              : "⚠ No team yet — create one to share with athletes."}
          </div>
        </div>

        {/* Day tabs — horizontal scroll on mobile */}
        <div className="mb-3 -mx-4 px-4 overflow-x-auto scrollbar-thin">
          <div className="flex gap-1.5 min-w-max">
            {sessions.map((s, i) => {
              const isActive = i === safeIdx;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveIdx(i)}
                  className={
                    "shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-colors border " +
                    (isActive
                      ? "bg-navy text-white border-navy"
                      : "bg-card text-muted-foreground border-border hover:text-foreground")
                  }
                >
                  <div className="leading-none">{dayLabel(s.session_date)}</div>
                  <div className="text-[9px] opacity-80 mt-0.5">Day {i + 1}</div>
                  {s.is_rest_day && (
                    <Moon className="h-3 w-3 mx-auto mt-1" aria-label="Rest day" />
                  )}
                </button>
              );
            })}
            <button
              onClick={handleAddSession}
              className="shrink-0 rounded-lg px-3 py-2 text-[11px] font-bold uppercase tracking-wider border-2 border-dashed border-border text-muted-foreground hover:text-gold hover:border-gold flex items-center gap-1"
            >
              <Plus className="h-3 w-3" /> Day
            </button>
          </div>
        </div>

        {sessions.length === 0 || !active ? (
          <div className="bg-secondary/40 rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">
            No days yet. Tap <span className="font-bold">+ Day</span> above to add one.
          </div>
        ) : (
          <div className="bg-card rounded-2xl border shadow-sm overflow-hidden">
            {/* Session header */}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 p-3 bg-secondary/40 border-b">
              <div className="min-w-0 flex items-center gap-2">
                <div className="shrink-0 bg-gold text-navy-deep rounded-md px-2 py-0.5 text-[11px] font-bold">
                  Day {safeIdx + 1}
                </div>
                <input
                  value={active.name}
                  onChange={(e) => updateSession(active.id, { name: e.target.value })}
                  maxLength={120}
                  className="flex-1 min-w-0 bg-transparent text-sm font-bold focus:outline-none"
                />
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <input
                  type="date"
                  value={active.session_date}
                  onChange={(e) => updateSession(active.id, { session_date: e.target.value })}
                  className="text-[10px] bg-secondary rounded px-1.5 py-1"
                />
                <button
                  onClick={() => updateSession(active.id, { is_rest_day: !active.is_rest_day })}
                  aria-pressed={active.is_rest_day}
                  className={
                    "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 border transition-colors " +
                    (active.is_rest_day
                      ? "bg-navy text-white border-navy"
                      : "bg-card text-muted-foreground border-border hover:text-foreground")
                  }
                  title="Mark as rest day"
                >
                  <Moon className="h-3 w-3" />
                  Rest
                </button>
                <button
                  onClick={() => {
                    if (confirm("Delete this day?")) {
                      void removeSession(active.id);
                      setActiveIdx(Math.max(0, safeIdx - 1));
                    }
                  }}
                  className="text-muted-foreground hover:text-destructive p-1"
                  aria-label="Remove day"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            {active.is_rest_day ? (
              <div className="p-6 text-center">
                <Moon className="h-8 w-8 text-navy mx-auto mb-2" />
                <div className="text-sm font-bold">Rest day</div>
                <div className="text-[11px] text-muted-foreground mt-1">
                  Athletes will see a recovery prompt instead of a workout.
                </div>
              </div>
            ) : (
              <>
                {/* Circuit-mode toolbar */}
                <div className="flex flex-wrap items-center gap-2 px-3 py-2 border-b bg-secondary/20">
                  <button
                    type="button"
                    onClick={() =>
                      updateSession(active.id, { is_circuit: !active.is_circuit })
                    }
                    aria-pressed={active.is_circuit}
                    className={
                      "flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-1 border transition-colors " +
                      (active.is_circuit
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : "bg-card text-muted-foreground border-border hover:text-foreground")
                    }
                    title="Athletes complete all exercises back-to-back, then rest"
                  >
                    <Repeat className="h-3 w-3" /> Circuit
                  </button>
                  {active.is_circuit && (
                    <>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Rounds
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={active.circuit_rounds}
                          onChange={(e) =>
                            updateSession(active.id, {
                              circuit_rounds: Math.max(1, Math.min(20, +e.target.value || 1)),
                            })
                          }
                          className="ml-1 w-12 text-center text-xs font-bold bg-secondary rounded-md py-1"
                        />
                      </label>
                      <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">
                        Rest s
                        <input
                          type="number"
                          min={0}
                          max={600}
                          step={5}
                          value={active.circuit_rest_seconds}
                          onChange={(e) =>
                            updateSession(active.id, {
                              circuit_rest_seconds: Math.max(0, Math.min(600, +e.target.value || 0)),
                            })
                          }
                          className="ml-1 w-14 text-center text-xs font-bold bg-secondary rounded-md py-1"
                        />
                      </label>
                      <span className="text-[10px] text-muted-foreground">
                        between rounds
                      </span>
                    </>
                  )}
                </div>
                <div className="p-2 space-y-2">
                {groups.length === 0 && (
                  <div className="text-[11px] text-destructive font-bold px-2 py-1">
                    ⚠ Add at least one drill or this day can't be published.
                  </div>
                )}
                {groups.map((g, gi) => (
                  <div
                    key={g.id ?? `single-${gi}`}
                    className={
                      g.id
                        ? "rounded-xl border-2 p-1.5 space-y-1.5 " + colorClass(g.color)
                        : "space-y-1.5"
                    }
                  >
                    {g.id && (
                      <div className="px-1 pt-0.5 flex items-center justify-between">
                        <span className="text-[10px] uppercase tracking-wider font-black">
                          Superset {g.label}
                        </span>
                        <span className="text-[9px] opacity-70">
                          {g.items.length} exercises share rest
                        </span>
                      </div>
                    )}
                    {g.items.map((x) => (
                      <ExerciseRow
                        key={x.id}
                        x={x}
                        sessionId={active.id}
                        all={active.exercises}
                        updateExercise={updateExercise}
                        removeExercise={removeExercise}
                        onToggleGroup={() => toggleGroupWithPrev(x)}
                        onMoveUp={() => moveExercise(x, -1)}
                        onMoveDown={() => moveExercise(x, +1)}
                      />
                    ))}
                  </div>
                ))}
                <button
                  onClick={() => addExercise(active.id)}
                  className="w-full rounded-lg border-2 border-dashed border-border py-2.5 text-xs font-bold text-muted-foreground hover:border-gold hover:text-gold flex items-center justify-center gap-1"
                >
                  <Plus className="h-3 w-3" /> Add exercise
                </button>
              </div>
            )}
          </div>
        )}

        <button
          onClick={publish}
          disabled={!canPublish}
          className="mt-5 w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-3 hover:scale-[1.01] transition-transform shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
        >
          {teamId ? "Notify athletes" : "Create a team to publish"}
        </button>
        {!canPublish && publishCheck.errors.length > 0 && (
          <div className="mt-2 text-[11px] text-destructive text-center font-bold">
            {publishCheck.errors[0]}
          </div>
        )}
        <div className="mt-2 text-[10px] text-center text-muted-foreground">
          Changes save automatically as you type.
        </div>
      </div>
    </MobileFrame>
  );
}

function ExerciseRow({
  x,
  sessionId,
  all,
  updateExercise,
  removeExercise,
  onToggleGroup,
  onMoveUp,
  onMoveDown,
}: {
  x: DBExercise;
  sessionId: string;
  all: DBExercise[];
  updateExercise: ReturnType<typeof useCoachProgramme>["updateExercise"];
  removeExercise: ReturnType<typeof useCoachProgramme>["removeExercise"];
  onToggleGroup: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  const meta = metaFromRow(x);
  const { text: legacyText } = parseExerciseNotes(x.notes);
  const idx = all.findIndex((e) => e.id === x.id);
  const isFirst = idx === 0;
  const isLast = idx === all.length - 1;
  const prev = idx > 0 ? all[idx - 1] : null;
  const isInGroup = !!x.group_id;
  const isGroupedWithPrev = prev && prev.group_id && prev.group_id === x.group_id;

  const setKind = (kind: ExerciseKind) => {
    const patchedDuration =
      kind === "strength"
        ? null
        : x.duration_seconds && x.duration_seconds > 0
          ? x.duration_seconds
          : 30;
    void updateExercise(x.id, sessionId, {
      duration_seconds: patchedDuration,
      notes: notesFromMeta({ ...meta, kind }, legacyText),
    });
  };
  const setDuration = (sec: number) =>
    updateExercise(x.id, sessionId, {
      duration_seconds: Math.max(1, Math.min(3600, sec)),
    });
  const setRepStep = (step: number) =>
    updateExercise(x.id, sessionId, {
      notes: notesFromMeta({ ...meta, rep_step: Math.max(0, Math.min(50, step)) }, legacyText),
    });
  const setInstructions = (val: string) =>
    updateExercise(x.id, sessionId, { instructions: val.slice(0, 1000) || null });
  const toggleManual = () =>
    updateExercise(x.id, sessionId, { manual_finish: !x.manual_finish });
  const setRest = (sec: number) =>
    updateExercise(x.id, sessionId, {
      rest_seconds: sec === 0 ? null : Math.max(0, Math.min(600, sec)),
    });

  const isStrength = meta.kind === "strength";
  const errors = validateExercise({ name: x.name, sets: x.sets, reps: x.reps, meta });
  const preview = previewReps(x.sets, x.reps, meta);

  return (
    <div className="rounded-lg border bg-background p-2 space-y-1.5">
      <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-1.5">
        <div className="flex flex-col">
          <button
            onClick={onMoveUp}
            disabled={isFirst}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
            aria-label="Move up"
          >
            <ArrowUp className="h-3 w-3" />
          </button>
          <button
            onClick={onMoveDown}
            disabled={isLast}
            className="text-muted-foreground hover:text-foreground disabled:opacity-30 p-0.5"
            aria-label="Move down"
          >
            <ArrowDown className="h-3 w-3" />
          </button>
        </div>
        <input
          value={x.name}
          onChange={(e) => updateExercise(x.id, sessionId, { name: e.target.value })}
          maxLength={80}
          placeholder="Drill name"
          className={
            "min-w-0 bg-transparent text-sm font-bold focus:outline-none " +
            (!x.name?.trim() ? "text-destructive placeholder:text-destructive/70" : "")
          }
        />
        <div className="flex items-center gap-1 shrink-0">
          <KindToggle kind={meta.kind} onChange={setKind} />
          <button
            onClick={onToggleGroup}
            disabled={isFirst}
            title={
              isFirst
                ? "Group with the exercise above"
                : isGroupedWithPrev
                  ? "Ungroup from superset"
                  : "Group with previous as superset"
            }
            className={
              "p-1 rounded transition-colors disabled:opacity-30 " +
              (isInGroup ? "text-emerald-600" : "text-muted-foreground hover:text-foreground")
            }
            aria-label={isGroupedWithPrev ? "Ungroup" : "Group with previous"}
          >
            {isGroupedWithPrev ? <Unlink className="h-3.5 w-3.5" /> : <Link2 className="h-3.5 w-3.5" />}
          </button>
          <button
            onClick={() => removeExercise(x.id, sessionId)}
            className="text-muted-foreground hover:text-destructive p-1"
            aria-label="Remove exercise"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap pl-6">
        <Field label="Sets">
          <input
            type="number"
            min={1}
            max={20}
            value={x.sets}
            onChange={(e) =>
              updateExercise(x.id, sessionId, {
                sets: Math.max(1, Math.min(20, +e.target.value || 1)),
              })
            }
            className="w-10 text-center text-sm font-bold bg-secondary rounded-md py-1"
          />
        </Field>
        <Field label={isStrength ? "Reps" : "Reps/round"}>
          <input
            type="number"
            min={isStrength ? 1 : 0}
            max={500}
            value={x.reps}
            onChange={(e) =>
              updateExercise(x.id, sessionId, {
                reps: Math.max(0, Math.min(500, +e.target.value || 0)),
              })
            }
            className="w-12 text-center text-sm font-bold bg-secondary rounded-md py-1"
          />
        </Field>
        {isStrength ? (
          <Field label="kg">
            <input
              type="number"
              min={0}
              max={500}
              step={2.5}
              value={x.weight_kg ?? 0}
              onChange={(e) =>
                updateExercise(x.id, sessionId, {
                  weight_kg: Math.max(0, Math.min(500, +e.target.value || 0)),
                })
              }
              className="w-14 text-center text-sm font-bold bg-secondary rounded-md py-1"
            />
          </Field>
        ) : (
          <Field label={meta.kind === "running" ? "Sec/run" : "Sec/set"}>
            <input
              type="number"
              min={1}
              max={3600}
              step={5}
              value={x.duration_seconds ?? 0}
              onChange={(e) => setDuration(+e.target.value || 0)}
              className="w-14 text-center text-sm font-bold bg-secondary rounded-md py-1"
            />
          </Field>
        )}
        <Field label="Step −">
          <input
            type="number"
            min={0}
            max={50}
            value={meta.rep_step ?? 0}
            onChange={(e) => setRepStep(+e.target.value || 0)}
            className="w-12 text-center text-sm font-bold bg-secondary rounded-md py-1"
            title="Decrease reps each set (e.g. 10 → 8 → 6)"
          />
        </Field>
        <Field label="Rest s">
          <input
            type="number"
            min={0}
            max={600}
            step={5}
            value={x.rest_seconds ?? 0}
            onChange={(e) => setRest(+e.target.value || 0)}
            className="w-14 text-center text-sm font-bold bg-secondary rounded-md py-1"
            title="Rest between sets in seconds"
          />
        </Field>
        <button
          type="button"
          onClick={toggleManual}
          aria-pressed={x.manual_finish}
          title={
            x.manual_finish
              ? "Athlete must tap Finish on every set"
              : "Auto-completes when timer ends or last set logged"
          }
          className={
            "ml-auto flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 transition-colors " +
            (x.manual_finish
              ? "bg-navy text-white"
              : "bg-secondary text-muted-foreground hover:text-foreground")
          }
        >
          {x.manual_finish ? <Hand className="h-3 w-3" /> : <CircleStop className="h-3 w-3" />}
          {x.manual_finish ? "Manual" : "Auto"}
        </button>
      </div>

      <div className="pl-6">
        <textarea
          value={x.instructions ?? ""}
          onChange={(e) => setInstructions(e.target.value)}
          maxLength={1000}
          rows={2}
          placeholder="Add coaching cues, technique notes, or setup instructions."
          className="w-full text-[11px] bg-secondary/60 rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-gold resize-none"
        />
      </div>

      <div className="pl-6 flex items-center gap-1 flex-wrap">
        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
          Preview:
        </span>
        {preview.map((r, i) => (
          <span
            key={i}
            className="text-[10px] font-bold bg-navy/10 text-navy rounded px-1.5 py-0.5 tabular-nums"
            title={`Set ${i + 1}`}
          >
            {r > 0 ? r : "—"}
            {!isStrength && x.duration_seconds ? `×${formatDuration(x.duration_seconds)}` : ""}
          </span>
        ))}
        {x.rest_seconds ? (
          <span className="ml-1 text-[10px] font-bold text-emerald-700 inline-flex items-center gap-0.5">
            <Timer className="h-3 w-3" /> {x.rest_seconds}s rest
          </span>
        ) : null}
      </div>

      {errors.length > 0 && (
        <ul className="pl-6 space-y-0.5">
          {errors.map((err) => (
            <li
              key={err}
              className="text-[10px] text-destructive font-bold flex items-center gap-1"
            >
              <span aria-hidden>⚠</span>
              {err}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center">
      {children}
      <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
        {label}
      </div>
    </div>
  );
}

function KindToggle({
  kind,
  onChange,
}: {
  kind: ExerciseKind;
  onChange: (k: ExerciseKind) => void;
}) {
  const next: Record<ExerciseKind, ExerciseKind> = {
    strength: "running",
    running: "time",
    time: "strength",
  };
  const label: Record<ExerciseKind, string> = {
    strength: "Lift",
    running: "Run",
    time: "Hold",
  };
  return (
    <button
      type="button"
      onClick={() => onChange(next[kind])}
      className="text-[10px] font-bold uppercase tracking-wider rounded-full bg-secondary px-2 py-1 hover:bg-secondary/80"
      title="Tap to change exercise type"
    >
      {label[kind]}
    </button>
  );
}
