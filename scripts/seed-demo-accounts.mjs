import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });

const accounts = [
  { email: "demo-admin@cutathletiq.test",   password: "DemoAdmin!2026",   role: "admin",   first: "Demo", last: "Admin" },
  { email: "demo-coach@cutathletiq.test",   password: "DemoCoach!2026",   role: "coach",   first: "Demo", last: "Coach",   sport: "Rugby" },
  { email: "demo-physio@cutathletiq.test",  password: "DemoPhysio!2026",  role: "physio",  first: "Demo", last: "Physio" },
  { email: "demo-athlete@cutathletiq.test", password: "DemoAthlete!2026", role: "athlete", first: "Demo", last: "Athlete", sport: "Rugby", position: "Flanker" },
];

const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });

for (const a of accounts) {
  let u = list.users.find(x => x.email === a.email);
  if (u) {
    const { error } = await admin.auth.admin.updateUserById(u.id, { password: a.password, email_confirm: true });
    console.log("UPDATE", a.email, error ? "ERR " + error.message : "OK");
  } else {
    const { data, error } = await admin.auth.admin.createUser({
      email: a.email, password: a.password, email_confirm: true,
      user_metadata: {
        first_name: a.first, last_name: a.last, role: a.role,
        sport: a.sport ?? "", position: a.position ?? "",
        consent_coach_training: true, consent_physio_health: true,
      },
    });
    if (error) { console.log("CREATE", a.email, "ERR", error.message); continue; }
    u = data.user;
    console.log("CREATE", a.email, "OK");
  }
  // Ensure profile role/sport correct (trigger may have set athlete default)
  await admin.from("profiles").update({
    role: a.role, first_name: a.first, last_name: a.last,
    sport: a.sport ?? null, position: a.position ?? null,
    consent_coach_training: true, consent_physio_health: true,
    onboarding_complete: true,
  }).eq("id", u.id);
}

// Wire up a demo team: coach owns it, athlete is on it
const coach = (await admin.from("profiles").select("id").eq("email","demo-coach@cutathletiq.test").maybeSingle()).data;
const athlete = (await admin.from("profiles").select("id").eq("email","demo-athlete@cutathletiq.test").maybeSingle()).data;
if (coach) {
  let team = (await admin.from("teams").select("id, join_code").eq("coach_id", coach.id).maybeSingle()).data;
  if (!team) {
    const ins = await admin.from("teams").insert({ name: "CUT Demo Squad", sport: "Rugby", coach_id: coach.id }).select("id, join_code").maybeSingle();
    team = ins.data;
    console.log("TEAM created", team?.join_code);
  } else {
    console.log("TEAM exists", team.join_code);
  }
  if (team && athlete) {
    await admin.from("profiles").update({ team_id: team.id }).eq("id", athlete.id);
    console.log("ATHLETE joined team");
  }
}
console.log("DONE");
