import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MINIGAME_TICKETS_PER_PACK = 10;

const ALLOWED_SKU_IDS = [
  'minigame_tickets_10',
  'feeding_frenzy_tickets_10',
  'lucky_spin_tickets_10',
  'space_excavator_tickets_10',
  'companion_feast_tickets_10',
] as const;

type MinigameTicketSkuId = (typeof ALLOWED_SKU_IDS)[number];

type EventId = 'feeding_frenzy' | 'lucky_spin' | 'space_excavator' | 'companion_feast';

type RequestBody = {
  sku_id?: MinigameTicketSkuId;
  event_id?: EventId | null;
};

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function isValidSkuId(value: unknown): value is MinigameTicketSkuId {
  return typeof value === 'string' && (ALLOWED_SKU_IDS as readonly string[]).includes(value);
}

function isValidEventId(value: unknown): value is EventId {
  return value === 'feeding_frenzy'
    || value === 'lucky_spin'
    || value === 'space_excavator'
    || value === 'companion_feast';
}

function resolvePriceEnvVarForSku(skuId: MinigameTicketSkuId): string {
  switch (skuId) {
    case 'minigame_tickets_10':
      return 'STRIPE_PRICE_MINIGAME_TICKETS_10';
    case 'feeding_frenzy_tickets_10':
      return 'STRIPE_PRICE_FEEDING_FRENZY_TICKETS_10';
    case 'lucky_spin_tickets_10':
      return 'STRIPE_PRICE_LUCKY_SPIN_TICKETS_10';
    case 'space_excavator_tickets_10':
      return 'STRIPE_PRICE_SPACE_EXCAVATOR_TICKETS_10';
    case 'companion_feast_tickets_10':
      return 'STRIPE_PRICE_COMPANION_FEAST_TICKETS_10';
    default:
      return 'STRIPE_PRICE_MINIGAME_TICKETS_10';
  }
}

function isSkuCompatibleWithEvent(skuId: MinigameTicketSkuId, eventId: EventId | null): boolean {
  if (!eventId) return true;
  const skuByEvent: Record<EventId, MinigameTicketSkuId> = {
    feeding_frenzy: 'feeding_frenzy_tickets_10',
    lucky_spin: 'lucky_spin_tickets_10',
    space_excavator: 'space_excavator_tickets_10',
    companion_feast: 'companion_feast_tickets_10',
  };

  const expectedSku = skuByEvent[eventId];
  return skuId === expectedSku || skuId === 'minigame_tickets_10';
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
    const skuId = isValidSkuId(body.sku_id) ? body.sku_id : null;

    if (!skuId) {
      return new Response(JSON.stringify({ error: 'Invalid sku_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const eventId = body.event_id ?? null;
    if (eventId !== null && !isValidEventId(eventId)) {
      return new Response(JSON.stringify({ error: 'Invalid event_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isSkuCompatibleWithEvent(skuId, eventId)) {
      return new Response(JSON.stringify({ error: 'sku_id is not compatible with event_id.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
      apiVersion: '2024-06-20',
    });

    const priceId = getRequiredEnv(resolvePriceEnvVarForSku(skuId));
    const successUrl = getRequiredEnv('STRIPE_CHECKOUT_SUCCESS_URL');
    const cancelUrl = getRequiredEnv('STRIPE_CHECKOUT_CANCEL_URL');

    const metadata = {
      user_id: user.id,
      product_type: 'minigame_ticket_pack',
      sku_id: skuId,
      event_id: eventId ?? '',
      tickets: String(MINIGAME_TICKETS_PER_PACK),
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
