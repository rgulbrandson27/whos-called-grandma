| table_name     | column_name        | data_type                | is_nullable | column_default     |
| -------------- | ------------------- | ------------------------ | ----------- | ------------------ |
| circles        | id                  | uuid                     | NO          | gen_random_uuid()  |
| circles        | loved_one_name      | text                     | NO          | null                |
| circles        | loved_one_phone     | text                     | YES         | null                |
| circles        | plan                | text                     | NO          | 'free'::text        |
| circles        | subscriber_user_id  | uuid                     | YES         | null                |
| circles        | created_at          | timestamp with time zone | NO          | now()               |
| circle_members | id                  | uuid                     | NO          | gen_random_uuid()  |
| circle_members | circle_id           | uuid                     | NO          | null                |
| circle_members | user_id             | uuid                     | YES         | null                |
| circle_members | phone               | text                     | YES         | null                |
| circle_members | email               | text                     | YES         | null                |
| circle_members | display_name        | text                     | NO          | null                |
| circle_members | color               | text                     | NO          | null                |
| circle_members | shape               | text                     | NO          | null                |
| circle_members | role                | text                     | NO          | 'member'::text      |
| circle_members | invite_status       | text                     | NO          | 'pending'::text     |
| circle_members | invited_at          | timestamp with time zone | NO          | now()               |
| circle_members | accepted_at         | timestamp with time zone | YES         | null                |
| circle_members | created_at          | timestamp with time zone | NO          | now()               |
| events         | id                  | uuid                     | NO          | gen_random_uuid()  |
| events         | circle_id           | uuid                     | NO          | null                |
| events         | circle_member_id    | uuid                     | NO          | null                |
| events         | event_date          | date                     | NO          | null                |
| events         | status              | text                     | NO          | null                |
| events         | kind                | text                     | YES         | null                |
| events         | note_preset         | text                     | YES         | null                |
| events         | note_custom         | text                     | YES         | null                |
| events         | created_at          | timestamp with time zone | NO          | now()               |
