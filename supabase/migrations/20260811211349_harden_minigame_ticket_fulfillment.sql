-- Production-readiness repair: the webhook already expects this RPC, but the
-- live project did not have it on 2026-08-11. This migration is intentionally
-- idempotent and is not applied by the repair automation.

create or replace function public.increment_user_minigame_tickets_by_event(
  p_user_id uuid,
  p_event_id text,
  p_delta integer
)
returns table(user_id uuid, minigame_tickets_by_event jsonb)
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_user_id is null then
    raise exception 'p_user_id is required';
  end if;

  if p_event_id is null or btrim(p_event_id) = '' then
    raise exception 'p_event_id is required';
  end if;

  if p_event_id not in ('feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast') then
    raise exception 'p_event_id must be one of feeding_frenzy|lucky_spin|space_excavator|companion_feast';
  end if;

  if p_delta is null or p_delta <= 0 then
    raise exception 'p_delta must be a positive integer';
  end if;

  insert into public.island_run_runtime_state (user_id, minigame_tickets_by_event)
  values (p_user_id, jsonb_build_object(p_event_id, p_delta))
  on conflict on constraint island_run_runtime_state_pkey
  do update
    set minigame_tickets_by_event = jsonb_set(
      coalesce(public.island_run_runtime_state.minigame_tickets_by_event, '{}'::jsonb),
      array[p_event_id],
      to_jsonb(
        coalesce(
          (public.island_run_runtime_state.minigame_tickets_by_event ->> p_event_id)::integer,
          0
        ) + p_delta
      ),
      true
    ),
    updated_at = now();

  return query
  select state.user_id, state.minigame_tickets_by_event
  from public.island_run_runtime_state as state
  where state.user_id = p_user_id;
end;
$$;

revoke execute on function public.increment_user_minigame_tickets_by_event(uuid, text, integer)
  from public, anon, authenticated;
grant execute on function public.increment_user_minigame_tickets_by_event(uuid, text, integer)
  to service_role;

comment on function public.increment_user_minigame_tickets_by_event(uuid, text, integer)
  is 'Service-role-only atomic fulfillment for Stripe minigame ticket packs.';
