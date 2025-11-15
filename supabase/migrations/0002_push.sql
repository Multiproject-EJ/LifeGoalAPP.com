-- ========================================================
-- HABITS MODULE - WEB PUSH NOTIFICATIONS
-- Migration 0002: Push Subscriptions
-- ========================================================

-- PUSH SUBSCRIPTIONS TABLE
create table if not exists public.push_subscriptions (
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text primary key,
  p256dh text not null,
  auth text not null,
  created_at timestamptz default now()
);

-- RLS
alter table public.push_subscriptions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'push_subscriptions'
      and policyname = 'own push'
  ) then
    execute $pol$
      create policy "own push" on public.push_subscriptions
        for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
    $pol$;
  end if;
end$$ language plpgsql;
