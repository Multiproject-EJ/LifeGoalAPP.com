import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type EggPackSkuId = 'egg_pack_small' | 'egg_pack_medium' | 'egg_pack_large';

const EGG_PACK_CONFIG: Record<EggPackSkuId, { eggCount: number; priceEnvVar: string }> = {
  egg_pack_small:  { eggCount: 3,  priceEnvVar: 'STRIPE_PRICE_EGG_PACK_SMALL' },
  egg_pack_medium: { eggCount: 15, priceEnvVar: 'STRIPE_PRICE_EGG_PACK_MEDIUM' },
  egg_pack_large:  { eggCount: 25, priceEnvVar: 'STRIPE_PRICE_EGG_PACK_LARGE' },
};

function isEggPackSkuId(value: unknown): value is EggPackSkuId {
  return value === 'egg_pack_small' || value === 'egg_pack_medium' || value === 'egg_pack_large';
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
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

    const supabase = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = (await req.json().catch(() => ({}))) as { sku_id?: unknown };
    if (!isEggPackSkuId(body.sku_id)) {
      return new Response(JSON.stringify({ error: `Invalid sku_id. Must be one of: ${Object.keys(EGG_PACK_CONFIG).join(', ')}.` }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const skuId = body.sku_id;
    const config = EGG_PACK_CONFIG[skuId];

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), { apiVersion: '2024-06-20' });

    const priceId = getRequiredEnv(config.priceEnvVar);
    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const metadata = {
      user_id: user.id,
      product_type: 'egg_pack',
      sku_id: skuId,
      egg_count: String(config.eggCount),
      resolver_version: 'egg_pack_v1',
    };

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata,
      payment_intent_data: { metadata },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ id: session.id, url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[create-checkout-session-egg-pack] failed to create session', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unexpected error creating Egg Pack checkout session.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
