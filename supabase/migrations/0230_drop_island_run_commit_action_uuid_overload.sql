-- Fix: Drop the stale uuid-signature overload of island_run_commit_action.
--
-- Migration 0228 changed p_client_action_id from uuid → text and issued a
-- DROP FUNCTION for the old uuid signature, but the drop was not applied to
-- production.  As a result two overloads now coexist:
--
--   island_run_commit_action(..., p_client_action_id => uuid)   ← stale / 0217
--   island_run_commit_action(..., p_client_action_id => text)   ← current / 0228
--
-- PostgreSQL cannot resolve which candidate to call and raises:
--   "Could not choose the best candidate function between: ..."
-- whenever the reset-gameplay (or any other) path invokes the RPC.
--
-- This migration unconditionally drops the old uuid overload so that only the
-- text-parameter version remains.

DROP FUNCTION IF EXISTS public.island_run_commit_action(text, bigint, text, jsonb, uuid);
