import { createClient } from "@supabase/supabase-js";
const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const map = {
  "demo-admin@cutathletiq.test":   { role: "admin",   first: "Demo", last: "Admin" },
  "demo-coach@cutathletiq.test":   { role: "coach",   first: "Demo", last: "Coach",   sport: "Rugby" },
  "demo-physio@cutathletiq.test":  { role: "physio",  first: "Demo", last: "Physio" },
  "demo-athlete@cutathletiq.test": { role: "athlete", first: "Demo", last: "Athlete", sport: "Rugby", position: "Flanker" },
};
const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
for (const u of list.users) {
  const m = map[u.email];
  if (!m) continue;
  const { error } = await admin.from("profiles").upsert({
    id: u.id, email: u.email, first_name: m.first, last_name: m.last, role: m.role,
    sport: m.sport ?? null, position: m.position ?? null,
    consent_coach_training: true, consent_physio_health: true,
    consent_at: new Date().toISOString(), onboarding_complete: true,
  });
  console.log(u.email, error?.message ?? "OK");
}
const coach = (await admin.from("profiles").select("id").eq("email","demo-coach@cutathletiq.test").maybeSingle()).data;
const athlete = (await admin.from("profiles").select("id").eq("email","demo-athlete@cutathletiq.test").maybeSingle()).data;
if (coach) {
  let team = (await admin.from("teams").select("id, join_code").eq("coach_id", coach.id).maybeSingle()).data;
  if (!team) {
    const ins = await admin.from("teams").insert({ name: "CUT Demo Squad", sport: "Rugby", coach_id: coach.id }).select("id, join_code").maybeSingle();
    team = ins.data;
    console.log("TEAM created", team?.join_code, ins.error?.message);
  } else console.log("TEAM exists", team.join_code);
  if (team && athlete) {
    const r = await admin.from("profiles").update({ team_id: team.id }).eq("id", athlete.id);
    console.log("ATHLETE joined team", r.error?.message ?? "OK");
  }
}
