import * as React from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { MobileFrame } from "@/components/MobileFrame";
import { SectionHeader } from "@/components/primitives";
import { useAuth, type Role } from "@/lib/auth-context";
import { BookOpen, Mail, ShieldCheck, KeyRound } from "lucide-react";

export const Route = createFileRoute("/help")({
  head: () => ({
    meta: [
      { title: "Help & FAQ — CUT Athletiq" },
      { name: "description", content: "Guides, FAQs and contact info for athletes, coaches, physios and admins using CUT Athletiq." },
      { property: "og:title", content: "Help & FAQ — CUT Athletiq" },
      { property: "og:description", content: "Guides, FAQs and contact info for everyone on the CUT Athletiq platform." },
      { property: "og:url", content: "https://cutathletiq.lovable.app/help" },
      { name: "twitter:title", content: "Help & FAQ — CUT Athletiq" },
      { name: "twitter:description", content: "Guides, FAQs and contact info for everyone on the CUT Athletiq platform." },
    ],
    links: [{ rel: "canonical", href: "https://cutathletiq.lovable.app/help" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: [
          { "@type": "Question", name: "How do I reset my password?", acceptedAnswer: { "@type": "Answer", text: "Go to Login → Reset password and follow the email link." } },
          { "@type": "Question", name: "How do I join a team?", acceptedAnswer: { "@type": "Answer", text: "Use the team join code from your coach on the Join Team screen, or follow an invite link." } },
          { "@type": "Question", name: "Who can see my wellness and injury data?", acceptedAnswer: { "@type": "Answer", text: "Only your coach (training data) and physio (health data), based on the consents you grant. Admins see aggregated stats." } },
        ],
      }),
    }],
  }),
  component: HelpPage,
});

const SECTIONS: Record<Role | "all", { q: string; a: string }[]> = {
  all: [
    { q: "How do I reset my password?", a: "Go to Login → Reset password and follow the email link." },
    { q: "Why am I redirected to onboarding?", a: "You haven't completed your profile yet. Finish onboarding to access the app." },
    { q: "Who can see my data?", a: "Coaches see training data only. Physios see injury data only. See the Privacy Notice for details." },
  ],
  athlete: [
    { q: "How do I log a workout?", a: "Open Workout → tap a session → record each set with reps, weight and RPE." },
    { q: "What does readiness mean?", a: "A 1–5 score combining sleep + how you feel. Coaches use it to adjust load." },
    { q: "I'm injured — what now?", a: "Body tab → log pain level + region. Score ≥7 auto-notifies the physio." },
  ],
  coach: [
    { q: "How do I create a programme?", a: "Program tab → New programme → add sessions and exercises → assign team." },
    { q: "Where do I see who attended?", a: "Squad → tap an athlete to see their completions and PRs." },
  ],
  physio: [
    { q: "How do I update RTP status?", a: "Cases → tap an injury → set status (Cleared / Modified / Unavailable)." },
  ],
  admin: [
    { q: "How do I rotate invite codes?", a: "Admin → Invite codes. Coach, physio, and admin codes all rotate from there." },
    { q: "Where is system health?", a: "Visit /system-status to see env secrets and code configuration at a glance." },
  ],
};

function HelpPage() {
  const { profile } = useAuth();
  const role = profile?.role ?? "athlete";
  const items = [...SECTIONS.all, ...SECTIONS[role]];

  return (
    <MobileFrame title="Help">
      <div className="px-5">
        <div className="bg-gradient-to-br from-navy to-navy-deep text-white rounded-2xl p-4">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-white/70">
            <BookOpen className="h-3.5 w-3.5 text-gold" /> Knowledge base · {role}
          </div>
          <div className="font-display text-2xl mt-1">How CUT Athletiq works</div>
          <div className="text-[11px] text-white/60 mt-1">
            Tips, FAQs and where to get help when you're stuck.
          </div>
        </div>

        <SectionHeader title="Frequently asked" />
        <div className="space-y-2">
          {items.map((item) => (
            <details key={item.q} className="bg-card rounded-2xl border p-4 group">
              <summary className="cursor-pointer font-bold text-sm list-none flex items-start justify-between gap-2">
                <span>{item.q}</span>
                <span className="text-muted-foreground text-xs group-open:rotate-180 transition-transform">▾</span>
              </summary>
              <p className="text-sm text-muted-foreground mt-2">{item.a}</p>
            </details>
          ))}
        </div>

        <SectionHeader title="Get in touch" />
        <div className="grid grid-cols-3 gap-2">
          <a
            href="mailto:sports@cut.ac.za"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-3 text-[10px] font-bold uppercase tracking-wider hover:bg-secondary"
          >
            <Mail className="h-5 w-5" />
            Email us
          </a>
          <Link
            to="/privacy"
            className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-3 text-[10px] font-bold uppercase tracking-wider hover:bg-secondary"
          >
            <ShieldCheck className="h-5 w-5" />
            Privacy
          </Link>
          {profile?.role === "admin" && (
            <Link
              to="/admin/invites"
              className="flex flex-col items-center justify-center gap-1 rounded-2xl border bg-card p-3 text-[10px] font-bold uppercase tracking-wider hover:bg-secondary"
            >
              <KeyRound className="h-5 w-5" />
              Invites
            </Link>
          )}
        </div>

        <div className="text-center text-[11px] text-muted-foreground mt-6">
          <Link to="/system-status" className="underline">System status</Link> ·{" "}
          <Link to="/security" className="underline">Security notes</Link>
        </div>
      </div>
    </MobileFrame>
  );
}
