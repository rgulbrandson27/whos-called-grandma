| table_name     | column_name              | data_type                | is_nullable | column_default     |
| -------------- | ------------------------- | ------------------------ | ----------- | ------------------ |
| circles        | id                         | uuid                     | NO          | gen_random_uuid()  |
| circles        | loved_one_name             | text                     | NO          | null                |
| circles        | loved_one_phone            | text                     | YES         | null                |
| circles        | loved_one_birthday_month   | smallint                 | YES         | null                |
| circles        | loved_one_birthday_day     | smallint                 | YES         | null                |
| circles        | plan                       | text                     | NO          | 'free'::text        |
| circles        | subscriber_user_id         | uuid                     | YES         | null                |
| circles        | created_at                 | timestamp with time zone | NO          | now()               |
| circles        | last_alert_sent_at         | timestamp with time zone | YES         | null                |
| circle_members | id                         | uuid                     | NO          | gen_random_uuid()  |
| circle_members | circle_id                  | uuid                     | NO          | null                |
| circle_members | user_id                    | uuid                     | YES         | null                |
| circle_members | phone                      | text                     | YES         | null                |
| circle_members | display_name               | text                     | NO          | null                |
| circle_members | color                      | text                     | NO          | null                |
| circle_members | shape                      | text                     | NO          | null                |
| circle_members | role                       | text                     | NO          | 'member'::text      |
| circle_members | invite_status              | text                     | NO          | 'pending'::text     |
| circle_members | invited_at                 | timestamp with time zone | NO          | now()               |
| circle_members | accepted_at                | timestamp with time zone | YES         | null                |
| circle_members | week_start_day             | text                     | YES         | 'sunday'::text      |
| circle_members | theme                      | text                     | YES         | 'light'::text       |
| circle_members | relationship               | text                     | YES         | null                |
| circle_members | push_token                 | text                     | YES         | null                |
| circle_members | created_at                 | timestamp with time zone | NO          | now()               |
| events         | id                         | uuid                     | NO          | gen_random_uuid()  |
| events         | circle_id                  | uuid                     | NO          | null                |
| events         | circle_member_id           | uuid                     | NO          | null                |
| events         | event_date                 | date                     | NO          | null                |
| events         | status                     | text                     | NO          | null                |
| events         | kind                       | text                     | YES         | null                |
| events         | note_preset                | text                     | YES         | null                |
| events         | note_custom                | text                     | YES         | null                |
| events         | created_at                 | timestamp with time zone | NO          | now()               |

Constraints worth knowing when writing to these tables:

- `circle_members.role` — `CHECK (role IN ('owner', 'member'))`
- `circle_members.invite_status` — `CHECK (invite_status IN ('pending', 'accepted', 'declined'))`
- `circle_members.week_start_day` — `CHECK (week_start_day IN ('sunday', 'monday'))`
- `circle_members.theme` — `CHECK (theme IN ('light', 'dark', 'system'))`
- `circle_members.relationship` — free text (e.g. "Daughter", "Neighbor") — set by the subscriber themselves for their own row, or by the invitee during their join flow (src/app/join/[memberId].tsx)
- `circle_members.push_token` — an Expo push token, set by src/utils/push-notifications.ts right after onboarding completes on that device
- `circles.last_alert_sent_at` — set by the check-ins-alert Edge Function; used to send at most one "hasn't checked in" alert per silence period, not one per day
- `circle_members` requires at least one of `user_id`, `phone` to be non-null (`circle_members_contact_required`)
- `circles.loved_one_birthday_month` — `CHECK (1-12)`, `circles.loved_one_birthday_day` — `CHECK (1-31)`
- `circle_members.circle_id`, `events.circle_id`, `events.circle_member_id` all `ON DELETE CASCADE`
- `circles.subscriber_user_id`, `circle_members.user_id` both `ON DELETE SET NULL` referencing `auth.users(id)`

## Gotchas discovered the hard way (2026-09-28)

- **This project has both the new "publishable"/"secret" API keys and the
  legacy "anon"/"service_role" JWT-based keys active side by side.** The new
  `sb_publishable_...` key was rejected outright ("Invalid API key") by both
  PostgREST and the Edge Functions gateway on this project, for reasons never
  fully root-caused. The app now uses the **legacy `anon` JWT key**
  (`EXPO_PUBLIC_SUPABASE_ANON_KEY` in `.env`) — don't swap it back to a
  `sb_publishable_...` key without re-testing an actual live network call
  first (not just `tsc`), since that failure mode is silent to type-checking.
- **RLS policies alone don't grant table access.** Postgres checks table-level
  `GRANT`s before it ever evaluates RLS policies — a role with zero grants
  gets `permission denied`, not just an empty result, even if RLS policies
  would've allowed it. All three tables needed explicit
  `grant select, insert, update, delete on <table> to anon, authenticated;`
  (and `grant all on <table> to service_role;` for Edge Functions) in
  addition to the RLS policies already in place.
- **Edge Functions on this project need `SUPABASE_SECRET_KEYS`**, not the
  legacy `SUPABASE_SERVICE_ROLE_KEY` env var — it's auto-injected as a JSON
  dictionary (`JSON.parse(...).default`), not a plain string. See
  `supabase/functions/check-ins-alert/index.ts` for the working pattern.
