-- Migration ledger version 01870001
-- Migration 0187: Add in-flight per-run state columns to island_run_runtime_state
-- Persists reload-sensitive Island Run board values across devices and refreshes.

ALTER TABLE IF EXISTS island_run_runtime_state
  ADD COLUMN IF NOT EXISTS token_index INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hearts INTEGER NOT NULL DEFAULT 5,
  ADD COLUMN IF NOT EXISTS coins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS spin_tokens INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN island_run_runtime_state.token_index IS
  'Current token tile index on the 17-tile Island Run board.';

COMMENT ON COLUMN island_run_runtime_state.hearts IS
  'Current Island Run heart count for the active in-flight island session.';

COMMENT ON COLUMN island_run_runtime_state.coins IS
  'Current Island Run coin balance for the active in-flight island session.';

COMMENT ON COLUMN island_run_runtime_state.spin_tokens IS
  'Current Island Run spin token count for the active in-flight island session.';

-- Consolidated companion migration (shared historical version).

-- Migration ledger version 01870002
-- Zen Garden inventory persistence for earned + purchased items

CREATE TABLE IF NOT EXISTS public.zen_garden_inventory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'earned' CHECK (source IN ('earned', 'purchased')),
  earned_at TIMESTAMPTZ,
  purchased_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, item_id)
);

CREATE INDEX IF NOT EXISTS idx_zen_garden_inventory_user_id
  ON public.zen_garden_inventory (user_id);

ALTER TABLE public.zen_garden_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own zen garden inventory" ON public.zen_garden_inventory;
CREATE POLICY "Users can view own zen garden inventory"
  ON public.zen_garden_inventory
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own zen garden inventory" ON public.zen_garden_inventory;
CREATE POLICY "Users can insert own zen garden inventory"
  ON public.zen_garden_inventory
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own zen garden inventory" ON public.zen_garden_inventory;
CREATE POLICY "Users can update own zen garden inventory"
  ON public.zen_garden_inventory
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Service role full access zen garden inventory" ON public.zen_garden_inventory;
CREATE POLICY "Service role full access zen garden inventory"
  ON public.zen_garden_inventory
  FOR ALL
  TO service_role
  USING (TRUE)
  WITH CHECK (TRUE);

DROP TRIGGER IF EXISTS update_zen_garden_inventory_updated_at ON public.zen_garden_inventory;
CREATE TRIGGER update_zen_garden_inventory_updated_at
  BEFORE UPDATE ON public.zen_garden_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_gamification_updated_at();

COMMENT ON TABLE public.zen_garden_inventory
  IS 'Persistent Zen Garden inventory entries for earned and purchased items.';
