begin;

create extension if not exists pgtap with schema extensions;

select plan(9);

select has_function(
  'public',
  'increment_user_minigame_tickets_by_event',
  array['uuid', 'text', 'integer'],
  'minigame ticket fulfillment RPC exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'public.increment_user_minigame_tickets_by_event(uuid,text,integer)'::regprocedure),
  'fulfillment RPC is SECURITY DEFINER for webhook use'
);
select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'public.increment_user_minigame_tickets_by_event(uuid,text,integer)'::regprocedure),
  'search_path=""',
  'fulfillment RPC pins an empty search path'
);
select ok(
  not has_function_privilege('anon', 'public.increment_user_minigame_tickets_by_event(uuid,text,integer)', 'EXECUTE'),
  'anon cannot credit tickets'
);
select ok(
  not has_function_privilege('authenticated', 'public.increment_user_minigame_tickets_by_event(uuid,text,integer)', 'EXECUTE'),
  'authenticated clients cannot credit tickets directly'
);
select ok(
  has_function_privilege('service_role', 'public.increment_user_minigame_tickets_by_event(uuid,text,integer)', 'EXECUTE'),
  'service role can fulfill a verified webhook'
);
select throws_ok(
  $$ select public.increment_user_minigame_tickets_by_event(null, 'space_excavator', 10) $$,
  'P0001',
  'p_user_id is required',
  'null user is rejected'
);
select throws_ok(
  $$ select public.increment_user_minigame_tickets_by_event('11111111-1111-4111-8111-111111111111', 'not_an_event', 10) $$,
  'P0001',
  'p_event_id must be one of feeding_frenzy|lucky_spin|space_excavator|companion_feast',
  'unknown event is rejected'
);
select throws_ok(
  $$ select public.increment_user_minigame_tickets_by_event('11111111-1111-4111-8111-111111111111', 'space_excavator', 0) $$,
  'P0001',
  'p_delta must be a positive integer',
  'non-positive credit is rejected'
);
select * from finish();

rollback;
