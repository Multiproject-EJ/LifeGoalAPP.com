-- Row level security policies for LifeGoal Supabase project
-- Execute after 001_schema.sql

alter table public.goals enable row level security;
alter table public.goal_reflections enable row level security;
alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;
alter table public.vision_images enable row level security;
alter table public.checkins enable row level security;
alter table public.notification_preferences enable row level security;

drop policy if exists "Users manage own goals" on public.goals;
create policy "Users manage own goals" on public.goals
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own goal reflections" on public.goal_reflections;
create policy "Users manage own goal reflections" on public.goal_reflections
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own habits" on public.habits;
create policy "Users manage own habits" on public.habits
  for all using (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.goals g
      where g.id = goal_id and g.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage own habit logs" on public.habit_logs;
create policy "Users manage own habit logs" on public.habit_logs
  for all using (
    exists (
      select 1 from public.habits h
      join public.goals g on g.id = h.goal_id
      where h.id = habit_id and g.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.habits h
      join public.goals g on g.id = h.goal_id
      where h.id = habit_id and g.user_id = auth.uid()
    )
  );

drop policy if exists "Users manage own vision images" on public.vision_images;
create policy "Users manage own vision images" on public.vision_images
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own checkins" on public.checkins;
create policy "Users manage own checkins" on public.checkins
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Users manage own notification preferences" on public.notification_preferences;
create policy "Users manage own notification preferences" on public.notification_preferences
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
