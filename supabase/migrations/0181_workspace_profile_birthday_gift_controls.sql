-- Add birthday gift preference + anti-gaming claim controls
ALTER TABLE public.workspace_profiles
ADD COLUMN IF NOT EXISTS birthday_gift_enabled boolean NOT NULL DEFAULT false,
ADD COLUMN IF NOT EXISTS birthday_gift_last_claimed_at timestamptz;

COMMENT ON COLUMN public.workspace_profiles.birthday_gift_enabled IS 'Whether the user has opted in to receive an optional birthday gift.';
COMMENT ON COLUMN public.workspace_profiles.birthday_gift_last_claimed_at IS 'Timestamp of the most recent birthday gift claim; used to enforce one claim per rolling 365-day period.';

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

  RETURN QUERY SELECT true, 'claimed'::text, v_now + interval '365 days';
END;
$$;

GRANT EXECUTE ON FUNCTION public.claim_birthday_gift() TO authenticated;
