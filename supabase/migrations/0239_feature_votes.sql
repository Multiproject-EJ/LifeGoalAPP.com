-- Structured Future Feature voting, separate from support/case threads.

create table if not exists public.feature_votes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  feature_id text not null,
  vote_state text not null check (vote_state in ('would_help_my_quest', 'looks_fun', 'not_for_me')),
  suggestion_text text,
  source_surface text,
  source_route text,
  feature_category text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, feature_id)
);

create index if not exists feature_votes_feature_state_idx
  on public.feature_votes(feature_id, vote_state);

create index if not exists feature_votes_user_updated_idx
  on public.feature_votes(user_id, updated_at desc);

create index if not exists feature_votes_category_state_idx
  on public.feature_votes(feature_category, vote_state);

create or replace function public.update_feature_votes_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_feature_votes_updated_at on public.feature_votes;
create trigger trg_feature_votes_updated_at
before update on public.feature_votes
for each row execute function public.update_feature_votes_updated_at();

alter table public.feature_votes enable row level security;

drop policy if exists "feature_votes_owner_select" on public.feature_votes;
create policy "feature_votes_owner_select"
  on public.feature_votes
  for select
  using (auth.uid() = user_id);

drop policy if exists "feature_votes_owner_insert" on public.feature_votes;
create policy "feature_votes_owner_insert"
  on public.feature_votes
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "feature_votes_owner_update" on public.feature_votes;
create policy "feature_votes_owner_update"
  on public.feature_votes
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "feature_votes_admin_select_all" on public.feature_votes;
create policy "feature_votes_admin_select_all"
  on public.feature_votes
  for select
  using (
    exists (
      select 1
      from public.admin_users admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  );

comment on table public.feature_votes is 'Structured Future Feature roadmap feedback; not connected to support cases.';
