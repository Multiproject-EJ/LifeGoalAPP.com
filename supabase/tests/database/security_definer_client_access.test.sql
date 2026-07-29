begin;

create extension if not exists pgtap with schema extensions;

select plan(12);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.evaluate_due_commitment_contracts(uuid, integer)'::regprocedure
  ),
  'the internal contract evaluator is SECURITY INVOKER'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.evaluate_due_commitment_contracts(uuid, integer)',
    'EXECUTE'
  ),
  'anon cannot execute the internal contract evaluator'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.evaluate_due_commitment_contracts(uuid, integer)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the internal contract evaluator'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.evaluate_due_commitment_contracts(uuid, integer)',
    'EXECUTE'
  ),
  'service_role retains access to the internal contract evaluator'
);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.get_shared_campaign(text)'::regprocedure
  ),
  'the server-only campaign share reader is SECURITY INVOKER'
);
select ok(
  not has_function_privilege('anon', 'public.get_shared_campaign(text)', 'EXECUTE'),
  'anon cannot execute the unsanitised campaign share reader'
);
select ok(
  not has_function_privilege('authenticated', 'public.get_shared_campaign(text)', 'EXECUTE'),
  'authenticated clients cannot execute the unsanitised campaign share reader'
);
select ok(
  has_function_privilege('service_role', 'public.get_shared_campaign(text)', 'EXECUTE'),
  'service_role retains access to the campaign share reader'
);

select ok(
  not (
    select prosecdef
    from pg_proc
    where oid = 'public.get_shared_campaign_live_events(text, integer)'::regprocedure
  ),
  'the server-only campaign event reader is SECURITY INVOKER'
);
select ok(
  not has_function_privilege(
    'anon',
    'public.get_shared_campaign_live_events(text, integer)',
    'EXECUTE'
  ),
  'anon cannot execute the unsanitised campaign event reader'
);
select ok(
  not has_function_privilege(
    'authenticated',
    'public.get_shared_campaign_live_events(text, integer)',
    'EXECUTE'
  ),
  'authenticated clients cannot execute the unsanitised campaign event reader'
);
select ok(
  has_function_privilege(
    'service_role',
    'public.get_shared_campaign_live_events(text, integer)',
    'EXECUTE'
  ),
  'service_role retains access to the campaign event reader'
);

select * from finish();

rollback;
