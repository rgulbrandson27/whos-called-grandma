-- Invited members pick their own color when they accept (src/app/join/[memberId].tsx
-- → acceptInvite), so a pending invite has no color until then.
alter table public.circle_members alter column color drop not null;
