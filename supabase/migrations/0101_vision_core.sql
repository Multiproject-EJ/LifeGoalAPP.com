-- Ensure tz on profiles
do $$ begin
  alter table public.profiles add column if not exists tz text default 'UTC';
exception when others then null; end $$;

do $$
begin
  begin
    create type vb_board_type as enum ('vision','focus');
  exception when duplicate_object then
    null;
  end;
end$$;

do $$
begin
  begin
    create type vb_card_size as enum ('S','M','L','XL');
  exception when duplicate_object then
    null;
  end;
end$$;

create table if not exists public.vb_boards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  board_type vb_board_type not null default 'vision',
  theme jsonb default '{}'::jsonb,
  cover_card_id uuid,
  archived boolean default false,
  created_at timestamptz default now()
);

create table if not exists public.vb_sections (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.vb_boards(id) on delete cascade,
  title text not null,
  sort_index int default 0
);

create table if not exists public.vb_cards (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.vb_boards(id) on delete cascade,
  section_id uuid references public.vb_sections(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null default 'image',       -- 'image' | 'text'
  title text,
  affirm text,
  color text,
  tags text[] default '{}',
  size vb_card_size default 'M',
  favorite boolean default false,
  visible_in_share boolean default true,
  link_type text,                           -- 'habit' | 'goal' | null
  link_id uuid,
  img_path text,
  img_w int, img_h int,
  sort_index int default 0,
  created_at timestamptz default now()
);

create or replace view public.vb_board_stats as
  select b.id board_id,
         count(c.*) as card_count,
         coalesce(sum(case when c.favorite then 1 else 0 end),0) as favorite_count
  from vb_boards b
  left join vb_cards c on c.board_id=b.id
  group by b.id;

-- RLS
alter table public.vb_boards enable row level security;
alter table public.vb_sections enable row level security;
alter table public.vb_cards enable row level security;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vb_boards'
      and policyname = 'own boards'
  ) then
    execute 'drop policy "own boards" on public.vb_boards';
  end if;
end $$;

create policy "own boards" on public.vb_boards
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vb_sections'
      and policyname = 'sections of own boards'
  ) then
    execute 'drop policy "sections of own boards" on public.vb_sections';
  end if;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vb_sections'
      and policyname = 'sections of own boards'
  ) then
    execute 'drop policy "sections of own boards" on public.vb_sections';
  end if;
  execute $$create policy "sections of own boards" on public.vb_sections
    for all using (auth.uid() in (select user_id from vb_boards where id = board_id))
    with check (auth.uid() in (select user_id from vb_boards where id = board_id));$$;
end $$;

do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vb_cards'
      and policyname = 'own cards'
  ) then
    execute 'drop policy "own cards" on public.vb_cards';
  end if;
end $$;

create policy "own cards" on public.vb_cards
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

do $$ begin perform gen_random_uuid(); exception when undefined_function then
  create extension if not exists pgcrypto; end $$;
