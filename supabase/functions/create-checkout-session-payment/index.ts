import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type DicePackSkuId = 'dice_250' | 'dice_500' | 'dice_1200' | 'dice_3000' | 'dice_7500';

const DICE_PACKS: Record<DicePackSkuId, { rolls: number; priceEnv: string }> = {
  dice_250: { rolls: 250, priceEnv: 'STRIPE_PRICE_DICE_PACK_250' },
  dice_500: { rolls: 500, priceEnv: 'STRIPE_PRICE_DICE_PACK_500' },
  dice_1200: { rolls: 1_200, priceEnv: 'STRIPE_PRICE_DICE_PACK_1200' },
  dice_3000: { rolls: 3_000, priceEnv: 'STRIPE_PRICE_DICE_PACK_3000' },
  dice_7500: { rolls: 7_500, priceEnv: 'STRIPE_PRICE_DICE_PACK_7500' },
};

function isDicePackSkuId(value: unknown): value is DicePackSkuId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(DICE_PACKS, value);
}

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
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

    const stripeSecretKey = getRequiredEnv('STRIPE_SECRET_KEY');
    const commerceMode = Deno.env.get('STRIPE_COMMERCE_MODE') ?? 'test';
    if (commerceMode !== 'test' || !stripeSecretKey.startsWith('sk_test_')) {
      return new Response(JSON.stringify({
        error: 'Dice checkout is locked to Stripe test mode until launch.',
      }), {
        status: 503,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({})) as { pack_id?: unknown };
    const packId: DicePackSkuId = isDicePackSkuId(body.pack_id) ? body.pack_id : 'dice_500';
    const pack = DICE_PACKS[packId];

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2024-06-20',
    });

    const priceId = getRequiredEnv(pack.priceEnv);
    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const metadata = {
      user_id: user.id,
      product_type: 'dice_pack',
      sku_id: packId,
      rolls: String(pack.rolls),
      commerce_mode: 'test',
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
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({
      id: session.id,
      url: session.url,
      pack_id: packId,
      rolls: pack.rolls,
      mode: 'test',
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unexpected error creating payment checkout session.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
