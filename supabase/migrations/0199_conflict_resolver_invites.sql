-- M24: Conflict Resolver invite scaffolding for cross-domain onboarding.

create table if not exists public.conflict_invites (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  email text not null,
  role text not null default 'participant' check (role in ('participant', 'observer')),
  invite_token text not null unique,
  status text not null default 'pending' check (status in ('pending', 'redeemed', 'revoked', 'expired')),
  expires_at timestamptz not null default (now() + interval '7 days'),
  redeemed_at timestamptz,
  redeemed_by_user_id uuid references auth.users(id) on delete set null,
  created_by_user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists conflict_invites_session_idx on public.conflict_invites(session_id);
create index if not exists conflict_invites_email_idx on public.conflict_invites(email);
create index if not exists conflict_invites_status_idx on public.conflict_invites(status);

alter table public.conflict_invites enable row level security;

create policy "conflict_invites_select_session_members"
  on public.conflict_invites
  for select
  using (
    created_by_user_id = auth.uid()
    or redeemed_by_user_id = auth.uid()
    or exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_invites.session_id
        and (
          session.owner_user_id = auth.uid()
          or exists (
            select 1
            from public.conflict_participants participant
            where participant.session_id = session.id
              and participant.user_id = auth.uid()
          )
        )
    )
  );

create policy "conflict_invites_insert_owner"
  on public.conflict_invites
  for insert
  with check (
    created_by_user_id = auth.uid()
    and exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_invites.session_id
        and session.owner_user_id = auth.uid()
    )
  );

create policy "conflict_invites_update_owner_or_redeemer"
  on public.conflict_invites
  for update
  using (
    created_by_user_id = auth.uid()
    or redeemed_by_user_id = auth.uid()
  )
  with check (
    created_by_user_id = auth.uid()
    or redeemed_by_user_id = auth.uid()
  );
