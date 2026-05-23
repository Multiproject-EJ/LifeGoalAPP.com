import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { addCreatureToRuntimeCollection } from './islandRunCreatureCollectionLedger';
import {
  buildCreaturePackCards,
  CREATURE_PACK_CARD_COUNT,
  type CreaturePackCardReveal,
  type CreaturePackWeightedTier,
} from './islandRunCreaturePackResolver';
import {
  readIslandRunGameStateRecord,
  type CreatureCollectionRuntimeEntry,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import { commitIslandRunState } from './islandRunStateStore';
import { getWelcomePackEligibility } from './islandRunWelcomePackEligibility';

export const WELCOME_PACK_CARD_COUNT = CREATURE_PACK_CARD_COUNT;
export const WELCOME_PACK_RESOLVER_VERSION = 'welcome_pack_v1';

const WELCOME_PACK_SLOT_WEIGHTS: CreaturePackWeightedTier[][] = [
  [{ tier: 'common', weight: 1 }],
  [{ tier: 'common', weight: 95 }, { tier: 'rare', weight: 5 }],
  [{ tier: 'common', weight: 90 }, { tier: 'rare', weight: 10 }],
  [{ tier: 'common', weight: 85 }, { tier: 'rare', weight: 15 }],
  [{ tier: 'common', weight: 80 }, { tier: 'rare', weight: 20 }],
];

export type WelcomePackCardReveal = CreaturePackCardReveal;

export interface WelcomePackClaimRevealPayload {
  source: 'welcome_pack_starter_cards';
  resolverVersion: typeof WELCOME_PACK_RESOLVER_VERSION;
  cardCount: typeof WELCOME_PACK_CARD_COUNT;
  cards: WelcomePackCardReveal[];
}

export interface ClaimWelcomePackStarterCardsOptions {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
  triggerSource?: string;
}

export interface ClaimWelcomePackStarterCardsResult {
  status: 'claimed' | 'already_claimed';
  record: IslandRunGameStateRecord;
  revealPayload: WelcomePackClaimRevealPayload | null;
}

function normalizeNowMs(nowMs: number | undefined): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : Date.now();
}

function applyPackCardsToCollection(options: {
  collection: CreatureCollectionRuntimeEntry[];
  cards: WelcomePackCardReveal[];
  islandNumber: number;
  collectedAtMs: number;
}): CreatureCollectionRuntimeEntry[] {
  const { cards, islandNumber, collectedAtMs } = options;
  return cards.reduce((collection, card) => addCreatureToRuntimeCollection({
    collection,
    creatureId: card.creatureId,
    islandNumber,
    collectedAtMs,
    grantId: 'welcome_pack_starter_cards',
  }), options.collection);
}

export function claimWelcomePackStarterCards(
  options: ClaimWelcomePackStarterCardsOptions,
): Promise<ClaimWelcomePackStarterCardsResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const current = readIslandRunGameStateRecord(session);
    const eligibility = getWelcomePackEligibility(current);

    if (eligibility === 'already_claimed') {
      return {
        status: 'already_claimed',
        record: current,
        revealPayload: null,
      };
    }

    const claimedAtMs = normalizeNowMs(options.nowMs);
    const cards = buildCreaturePackCards({
      current,
      openedAtMs: claimedAtMs,
      userId: session.user.id,
      seedScope: 'welcome_pack_starter_cards',
      slotWeights: WELCOME_PACK_SLOT_WEIGHTS,
    });

    const next: IslandRunGameStateRecord = {
      ...current,
      creatureCollection: applyPackCardsToCollection({
        collection: current.creatureCollection,
        cards,
        islandNumber: current.currentIslandNumber,
        collectedAtMs: claimedAtMs,
      }),
      welcomePackClaimed: true,
      runtimeVersion: current.runtimeVersion + 1,
    };

    await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'claim_welcome_pack_starter_cards',
    });

    return {
      status: 'claimed',
      record: next,
      revealPayload: {
        source: 'welcome_pack_starter_cards',
        resolverVersion: WELCOME_PACK_RESOLVER_VERSION,
        cardCount: WELCOME_PACK_CARD_COUNT,
        cards,
      },
    };
  });
}
