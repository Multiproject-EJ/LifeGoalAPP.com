-- M27: Optional conflict AI message memory table for staged orchestration.

create table if not exists public.conflict_ai_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.conflict_sessions(id) on delete cascade,
  stage text not null check (
    stage in (
      'private_capture_rewrite',
      'shared_read_summary',
      'resolution_options',
      'apology_alignment',
      'inner_tension_next_steps'
    )
  ),
  role text not null check (role in ('system', 'user', 'assistant')),
  message text not null default '',
  metadata jsonb not null default '{}'::jsonb,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists conflict_ai_messages_session_stage_idx
  on public.conflict_ai_messages(session_id, stage, created_at desc);

alter table public.conflict_ai_messages enable row level security;

create policy "conflict_ai_messages_session_members"
  on public.conflict_ai_messages
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_ai_messages.session_id
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
      where session.id = conflict_ai_messages.session_id
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

