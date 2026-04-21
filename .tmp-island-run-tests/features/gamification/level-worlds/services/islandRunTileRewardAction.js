"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.executeIslandRunTileRewardAction = executeIslandRunTileRewardAction;
const islandRunContractV2EssenceBuild_1 = require("./islandRunContractV2EssenceBuild");
const islandRunContractV2RewardBar_1 = require("./islandRunContractV2RewardBar");
const islandRunGameStateStore_1 = require("./islandRunGameStateStore");
const islandRunActionMutex_1 = require("./islandRunActionMutex");
const islandRunRuntimeState_1 = require("./islandRunRuntimeState");
/**
 * Apply a tile-landing effect (essence + optional reward-bar progress) as a
 * single serialised commit. See module docblock for the race it fixes.
 */
function executeIslandRunTileRewardAction(options) {
    return (0, islandRunActionMutex_1.withIslandRunActionLock)(options.session.user.id, () => performTileRewardAction(options));
}
async function performTileRewardAction(options) {
    const { session, client, essenceDelta, rewardBarProgress, islandRunContractV2Enabled } = options;
    // 1. Hydrate under the mutex — observes the prior queued action's commit.
    const state = (0, islandRunGameStateStore_1.readIslandRunGameStateRecord)(session);
    // 2. Essence step: positive → award, negative → deduct, zero → no-op.
    let nextEssence = state.essence;
    let nextEssenceLifetimeEarned = state.essenceLifetimeEarned;
    let nextEssenceLifetimeSpent = state.essenceLifetimeSpent;
    let actualEssenceDelta = 0;
    if (essenceDelta > 0) {
        const awarded = (0, islandRunContractV2EssenceBuild_1.awardIslandRunContractV2Essence)({
            islandRunContractV2Enabled,
            essence: state.essence,
            essenceLifetimeEarned: state.essenceLifetimeEarned,
            amount: essenceDelta,
        });
        nextEssence = awarded.essence;
        nextEssenceLifetimeEarned = awarded.essenceLifetimeEarned;
        actualEssenceDelta = awarded.earned;
    }
    else if (essenceDelta < 0) {
        const deducted = (0, islandRunContractV2EssenceBuild_1.deductIslandRunContractV2Essence)({
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
    let nextRewardBarSlice = null;
    if (rewardBarProgress && islandRunContractV2Enabled) {
        nextRewardBarSlice = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
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
            source: rewardBarProgress.source,
            nowMs: rewardBarProgress.nowMs ?? Date.now(),
            multiplier: rewardBarProgress.multiplier ?? 1,
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
    if (actualEssenceDelta === 0 && nextRewardBarSlice === null) {
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
    await (0, islandRunRuntimeState_1.persistIslandRunRuntimeStatePatch)({
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
