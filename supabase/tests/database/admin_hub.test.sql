begin;

create extension if not exists pgtap with schema extensions;

select plan(10);

select has_column('public', 'admin_alerts', 'pushed_at', 'admin alerts track when they were pushed');
select has_function('public', 'get_admin_overview', 'admin overview function exists');
select has_function('public', 'get_admin_waitlist', array['integer', 'integer'], 'admin waitlist function exists');

select ok(
  not has_function_privilege('anon', 'public.get_admin_overview()', 'EXECUTE'),
  'anonymous visitors cannot call the admin overview'
);
select ok(
  not has_function_privilege('anon', 'public.get_admin_waitlist(integer, integer)', 'EXECUTE'),
  'anonymous visitors cannot call the admin waitlist'
);
select ok(
  not has_table_privilege('authenticated', 'public.public_launch_waitlist', 'SELECT'),
  'signed-in users still cannot read the waitlist table directly'
);

insert into auth.users (id, email)
values
  ('00000000-0000-0000-0000-00000000a001', 'admin-hub-admin@example.test'),
  ('00000000-0000-0000-0000-00000000a002', 'admin-hub-player@example.test');
insert into public.admin_users (user_id, role, active)
values ('00000000-0000-0000-0000-00000000a001', 'admin', true);
insert into public.public_launch_waitlist (email, source, landing_variant)
values ('admin-hub-guest@example.test', 'world_home', 'split_light_dark');

set local role authenticated;

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000a002", "role": "authenticated"}';
select throws_ok(
  $$ select public.get_admin_waitlist(50, 0) $$,
  'Admin access required',
  'a non-admin player cannot read the waitlist'
);
select throws_ok(
  $$ select public.get_admin_overview() $$,
  'Admin access required',
  'a non-admin player cannot read the admin overview'
);

set local request.jwt.claims = '{"sub": "00000000-0000-0000-0000-00000000a001", "role": "authenticated"}';
select ok(
  exists (select 1 from public.get_admin_waitlist(50, 0) where email = 'admin-hub-guest@example.test'),
  'an active admin can read waitlist emails'
);
select ok(
  (public.get_admin_overview() ->> 'waitlist_total')::integer >= 1,
  'an active admin sees the waitlist total'
);

reset role;

select * from finish();

rollback;
