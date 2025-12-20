-- Vision Board Daily Game tables
create table if not exists public.vision_board_daily_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_date date not null default (timezone('utc', now()))::date,
  status text not null default 'in_progress' check (status in ('in_progress','completed')),
  total_points integer,
  balance_score numeric,
  insight_area text,
  insight_text text,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint vision_board_daily_sessions_user_date_key unique (user_id, session_date)
);

create index if not exists idx_vision_board_daily_sessions_user_date
  on public.vision_board_daily_sessions (user_id, session_date desc);

create table if not exists public.vision_board_daily_items (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.vision_board_daily_sessions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  title text,
  description text,
  suggested_area text,
  final_area text,
  order_index integer,
  status text not null default 'hidden' check (status in ('hidden','revealed','completed')),
  image_storage_path text,
  legacy_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_vision_board_daily_items_session
  on public.vision_board_daily_items (session_id, order_index nulls last);

create index if not exists idx_vision_board_daily_items_user
  on public.vision_board_daily_items (user_id);

alter table public.vision_board_daily_sessions enable row level security;
alter table public.vision_board_daily_items enable row level security;

create policy vision_board_daily_sessions_select on public.vision_board_daily_sessions
  for select using (auth.uid() = user_id);

create policy vision_board_daily_sessions_insert on public.vision_board_daily_sessions
  for insert with check (auth.uid() = user_id);

create policy vision_board_daily_sessions_update on public.vision_board_daily_sessions
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy vision_board_daily_sessions_delete on public.vision_board_daily_sessions
  for delete using (auth.uid() = user_id);

create policy vision_board_daily_items_select on public.vision_board_daily_items
  for select using (auth.uid() = user_id);

create policy vision_board_daily_items_insert on public.vision_board_daily_items
  for insert with check (auth.uid() = user_id);

create policy vision_board_daily_items_update on public.vision_board_daily_items
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy vision_board_daily_items_delete on public.vision_board_daily_items
  for delete using (auth.uid() = user_id);
