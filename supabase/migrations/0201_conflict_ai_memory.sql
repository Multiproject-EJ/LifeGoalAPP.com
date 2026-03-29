-- M26: Conflict AI memory and run telemetry foundation.

create table if not exists public.conflict_ai_runs (
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
  mode text not null check (mode in ('premium', 'free_quota', 'fallback')),
  model text,
  used_context_domains text[] not null default '{}'::text[],
  token_input integer,
  token_output integer,
  latency_ms integer,
  fallback_used boolean not null default false,
  error_message text,
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists conflict_ai_runs_session_idx on public.conflict_ai_runs(session_id);
create index if not exists conflict_ai_runs_stage_idx on public.conflict_ai_runs(stage);
create index if not exists conflict_ai_runs_created_at_idx on public.conflict_ai_runs(created_at desc);

create table if not exists public.conflict_ai_artifacts (
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
  artifact jsonb not null default '{}'::jsonb,
  version integer not null default 1 check (version > 0),
  created_by_user_id uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists conflict_ai_artifacts_session_stage_idx
  on public.conflict_ai_artifacts(session_id, stage, created_at desc);

alter table public.conflict_ai_runs enable row level security;
alter table public.conflict_ai_artifacts enable row level security;

create policy "conflict_ai_runs_session_members"
  on public.conflict_ai_runs
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_ai_runs.session_id
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
      where session.id = conflict_ai_runs.session_id
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

create policy "conflict_ai_artifacts_session_members"
  on public.conflict_ai_artifacts
  for all
  using (
    exists (
      select 1
      from public.conflict_sessions session
      where session.id = conflict_ai_artifacts.session_id
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
      where session.id = conflict_ai_artifacts.session_id
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
