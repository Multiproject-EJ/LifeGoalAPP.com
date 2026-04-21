"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.islandRunContractV2RewardBarTests = void 0;
const islandRunContractV2RewardBar_1 = require("../islandRunContractV2RewardBar");
const testHarness_1 = require("./testHarness");
function makeBaseState() {
    return {
        rewardBarProgress: 0,
        rewardBarThreshold: 4,
        rewardBarClaimCountInEvent: 0,
        rewardBarEscalationTier: 0,
        rewardBarLastClaimAtMs: null,
        rewardBarBoundEventId: null,
        rewardBarLadderId: null,
        activeTimedEvent: null,
        activeTimedEventProgress: {
            feedingActions: 0,
            tokensEarned: 0,
            milestonesClaimed: 0,
        },
        stickerProgress: {
            fragments: 0,
        },
        stickerInventory: {},
    };
}
exports.islandRunContractV2RewardBarTests = [
    {
        name: 'v2 on: exactly one active timed event is assigned when missing',
        run: () => {
            const result = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({
                state: makeBaseState(),
                nowMs: 1000,
            });
            (0, testHarness_1.assert)(result.state.activeTimedEvent, 'Expected active timed event to be assigned');
            (0, testHarness_1.assertEqual)(result.state.rewardBarBoundEventId, result.state.activeTimedEvent?.eventId ?? null, 'Expected reward bar to bind to active event');
            (0, testHarness_1.assertEqual)(result.state.rewardBarClaimCountInEvent, 0, 'Expected fresh event claim count reset');
        },
    },
    {
        name: 'v2 on: expired event rotates and resets event-bound reward bar state',
        run: () => {
            const nowMs = 10000;
            const rotated = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({
                nowMs,
                state: {
                    ...makeBaseState(),
                    rewardBarProgress: 9,
                    rewardBarClaimCountInEvent: 3,
                    rewardBarEscalationTier: 2,
                    rewardBarLastClaimAtMs: 9000,
                    activeTimedEvent: {
                        eventId: 'feeding_frenzy:0',
                        eventType: 'feeding_frenzy',
                        startedAtMs: 0,
                        expiresAtMs: 5000,
                        version: 2,
                    },
                    rewardBarBoundEventId: 'feeding_frenzy:0',
                    rewardBarLadderId: 'feeding_frenzy_ladder_v1',
                },
            });
            (0, testHarness_1.assert)(rotated.state.activeTimedEvent, 'Expected rotated event to exist');
            (0, testHarness_1.assert)(rotated.state.activeTimedEvent?.eventId !== 'feeding_frenzy:0', 'Expected event id to change after expiry');
            (0, testHarness_1.assertEqual)(rotated.state.rewardBarProgress, 0, 'Expected reward progress reset on event switch');
            (0, testHarness_1.assertEqual)(rotated.state.rewardBarEscalationTier, 0, 'Expected escalation reset on event switch');
            (0, testHarness_1.assertEqual)(rotated.state.rewardBarClaimCountInEvent, 0, 'Expected claim count reset on event switch');
        },
    },
    {
        name: 'v2 on: non-expired event persists across island travel-like checks',
        run: () => {
            const base = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const persisted = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: base, nowMs: 2000 }).state;
            (0, testHarness_1.assertEqual)(persisted.activeTimedEvent?.eventId ?? null, base.activeTimedEvent?.eventId ?? null, 'Expected active event to persist before expiry');
        },
    },
    {
        name: 'v2 on: feeding tile/action increases reward bar progress',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const next = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
                state: withEvent,
                source: { kind: 'tile', tileType: 'chest' },
                nowMs: 1100,
            });
            (0, testHarness_1.assert)(next.rewardBarProgress > withEvent.rewardBarProgress, 'Expected reward bar progress gain from feeding-style tile');
            (0, testHarness_1.assertEqual)(next.activeTimedEventProgress.feedingActions, 1, 'Expected feeding-action counter to increment');
        },
    },
    {
        name: 'v2 on: claim resets progress and increments claim/escalation state',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const claimable = {
                ...withEvent,
                rewardBarProgress: 4,
            };
            (0, testHarness_1.assert)((0, islandRunContractV2RewardBar_1.canClaimIslandRunContractV2RewardBar)(claimable), 'Expected claim gate true at threshold');
            const claimed = (0, islandRunContractV2RewardBar_1.claimIslandRunContractV2RewardBar)({ state: claimable, nowMs: 2000 });
            (0, testHarness_1.assert)(claimed.payout, 'Expected payout when claim gate is satisfied');
            (0, testHarness_1.assertEqual)(claimed.state.rewardBarClaimCountInEvent, 1, 'Expected claim count increment');
            (0, testHarness_1.assertEqual)(claimed.state.rewardBarEscalationTier, 1, 'Expected escalation tier increment');
            (0, testHarness_1.assertEqual)(claimed.state.rewardBarLastClaimAtMs, 2000, 'Expected claim timestamp update');
            // Threshold should escalate after claim
            (0, testHarness_1.assertEqual)(claimed.state.rewardBarThreshold, 6, 'Expected threshold to escalate to tier 1 value');
        },
    },
    {
        name: 'v2 on: event switch via bound-id mismatch fully resets event-bound reward bar state',
        run: () => {
            const base = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const mismatched = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({
                state: {
                    ...base,
                    rewardBarProgress: 7,
                    rewardBarEscalationTier: 4,
                    rewardBarClaimCountInEvent: 4,
                    rewardBarBoundEventId: 'some_old_event',
                    rewardBarLastClaimAtMs: 888,
                },
                nowMs: 1100,
            }).state;
            (0, testHarness_1.assertEqual)(mismatched.rewardBarProgress, 0, 'Expected progress reset on event binding correction');
            (0, testHarness_1.assertEqual)(mismatched.rewardBarEscalationTier, 0, 'Expected escalation reset on event binding correction');
            (0, testHarness_1.assertEqual)(mismatched.rewardBarClaimCountInEvent, 0, 'Expected claim count reset on event binding correction');
            (0, testHarness_1.assertEqual)(mismatched.rewardBarLastClaimAtMs, null, 'Expected claim timestamp reset on event binding correction');
        },
    },
    {
        name: 'v2 on: escalating thresholds increase with tier',
        run: () => {
            const t0 = (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(0);
            const t1 = (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(1);
            const t5 = (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(5);
            const t9 = (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(9);
            (0, testHarness_1.assertEqual)(t0, 4, 'Expected tier 0 threshold of 4');
            (0, testHarness_1.assertEqual)(t1, 6, 'Expected tier 1 threshold of 6');
            (0, testHarness_1.assert)(t5 > t1, 'Expected tier 5 threshold higher than tier 1');
            (0, testHarness_1.assert)(t9 > t5, 'Expected tier 9 threshold higher than tier 5');
            // Beyond ladder length should clamp to last
            const t99 = (0, islandRunContractV2RewardBar_1.resolveEscalatingThreshold)(99);
            (0, testHarness_1.assertEqual)(t99, t9, 'Expected tier beyond ladder to clamp to last value');
        },
    },
    {
        name: 'v2 on: reward kind rotates between dice, essence, tokens, fragments',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveNextRewardKind)(0), 'dice', 'Expected claim 0 → dice');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveNextRewardKind)(1), 'essence', 'Expected claim 1 → essence');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveNextRewardKind)(2), 'minigame_tokens', 'Expected claim 2 → minigame_tokens');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveNextRewardKind)(3), 'sticker_fragments', 'Expected claim 3 → sticker_fragments');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveNextRewardKind)(4), 'dice', 'Expected claim 4 → dice (cycle)');
        },
    },
    {
        name: 'v2 on: claim payout has rewardKind and progressive amounts',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const claimable = { ...withEvent, rewardBarProgress: 4 };
            const claimed = (0, islandRunContractV2RewardBar_1.claimIslandRunContractV2RewardBar)({ state: claimable, nowMs: 2000 });
            (0, testHarness_1.assert)(claimed.payout, 'Expected payout');
            (0, testHarness_1.assertEqual)(claimed.payout.rewardKind, 'dice', 'Expected first claim reward kind to be dice');
            (0, testHarness_1.assert)(claimed.payout.dice > 0, 'Expected dice payout > 0 for dice reward kind');
        },
    },
    {
        name: 'v2 on: multiplier increases progress contributed',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const x1 = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
                state: withEvent,
                source: { kind: 'tile', tileType: 'chest' },
                nowMs: 1100,
                multiplier: 1,
            });
            const x3 = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
                state: withEvent,
                source: { kind: 'tile', tileType: 'chest' },
                nowMs: 1100,
                multiplier: 3,
            });
            (0, testHarness_1.assertEqual)(x1.rewardBarProgress, 2, 'Expected x1 multiplier progress of 2 (chest=2)');
            (0, testHarness_1.assertEqual)(x3.rewardBarProgress, 6, 'Expected x3 multiplier progress of 6 (chest=2×3)');
        },
    },
    {
        // P1-10 regression. Before the fix, `applyEncounterReward` silently
        // skipped the reward bar — encounters awarded essence/dice but delivered
        // 0 reward-bar progress despite the contract §5D promise that they tick
        // the bar alongside feeding tiles. Encounter weight (3) is intentionally
        // above chest's 2 since encounters are once-per-island and gated by an
        // active mini-task; keeping the delta in this range preserves bar
        // pacing.
        name: 'P1-10: encounter_resolve source ticks reward bar progress',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const baseProgress = withEvent.rewardBarProgress;
            const next = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
                state: withEvent,
                source: { kind: 'encounter_resolve' },
                nowMs: 1100,
            });
            (0, testHarness_1.assertEqual)(next.rewardBarProgress, baseProgress + 3, 'Expected encounter_resolve to contribute 3 progress at ×1');
            (0, testHarness_1.assertEqual)(next.activeTimedEventProgress.feedingActions, 1, 'Expected feeding-action counter to increment on encounter');
        },
    },
    {
        name: 'P1-10: encounter_resolve progress scales with dice multiplier',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            const x1 = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
                state: withEvent,
                source: { kind: 'encounter_resolve' },
                nowMs: 1100,
                multiplier: 1,
            });
            const x5 = (0, islandRunContractV2RewardBar_1.applyIslandRunContractV2RewardBarProgress)({
                state: withEvent,
                source: { kind: 'encounter_resolve' },
                nowMs: 1100,
                multiplier: 5,
            });
            (0, testHarness_1.assertEqual)(x1.rewardBarProgress, 3, 'Expected encounter at ×1 = 3 progress');
            (0, testHarness_1.assertEqual)(x5.rewardBarProgress, 15, 'Expected encounter at ×5 = 15 progress (3×5)');
        },
    },
    {
        name: 'v2 on: overflow progress carries to next fill (chained claims)',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            // Tier 0 threshold is 4; give 6 progress → overflow of 2
            const overfilled = { ...withEvent, rewardBarProgress: 6 };
            const claimed = (0, islandRunContractV2RewardBar_1.claimIslandRunContractV2RewardBar)({ state: overfilled, nowMs: 2000 });
            (0, testHarness_1.assert)(claimed.payout, 'Expected payout');
            (0, testHarness_1.assertEqual)(claimed.state.rewardBarProgress, 2, 'Expected overflow progress of 2 carried over');
        },
    },
    {
        name: 'v2 on: chained claims resolve multiple fills in one go',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            // Tier 0 threshold=4, tier 1 threshold=6. Give 12 progress → should fill twice (4+6=10, 2 left over)
            const massProgress = { ...withEvent, rewardBarProgress: 12 };
            const result = (0, islandRunContractV2RewardBar_1.resolveChainedRewardBarClaims)({ state: massProgress, nowMs: 2000 });
            (0, testHarness_1.assert)(result.payouts.length >= 2, `Expected at least 2 chained claims, got ${result.payouts.length}`);
            (0, testHarness_1.assertEqual)(result.payouts[0].rewardKind, 'dice', 'Expected first chain reward to be dice');
            (0, testHarness_1.assertEqual)(result.payouts[1].rewardKind, 'essence', 'Expected second chain reward to be essence');
        },
    },
    {
        name: 'v2 on: sticker completion awards bonus dice and essence',
        run: () => {
            const withEvent = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({ state: makeBaseState(), nowMs: 1000 }).state;
            // Set tier 3 → threshold is 12; set fragments to 4 so next sticker_fragments claim completes a sticker
            const nearComplete = {
                ...withEvent,
                rewardBarProgress: 12,
                rewardBarClaimCountInEvent: 3,
                rewardBarEscalationTier: 3,
                stickerProgress: { fragments: 4 },
            };
            const claimed = (0, islandRunContractV2RewardBar_1.claimIslandRunContractV2RewardBar)({ state: nearComplete, nowMs: 2000 });
            (0, testHarness_1.assert)(claimed.payout, 'Expected payout');
            // Claim 4 (index 3) → sticker_fragments reward kind
            (0, testHarness_1.assertEqual)(claimed.payout.rewardKind, 'sticker_fragments', 'Expected sticker_fragments reward kind');
            (0, testHarness_1.assert)(claimed.payout.stickerFragments > 0, 'Expected sticker fragments in payout');
            (0, testHarness_1.assertEqual)(claimed.payout.stickersGranted, 1, 'Expected sticker completion');
            (0, testHarness_1.assertEqual)(claimed.payout.stickerCompletionBonusDice, 100, 'Expected 100 bonus dice for sticker completion');
            (0, testHarness_1.assertEqual)(claimed.payout.stickerCompletionBonusEssence, 50, 'Expected 50 bonus essence for sticker completion');
        },
    },
    {
        name: 'v2 on: feeding_frenzy event rotates in after companion_feast (sequence wraps)',
        run: () => {
            const nowMs = 10000;
            // companion_feast is index 3; next wraps to feeding_frenzy (index 0)
            const rotated = (0, islandRunContractV2RewardBar_1.ensureIslandRunContractV2ActiveTimedEvent)({
                nowMs,
                state: {
                    ...makeBaseState(),
                    activeTimedEvent: {
                        eventId: 'companion_feast:0',
                        eventType: 'companion_feast',
                        startedAtMs: 0,
                        expiresAtMs: 5000,
                        version: 4,
                    },
                    rewardBarBoundEventId: 'companion_feast:0',
                    rewardBarLadderId: 'companion_feast_ladder_v1',
                },
            });
            (0, testHarness_1.assert)(rotated.state.activeTimedEvent, 'Expected rotated event to exist');
            (0, testHarness_1.assertEqual)(rotated.state.activeTimedEvent?.eventType, 'feeding_frenzy', 'Expected feeding_frenzy event after companion_feast (wrap)');
        },
    },
    // ── Smart multiplier tier tests ──────────────────────────────────────────
    {
        name: 'multiplier: x1 always available even at 0 dice',
        run: () => {
            const tiers = (0, islandRunContractV2RewardBar_1.resolveAvailableMultiplierTiers)(0);
            (0, testHarness_1.assert)(tiers.length > 0, 'Expected at least one tier');
            (0, testHarness_1.assertEqual)(tiers[0].multiplier, 1, 'Expected ×1 tier');
            (0, testHarness_1.assertEqual)(tiers[0].unlocked, true, 'Expected ×1 always unlocked');
        },
    },
    {
        name: 'multiplier: higher tiers lock when dice pool is small',
        run: () => {
            const tiers = (0, islandRunContractV2RewardBar_1.resolveAvailableMultiplierTiers)(10);
            const x2 = tiers.find((t) => t.multiplier === 2);
            const x5 = tiers.find((t) => t.multiplier === 5);
            (0, testHarness_1.assert)(x2, 'Expected ×2 tier to exist');
            (0, testHarness_1.assertEqual)(x2.unlocked, false, 'Expected ×2 locked at 10 dice (needs 20)');
            (0, testHarness_1.assertEqual)(x5.unlocked, false, 'Expected ×5 locked at 10 dice');
        },
    },
    {
        name: 'multiplier: tiers unlock progressively with dice stash',
        run: () => {
            const tiers50 = (0, islandRunContractV2RewardBar_1.resolveAvailableMultiplierTiers)(50);
            const tiers500 = (0, islandRunContractV2RewardBar_1.resolveAvailableMultiplierTiers)(500);
            const unlocked50 = tiers50.filter((t) => t.unlocked).map((t) => t.multiplier);
            const unlocked500 = tiers500.filter((t) => t.unlocked).map((t) => t.multiplier);
            (0, testHarness_1.assert)(unlocked50.includes(1), 'Expected ×1 unlocked at 50 dice');
            (0, testHarness_1.assert)(unlocked50.includes(2), 'Expected ×2 unlocked at 50 dice');
            (0, testHarness_1.assert)(unlocked50.includes(3), 'Expected ×3 unlocked at 50 dice');
            (0, testHarness_1.assert)(!unlocked50.includes(10), 'Expected ×10 locked at 50 dice');
            (0, testHarness_1.assert)(unlocked500.includes(20), 'Expected ×20 unlocked at 500 dice');
        },
    },
    {
        name: 'multiplier: resolveMaxMultiplierForPool returns highest unlocked',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveMaxMultiplierForPool)(0), 1, 'Expected max ×1 at 0 dice');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveMaxMultiplierForPool)(30), 2, 'Expected max ×2 at 30 dice');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveMaxMultiplierForPool)(100), 5, 'Expected max ×5 at 100 dice');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveMaxMultiplierForPool)(500), 20, 'Expected max ×20 at 500 dice');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveMaxMultiplierForPool)(5000), 200, 'Expected max ×200 at 5000 dice');
        },
    },
    {
        name: 'multiplier: dice cost scales with multiplier',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveDiceCostForMultiplier)(1), 1, 'Expected cost 1 at ×1');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveDiceCostForMultiplier)(5), 5, 'Expected cost 5 at ×5');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveDiceCostForMultiplier)(10), 10, 'Expected cost 10 at ×10');
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.resolveDiceCostForMultiplier)(100), 100, 'Expected cost 100 at ×100');
        },
    },
    {
        name: 'multiplier: clampMultiplierToPool downgrades when pool drops',
        run: () => {
            // Player selected ×10 but only has 15 dice now
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.clampMultiplierToPool)(10, 15), 1, 'Expected clamp to ×1 at 15 dice (cant afford ×2 roll of 4 but minDice gate)');
            // Player selected ×5 with 100 dice — OK, they can afford it
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.clampMultiplierToPool)(5, 100), 5, 'Expected ×5 stays at 100 dice');
            // Player selected ×50 but only has 200 dice — max they can use is ×10
            (0, testHarness_1.assertEqual)((0, islandRunContractV2RewardBar_1.clampMultiplierToPool)(50, 200), 10, 'Expected clamp to ×10 at 200 dice');
        },
    },
    {
        name: 'multiplier: clampMultiplierToPool ensures affordability',
        run: () => {
            // Player has exactly 4 dice — can afford ×1 (cost 1), but ×2 needs 20 dice gate
            const clamped = (0, islandRunContractV2RewardBar_1.clampMultiplierToPool)(100, 4);
            const cost = (0, islandRunContractV2RewardBar_1.resolveDiceCostForMultiplier)(clamped);
            (0, testHarness_1.assert)(cost <= 4, `Expected clamped multiplier cost (${cost}) to be affordable with 4 dice`);
            (0, testHarness_1.assertEqual)(clamped, 1, 'Expected ×1 at 4 dice');
        },
    },
];
