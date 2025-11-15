-- ========================================================
-- HABITS MODULE - CORE SCHEMA
-- Migration 0001: Habits, Logs, Reminders, Profiles, Streaks
-- ========================================================

-- PROFILES TABLE (for user timezone and display name)
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz default now(),
  display_name text,
  tz text default 'UTC'
);

-- HABIT TYPE ENUM
do $$ begin
  create type habit_type as enum ('boolean','quantity','duration');
exception
  when duplicate_object then null;
end $$;

-- HABITS TABLE (enhanced version with new fields)
-- Note: We'll check if columns exist before adding to avoid conflicts with existing habits table
do $$
begin
  -- Check if we need to extend the existing habits table or create a new one
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habits_v2') then
    create table public.habits_v2 (
      id uuid primary key default gen_random_uuid(),
      user_id uuid not null references auth.users(id) on delete cascade,
      title text not null,
      emoji text,
      type habit_type not null default 'boolean',
      target_num numeric,
      target_unit text,
      schedule jsonb not null,
      allow_skip boolean default true,
      start_date date default current_date,
      archived boolean default false,
      created_at timestamptz default now(),
      autoprog jsonb -- For auto-progression config
    );
  end if;
end $$;

-- HABIT REMINDERS TABLE
create table if not exists public.habit_reminders (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null,
  local_time time not null,
  days int[] default null,
  geo jsonb,
  created_at timestamptz default now()
);

-- Add foreign key constraint with proper check
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habits_v2') then
    if not exists (
      select 1 from information_schema.table_constraints 
      where constraint_name = 'habit_reminders_habit_id_fkey_v2' 
      and table_name = 'habit_reminders'
    ) then
      alter table public.habit_reminders add constraint habit_reminders_habit_id_fkey_v2 
        foreign key (habit_id) references public.habits_v2(id) on delete cascade;
    end if;
  end if;
end $$;

-- HABIT LOGS TABLE (enhanced version)
do $$
begin
  if not exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habit_logs_v2') then
    create table public.habit_logs_v2 (
      id uuid primary key default gen_random_uuid(),
      habit_id uuid not null references public.habits_v2(id) on delete cascade,
      user_id uuid not null references auth.users(id) on delete cascade,
      ts timestamptz not null default now(),
      date date not null,
      value numeric,
      done boolean not null default true,
      note text,
      mood int check (mood between 1 and 5)
    );

    create index idx_habit_logs_v2_habit_date on public.habit_logs_v2(habit_id, date);
    create index idx_habit_logs_v2_user_date on public.habit_logs_v2(user_id, date);
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name = 'habit_logs_v2'
      and column_name = 'date'
  ) then
    begin
      execute $$alter table public.habit_logs_v2 alter column date drop expression$$;
    exception
      when others then null;
    end;

    alter table public.habit_logs_v2
      alter column date set default ((timezone('UTC', now()))::date);
  end if;
end $$;

create or replace function public.set_habit_logs_v2_date()
returns trigger language plpgsql as $$
begin
  if new.ts is null then
    new.ts := now();
  end if;
  new.date := (timezone('UTC', new.ts)::date);
  return new;
end;
$$;

drop trigger if exists habit_logs_v2_set_date on public.habit_logs_v2;
create trigger habit_logs_v2_set_date
before insert or update on public.habit_logs_v2
for each row execute function public.set_habit_logs_v2_date();

-- STREAKS VIEW
create or replace view public.v_habit_streaks as
with daily as (
  select h.id habit_id, l.date, bool_or(l.done) as done
  from habits_v2 h
  left join habit_logs_v2 l on l.habit_id = h.id
  group by h.id, l.date
), gaps as (
  select habit_id, date, date - (row_number() over (partition by habit_id order by date))::int grp
  from daily where done is true
)
select habit_id,
       coalesce( (select count(*) from gaps g2
                  where g2.habit_id=g.habit_id
                    and g2.grp=(select max(grp) from gaps g3 where g3.habit_id=g.habit_id)), 0)::int as current_streak,
       coalesce( (select max(cnt) from (
                   select count(*) cnt from gaps g4 where g4.habit_id=g.habit_id group by grp
                 ) s), 0)::int as best_streak
from gaps g
group by habit_id;

-- RLS POLICIES
alter table public.habits_v2 enable row level security;
alter table public.habit_logs_v2 enable row level security;
alter table public.habit_reminders enable row level security;
alter table public.profiles enable row level security;

-- Profiles policies
drop policy if exists "own profiles" on public.profiles;
create policy "own profiles" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Habits policies
drop policy if exists "own habits v2" on public.habits_v2;
create policy "own habits v2" on public.habits_v2
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Logs policies
drop policy if exists "own logs v2" on public.habit_logs_v2;
create policy "own logs v2" on public.habit_logs_v2
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Reminders policies
drop policy if exists "own reminders v2" on public.habit_reminders;
create policy "own reminders v2" on public.habit_reminders
  for all using (
    exists (select 1 from habits_v2 where id = habit_id and user_id = auth.uid())
  )
  with check (
    exists (select 1 from habits_v2 where id = habit_id and user_id = auth.uid())
  );
