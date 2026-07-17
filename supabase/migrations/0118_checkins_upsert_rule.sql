-- Repeated life wheel check-ins are handled explicitly by the application:
-- existing rows are updated and new dates are inserted. PostgreSQL does not
-- support RETURNING from the conditional rewrite rule that used to be here.
-- Keep this migration to remove that rule from projects where it was created
-- manually and to document the database-level uniqueness guarantee.

drop rule if exists checkins_upsert on public.checkins;

create unique index if not exists checkins_user_date_unique_idx
  on public.checkins(user_id, date);
