import { createClient } from "@supabase/supabase-js";
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(url, key, { auth: { persistSession: false } });
const accounts = [
  { email: "demo-admin@cutathletiq.test", password: "DemoAdmin!2026" },
  { email: "demo-coach@cutathletiq.test", password: "DemoCoach!2026" },
  { email: "demo-physio@cutathletiq.test", password: "DemoPhysio!2026" },
  { email: "demo-athlete@cutathletiq.test", password: "DemoAthlete!2026" },
];
for (const a of accounts) {
  const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const u = list.users.find(x => x.email === a.email);
  if (!u) { console.log("MISSING", a.email); continue; }
  const { error } = await admin.auth.admin.updateUserById(u.id, {
    password: a.password,
    email_confirm: true,
  });
  console.log(a.email, error ? "ERR " + error.message : "OK");
}
