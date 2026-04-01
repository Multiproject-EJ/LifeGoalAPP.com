-- M31: MVP feedback + support case system (admin + owner scoped)

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'admin' check (role in ('owner', 'admin')),
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.case_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_type text not null check (case_type in ('feedback', 'support')),
  category text not null,
  subject text not null,
  desired_outcome text,
  status text not null default 'new' check (status in ('new', 'triaged', 'waiting_on_user', 'resolved', 'closed')),
  source_surface text,
  source_route text,
  is_demo boolean not null default false,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create index if not exists case_threads_user_created_idx on public.case_threads(user_id, created_at desc);
create index if not exists case_threads_status_idx on public.case_threads(status, created_at desc);
create index if not exists case_threads_type_status_idx on public.case_threads(case_type, status, created_at desc);

create table if not exists public.case_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.case_threads(id) on delete cascade,
  author_user_id uuid references auth.users(id) on delete set null,
  author_role text not null check (author_role in ('user', 'admin', 'system')),
  message_type text not null check (message_type in ('submission', 'internal_note', 'status_change', 'reply_draft')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists case_messages_thread_created_idx on public.case_messages(thread_id, created_at asc);

create or replace function public.update_case_threads_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_case_threads_updated_at on public.case_threads;
create trigger trg_case_threads_updated_at
before update on public.case_threads
for each row execute function public.update_case_threads_updated_at();

alter table public.admin_users enable row level security;
alter table public.case_threads enable row level security;
alter table public.case_messages enable row level security;

-- Admin users can read their own admin row only.
drop policy if exists "admin_users_select_self" on public.admin_users;
create policy "admin_users_select_self"
  on public.admin_users
  for select
  using (auth.uid() = user_id and active = true);

-- Threads: owner can CRUD own; admins can select/update all.
drop policy if exists "case_threads_owner_select" on public.case_threads;
create policy "case_threads_owner_select"
  on public.case_threads
  for select
  using (auth.uid() = user_id);

drop policy if exists "case_threads_owner_insert" on public.case_threads;
create policy "case_threads_owner_insert"
  on public.case_threads
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "case_threads_owner_update" on public.case_threads;
create policy "case_threads_owner_update"
  on public.case_threads
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "case_threads_admin_select_all" on public.case_threads;
create policy "case_threads_admin_select_all"
  on public.case_threads
  for select
  using (
    exists (
      select 1
      from public.admin_users admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  );

drop policy if exists "case_threads_admin_update_all" on public.case_threads;
create policy "case_threads_admin_update_all"
  on public.case_threads
  for update
  using (
    exists (
      select 1
      from public.admin_users admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  )
  with check (true);

-- Messages: session owner or admin can read; owner/user insert own role; admins can insert notes/status/reply drafts.
drop policy if exists "case_messages_owner_select" on public.case_messages;
create policy "case_messages_owner_select"
  on public.case_messages
  for select
  using (
    exists (
      select 1
      from public.case_threads thread
      where thread.id = case_messages.thread_id
        and thread.user_id = auth.uid()
    )
  );

drop policy if exists "case_messages_admin_select" on public.case_messages;
create policy "case_messages_admin_select"
  on public.case_messages
  for select
  using (
    exists (
      select 1
      from public.admin_users admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  );

drop policy if exists "case_messages_owner_insert_submission" on public.case_messages;
create policy "case_messages_owner_insert_submission"
  on public.case_messages
  for insert
  with check (
    author_role = 'user'
    and author_user_id = auth.uid()
    and exists (
      select 1
      from public.case_threads thread
      where thread.id = case_messages.thread_id
        and thread.user_id = auth.uid()
    )
  );

drop policy if exists "case_messages_admin_insert" on public.case_messages;
create policy "case_messages_admin_insert"
  on public.case_messages
  for insert
  with check (
    exists (
      select 1
      from public.admin_users admin_row
      where admin_row.user_id = auth.uid()
        and admin_row.active = true
    )
  );

comment on table public.admin_users is 'App-level admin allowlist for support/feedback inbox access.';
comment on table public.case_threads is 'Shared feedback/support thread envelope for MVP.';
comment on table public.case_messages is 'Messages/events for case threads: submission, notes, status change, manual reply draft.';
