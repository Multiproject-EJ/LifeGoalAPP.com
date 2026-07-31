alter table public.island_run_runtime_state
  add column if not exists concord_roll_protection_state jsonb not null
  default '{"rollsTaken":0,"rollsSinceFragment":0}'::jsonb;

comment on column public.island_run_runtime_state.concord_roll_protection_state is
  'Canonical Island 1 Concord pacing counters: total eligible rolls and consecutive rolls since a fragment pickup.';

with existing_progress as (
  select
    user_id,
    least(
      9,
      case
        when jsonb_typeof(tech_collection_by_island -> '1') = 'array'
          then jsonb_array_length(tech_collection_by_island -> '1')
        else 0
      end
    ) as collected_count
  from public.island_run_runtime_state
)
update public.island_run_runtime_state as runtime
set concord_roll_protection_state = jsonb_build_object(
  'rollsTaken', case existing_progress.collected_count
    when 0 then 0
    when 1 then 10
    when 2 then 16
    when 3 then 22
    when 4 then 28
    when 5 then 34
    when 6 then 40
    when 7 then 45
    when 8 then 50
    else 55
  end,
  'rollsSinceFragment', case
    when existing_progress.collected_count between 1 and 8 then 6
    else 0
  end
)
from existing_progress
where runtime.user_id = existing_progress.user_id;
