-- M23: Conflict Resolver foundation schema (sessions, participants, stage state, summaries, proposals, apologies, agreements)

create table if not exists public.conflict_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users(id) on delete cascade,
  conflict_type text not null check (conflict_type in ('inner_tension', 'shared_conflict')),
  status text not null default 'draft' check (
    status in (
      'draft',
      'grounding',
      'private_capture',
      'shared_read',
      'negotiation',
      'apology_alignment',
      'agreement',
      'closed'
    )
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);

create table if not exists public.conflict_participants (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  email text,
  role text not null default 'participant' check (role in ('initiator', 'participant', 'observer')),
  joined_at timestamptz not null default now(),
  unique (session_id, id)
);

create unique index if not exists conflict_participants_session_user_unique
  on public.conflict_participants(session_id, user_id)
  where user_id is not null;

create table if not exists public.conflict_stage_state (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  participant_id uuid not null references public.conflict_participants(id) on delete cascade,
  stage text not null check (
    stage in (
      'draft',
      'grounding',
      'private_capture',
      'shared_read',
      'negotiation',
      'apology_alignment',
      'agreement',
      'closed'
    )
  ),
  completed_at timestamptz,
  readiness text not null default 'not_ready' check (readiness in ('not_ready', 'ready', 'blocked')),
  extension_requested boolean not null default false,
  created_at timestamptz not null default now(),
  unique (session_id, participant_id, stage)
);

create table if not exists public.conflict_messages_private (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  participant_id uuid not null references public.conflict_participants(id) on delete cascade,
  prompt_key text not null,
  raw_text text,
  rewritten_text text,
  rewrite_accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.conflict_shared_summaries (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  stage text not null check (stage in ('private_capture', 'shared_read', 'negotiation', 'agreement')),
  summary jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.conflict_proposals (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  created_by_participant_id uuid references public.conflict_participants(id) on delete set null,
  proposal_text text not null,
  status text not null default 'queued' check (status in ('queued', 'active', 'accepted', 'rejected', 'countered')),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.conflict_apologies (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  from_participant_id uuid references public.conflict_participants(id) on delete set null,
  to_participant_id uuid references public.conflict_participants(id) on delete set null,
  apology_type text not null check (
    apology_type in ('acknowledge_impact', 'take_responsibility', 'repair_action', 'reassurance')
  ),
  timing_mode text not null default 'simultaneous' check (timing_mode in ('simultaneous', 'sequenced')),
  readiness text not null default 'draft' check (readiness in ('draft', 'ready', 'sent', 'acknowledged')),
  delivered_at timestamptz,
  acknowledged_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.conflict_agreements (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null unique references public.conflict_sessions(id) on delete cascade,
  agreement jsonb not null default '{}'::jsonb,
  follow_up_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.conflict_sessions enable row level security;
alter table public.conflict_participants enable row level security;
alter table public.conflict_stage_state enable row level security;
alter table public.conflict_messages_private enable row level security;
alter table public.conflict_shared_summaries enable row level security;
alter table public.conflict_proposals enable row level security;
alter table public.conflict_apologies enable row level security;
alter table public.conflict_agreements enable row level security;

create policy "conflict_sessions_select_members"
  on public.conflict_sessions
  for select
  using (
    owner_user_id = auth.uid()
    or exists (
      select 1
      from public.conflict_participants participant
      where participant.session_id = conflict_sessions.id
        and participant.user_id = auth.uid()
    )
  );

create policy "conflict_sessions_insert_owner"
  on public.conflict_sessions
  for insert
  with check (owner_user_id = auth.uid());

create policy "conflict_sessions_update_owner"
  on public.conflict_sessions
  for update
  using (owner_user_id = auth.uid())
  with check (owner_user_id = auth.uid());

create policy "conflict_participants_select_session_members"
  on public.conflict_participants
  for select
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_participants.session_id
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

create policy "conflict_participants_insert_owner"
  on public.conflict_participants
  for insert
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_participants.session_id
        and session.owner_user_id = auth.uid()
    )
  );

create policy "conflict_participants_update_owner"
  on public.conflict_participants
  for update
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_participants.session_id
        and session.owner_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_participants.session_id
        and session.owner_user_id = auth.uid()
    )
  );

create policy "conflict_stage_state_session_members"
  on public.conflict_stage_state
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_stage_state.session_id
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
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_stage_state.session_id
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

create policy "conflict_messages_private_session_members"
  on public.conflict_messages_private
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_messages_private.session_id
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
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_messages_private.session_id
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

create policy "conflict_shared_summaries_session_members"
  on public.conflict_shared_summaries
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_shared_summaries.session_id
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
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_shared_summaries.session_id
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

create policy "conflict_proposals_session_members"
  on public.conflict_proposals
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_proposals.session_id
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
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_proposals.session_id
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

create policy "conflict_apologies_session_members"
  on public.conflict_apologies
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_apologies.session_id
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
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_apologies.session_id
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

create policy "conflict_agreements_session_members"
  on public.conflict_agreements
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_agreements.session_id
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
  )
  with check (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_agreements.session_id
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
