// E2E smoke: combined invite-banner error states using shared helpers.
// Covers: invalid (not-found), expired, already-used, garbage, empty.
// Replaces duplicated logic across e2e-invite-errors.mjs and
// e2e-invite-not-found.mjs by delegating to scripts/lib/invite-helpers.mjs.
//
// Usage:  node scripts/e2e-invite-smoke.mjs
import { makeClients, getDemoCoachAndTeam, mintInvite, cleanupInvite, lookupInvite, log } from "./lib/invite-helpers.mjs";

const { admin, anon } = makeClients();
const { coach, team } = await getDemoCoachAndTeam(admin);

// 1. Random UUID never inserted → 0 rows → "Invite link not found."
{
  const { row } = await lookupInvite(anon, crypto.randomUUID());
  if (row) log.fail("invalid uuid unexpectedly matched");
  log.ok("invalid uuid → banner: 'Invite link not found.'");
}

// 2. Garbage non-uuid token
{
  const { row } = await lookupInvite(anon, "totally-not-a-real-token");
  if (row) log.fail("garbage token unexpectedly matched");
  log.ok("garbage token → banner: 'Invite link not found.'");
}

// 3. Empty string
{
  const { row } = await lookupInvite(anon, "");
  if (row) log.fail("empty token unexpectedly matched");
  log.ok("empty token → banner: 'Invite link not found.'");
}

// 4. Expired token
{
  const token = await mintInvite(admin, { team, coach, expiresInMs: -86400_000 });
  const { row } = await lookupInvite(anon, token);
  if (!row?.expired) log.fail("expired flag missing");
  log.ok(`expired token → banner: 'This invite has expired.' (team ${row.team_name})`);
  await cleanupInvite(admin, token);
}

// 5. Already-used token
{
  const token = await mintInvite(admin, { team, coach, used: true });
  const { row } = await lookupInvite(anon, token);
  if (!row?.used) log.fail("used flag missing");
  log.ok(`used token → banner: 'This invite has already been used.' (team ${row.team_name})`);
  await cleanupInvite(admin, token);
}

log.done("Invite smoke E2E PASSED — all banner error states covered");
