import * as React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Loader2, Search, Dumbbell, Save, X } from "lucide-react";
import { toast } from "sonner";

export type ExerciseTemplate = {
  id: string;
  name: string;
  category: string;
  equipment: string | null;
  muscle_groups: string[];
  default_sets: number;
  default_reps: number;
  default_rest_seconds: number;
  instructions: string | null;
  video_url: string | null;
  is_global: boolean;
  created_by: string | null;
};

export type TemplatePrefill = {
  name: string;
  sets: number;
  reps: number;
  rest_seconds: number;
  instructions: string | null;
  video_url: string | null;
};

const CATEGORIES = [
  "all",
  "legs",
  "push",
  "pull",
  "core",
  "cardio",
  "mobility",
  "sport",
  "general",
] as const;

/**
 * Searchable exercise template picker.
 * - Lists global library + the coach's saved private templates.
 * - Category chips + fuzzy text search on name/equipment/muscle groups.
 * - "Save current as template" optional path for coaches to grow their library.
 */
export function ExerciseTemplatePicker({
  open,
  onOpenChange,
  onPick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (prefill: TemplatePrefill) => void;
}) {
  const [items, setItems] = React.useState<ExerciseTemplate[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [q, setQ] = React.useState("");
  const [cat, setCat] = React.useState<(typeof CATEGORIES)[number]>("all");

  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      const { data, error } = await supabase
        .from("exercise_templates" as never)
        .select(
          "id,name,category,equipment,muscle_groups,default_sets,default_reps,default_rest_seconds,instructions,video_url,is_global,created_by",
        )
        .order("is_global", { ascending: false })
        .order("name", { ascending: true });
      if (cancelled) return;
      if (error) {
        toast.error("Couldn't load exercise library");
        setItems([]);
      } else {
        setItems((data ?? []) as unknown as ExerciseTemplate[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((it) => {
      if (cat !== "all" && it.category !== cat) return false;
      if (!needle) return true;
      const hay = [
        it.name,
        it.category,
        it.equipment ?? "",
        ...(it.muscle_groups ?? []),
      ]
        .join(" ")
        .toLowerCase();
      return hay.includes(needle);
    });
  }, [items, q, cat]);

  const pick = (it: ExerciseTemplate) => {
    onPick({
      name: it.name,
      sets: it.default_sets,
      reps: it.default_reps,
      rest_seconds: it.default_rest_seconds,
      instructions: it.instructions,
      video_url: it.video_url,
    });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden h-[85vh] flex flex-col">
        <DialogHeader className="px-4 pt-4 pb-2 border-b shrink-0">
          <DialogTitle className="flex items-center gap-2 text-base">
            <Dumbbell className="h-4 w-4 text-gold" /> Exercise Library
          </DialogTitle>
        </DialogHeader>

        <div className="px-3 pt-3 pb-2 space-y-2 shrink-0">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              autoFocus
              placeholder="Search squat, bench, hamstring…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <div className="flex gap-1.5 overflow-x-auto -mx-1 px-1 scrollbar-thin">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                onClick={() => setCat(c)}
                className={
                  "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-colors " +
                  (cat === c
                    ? "bg-navy text-white border-navy"
                    : "bg-card text-muted-foreground border-border hover:text-foreground")
                }
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          {loading ? (
            <div className="py-12 flex items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-gold" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No exercises match.
            </div>
          ) : (
            <ul className="space-y-1.5">
              {filtered.map((it) => (
                <li key={it.id}>
                  <button
                    onClick={() => pick(it)}
                    className="w-full text-left bg-card hover:bg-secondary/60 border rounded-lg p-2.5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-sm truncate">{it.name}</div>
                        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mt-0.5">
                          {it.category}
                          {it.equipment ? ` · ${it.equipment}` : ""}
                        </div>
                        {it.muscle_groups?.length > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
                            {it.muscle_groups.join(", ")}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <div className="text-[10px] font-bold text-foreground tabular-nums">
                          {it.default_sets}×{it.default_reps || "—"}
                        </div>
                        <div className="text-[9px] text-muted-foreground">
                          rest {it.default_rest_seconds}s
                        </div>
                        {!it.is_global && (
                          <div className="text-[9px] text-gold font-bold mt-0.5">MINE</div>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="border-t px-3 py-2 text-[10px] text-muted-foreground text-center shrink-0">
          Tap any drill to add it · {filtered.length} of {items.length} shown
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * "Save as template" helper — coaches grow their private library from any
 * exercise card. Returns the inserted template id.
 */
export async function saveExerciseAsTemplate(input: {
  name: string;
  category?: string;
  default_sets: number;
  default_reps: number;
  default_rest_seconds: number;
  instructions?: string | null;
  video_url?: string | null;
}): Promise<string | null> {
  const { data: userData } = await supabase.auth.getUser();
  const uid = userData.user?.id;
  if (!uid) {
    toast.error("Sign in to save templates");
    return null;
  }
  const { data, error } = await supabase
    .from("exercise_templates" as never)
    .insert({
      name: input.name,
      category: input.category ?? "general",
      default_sets: input.default_sets,
      default_reps: input.default_reps,
      default_rest_seconds: input.default_rest_seconds,
      instructions: input.instructions ?? null,
      video_url: input.video_url ?? null,
      is_global: false,
      created_by: uid,
    } as never)
    .select("id")
    .single<{ id: string }>();
  if (error || !data) {
    toast.error("Couldn't save template");
    return null;
  }
  toast.success("Saved to your library");
  return data.id;
}

export { X as _IconKeepalive };
