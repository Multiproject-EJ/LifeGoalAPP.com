/**
 * islandRunTileRewardAction — PWA-authority tile-landing reward service.
 *
 * Closes P1-9 (session 11). Previously a single tile landing issued two
 * independent `persistIslandRunRuntimeStatePatch` calls in the same React
 * tick — one for essence (award or hazard-deduct), one for reward-bar
 * progress + timed-event lifecycle. Each patch did its own async
 * read-modify-write, and both calls hydrated from the same pre-landing
 * snapshot before writing full records through the commit coordinator. The
 * later write's `nextState` was built off the stale hydrate, so it
 * overwrote the earlier write's essence delta at the storage layer. A tile
 * reward fired in the same tick as a roll commit was subject to the same
 * race.
 *
 * This service consolidates the whole landing effect into:
 *   1. A single hydrate (inside the shared action mutex).
 *   2. A single essence + reward-bar computation off that hydrate.
 *   3. A single `persistIslandRunRuntimeStatePatch` that carries both
 *      field sets atomically.
 *
 * The shared `withIslandRunActionLock` mutex (see `islandRunActionMutex.ts`)
 * is the same mutex that guards `executeIslandRunRollAction`, so a
 * tile-reward and a roll fired concurrently now serialise strictly: the
 * second action's hydrate always observes the first action's commit.
 *
 * Callers outside of tile landings (story episode reward, stop ticket
 * purchase, shop) continue to use the renderer-level `awardContractV2Essence`
 * / `deductContractV2Essence` helpers; those paths don't pair essence with
 * reward-bar progress and so don't have the two-write race. They can be
 * migrated in a follow-up if we find concurrency issues there.
 */

import type { Session, SupabaseClient } from '@supabase/supabase-js';
import {
  awardIslandRunContractV2Essence,
  deductIslandRunContractV2Essence,
  getStopUpgradeCost,
} from './islandRunContractV2EssenceBuild';
import {
  type IslandRunRewardBarRuntimeSlice,
  type RewardBarProgressSource,
} from './islandRunContractV2RewardBar';
import { recordEventProgress } from './islandRunEventEngine';
import { readIslandRunGameStateRecord } from './islandRunGameStateStore';
import { withIslandRunActionLock } from './islandRunActionMutex';
import { persistIslandRunRuntimeStatePatch } from './islandRunRuntimeState';

const TUTORIAL_HATCHERY_STOP_INDEX = 0;
const TUTORIAL_HATCHERY_L1_CURRENT_BUILD_LEVEL = 0;

function resolveTutorialEssenceOverride(
  state: ReturnType<typeof readIslandRunGameStateRecord>,
  requestedEssenceDelta: number,
): {
  essenceDelta: number;
  shouldSuppressRewardBarProgress: boolean;
  nextFirstSessionTutorialState: 'first_essence_reward_claimed' | null;
} {
  // The onboarding override only applies to positive essence landings. Hazards
  // and neutral tiles keep their normal semantics, including in tutorial state.
  if (state.currentIslandNumber !== 1 || state.cycleIndex !== 0 || requestedEssenceDelta <= 0) {
    return {
      essenceDelta: requestedEssenceDelta,
      shouldSuppressRewardBarProgress: false,
      nextFirstSessionTutorialState: null,
    };
  }

  if (state.firstSessionTutorialState === 'first_roll_consumed') {
    return {
      essenceDelta: getStopUpgradeCost({
        islandNumber: 1,
        stopIndex: TUTORIAL_HATCHERY_STOP_INDEX,
        currentBuildLevel: TUTORIAL_HATCHERY_L1_CURRENT_BUILD_LEVEL,
      }),
      shouldSuppressRewardBarProgress: true,
      nextFirstSessionTutorialState: 'first_essence_reward_claimed',
    };
  }

  if (
    state.firstSessionTutorialState === 'first_essence_reward_claimed'
    || state.firstSessionTutorialState === 'build_prompt_visible'
  ) {
    // firstSessionTutorialState is the idempotency marker for this one-time
    // tutorial reward. While the flow is parked on the immediate post-claim /
    // build-prompt states, repeated stale landing resolves no-op instead of
    // falling through to a normal tile reward and double-crediting the player.
    return {
      essenceDelta: 0,
      shouldSuppressRewardBarProgress: true,
      nextFirstSessionTutorialState: null,
    };
  }

  return {
    essenceDelta: requestedEssenceDelta,
    shouldSuppressRewardBarProgress: false,
    nextFirstSessionTutorialState: null,
  };
}

export interface IslandRunTileRewardActionOptions {
  session: Session;
  client: SupabaseClient | null;
  /** Signed essence delta. Positive = award, negative = hazard deduction. */
  essenceDelta: number;
  /**
   * Reward-bar progress input. When set, the action advances the reward bar
   * under the same mutex and writes the updated slice alongside the essence
   * fields. Omit (or pass `null`) when the landing has no reward-bar
   * contribution (e.g. contract v2 disabled, or a neutral landing).
   */
  rewardBarProgress?: {
    source: RewardBarProgressSource;
    /** Dice multiplier. Multiplies the reward-bar progress contribution. */
    multiplier?: number;
    /** Timestamp used for timed-event lifecycle gating. Defaults to `Date.now()`. */
    nowMs?: number;
  } | null;
  /** Must be `true` to actually mutate state. When `false` the action is a no-op
   *  and returns `status: 'contract_disabled'`. Mirrors the guard inside
   *  `awardIslandRunContractV2Essence` / `deductIslandRunContractV2Essence`. */
  islandRunContractV2Enabled: boolean;
}

export interface IslandRunTileRewardActionResult {
  status: 'ok' | 'contract_disabled' | 'no_op';
  /**
   * Signed essence delta actually applied. For positive deltas this matches
   * the request (post-floor). For hazard deductions it clamps at the wallet
   * size (can't owe essence). `0` when the delta was `< 1` in magnitude.
   */
  actualEssenceDelta: number;
  /** Post-action wallet fields. All three are written to the patch. */
  essence: number;
  essenceLifetimeEarned: number;
  essenceLifetimeSpent: number;
  /**
   * Post-action reward-bar slice. `null` when `rewardBarProgress` was not
   * supplied. When set, every field in the slice is written to the patch so
   * the renderer can mirror it into React state without re-computing.
   */
  rewardBarSlice: IslandRunRewardBarRuntimeSlice | null;
  /**
   * `true` when the reward bar is at/over its claim threshold after this
   * landing. The renderer uses this to kick off the auto-claim cascade.
   */
  rewardBarFull: boolean;
}

/**
 * Apply a tile-landing effect (essence + optional reward-bar progress) as a
 * single serialised commit. See module docblock for the race it fixes.
 */
export function executeIslandRunTileRewardAction(
  options: IslandRunTileRewardActionOptions,
): Promise<IslandRunTileRewardActionResult> {
  return withIslandRunActionLock(options.session.user.id, () => performTileRewardAction(options));
}

async function performTileRewardAction(
  options: IslandRunTileRewardActionOptions,
): Promise<IslandRunTileRewardActionResult> {
  const { session, client, rewardBarProgress, islandRunContractV2Enabled } = options;

  // 1. Hydrate under the mutex — observes the prior queued action's commit.
  const state = readIslandRunGameStateRecord(session);
  const tutorialEssenceOverride = resolveTutorialEssenceOverride(state, options.essenceDelta);
  const essenceDelta = tutorialEssenceOverride.essenceDelta;
  const effectiveRewardBarProgress = tutorialEssenceOverride.shouldSuppressRewardBarProgress
    ? null
    : rewardBarProgress;

  // 2. Essence step: positive → award, negative → deduct, zero → no-op.
  let nextEssence = state.essence;
  let nextEssenceLifetimeEarned = state.essenceLifetimeEarned;
  let nextEssenceLifetimeSpent = state.essenceLifetimeSpent;
  let actualEssenceDelta = 0;
  if (essenceDelta > 0) {
    const awarded = awardIslandRunContractV2Essence({
      islandRunContractV2Enabled,
      essence: state.essence,
      essenceLifetimeEarned: state.essenceLifetimeEarned,
      amount: essenceDelta,
    });
    nextEssence = awarded.essence;
    nextEssenceLifetimeEarned = awarded.essenceLifetimeEarned;
    actualEssenceDelta = awarded.earned;
  } else if (essenceDelta < 0) {
    const deducted = deductIslandRunContractV2Essence({
      islandRunContractV2Enabled,
      essence: state.essence,
      essenceLifetimeSpent: state.essenceLifetimeSpent,
      amount: Math.abs(essenceDelta),
    });
    nextEssence = deducted.essence;
    nextEssenceLifetimeSpent = deducted.essenceLifetimeSpent;
    actualEssenceDelta = -deducted.spent;
  }

  // 3. Reward-bar step: when supplied, advance off the same hydrate.
  let nextRewardBarSlice: IslandRunRewardBarRuntimeSlice | null = null;
  if (effectiveRewardBarProgress && islandRunContractV2Enabled) {
    nextRewardBarSlice = recordEventProgress({
      state: {
        rewardBarProgress: state.rewardBarProgress,
        rewardBarThreshold: state.rewardBarThreshold,
        rewardBarClaimCountInEvent: state.rewardBarClaimCountInEvent,
        rewardBarEscalationTier: state.rewardBarEscalationTier,
        rewardBarLastClaimAtMs: state.rewardBarLastClaimAtMs,
        rewardBarBoundEventId: state.rewardBarBoundEventId,
        rewardBarLadderId: state.rewardBarLadderId,
        activeTimedEvent: state.activeTimedEvent,
        activeTimedEventProgress: state.activeTimedEventProgress,
        stickerProgress: state.stickerProgress,
        stickerInventory: state.stickerInventory,
      },
      source: effectiveRewardBarProgress.source,
      nowMs: effectiveRewardBarProgress.nowMs ?? Date.now(),
      multiplier: effectiveRewardBarProgress.multiplier ?? 1,
    });
  }

  // 4. Nothing to write? Early-return — keeps persist-queue clean.
  if (!islandRunContractV2Enabled) {
    return {
      status: 'contract_disabled',
      actualEssenceDelta: 0,
      essence: state.essence,
      essenceLifetimeEarned: state.essenceLifetimeEarned,
      essenceLifetimeSpent: state.essenceLifetimeSpent,
      rewardBarSlice: null,
      rewardBarFull: false,
    };
  }
  if (
    actualEssenceDelta === 0
    && nextRewardBarSlice === null
    && tutorialEssenceOverride.nextFirstSessionTutorialState === null
  ) {
    return {
      status: 'no_op',
      actualEssenceDelta: 0,
      essence: state.essence,
      essenceLifetimeEarned: state.essenceLifetimeEarned,
      essenceLifetimeSpent: state.essenceLifetimeSpent,
      rewardBarSlice: null,
      rewardBarFull: false,
    };
  }

  // 5. Single combined patch — essence + reward-bar fields land atomically.
  await persistIslandRunRuntimeStatePatch({
    session,
    client,
    patch: {
      ...(actualEssenceDelta !== 0
        ? {
            essence: nextEssence,
            essenceLifetimeEarned: nextEssenceLifetimeEarned,
            essenceLifetimeSpent: nextEssenceLifetimeSpent,
          }
        : {}),
      ...(nextRewardBarSlice
        ? {
            rewardBarProgress: nextRewardBarSlice.rewardBarProgress,
            rewardBarThreshold: nextRewardBarSlice.rewardBarThreshold,
            rewardBarClaimCountInEvent: nextRewardBarSlice.rewardBarClaimCountInEvent,
            rewardBarEscalationTier: nextRewardBarSlice.rewardBarEscalationTier,
            rewardBarLastClaimAtMs: nextRewardBarSlice.rewardBarLastClaimAtMs,
            rewardBarBoundEventId: nextRewardBarSlice.rewardBarBoundEventId,
            rewardBarLadderId: nextRewardBarSlice.rewardBarLadderId,
            activeTimedEvent: nextRewardBarSlice.activeTimedEvent,
            activeTimedEventProgress: nextRewardBarSlice.activeTimedEventProgress,
            stickerProgress: nextRewardBarSlice.stickerProgress,
            stickerInventory: nextRewardBarSlice.stickerInventory,
          }
        : {}),
      ...(tutorialEssenceOverride.nextFirstSessionTutorialState
        ? {
            firstSessionTutorialState: tutorialEssenceOverride.nextFirstSessionTutorialState,
          }
        : {}),
    },
  });

  const rewardBarFull = nextRewardBarSlice
    ? nextRewardBarSlice.rewardBarProgress >= nextRewardBarSlice.rewardBarThreshold
    : false;

  return {
    status: 'ok',
    actualEssenceDelta,
    essence: nextEssence,
    essenceLifetimeEarned: nextEssenceLifetimeEarned,
    essenceLifetimeSpent: nextEssenceLifetimeSpent,
    rewardBarSlice: nextRewardBarSlice,
    rewardBarFull,
  };
}
