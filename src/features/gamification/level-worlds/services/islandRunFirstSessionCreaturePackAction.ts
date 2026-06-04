import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  readIslandRunGameStateRecord,
  type CreatureCollectionRuntimeEntry,
  type IslandRunGameStateRecord,
} from './islandRunGameStateStore';
import {
  buildCreaturePackCards,
  CREATURE_PACK_CARD_COUNT,
  CREATURE_PACK_MIN_NEW_CREATURE_CARDS,
  STANDARD_CREATURE_PACK_SLOT_WEIGHTS,
  type CreaturePackCardReveal,
} from './islandRunCreaturePackResolver';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { addCreatureToRuntimeCollection } from './islandRunCreatureCollectionLedger';
import { commitIslandRunState } from './islandRunStateStore';
import { ISLAND_RUN_ECONOMY_SOURCES, recordIslandRunDiceInflow } from './islandRunEconomyTelemetry';

export const FIRST_SESSION_CREATURE_PACK_CARD_COUNT = CREATURE_PACK_CARD_COUNT;
export const FIRST_SESSION_CREATURE_PACK_DICE_REWARD = 100;
export const FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION = 'first_session_creature_pack_v1';

export type FirstSessionCreaturePackCardReveal = CreaturePackCardReveal;

export interface FirstSessionCreaturePackRevealPayload {
  source: 'first_session_onboarding_creature_pack';
  resolverVersion: typeof FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION;
  cardCount: typeof FIRST_SESSION_CREATURE_PACK_CARD_COUNT;
  diceGranted: typeof FIRST_SESSION_CREATURE_PACK_DICE_REWARD;
  cards: FirstSessionCreaturePackCardReveal[];
}

export interface ClaimFirstSessionCreaturePackRewardOptions {
  session: Session;
  client: SupabaseClient | null;
  nowMs?: number;
  triggerSource?: string;
}

export interface ClaimFirstSessionCreaturePackRewardResult {
  status: 'claimed' | 'already_claimed' | 'not_eligible';
  record: IslandRunGameStateRecord;
  revealPayload: FirstSessionCreaturePackRevealPayload | null;
  failureReason?: 'invalid_tutorial_state' | 'outside_first_island_onboarding';
}


function normalizeNowMs(nowMs: number | undefined): number {
  return typeof nowMs === 'number' && Number.isFinite(nowMs)
    ? Math.max(0, Math.floor(nowMs))
    : Date.now();
}

function applyPackCardsToCollection(options: {
  collection: CreatureCollectionRuntimeEntry[];
  cards: FirstSessionCreaturePackCardReveal[];
  islandNumber: number;
  collectedAtMs: number;
}): CreatureCollectionRuntimeEntry[] {
  const { cards, islandNumber, collectedAtMs } = options;
  return cards.reduce((collection, card) => addCreatureToRuntimeCollection({
    collection,
    creatureId: card.creatureId,
    islandNumber,
    collectedAtMs,
  }), options.collection);
}

function isOutsideFirstIslandOnboarding(record: IslandRunGameStateRecord): boolean {
  return record.currentIslandNumber !== 1 || record.cycleIndex !== 0;
}

export function claimFirstSessionCreaturePackReward(
  options: ClaimFirstSessionCreaturePackRewardOptions,
): Promise<ClaimFirstSessionCreaturePackRewardResult> {
  return withIslandRunActionLock(options.session.user.id, async () => {
    const { session, client, triggerSource } = options;
    const current = readIslandRunGameStateRecord(session);

    if (
      current.firstSessionTutorialState === 'first_creature_pack_opened'
      || current.firstSessionTutorialState === 'first_creature_pack_claimed'
    ) {
      return {
        status: 'already_claimed',
        record: current,
        revealPayload: null,
      };
    }

    if (current.firstSessionTutorialState !== 'first_creature_pack_available') {
      return {
        status: 'not_eligible',
        record: current,
        revealPayload: null,
        failureReason: 'invalid_tutorial_state',
      };
    }

    if (isOutsideFirstIslandOnboarding(current)) {
      return {
        status: 'not_eligible',
        record: current,
        revealPayload: null,
        failureReason: 'outside_first_island_onboarding',
      };
    }

    const openedAtMs = normalizeNowMs(options.nowMs);
    const cards = buildCreaturePackCards({
      current,
      openedAtMs,
      userId: session.user.id,
      seedScope: 'first_session_creature_pack',
      slotWeights: STANDARD_CREATURE_PACK_SLOT_WEIGHTS,
      minNewCreatureCards: CREATURE_PACK_MIN_NEW_CREATURE_CARDS,
    });
    const nextCreatureCollection = applyPackCardsToCollection({
      collection: current.creatureCollection,
      cards,
      islandNumber: current.currentIslandNumber,
      collectedAtMs: openedAtMs,
    });
    const next: IslandRunGameStateRecord = {
      ...current,
      dicePool: Math.max(0, current.dicePool + FIRST_SESSION_CREATURE_PACK_DICE_REWARD),
      creatureCollection: nextCreatureCollection,
      firstSessionTutorialState: 'first_creature_pack_claimed',
      runtimeVersion: current.runtimeVersion + 1,
    };

    recordIslandRunDiceInflow({
      source: ISLAND_RUN_ECONOMY_SOURCES.firstSessionTutorialDice,
      amount: FIRST_SESSION_CREATURE_PACK_DICE_REWARD,
      sessionId: session.user.id,
      atMs: openedAtMs,
      metadata: { source: 'first_session_creature_pack' },
    });
    await commitIslandRunState({
      session,
      client,
      record: next,
      triggerSource: triggerSource ?? 'claim_first_session_creature_pack_reward',
    });

    return {
      status: 'claimed',
      record: next,
      revealPayload: {
        source: 'first_session_onboarding_creature_pack',
        resolverVersion: FIRST_SESSION_CREATURE_PACK_RESOLVER_VERSION,
        cardCount: FIRST_SESSION_CREATURE_PACK_CARD_COUNT,
        diceGranted: FIRST_SESSION_CREATURE_PACK_DICE_REWARD,
        cards,
      },
    };
  });
}
