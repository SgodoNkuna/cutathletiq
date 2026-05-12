// E2E: token-not-found cases. Wraps shared helper. See e2e-invite-smoke.mjs
// for the consolidated suite.
//
// Usage:  node scripts/e2e-invite-not-found.mjs
import { makeClients, lookupInvite, log } from "./lib/invite-helpers.mjs";

const { anon } = makeClients({ requireService: false });

for (const [label, token] of [
  ["random uuid", crypto.randomUUID()],
  ["garbage string", "definitely-not-a-real-token-xyz"],
  ["empty string", ""],
]) {
  const { row } = await lookupInvite(anon, token);
  if (row) log.fail(`${label} unexpectedly matched a row`);
  log.ok(`${label} → banner: "Invite link not found."`);
}

log.done("Invite-not-found E2E PASSED");
