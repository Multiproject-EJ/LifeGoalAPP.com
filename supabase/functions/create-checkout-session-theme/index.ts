import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type ThemeCheckoutVariant = 'base' | 'paired';

type ThemeSkuConfig = {
  themeId: string;
  skuId: string;
  priceEnvName: string;
  variant: ThemeCheckoutVariant;
  creatureId: string;
};

const THEME_SKU_CONFIGS: ThemeSkuConfig[] = [
  { themeId: 'sproutling-grove', skuId: 'theme_sproutling_grove', priceEnvName: 'STRIPE_PRICE_THEME_SPROUTLING_GROVE', variant: 'base', creatureId: 'common-sproutling' },
  { themeId: 'sproutling-grove', skuId: 'theme_sproutling_grove_paired', priceEnvName: 'STRIPE_PRICE_THEME_SPROUTLING_GROVE_PAIRED', variant: 'paired', creatureId: 'common-sproutling' },
  { themeId: 'ember-glow', skuId: 'theme_ember_glow', priceEnvName: 'STRIPE_PRICE_THEME_EMBER_GLOW', variant: 'base', creatureId: 'rare-ember-sprout' },
  { themeId: 'ember-glow', skuId: 'theme_ember_glow_paired', priceEnvName: 'STRIPE_PRICE_THEME_EMBER_GLOW_PAIRED', variant: 'paired', creatureId: 'rare-ember-sprout' },
  { themeId: 'aurora-sky', skuId: 'theme_aurora_sky', priceEnvName: 'STRIPE_PRICE_THEME_AURORA_SKY', variant: 'base', creatureId: 'rare-aurora-finch' },
  { themeId: 'aurora-sky', skuId: 'theme_aurora_sky_paired', priceEnvName: 'STRIPE_PRICE_THEME_AURORA_SKY_PAIRED', variant: 'paired', creatureId: 'rare-aurora-finch' },
  { themeId: 'nebula-drift', skuId: 'theme_nebula_drift', priceEnvName: 'STRIPE_PRICE_THEME_NEBULA_DRIFT', variant: 'base', creatureId: 'rare-nebula-wisp' },
  { themeId: 'nebula-drift', skuId: 'theme_nebula_drift_paired', priceEnvName: 'STRIPE_PRICE_THEME_NEBULA_DRIFT_PAIRED', variant: 'paired', creatureId: 'rare-nebula-wisp' },
  { themeId: 'starhorn-celestial', skuId: 'theme_starhorn_celestial', priceEnvName: 'STRIPE_PRICE_THEME_STARHORN_CELESTIAL', variant: 'base', creatureId: 'mythic-starhorn-seraph' },
  { themeId: 'starhorn-celestial', skuId: 'theme_starhorn_celestial_paired', priceEnvName: 'STRIPE_PRICE_THEME_STARHORN_CELESTIAL_PAIRED', variant: 'paired', creatureId: 'mythic-starhorn-seraph' },
];

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function collectionHasCreature(collection: unknown, creatureId: string): boolean {
  if (!Array.isArray(collection)) return false;
  return collection.some((entry) => isRecord(entry) && entry.creatureId === creatureId);
}

function arrayHasId(value: unknown, id: string): boolean {
  return Array.isArray(value) && value.includes(id);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed. Use POST.' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const themeId = typeof body?.theme_id === 'string' ? body.theme_id : null;
    const skuId = typeof body?.sku_id === 'string' ? body.sku_id : null;
    const variant = body?.variant === 'paired' ? 'paired' : 'base';

    const skuConfig = THEME_SKU_CONFIGS.find((config) => (
      config.themeId === themeId && config.skuId === skuId && config.variant === variant
    ));

    if (!skuConfig) {
      return new Response(JSON.stringify({ error: 'Unknown or mismatched theme checkout SKU.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { global: { headers: { Authorization: authHeader } } },
    );

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: existingEntitlement, error: entitlementError } = await supabase
      .from('user_cosmetic_entitlements')
      .select('id')
      .eq('user_id', user.id)
      .eq('cosmetic_type', 'theme')
      .eq('cosmetic_id', skuConfig.themeId)
      .maybeSingle();

    if (entitlementError) {
      throw new Error(`Failed to check existing theme entitlement: ${entitlementError.message}`);
    }

    if (existingEntitlement?.id) {
      return new Response(JSON.stringify({ error: 'Theme already owned.' }), {
        status: 409,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: runtimeState, error: runtimeError } = await supabase
      .from('island_run_runtime_state')
      .select('creature_collection, perfect_companion_ids')
      .eq('user_id', user.id)
      .maybeSingle();

    if (runtimeError) {
      throw new Error(`Failed to validate creature theme eligibility: ${runtimeError.message}`);
    }

    if (!collectionHasCreature(runtimeState?.creature_collection, skuConfig.creatureId)) {
      return new Response(JSON.stringify({ error: 'Hatch this creature before buying its theme.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (skuConfig.variant === 'paired' && !arrayHasId(runtimeState?.perfect_companion_ids, skuConfig.creatureId)) {
      return new Response(JSON.stringify({ error: 'This paired creature theme offer is not available.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });

    const priceId = getRequiredEnv(skuConfig.priceEnvName);
    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const metadata = {
      user_id: user.id,
      product_type: 'theme',
      theme_id: skuConfig.themeId,
      sku_id: skuConfig.skuId,
      price_variant: skuConfig.variant,
      creature_id: skuConfig.creatureId,
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata,
      payment_intent_data: {
        metadata,
      },
      allow_promotion_codes: skuConfig.variant === 'base',
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unexpected error creating theme checkout session.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
