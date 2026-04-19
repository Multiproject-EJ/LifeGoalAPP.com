import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getIslandRunRuntimeStateBackend } from './islandRunRuntimeStateBackend';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import type {
  CreatureCollectionRuntimeEntry,
  PerIslandEggsLedger,
  PerfectCompanionReason,
} from './islandRunGameStateStore';

export interface IslandRunRuntimeState {
  runtimeVersion: number;
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
  onboardingDisplayNameLoopCompleted: boolean;
  storyPrologueSeen: boolean;
  audioEnabled: boolean;
  currentIslandNumber: number;
  cycleIndex: number;
  bossTrialResolvedIslandNumber: number | null;
  activeEggTier: 'common' | 'rare' | 'mythic' | null;
  activeEggSetAtMs: number | null;
  activeEggHatchDurationMs: number | null;
  activeEggIsDormant: boolean;
  perIslandEggs: PerIslandEggsLedger;
  islandStartedAtMs: number;
  islandExpiresAtMs: number;
  islandShards: number;
  tokenIndex: number;
  hearts: number;
  coins: number;
  spinTokens: number;
  dicePool: number;
  shardTierIndex: number;
  shardClaimCount: number;
  shields: number;
  shards: number;
  diamonds: number;
  creatureTreatInventory: {
    basic: number;
    favorite: number;
    rare: number;
  };
  companionBonusLastVisitKey: string | null;
  completedStopsByIsland: Record<string, string[]>;
  /** Per-island essence-ticket ledger (stop indices 1-4 whose ticket was paid). */
  stopTicketsPaidByIsland: Record<string, number[]>;
  marketOwnedBundlesByIsland: Record<string, {
    dice_bundle: boolean;
    heart_bundle: boolean;
    heart_boost_bundle: boolean;
  }>;
  creatureCollection: CreatureCollectionRuntimeEntry[];
  activeCompanionId: string | null;
  perfectCompanionIds: string[];
  perfectCompanionReasons: Record<string, PerfectCompanionReason>;
  perfectCompanionComputedAtMs: number | null;
  perfectCompanionModelVersion: string | null;
  perfectCompanionComputedCycleIndex: number | null;
  activeStopIndex: number;
  activeStopType: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
  stopStatesByIndex: Array<{ objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number }>;
  stopBuildStateByIndex: Array<{ requiredEssence: number; spentEssence: number; buildLevel: number }>;
  bossState: { unlocked: boolean; objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number };
  essence: number;
  essenceLifetimeEarned: number;
  essenceLifetimeSpent: number;
  diceRegenState: { maxDice: number; regenRatePerHour: number; lastRegenAtMs: number } | null;
  rewardBarProgress: number;
  rewardBarThreshold: number;
  rewardBarClaimCountInEvent: number;
  rewardBarEscalationTier: number;
  rewardBarLastClaimAtMs: number | null;
  rewardBarBoundEventId: string | null;
  rewardBarLadderId: string | null;
  activeTimedEvent: { eventId: string; eventType: string; startedAtMs: number; expiresAtMs: number; version: number } | null;
  activeTimedEventProgress: { feedingActions: number; tokensEarned: number; milestonesClaimed: number };
  stickerProgress: { fragments: number; guaranteedAt?: number; pityCounter?: number };
  stickerInventory: Record<string, number>;
  /** Essence lost to drift on last hydration/session-open (for UI notification). 0 = no drift. */
  lastEssenceDriftLost: number;
}

export function readIslandRunRuntimeState(session: Session): IslandRunRuntimeState {
  return getIslandRunRuntimeStateBackend().read(session);
}

export async function hydrateIslandRunRuntimeState(options: {
  session: Session;
  client: SupabaseClient | null;
  forceRemote?: boolean;
}): Promise<IslandRunRuntimeState> {
  const { session, client, forceRemote } = options;
  return getIslandRunRuntimeStateBackend().hydrate({ session, client, forceRemote });
}

export async function hydrateIslandRunRuntimeStateWithSource(options: {
  session: Session;
  client: SupabaseClient | null;
  forceRemote?: boolean;
}): Promise<{
  state: IslandRunRuntimeState;
  source: IslandRunRuntimeHydrationSource;
}> {
  const { session, client, forceRemote } = options;
  return getIslandRunRuntimeStateBackend().hydrateWithSource({ session, client, forceRemote });
}

// M16E: Collectible roster for the blind-box reveal (era order, cycling by shard_tier_index)
export interface CollectibleInfo {
  emoji: string;
  name: string;
  era: string;
}

const COLLECTIBLE_ROSTER: CollectibleInfo[] = [
  { emoji: '⚡', name: 'Energy Cell',  era: 'Era 1 — Electric Age'    },
  { emoji: '🎳', name: 'Bowl Token',   era: 'Era 2 — Bowling Era'     },
  { emoji: '🌸', name: 'Petal',        era: 'Era 3 — Cherry Blossom'  },
  { emoji: '💡', name: 'Spark Shard',  era: 'Era 4 — Invention Age'   },
  { emoji: '🔷', name: 'Memory Gem',   era: 'Era 5 — Crystal Era'     },
  { emoji: '🌀', name: 'Flux Orb',     era: 'Era 6 — Vortex Age'      },
  { emoji: '🌈', name: 'Prism Shard',  era: 'Era 7 — Rainbow Era'     },
];

/**
 * Returns the collectible earned for the given shard_tier_index.
 * Deterministic and cycles through the 7 era collectibles indefinitely.
 */
export function resolveCollectibleForClaim(shardTierIndex: number): CollectibleInfo {
  return COLLECTIBLE_ROSTER[shardTierIndex % COLLECTIBLE_ROSTER.length];
}

export async function persistIslandRunRuntimeStatePatch(options: {
  session: Session;
  client: SupabaseClient | null;
  patch: {
    firstRunClaimed?: boolean;
    dailyHeartsClaimedDayKey?: string | null;
    onboardingDisplayNameLoopCompleted?: boolean;
    storyPrologueSeen?: boolean;
    audioEnabled?: boolean;
    onboardingComplete?: boolean;
    currentIslandNumber?: number;
    cycleIndex?: number;
    bossTrialResolvedIslandNumber?: number | null;
    activeEggTier?: 'common' | 'rare' | 'mythic' | null;
    activeEggSetAtMs?: number | null;
    activeEggHatchDurationMs?: number | null;
    activeEggIsDormant?: boolean;
    perIslandEggs?: PerIslandEggsLedger;
    islandStartedAtMs?: number;
    islandExpiresAtMs?: number;
    islandShards?: number;
    tokenIndex?: number;
    hearts?: number;
    coins?: number;
    spinTokens?: number;
    dicePool?: number;
    shardTierIndex?: number;
    shardClaimCount?: number;
    shields?: number;
    shards?: number;
    diamonds?: number;
    creatureTreatInventory?: {
      basic: number;
      favorite: number;
      rare: number;
    };
    companionBonusLastVisitKey?: string | null;
    completedStopsByIsland?: Record<string, string[]>;
    stopTicketsPaidByIsland?: Record<string, number[]>;
    marketOwnedBundlesByIsland?: Record<string, {
      dice_bundle: boolean;
      heart_bundle: boolean;
      heart_boost_bundle: boolean;
    }>;
    creatureCollection?: CreatureCollectionRuntimeEntry[];
    activeCompanionId?: string | null;
    perfectCompanionIds?: string[];
    perfectCompanionReasons?: Record<string, PerfectCompanionReason>;
    perfectCompanionComputedAtMs?: number | null;
    perfectCompanionModelVersion?: string | null;
    perfectCompanionComputedCycleIndex?: number | null;
    activeStopIndex?: number;
    activeStopType?: 'hatchery' | 'habit' | 'mystery' | 'wisdom' | 'boss';
    stopStatesByIndex?: Array<{ objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number }>;
    stopBuildStateByIndex?: Array<{ requiredEssence: number; spentEssence: number; buildLevel: number }>;
    bossState?: { unlocked: boolean; objectiveComplete: boolean; buildComplete: boolean; completedAtMs?: number };
    essence?: number;
    essenceLifetimeEarned?: number;
    essenceLifetimeSpent?: number;
    diceRegenState?: { maxDice: number; regenRatePerHour: number; lastRegenAtMs: number } | null;
    rewardBarProgress?: number;
    rewardBarThreshold?: number;
    rewardBarClaimCountInEvent?: number;
    rewardBarEscalationTier?: number;
    rewardBarLastClaimAtMs?: number | null;
    rewardBarBoundEventId?: string | null;
    rewardBarLadderId?: string | null;
    activeTimedEvent?: { eventId: string; eventType: string; startedAtMs: number; expiresAtMs: number; version: number } | null;
    activeTimedEventProgress?: { feedingActions: number; tokensEarned: number; milestonesClaimed: number };
    stickerProgress?: { fragments: number; guaranteedAt?: number; pityCounter?: number };
    stickerInventory?: Record<string, number>;
    lastEssenceDriftLost?: number;
  };
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, patch } = options;
  return getIslandRunRuntimeStateBackend().persistPatch({ session, client, patch });
}
