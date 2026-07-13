-- ========================================================
-- PER-USER STORAGE OBJECT CAP
-- Migration 0279: bound the number of files a user can store
--
-- Context: migration 0278 capped every user-generated *table*.
-- The remaining open-ended growth vector is Storage: the
-- 'vision-board' bucket caps each file at 5 MB (0124) but not
-- the *number* of files per user. A token-holder calling the
-- Storage API directly — bypassing the app's vb_cards cap —
-- could upload files without limit and bloat project size.
--
-- This migration tightens the bucket's INSERT policy so an
-- upload is rejected once the account already owns
-- STORAGE_MAX_OBJECTS_PER_USER files in that bucket. Ownership
-- is the first path segment (uploads are keyed '{user_id}/...',
-- see visionBoard.ts), exactly as the existing policies match.
--
-- Why a SECURITY DEFINER counter and not an inline subquery:
-- a policy whose WITH CHECK selects from its own table
-- (storage.objects) raises "infinite recursion detected in
-- policy". public.vision_board_object_count() counts outside
-- RLS, which both avoids the recursion and keeps the count
-- accurate regardless of the bucket's SELECT policy. The
-- function owner must be able to read storage.objects (true for
-- the privileged role that applies this in the Dashboard).
--
-- ── IMPORTANT: deployment ──────────────────────────────────
-- storage.objects is owned by supabase_storage_admin, so policy
-- changes usually cannot run from a plain migration (error
-- 42501, "must be owner of relation objects" — see
-- README_STORAGE_POLICIES.md). The DO block below therefore
-- ATTEMPTS the change and degrades to a NOTICE when it lacks
-- privilege. In that (normal) case, apply the canonical SQL
-- from README_STORAGE_POLICIES.md ("Per-user object cap")
-- via the Supabase Dashboard SQL editor. Until applied, the
-- pre-0279 uncapped INSERT policy stays in force — this
-- migration never removes protection, it only adds a ceiling.
--
-- Scope note: only the active 'vision-board' bucket is capped.
-- The private 'vision' (V2) bucket (0136) has no INSERT policy
-- today, so it is effectively closed; adding one here would
-- OPEN it, the opposite of the goal. Cap it with the same
-- pattern if/when it is activated.
--
-- Worst case per user: STORAGE_MAX_OBJECTS_PER_USER x 5 MB.
-- Typical usage is far lower (webp-optimized images are
-- ~100-400 KB). Tune the number below; see docs/DATA_LIMITS.md.
-- ========================================================

DO $$
DECLARE
  max_objects constant integer := 1000;  -- keep in sync with README + docs
BEGIN
  -- Counter runs outside RLS to avoid policy self-recursion.
  EXECUTE $fn$
    CREATE OR REPLACE FUNCTION public.vision_board_object_count(p_uid uuid)
    RETURNS bigint
    LANGUAGE sql
    STABLE
    SECURITY DEFINER
    SET search_path = storage, pg_temp
    AS $body$
      SELECT count(*)
      FROM storage.objects
      WHERE bucket_id = 'vision-board'
        AND (storage.foldername(name))[1] = p_uid::text
    $body$;
  $fn$;

  -- Replace the uncapped INSERT policy with a count-limited one.
  EXECUTE 'DROP POLICY IF EXISTS "vision_board_insert" ON storage.objects';
  EXECUTE format($p$
    CREATE POLICY "vision_board_insert" ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'vision-board'
        AND (storage.foldername(name))[1] = auth.uid()::text
        AND public.vision_board_object_count(auth.uid()) < %s
      )
  $p$, max_objects);
  RAISE NOTICE 'per-user storage object cap applied to vision-board (limit %)', max_objects;
EXCEPTION
  -- insufficient_privilege: hosted Supabase (not storage owner).
  -- undefined_table / invalid_schema_name: a DB where the storage
  -- schema/table is not present yet. All are non-fatal: the cap is
  -- then applied via the Dashboard instead.
  WHEN insufficient_privilege OR undefined_table OR invalid_schema_name THEN
    RAISE NOTICE 'Cannot alter storage.objects from this role/environment (expected on hosted Supabase). Apply the "Per-user object cap" policy from README_STORAGE_POLICIES.md via the Dashboard SQL editor.';
END;
$$;
