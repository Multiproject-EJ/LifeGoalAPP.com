"use strict";
/**
 * islandRunStateActions — pure action functions that mutate Island Run
 * gameplay state through the store ({@link islandRunStateStore}).
 *
 * Stage C1 introduced:
 * - {@link applyRollResult} — absorbs the result of
 *   `executeIslandRunRollAction` and syncs the store mirror with the
 *   roll-service's authoritative localStorage write.
 * - {@link applyTokenHopRewards} — applies per-hop dice/spinToken/essence
 *   deltas (reward-bar claims, minigame payouts) through the store's
 *   commit path.
 *
 * Stage C2 adds (tile/encounter reward + reward-bar + drift):
 * - {@link applyEssenceAward} — credit essence to the wallet.
 * - {@link applyEssenceDeduct} — withdraw essence (hazard / ticket / build).
 * - {@link applyRewardBarState} — commit the full reward-bar + timed-event +
 *   sticker snapshot.
 * - {@link applyEssenceDriftTick} — 5-minute essence drift interval.
 *
 * Stage C3 adds (stop progress + island travel):
 * - {@link travelToNextIsland} — single atomic commit that replaces the four
 *   separate `persistIslandRunRuntimeStatePatch` calls that `performIslandTravel`
 *   used to make (old-island clears, egg save/restore, contract-v2 stop/build
 *   reset, island-number + timer update). This is the "atomic-travel refactor"
 *   risk called out in the Stage C spec.
 *
 * These functions replace the renderer-side `useEffect` + inlined
 * `persistIslandRunRuntimeStatePatch` calls that raced with the roll
 * service and with each other (the multi-writer drift vectors documented
 * in `STAGE_C_STATE_ARCHITECTURE_MIGRATION.md`).
 *
 * Lifecycle:
 * - All Stage-C actions update the in-memory store mirror synchronously
 *   (via {@link commitIslandRunState}'s `publish`), so the next
 *   `useSyncExternalStore` render cycle sees the new state.
 * - `applyRollResult` does NOT issue a remote write — the roll service
 *   already committed to localStorage + Supabase. Every other action
 *   commits the full record (mirror + localStorage + Supabase) via
 *   {@link commitIslandRunState}.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ISLAND_RUN_MAX_ISLAND = void 0;
exports.applyRollResult = applyRollResult;
exports.applyTokenHopRewards = applyTokenHopRewards;
exports.applyEssenceAward = applyEssenceAward;
exports.applyEssenceDeduct = applyEssenceDeduct;
exports.applyRewardBarState = applyRewardBarState;
exports.applyEssenceDriftTick = applyEssenceDriftTick;
exports.travelToNextIsland = travelToNextIsland;
const islandRunStateStore_1 = require("./islandRunStateStore");
const islandRunContractV2EssenceBuild_1 = require("./islandRunContractV2EssenceBuild");
const islandRunContractV2StopResolver_1 = require("./islandRunContractV2StopResolver");
// ── applyRollResult ──────────────────────────────────────────────────────────
/**
 * Syncs the store mirror with the roll service's authoritative
 * localStorage write. Call this once after the roll + hop animation
 * sequence completes.
 *
 * Returns the refreshed record so the renderer can forward it to
 * `setRuntimeState` (the legacy in-memory mirror that other effects still
 * depend on during the Stage-C migration).
 *
 * **No remote write** — the roll service's `writeIslandRunGameStateRecord`
 * already committed to Supabase.
 */
function applyRollResult(options) {
    (0, islandRunStateStore_1.refreshIslandRunStateFromLocal)(options.session);
    return (0, islandRunStateStore_1.getIslandRunStateSnapshot)(options.session);
}
/**
 * Applies per-hop or per-claim currency deltas to the authoritative store.
 *
 * Reads the latest store snapshot, merges the deltas, commits the full
 * record (mirror + localStorage + Supabase). The mirror is updated
 * synchronously so the next render cycle sees the change.
 *
 * Returns the committed record for forwarding to `setRuntimeState`.
 */
function applyTokenHopRewards(options) {
    const { session, client, deltas, triggerSource } = options;
    const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
    const clamp0 = (v) => Math.max(0, v);
    const next = {
        ...current,
        runtimeVersion: current.runtimeVersion + 1,
        spinTokens: clamp0(current.spinTokens + (deltas.spinTokens ?? 0)),
        dicePool: clamp0(current.dicePool + (deltas.dicePool ?? 0)),
        essence: clamp0(current.essence + (deltas.essence ?? 0)),
    };
    // Synchronous mirror update + async persist (fire-and-forget).
    void (0, islandRunStateStore_1.commitIslandRunState)({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'apply_token_hop_rewards',
    });
    return next;
}
/**
 * Awards essence to the wallet through the store commit path.
 *
 * Replaces the renderer-side `persistIslandRunRuntimeStatePatch({ essence, essenceLifetimeEarned })` +
 * paired `setRuntimeState` that used to race the roll service's commit. The
 * previous read-modify-write happened through `runtimeStateRef.current`; the
 * store snapshot is now the authoritative source so concurrent awards on
 * disjoint fields no longer silently drop data.
 *
 * No-op (returns the current snapshot and `earned: 0`) when the contract-v2
 * flag is off or the requested amount rounds below 1.
 */
function applyEssenceAward(options) {
    const { session, client, islandRunContractV2Enabled, amount, triggerSource } = options;
    const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
    const result = (0, islandRunContractV2EssenceBuild_1.awardIslandRunContractV2Essence)({
        islandRunContractV2Enabled,
        essence: current.essence,
        essenceLifetimeEarned: current.essenceLifetimeEarned,
        amount,
    });
    if (result.earned < 1) {
        return { record: current, earned: 0 };
    }
    const next = {
        ...current,
        essence: result.essence,
        essenceLifetimeEarned: result.essenceLifetimeEarned,
        runtimeVersion: current.runtimeVersion + 1,
    };
    void (0, islandRunStateStore_1.commitIslandRunState)({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'apply_essence_award',
    });
    return { record: next, earned: result.earned };
}
/**
 * Withdraws essence from the wallet through the store commit path.
 *
 * Replaces the renderer-side patch+setRuntimeState pair used by hazard-tile
 * penalties, stop-ticket purchases, and any other essence spend — same
 * rationale as {@link applyEssenceAward} but in the spend direction.
 * `essenceLifetimeEarned` is left unchanged (drift / hazard losses are not
 * lifetime unearnings).
 */
function applyEssenceDeduct(options) {
    const { session, client, islandRunContractV2Enabled, amount, triggerSource } = options;
    const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
    const result = (0, islandRunContractV2EssenceBuild_1.deductIslandRunContractV2Essence)({
        islandRunContractV2Enabled,
        essence: current.essence,
        essenceLifetimeSpent: current.essenceLifetimeSpent,
        amount,
    });
    if (result.spent < 1) {
        return { record: current, spent: 0 };
    }
    const next = {
        ...current,
        essence: result.essence,
        essenceLifetimeSpent: result.essenceLifetimeSpent,
        runtimeVersion: current.runtimeVersion + 1,
    };
    void (0, islandRunStateStore_1.commitIslandRunState)({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'apply_essence_deduct',
    });
    return { record: next, spent: result.spent };
}
/**
 * Commits a full reward-bar / timed-event / sticker snapshot through the
 * store.
 *
 * Replaces the renderer's `applyContractV2RewardBarRuntimeState` inlined
 * `persistIslandRunRuntimeStatePatch` + paired `setRuntimeState`. The
 * reward-bar cascade is the highest-contention non-roll write (fires on
 * every reward-earning tile landing + every claim), so routing it through
 * the commit coordinator removes a class of overlap bugs where a tile
 * landing's bar progress could race an auto-claim's bar reset.
 */
function applyRewardBarState(options) {
    const { session, client, nextState, triggerSource } = options;
    const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
    const next = {
        ...current,
        rewardBarProgress: nextState.rewardBarProgress,
        rewardBarThreshold: nextState.rewardBarThreshold,
        rewardBarClaimCountInEvent: nextState.rewardBarClaimCountInEvent,
        rewardBarEscalationTier: nextState.rewardBarEscalationTier,
        rewardBarLastClaimAtMs: nextState.rewardBarLastClaimAtMs,
        rewardBarBoundEventId: nextState.rewardBarBoundEventId,
        rewardBarLadderId: nextState.rewardBarLadderId,
        activeTimedEvent: nextState.activeTimedEvent,
        activeTimedEventProgress: nextState.activeTimedEventProgress,
        stickerProgress: nextState.stickerProgress,
        stickerInventory: nextState.stickerInventory,
        runtimeVersion: current.runtimeVersion + 1,
    };
    void (0, islandRunStateStore_1.commitIslandRunState)({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'apply_reward_bar_state',
    });
    return next;
}
/**
 * Applies the 5-minute essence-drift interval tick through the store.
 *
 * Reads the live store snapshot for the wallet, stop states, and egg
 * ledger; computes drift via the pure {@link applyEssenceDrift} helper;
 * commits `{ essence, lastEssenceDriftLost }` only when drift actually
 * fires. When no essence was lost this is a cheap no-op — no commit, no
 * subscriber notification.
 *
 * Replaces the renderer's drift `useEffect` inlined `setRuntimeState` +
 * `persistIslandRunRuntimeStatePatch`. The `runtimeStateRef.current` reads
 * are replaced by a single store snapshot read so the drift computation
 * always sees a consistent view.
 */
function applyEssenceDriftTick(options) {
    const { session, client, effectiveIslandNumber, elapsedMs, triggerSource } = options;
    const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
    if (current.essence <= 0 || elapsedMs <= 0) {
        return { record: current, driftLost: 0 };
    }
    const islandKey = String(current.currentIslandNumber);
    const eggEntry = current.perIslandEggs?.[islandKey];
    const eggResolved = eggEntry?.status === 'collected' || eggEntry?.status === 'sold';
    const islandComplete = (0, islandRunContractV2StopResolver_1.isIslandRunFullyClearedV2)({
        stopStatesByIndex: current.stopStatesByIndex,
        stopBuildStateByIndex: current.stopBuildStateByIndex,
        hatcheryEggResolved: eggResolved,
    });
    const driftResult = (0, islandRunContractV2EssenceBuild_1.applyEssenceDrift)({
        essence: current.essence,
        islandNumber: effectiveIslandNumber,
        elapsedMs,
        isIslandComplete: islandComplete,
        remainingIslandCost: (0, islandRunContractV2EssenceBuild_1.getRemainingIslandBuildCost)({
            effectiveIslandNumber,
            stopBuildStateByIndex: current.stopBuildStateByIndex,
        }),
    });
    if (driftResult.driftLost <= 0) {
        return { record: current, driftLost: 0 };
    }
    const next = {
        ...current,
        essence: driftResult.essence,
        lastEssenceDriftLost: driftResult.driftLost,
        runtimeVersion: current.runtimeVersion + 1,
    };
    void (0, islandRunStateStore_1.commitIslandRunState)({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'apply_essence_drift_tick',
    });
    return { record: next, driftLost: driftResult.driftLost };
}
// ── C3: Island travel ────────────────────────────────────────────────────────
/** Maximum island number before the cycle wraps back to 1. Mirrors the
 *  constant inlined in `performIslandTravel` in the renderer. Update here if
 *  the game ever ships more islands. */
exports.ISLAND_RUN_MAX_ISLAND = 120;
/** Effective island number = resolvedIsland + cycleIndex * 120. Mirrors the
 *  renderer helper; kept private to the action so callers don't have to
 *  thread it through. */
function effectiveIslandNumber(resolvedIsland, cycleIndex) {
    return resolvedIsland + cycleIndex * exports.ISLAND_RUN_MAX_ISLAND;
}
/**
 * Atomic island travel — THE named "atomic-travel refactor" risk from the Stage C spec.
 *
 * The legacy `performIslandTravel` in `IslandRunBoardPrototype.tsx` issued
 * four separate `persistIslandRunRuntimeStatePatch` calls in sequence:
 *   1. clear old-island maps (`completedStopsByIsland`, `stopTicketsPaidByIsland`,
 *      `bonusTileChargeByIsland`)
 *   2. save the old island's egg + restore the new island's egg (`perIslandEggs`,
 *      `activeEgg*`)
 *   3. [contract-v2] reset stop + build states (`stopStatesByIndex`,
 *      `stopBuildStateByIndex`, `activeStopIndex`, `activeStopType`)
 *   4. bump island bookkeeping (`currentIslandNumber`, `cycleIndex`,
 *      `bossTrialResolvedIslandNumber`, timer)
 *
 * Each patch went through `persistIslandRunRuntimeStatePatch`, which shallow-
 * merges against a fresh read of the record. If any of the four failed, or if
 * another writer (e.g. the roll service, reward bar) landed between two of
 * them, the travel ended up in a half-applied state: an old-island's
 * completedStops cleared but the new island's timer not started, or a new
 * cycle's egg ledger partially restored.
 *
 * This action collects every field that travel needs to mutate, applies them
 * to a single snapshot, and commits ONCE through {@link commitIslandRunState}.
 * The result: travel is either fully visible or not visible at all to
 * subscribers. `runtimeVersion` bumps exactly once.
 *
 * The action does NOT manage UI-only React state (e.g. `setRollValue(null)`,
 * timer ticker, feedback toasts) — the renderer still owns those and should
 * call them immediately after `travelToNextIsland`.
 */
function travelToNextIsland(options) {
    const { session, client, nextIsland, startTimer, nowMs, getIslandDurationMs, islandRunContractV2Enabled, triggerSource, } = options;
    const current = (0, islandRunStateStore_1.getIslandRunStateSnapshot)(session);
    // Cycle-wrap resolution (120 → 1 bumps cycleIndex).
    const wraps = nextIsland > exports.ISLAND_RUN_MAX_ISLAND;
    const resolvedIsland = wraps
        ? ((nextIsland - 1) % exports.ISLAND_RUN_MAX_ISLAND) + 1
        : Math.max(1, nextIsland);
    const nextCycleIndex = wraps ? current.cycleIndex + 1 : current.cycleIndex;
    const oldIslandKey = String(current.currentIslandNumber);
    const newIslandKey = String(resolvedIsland);
    // ── Egg save/restore ────────────────────────────────────────────────────
    // Save the old island's active egg (if any) into perIslandEggs, then check
    // whether the new island has a previously-placed egg to restore.
    const currentPerIslandEggs = current.perIslandEggs ?? {};
    const updatedPerIslandEggs = { ...currentPerIslandEggs };
    const hasActiveEgg = current.activeEggTier !== null
        && current.activeEggSetAtMs !== null
        && current.activeEggHatchDurationMs !== null;
    if (hasActiveEgg) {
        const setAtMs = current.activeEggSetAtMs;
        const hatchAtMs = setAtMs + current.activeEggHatchDurationMs;
        const isReady = nowMs >= hatchAtMs;
        updatedPerIslandEggs[oldIslandKey] = {
            tier: current.activeEggTier,
            setAtMs,
            hatchAtMs,
            status: isReady ? 'ready' : 'incubating',
            location: isReady ? 'dormant' : 'island',
        };
    }
    // Restore the new island's egg only when it's still incubating or ready.
    // Collected/sold eggs stay in the ledger but must not repopulate the slot.
    const newIslandEntry = updatedPerIslandEggs[newIslandKey];
    let restoredActiveEgg = null;
    let nextActiveEggTier = null;
    let nextActiveEggSetAtMs = null;
    let nextActiveEggHatchDurationMs = null;
    let nextActiveEggIsDormant = false;
    if (newIslandEntry
        && (newIslandEntry.status === 'incubating' || newIslandEntry.status === 'ready')) {
        const isNowReady = nowMs >= newIslandEntry.hatchAtMs;
        const isDormant = isNowReady || newIslandEntry.location === 'dormant';
        restoredActiveEgg = {
            tier: newIslandEntry.tier,
            setAtMs: newIslandEntry.setAtMs,
            hatchAtMs: newIslandEntry.hatchAtMs,
            isDormant,
        };
        nextActiveEggTier = newIslandEntry.tier;
        nextActiveEggSetAtMs = newIslandEntry.setAtMs;
        nextActiveEggHatchDurationMs = newIslandEntry.hatchAtMs - newIslandEntry.setAtMs;
        nextActiveEggIsDormant = isDormant;
    }
    // ── Contract-V2 stop/build reset ───────────────────────────────────────
    // Fresh stop objective + build states for the new island. When the flag is
    // off these fields are left untouched.
    let nextStopStatesByIndex = current.stopStatesByIndex;
    let nextStopBuildStateByIndex = current.stopBuildStateByIndex;
    let nextActiveStopIndex = current.activeStopIndex;
    let nextActiveStopType = current.activeStopType;
    if (islandRunContractV2Enabled) {
        nextStopStatesByIndex = Array.from({ length: 5 }, () => ({
            objectiveComplete: false,
            buildComplete: false,
        }));
        nextStopBuildStateByIndex = (0, islandRunContractV2EssenceBuild_1.initStopBuildStatesForIsland)(effectiveIslandNumber(resolvedIsland, nextCycleIndex));
        nextActiveStopIndex = 0;
        nextActiveStopType = 'hatchery';
    }
    // ── Timer ─────────────────────────────────────────────────────────────
    const durationMs = getIslandDurationMs(resolvedIsland);
    const islandStartedAtMs = startTimer ? nowMs : 0;
    const islandExpiresAtMs = startTimer ? nowMs + durationMs : 0;
    // ── Single atomic commit ──────────────────────────────────────────────
    // Shallow-overlay the three per-island Record maps so the old island's
    // entries are explicitly cleared but other islands' entries are preserved.
    // This mirrors the patch-merge semantics of `persistIslandRunRuntimeStatePatch`
    // while consolidating into one commit.
    const next = {
        ...current,
        completedStopsByIsland: {
            ...current.completedStopsByIsland,
            [oldIslandKey]: [],
        },
        stopTicketsPaidByIsland: {
            ...(current.stopTicketsPaidByIsland ?? {}),
            [oldIslandKey]: [],
        },
        bonusTileChargeByIsland: {
            ...(current.bonusTileChargeByIsland ?? {}),
            [oldIslandKey]: {},
        },
        perIslandEggs: updatedPerIslandEggs,
        activeEggTier: nextActiveEggTier,
        activeEggSetAtMs: nextActiveEggSetAtMs,
        activeEggHatchDurationMs: nextActiveEggHatchDurationMs,
        activeEggIsDormant: nextActiveEggIsDormant,
        stopStatesByIndex: nextStopStatesByIndex,
        stopBuildStateByIndex: nextStopBuildStateByIndex,
        activeStopIndex: nextActiveStopIndex,
        activeStopType: nextActiveStopType,
        currentIslandNumber: resolvedIsland,
        cycleIndex: nextCycleIndex,
        bossTrialResolvedIslandNumber: null,
        islandStartedAtMs,
        islandExpiresAtMs,
        runtimeVersion: current.runtimeVersion + 1,
    };
    void (0, islandRunStateStore_1.commitIslandRunState)({
        session,
        client,
        record: next,
        triggerSource: triggerSource ?? 'travel_to_next_island',
    });
    return {
        record: next,
        resolvedIsland,
        nextCycleIndex,
        restoredActiveEgg,
    };
}
