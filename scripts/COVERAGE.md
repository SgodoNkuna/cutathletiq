# Smoke Test Coverage Report

This document maps every assertion in `scripts/smoke-test.mjs`,
`scripts/responsive-test.mjs`, and `scripts/responsive.spec.ts` (Playwright)
to the user-facing feature it validates. Update whenever new checks are added.

> Run: `node scripts/smoke-test.mjs && node scripts/responsive-test.mjs`
> Browser: `bunx playwright test scripts/responsive.spec.ts`

---

## 1. Public route shells (`scripts/smoke-test.mjs`)

| Assertion | Validates |
| --- | --- |
| `GET /` returns 200 + HTML | Landing page renders SSR shell |
| `GET /login` returns 200 | Login form is reachable for unauthenticated users |
| `GET /signup` returns 200 | Public signup page is reachable |
| `GET /privacy` returns 200 | POPIA notice is publicly accessible |
| `GET /security` returns 200 | Security rationale page is publicly viewable |
| `GET /system-status` returns 200 | Diagnostic page boots without auth |
| `GET /help` returns 200 | Help / FAQ page is publicly reachable |

## 2. Auth & session

| Assertion | Validates |
| --- | --- |
| Athlete signup → profile row auto-created | `handle_new_user()` trigger + RLS |
| Athlete login with correct password | Email/password auth |
| Athlete login with wrong password rejected | Bad-credentials path |
| Coach signup with correct invite code | Invite-code gate (DB) |
| Coach signup with wrong code rejected | Server-side rate-limit + validation |
| Physio signup with correct invite code | Invite-code gate (DB) |
| Physio signup with wrong code rejected | Server-side validation |
| Admin signup with correct invite code | Admin invite gate (DB or env fallback) |
| Admin signup with wrong code rejected | Admin gate strictness |
| Session persists across new-client init | "Refresh survives" — `persistSession: true` |
| Sign-out clears session | Session expiry on logout |

## 3. Onboarding & protected routes

For each role (athlete, coach, physio):

| Assertion | Validates |
| --- | --- |
| `profile.onboarding_complete` flips to true after `/onboarding` | Onboarding flow completion |
| `GET /athlete` (athlete) returns 200 | Athlete dashboard reachable |
| `GET /athlete/workout` returns 200 | Workout logging UI |
| `GET /athlete/wellness` returns 200 | Wellness check-in UI |
| `GET /athlete/injury` returns 200 | Body-map injury reporting |
| `GET /athlete/progress` returns 200 | PR + progress charts |
| `GET /coach` returns 200 (coach) | Coach squad dashboard |
| `GET /coach/program` returns 200 | Programme builder |
| `GET /coach/games` returns 200 | Games + minutes log |
| `GET /coach/wellness` returns 200 | Team wellness pulse |
| `GET /physio` returns 200 (physio) | Physio cases inbox |
| `GET /physio/log` returns 200 | Injury log entry |
| `GET /calendar` returns 200 | Cross-role calendar |
| `GET /feed` returns 200 | Team feed |
| `GET /leaderboard` returns 200 | Leaderboard |
| `GET /help` returns 200 (authed) | Help page accessible to all roles |

## 4. Invite-code gate (RPC + HTTP)

| Assertion | Validates |
| --- | --- |
| `validate_invite_code('coach', 'WRONG')` → false | RPC rejects bad codes |
| `validate_invite_code('coach', <correct>)` → true | RPC accepts good codes |
| `validate_invite_code('physio', …)` (both cases) | Physio gate |
| HTTP `POST /signup` w/ wrong admin code → "Invalid" | Admin signup gate |

## 5. Responsive layout — jsdom (`scripts/responsive-test.mjs`)

Simulates the `useIsDesktop` hook contract.

| Width | Expected `isDesktop` | Validates |
| --- | --- | --- |
| 320 | false | Tiny phone — phone shell |
| 375 | false | iPhone SE |
| 414 | false | iPhone Pro Max |
| 767 | false | Just below `md` |
| 768 | true | `md` boundary — desktop sidebar appears |
| 1024 | true | iPad landscape |
| 1280 | true | Standard laptop |
| 1920 | true | Wide desktop |
| Resize 600 → 1000 | `isDesktop` flips false → true | Live resize listener fires |
| Resize 1200 → 500 | `isDesktop` flips true → false | Live shrink listener fires |

## 6. Responsive layout — real browser (`scripts/responsive.spec.ts`)

| Step | Validates |
| --- | --- |
| Set viewport 500×900, navigate to `/` | Phone shell visible (rounded card with `border-navy-deep`) |
| Resize to 1200×900 (no reload) | Desktop sidebar appears (`<aside>` with role nav) within 1s |
| Resize back to 500×900 | Phone shell returns; sidebar removed |

## 7. Startup config gate

| Assertion | Validates |
| --- | --- |
| `GET /system-status` reports each `REQUIRED_ENV` key | Server-side env audit |
| `GET /system-status` reports admin/coach/physio code rows | DB-side invite audit |
| `scripts/missing-config-test.mjs` (mock) → page shows "Missing" badge | Failure UI matches contract |

---

**Last updated:** 2026-05-04 (admin code moved to DB; help section added)
