-- Allow repeated life wheel check-ins on the same day to update existing entries
-- instead of failing the unique constraint.

drop rule if exists checkins_upsert on public.checkins;

create rule checkins_upsert as
on insert to public.checkins
where exists (
  select 1
  from public.checkins c
  where c.user_id = new.user_id
    and c.date = new.date
)
do instead
  update public.checkins
  set scores = new.scores
  where user_id = new.user_id
    and date = new.date
  returning *;
