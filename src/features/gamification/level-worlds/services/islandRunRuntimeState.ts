import type { Session, SupabaseClient } from '@supabase/supabase-js';
import { getIslandRunRuntimeStateBackend } from './islandRunRuntimeStateBackend';
import type { IslandRunRuntimeHydrationSource } from './islandRunRuntimeTelemetry';
import type { PerIslandEggsLedger } from './islandRunGameStateStore';

export interface IslandRunRuntimeState {
  firstRunClaimed: boolean;
  dailyHeartsClaimedDayKey: string | null;
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
  completedStopsByIsland: Record<string, string[]>;
}

export function readIslandRunRuntimeState(session: Session): IslandRunRuntimeState {
  return getIslandRunRuntimeStateBackend().read(session);
}

export async function hydrateIslandRunRuntimeState(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<IslandRunRuntimeState> {
  const { session, client } = options;
  return getIslandRunRuntimeStateBackend().hydrate({ session, client });
}

export async function hydrateIslandRunRuntimeStateWithSource(options: {
  session: Session;
  client: SupabaseClient | null;
}): Promise<{
  state: IslandRunRuntimeState;
  source: IslandRunRuntimeHydrationSource;
}> {
  const { session, client } = options;
  return getIslandRunRuntimeStateBackend().hydrateWithSource({ session, client });
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
    completedStopsByIsland?: Record<string, string[]>;
  };
}): Promise<{ ok: true } | { ok: false; errorMessage: string }> {
  const { session, client, patch } = options;
  return getIslandRunRuntimeStateBackend().persistPatch({ session, client, patch });
}
