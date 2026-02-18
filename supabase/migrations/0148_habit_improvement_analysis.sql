-- Habit Improvement Analysis foundational schema
-- Supports step-by-step habit diagnosis and 7-day experiment loops.

create table if not exists public.habit_analysis_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits_v2(id) on delete cascade,
  status text not null default 'draft' check (status in ('draft', 'active', 'completed', 'archived')),
  goal_type text not null default 'stabilize' check (goal_type in ('reduce', 'increase', 'replace', 'stabilize')),
  target_cadence text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habit_analysis_sessions_user_id_idx on public.habit_analysis_sessions(user_id);
create index if not exists habit_analysis_sessions_habit_id_idx on public.habit_analysis_sessions(habit_id);
create index if not exists habit_analysis_sessions_status_idx on public.habit_analysis_sessions(status);

create table if not exists public.habit_desires (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.habit_analysis_sessions(id) on delete cascade,
  desire_key text not null,
  is_primary boolean not null default false,
  custom_label text,
  created_at timestamptz not null default now()
);

create unique index if not exists habit_desires_session_primary_idx
  on public.habit_desires(session_id)
  where is_primary = true;
create index if not exists habit_desires_session_id_idx on public.habit_desires(session_id);

create table if not exists public.habit_costs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.habit_analysis_sessions(id) on delete cascade,
  under_pain_tags jsonb not null default '[]'::jsonb,
  over_pain_tags jsonb not null default '[]'::jsonb,
  subscription_fee_tags jsonb not null default '[]'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_right_size_ranges (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.habit_analysis_sessions(id) on delete cascade,
  unit text not null default 'times/week',
  min_value numeric,
  max_value numeric,
  too_little_feels_like text,
  too_much_costs_like text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_loop_maps (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.habit_analysis_sessions(id) on delete cascade,
  trigger text,
  action text,
  immediate_reward text,
  delayed_cost text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_diagnoses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.habit_analysis_sessions(id) on delete cascade,
  diagnosis text not null check (diagnosis in ('under', 'over', 'swing')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_protocols (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.habit_analysis_sessions(id) on delete cascade,
  if_trigger text,
  then_action text,
  duration_minutes int,
  guardrail text,
  friction text,
  ease text,
  replacement_reward text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habit_protocols_session_id_idx on public.habit_protocols(session_id);

create table if not exists public.habit_readiness_scores (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.habit_analysis_sessions(id) on delete cascade,
  desire_met int not null check (desire_met between 1 and 5),
  cost_reduced int not null check (cost_reduced between 1 and 5),
  bad_day_ok int not null check (bad_day_ok between 1 and 5),
  rebound_safe int not null check (rebound_safe between 1 and 5),
  identity_fit int not null check (identity_fit between 1 and 5),
  traffic_light text not null check (traffic_light in ('green', 'yellow', 'red')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.habit_experiment_days (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.habit_analysis_sessions(id) on delete cascade,
  day_index int not null check (day_index between 1 and 7),
  date date not null,
  followed_protocol boolean,
  under_pain int check (under_pain between 0 and 3),
  over_pain int check (over_pain between 0 and 3),
  net_effect text check (net_effect in ('better', 'same', 'worse')),
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(session_id, day_index),
  unique(session_id, date)
);

create index if not exists habit_experiment_days_session_id_idx on public.habit_experiment_days(session_id);

create or replace function public.touch_habit_analysis_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_touch_habit_analysis_sessions on public.habit_analysis_sessions;
create trigger trg_touch_habit_analysis_sessions
before update on public.habit_analysis_sessions
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_costs on public.habit_costs;
create trigger trg_touch_habit_costs
before update on public.habit_costs
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_right_size_ranges on public.habit_right_size_ranges;
create trigger trg_touch_habit_right_size_ranges
before update on public.habit_right_size_ranges
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_loop_maps on public.habit_loop_maps;
create trigger trg_touch_habit_loop_maps
before update on public.habit_loop_maps
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_diagnoses on public.habit_diagnoses;
create trigger trg_touch_habit_diagnoses
before update on public.habit_diagnoses
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_protocols on public.habit_protocols;
create trigger trg_touch_habit_protocols
before update on public.habit_protocols
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_readiness_scores on public.habit_readiness_scores;
create trigger trg_touch_habit_readiness_scores
before update on public.habit_readiness_scores
for each row execute function public.touch_habit_analysis_updated_at();

drop trigger if exists trg_touch_habit_experiment_days on public.habit_experiment_days;
create trigger trg_touch_habit_experiment_days
before update on public.habit_experiment_days
for each row execute function public.touch_habit_analysis_updated_at();

alter table public.habit_analysis_sessions enable row level security;
alter table public.habit_desires enable row level security;
alter table public.habit_costs enable row level security;
alter table public.habit_right_size_ranges enable row level security;
alter table public.habit_loop_maps enable row level security;
alter table public.habit_diagnoses enable row level security;
alter table public.habit_protocols enable row level security;
alter table public.habit_readiness_scores enable row level security;
alter table public.habit_experiment_days enable row level security;

-- User-scoped policies
create policy "habit analysis sessions owned by user"
on public.habit_analysis_sessions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

create policy "habit analysis child tables scoped through session owner"
on public.habit_desires
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit costs scoped through session owner"
on public.habit_costs
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit right size ranges scoped through session owner"
on public.habit_right_size_ranges
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit loop maps scoped through session owner"
on public.habit_loop_maps
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit diagnoses scoped through session owner"
on public.habit_diagnoses
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit protocols scoped through session owner"
on public.habit_protocols
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit readiness scores scoped through session owner"
on public.habit_readiness_scores
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);

create policy "habit experiment days scoped through session owner"
on public.habit_experiment_days
for all
using (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
)
with check (
  exists (
    select 1
    from public.habit_analysis_sessions s
    where s.id = session_id
      and s.user_id = auth.uid()
  )
);
