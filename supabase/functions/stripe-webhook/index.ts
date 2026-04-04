import 'jsr:@supabase/functions-js/edge-runtime';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const DEFAULT_DICE_PACK_ROLLS = 500;

type SupabaseLikeClient = ReturnType<typeof createClient>;

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name);
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function toIsoFromStripeTimestamp(value: number | null | undefined): string | null {
  if (!value || Number.isNaN(value)) return null;
  return new Date(value * 1000).toISOString();
}

function parseRolls(metadata: Record<string, string> | null | undefined): number {
  const raw = metadata?.rolls;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_DICE_PACK_ROLLS;
  return parsed;
}

async function resolveUserIdFromCustomerId(supabase: SupabaseLikeClient, stripeCustomerId: string | null): Promise<string | null> {
  if (!stripeCustomerId) return null;
  const { data, error } = await supabase
    .from('billing_customers')
    .select('user_id')
    .eq('stripe_customer_id', stripeCustomerId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to resolve user by customer id: ${error.message}`);
  }

  return data?.user_id ?? null;
}

async function upsertSubscriptionSnapshot(supabase: SupabaseLikeClient, subscription: Stripe.Subscription): Promise<void> {
  const stripeCustomerId = typeof subscription.customer === 'string'
    ? subscription.customer
    : subscription.customer?.id ?? null;

  const metadataUserId = subscription.metadata?.user_id || null;
  const userId = metadataUserId || await resolveUserIdFromCustomerId(supabase, stripeCustomerId);

  if (!userId || !stripeCustomerId) {
    return;
  }

  const primaryItem = subscription.items.data[0] ?? null;
  const stripePriceId = primaryItem?.price?.id ?? null;

  const payload = {
    user_id: userId,
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: stripePriceId,
    status: subscription.status,
    current_period_start: toIsoFromStripeTimestamp(primaryItem?.current_period_start ?? subscription.current_period_start),
    current_period_end: toIsoFromStripeTimestamp(primaryItem?.current_period_end ?? subscription.current_period_end),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: toIsoFromStripeTimestamp(subscription.canceled_at),
    trial_start: toIsoFromStripeTimestamp(subscription.trial_start),
    trial_end: toIsoFromStripeTimestamp(subscription.trial_end),
    raw: subscription as unknown as Record<string, unknown>,
  };

  const { error: subError } = await supabase
    .from('billing_subscriptions')
    .upsert(payload, { onConflict: 'stripe_subscription_id' });

  if (subError) {
    throw new Error(`Failed to upsert subscription snapshot: ${subError.message}`);
  }

  const isPro = subscription.status === 'active' || subscription.status === 'trialing';

  const { error: entitlementError } = await supabase
    .from('billing_entitlements')
    .upsert({
      user_id: userId,
      is_pro: isPro,
      source: 'stripe_subscription',
      effective_from: toIsoFromStripeTimestamp(subscription.current_period_start) ?? new Date().toISOString(),
      effective_to: toIsoFromStripeTimestamp(subscription.current_period_end),
      entitlements: {
        pro: isPro,
        stripe_subscription_id: subscription.id,
        stripe_price_id: stripePriceId,
        status: subscription.status,
      },
    }, { onConflict: 'user_id' });

  if (entitlementError) {
    throw new Error(`Failed to upsert billing entitlement: ${entitlementError.message}`);
  }
}

async function updateWebhookEventStatus(
  supabase: SupabaseLikeClient,
  stripeEventId: string,
  status: 'processed' | 'failed' | 'ignored',
  processingError?: string,
): Promise<void> {
  const updatePayload: Record<string, unknown> = {
    status,
    processed_at: new Date().toISOString(),
  };

  if (processingError) {
    updatePayload.processing_error = processingError.slice(0, 2000);
  }

  await supabase
    .from('billing_webhook_events')
    .update(updatePayload)
    .eq('stripe_event_id', stripeEventId);
}

async function applyDicePackCredit(
  supabase: SupabaseLikeClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id;
  const userId = session.metadata?.user_id || session.client_reference_id || null;
  if (!sessionId || !userId) {
    throw new Error('Dice pack checkout session is missing session id or user id metadata.');
  }

  // Reserve checkout-session-level dedupe key for dice credits.
  const { data: dedupeReservationRow, error: dedupeError } = await supabase
    .from('billing_webhook_events')
    .update({
      dedupe_scope: 'dice_pack_credit',
      dedupe_key: sessionId,
    })
    .eq('stripe_event_id', event.id)
    .select('stripe_event_id')
    .maybeSingle();

  if (dedupeError) {
    // Unique violation => this checkout session has already been used for dice crediting.
    if ((dedupeError as { code?: string }).code === '23505') {
      await updateWebhookEventStatus(supabase, event.id, 'ignored', `Dice credit already applied for checkout_session_id=${sessionId}`);
      return;
    }
    throw new Error(`Failed to reserve dice dedupe key: ${dedupeError.message}`);
  }

  if (!dedupeReservationRow?.stripe_event_id) {
    throw new Error(`Failed to reserve dice dedupe key: webhook event row not found for stripe_event_id=${event.id}`);
  }

  const rolls = parseRolls(session.metadata);

  const { error: incrementError } = await supabase.rpc('increment_user_dice_rolls', {
    p_user_id: userId,
    p_delta: rolls,
  });

  if (incrementError) {
    throw new Error(`Failed to atomically increment wallet balance: ${incrementError.message}`);
  }
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

  const stripe = new Stripe(getRequiredEnv('STRIPE_SECRET_KEY'), {
    apiVersion: '2024-06-20',
  });

  const webhookSecret = getRequiredEnv('STRIPE_WEBHOOK_SECRET');
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response(JSON.stringify({ error: 'Missing Stripe signature header.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    return new Response(JSON.stringify({
      error: `Invalid webhook signature: ${error instanceof Error ? error.message : String(error)}`,
    }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const supabase = createClient(
    getRequiredEnv('SUPABASE_URL'),
    getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
  );

  const eventObject = event.data.object as Record<string, unknown>;
  const objectId = typeof eventObject?.id === 'string' ? eventObject.id : null;

  const checkoutSessionForRow = event.type.startsWith('checkout.session.')
    ? (event.data.object as Stripe.Checkout.Session)
    : null;

  const userIdFromEvent =
    checkoutSessionForRow?.metadata?.user_id ||
    checkoutSessionForRow?.client_reference_id ||
    null;

  const { error: insertEventError } = await supabase
    .from('billing_webhook_events')
    .insert({
      stripe_event_id: event.id,
      user_id: userIdFromEvent,
      event_type: event.type,
      stripe_created_at: toIsoFromStripeTimestamp(event.created),
      object_id: objectId,
      checkout_session_id: checkoutSessionForRow?.id ?? null,
      status: 'received',
      payload: event as unknown as Record<string, unknown>,
      received_at: new Date().toISOString(),
    });

  if (insertEventError) {
    if ((insertEventError as { code?: string }).code === '23505') {
      return new Response(JSON.stringify({ ok: true, duplicate: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: `Failed to persist webhook event: ${insertEventError.message}` }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await upsertSubscriptionSnapshot(supabase, subscription);
        break;
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === 'subscription' && session.subscription) {
          const subscriptionId = typeof session.subscription === 'string'
            ? session.subscription
            : session.subscription.id;

          const subscription = await stripe.subscriptions.retrieve(subscriptionId);
          await upsertSubscriptionSnapshot(supabase, subscription);
          break;
        }

        if (session.mode === 'payment' && session.metadata?.product_type === 'dice_pack') {
          await applyDicePackCredit(supabase, event, session);
          break;
        }

        await updateWebhookEventStatus(supabase, event.id, 'ignored', `Unhandled checkout.session.completed mode=${session.mode}`);
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      default: {
        await updateWebhookEventStatus(supabase, event.id, 'ignored', `Unhandled event type ${event.type}`);
        return new Response(JSON.stringify({ ok: true, ignored: true }), {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    await updateWebhookEventStatus(supabase, event.id, 'processed');

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await updateWebhookEventStatus(supabase, event.id, 'failed', message);

    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
