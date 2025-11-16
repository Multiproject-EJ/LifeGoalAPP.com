create table if not exists public.vb_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  board_id uuid references public.vb_boards(id) on delete set null,
  the_date date not null default current_date,
  mood int check (mood between 1 and 5),
  gratitude text,
  created_at timestamptz default now()
);

create unique index if not exists vb_checkins_user_date_board_idx
  on public.vb_checkins (user_id, the_date, coalesce(board_id, '00000000-0000-0000-0000-000000000000'::uuid));
alter table public.vb_checkins enable row level security;
drop policy if exists "own checkins" on public.vb_checkins;
create policy "own checkins" on public.vb_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
