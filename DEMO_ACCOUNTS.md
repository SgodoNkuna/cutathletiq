# Demo Accounts & Invite Codes

## Sign in at `/login`

| Role    | Email                              | Password           |
| ------- | ---------------------------------- | ------------------ |
| Admin   | `demo-admin@cutathletiq.test`      | `DemoAdmin!2026`   |
| Coach   | `demo-coach@cutathletiq.test`      | `DemoCoach!2026`   |
| Physio  | `demo-physio@cutathletiq.test`     | `DemoPhysio!2026`  |
| Athlete | `demo-athlete@cutathletiq.test`    | `DemoAthlete!2026` |

The demo coach owns **CUT Demo Squad** and the demo athlete is already on it.

## Active staff invite codes (for `/signup`)

| Role    | Code         |
| ------- | ------------ |
| Admin   | `ADMIN2026`  |
| Coach   | `COACH2026`  |
| Physio  | `PHYSIO2026` |

Codes can be rotated any time at **/admin/invites** while signed in as admin.
The `ADMIN_INVITE_CODE` env secret is also accepted as a fallback for admin signup.

## Team invite links

Sign in as the demo coach → dashboard → **Single-use invite link** card →
**Create**, then copy the `/signup?invite=…` URL. It works once and expires
after 7 days.
