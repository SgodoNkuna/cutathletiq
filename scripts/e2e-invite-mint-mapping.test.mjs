// Unit-style test for InviteLinkCard's mapInviteMintError() — verifies that
// every shape of RLS / permission failure collapses to the same friendly
// inline alert message, while non-permission errors fall through to their
// own copy. Pure JS, no DB or browser required.
//
// Usage:  node scripts/e2e-invite-mint-mapping.test.mjs
import { mapInviteMintError } from "../src/components/InviteLinkCard.tsx";

const fail = (m) => { console.error("✗", m); process.exit(1); };
const ok = (m) => console.log("✓", m);
const eq = (a, b, label) => a === b ? ok(label) : fail(`${label}: expected\n  ${b}\n  got\n  ${a}`);

const PERM = "You don't have permission to mint invites for this team.";

// 42501 — the canonical Postgres "insufficient privilege" / RLS code.
eq(
  mapInviteMintError({ code: "42501", message: 'new row violates row-level security policy for table "team_invites"' }),
  PERM,
  "code 42501 → friendly permission message",
);

// PostgREST sometimes returns a different code but a clear RLS message.
eq(
  mapInviteMintError({ code: "PGRST301", message: "new row violates row-level security policy" }),
  PERM,
  "RLS message without 42501 → friendly permission message",
);

// "permission denied for table team_invites" (Postgres GRANT-level)
eq(
  mapInviteMintError({ code: "42501", message: "permission denied for table team_invites" }),
  PERM,
  "permission denied → friendly permission message",
);

// "not authorized" / "forbidden" wording
eq(mapInviteMintError({ message: "not authorized" }), PERM, "not authorized → friendly");
eq(mapInviteMintError({ message: "Forbidden" }), PERM, "forbidden → friendly");

// Duplicate token (collision)
eq(
  mapInviteMintError({ code: "23505", message: "duplicate key value violates unique constraint" }),
  "An invite with that token already exists. Try again.",
  "duplicate-key → retry message",
);

// Network / fetch failure
eq(
  mapInviteMintError({ message: "TypeError: Failed to fetch" }),
  "Network error — check your connection and try again.",
  "fetch failure → network message",
);

// Null error (defensive)
eq(
  mapInviteMintError(null),
  "Could not create invite link. Please try again.",
  "null error → generic fallback",
);

// Unknown error preserves its own message (so we don't hide useful info)
const passthru = mapInviteMintError({ code: "XX000", message: "weird db hiccup" });
if (passthru !== "weird db hiccup") fail(`unknown-code passthru got: ${passthru}`);
ok("unknown error code → original message preserved");

console.log("\n✅ mapInviteMintError mapping PASSED");
