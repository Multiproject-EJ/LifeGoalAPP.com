create table if not exists public.today_todos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  todo_date date not null,
  title text not null,
  notes text null,
  completed boolean not null default false,
  completed_at timestamptz null,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists today_todos_user_date_idx on public.today_todos (user_id, todo_date);
create index if not exists today_todos_user_date_completed_idx on public.today_todos (user_id, todo_date, completed);
create index if not exists today_todos_user_updated_idx on public.today_todos (user_id, updated_at desc);

alter table public.today_todos enable row level security;

create policy "today_todos_select_own"
  on public.today_todos for select
  using (auth.uid() = user_id);

create policy "today_todos_insert_own"
  on public.today_todos for insert
  with check (auth.uid() = user_id);

create policy "today_todos_update_own"
  on public.today_todos for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "today_todos_delete_own"
  on public.today_todos for delete
  using (auth.uid() = user_id);

create or replace function public.set_today_todos_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_today_todos_updated_at on public.today_todos;
create trigger trg_today_todos_updated_at
before update on public.today_todos
for each row execute procedure public.set_today_todos_updated_at();
