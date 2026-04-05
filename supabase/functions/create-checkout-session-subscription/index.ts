import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type BillingCycle = 'monthly' | 'yearly';

type RequestBody = {
  billing_cycle?: BillingCycle;
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function resolvePriceId(cycle: BillingCycle): string {
  return cycle === 'yearly'
    ? getRequiredEnv('STRIPE_PRICE_PRO_YEARLY')
    : getRequiredEnv('STRIPE_PRICE_PRO_MONTHLY');
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

    const supabaseUser = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { global: { headers: { Authorization: authHeader } } },
    );
    const supabaseAdmin = createClient(
      getRequiredEnv('SUPABASE_URL'),
      getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
    );

    const {
      data: { user },
      error: authError,
    } = await supabaseUser.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const billingCycle: BillingCycle = body.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const priceId = resolvePriceId(billingCycle);

    let stripeCustomerId: string | null = null;
    const { data: customerRow, error: customerLookupError } = await supabaseAdmin
      .from('billing_customers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .maybeSingle();

    if (customerLookupError) {
      throw new Error(`Failed to load billing customer: ${customerLookupError.message}`);
    }

    stripeCustomerId = customerRow?.stripe_customer_id ?? null;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: {
          user_id: user.id,
        },
      });

      stripeCustomerId = customer.id;

      const { error: insertError } = await supabaseAdmin
        .from('billing_customers')
        .upsert({
          user_id: user.id,
          stripe_customer_id: stripeCustomerId,
        }, { onConflict: 'user_id' });

      if (insertError) {
        throw new Error(`Failed to persist billing customer: ${insertError.message}`);
      }
    }

    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: stripeCustomerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        product_type: 'habitgame_pro',
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          user_id: user.id,
          product_type: 'habitgame_pro',
          billing_cycle: billingCycle,
        },
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
    console.error('[create-checkout-session-subscription] failed to create session', error);
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unexpected error creating subscription checkout session.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
