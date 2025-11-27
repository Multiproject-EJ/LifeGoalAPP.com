-- ========================================================
-- HABITS MODULE - DOMAIN/GOAL COLUMNS
-- Migration 0004: Add domain_key and goal_id to habits_v2
-- 
-- Purpose: Support dashboard quick-add parity by adding
-- domain_key (life wheel category) and goal_id (linked goal)
-- columns to the unified habits_v2 table.
-- ========================================================

-- Add domain_key column if not exists
-- This links the habit to a life wheel domain/category
ALTER TABLE public.habits_v2 ADD COLUMN IF NOT EXISTS domain_key text;

-- Add goal_id column if not exists
-- This links the habit to a specific goal
ALTER TABLE public.habits_v2 ADD COLUMN IF NOT EXISTS goal_id uuid REFERENCES public.goals(id) ON DELETE SET NULL;

-- Create index on domain_key for faster filtering by domain
CREATE INDEX IF NOT EXISTS habits_v2_domain_key_idx ON public.habits_v2(domain_key);

-- Create index on goal_id for faster filtering by linked goal
CREATE INDEX IF NOT EXISTS habits_v2_goal_id_idx ON public.habits_v2(goal_id);
