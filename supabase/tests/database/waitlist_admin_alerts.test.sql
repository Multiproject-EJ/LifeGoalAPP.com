begin;

create extension if not exists pgtap with schema extensions;

select plan(15);

select has_table('public', 'public_launch_waitlist', 'public launch waitlist exists');
select ok(
  (select relrowsecurity from pg_class where oid = 'public.public_launch_waitlist'::regclass),
  'public launch waitlist has RLS enabled'
);
select ok(
  has_table_privilege('anon', 'public.public_launch_waitlist', 'INSERT'),
  'anonymous visitors can join the waitlist'
);
select ok(
  not has_table_privilege('anon', 'public.public_launch_waitlist', 'SELECT'),
  'anonymous visitors cannot read the waitlist'
);
select ok(
  not has_table_privilege('authenticated', 'public.public_launch_waitlist', 'SELECT'),
  'signed-in users cannot read the waitlist'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'public.public_launch_waitlist'::regclass
      and tgname = 'admin_alert_on_waitlist_join'
      and not tgisinternal
  ),
  'waitlist admin alert trigger exists'
);
select ok(
  not has_function_privilege('anon', 'public.queue_waitlist_admin_alert()', 'EXECUTE'),
  'anonymous visitors cannot call the waitlist alert function directly'
);
select ok(
  not has_function_privilege('authenticated', 'public.queue_waitlist_admin_alert()', 'EXECUTE'),
  'signed-in users cannot call the waitlist alert function directly'
);
select ok(
  exists (
    select 1 from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'admin_alert_on_signup'
      and not tgisinternal
  ),
  'new account admin alert trigger exists'
);
select ok(
  not has_function_privilege('anon', 'public.queue_signup_admin_alert()', 'EXECUTE'),
  'anonymous visitors cannot call the signup alert function directly'
);
select ok(
  not has_function_privilege('authenticated', 'public.queue_signup_admin_alert()', 'EXECUTE'),
  'signed-in users cannot call the signup alert function directly'
);

set local role anon;
select lives_ok(
  $$
    insert into public.public_launch_waitlist (email, source, landing_variant)
    values ('waitlist-alert-test@example.test', 'world_home', 'split_light_dark')
  $$,
  'an anonymous waitlist signup succeeds'
);
reset role;

select is(
  (select alert_type from public.admin_alerts where event_key like 'waitlist:%' order by created_at desc limit 1),
  'waitlist_joined',
  'the signup creates the correct private admin alert'
);
select is(
  (select summary from public.admin_alerts where event_key like 'waitlist:%' order by created_at desc limit 1),
  'Someone joined the HabitGame launch waitlist.',
  'the alert uses the expected privacy-safe summary'
);
select ok(
  not exists (
    select 1 from public.admin_alerts
    where event_key like 'waitlist:%'
      and (summary ilike '%waitlist-alert-test@example.test%' or metadata::text ilike '%waitlist-alert-test@example.test%')
  ),
  'the admin alert does not copy the visitor email'
);

select * from finish();

rollback;
