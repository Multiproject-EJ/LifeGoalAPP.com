-- First production background-work safety patch.
--
-- This migration intentionally does not repair contract business logic, enable
-- pg_net, create a durable worker queue, or remove cron jobs. It contains only
-- reversible containment, bounded retention, supporting indexes, and private
-- health reporting.

create schema if not exists ops;
revoke all on schema ops from public;
revoke all on schema ops from anon, authenticated;

-- Hosted Supabase owns the pg_cron extension tables, so the application
-- migration role cannot add an end_time index to cron.job_run_details. The
-- hard ~50,000-row cap below bounds its daily age scan.

create index if not exists island_run_action_log_created_at_idx
  on public.island_run_action_log (created_at);

-- The existing (user_id, entered_at) index cannot support a global time purge.
create index if not exists task_tower_sessions_entered_at_idx
  on public.task_tower_sessions (entered_at);

create index if not exists scheduled_reminders_terminal_updated_at_idx
  on public.scheduled_reminders (updated_at)
  where status in ('cancelled', 'sent', 'failed');

create index if not exists billing_webhook_events_terminal_received_at_idx
  on public.billing_webhook_events (received_at)
  where status in ('processed', 'ignored');

create or replace function ops.delete_old_rows(
  p_relation regclass,
  p_time_column name,
  p_cutoff timestamptz,
  p_batch_size integer default 5000
)
returns integer
language plpgsql
set search_path = pg_catalog
as $function$
declare
  v_deleted integer := 0;
begin
  if p_relation is null or p_time_column is null or p_cutoff is null then
    raise exception 'relation, time column, and cutoff are required';
  end if;

  if p_batch_size < 1 or p_batch_size > 50000 then
    raise exception 'batch size must be between 1 and 50000';
  end if;

  execute format(
    'with victims as (
       select ctid
       from %s
       where %I < $1
       order by %I
       limit $2
     )
     delete from %s as target
     using victims
     where target.ctid = victims.ctid',
    p_relation,
    p_time_column,
    p_time_column,
    p_relation
  )
  using p_cutoff, p_batch_size;

  get diagnostics v_deleted = row_count;
  return v_deleted;
end;
$function$;

create or replace function ops.prune_cron_history(
  p_keep interval default interval '7 days',
  p_max_completed_rows integer default 50000,
  p_batch_size integer default 5000,
  p_max_age_batches integer default 10
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $function$
declare
  v_batch_deleted integer := 0;
  v_age_deleted bigint := 0;
  v_cap_deleted bigint := 0;
  v_cutoff_runid bigint;
  v_batch integer;
begin
  if p_keep < interval '1 day' then
    raise exception 'cron history retention must be at least 1 day';
  end if;

  if p_max_completed_rows < 1000 or p_max_completed_rows > 1000000 then
    raise exception 'completed row cap must be between 1000 and 1000000';
  end if;

  if p_batch_size < 1 or p_batch_size > 50000 then
    raise exception 'batch size must be between 1 and 50000';
  end if;

  if p_max_age_batches < 1 or p_max_age_batches > 100 then
    raise exception 'age batch count must be between 1 and 100';
  end if;

  -- A second manual/admin call exits harmlessly instead of overlapping cron.
  if not pg_try_advisory_xact_lock(hashtextextended('ops.prune_cron_history', 0)) then
    return jsonb_build_object('skipped', true, 'reason', 'already_running');
  end if;

  -- Age pruning is explicitly bounded per daily run. Health reporting exposes
  -- any lag, and the volume cap below remains a hard final guardrail.
  for v_batch in 1..p_max_age_batches loop
    with victims as (
      select runid
      from cron.job_run_details
      where end_time is not null
        and end_time < clock_timestamp() - p_keep
      order by end_time, runid
      limit p_batch_size
    )
    delete from cron.job_run_details as target
    using victims
    where target.runid = victims.runid;

    get diagnostics v_batch_deleted = row_count;
    v_age_deleted := v_age_deleted + v_batch_deleted;
    exit when v_batch_deleted < p_batch_size;
  end loop;

  -- Keep the newest N completed rows. Running rows are deliberately excluded,
  -- so the physical total is approximately N plus a small concurrency margin.
  select runid
  into v_cutoff_runid
  from cron.job_run_details
  where end_time is not null
  order by runid desc
  offset p_max_completed_rows - 1
  limit 1;

  if v_cutoff_runid is not null then
    delete from cron.job_run_details
    where end_time is not null
      and runid < v_cutoff_runid;
    get diagnostics v_cap_deleted = row_count;
  end if;

  return jsonb_build_object(
    'skipped', false,
    'age_deleted', v_age_deleted,
    'cap_deleted', v_cap_deleted,
    'completed_rows_remaining', (
      select count(*) from cron.job_run_details where end_time is not null
    ),
    'ran_at', clock_timestamp()
  );
end;
$function$;

create or replace function ops.prune_other_operational_logs(
  p_batch_size integer default 5000
)
returns jsonb
language plpgsql
set search_path = pg_catalog
as $function$
declare
  v_reminder_actions integer := 0;
  v_reminder_failures integer := 0;
  v_contract_runs integer := 0;
  v_scheduled_terminal integer := 0;
  v_rollups integer := 0;
  v_billing_redacted integer := 0;
  v_billing_deleted integer := 0;
begin
  if p_batch_size < 1 or p_batch_size > 50000 then
    raise exception 'batch size must be between 1 and 50000';
  end if;

  if not pg_try_advisory_xact_lock(hashtextextended('ops.prune_other_operational_logs', 0)) then
    return jsonb_build_object('skipped', true, 'reason', 'already_running');
  end if;

  v_reminder_actions := ops.delete_old_rows(
    'public.reminder_action_logs'::regclass,
    'created_at',
    clock_timestamp() - interval '90 days',
    p_batch_size
  );

  v_reminder_failures := ops.delete_old_rows(
    'public.reminder_delivery_failures'::regclass,
    'created_at',
    clock_timestamp() - interval '30 days',
    p_batch_size
  );

  v_contract_runs := ops.delete_old_rows(
    'public.commitment_contract_sweep_runs'::regclass,
    'triggered_at',
    clock_timestamp() - interval '30 days',
    p_batch_size
  );

  v_rollups := ops.delete_old_rows(
    'public.telemetry_daily_rollups'::regclass,
    'day',
    (current_date - 400)::timestamptz,
    p_batch_size
  );

  with victims as (
    select ctid
    from public.scheduled_reminders
    where status in ('cancelled', 'sent', 'failed')
      and updated_at < clock_timestamp() - interval '30 days'
    order by updated_at
    limit p_batch_size
  )
  delete from public.scheduled_reminders as target
  using victims
  where target.ctid = victims.ctid;
  get diagnostics v_scheduled_terminal = row_count;

  -- Keep a compact Stripe dedupe ledger while discarding old raw payloads.
  -- Failed/received rows are never pruned automatically.
  with victims as (
    select stripe_event_id
    from public.billing_webhook_events
    where status in ('processed', 'ignored')
      and received_at < clock_timestamp() - interval '90 days'
      and payload <> '{}'::jsonb
    order by received_at
    limit p_batch_size
  )
  update public.billing_webhook_events as target
  set payload = '{}'::jsonb
  from victims
  where target.stripe_event_id = victims.stripe_event_id;
  get diagnostics v_billing_redacted = row_count;

  with victims as (
    select stripe_event_id
    from public.billing_webhook_events
    where status in ('processed', 'ignored')
      and received_at < clock_timestamp() - interval '400 days'
    order by received_at
    limit p_batch_size
  )
  delete from public.billing_webhook_events as target
  using victims
  where target.stripe_event_id = victims.stripe_event_id;
  get diagnostics v_billing_deleted = row_count;

  return jsonb_build_object(
    'skipped', false,
    'reminder_actions_deleted', v_reminder_actions,
    'reminder_failures_deleted', v_reminder_failures,
    'contract_run_logs_deleted', v_contract_runs,
    'scheduled_terminal_deleted', v_scheduled_terminal,
    'telemetry_rollups_deleted', v_rollups,
    'billing_payloads_redacted', v_billing_redacted,
    'billing_ledgers_deleted', v_billing_deleted,
    'ran_at', clock_timestamp()
  );
end;
$function$;

-- Private, dashboard/SQL-editor health view. It is intentionally outside the
-- exposed public schema and is not granted to client roles.
create or replace view ops.admin_background_health
with (security_invoker = true)
as
select
  clock_timestamp() as captured_at,
  pg_database_size(current_database()) as database_size_bytes,
  (
    select coalesce(jsonb_agg(to_jsonb(largest) order by largest.total_bytes desc), '[]'::jsonb)
    from (
      select
        format('%I.%I', n.nspname, c.relname) as relation,
        pg_total_relation_size(c.oid) as total_bytes,
        pg_relation_size(c.oid) as heap_bytes,
        pg_indexes_size(c.oid) as index_bytes,
        coalesce(s.n_live_tup, 0) as estimated_live_rows,
        coalesce(s.n_dead_tup, 0) as estimated_dead_rows
      from pg_class c
      join pg_namespace n on n.oid = c.relnamespace
      left join pg_stat_user_tables s on s.relid = c.oid
      where c.relkind in ('r', 'm')
        and n.nspname not in ('pg_catalog', 'information_schema')
      order by pg_total_relation_size(c.oid) desc
      limit 15
    ) as largest
  ) as largest_relations,
  (
    select coalesce(jsonb_agg(to_jsonb(volume) order by volume.jobid), '[]'::jsonb)
    from (
      select
        coalesce(j.jobid, d.jobid) as jobid,
        j.jobname,
        j.schedule,
        j.active,
        count(d.runid) filter (where d.start_time >= clock_timestamp() - interval '24 hours') as runs_24h,
        count(d.runid) filter (where d.start_time >= clock_timestamp() - interval '7 days') as runs_7d,
        count(d.runid) filter (
          where d.start_time >= clock_timestamp() - interval '24 hours'
            and d.status = 'failed'
        ) as failures_24h,
        count(d.runid) filter (
          where d.start_time >= clock_timestamp() - interval '7 days'
            and d.status = 'failed'
        ) as failures_7d,
        max(d.start_time) as latest_run_at
      from cron.job j
      full join cron.job_run_details d on d.jobid = j.jobid
      group by coalesce(j.jobid, d.jobid), j.jobname, j.schedule, j.active
    ) as volume
  ) as cron_volume,
  jsonb_build_object(
    'cron_history_rows', (select count(*) from cron.job_run_details),
    'cron_history_oldest', (select min(start_time) from cron.job_run_details),
    'cron_history_size_bytes', pg_total_relation_size('cron.job_run_details'::regclass),
    'scheduled_reminders_pending', (
      select count(*) from public.scheduled_reminders where status = 'pending'
    ),
    'scheduled_reminders_due', (
      select count(*) from public.scheduled_reminders
      where status = 'pending' and scheduled_at <= clock_timestamp()
    ),
    'scheduled_reminders_oldest_due', (
      select min(scheduled_at) from public.scheduled_reminders
      where status = 'pending' and scheduled_at <= clock_timestamp()
    ),
    'billing_received', (
      select count(*) from public.billing_webhook_events where status = 'received'
    ),
    'billing_failed', (
      select count(*) from public.billing_webhook_events where status = 'failed'
    ),
    'oldest_unresolved_billing_event', (
      select min(received_at) from public.billing_webhook_events
      where status in ('received', 'failed')
    )
  ) as queue_backlog,
  (
    select jsonb_agg(to_jsonb(logs) order by logs.relation)
    from (
      select 'public.telemetry_events' as relation, count(*) as rows,
        min(occurred_at)::text as oldest, max(occurred_at)::text as newest,
        pg_total_relation_size('public.telemetry_events'::regclass) as total_bytes
      from public.telemetry_events
      union all
      select 'public.reminder_action_logs', count(*), min(created_at)::text, max(created_at)::text,
        pg_total_relation_size('public.reminder_action_logs'::regclass)
      from public.reminder_action_logs
      union all
      select 'public.reminder_delivery_failures', count(*), min(created_at)::text, max(created_at)::text,
        pg_total_relation_size('public.reminder_delivery_failures'::regclass)
      from public.reminder_delivery_failures
      union all
      select 'public.billing_webhook_events', count(*), min(received_at)::text, max(received_at)::text,
        pg_total_relation_size('public.billing_webhook_events'::regclass)
      from public.billing_webhook_events
      union all
      select 'public.commitment_contract_sweep_runs', count(*), min(triggered_at)::text, max(triggered_at)::text,
        pg_total_relation_size('public.commitment_contract_sweep_runs'::regclass)
      from public.commitment_contract_sweep_runs
      union all
      select 'public.island_run_action_log', count(*), min(created_at)::text, max(created_at)::text,
        pg_total_relation_size('public.island_run_action_log'::regclass)
      from public.island_run_action_log
    ) as logs
  ) as log_growth;

revoke all on all functions in schema ops from public;
revoke all on all functions in schema ops from anon, authenticated;
revoke all on ops.admin_background_health from public, anon, authenticated;

-- Named cron.schedule is an upsert in pg_cron/Supabase Cron. Re-running the
-- migration does not create a second row with the same case-sensitive name.
select cron.schedule(
  'cron-job-run-details-retention',
  '20 3 * * *',
  $cron$select ops.prune_cron_history();$cron$
);

select cron.schedule(
  'island-run-action-log-retention',
  '10 3 * * *',
  $cron$select ops.delete_old_rows('public.island_run_action_log'::regclass, 'created_at', clock_timestamp() - interval '48 hours', 5000);$cron$
);

select cron.schedule(
  'telemetry-events-retention',
  '15 3 * * *',
  $cron$select ops.delete_old_rows('public.telemetry_events'::regclass, 'occurred_at', clock_timestamp() - interval '30 days', 5000);$cron$
);

select cron.schedule(
  'task-tower-sessions-retention',
  '25 3 * * *',
  $cron$select ops.delete_old_rows('public.task_tower_sessions'::regclass, 'entered_at', clock_timestamp() - interval '365 days', 5000);$cron$
);

select cron.schedule(
  'operational-log-retention-daily',
  '35 3 * * *',
  $cron$select ops.prune_other_operational_logs(5000);$cron$
);

-- Reversible containment, guarded by the exact observed broken precondition.
-- Do not disable a job if another migration has already repaired it.
do $block$
declare
  v_jobid bigint;
begin
  if to_regnamespace('net') is null then
    select jobid into v_jobid
    from cron.job
    where jobname = 'send-habit-reminders'
      and active
      and command like '%net.http_post%';

    if v_jobid is not null then
      perform cron.alter_job(job_id := v_jobid, active := false);
    end if;
  end if;
end;
$block$;
do $block$
declare
  v_jobid bigint;
  v_function_is_broken boolean := false;
begin
  select exists (
    select 1
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname = 'evaluate_due_commitment_contracts'
      and pg_get_function_identity_arguments(p.oid) = 'p_user_id uuid, p_max_windows integer'
      and p.prosrc !~ 'v_windows_processed[[:space:]]*:=[[:space:]]*v_windows_processed[[:space:]]*[+][[:space:]]*1'
  ) into v_function_is_broken;

  if v_function_is_broken then
    select jobid into v_jobid
    from cron.job
    where jobname = 'commitment-contracts-due-sweep'
      and active
      and command = 'SELECT public.evaluate_due_commitment_contracts_sweep(200, 12);';

    if v_jobid is not null then
      perform cron.alter_job(job_id := v_jobid, active := false);
    end if;
  end if;
end;
$block$;
