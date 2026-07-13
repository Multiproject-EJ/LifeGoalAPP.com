-- ========================================================
-- CONFLICT RESOLVER DATA LIMITS
-- Migration 0281: bound the multi-party conflict_* tables
--
-- Context: 0278/0280 capped single-owner tables. The conflict
-- resolver is collaborative: a conflict_sessions row is owned by
-- one user (owner_user_id) but multiple invited participants
-- write to its child tables (private messages, proposals,
-- apologies, AI runs, ...), all scoped by session_id and with no
-- single user_id. 0278/0280 therefore skipped them, leaving the
-- whole feature as an open-ended, multi-writer growth vector.
--
-- Containment uses the same two-level pattern as 0280:
--   1. Cap conflict_sessions PER ACCOUNT (owner_user_id) — this
--      is the multiplier, so bounding it bounds everything below.
--   2. Cap every child table PER SESSION (session_id), which
--      bounds the shared resource regardless of which participant
--      writes.
-- Per-user bound = (sessions per user) x (sum of per-session
-- child caps). AI-generated tables also sit behind the app's AI
-- quota service, which independently gates how fast they grow.
--
-- No new trigger logic: enforce_user_data_limit() already counts
-- by whatever column user_column names, and 0280 added the
-- scope_label used in the rejection message. This migration is
-- config only. Absent tables are skipped by
-- attach_user_data_limit_triggers() with a NOTICE.
-- Worst-case math: docs/DATA_LIMITS.md.
-- ========================================================

INSERT INTO public.user_data_limits (table_name, user_column, scope_label, max_rows, max_row_bytes) VALUES
  -- Root: capped per account (the multiplier for everything below).
  ('conflict_sessions',         'owner_user_id', 'account',            200,  2048),
  -- Children: capped per conflict session.
  ('conflict_participants',     'session_id',    'conflict session',    50,  2048),
  ('conflict_invites',          'session_id',    'conflict session',   100,  4096),
  ('conflict_messages_private', 'session_id',    'conflict session',  1000,  8192),
  ('conflict_shared_summaries', 'session_id',    'conflict session',    10, 51200),
  ('conflict_proposals',        'session_id',    'conflict session',   300,  8192),
  ('conflict_apologies',        'session_id',    'conflict session',   200,  8192),
  ('conflict_agreements',       'session_id',    'conflict session',   100, 16384),
  ('conflict_stage_state',      'session_id',    'conflict session',    50,  8192),
  ('conflict_ai_messages',      'session_id',    'conflict session',  1000,  8192),
  ('conflict_ai_runs',          'session_id',    'conflict session',   500, 16384),
  ('conflict_ai_artifacts',     'session_id',    'conflict session',   500, 32768)
ON CONFLICT (table_name) DO NOTHING;

SELECT public.attach_user_data_limit_triggers();
