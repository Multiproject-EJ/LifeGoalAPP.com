create table if not exists public.vb_shares (
  id uuid primary key default gen_random_uuid(),
  board_id uuid not null references public.vb_boards(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  slug text unique not null,
  is_active boolean default true,
  created_at timestamptz default now()
);
alter table public.vb_shares enable row level security;
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'vb_shares'
      and policyname = 'owner manage share'
  ) then
    execute 'drop policy "owner manage share" on public.vb_shares';
  end if;
end$$ language plpgsql;
create policy "owner manage share" on public.vb_shares
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create table if not exists public.push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);
alter table public.push_subscriptions enable row level security;
do $$
begin
  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'own push'
  ) then
    execute 'drop policy "own push" on public.push_subscriptions';
  end if;
end$$ language plpgsql;
create policy "own push" on public.push_subscriptions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
