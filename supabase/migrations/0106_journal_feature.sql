-- Journal entries table and policies

-- Ensure pgcrypto for gen_random_uuid
DO $$
BEGIN
  PERFORM gen_random_uuid();
EXCEPTION
  WHEN undefined_function THEN
    CREATE EXTENSION IF NOT EXISTS pgcrypto;
END$$;

-- Helper function to maintain updated_at
CREATE OR REPLACE FUNCTION public.set_journal_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  entry_date date NOT NULL DEFAULT current_date,
  title text,
  content text NOT NULL,
  mood text,
  tags text[] DEFAULT '{}',
  is_private boolean NOT NULL DEFAULT true,
  attachments jsonb,
  linked_goal_ids text[] DEFAULT '{}',
  linked_habit_ids text[] DEFAULT '{}'
);

DROP TRIGGER IF EXISTS set_journal_entries_updated_at ON public.journal_entries;
CREATE TRIGGER set_journal_entries_updated_at
BEFORE UPDATE ON public.journal_entries
FOR EACH ROW
EXECUTE FUNCTION public.set_journal_updated_at();

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'journal_entries'
      AND policyname = 'own journal entries'
  ) THEN
    EXECUTE 'DROP POLICY "own journal entries" ON public.journal_entries';
  END IF;
END$$;

CREATE POLICY "own journal entries" ON public.journal_entries
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
