begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

select has_table('public', 'ai_task_usage', 'ai task usage table exists');
select ok(
  not has_function_privilege('authenticated', 'public.consume_ai_task_quota(uuid, text)', 'EXECUTE'),
  'signed-in users cannot consume or reset AI quota directly'
);
select ok(
  not has_function_privilege('anon', 'public.consume_ai_task_quota(uuid, text)', 'EXECUTE'),
  'anonymous visitors cannot call the AI quota function'
);
select ok(
  not has_table_privilege('authenticated', 'public.ai_task_usage', 'SELECT'),
  'signed-in users cannot read AI usage rows'
);

insert into auth.users (id, email)
values ('00000000-0000-0000-0000-00000000b001', 'ai-quota-player@example.test');

select ok(
  public.consume_ai_task_quota('00000000-0000-0000-0000-00000000b001', 'level_2'),
  'the first level_2 request is allowed'
);

-- Use up the rest of the 12 level_2 requests for today.
select public.consume_ai_task_quota('00000000-0000-0000-0000-00000000b001', 'level_2')
from generate_series(1, 11);

select ok(
  not public.consume_ai_task_quota('00000000-0000-0000-0000-00000000b001', 'level_2'),
  'the 13th level_2 request of the day is refused'
);
select ok(
  public.consume_ai_task_quota('00000000-0000-0000-0000-00000000b001', 'level_1'),
  'level_1 has its own separate limit'
);
select ok(
  not public.consume_ai_task_quota('00000000-0000-0000-0000-00000000b001', 'level_9'),
  'unknown levels are refused'
);

select * from finish();
rollback;
