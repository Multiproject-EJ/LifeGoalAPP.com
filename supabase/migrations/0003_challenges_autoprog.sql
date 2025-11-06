-- ========================================================
-- HABITS MODULE - CHALLENGES & AUTO-PROGRESSION
-- Migration 0003: Challenges, Leaderboard, Auto-Progression
-- ========================================================

-- CHALLENGES TABLE
create table if not exists public.habit_challenges (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  description text,
  start_date date not null,
  end_date date not null,
  scoring text not null default 'count', -- 'count' = #days done; 'sum' = sum(value)
  created_at timestamptz default now()
);

-- CHALLENGE MEMBERS TABLE
create table if not exists public.habit_challenge_members (
  id uuid primary key default gen_random_uuid(),
  challenge_id uuid not null references public.habit_challenges(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid, -- optional link to a specific habit (references habits_v2)
  joined_at timestamptz default now(),
  unique (challenge_id, user_id)
);

-- Add foreign key for habit_id if habits_v2 exists
do $$
begin
  if exists (select 1 from information_schema.tables where table_schema = 'public' and table_name = 'habits_v2') then
    if not exists (
      select 1 from information_schema.table_constraints 
      where constraint_name = 'habit_challenge_members_habit_id_fkey' 
      and table_name = 'habit_challenge_members'
    ) then
      alter table public.habit_challenge_members add constraint habit_challenge_members_habit_id_fkey 
        foreign key (habit_id) references public.habits_v2(id) on delete set null;
    end if;
  end if;
end $$;

-- CHALLENGE LEADERBOARD VIEW
create or replace view public.v_challenge_scores as
select m.challenge_id,
       m.user_id,
       p.display_name as user_display_name,
       coalesce(
         case c.scoring
           when 'sum' then (select sum(value) from habit_logs_v2 l
                            where l.user_id=m.user_id
                              and (m.habit_id is null or l.habit_id=m.habit_id)
                              and l.date between c.start_date and c.end_date)
           else (select count(distinct l.date) from habit_logs_v2 l
                 where l.user_id=m.user_id
                   and (m.habit_id is null or l.habit_id=m.habit_id)
                   and l.done is true
                   and l.date between c.start_date and c.end_date)
         end
       ,0)::numeric as score
from habit_challenge_members m
join habit_challenges c on c.id=m.challenge_id
left join profiles p on p.user_id = m.user_id;

-- RLS
alter table public.habit_challenges enable row level security;
alter table public.habit_challenge_members enable row level security;

-- Challenge policies
drop policy if exists "owner or member read challenge" on public.habit_challenges;
create policy "owner or member read challenge" on public.habit_challenges
  for select using (
    auth.uid() = owner_id
    or exists(select 1 from habit_challenge_members m where m.challenge_id = habit_challenges.id and m.user_id = auth.uid())
  );

drop policy if exists "owner write challenge" on public.habit_challenges;
create policy "owner write challenge" on public.habit_challenges
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Member policies
drop policy if exists "member read" on public.habit_challenge_members;
create policy "member read" on public.habit_challenge_members
  for select using (
    auth.uid() = user_id 
    or auth.uid() = (select owner_id from habit_challenges where id=challenge_id)
  );

drop policy if exists "self upsert" on public.habit_challenge_members;
create policy "self upsert" on public.habit_challenge_members
  for insert with check (auth.uid() = user_id);

drop policy if exists "self delete" on public.habit_challenge_members;
create policy "self delete" on public.habit_challenge_members
  for delete using (
    auth.uid() = user_id 
    or auth.uid() = (select owner_id from habit_challenges where id=challenge_id)
  );
