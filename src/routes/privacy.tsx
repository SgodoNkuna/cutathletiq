import { createFileRoute, Link } from "@tanstack/react-router";
import { TestModeStamp } from "@/components/TestModeStamp";
import logoUrl from "@/assets/cut-logo.png";
import { ShieldCheck, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/privacy")({
  head: () => ({
    meta: [
      { title: "Privacy Notice — CUT Athletiq" },
      { name: "description", content: "How CUT Athletiq collects, stores and protects your training, wellness and health data under POPIA." },
      { property: "og:title", content: "Privacy Notice — CUT Athletiq" },
      { property: "og:description", content: "How CUT Athletiq protects your training, wellness and health data under POPIA." },
      { property: "og:url", content: "https://cutathletiq.lovable.app/privacy" },
      { name: "twitter:title", content: "Privacy Notice — CUT Athletiq" },
      { name: "twitter:description", content: "How CUT Athletiq protects your training, wellness and health data under POPIA." },
    ],
    links: [{ rel: "canonical", href: "https://cutathletiq.lovable.app/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-secondary via-background to-secondary/40 flex items-center justify-center py-4 px-2">
      <div className="relative w-full max-w-[430px] min-h-[calc(100vh-2rem)] sm:min-h-[860px] bg-background rounded-[2.25rem] sm:border-[10px] border-navy-deep shadow-2xl overflow-hidden flex flex-col">
        <div className="bg-navy text-white px-6 pt-8 pb-6">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-[11px] uppercase tracking-wider text-white/70 hover:text-white"
          >
            <ArrowLeft className="h-3 w-3" /> Back
          </Link>
          <div className="flex items-center gap-3 mt-3">
            <div className="bg-white rounded-lg p-1.5">
              <img src={logoUrl} alt="CUT" className="h-7 w-auto" />
            </div>
            <div>
              <div className="font-display text-xl tracking-wide leading-none">PRIVACY NOTICE</div>
              <div className="text-[11px] text-white/60">Phase 1 Test Build · POPIA-aligned</div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5 text-sm leading-relaxed">
          <div className="rounded-lg bg-warn/10 border border-warn/40 p-3 text-xs">
            ⚠️ <strong>Test build only.</strong> Real names, emails and phone numbers below are
            placeholders that
            <strong> must be replaced before any wider rollout</strong>.
          </div>

          <section>
            <h2 className="font-display text-xl flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-gold" /> Who we are
            </h2>
            <p className="mt-1 text-muted-foreground">
              CUT Athletiq is an internal sport-performance tool built for the Central University of
              Technology (CUT), Free State. It is operated by the CUT Sports Department.
            </p>
            <p className="mt-1 text-muted-foreground text-xs">
              <strong>Information Officer (placeholder):</strong> dpo@cut.ac.za · CUT Bloemfontein
              switchboard +27&nbsp;51&nbsp;507&nbsp;3911. These details will be updated to the named
              officer before public launch.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">What we collect</h2>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                Name, email, role (athlete / coach / physio / admin), sport and position you give us
                at signup.
              </li>
              <li>
                Training data: workouts you log, RPE, attendance, personal records, readiness
                check-ins.
              </li>
              <li>
                Injury data: body-map check-ins (athlete-submitted) and clinical injury records
                (physio-entered).
              </li>
              <li>In-app nudges sent to you and consent history (when you ticked which boxes).</li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">Who sees what</h2>
            <div className="mt-2 rounded-lg border bg-card overflow-hidden text-xs">
              <Row
                what="Profile (name, sport)"
                coach="✓ if same team"
                physio="✓ if same team"
                admin="✓ all"
              />
              <Row what="Workouts, RPE, PRs" coach="✓ if same team" physio="✗" admin="✓ all" />
              <Row what="Body-map check-ins (pain)" coach="✗" physio="✓ if same team" admin="✗" />
              <Row
                what="Clinical injury records"
                coach="✗"
                physio="✓ if same team"
                admin="✓ all (audit)"
              />
              <Row
                what="Return-to-Play status (only)"
                coach="✓ summary"
                physio="✓ full"
                admin="✓ all"
              />
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              Coaches <strong>do not see</strong> pain levels, body parts, diagnoses or treatment
              notes. They only see whether an athlete is cleared, on modified training, or
              unavailable.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Your rights (POPIA s.23, s.24)</h2>
            <ul className="mt-1 list-disc pl-5 text-muted-foreground space-y-1">
              <li>
                <strong>Access:</strong> download a JSON file of every record we hold about you,
                from Profile.
              </li>
              <li>
                <strong>Correction:</strong> edit your profile, sport, position and consent at any
                time from Profile.
              </li>
              <li>
                <strong>Withdraw consent:</strong> uncheck either consent in Profile. The relevant
                data stops being shared and is removed within 7 days.
              </li>
              <li>
                <strong>Deletion:</strong> from Profile you can permanently delete your account.
                This cascades all your records.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="font-display text-xl">Retention</h2>
            <p className="mt-1 text-muted-foreground">
              Training and injury data is kept for the duration of your involvement with the CUT
              Sports Department, plus a default 24 months for performance trend analysis. You can
              ask us to delete it sooner.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Security</h2>
            <p className="mt-1 text-muted-foreground">
              Data is stored on Lovable Cloud (managed Supabase) inside the EU region. Access is
              controlled by row-level security policies that strictly separate the coaching layer
              from the clinical layer. Every read of a clinical record is written to an audit log
              accessible to admins.
            </p>
          </section>

          <section>
            <h2 className="font-display text-xl">Complaints</h2>
            <p className="mt-1 text-muted-foreground">
              You can lodge a complaint with the South African Information Regulator at{" "}
              <a
                href="https://inforegulator.org.za"
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                inforegulator.org.za
              </a>{" "}
              if you believe your rights have been infringed.
            </p>
          </section>

          <p className="text-[10px] text-muted-foreground pt-4 border-t">
            Last updated: April 2026 · Document version: Phase 1 Test
          </p>
        </div>

        <TestModeStamp />
      </div>
    </div>
  );
}

function Row({
  what,
  coach,
  physio,
  admin,
}: {
  what: string;
  coach: string;
  physio: string;
  admin: string;
}) {
  return (
    <div className="grid grid-cols-[1.4fr_0.8fr_0.8fr_0.8fr] divide-x divide-border border-b last:border-b-0">
      <div className="p-2 font-bold">{what}</div>
      <div className="p-2 text-center">{coach}</div>
      <div className="p-2 text-center">{physio}</div>
      <div className="p-2 text-center">{admin}</div>
    </div>
  );
}
