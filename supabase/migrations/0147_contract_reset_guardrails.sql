-- Track contract reset guardrails so reset recovery cannot be spammed.

alter table public.commitment_contracts
  add column if not exists reset_count integer not null default 0,
  add column if not exists last_reset_at timestamptz;

update public.commitment_contracts
set
  reset_count = coalesce(reset_count, 0),
  last_reset_at = coalesce(last_reset_at, null)
where true;
