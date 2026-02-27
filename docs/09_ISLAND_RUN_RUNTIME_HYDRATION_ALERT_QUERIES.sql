-- M7O.5 runtime hydration alert query seeds
-- Assumes telemetry_events rows with event_type in:
--  - runtime_state_hydrated
--  - runtime_state_hydration_failed
-- and metadata JSON carrying stage/source fields.

-- 1) Daily hydration source distribution
select
  date_trunc('day', created_at) as day,
  coalesce(metadata->>'source', 'none') as source,
  count(*) as event_count
from telemetry_events
where event_type = 'runtime_state_hydrated'
group by 1, 2
order by 1 desc, 2;

-- 2) Daily fallback ratio (non-table / total hydrated)
with daily as (
  select
    date_trunc('day', created_at) as day,
    count(*) filter (where coalesce(metadata->>'source', 'none') = 'table') as table_count,
    count(*) filter (where coalesce(metadata->>'source', 'none') <> 'table') as fallback_count,
    count(*) as total_count
  from telemetry_events
  where event_type = 'runtime_state_hydrated'
  group by 1
)
select
  day,
  table_count,
  fallback_count,
  total_count,
  case when total_count = 0 then 0 else fallback_count::decimal / total_count end as fallback_ratio
from daily
order by day desc;

-- 3) Unexpected hydration failure trend
select
  date_trunc('day', created_at) as day,
  count(*) as failure_count
from telemetry_events
where event_type = 'runtime_state_hydration_failed'
group by 1
order by 1 desc;

-- 4) Suggested alert seed (adjust thresholds per traffic baseline)
-- Starter defaults align with `ISLAND_RUN_RUNTIME_HYDRATION_ALERT_DEFAULTS` in code:
--   fallbackRatio24h = 0.35
--   failureCount24h = 25
--   minHydrationEvents24h = 20
with last_24h_hydration as (
  select
    count(*) filter (where coalesce(metadata->>'source', 'none') = 'table') as table_count,
    count(*) filter (where coalesce(metadata->>'source', 'none') <> 'table') as fallback_count,
    count(*) as total_count
  from telemetry_events
  where event_type = 'runtime_state_hydrated'
    and created_at >= now() - interval '24 hours'
),
last_24h_failures as (
  select count(*) as failure_count
  from telemetry_events
  where event_type = 'runtime_state_hydration_failed'
    and created_at >= now() - interval '24 hours'
)
select
  h.table_count,
  h.fallback_count,
  h.total_count,
  case when h.total_count = 0 then 0 else h.fallback_count::decimal / h.total_count end as fallback_ratio,
  f.failure_count,
  (case when h.total_count < 20 then false else h.fallback_count::decimal / h.total_count > 0.35 end) as fallback_alert,
  (f.failure_count >= 25) as failure_alert
from last_24h_hydration h
cross join last_24h_failures f;
