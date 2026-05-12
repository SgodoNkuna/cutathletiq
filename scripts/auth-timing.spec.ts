// Playwright: repeated sign-in timing benchmark.
// Signs in N times across a set of demo accounts (chosen at random per
// iteration) and asserts every navigation to the role home completes in
// under 2s. Catches regressions where the auth-context profile fetch is
// re-introduced into the critical path.
//
// Run: bunx playwright test scripts/auth-timing.spec.ts
import { test, expect } from "@playwright/test";
import { mkdirSync } from "fs";
import { join } from "path";

const ACCOUNTS = [
  { email: "demo-athlete@cutathletiq.test", password: "DemoAthlete!2026", home: /\/athlete(\/|$)/ },
  { email: "demo-coach@cutathletiq.test",   password: "DemoCoach!2026",   home: /\/coach(\/|$)/ },
  { email: "demo-physio@cutathletiq.test",  password: "DemoPhysio!2026",  home: /\/physio(\/|$)/ },
  { email: "demo-admin@cutathletiq.test",   password: "DemoAdmin!2026",   home: /\/admin(\/|$)/ },
];

const RUNS = Number(process.env.AUTH_TIMING_RUNS ?? 6);
const BUDGET_MS = 2000;
const ART_DIR = "test-results/auth-timing";

test.use({ viewport: { width: 1280, height: 800 } });

test(`sign-in stays under ${BUDGET_MS}ms across ${RUNS} random-account runs`, async ({ page, context }) => {
  mkdirSync(ART_DIR, { recursive: true });
  const timings: { i: number; email: string; ms: number }[] = [];

  for (let i = 0; i < RUNS; i++) {
    const acct = ACCOUNTS[Math.floor(Math.random() * ACCOUNTS.length)];
    await context.clearCookies();
    await page.goto("/login");
    await page.fill('input[type="email"]', acct.email);
    await page.fill('input[type="password"]', acct.password);

    const t0 = Date.now();
    await Promise.all([
      page.waitForURL(acct.home, { timeout: BUDGET_MS + 500 }),
      page.click('button[type="submit"]'),
    ]);
    const ms = Date.now() - t0;
    timings.push({ i, email: acct.email, ms });

    await page.screenshot({ path: join(ART_DIR, `run-${i + 1}-${acct.email.split("@")[0]}.png`), fullPage: false });

    expect(ms, `Run ${i + 1} (${acct.email}) took ${ms}ms`).toBeLessThan(BUDGET_MS);
  }

  console.table(timings);
  const avg = timings.reduce((s, t) => s + t.ms, 0) / timings.length;
  console.log(`avg sign-in: ${avg.toFixed(0)}ms / budget ${BUDGET_MS}ms`);
});
