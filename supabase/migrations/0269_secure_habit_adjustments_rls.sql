-- Secure public.habit_adjustments.
--
-- Ownership chain:
-- habit_adjustments.habit_id
--   -> habits_v2.id
--   -> habits_v2.user_id
--
-- A signed-in user may access an adjustment only when the referenced
-- habit belongs to auth.uid().

alter table public.habit_adjustments
  enable row level security;

-- Anonymous clients should have no direct access to this table.
revoke all privileges
  on table public.habit_adjustments
  from anon;

-- RLS governs ordinary row operations, but TRUNCATE bypasses RLS.
-- REFERENCES and TRIGGER are also unnecessary for normal app clients.
revoke truncate, references, trigger
  on table public.habit_adjustments
  from authenticated;

-- Retain only the row operations required by authenticated app clients.
grant select, insert, update, delete
  on table public.habit_adjustments
  to authenticated;

drop policy if exists "Users can read own habit adjustments"
  on public.habit_adjustments;

create policy "Users can read own habit adjustments"
  on public.habit_adjustments
  for select
  to authenticated
  using (
    exists (
      select 1
      from public.habits_v2 as habit
      where habit.id = habit_adjustments.habit_id
        and habit.user_id = auth.uid()
    )
  );

drop policy if exists "Users can create own habit adjustments"
  on public.habit_adjustments;

create policy "Users can create own habit adjustments"
  on public.habit_adjustments
  for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.habits_v2 as habit
      where habit.id = habit_adjustments.habit_id
        and habit.user_id = auth.uid()
    )
  );

drop policy if exists "Users can update own habit adjustments"
  on public.habit_adjustments;

create policy "Users can update own habit adjustments"
  on public.habit_adjustments
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.habits_v2 as habit
      where habit.id = habit_adjustments.habit_id
        and habit.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.habits_v2 as habit
      where habit.id = habit_adjustments.habit_id
        and habit.user_id = auth.uid()
    )
  );

drop policy if exists "Users can delete own habit adjustments"
  on public.habit_adjustments;

create policy "Users can delete own habit adjustments"
  on public.habit_adjustments
  for delete
  to authenticated
  using (
    exists (
      select 1
      from public.habits_v2 as habit
      where habit.id = habit_adjustments.habit_id
        and habit.user_id = auth.uid()
    )
  );
