begin;

select plan(12);

select has_column('public', 'today_todos', 'source_habit_id');
select has_column('public', 'today_todos', 'source_habit_snapshot');
select col_type_is('public', 'today_todos', 'source_habit_snapshot', 'jsonb');

select has_function(
  'public',
  'convert_habit_to_today_todo',
  array['uuid', 'date', 'integer']
);
select has_function(
  'public',
  'convert_today_todo_to_habit',
  array['uuid']
);

select function_privs_are(
  'public',
  'convert_habit_to_today_todo',
  array['uuid', 'date', 'integer'],
  'anon',
  array[]::text[]
);
select function_privs_are(
  'public',
  'convert_today_todo_to_habit',
  array['uuid'],
  'anon',
  array[]::text[]
);
select function_privs_are(
  'public',
  'convert_habit_to_today_todo',
  array['uuid', 'date', 'integer'],
  'authenticated',
  array['EXECUTE']
);
select function_privs_are(
  'public',
  'convert_today_todo_to_habit',
  array['uuid'],
  'authenticated',
  array['EXECUTE']
);

select is(
  (select prosecdef from pg_proc where oid = 'public.convert_habit_to_today_todo(uuid,date,integer)'::regprocedure),
  false,
  'Habit-to-todo conversion runs with caller privileges'
);
select is(
  (select prosecdef from pg_proc where oid = 'public.convert_today_todo_to_habit(uuid)'::regprocedure),
  false,
  'Todo-to-habit conversion runs with caller privileges'
);
select is(
  (
    select proconfig @> array['search_path=""']
    from pg_proc
    where oid = 'public.convert_habit_to_today_todo(uuid,date,integer)'::regprocedure
  ),
  true,
  'Conversion function has an empty fixed search_path'
);

select * from finish();
rollback;
