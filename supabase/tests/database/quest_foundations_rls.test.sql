begin;

create extension if not exists pgtap with schema extensions;

select plan(29);

select has_table('public', 'quests', 'quests table exists');
select has_table('public', 'quest_habit_links', 'quest habit links table exists');
select has_table('public', 'quest_reflections', 'quest reflections table exists');

select ok(
  (select relrowsecurity from pg_class where oid = 'public.quests'::regclass),
  'quests has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.quest_habit_links'::regclass),
  'quest habit links has RLS enabled'
);
select ok(
  (select relrowsecurity from pg_class where oid = 'public.quest_reflections'::regclass),
  'quest reflections has RLS enabled'
);

select is(
  (select string_agg(policyname, ',' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'quests'),
  'quests_delete_own,quests_insert_own_links,quests_select_own,quests_update_own_links',
  'quests exposes only the intended ownership policies'
);
select is(
  (select string_agg(policyname, ',' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'quest_habit_links'),
  'quest_habit_links_delete_own,quest_habit_links_insert_own_entities,quest_habit_links_select_own,quest_habit_links_update_own_entities',
  'quest habit links verify owned entities'
);
select is(
  (select string_agg(policyname, ',' order by policyname) from pg_policies where schemaname = 'public' and tablename = 'quest_reflections'),
  'quest_reflections_delete_own,quest_reflections_insert_own_quest,quest_reflections_select_own,quest_reflections_update_own_quest',
  'quest reflections verify the owned Quest'
);

select has_function(
  'public',
  'save_quest_bundle',
  array['jsonb', 'jsonb', 'jsonb'],
  'atomic Quest bundle function exists'
);
select ok(
  not (select prosecdef from pg_proc where oid = 'public.save_quest_bundle(jsonb,jsonb,jsonb)'::regprocedure),
  'atomic Quest save is SECURITY INVOKER'
);
select is(
  (select array_to_string(proconfig, ',') from pg_proc where oid = 'public.save_quest_bundle(jsonb,jsonb,jsonb)'::regprocedure),
  'search_path=""',
  'atomic Quest save pins an empty search path'
);
select ok(
  has_function_privilege('authenticated', 'public.save_quest_bundle(jsonb,jsonb,jsonb)', 'EXECUTE'),
  'authenticated users can execute atomic Quest save'
);
select ok(
  not has_function_privilege('anon', 'public.save_quest_bundle(jsonb,jsonb,jsonb)', 'EXECUTE'),
  'anonymous users cannot execute atomic Quest save'
);
select ok(
  has_table_privilege('authenticated', 'public.quests', 'SELECT,INSERT,UPDATE,DELETE'),
  'authenticated users have explicit Quest Data API privileges'
);
select ok(
  not has_table_privilege('anon', 'public.quests', 'SELECT'),
  'anonymous users cannot read Quests'
);

-- Behavioral ownership checks. Use deterministic users so the bundle can be
-- exercised under the same authenticated role used by the Data API.
insert into auth.users (
  id, instance_id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at
) values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'quest-owner@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated', 'authenticated', 'quest-other@example.test', '',
    now(), '{}'::jsonb, '{}'::jsonb, now(), now()
  );

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select lives_ok(
  $$
    insert into public.goals (id, user_id, title, status_tag)
    values (
      'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
      '11111111-1111-4111-8111-111111111111',
      'Build the healthier season',
      'active'
    )
  $$,
  'an authenticated user can create their own Goal'
);

select throws_ok(
  $$
    insert into public.goals (user_id, title)
    values ('22222222-2222-4222-8222-222222222222', 'Not mine')
  $$,
  '42501',
  'new row violates row-level security policy for table "goals"',
  'an authenticated user cannot create a Goal for another user'
);

select lives_ok(
  $$
    select public.save_quest_bundle(
      '{
        "id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "user_id":"11111111-1111-4111-8111-111111111111",
        "goal_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "title":"Find a sustainable breakfast loop",
        "outcome":"Choose and eat a fitting breakfast on five mornings",
        "quest_kind":"behavior_experiment",
        "status":"active",
        "starts_on":"2026-07-17",
        "ends_on":"2026-07-31",
        "life_wheel_category":"body_health",
        "smart_definition":{"measure":"5 mornings"},
        "behavior_design":{"better_loop":"choose from saved meal alternatives"},
        "reflection_plan":{"cadence":"weekly"}
      }'::jsonb,
      '[{
        "habit_id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "role":"keystone"
      }]'::jsonb,
      '{
        "id":"cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        "user_id":"11111111-1111-4111-8111-111111111111",
        "goal_id":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
        "title":"Eat a healthy breakfast",
        "emoji":"🥣",
        "type":"boolean",
        "status":"active",
        "schedule":{"mode":"daily"},
        "start_date":"2026-07-17",
        "archived":false,
        "habit_intent":"build"
      }'::jsonb
    )
  $$,
  'atomic Quest save creates the Quest, new habit, and link'
);

select is(
  (select count(*) from public.quests where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1::bigint,
  'Quest owner can read the saved Quest'
);
select is(
  (select count(*) from public.habits_v2 where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  1::bigint,
  'Quest owner can read the newly created habit'
);
select is(
  (select count(*) from public.quest_habit_links where quest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1::bigint,
  'Quest owner can read the keystone link'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select is(
  (select count(*) from public.quests where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'another user cannot read the Quest'
);
select is(
  (select count(*) from public.habits_v2 where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  0::bigint,
  'another user cannot read the Quest habit'
);
select is(
  (select count(*) from public.quest_habit_links where quest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'another user cannot read the Quest-habit link'
);

select throws_ok(
  $$
    select public.save_quest_bundle(
      '{
        "id":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        "user_id":"11111111-1111-4111-8111-111111111111",
        "title":"Try to claim another user Quest"
      }'::jsonb,
      '[]'::jsonb,
      null
    )
  $$,
  '42501',
  'Quest owner does not match the authenticated user.',
  'another user cannot update the Quest through the atomic function'
);

select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$
    insert into public.quest_reflections (
      user_id, quest_id, reflection_type, content, loop_observation, next_experiment
    ) values (
      '11111111-1111-4111-8111-111111111111',
      'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
      'loop_review',
      'Breakfast worked when the choice was made the night before.',
      '{"cue":"evening plan","result":"less morning friction"}'::jsonb,
      'Put the bowl and recipe card out before bed.'
    )
  $$,
  'Quest owner can add behavior-loop evidence'
);
select is(
  (select count(*) from public.quest_reflections where quest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  1::bigint,
  'Quest owner can read their reflection'
);

select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);
select is(
  (select count(*) from public.quest_reflections where quest_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  0::bigint,
  'another user cannot read the Quest reflection'
);

select * from finish();
rollback;
