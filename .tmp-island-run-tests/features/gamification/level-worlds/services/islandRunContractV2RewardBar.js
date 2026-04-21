"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ENCOUNTER_REWARD_BAR_PROGRESS = exports.BASE_DICE_PER_ROLL = exports.MULTIPLIER_TIERS = exports.REWARD_KIND_ICON = exports.EVENT_BANNER_META = exports.TIMED_EVENT_SEQUENCE = void 0;
exports.resolveEscalatingThreshold = resolveEscalatingThreshold;
exports.resolveNextRewardKind = resolveNextRewardKind;
exports.resolveAvailableMultiplierTiers = resolveAvailableMultiplierTiers;
exports.resolveMaxMultiplierForPool = resolveMaxMultiplierForPool;
exports.resolveDiceCostForMultiplier = resolveDiceCostForMultiplier;
exports.clampMultiplierToPool = clampMultiplierToPool;
exports.applyMultiplierToProgress = applyMultiplierToProgress;
exports.ensureIslandRunContractV2ActiveTimedEvent = ensureIslandRunContractV2ActiveTimedEvent;
exports.resolveIslandRunContractV2RewardBarProgressDelta = resolveIslandRunContractV2RewardBarProgressDelta;
exports.applyIslandRunContractV2RewardBarProgress = applyIslandRunContractV2RewardBarProgress;
exports.canClaimIslandRunContractV2RewardBar = canClaimIslandRunContractV2RewardBar;
exports.claimIslandRunContractV2RewardBar = claimIslandRunContractV2RewardBar;
exports.resolveChainedRewardBarClaims = resolveChainedRewardBarClaims;
exports.TIMED_EVENT_SEQUENCE = [
    {
        templateId: 'feeding_frenzy',
        eventType: 'feeding_frenzy',
        ladderId: 'feeding_frenzy_ladder_v1',
        stickerId: 'feeding_frenzy_sticker',
        icon: '🔥',
        durationMs: 8 * 60 * 60 * 1000, // 8 hours
    },
    {
        templateId: 'lucky_spin',
        eventType: 'lucky_spin',
        ladderId: 'lucky_spin_ladder_v1',
        stickerId: 'lucky_spin_sticker',
        icon: '🎰',
        durationMs: 24 * 60 * 60 * 1000, // 24 hours
    },
    {
        templateId: 'space_excavator',
        eventType: 'space_excavator',
        ladderId: 'space_excavator_ladder_v1',
        stickerId: 'space_excavator_sticker',
        icon: '🚀',
        durationMs: 2 * 24 * 60 * 60 * 1000, // 2 days
    },
    {
        templateId: 'companion_feast',
        eventType: 'companion_feast',
        ladderId: 'companion_feast_ladder_v1',
        stickerId: 'companion_feast_sticker',
        icon: '🐾',
        durationMs: 4 * 24 * 60 * 60 * 1000, // 4 days
    },
];
/**
 * UI metadata for each timed-event banner (icon + human-readable display name).
 * Authoritative source — imported by `IslandRunBoardPrototype.tsx` and
 * `components/GameBoardOverlay.tsx`. Keep in sync with TIMED_EVENT_SEQUENCE above.
 */
exports.EVENT_BANNER_META = {
    feeding_frenzy: { icon: '🔥', displayName: 'Feeding Frenzy' },
    space_excavator: { icon: '🚀', displayName: 'Space Excavator' },
    companion_feast: { icon: '🐾', displayName: 'Companion Feast' },
    lucky_spin: { icon: '🎰', displayName: 'Lucky Spin' },
};
// ── Progress sources ─────────────────────────────────────────────────────────
const FEEDING_TILE_PROGRESS = {
    chest: 2,
    micro: 1,
    currency: 1,
};
// ── Escalating threshold ladder (Monopoly GO style) ──────────────────────────
// Fast start → slowing progression → big rewards near top → reset cycle.
// Tier 0 starts very low (easy first fill) and escalates.
const ESCALATING_THRESHOLDS = [
    4, // tier 0: very easy first fill (hook)
    6, // tier 1: still fast
    8, // tier 2: moderate
    12, // tier 3: slowing
    16, // tier 4: engagement wall
    24, // tier 5: harder
    32, // tier 6: big commitment
    48, // tier 7: retention push
    64, // tier 8: near-top
    80, // tier 9: hard cap before event reset
];
/**
 * Resolve threshold for the given escalation tier.
 * After the ladder is exhausted, the last value repeats.
 */
function resolveEscalatingThreshold(tier) {
    const safeTier = Math.max(0, Math.floor(tier));
    if (safeTier < ESCALATING_THRESHOLDS.length)
        return ESCALATING_THRESHOLDS[safeTier];
    return ESCALATING_THRESHOLDS[ESCALATING_THRESHOLDS.length - 1];
}
// ── Reward rotation (single reward per bar fill) ─────────────────────────────
const REWARD_ROTATION = [
    'dice',
    'essence',
    'minigame_tokens',
    'sticker_fragments',
];
/** Icon for the upcoming reward displayed on the bar endcap. */
exports.REWARD_KIND_ICON = {
    dice: '🎲',
    essence: '🟣',
    minigame_tokens: '🎫',
    sticker_fragments: '🧩',
};
function resolveNextRewardKind(claimCount) {
    return REWARD_ROTATION[Math.max(0, Math.floor(claimCount)) % REWARD_ROTATION.length];
}
exports.MULTIPLIER_TIERS = [
    { multiplier: 1, minDice: 0 },
    { multiplier: 2, minDice: 20 },
    { multiplier: 3, minDice: 50 },
    { multiplier: 5, minDice: 100 },
    { multiplier: 10, minDice: 200 },
    { multiplier: 20, minDice: 500 },
    { multiplier: 50, minDice: 1000 },
    { multiplier: 100, minDice: 2000 },
    { multiplier: 200, minDice: 5000 },
];
/**
 * Base dice deducted per roll (before multiplier scaling). Softened from 2 → 1
 * on 2026-04-19 per playtest feedback — low-multiplier play now burns the
 * pool at half the previous rate, keeping ×1 sessions accessible while high
 * multipliers still scale linearly (×3 = 3 dice, ×10 = 10 dice, …).
 *
 * Mirrored by `DICE_PER_ROLL` in `islandRunRollAction.ts`; both constants must
 * stay in sync. Source of truth for `resolveDiceCostForMultiplier` below.
 */
exports.BASE_DICE_PER_ROLL = 1;
/**
 * Resolve all multiplier tiers available given the current dice pool.
 * Returns entries sorted ascending. Always includes ×1.
 * Each entry includes an `unlocked` flag for UI display of locked tiers.
 */
function resolveAvailableMultiplierTiers(dicePool) {
    const safeDice = Math.max(0, Math.floor(dicePool));
    return exports.MULTIPLIER_TIERS.map((tier) => ({
        ...tier,
        unlocked: safeDice >= tier.minDice,
    }));
}
/**
 * Resolve the highest multiplier the player can currently select.
 * Only tiers where dicePool ≥ minDice are eligible.
 * Optional `eventBoostMax` temporarily raises the ceiling during events.
 */
function resolveMaxMultiplierForPool(dicePool, eventBoostMax) {
    const safeDice = Math.max(0, Math.floor(dicePool));
    let maxMult = 1;
    for (const tier of exports.MULTIPLIER_TIERS) {
        if (safeDice >= tier.minDice) {
            maxMult = tier.multiplier;
        }
    }
    // Event boost: raise ceiling by one extra tier (if active)
    if (eventBoostMax !== undefined && eventBoostMax > 0) {
        const boostedIdx = exports.MULTIPLIER_TIERS.findIndex((t) => t.multiplier === maxMult);
        if (boostedIdx >= 0 && boostedIdx + 1 < exports.MULTIPLIER_TIERS.length) {
            maxMult = Math.min(exports.MULTIPLIER_TIERS[boostedIdx + 1].multiplier, eventBoostMax);
        }
    }
    return maxMult;
}
/**
 * Dice cost for a single roll at the given multiplier.
 * Cost = BASE_DICE_PER_ROLL × multiplier. With BASE=1, ×10 costs 10 dice per roll.
 */
function resolveDiceCostForMultiplier(multiplier) {
    return exports.BASE_DICE_PER_ROLL * Math.max(1, Math.floor(multiplier));
}
/**
 * Clamp the selected multiplier down if the player no longer has enough dice.
 * Returns the highest eligible multiplier ≤ the current selection.
 * Falls back to ×1 if pool is too low for anything else.
 */
function clampMultiplierToPool(selectedMultiplier, dicePool) {
    const safeDice = Math.max(0, Math.floor(dicePool));
    const safeMult = Math.max(1, Math.floor(selectedMultiplier));
    let best = 1;
    for (const tier of exports.MULTIPLIER_TIERS) {
        if (tier.multiplier <= safeMult && safeDice >= tier.minDice) {
            best = tier.multiplier;
        }
    }
    // Also check player can actually afford at least one roll at this multiplier
    const cost = resolveDiceCostForMultiplier(best);
    if (safeDice < cost) {
        // Fall back to the highest affordable tier
        let fallback = 1;
        for (const tier of exports.MULTIPLIER_TIERS) {
            const tierCost = resolveDiceCostForMultiplier(tier.multiplier);
            if (safeDice >= tierCost && safeDice >= tier.minDice) {
                fallback = tier.multiplier;
            }
        }
        return fallback;
    }
    return best;
}
/**
 * Apply a dice multiplier to reward bar progress.
 * The multiplier increases: progress contributed, essence earned from tiles,
 * and coins earned from tiles. This is the engine that lets a x5 multiplier
 * roll cause 3-4 bar fills in a single landing (Monopoly GO style).
 */
function applyMultiplierToProgress(baseProgress, multiplier) {
    const safeMultiplier = Math.max(1, Math.floor(multiplier));
    return Math.floor(baseProgress * safeMultiplier);
}
// ── Sticker completion bonus ─────────────────────────────────────────────────
const STICKER_COMPLETION_BONUS_DICE = 100;
const STICKER_COMPLETION_BONUS_ESSENCE = 50;
const STICKER_FRAGMENTS_PER_STICKER = 5;
// ── Core functions ───────────────────────────────────────────────────────────
function getTemplateIndexFromEventId(eventId) {
    if (!eventId)
        return -1;
    const templateId = eventId.split(':')[0];
    return exports.TIMED_EVENT_SEQUENCE.findIndex((template) => template.templateId === templateId);
}
function buildTimedEvent(template, nowMs, version) {
    return {
        eventId: `${template.templateId}:${nowMs}`,
        eventType: template.eventType,
        startedAtMs: nowMs,
        expiresAtMs: nowMs + template.durationMs,
        version: Math.max(1, Math.floor(version)),
    };
}
function getTemplateForEvent(event) {
    const idx = getTemplateIndexFromEventId(event?.eventId);
    if (idx >= 0)
        return exports.TIMED_EVENT_SEQUENCE[idx];
    return exports.TIMED_EVENT_SEQUENCE[0];
}
function resetEventBoundRewardBarState(options) {
    const template = getTemplateForEvent(options.event);
    return {
        ...options.state,
        rewardBarProgress: 0,
        rewardBarThreshold: resolveEscalatingThreshold(0),
        rewardBarClaimCountInEvent: 0,
        rewardBarEscalationTier: 0,
        rewardBarLastClaimAtMs: null,
        rewardBarBoundEventId: options.event.eventId,
        rewardBarLadderId: template.ladderId,
        activeTimedEventProgress: {
            feedingActions: 0,
            tokensEarned: 0,
            milestonesClaimed: 0,
        },
    };
}
function ensureIslandRunContractV2ActiveTimedEvent(options) {
    const nowMs = Math.floor(options.nowMs);
    const current = options.state.activeTimedEvent;
    if (!current) {
        const nextEvent = buildTimedEvent(exports.TIMED_EVENT_SEQUENCE[0], nowMs, 1);
        const nextState = resetEventBoundRewardBarState({ state: { ...options.state, activeTimedEvent: nextEvent }, event: nextEvent });
        return { state: nextState, eventChanged: true };
    }
    if (current.expiresAtMs <= nowMs) {
        const previousIdx = getTemplateIndexFromEventId(current.eventId);
        const nextIdx = previousIdx < 0
            ? 0
            : (previousIdx + 1) % exports.TIMED_EVENT_SEQUENCE.length;
        const nextEvent = buildTimedEvent(exports.TIMED_EVENT_SEQUENCE[nextIdx], nowMs, current.version + 1);
        const nextState = resetEventBoundRewardBarState({ state: { ...options.state, activeTimedEvent: nextEvent }, event: nextEvent });
        return { state: nextState, eventChanged: true };
    }
    if (options.state.rewardBarBoundEventId !== current.eventId) {
        return {
            state: resetEventBoundRewardBarState({ state: options.state, event: current }),
            eventChanged: true,
        };
    }
    const template = getTemplateForEvent(current);
    if (options.state.rewardBarLadderId !== template.ladderId) {
        return {
            state: {
                ...options.state,
                rewardBarLadderId: template.ladderId,
            },
            eventChanged: false,
        };
    }
    return {
        state: options.state,
        eventChanged: false,
    };
}
/**
 * Reward-bar progress contributed by completing an encounter challenge.
 * Encounters are the dramatic beats on the ring — once per island, gated by
 * an interactive mini-task — so they tick a bit more than a chest (2) but
 * not so much that they skew the bar's pacing. Contract §5D lists encounters
 * as a reward-bar source alongside feeding tiles.
 */
exports.ENCOUNTER_REWARD_BAR_PROGRESS = 3;
function resolveIslandRunContractV2RewardBarProgressDelta(source) {
    if (source.kind === 'creature_feed') {
        return { progressDelta: 4, feedingActionDelta: 1 };
    }
    if (source.kind === 'encounter_resolve') {
        return { progressDelta: exports.ENCOUNTER_REWARD_BAR_PROGRESS, feedingActionDelta: 1 };
    }
    const tileProgress = FEEDING_TILE_PROGRESS[source.tileType] ?? 0;
    if (tileProgress > 0) {
        return { progressDelta: tileProgress, feedingActionDelta: 1 };
    }
    return { progressDelta: 0, feedingActionDelta: 0 };
}
function applyIslandRunContractV2RewardBarProgress(options) {
    const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: options.state, nowMs: options.nowMs }).state;
    const delta = resolveIslandRunContractV2RewardBarProgressDelta(options.source);
    if (delta.progressDelta < 1)
        return ensured;
    const effectiveProgress = applyMultiplierToProgress(delta.progressDelta, options.multiplier ?? 1);
    return {
        ...ensured,
        rewardBarProgress: Math.max(0, Math.floor(ensured.rewardBarProgress)) + effectiveProgress,
        activeTimedEventProgress: {
            ...ensured.activeTimedEventProgress,
            feedingActions: Math.max(0, Math.floor(ensured.activeTimedEventProgress.feedingActions)) + delta.feedingActionDelta,
        },
    };
}
function canClaimIslandRunContractV2RewardBar(state) {
    const threshold = resolveEscalatingThreshold(Math.max(0, Math.floor(state.rewardBarEscalationTier)));
    return state.rewardBarProgress >= threshold;
}
/**
 * Resolve the progressive payout for the given escalation tier and claim number.
 * Single reward per fill — the primary reward rotates between dice, essence,
 * minigame tokens, and sticker fragments. All payouts escalate with tier.
 */
function resolveProgressivePayout(options) {
    const { tier, claimNumber, template } = options;
    const rewardKind = resolveNextRewardKind(claimNumber - 1);
    // Base amounts that scale with tier (progressive rewards get bigger)
    const diceBase = 5 + tier * 3; // 5, 8, 11, 14, 17, 20, ...
    const essenceBase = 3 + tier * 2; // 3, 5, 7, 9, 11, ...
    const minigameTokensBase = 2 + tier; // 2, 3, 4, 5, ...
    const fragmentsBase = 1 + Math.floor(tier / 2); // 1, 1, 2, 2, 3, ...
    const payout = {
        rewardKind,
        dice: 0,
        essence: 0,
        minigameTokens: 0,
        stickerFragments: 0,
        stickerId: template.stickerId,
        stickersGranted: 0,
        stickerCompletionBonusDice: 0,
        stickerCompletionBonusEssence: 0,
    };
    // Primary reward is the big one; others get a small bonus
    switch (rewardKind) {
        case 'dice':
            payout.dice = diceBase;
            payout.essence = Math.floor(essenceBase / 3);
            break;
        case 'essence':
            payout.essence = essenceBase;
            payout.dice = Math.floor(diceBase / 4);
            break;
        case 'minigame_tokens':
            payout.minigameTokens = minigameTokensBase;
            payout.dice = Math.floor(diceBase / 4);
            break;
        case 'sticker_fragments':
            payout.stickerFragments = fragmentsBase;
            payout.dice = Math.floor(diceBase / 3);
            payout.essence = Math.floor(essenceBase / 3);
            break;
    }
    return payout;
}
function claimIslandRunContractV2RewardBar(options) {
    const ensured = ensureIslandRunContractV2ActiveTimedEvent({ state: options.state, nowMs: options.nowMs }).state;
    if (!canClaimIslandRunContractV2RewardBar(ensured) || !ensured.activeTimedEvent) {
        return { state: ensured, payout: null };
    }
    const nextClaimNumber = Math.max(0, Math.floor(ensured.rewardBarClaimCountInEvent)) + 1;
    const tier = Math.max(0, Math.floor(ensured.rewardBarEscalationTier));
    const template = getTemplateForEvent(ensured.activeTimedEvent);
    const currentThreshold = resolveEscalatingThreshold(tier);
    const payout = resolveProgressivePayout({ tier, claimNumber: nextClaimNumber, template });
    // Carry over excess progress beyond threshold (supports multi-fill chains)
    const overflowProgress = Math.max(0, Math.floor(ensured.rewardBarProgress) - currentThreshold);
    // Sticker fragment → sticker completion
    const existingFragments = Math.max(0, Math.floor(ensured.stickerProgress.fragments));
    const combinedFragments = existingFragments + payout.stickerFragments;
    const stickersGranted = Math.floor(combinedFragments / STICKER_FRAGMENTS_PER_STICKER);
    const nextFragments = combinedFragments % STICKER_FRAGMENTS_PER_STICKER;
    payout.stickersGranted = stickersGranted;
    // Full sticker completion bonus: 100 dice + 50 essence
    if (stickersGranted > 0) {
        payout.stickerCompletionBonusDice = STICKER_COMPLETION_BONUS_DICE * stickersGranted;
        payout.stickerCompletionBonusEssence = STICKER_COMPLETION_BONUS_ESSENCE * stickersGranted;
        payout.dice += payout.stickerCompletionBonusDice;
        payout.essence += payout.stickerCompletionBonusEssence;
    }
    const nextStickerInventory = { ...ensured.stickerInventory };
    if (stickersGranted > 0) {
        nextStickerInventory[payout.stickerId] = Math.max(0, Math.floor(nextStickerInventory[payout.stickerId] ?? 0)) + stickersGranted;
    }
    const nextTier = tier + 1;
    return {
        payout,
        state: {
            ...ensured,
            rewardBarProgress: overflowProgress,
            rewardBarThreshold: resolveEscalatingThreshold(nextTier),
            rewardBarClaimCountInEvent: nextClaimNumber,
            rewardBarEscalationTier: nextTier,
            rewardBarLastClaimAtMs: Math.floor(options.nowMs),
            activeTimedEventProgress: {
                feedingActions: ensured.activeTimedEventProgress.feedingActions,
                tokensEarned: Math.max(0, Math.floor(ensured.activeTimedEventProgress.tokensEarned)) + payout.minigameTokens,
                milestonesClaimed: Math.max(0, Math.floor(ensured.activeTimedEventProgress.milestonesClaimed)) + 1,
            },
            stickerProgress: {
                ...ensured.stickerProgress,
                fragments: nextFragments,
            },
            stickerInventory: nextStickerInventory,
        },
    };
}
/**
 * Resolve all chained claims from a single progress application.
 * When progress exceeds threshold, the bar fills, claims, carries overflow,
 * and may fill again — producing the Monopoly GO "rapid cascade" effect.
 */
function resolveChainedRewardBarClaims(options) {
    const maxChain = Math.max(1, Math.min(options.maxChain ?? 5, 10));
    let current = options.state;
    const payouts = [];
    for (let i = 0; i < maxChain; i++) {
        if (!canClaimIslandRunContractV2RewardBar(current))
            break;
        const result = claimIslandRunContractV2RewardBar({ state: current, nowMs: options.nowMs });
        if (!result.payout)
            break;
        payouts.push(result.payout);
        current = result.state;
    }
    return { state: current, payouts };
}
