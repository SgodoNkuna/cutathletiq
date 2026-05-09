import * as React from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, ROLE_LABEL } from "@/lib/auth-context";
import { MobileFrame } from "@/components/MobileFrame";
import { Input } from "@/components/ui/input";
import { exportMyData, deleteMyAccount } from "@/lib/server/popia.functions";
import { toast } from "sonner";
import { Download, FileText, Loader2, LogOut, ShieldCheck, Trash2 } from "lucide-react";
import { PWAStatusCard } from "@/components/PWAStatusCard";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — CUT Athletiq" },
      { name: "description", content: "Manage your account, consent and data rights." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { profile, refreshProfile, signOut } = useAuth();
  const navigate = useNavigate();
  const [first, setFirst] = React.useState("");
  const [last, setLast] = React.useState("");
  const [sport, setSport] = React.useState("");
  const [position, setPosition] = React.useState("");
  const [consentCoach, setConsentCoach] = React.useState(false);
  const [consentPhysio, setConsentPhysio] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!profile) return;
    setFirst(profile.first_name ?? "");
    setLast(profile.last_name ?? "");
    setSport(profile.sport ?? "");
    setPosition(profile.position ?? "");
    setConsentCoach(profile.consent_coach_training);
    setConsentPhysio(profile.consent_physio_health);
  }, [profile]);

  if (!profile) return null;

  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        first_name: first.trim(),
        last_name: last.trim(),
        sport: sport.trim() || null,
        position: position.trim() || null,
        consent_coach_training: consentCoach,
        consent_physio_health: consentPhysio,
        consent_at: new Date().toISOString(),
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) {
      toast.error("Could not save changes.");
      return;
    }
    await refreshProfile();
    toast.success("Profile updated");
  };

  const onExport = async () => {
    try {
      const data = await exportMyData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cut-athletiq-export-${profile.email}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Your data is downloading");
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Please try again.");
    }
  };

  const onExportPDF = async () => {
    try {
      const data = await exportMyData();
      const doc = new jsPDF();
      const fullName = `${profile.first_name} ${profile.last_name}`.trim() || profile.email;

      doc.setFontSize(18);
      doc.text("CUT Athletiq — Personal Record", 14, 18);
      doc.setFontSize(10);
      doc.text(`Athlete: ${fullName}`, 14, 26);
      doc.text(`Email: ${profile.email}`, 14, 32);
      doc.text(`Exported: ${new Date().toLocaleString()}`, 14, 38);

      const prRows = (data.personal_records ?? []).map((r) => [
        new Date(r.achieved_at).toLocaleDateString(),
        r.exercise_name,
        `${r.weight_kg} kg`,
        String(r.reps),
      ]);
      autoTable(doc, {
        startY: 46,
        head: [["Date", "Exercise", "Weight", "Reps"]],
        body: prRows.length ? prRows : [["—", "No personal records yet", "", ""]],
        headStyles: { fillColor: [13, 27, 62] },
      });

      const logRows = (data.workout_logs ?? [])
        .sort((a, b) => +new Date(b.logged_at) - +new Date(a.logged_at))
        .slice(0, 200)
        .map((l) => [
          new Date(l.logged_at).toLocaleDateString(),
          `Set ${l.set_number}`,
          `${l.actual_weight_kg} kg`,
          String(l.actual_reps),
          l.is_pr ? "PR" : "",
        ]);
      const afterPR =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(14);
      doc.text("Workout Logs (last 200 sets)", 14, afterPR);
      autoTable(doc, {
        startY: afterPR + 4,
        head: [["Date", "Set", "Weight", "Reps", "PR"]],
        body: logRows.length ? logRows : [["—", "No logs yet", "", "", ""]],
        headStyles: { fillColor: [13, 27, 62] },
      });

      doc.save(`cut-athletiq-${profile.email}.pdf`);
      toast.success("PDF generated");
    } catch (err) {
      console.error(err);
      toast.error("Could not generate PDF");
    }
  };

  const onDelete = async () => {
    const ok = window.confirm(
      "Delete your account permanently? This cannot be undone. (POPIA s.24)\n\nAll your check-ins, workouts and personal records will be removed.",
    );
    if (!ok) return;
    try {
      const res = await deleteMyAccount({ data: { confirm: "DELETE" } });
      if (!res.ok) {
        toast.error(res.error ?? "Could not delete account.");
        return;
      }
      await signOut();
      toast.success("Your account has been deleted.");
      navigate({ to: "/" });
    } catch (err) {
      console.error(err);
      toast.error("Could not delete account.");
    }
  };

  return (
    <MobileFrame title="Profile">
      <div className="px-5 space-y-4 pb-6">
        <PWAStatusCard />
        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
            Account
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">First</label>
              <Input value={first} onChange={(e) => setFirst(e.target.value)} />
            </div>
            <div>
              <label className="text-[10px] font-bold uppercase text-muted-foreground">Last</label>
              <Input value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="text-[10px] font-bold uppercase text-muted-foreground">Email</label>
            <Input value={profile.email} disabled />
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5 text-gold" />
            Role: <span className="font-bold">{ROLE_LABEL[profile.role]}</span>
          </div>
          {(profile.role === "athlete" || profile.role === "coach") && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] font-bold uppercase text-muted-foreground">
                  Sport
                </label>
                <Input value={sport} onChange={(e) => setSport(e.target.value)} />
              </div>
              {profile.role === "athlete" && (
                <div>
                  <label className="text-[10px] font-bold uppercase text-muted-foreground">
                    Position
                  </label>
                  <Input value={position} onChange={(e) => setPosition(e.target.value)} />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-card border rounded-2xl p-4 space-y-3">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
            Consent (POPIA)
          </div>
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={consentCoach}
              onChange={(e) => setConsentCoach(e.target.checked)}
              className="mt-0.5"
            />
            <span>Share training data with my coach and team admins.</span>
          </label>
          <label className="flex items-start gap-2 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={consentPhysio}
              onChange={(e) => setConsentPhysio(e.target.checked)}
              className="mt-0.5"
            />
            <span>Share injury check-ins and clinical records with my physio (only).</span>
          </label>
          <Link to="/privacy" className="text-[11px] underline text-muted-foreground">
            Read the Privacy Notice
          </Link>
        </div>

        <button
          onClick={save}
          disabled={busy}
          className="w-full bg-gold text-navy-deep font-bold uppercase tracking-wider rounded-full py-3 disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>

        <div className="bg-card border rounded-2xl p-4 space-y-2">
          <div className="text-[11px] uppercase tracking-wider font-bold text-muted-foreground">
            Your data rights
          </div>
          <button
            onClick={onExport}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-navy text-navy font-bold uppercase tracking-wider py-2.5 text-xs"
          >
            <Download className="h-4 w-4" /> Download my data (JSON)
          </button>
          <button
            onClick={onExportPDF}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-navy text-navy font-bold uppercase tracking-wider py-2.5 text-xs"
          >
            <FileText className="h-4 w-4" /> Download my record (PDF)
          </button>
          <button
            onClick={onDelete}
            className="w-full inline-flex items-center justify-center gap-2 rounded-full border-2 border-destructive text-destructive font-bold uppercase tracking-wider py-2.5 text-xs"
          >
            <Trash2 className="h-4 w-4" /> Delete my account
          </button>
        </div>

        <button
          onClick={async () => {
            await signOut();
            navigate({ to: "/login" });
          }}
          className="w-full inline-flex items-center justify-center gap-2 rounded-full bg-navy text-primary-foreground font-bold uppercase tracking-wider py-3"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>

        {import.meta.env.DEV && (
          <Link
            to="/dev/diagnostics"
            className="block text-center text-[10px] text-muted-foreground underline hover:text-foreground"
          >
            Developer diagnostics →
          </Link>
        )}
      </div>
    </MobileFrame>
  );
}
