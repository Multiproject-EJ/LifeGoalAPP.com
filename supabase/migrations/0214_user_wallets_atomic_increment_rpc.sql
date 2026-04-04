-- M33: Atomic wallet increment RPC for consumable credits (e.g., dice packs).

CREATE OR REPLACE FUNCTION public.increment_user_dice_rolls(
  p_user_id uuid,
  p_delta integer
)
RETURNS TABLE(user_id uuid, dice_rolls integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required';
  END IF;

  IF p_delta IS NULL OR p_delta <= 0 THEN
    RAISE EXCEPTION 'p_delta must be a positive integer';
  END IF;

  RETURN QUERY
  INSERT INTO public.user_wallets (user_id, dice_rolls)
  VALUES (p_user_id, p_delta)
  ON CONFLICT (user_id)
  DO UPDATE
    SET dice_rolls = public.user_wallets.dice_rolls + EXCLUDED.dice_rolls,
        updated_at = now()
  RETURNING public.user_wallets.user_id, public.user_wallets.dice_rolls;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_user_dice_rolls(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_user_dice_rolls(uuid, integer) TO service_role;

COMMENT ON FUNCTION public.increment_user_dice_rolls(uuid, integer)
  IS 'Atomically increments user_wallets.dice_rolls; creates wallet row if missing.';
