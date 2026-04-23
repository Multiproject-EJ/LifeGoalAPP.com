-- M39: Atomic island_run_runtime_state.minigame_tickets_by_event increment RPC
-- for Stripe minigame ticket pack fulfillment.

CREATE OR REPLACE FUNCTION public.increment_user_minigame_tickets_by_event(
  p_user_id uuid,
  p_event_id text,
  p_delta integer
)
RETURNS TABLE(user_id uuid, minigame_tickets_by_event jsonb)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_event_id IS NULL OR btrim(p_event_id) = '' THEN
    RAISE EXCEPTION 'p_event_id is required';
  END IF;

  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be a positive integer';
  END IF;

  IF p_event_id NOT IN ('feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast') THEN
    RAISE EXCEPTION 'p_event_id must be one of feeding_frenzy|lucky_spin|space_excavator|companion_feast';
  END IF;

  INSERT INTO public.island_run_runtime_state (user_id, minigame_tickets_by_event)
  VALUES (p_user_id, jsonb_build_object(p_event_id, p_delta))
  ON CONFLICT (user_id)
  DO UPDATE
    SET minigame_tickets_by_event = jsonb_set(
      coalesce(public.island_run_runtime_state.minigame_tickets_by_event, '{}'::jsonb),
      ARRAY[p_event_id],
      to_jsonb(
        coalesce(
          (public.island_run_runtime_state.minigame_tickets_by_event ->> p_event_id)::integer,
          0
        ) + p_delta
      ),
      true
    ),
    updated_at = now();

  RETURN QUERY
  SELECT s.user_id, s.minigame_tickets_by_event
  FROM public.island_run_runtime_state s
  WHERE s.user_id = p_user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_minigame_tickets_by_event(uuid, text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_minigame_tickets_by_event(uuid, text, integer) TO service_role;

COMMENT ON FUNCTION public.increment_user_minigame_tickets_by_event(uuid, text, integer)
  IS 'Atomically increments island_run_runtime_state.minigame_tickets_by_event[p_event_id]; creates runtime-state row if missing.';
