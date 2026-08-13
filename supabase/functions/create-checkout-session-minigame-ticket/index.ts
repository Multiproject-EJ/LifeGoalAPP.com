import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';
import {
  buildMinigameTicketCheckoutMetadata,
  isMinigameTicketSkuCompatibleWithEvent,
  isValidMinigameTicketEventId,
  isValidMinigameTicketSkuId,
  resolveMinigameTicketPriceEnvName,
  type MinigameTicketEventId,
  type MinigameTicketSkuId,
} from '../_shared/minigame-ticket-checkout.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

type RequestBody = {
  sku_id?: MinigameTicketSkuId;
  event_id?: MinigameTicketEventId | null;
};

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

    const body = (await req.json().catch(() => ({}))) as RequestBody;
    const skuId = isValidMinigameTicketSkuId(body.sku_id) ? body.sku_id : null;

    if (!skuId) {
      return new Response(JSON.stringify({ error: 'Invalid sku_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eventId = body.event_id ?? null;
    if (eventId !== null && !isValidMinigameTicketEventId(eventId)) {
      return new Response(JSON.stringify({ error: 'Invalid event_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isMinigameTicketSkuCompatibleWithEvent(skuId, eventId)) {
      return new Response(JSON.stringify({ error: 'sku_id is not compatible with event_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });

    const priceId = getRequiredEnv(resolveMinigameTicketPriceEnvName(skuId));
    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const metadata = buildMinigameTicketCheckoutMetadata({ userId: user.id, skuId, eventId });

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
    console.error('[create-checkout-session-minigame-ticket] failed to create session', error);

    return new Response(JSON.stringify({
      error: error instanceof Error
        ? error.message
        : 'Unexpected error creating minigame ticket checkout session.',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
