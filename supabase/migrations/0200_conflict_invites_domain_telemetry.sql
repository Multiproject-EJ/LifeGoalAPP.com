-- M25: Conflict invite domain/surface telemetry for dual-surface rollout.

alter table public.conflict_invites
  add column if not exists issued_domain text,
  add column if not exists redeemed_domain text,
  add column if not exists issued_surface text,
  add column if not exists redeemed_surface text,
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create index if not exists conflict_invites_issued_domain_idx on public.conflict_invites(issued_domain);
create index if not exists conflict_invites_redeemed_domain_idx on public.conflict_invites(redeemed_domain);
