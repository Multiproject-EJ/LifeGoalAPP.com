-- Grant free special-gift theme entitlements for birthday gifts and Island 120 completion.

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

  INSERT INTO public.user_cosmetic_entitlements (
    user_id,
    cosmetic_type,
    cosmetic_id,
    source,
    source_ref,
    granted_at
  ) VALUES (
    auth.uid(),
    'theme',
    'birthday-wish',
    'birthday_present',
    'first_birthday_present',
    v_now
  )
  ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;

  RETURN QUERY SELECT true, 'claimed'::text, v_now + interval '365 days';
END;
$$;

CREATE OR REPLACE FUNCTION public.claim_island_120_theme_entitlement()
RETURNS TABLE(claimed boolean, reason text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now timestamptz := now();
  v_has_completed_first_cycle boolean := false;
  v_inserted_count integer := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN QUERY SELECT false, 'not_authenticated'::text;
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM public.island_run_runtime_state
    WHERE user_id = auth.uid()
      AND cycle_index >= 1
  )
  INTO v_has_completed_first_cycle;

  IF NOT COALESCE(v_has_completed_first_cycle, false) THEN
    RETURN QUERY SELECT false, 'island_120_not_completed'::text;
    RETURN;
  END IF;

  INSERT INTO public.user_cosmetic_entitlements (
    user_id,
    cosmetic_type,
    cosmetic_id,
    source,
    source_ref,
    granted_at
  ) VALUES (
    auth.uid(),
    'theme',
    'dreamt-horizon',
    'island_milestone',
    'island_120_complete',
    v_now
  )
  ON CONFLICT (user_id, cosmetic_type, cosmetic_id) DO NOTHING;

  GET DIAGNOSTICS v_inserted_count = ROW_COUNT;

  IF v_inserted_count = 0 THEN
    RETURN QUERY SELECT false, 'already_owned'::text;
    RETURN;
  END IF;

  RETURN QUERY SELECT true, 'claimed'::text;
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_birthday_gift() TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_island_120_theme_entitlement() TO authenticated;

COMMENT ON FUNCTION public.claim_island_120_theme_entitlement() IS
  'Idempotently grants Dreamt Horizon after a user has completed the first 120-island cycle.';
