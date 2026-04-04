-- M32: Billing + wallet schema foundation for Stripe subscriptions and consumable purchases.
-- Adds source-of-truth tables only (no Stripe runtime logic in this migration).

CREATE TABLE IF NOT EXISTS public.billing_customers (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text,
  status text NOT NULL,
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamptz,
  trial_start timestamptz,
  trial_end timestamptz,
  raw jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_subscriptions_status_check CHECK (
    status IN (
      'incomplete',
      'incomplete_expired',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid',
      'paused'
    )
  )
);

CREATE TABLE IF NOT EXISTS public.billing_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  is_pro boolean NOT NULL DEFAULT false,
  entitlements jsonb NOT NULL DEFAULT '{}'::jsonb,
  source text,
  effective_from timestamptz,
  effective_to timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  stripe_event_id text PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type text NOT NULL,
  stripe_created_at timestamptz,
  object_id text,
  checkout_session_id text,
  dedupe_scope text,
  dedupe_key text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  processing_error text,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_webhook_events_status_check CHECK (
    status IN ('received', 'processed', 'failed', 'ignored')
  )
);

-- Future-proof wallet table (dice_rolls is first consumable currency).
CREATE TABLE IF NOT EXISTS public.user_wallets (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  dice_rolls integer NOT NULL DEFAULT 0 CHECK (dice_rolls >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS billing_subscriptions_user_id_idx
  ON public.billing_subscriptions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS billing_subscriptions_status_idx
  ON public.billing_subscriptions(status, updated_at DESC);

CREATE INDEX IF NOT EXISTS billing_subscriptions_customer_idx
  ON public.billing_subscriptions(stripe_customer_id);

CREATE INDEX IF NOT EXISTS billing_webhook_events_user_id_idx
  ON public.billing_webhook_events(user_id, received_at DESC);

CREATE INDEX IF NOT EXISTS billing_webhook_events_event_type_idx
  ON public.billing_webhook_events(event_type, received_at DESC);

CREATE INDEX IF NOT EXISTS billing_webhook_events_checkout_session_idx
  ON public.billing_webhook_events(checkout_session_id)
  WHERE checkout_session_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS billing_webhook_events_dedupe_scope_key_uidx
  ON public.billing_webhook_events(dedupe_scope, dedupe_key)
  WHERE dedupe_scope IS NOT NULL AND dedupe_key IS NOT NULL;

DROP TRIGGER IF EXISTS billing_customers_set_updated_at ON public.billing_customers;
CREATE TRIGGER billing_customers_set_updated_at
BEFORE UPDATE ON public.billing_customers
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS billing_subscriptions_set_updated_at ON public.billing_subscriptions;
CREATE TRIGGER billing_subscriptions_set_updated_at
BEFORE UPDATE ON public.billing_subscriptions
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS billing_entitlements_set_updated_at ON public.billing_entitlements;
CREATE TRIGGER billing_entitlements_set_updated_at
BEFORE UPDATE ON public.billing_entitlements
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS billing_webhook_events_set_updated_at ON public.billing_webhook_events;
CREATE TRIGGER billing_webhook_events_set_updated_at
BEFORE UPDATE ON public.billing_webhook_events
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

DROP TRIGGER IF EXISTS user_wallets_set_updated_at ON public.user_wallets;
CREATE TRIGGER user_wallets_set_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION update_gamification_updated_at();

-- RLS
ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

-- Read-only owner access for authenticated users.
DROP POLICY IF EXISTS "billing_customers_owner_select" ON public.billing_customers;
CREATE POLICY "billing_customers_owner_select"
  ON public.billing_customers
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "billing_subscriptions_owner_select" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_owner_select"
  ON public.billing_subscriptions
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "billing_entitlements_owner_select" ON public.billing_entitlements;
CREATE POLICY "billing_entitlements_owner_select"
  ON public.billing_entitlements
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "user_wallets_owner_select" ON public.user_wallets;
CREATE POLICY "user_wallets_owner_select"
  ON public.user_wallets
  FOR SELECT
  USING (auth.uid() = user_id);

-- Explicit service-role write path for backend jobs and webhooks.
DROP POLICY IF EXISTS "billing_customers_service_role_all" ON public.billing_customers;
CREATE POLICY "billing_customers_service_role_all"
  ON public.billing_customers
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "billing_subscriptions_service_role_all" ON public.billing_subscriptions;
CREATE POLICY "billing_subscriptions_service_role_all"
  ON public.billing_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "billing_entitlements_service_role_all" ON public.billing_entitlements;
CREATE POLICY "billing_entitlements_service_role_all"
  ON public.billing_entitlements
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "billing_webhook_events_service_role_all" ON public.billing_webhook_events;
CREATE POLICY "billing_webhook_events_service_role_all"
  ON public.billing_webhook_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "user_wallets_service_role_all" ON public.user_wallets;
CREATE POLICY "user_wallets_service_role_all"
  ON public.user_wallets
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

COMMENT ON TABLE public.billing_customers IS 'Maps app users to Stripe customer ids.';
COMMENT ON TABLE public.billing_subscriptions IS 'Stripe subscription state snapshots per user.';
COMMENT ON TABLE public.billing_entitlements IS 'Computed entitlement state used by the app for feature gating.';
COMMENT ON TABLE public.billing_webhook_events IS 'Stripe webhook inbox + processing state + dedupe keys for idempotency.';
COMMENT ON TABLE public.user_wallets IS 'User consumable balances. dice_rolls is initial currency.';
