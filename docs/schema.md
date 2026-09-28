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
- `circle_members` requires at least one of `user_id`, `phone` to be non-null (`circle_members_contact_required`)
- `circles.loved_one_birthday_month` — `CHECK (1-12)`, `circles.loved_one_birthday_day` — `CHECK (1-31)`
- `circle_members.circle_id`, `events.circle_id`, `events.circle_member_id` all `ON DELETE CASCADE`
- `circles.subscriber_user_id`, `circle_members.user_id` both `ON DELETE SET NULL` referencing `auth.users(id)`
