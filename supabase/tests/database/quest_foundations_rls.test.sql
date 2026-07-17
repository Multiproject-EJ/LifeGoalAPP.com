begin;

create extension if not exists pgtap with schema extensions;

select plan(16);

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

select * from finish();
rollback;
