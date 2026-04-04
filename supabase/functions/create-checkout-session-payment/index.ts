import 'jsr:@supabase/functions-js/edge-runtime';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DICE_ROLLS_PER_PACK = 500;

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

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });

    const priceId = getRequiredEnv('STRIPE_PRICE_DICE_PACK_500');
    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const metadata = {
      user_id: user.id,
      product_type: 'dice_pack',
      rolls: String(DICE_ROLLS_PER_PACK),
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
