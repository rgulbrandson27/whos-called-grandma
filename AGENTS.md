# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# Who's Called Grandma? (WCG)

A family coordination app so an elderly loved one doesn't go days without
contact. Built for RevenueCat's Shipaton hackathon, targeting the
"Public Good" (combating elderly loneliness) and "OneSignal integration"
categories.

## Core concept

- Non-medical, non-health app by design — no symptom tracking, no medical
  data. Keeps privacy/compliance scope small and keeps the app focused on
  "did someone check in," not caregiving/health management.
- No free plan. Two paid tiers, each monthly or annual:
  - Basic: $2.99/mo or $20.99/yr (40% off). Up to 6 people per circle,
    shared calendar, 1 month of history. (The Monday week-start choice is
    available to everyone but isn't advertised as a feature.)
  - Premium: $5.99/mo or $35.99/yr (50% off). Everything in Basic plus up
    to 20 people, photos, longer custom notes, customizable notification
    settings, notification frequency.
  - `circles.plan` stores `basic_monthly`, `basic_annual`, `premium_monthly`
    or `premium_annual` (see `src/constants/plans.ts`).
- No login. The onboarding draft lives in local storage (zustand persist +
  AsyncStorage) until a plan is chosen on the paywall, which writes the
  circle to Supabase; `circleId` is kept locally to find it again.
- Core UI is a GitHub-contribution-graph-style scrollable calendar: small
  colored circular markers per family member on each day square.
  **No numbers on the calendar.**
- OneSignal integration must be deterministic/rule-based — **not AI-driven**.
  No "Intelligent Delivery," no AI orchestration. Predictable behavior only.

## Stack

- Expo + React Native + Expo Router (file-based routing)
- Supabase: Postgres + Auth + REST API (+ Row Level Security)
- RevenueCat for subscriptions/entitlements
- NativeWind (Tailwind for React Native) for styling
- Stack navigation, not tabs — the default Expo tab template
  (`app-tabs.*`, `animated-icon.*`, `explore.tsx`) was deleted; don't
  recreate it.

## File structure

## Database schema (Supabase)

### circles

| column_name              | data_type                | is_nullable |
| ------------------------ | ------------------------ | ----------- |
| id                       | uuid                     | NO          |
| loved_one_name           | text                     | NO          |
| loved_one_phone          | text                     | YES         |
| plan                     | text                     | NO          |
| subscriber_user_id       | uuid                     | YES         |
| created_at               | timestamp with time zone | NO          |
| loved_one_birthday_month | smallint                 | YES         |
| loved_one_birthday_day   | smallint                 | YES         |

### circle_members

| column_name   | data_type                | is_nullable |
| -------------- | ------------------------ | ----------- |
| id             | uuid                     | NO          |
| circle_id      | uuid                     | NO          |
| user_id        | uuid                     | YES         |
| phone          | text                     | YES         |
| email          | text                     | YES         |
| display_name   | text                     | NO          |
| color          | text                     | NO          |
| shape          | text                     | NO          |
| role           | text                     | NO          |
| invite_status  | text                     | NO          |
| invited_at     | timestamp with time zone | NO          |
| accepted_at    | timestamp with time zone | YES         |
| created_at     | timestamp with time zone | NO          |
| week_start_day | text                     | YES         |
| theme          | text                     | YES         |

- `week_start_day` holds `"sunday"` / `"monday"` — the same strings
  `OnboardingDraft.weekStart` uses, saved as-is with no translation. Set for
  the subscriber's own row by `createCircle()` (`src/data/circles.ts`).
  Invited members don't choose their own yet (no onboarding screen for it on
  their side), so their `week_start_day` is left unset.
- `theme` (dark vs. light) is not written by any onboarding code yet — no
  screen collects it.
- Invited people (from create-circle) are saved by `saveInviteMembers()` in
  `src/data/invites.ts`, called from the paywall right after the circle
  exists. It clears that circle's existing non-subscriber rows and reinserts
  the current list each time, since the client doesn't track each row's id.
- Phone numbers: typed/imported via `src/utils/phone.ts` (libphonenumber-js).
  Displayed in national format for the device's country, international
  otherwise. Save to Supabase with `toE164()` (`+15551234567`).
- Onboarding progress bar: steps are listed in `src/constants/onboarding-steps.ts`
  (edit the list to add/remove steps; `ONBOARDING_PROGRESS_ENABLED` turns it
  off). Rendered by `OnboardingProgressShell` in `src/app/(onboarding)/_layout.tsx`.
  `paywall.tsx` lives inside the `(onboarding)` group so it shows the bar too
  (the URL is still `/paywall`).
