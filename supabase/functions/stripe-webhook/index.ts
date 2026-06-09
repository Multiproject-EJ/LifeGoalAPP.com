import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'npm:@supabase/supabase-js@2';
import Stripe from 'npm:stripe@14.25.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, stripe-signature',
};

const DEFAULT_DICE_PACK_ROLLS = 500;
const DEFAULT_MINIGAME_TICKETS_PER_PACK = 10;
const CREATURE_PACK_CARD_COUNT = 5;
const CREATURE_PACK_MIN_NEW_CREATURE_CARDS = 2;
const CREATURE_PACK_SLOT_WEIGHTS: { tier: CreatureTier; weight: number }[][] = [
  [{ tier: 'common', weight: 1 }],
  [{ tier: 'common', weight: 95 }, { tier: 'rare', weight: 5 }],
  [{ tier: 'common', weight: 90 }, { tier: 'rare', weight: 10 }],
  [{ tier: 'common', weight: 85 }, { tier: 'rare', weight: 15 }],
  [{ tier: 'common', weight: 80 }, { tier: 'rare', weight: 20 }],
];

type CreatureTier = 'common' | 'rare' | 'mythic';

type CreatureCatalogEntry = { id: string; tier: CreatureTier };

type CreatureCollectionEntry = {
  creatureId: string;
  copies: number;
  firstCollectedAtMs: number;
  lastCollectedAtMs: number;
  lastCollectedIslandNumber: number;
  bondXp: number;
  bondLevel: number;
  lastFedAtMs: number | null;
  claimedBondMilestones: number[];
  formLevel?: number;
  claimedFormRewards?: number[];
  grantIds?: string[];
};

function creatureIdsForTier(ids: string[], tier: CreatureTier): CreatureCatalogEntry[] {
  return ids.map((id) => ({ id, tier }));
}

const CREATURE_CATALOG: CreatureCatalogEntry[] = [
  ...creatureIdsForTier([
    'common-sproutling', 'common-pebble-spirit', 'common-mossling', 'common-glowtail', 'common-drift-pup', 'common-bloom-mite', 'common-stone-hopper', 'common-fern-fox', 'common-dewling', 'common-root-whisp', 'common-garden-puff', 'common-lichen-kit', 'common-twilight-seed', 'common-river-bud', 'common-petal-scout',
  ], 'common'),
  ...creatureIdsForTier([
    'rare-luma-hatchling', 'rare-nebula-wisp', 'rare-dewleaf-sprite', 'rare-aurora-finch', 'rare-ember-sprout', 'rare-solar-pika', 'rare-comet-cub', 'rare-bloom-seraph', 'rare-shard-marten', 'rare-cinder-mouse', 'rare-tide-lantern', 'rare-halo-staglet', 'rare-gear-wing', 'rare-mirage-pup', 'rare-crown-drifter',
  ], 'rare'),
  ...creatureIdsForTier([
    'mythic-starhorn-seraph', 'mythic-voidlight-familiar', 'mythic-sunflare-kirin', 'mythic-dreamroot-ancient', 'mythic-celest-pup', 'mythic-lux-leviathan', 'mythic-orbit-vulpine', 'mythic-astral-titanet', 'mythic-solstice-sylph', 'mythic-echo-phoenix', 'mythic-nightbloom-drake', 'mythic-prism-warden', 'mythic-aurora-maned-cat', 'mythic-cosmos-songbird', 'mythic-infinity-sprite',
  ], 'mythic'),
];

type MinigameTicketSkuId =
  | 'minigame_tickets_10'
  | 'feeding_frenzy_tickets_10'
  | 'lucky_spin_tickets_10'
  | 'space_excavator_tickets_10'
  | 'companion_feast_tickets_10';

type TimedEventId = 'feeding_frenzy' | 'lucky_spin' | 'space_excavator' | 'companion_feast';

type ThemeId =
  | 'sproutling-grove'
  | 'ember-glow'
  | 'aurora-sky'
  | 'nebula-drift'
  | 'starhorn-celestial';

type SupabaseLikeClient = ReturnType<typeof createClient>;


function hashStringToUint32(input: string): number {
  let hash = 2166136261;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function normalizeCreatureCollection(value: unknown): CreatureCollectionEntry[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is CreatureCollectionEntry => Boolean(
    entry
    && typeof entry === 'object'
    && !Array.isArray(entry)
    && typeof (entry as CreatureCollectionEntry).creatureId === 'string',
  )).map((entry) => ({
    ...entry,
    copies: Number.isFinite(entry.copies) ? Math.max(1, Math.floor(entry.copies)) : 1,
    bondXp: Number.isFinite(entry.bondXp) ? Math.max(0, Math.floor(entry.bondXp)) : 0,
    bondLevel: Number.isFinite(entry.bondLevel) ? Math.max(1, Math.floor(entry.bondLevel)) : 1,
    claimedBondMilestones: Array.isArray(entry.claimedBondMilestones) ? entry.claimedBondMilestones : [],
    lastFedAtMs: Number.isFinite(entry.lastFedAtMs) ? entry.lastFedAtMs : null,
  }));
}

function chooseTierForCreaturePackSlot(slotIndex: number, seed: string): CreatureTier {
  const weights = CREATURE_PACK_SLOT_WEIGHTS[slotIndex] ?? CREATURE_PACK_SLOT_WEIGHTS[0];
  const totalWeight = weights.reduce((sum, entry) => sum + Math.max(0, entry.weight), 0);
  let roll = hashStringToUint32(`${seed}:tier:${slotIndex}`) % Math.max(1, totalWeight);
  for (const entry of weights) {
    roll -= Math.max(0, entry.weight);
    if (roll < 0) return entry.tier;
  }
  return 'common';
}

function appendGrantId(grantIds: string[] | undefined, grantId: string): string[] {
  const ids = Array.isArray(grantIds) ? grantIds : [];
  return ids.includes(grantId) ? ids : [...ids, grantId];
}

function addCreatureToCollection(collection: CreatureCollectionEntry[], creatureId: string, islandNumber: number, collectedAtMs: number, grantId: string): CreatureCollectionEntry[] {
  const existing = collection.find((entry) => entry.creatureId === creatureId);
  if (existing) {
    return collection.map((entry) => entry.creatureId === creatureId
      ? {
          ...entry,
          copies: entry.copies + 1,
          lastCollectedAtMs: collectedAtMs,
          lastCollectedIslandNumber: islandNumber,
          grantIds: appendGrantId(entry.grantIds, grantId),
        }
      : entry);
  }
  return [{
    creatureId,
    copies: 1,
    firstCollectedAtMs: collectedAtMs,
    lastCollectedAtMs: collectedAtMs,
    lastCollectedIslandNumber: islandNumber,
    bondXp: 0,
    bondLevel: 1,
    lastFedAtMs: null,
    claimedBondMilestones: [],
    grantIds: [grantId],
  }, ...collection];
}

function buildPaidCreaturePackCreatureIds(options: {
  collection: CreatureCollectionEntry[];
  userId: string;
  checkoutSessionId: string;
  islandNumber: number;
  cycleIndex: number;
  runtimeVersion: number;
  nowMs: number;
}): string[] {
  const seed = [options.userId, 'stripe_creature_pack', options.checkoutSessionId, options.islandNumber, options.cycleIndex, options.runtimeVersion, options.nowMs].join(':');
  const originallyOwnedCreatureIds = new Set(options.collection.filter((entry) => entry.copies > 0).map((entry) => entry.creatureId));
  const availableUnownedCount = CREATURE_CATALOG.filter((creature) => !originallyOwnedCreatureIds.has(creature.id)).length;
  const guaranteedNewTarget = Math.min(CREATURE_PACK_MIN_NEW_CREATURE_CARDS, availableUnownedCount);
  const usedCreatureIds = new Set<string>();
  const selectedCreatureIds: string[] = [];
  let newCreatureCards = 0;

  for (let slotIndex = 0; slotIndex < CREATURE_PACK_CARD_COUNT; slotIndex += 1) {
    const tier = chooseTierForCreaturePackSlot(slotIndex, seed);
    const tierPool = CREATURE_CATALOG.filter((creature) => creature.tier === tier && !usedCreatureIds.has(creature.id));
    const unownedTierPool = tierPool.filter((creature) => !originallyOwnedCreatureIds.has(creature.id));
    const remainingSlotsIncludingThis = CREATURE_PACK_CARD_COUNT - slotIndex;
    const remainingNewNeeded = Math.max(0, guaranteedNewTarget - newCreatureCards);
    const mustPickNew = remainingNewNeeded > 0 && remainingSlotsIncludingThis <= remainingNewNeeded;
    let pool = remainingNewNeeded > 0 && unownedTierPool.length > 0 ? unownedTierPool : tierPool;
    if (mustPickNew && pool.every((creature) => originallyOwnedCreatureIds.has(creature.id))) {
      const anyUnownedPool = CREATURE_CATALOG.filter((creature) => !usedCreatureIds.has(creature.id) && !originallyOwnedCreatureIds.has(creature.id));
      if (anyUnownedPool.length > 0) pool = anyUnownedPool;
    }
    if (pool.length < 1) pool = CREATURE_CATALOG.filter((creature) => creature.tier === tier);
    const creature = pool[hashStringToUint32(`${seed}:creature:${slotIndex}:${tier}:${remainingNewNeeded > 0 ? 'new' : 'any'}`) % Math.max(1, pool.length)] ?? CREATURE_CATALOG[0];
    selectedCreatureIds.push(creature.id);
    usedCreatureIds.add(creature.id);
    if (!originallyOwnedCreatureIds.has(creature.id)) newCreatureCards += 1;
  }

  return selectedCreatureIds;
}

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

function parseMinigameTickets(metadata: Record<string, string> | null | undefined): number {
  const raw = metadata?.tickets;
  const parsed = raw ? Number.parseInt(raw, 10) : NaN;
  if (Number.isNaN(parsed) || parsed <= 0) return DEFAULT_MINIGAME_TICKETS_PER_PACK;
  return parsed;
}

function isTimedEventId(value: string | null | undefined): value is TimedEventId {
  return value === 'feeding_frenzy'
    || value === 'lucky_spin'
    || value === 'space_excavator'
    || value === 'companion_feast';
}

function isMinigameTicketSkuId(value: string | null | undefined): value is MinigameTicketSkuId {
  return value === 'minigame_tickets_10'
    || value === 'feeding_frenzy_tickets_10'
    || value === 'lucky_spin_tickets_10'
    || value === 'space_excavator_tickets_10'
    || value === 'companion_feast_tickets_10';
}

function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === 'sproutling-grove'
    || value === 'ember-glow'
    || value === 'aurora-sky'
    || value === 'nebula-drift'
    || value === 'starhorn-celestial';
}

function resolveEventIdFromMinigameSku(skuId: MinigameTicketSkuId, metadataEventId: string | null | undefined): TimedEventId | null {
  switch (skuId) {
    case 'feeding_frenzy_tickets_10':
      return 'feeding_frenzy';
    case 'lucky_spin_tickets_10':
      return 'lucky_spin';
    case 'space_excavator_tickets_10':
      return 'space_excavator';
    case 'companion_feast_tickets_10':
      return 'companion_feast';
    case 'minigame_tickets_10':
      return isTimedEventId(metadataEventId) ? metadataEventId : null;
    default:
      return null;
  }
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

async function applyMinigameTicketCredit(
  supabase: SupabaseLikeClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id;
  const userId = session.metadata?.user_id || session.client_reference_id || null;
  if (!sessionId || !userId) {
    throw new Error('Minigame ticket checkout session is missing session id or user id metadata.');
  }

  const skuId = session.metadata?.sku_id ?? null;
  if (!isMinigameTicketSkuId(skuId)) {
    throw new Error(`Minigame ticket checkout session metadata has invalid sku_id=${String(skuId)}`);
  }

  const targetEventId = resolveEventIdFromMinigameSku(skuId, session.metadata?.event_id);
  if (!targetEventId) {
    throw new Error(`Minigame ticket checkout session missing resolvable event target for sku_id=${skuId}`);
  }

  const { data: dedupeReservationRow, error: dedupeError } = await supabase
    .from('billing_webhook_events')
    .update({
      dedupe_scope: 'minigame_ticket_credit',
      dedupe_key: sessionId,
    })
    .eq('stripe_event_id', event.id)
    .select('stripe_event_id')
    .maybeSingle();

  if (dedupeError) {
    if ((dedupeError as { code?: string }).code === '23505') {
      await updateWebhookEventStatus(supabase, event.id, 'ignored', `Minigame ticket credit already applied for checkout_session_id=${sessionId}`);
      return;
    }
    throw new Error(`Failed to reserve minigame-ticket dedupe key: ${dedupeError.message}`);
  }

  if (!dedupeReservationRow?.stripe_event_id) {
    throw new Error(`Failed to reserve minigame-ticket dedupe key: webhook event row not found for stripe_event_id=${event.id}`);
  }

  const tickets = parseMinigameTickets(session.metadata);

  const { error: incrementError } = await supabase.rpc('increment_user_minigame_tickets_by_event', {
    p_user_id: userId,
    p_event_id: targetEventId,
    p_delta: tickets,
  });

  if (incrementError) {
    throw new Error(`Failed to atomically increment minigame tickets: ${incrementError.message}`);
  }
}



async function applyCreaturePackCredit(
  supabase: SupabaseLikeClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id;
  const userId = session.metadata?.user_id || session.client_reference_id || null;
  if (!sessionId || !userId) {
    throw new Error('Creature Pack checkout session is missing session id or user id metadata.');
  }
  if (session.payment_status !== 'paid') {
    throw new Error(`Creature Pack checkout session is not paid: payment_status=${session.payment_status}`);
  }
  if (session.metadata?.sku_id !== 'creature_pack_5') {
    throw new Error(`Creature Pack checkout session metadata has invalid sku_id=${String(session.metadata?.sku_id)}`);
  }

  const { data: dedupeReservationRow, error: dedupeError } = await supabase
    .from('billing_webhook_events')
    .update({
      dedupe_scope: 'creature_pack_credit',
      dedupe_key: sessionId,
    })
    .eq('stripe_event_id', event.id)
    .select('stripe_event_id')
    .maybeSingle();

  if (dedupeError) {
    if ((dedupeError as { code?: string }).code === '23505') {
      await updateWebhookEventStatus(supabase, event.id, 'ignored', `Creature Pack credit already applied for checkout_session_id=${sessionId}`);
      return;
    }
    throw new Error(`Failed to reserve Creature Pack dedupe key: ${dedupeError.message}`);
  }

  if (!dedupeReservationRow?.stripe_event_id) {
    throw new Error(`Failed to reserve Creature Pack dedupe key: webhook event row not found for stripe_event_id=${event.id}`);
  }

  const { data: row, error: readError } = await supabase
    .from('island_run_runtime_state')
    .select('user_id, runtime_version, current_island_number, cycle_index, creature_collection')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read Island Run runtime state for Creature Pack: ${readError.message}`);
  }

  const nowMs = Date.now();
  const runtimeVersion = Number.isFinite(row?.runtime_version) ? Math.max(0, Math.floor(row.runtime_version)) : 0;
  const islandNumber = Number.isFinite(row?.current_island_number) ? Math.max(1, Math.floor(row.current_island_number)) : 1;
  const cycleIndex = Number.isFinite(row?.cycle_index) ? Math.max(0, Math.floor(row.cycle_index)) : 0;
  let collection = normalizeCreatureCollection(row?.creature_collection);
  const grantId = `stripe_creature_pack:${sessionId}`;
  const creatureIds = buildPaidCreaturePackCreatureIds({
    collection,
    userId,
    checkoutSessionId: sessionId,
    islandNumber,
    cycleIndex,
    runtimeVersion,
    nowMs,
  });

  for (const creatureId of creatureIds) {
    collection = addCreatureToCollection(collection, creatureId, islandNumber, nowMs, grantId);
  }

  const { error: writeError } = await supabase
    .from('island_run_runtime_state')
    .upsert({
      user_id: userId,
      runtime_version: runtimeVersion + 1,
      current_island_number: islandNumber,
      cycle_index: cycleIndex,
      creature_collection: collection,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (writeError) {
    throw new Error(`Failed to grant Creature Pack into Island Run runtime state: ${writeError.message}`);
  }
}

async function applyThemeEntitlement(
  supabase: SupabaseLikeClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id;
  const userId = session.metadata?.user_id || session.client_reference_id || null;
  if (!sessionId || !userId) {
    throw new Error('Theme checkout session is missing session id or user id metadata.');
  }

  if (session.payment_status !== 'paid') {
    throw new Error(`Theme checkout session is not paid: payment_status=${session.payment_status}`);
  }

  const themeId = session.metadata?.theme_id ?? null;
  if (!isThemeId(themeId)) {
    throw new Error(`Theme checkout session metadata has invalid theme_id=${String(themeId)}`);
  }

  const { data: dedupeReservationRow, error: dedupeError } = await supabase
    .from('billing_webhook_events')
    .update({
      dedupe_scope: 'theme_entitlement',
      dedupe_key: sessionId,
    })
    .eq('stripe_event_id', event.id)
    .select('stripe_event_id')
    .maybeSingle();

  if (dedupeError) {
    if ((dedupeError as { code?: string }).code === '23505') {
      await updateWebhookEventStatus(supabase, event.id, 'ignored', `Theme entitlement already applied for checkout_session_id=${sessionId}`);
      return;
    }
    throw new Error(`Failed to reserve theme entitlement dedupe key: ${dedupeError.message}`);
  }

  if (!dedupeReservationRow?.stripe_event_id) {
    throw new Error(`Failed to reserve theme entitlement dedupe key: webhook event row not found for stripe_event_id=${event.id}`);
  }

  const paymentIntentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : session.payment_intent?.id ?? null;

  const { error: entitlementError } = await supabase
    .from('user_cosmetic_entitlements')
    .upsert({
      user_id: userId,
      cosmetic_type: 'theme',
      cosmetic_id: themeId,
      source: 'stripe_purchase',
      source_ref: session.metadata?.sku_id ?? session.metadata?.price_variant ?? null,
      stripe_checkout_session_id: sessionId,
      stripe_payment_intent_id: paymentIntentId,
      granted_at: new Date().toISOString(),
    }, { onConflict: 'user_id,cosmetic_type,cosmetic_id' });

  if (entitlementError) {
    throw new Error(`Failed to grant theme entitlement: ${entitlementError.message}`);
  }
}

type EggPackSkuId = 'egg_pack_small' | 'egg_pack_medium' | 'egg_pack_large';

function isEggPackSkuId(value: string | null | undefined): value is EggPackSkuId {
  return value === 'egg_pack_small' || value === 'egg_pack_medium' || value === 'egg_pack_large';
}

function hashU32(input: string): number {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

const EGG_PACK_TIER_DISTRIBUTIONS: Record<EggPackSkuId, Array<'common' | 'rare'>> = {
  egg_pack_small: ['common', 'common', 'common'],
  egg_pack_medium: [
    'common', 'common', 'common', 'common', 'common',
    'common', 'common', 'common', 'common', 'common',
    'common', 'common', 'rare', 'rare', 'rare',
  ],
  egg_pack_large: [
    'common', 'common', 'common', 'common', 'common',
    'common', 'common', 'common', 'common', 'common',
    'common', 'common', 'common', 'common', 'common',
    'common', 'common', 'common', 'common', 'rare',
    'rare', 'rare', 'rare', 'rare', 'rare',
  ],
};

async function applyEggPackCredit(
  supabase: SupabaseLikeClient,
  event: Stripe.Event,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const sessionId = session.id;
  const userId = session.metadata?.user_id || session.client_reference_id || null;
  if (!sessionId || !userId) {
    throw new Error('Egg Pack checkout session is missing session id or user id metadata.');
  }
  if (session.payment_status !== 'paid') {
    throw new Error(`Egg Pack checkout session is not paid: payment_status=${session.payment_status}`);
  }
  const skuId = session.metadata?.sku_id ?? null;
  if (!isEggPackSkuId(skuId)) {
    throw new Error(`Egg Pack checkout session metadata has invalid sku_id=${String(skuId)}`);
  }

  const { data: dedupeReservationRow, error: dedupeError } = await supabase
    .from('billing_webhook_events')
    .update({ dedupe_scope: 'egg_pack_credit', dedupe_key: sessionId })
    .eq('stripe_event_id', event.id)
    .select('stripe_event_id')
    .maybeSingle();

  if (dedupeError) {
    if ((dedupeError as { code?: string }).code === '23505') {
      await updateWebhookEventStatus(supabase, event.id, 'ignored', `Egg Pack credit already applied for checkout_session_id=${sessionId}`);
      return;
    }
    throw new Error(`Failed to reserve Egg Pack dedupe key: ${dedupeError.message}`);
  }

  if (!dedupeReservationRow?.stripe_event_id) {
    throw new Error(`Failed to reserve Egg Pack dedupe key: webhook event row not found for stripe_event_id=${event.id}`);
  }

  const { data: row, error: readError } = await supabase
    .from('island_run_runtime_state')
    .select('user_id, runtime_version, egg_reward_inventory')
    .eq('user_id', userId)
    .maybeSingle();

  if (readError) {
    throw new Error(`Failed to read Island Run runtime state for Egg Pack: ${readError.message}`);
  }

  const nowMs = Date.now();
  const runtimeVersion = Number.isFinite(row?.runtime_version) ? Math.max(0, Math.floor(row.runtime_version)) : 0;
  const existingInventory: unknown[] = Array.isArray(row?.egg_reward_inventory) ? row.egg_reward_inventory : [];

  const tiers = EGG_PACK_TIER_DISTRIBUTIONS[skuId];
  const newEntries = tiers.map((tier, index) => {
    const seed = `stripe_egg_pack:${sessionId}:${index}`;
    return {
      eggRewardId: `egg_pack:${sessionId}:${index}`,
      source: 'egg_pack',
      sourceSessionKey: sessionId,
      sourceRunId: 'egg_pack',
      sourceRewardId: skuId,
      tileId: 0,
      cycleIndex: 0,
      targetIslandNumber: 0,
      eggTier: tier,
      eggSeed: hashU32(seed),
      rarityRoll: 0,
      rarityRollDenominator: 500,
      rarityThreshold: 5,
      resolverVersion: 'egg_pack_v1',
      status: 'unopened',
      grantedAtMs: nowMs + index,
      openedAtMs: null,
    };
  });

  const mergedInventory = [...existingInventory, ...newEntries];

  const { error: writeError } = await supabase
    .from('island_run_runtime_state')
    .upsert({
      user_id: userId,
      runtime_version: runtimeVersion + 1,
      egg_reward_inventory: mergedInventory,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

  if (writeError) {
    throw new Error(`Failed to grant Egg Pack into Island Run runtime state: ${writeError.message}`);
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
    event = await stripe.webhooks.constructEventAsync(rawBody, signature, webhookSecret);
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

        if (session.mode === 'payment' && session.metadata?.product_type === 'minigame_ticket_pack') {
          await applyMinigameTicketCredit(supabase, event, session);
          break;
        }

        if (session.mode === 'payment' && session.metadata?.product_type === 'creature_pack') {
          await applyCreaturePackCredit(supabase, event, session);
          break;
        }

        if (session.mode === 'payment' && session.metadata?.product_type === 'theme') {
          await applyThemeEntitlement(supabase, event, session);
          break;
        }

        if (session.mode === 'payment' && session.metadata?.product_type === 'egg_pack') {
          await applyEggPackCredit(supabase, event, session);
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
