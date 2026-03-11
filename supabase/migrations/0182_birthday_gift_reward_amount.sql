-- Ensure birthday gift awards exactly 1 diamond (1000 gold points)
CREATE OR REPLACE FUNCTION public.claim_birthday_gift()
RETURNS TABLE(claimed boolean, reason text, next_eligible_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_profile public.workspace_profiles%ROWTYPE;
  v_next_eligible_at timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'not_authenticated'::text, NULL::timestamptz;
    RETURN;
  END IF;

  SELECT *
  INTO v_profile
  FROM public.workspace_profiles
  WHERE user_id = auth.uid();

  IF NOT FOUND THEN
    INSERT INTO public.workspace_profiles (user_id)
    VALUES (auth.uid())
    ON CONFLICT (user_id) DO NOTHING;

    SELECT *
    INTO v_profile
    FROM public.workspace_profiles
    WHERE user_id = auth.uid();
  END IF;

  IF NOT COALESCE(v_profile.birthday_gift_enabled, false) THEN
    RETURN QUERY SELECT false, 'opt_in_required'::text, NULL::timestamptz;
    RETURN;
  END IF;

  IF v_profile.birthday_gift_last_claimed_at IS NOT NULL THEN
    v_next_eligible_at := v_profile.birthday_gift_last_claimed_at + interval '365 days';
    IF v_next_eligible_at > v_now THEN
      RETURN QUERY SELECT false, 'cooldown_active'::text, v_next_eligible_at;
      RETURN;
    END IF;
  END IF;

  UPDATE public.workspace_profiles
  SET birthday_gift_last_claimed_at = v_now,
      updated_at = v_now
  WHERE user_id = auth.uid();

  INSERT INTO public.gamification_profiles (user_id)
  VALUES (auth.uid())
  ON CONFLICT (user_id) DO NOTHING;

  UPDATE public.gamification_profiles
  SET total_points = total_points + 1000,
      updated_at = v_now
  WHERE user_id = auth.uid();

  RETURN QUERY SELECT true, 'claimed'::text, v_now + interval '365 days';
END;
$$;
