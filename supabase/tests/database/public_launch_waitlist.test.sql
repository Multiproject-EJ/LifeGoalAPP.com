begin;

create extension if not exists pgtap with schema extensions;

select plan(17);

select has_table('public', 'public_launch_waitlist', 'public waitlist table exists');
select has_column('public', 'public_launch_waitlist', 'channel', 'waitlist records notification channel');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.public_launch_waitlist'::regclass),
  'public waitlist has RLS enabled'
);
select ok(has_table_privilege('anon', 'public.public_launch_waitlist', 'INSERT'), 'anon can insert');
select ok(not has_table_privilege('anon', 'public.public_launch_waitlist', 'SELECT'), 'anon cannot read');
select ok(not has_table_privilege('anon', 'public.public_launch_waitlist', 'UPDATE'), 'anon cannot update');
select ok(not has_table_privilege('anon', 'public.public_launch_waitlist', 'DELETE'), 'anon cannot delete');
select ok(has_table_privilege('authenticated', 'public.public_launch_waitlist', 'INSERT'), 'authenticated can insert');
select ok(not has_table_privilege('authenticated', 'public.public_launch_waitlist', 'SELECT'), 'authenticated cannot read');
select has_trigger(
  'public',
  'public_launch_waitlist',
  'public_launch_waitlist_rate_limit',
  'waitlist inserts have a database rate-limit trigger'
);
select has_function(
  'private',
  'enforce_public_launch_waitlist_rate_limit',
  array[]::text[],
  'private waitlist rate limiter exists'
);
select ok(
  (select prosecdef from pg_proc where oid = 'private.enforce_public_launch_waitlist_rate_limit()'::regprocedure),
  'rate-limit trigger intentionally writes to its private counter table'
);
select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'private.enforce_public_launch_waitlist_rate_limit()'::regprocedure),
  'search_path=""',
  'rate-limit trigger pins an empty search path'
);
select ok(
  not has_function_privilege('anon', 'private.enforce_public_launch_waitlist_rate_limit()', 'EXECUTE'),
  'anon cannot execute the trigger function directly'
);

select set_config('request.headers', '{"x-forwarded-for":"203.0.113.10"}', true);
set local role anon;

select lives_ok(
  $$insert into public.public_launch_waitlist (email, source, channel, landing_variant)
    values ('waitlist-one@example.invalid', 'world_home', 'email', 'split_light_dark')$$,
  'anonymous landing-page signup succeeds'
);

select lives_ok(
  $$
    insert into public.public_launch_waitlist (email, source, channel, landing_variant) values
      ('waitlist-two@example.invalid', 'island_3_gate', 'push', 'split_light_dark'),
      ('waitlist-three@example.invalid', 'world_home', 'email', 'split_light_dark'),
      ('waitlist-four@example.invalid', 'world_home', 'email', 'split_light_dark'),
      ('waitlist-five@example.invalid', 'world_home', 'email', 'split_light_dark');
  $$,
  'five anonymous attempts in one window are accepted'
);

select throws_ok(
  $$insert into public.public_launch_waitlist (email, source, channel, landing_variant)
    values ('waitlist-six@example.invalid', 'world_home', 'email', 'split_light_dark')$$,
  'PGRST',
  null,
  'a sixth attempt in the same ten-minute window is rejected'
);

select * from finish();

rollback;
