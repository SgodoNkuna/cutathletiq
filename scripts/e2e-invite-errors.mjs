// E2E: invite banner error states (invalid / expired / used).
// Thin wrapper over scripts/lib/invite-helpers.mjs — see e2e-invite-smoke.mjs
// for the full combined coverage.
//
// Usage:  node scripts/e2e-invite-errors.mjs
import { makeClients, getDemoCoachAndTeam, mintInvite, cleanupInvite, lookupInvite, log } from "./lib/invite-helpers.mjs";

const { admin, anon } = makeClients();
const { coach, team } = await getDemoCoachAndTeam(admin);

{
  const { row } = await lookupInvite(anon, crypto.randomUUID());
  if (row) log.fail("invalid token returned a row");
  log.ok("invalid token → 'Invite link not found.'");
}
{
  const token = await mintInvite(admin, { team, coach, expiresInMs: -86400_000 });
  const { row } = await lookupInvite(anon, token);
  if (!row?.expired) log.fail("expired flag missing");
  log.ok(`expired token → 'This invite has expired.' (team ${row.team_name})`);
  await cleanupInvite(admin, token);
}
{
  const token = await mintInvite(admin, { team, coach, used: true });
  const { row } = await lookupInvite(anon, token);
  if (!row?.used) log.fail("used flag missing");
  log.ok(`used token → 'This invite has already been used.' (team ${row.team_name})`);
  await cleanupInvite(admin, token);
}

log.done("Invite error-state E2E PASSED");
