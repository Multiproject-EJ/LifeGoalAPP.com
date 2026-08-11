begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select ok(
  has_function_privilege('authenticated', 'public.claim_daily_spin_habit_bonus(date)', 'EXECUTE'),
  'authenticated users retain the guarded daily-spin claim'
);
select ok(
  not has_function_privilege('anon', 'public.claim_daily_spin_habit_bonus(date)', 'EXECUTE'),
  'anon cannot claim daily-spin bonuses'
);
select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'public.claim_daily_spin_habit_bonus(date)'::regprocedure),
  'search_path=""',
  'daily-spin claim pins an empty search path'
);
select matches(
  (select prosrc from pg_proc where oid = 'public.claim_daily_spin_habit_bonus(date)'::regprocedure),
  'p_claim_date is null or p_claim_date <> current_date',
  'daily-spin claim rejects historical and future dates'
);
select matches(
  (select prosrc from pg_proc where oid = 'public.claim_daily_spin_habit_bonus(date)'::regprocedure),
  'from public.habit_completions',
  'daily-spin claim verifies an own completed habit'
);
select ok(
  not has_function_privilege('authenticated', 'public.claim_combined_journey_reward(integer)', 'EXECUTE'),
  'authenticated clients cannot self-award unchecked Combined Journey thresholds'
);
select ok(
  has_function_privilege('service_role', 'public.claim_combined_journey_reward(integer)', 'EXECUTE'),
  'service role retains the quarantined Combined Journey function'
);
select ok(
  not has_function_privilege('authenticated', 'public.get_commitment_contract_sweep_health()', 'EXECUTE'),
  'authenticated users cannot read global sweep telemetry'
);
select ok(
  has_function_privilege('service_role', 'public.get_commitment_contract_sweep_health()', 'EXECUTE'),
  'service role retains operational sweep telemetry access'
);

select * from finish();

rollback;
