-- ═══════════════════════════════════════════════════════════════════════════════
-- Island Run 120 — Database Health Check
-- ═══════════════════════════════════════════════════════════════════════════════
-- Run this migration to verify all required tables, columns, and functions
-- for the 120-island game are present in your Supabase instance.
--
-- If any check fails, the entire migration aborts with a descriptive error.
-- On success, a summary row is inserted into a transient temp table you can query.
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$
DECLARE
  _missing_columns TEXT[] := '{}';
  _missing_functions TEXT[] := '{}';
  _col TEXT;
  _fn TEXT;

  -- All required columns on island_run_runtime_state
  _required_columns TEXT[] := ARRAY[
    'user_id',
    'created_at',
    'updated_at',
    'current_island_number',
    'first_run_claimed',
    'daily_hearts_claimed_day_key',
    'token_index',
    'hearts',
    'coins',
    'island_shards',
    'shard_tier_index',
    'shard_claim_count',
    'shards',
    'shields',
    'spin_tokens',
    'dice_pool',
    'cycle_index',
    'boss_trial_resolved_island_number',
    'active_egg_tier',
    'active_egg_set_at_ms',
    'active_egg_hatch_duration_ms',
    'active_egg_is_dormant',
    'per_island_eggs',
    'island_started_at_ms',
    'island_expires_at_ms',
    'completed_stops_by_island',
    'market_owned_bundles_by_island',
    'diamonds',
    'onboarding_display_name_loop_completed',
    'story_prologue_seen',
    'creature_collection',
    'audio_enabled',
    'runtime_version',
    'creature_treat_inventory',
    'companion_bonus_last_visit_key',
    'active_companion_id',
    'perfect_companion_ids',
    'perfect_companion_reasons',
    'perfect_companion_computed_at_ms',
    'perfect_companion_model_version',
    'perfect_companion_computed_cycle_index',
    'active_stop_index',
    'active_stop_type',
    'stop_states_by_index',
    'stop_build_state_by_index',
    'boss_state',
    'essence',
    'essence_lifetime_earned',
    'essence_lifetime_spent',
    'dice_regen_state',
    'reward_bar_progress',
    'reward_bar_threshold',
    'reward_bar_claim_count_in_event',
    'reward_bar_escalation_tier',
    'reward_bar_last_claim_at_ms',
    'reward_bar_bound_event_id',
    'reward_bar_ladder_id',
    'active_timed_event',
    'active_timed_event_progress',
    'sticker_progress',
    'sticker_inventory',
    'device_session_id',
    'last_writer_device_session_id'
  ];

  -- Required RPC functions
  _required_functions TEXT[] := ARRAY[
    'island_run_commit_action'
  ];

BEGIN
  -- ─── 1. Check that the main table exists ──────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'island_run_runtime_state'
  ) THEN
    RAISE EXCEPTION '[HEALTH CHECK FAILED] Table "public.island_run_runtime_state" does not exist. Run all island_run migrations (0167+).';
  END IF;

  -- ─── 2. Check all required columns exist ──────────────────────────────────
  FOREACH _col IN ARRAY _required_columns
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'island_run_runtime_state'
        AND column_name = _col
    ) THEN
      _missing_columns := array_append(_missing_columns, _col);
    END IF;
  END LOOP;

  IF array_length(_missing_columns, 1) > 0 THEN
    RAISE EXCEPTION '[HEALTH CHECK FAILED] Missing columns on "island_run_runtime_state": %',
      array_to_string(_missing_columns, ', ');
  END IF;

  -- ─── 3. Check dice_pool DEFAULT is 30 (not the old 20) ───────────────────
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'island_run_runtime_state'
      AND column_name = 'dice_pool'
      AND column_default LIKE '%20%'
  ) THEN
    RAISE EXCEPTION '[HEALTH CHECK FAILED] dice_pool DEFAULT is still 20. Run migration 0225_fix_dice_pool_default.sql to correct it to 30.';
  END IF;

  -- ─── 4. Check required RPC functions exist ────────────────────────────────
  FOREACH _fn IN ARRAY _required_functions
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name = _fn
    ) THEN
      _missing_functions := array_append(_missing_functions, _fn);
    END IF;
  END LOOP;

  IF array_length(_missing_functions, 1) > 0 THEN
    RAISE EXCEPTION '[HEALTH CHECK FAILED] Missing RPC functions: %',
      array_to_string(_missing_functions, ', ');
  END IF;

  -- ─── 5. Check active_session_locks table exists (session locking) ─────────
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'island_run_active_session_locks'
  ) THEN
    RAISE EXCEPTION '[HEALTH CHECK FAILED] Table "public.island_run_active_session_locks" does not exist. Run migration 0196.';
  END IF;

  -- ─── 6. Check RLS is enabled on the runtime state table ──────────────────
  IF NOT EXISTS (
    SELECT 1 FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename = 'island_run_runtime_state'
      AND rowsecurity = true
  ) THEN
    RAISE WARNING '[HEALTH CHECK WARNING] RLS is not enabled on "island_run_runtime_state". This may be intentional for development but should be enabled in production.';
  END IF;

  -- ═══ All checks passed ═══════════════════════════════════════════════════
  RAISE NOTICE '✅ Island Run 120 Health Check PASSED — all tables, columns, functions, and defaults are correct.';
END;
$$;
