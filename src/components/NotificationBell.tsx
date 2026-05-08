import * as React from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Bell, Check } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import type { Database } from "@/integrations/supabase/types";
import { cn } from "@/lib/utils";

type Nudge = Database["public"]["Tables"]["nudges"]["Row"];

const ICONS: Record<Nudge["type"], string> = {
  new_programme: "🏋️",
  pr_achieved: "🏅",
  missed_session: "⚠️",
  rtp_status_change: "🟢",
  injury_flagged: "🩺",
  checkin_reminder: "📋",
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "now";
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  return `${d}d`;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [nudges, setNudges] = React.useState<Nudge[]>([]);
  const [open, setOpen] = React.useState(false);
  const navigate = useNavigate();

  const load = React.useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("nudges")
      .select("*")
      .eq("recipient_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50);
    setNudges(data ?? []);
  }, [user]);

  React.useEffect(() => {
    if (!user) return;
    void load();
    const channel = supabase
      .channel(`nudges:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "nudges", filter: `recipient_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, load]);

  const unread = nudges.filter((n) => !n.is_read).length;

  const markAllRead = async () => {
    if (!user) return;
    await supabase
      .from("nudges")
      .update({ is_read: true })
      .eq("recipient_id", user.id)
      .eq("is_read", false);
    void load();
  };

  const onTap = async (n: Nudge) => {
    await supabase.from("nudges").update({ is_read: true }).eq("id", n.id);
    setOpen(false);
    if (n.link_path) navigate({ to: n.link_path });
    void load();
  };

  if (!user) return null;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          aria-label={`Notifications (${unread} unread)`}
          className="relative h-9 w-9 rounded-full bg-gold/15 hover:bg-gold/25 ring-1 ring-gold/40 flex items-center justify-center transition-colors"
        >
          <Bell className={cn("h-4 w-4 text-gold", unread > 0 && "animate-pulse")} fill={unread > 0 ? "currentColor" : "none"} />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-destructive text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-navy-deep">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:w-[360px] p-0 flex flex-col">
        <SheetHeader className="px-4 pt-4 pb-2 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle className="font-display text-2xl">Nudges</SheetTitle>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-[11px] uppercase tracking-wider font-bold text-navy hover:text-gold flex items-center gap-1"
              >
                <Check className="h-3 w-3" /> Mark all
              </button>
            )}
          </div>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto">
          {nudges.length === 0 && (
            <div className="px-6 py-12 text-center">
              <Bell className="h-8 w-8 text-muted-foreground/50 mx-auto" />
              <p className="text-sm text-muted-foreground mt-3">No nudges yet.</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                You'll be pinged when a programme drops, when you hit a PR, or when your physio
                updates you.
              </p>
            </div>
          )}
          {nudges.map((n) => (
            <button
              key={n.id}
              onClick={() => onTap(n)}
              className={cn(
                "w-full text-left px-4 py-3 border-b flex gap-3 transition-colors hover:bg-secondary/40",
                !n.is_read && "bg-gold-soft/30",
              )}
            >
              <div className="text-xl shrink-0">{ICONS[n.type]}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm leading-snug">{n.message}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5 uppercase tracking-wider">
                  {timeAgo(n.created_at)} ago
                </p>
              </div>
              {!n.is_read && <span className="h-2 w-2 rounded-full bg-gold shrink-0 mt-1.5" />}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
