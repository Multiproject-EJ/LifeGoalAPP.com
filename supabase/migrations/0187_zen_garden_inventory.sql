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
