# Demo Accounts & Invite Codes

These ready-to-use accounts were seeded directly via the admin API so you can sign in
without needing the invite-code signup flow.

## Sign in at `/login`

| Role    | Email                              | Password           |
| ------- | ---------------------------------- | ------------------ |
| Admin   | `demo-admin@cutathletiq.test`      | `DemoAdmin!2026`   |
| Coach   | `demo-coach@cutathletiq.test`      | `DemoCoach!2026`   |
| Physio  | `demo-physio@cutathletiq.test`     | `DemoPhysio!2026`  |
| Athlete | `demo-athlete@cutathletiq.test`    | `DemoAthlete!2026` |

## Current invite codes (for `/signup`)

These are the active codes stored in the `invite_codes` table. Enter them **exactly**
(uppercase, no spaces) in the "invite code" field on the signup form.

| Role    | Code       |
| ------- | ---------- |
| Admin   | `SFMFBRQN` |
| Coach   | `UQVK8UEE` |
| Physio  | `6B5LDJ5X` |

> Codes can be rotated any time at **/admin/invites** while signed in as an admin.
> After rotation, update this file (or just use the demo accounts above).

## If invite-code signup fails

Common causes:
1. **Trailing space / lowercase** — the form auto-uppercases, but pasting from
   chat sometimes adds a space. Re-type by hand.
2. **Code was rotated** — check `/admin/invites` for the current value.
3. **Wrong role selected** — codes are role-specific. The Coach code only works
   when "Coach" is selected on the signup form.
