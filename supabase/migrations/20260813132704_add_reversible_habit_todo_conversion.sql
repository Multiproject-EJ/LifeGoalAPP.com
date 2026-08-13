-- Reversible Habit <-> Todo conversion.
--
-- The source habit is archived rather than deleted so its completion history
-- remains attached to the same id. The todo keeps an inert snapshot as a
-- recovery fallback; normal todo reads and completion logic do not use it.

alter table public.today_todos
  add column if not exists source_habit_id uuid null
    references public.habits_v2(id) on delete set null,
  add column if not exists source_habit_snapshot jsonb null;

alter table public.today_todos
  add constraint today_todos_source_habit_snapshot_required
  check (source_habit_id is null or source_habit_snapshot is not null);

create unique index if not exists today_todos_one_active_conversion_per_habit
  on public.today_todos (source_habit_id)
  where source_habit_id is not null and completed = false;

comment on column public.today_todos.source_habit_id is
  'Original habit archived by a Habit to Todo conversion; ignored by normal todo behavior.';
comment on column public.today_todos.source_habit_snapshot is
  'Versioned private recovery snapshot for restoring habit settings after an accidental conversion.';

create or replace function public.convert_habit_to_today_todo(
  p_habit_id uuid,
  p_todo_date date,
  p_order_index integer default 0
)
returns public.today_todos
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_habit public.habits_v2%rowtype;
  v_todo public.today_todos%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  if p_todo_date is null or p_todo_date < current_date then
    raise exception 'Todo date must be today or later';
  end if;

  select *
  into v_habit
  from public.habits_v2
  where id = p_habit_id
    and user_id = v_user_id
    and archived = false
    and status = 'active'
  for update;

  if not found then
    raise exception 'Active habit not found';
  end if;

  insert into public.today_todos (
    user_id,
    todo_date,
    title,
    notes,
    order_index,
    source_habit_id,
    source_habit_snapshot
  ) values (
    v_user_id,
    p_todo_date,
    v_habit.title,
    null,
    greatest(coalesce(p_order_index, 0), 0),
    v_habit.id,
    (to_jsonb(v_habit) - 'user_id') || jsonb_build_object('snapshot_version', 1)
  )
  returning * into v_todo;

  update public.habits_v2
  set archived = true,
      status = 'archived',
      paused_at = null,
      paused_reason = null,
      resume_on = null,
      deactivated_at = null,
      deactivated_reason = null
  where id = v_habit.id
    and user_id = v_user_id;

  return v_todo;
end;
$$;

create or replace function public.convert_today_todo_to_habit(
  p_todo_id uuid
)
returns public.habits_v2
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_todo public.today_todos%rowtype;
  v_snapshot public.habits_v2%rowtype;
  v_habit public.habits_v2%rowtype;
  v_source_habit_id uuid;
begin
  if v_user_id is null then
    raise exception 'Authentication required';
  end if;

  select *
  into v_todo
  from public.today_todos
  where id = p_todo_id
    and user_id = v_user_id
    and completed = false
  for update;

  if not found then
    raise exception 'Active todo not found';
  end if;

  if v_todo.source_habit_snapshot is not null then
    select populated.*
    into v_snapshot
    from jsonb_populate_record(
      null::public.habits_v2,
      v_todo.source_habit_snapshot - 'snapshot_version'
    ) as populated;
  end if;

  v_source_habit_id := coalesce(v_todo.source_habit_id, v_snapshot.id);

  if v_source_habit_id is not null then
    select *
    into v_habit
    from public.habits_v2
    where id = v_source_habit_id
      and user_id = v_user_id
    for update;
  end if;

  if v_habit.id is not null then
    update public.habits_v2
    set title = coalesce(v_snapshot.title, v_todo.title),
        emoji = v_snapshot.emoji,
        type = coalesce(v_snapshot.type, 'boolean'),
        target_num = v_snapshot.target_num,
        target_unit = v_snapshot.target_unit,
        schedule = coalesce(
          v_snapshot.schedule,
          jsonb_strip_nulls(jsonb_build_object('mode', 'daily', 'notes', v_todo.notes))
        ),
        allow_skip = coalesce(v_snapshot.allow_skip, true),
        start_date = coalesce(v_snapshot.start_date, current_date),
        archived = false,
        status = 'active',
        paused_at = null,
        paused_reason = null,
        resume_on = null,
        deactivated_at = null,
        deactivated_reason = null,
        autoprog = v_snapshot.autoprog,
        domain_key = v_snapshot.domain_key,
        goal_id = v_snapshot.goal_id,
        habit_environment = v_snapshot.habit_environment,
        done_ish_config = v_snapshot.done_ish_config,
        environment_context = v_snapshot.environment_context,
        environment_score = v_snapshot.environment_score,
        environment_risk_tags = coalesce(v_snapshot.environment_risk_tags, array[]::text[]),
        environment_last_audited_at = v_snapshot.environment_last_audited_at,
        habit_intent = coalesce(v_snapshot.habit_intent, 'build'),
        duration_mode = coalesce(v_snapshot.duration_mode, 'none'),
        duration_value = v_snapshot.duration_value,
        duration_unit = v_snapshot.duration_unit,
        duration_start_at = v_snapshot.duration_start_at,
        duration_end_at = v_snapshot.duration_end_at,
        on_duration_end = v_snapshot.on_duration_end
    where id = v_source_habit_id
      and user_id = v_user_id
    returning * into v_habit;
  else
    insert into public.habits_v2 (
      id,
      user_id,
      title,
      emoji,
      type,
      target_num,
      target_unit,
      schedule,
      allow_skip,
      start_date,
      archived,
      status,
      autoprog,
      domain_key,
      goal_id,
      habit_environment,
      done_ish_config,
      environment_context,
      environment_score,
      environment_risk_tags,
      environment_last_audited_at,
      habit_intent,
      duration_mode,
      duration_value,
      duration_unit,
      duration_start_at,
      duration_end_at,
      on_duration_end
    ) values (
      coalesce(v_source_habit_id, gen_random_uuid()),
      v_user_id,
      coalesce(v_snapshot.title, v_todo.title),
      coalesce(v_snapshot.emoji, '✅'),
      coalesce(v_snapshot.type, 'boolean'),
      v_snapshot.target_num,
      v_snapshot.target_unit,
      coalesce(
        v_snapshot.schedule,
        jsonb_strip_nulls(jsonb_build_object('mode', 'daily', 'notes', v_todo.notes))
      ),
      coalesce(v_snapshot.allow_skip, true),
      coalesce(v_snapshot.start_date, current_date),
      false,
      'active',
      coalesce(v_snapshot.autoprog, jsonb_build_object(
        'tier', 'standard',
        'baseSchedule', jsonb_strip_nulls(jsonb_build_object('mode', 'daily', 'notes', v_todo.notes)),
        'baseTarget', null,
        'lastShiftAt', null,
        'lastShiftType', null
      )),
      v_snapshot.domain_key,
      v_snapshot.goal_id,
      v_snapshot.habit_environment,
      v_snapshot.done_ish_config,
      v_snapshot.environment_context,
      v_snapshot.environment_score,
      coalesce(v_snapshot.environment_risk_tags, array[]::text[]),
      v_snapshot.environment_last_audited_at,
      coalesce(v_snapshot.habit_intent, 'build'),
      coalesce(v_snapshot.duration_mode, 'none'),
      v_snapshot.duration_value,
      v_snapshot.duration_unit,
      v_snapshot.duration_start_at,
      v_snapshot.duration_end_at,
      v_snapshot.on_duration_end
    )
    returning * into v_habit;
  end if;

  update public.today_todos
  set completed = true,
      completed_at = now()
  where id = v_todo.id
    and user_id = v_user_id;

  return v_habit;
end;
$$;

revoke all on function public.convert_habit_to_today_todo(uuid, date, integer) from public, anon;
revoke all on function public.convert_today_todo_to_habit(uuid) from public, anon;
grant execute on function public.convert_habit_to_today_todo(uuid, date, integer) to authenticated, service_role;
grant execute on function public.convert_today_todo_to_habit(uuid) to authenticated, service_role;

comment on function public.convert_habit_to_today_todo(uuid, date, integer) is
  'Atomically archives the caller-owned habit and creates a caller-owned todo with inert recovery metadata.';
comment on function public.convert_today_todo_to_habit(uuid) is
  'Atomically restores the original caller-owned habit (or creates a fallback habit) and completes the source todo.';
