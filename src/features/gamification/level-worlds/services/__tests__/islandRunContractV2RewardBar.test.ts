import {
  applyIslandRunContractV2RewardBarProgress,
  canClaimIslandRunContractV2RewardBar,
  claimIslandRunContractV2RewardBar,
  ensureIslandRunContractV2ActiveTimedEvent,
  resolveEscalatingThreshold,
  resolveNextRewardKind,
  resolveChainedRewardBarClaims,
  resolveRewardBarClaimPayoutPreview,
  resolveAvailableMultiplierTiers,
  resolveMaxMultiplierForPool,
  resolveDiceCostForMultiplier,
  clampMultiplierToPool,
  MULTIPLIER_TIERS,
  BASE_DICE_PER_ROLL,
} from '../islandRunContractV2RewardBar';
import type { IslandRunRewardBarRuntimeSlice } from '../islandRunContractV2RewardBar';
import { resolveIslandRunContractV2RewardHudState } from '../islandRunContractV2Semantics';
import { assert, assertEqual, type TestCase } from './testHarness';

function makeBaseState(): IslandRunRewardBarRuntimeSlice {
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

function simulateProgressTileRolls(options: {
  startingDice: number;
  multiplier: number;
  rolls: number;
  tileType?: string;
}): {
  dicePool: number;
  diceSpent: number;
  diceAwarded: number;
  rollsTaken: number;
  totalClaims: number;
  state: IslandRunRewardBarRuntimeSlice;
} {
  const multiplier = options.multiplier;
  const diceCost = resolveDiceCostForMultiplier(multiplier);
  let dicePool = options.startingDice;
  let diceSpent = 0;
  let diceAwarded = 0;
  let rollsTaken = 0;
  let totalClaims = 0;
  let state = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;

  for (let i = 0; i < options.rolls; i += 1) {
    if (dicePool < diceCost) break;
    dicePool -= diceCost;
    diceSpent += diceCost;
    rollsTaken += 1;

    state = applyIslandRunContractV2RewardBarProgress({
      state,
      source: { kind: 'tile', tileType: options.tileType ?? 'chest' },
      nowMs: 1_100 + i,
      multiplier,
    });

    const chainResult = resolveChainedRewardBarClaims({ state, nowMs: 2_000 + i });
    state = chainResult.state;
    totalClaims += chainResult.payouts.length;
    for (const payout of chainResult.payouts) {
      dicePool += payout.dice;
      diceAwarded += payout.dice;
    }
  }

  return { dicePool, diceSpent, diceAwarded, rollsTaken, totalClaims, state };
}

export const islandRunContractV2RewardBarTests: TestCase[] = [
  {
    name: 'v2 on: exactly one active timed event is assigned when missing',
    run: () => {
      const result = ensureIslandRunContractV2ActiveTimedEvent({
        state: makeBaseState(),
        nowMs: 1_000,
      });

      assert(result.state.activeTimedEvent, 'Expected active timed event to be assigned');
      assertEqual(result.state.rewardBarBoundEventId, result.state.activeTimedEvent?.eventId ?? null, 'Expected reward bar to bind to active event');
      assertEqual(result.state.rewardBarClaimCountInEvent, 0, 'Expected fresh event claim count reset');
    },
  },
  {
    name: 'v2 on: expired event rotates and resets event-bound reward bar state',
    run: () => {
      const nowMs = 10_000;
      const rotated = ensureIslandRunContractV2ActiveTimedEvent({
        nowMs,
        state: {
          ...makeBaseState(),
          rewardBarProgress: 9,
          rewardBarClaimCountInEvent: 3,
          rewardBarEscalationTier: 2,
          rewardBarLastClaimAtMs: 9_000,
          activeTimedEvent: {
            eventId: 'feeding_frenzy:0',
            eventType: 'feeding_frenzy',
            startedAtMs: 0,
            expiresAtMs: 5_000,
            version: 2,
          },
          rewardBarBoundEventId: 'feeding_frenzy:0',
          rewardBarLadderId: 'feeding_frenzy_ladder_v1',
        },
      });

      assert(rotated.state.activeTimedEvent, 'Expected rotated event to exist');
      assert(rotated.state.activeTimedEvent?.eventId !== 'feeding_frenzy:0', 'Expected event id to change after expiry');
      assertEqual(rotated.state.rewardBarProgress, 0, 'Expected reward progress reset on event switch');
      assertEqual(rotated.state.rewardBarEscalationTier, 0, 'Expected escalation reset on event switch');
      assertEqual(rotated.state.rewardBarClaimCountInEvent, 0, 'Expected claim count reset on event switch');
    },
  },
  {
    name: 'v2 on: non-expired event persists across island travel-like checks',
    run: () => {
      const base = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const persisted = ensureIslandRunContractV2ActiveTimedEvent({ state: base, nowMs: 2_000 }).state;
      assertEqual(persisted.activeTimedEvent?.eventId ?? null, base.activeTimedEvent?.eventId ?? null, 'Expected active event to persist before expiry');
    },
  },
  {
    name: 'v2 on: feeding tile/action increases reward bar progress',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const next = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'chest' },
        nowMs: 1_100,
      });

      assert(next.rewardBarProgress > withEvent.rewardBarProgress, 'Expected reward bar progress gain from feeding-style tile');
      assertEqual(next.activeTimedEventProgress.feedingActions, 1, 'Expected feeding-action counter to increment');
    },
  },
  {
    name: 'v2 on: claim resets progress and increments claim/escalation state',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const claimable = {
        ...withEvent,
        rewardBarProgress: 4,
      };
      assert(canClaimIslandRunContractV2RewardBar(claimable), 'Expected claim gate true at threshold');

      const claimed = claimIslandRunContractV2RewardBar({ state: claimable, nowMs: 2_000 });
      assert(claimed.payout, 'Expected payout when claim gate is satisfied');
      assertEqual(claimed.state.rewardBarClaimCountInEvent, 1, 'Expected claim count increment');
      assertEqual(claimed.state.rewardBarEscalationTier, 1, 'Expected escalation tier increment');
      assertEqual(claimed.state.rewardBarLastClaimAtMs, 2_000, 'Expected claim timestamp update');
      // Threshold should escalate after claim
      assertEqual(claimed.state.rewardBarThreshold, 6, 'Expected threshold to escalate to tier 1 value');
    },
  },
  {
    name: 'v2 on: event switch via bound-id mismatch fully resets event-bound reward bar state',
    run: () => {
      const base = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const mismatched = ensureIslandRunContractV2ActiveTimedEvent({
        state: {
          ...base,
          rewardBarProgress: 7,
          rewardBarEscalationTier: 4,
          rewardBarClaimCountInEvent: 4,
          rewardBarBoundEventId: 'some_old_event',
          rewardBarLastClaimAtMs: 888,
        },
        nowMs: 1_100,
      }).state;

      assertEqual(mismatched.rewardBarProgress, 0, 'Expected progress reset on event binding correction');
      assertEqual(mismatched.rewardBarEscalationTier, 0, 'Expected escalation reset on event binding correction');
      assertEqual(mismatched.rewardBarClaimCountInEvent, 0, 'Expected claim count reset on event binding correction');
      assertEqual(mismatched.rewardBarLastClaimAtMs, null, 'Expected claim timestamp reset on event binding correction');
    },
  },
  {
    name: 'v2 on: escalating thresholds keep early hook tiers and continue beyond old cap',
    run: () => {
      const t0 = resolveEscalatingThreshold(0);
      const t1 = resolveEscalatingThreshold(1);
      const t5 = resolveEscalatingThreshold(5);
      const t9 = resolveEscalatingThreshold(9);
      const t10 = resolveEscalatingThreshold(10);
      const t20 = resolveEscalatingThreshold(20);
      const t50 = resolveEscalatingThreshold(50);
      assertEqual(t0, 4, 'Expected tier 0 threshold of 4');
      assertEqual(t1, 6, 'Expected tier 1 threshold of 6');
      assertEqual(t9, 80, 'Expected tier 9 to preserve the previous final hook value');
      assert(t5 > t1, 'Expected tier 5 threshold higher than tier 1');
      assert(t9 > t5, 'Expected tier 9 threshold higher than tier 5');
      assert(t10 > t9, 'Expected tier 10 to continue escalating instead of repeating 80');
      assert(t20 > t10, 'Expected later post-hook tiers to keep increasing');
      assert(t50 > t20, 'Expected deep post-hook tiers to remain progressively harder');
    },
  },
  {
    name: 'v2 on: reward kind rotates between dice, essence, tokens, fragments',
    run: () => {
      assertEqual(resolveNextRewardKind(0), 'dice', 'Expected claim 0 → dice');
      assertEqual(resolveNextRewardKind(1), 'essence', 'Expected claim 1 → essence');
      assertEqual(resolveNextRewardKind(2), 'minigame_tokens', 'Expected claim 2 → minigame_tokens');
      assertEqual(resolveNextRewardKind(3), 'sticker_fragments', 'Expected claim 3 → sticker_fragments');
      assertEqual(resolveNextRewardKind(4), 'dice', 'Expected claim 4 → dice (cycle)');
    },
  },
  {
    name: 'v2 on: claim payout has rewardKind and progressive amounts',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const claimable = { ...withEvent, rewardBarProgress: 4 };
      const claimed = claimIslandRunContractV2RewardBar({ state: claimable, nowMs: 2_000 });
      assert(claimed.payout, 'Expected payout');
      assertEqual(claimed.payout!.rewardKind, 'dice', 'Expected first claim reward kind to be dice');
      assert(claimed.payout!.dice > 0, 'Expected dice payout > 0 for dice reward kind');
    },
  },
  {
    name: 'v2 on: Space Excavator event-ticket payouts use tuned 8/12/16/20 ladder',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const minigamePayouts = [2, 6, 10, 14].map((tier) => {
        const claimable = {
          ...withEvent,
          activeTimedEvent: {
            eventId: 'space_excavator:1000',
            eventType: 'space_excavator',
            startedAtMs: 1_000,
            expiresAtMs: 10_000,
            version: 1,
          },
          rewardBarBoundEventId: 'space_excavator:1000',
          rewardBarLadderId: 'space_excavator_ladder_v1',
          rewardBarProgress: resolveEscalatingThreshold(tier),
          rewardBarThreshold: resolveEscalatingThreshold(tier),
          rewardBarClaimCountInEvent: tier,
          rewardBarEscalationTier: tier,
        };
        const claimed = claimIslandRunContractV2RewardBar({ state: claimable, nowMs: 2_000 + tier });
        assert(claimed.payout, `Expected minigame-ticket payout at tier ${tier}`);
        assertEqual(claimed.payout!.rewardKind, 'minigame_tokens', `Expected tier ${tier} payout to be event tickets`);
        return claimed.payout!;
      });

      assertEqual(minigamePayouts[0]!.minigameTokens, 8, 'First event-ticket payout should grant 8 tickets');
      assertEqual(minigamePayouts[1]!.minigameTokens, 12, 'Second event-ticket payout should grant 12 tickets');
      assertEqual(minigamePayouts[2]!.minigameTokens, 16, 'Third event-ticket payout should grant 16 tickets');
      assertEqual(minigamePayouts[3]!.minigameTokens, 20, 'Later event-ticket payout should grant 20 tickets');
      assertEqual(minigamePayouts[0]!.dice, 2, 'Ticket payout side dice should keep existing tier-2 value');
      assertEqual(minigamePayouts[0]!.essence, 0, 'Ticket payout should not add essence');
      assertEqual(minigamePayouts[0]!.stickerFragments, 0, 'Ticket payout should not add sticker fragments');
    },
  },
  {
    name: 'v2 on: reward marker preview amount matches actual event-ticket award',
    run: () => {
      const state = {
        ...ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state,
        activeTimedEvent: {
          eventId: 'space_excavator:1000',
          eventType: 'space_excavator',
          startedAtMs: 1_000,
          expiresAtMs: 10_000,
          version: 1,
        },
        rewardBarBoundEventId: 'space_excavator:1000',
        rewardBarLadderId: 'space_excavator_ladder_v1',
        rewardBarProgress: resolveEscalatingThreshold(2),
        rewardBarThreshold: resolveEscalatingThreshold(2),
        rewardBarClaimCountInEvent: 2,
        rewardBarEscalationTier: 2,
      };

      const preview = resolveRewardBarClaimPayoutPreview({ state });
      const hud = resolveIslandRunContractV2RewardHudState({
        islandRunContractV2Enabled: true,
        runtimeState: state,
        nowMs: 2_000,
      });
      const claimed = claimIslandRunContractV2RewardBar({ state, nowMs: 2_001 });

      assertEqual(preview.rewardKind, 'minigame_tokens', 'Preview should resolve event-ticket reward kind');
      assertEqual(preview.minigameTokens, 8, 'Preview should show tuned first event-ticket amount');
      assertEqual(hud.nextRewardKind, 'minigame_tokens', 'HUD should advertise event tickets as the next reward');
      assertEqual(hud.nextRewardAmount, preview.minigameTokens, 'Reward marker amount should match payout preview');
      assertEqual(claimed.payout?.minigameTokens, hud.nextRewardAmount, 'Reward marker amount should match actual claimed tickets');
    },
  },
  {
    name: 'v2 on: multiplier increases progress contributed',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const x1 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'chest' },
        nowMs: 1_100,
        multiplier: 1,
      });
      const x3 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'chest' },
        nowMs: 1_100,
        multiplier: 3,
      });
      assertEqual(x1.rewardBarProgress, 2, 'Expected x1 multiplier progress of 2 (chest=2)');
      assertEqual(x3.rewardBarProgress, 6, 'Expected x3 multiplier progress of 6 (chest=2×3)');
    },
  },
  {
    name: 'v2 on: low multipliers preserve usable early reward-bar progression',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const x1 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'chest' },
        nowMs: 1_100,
        multiplier: 1,
      });
      const x2 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'chest' },
        nowMs: 1_100,
        multiplier: 2,
      });

      assertEqual(resolveEscalatingThreshold(0), 4, 'Expected first fill to remain easy');
      assertEqual(resolveEscalatingThreshold(1), 6, 'Expected second fill to remain an onboarding tier');
      assertEqual(x1.rewardBarProgress, 2, 'Expected ×1 chest progress to remain 2');
      assertEqual(x2.rewardBarProgress, 4, 'Expected ×2 chest progress to fill the first tier');
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
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const baseProgress = withEvent.rewardBarProgress;
      const next = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'encounter_resolve' },
        nowMs: 1_100,
      });
      assertEqual(next.rewardBarProgress, baseProgress + 3, 'Expected encounter_resolve to contribute 3 progress at ×1');
      assertEqual(next.activeTimedEventProgress.feedingActions, 1, 'Expected feeding-action counter to increment on encounter');
    },
  },
  {
    name: 'P1-10: encounter_resolve progress scales with dice multiplier',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const x1 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'encounter_resolve' },
        nowMs: 1_100,
        multiplier: 1,
      });
      const x5 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'encounter_resolve' },
        nowMs: 1_100,
        multiplier: 5,
      });
      assertEqual(x1.rewardBarProgress, 3, 'Expected encounter at ×1 = 3 progress');
      assertEqual(x5.rewardBarProgress, 15, 'Expected encounter at ×5 = 15 progress (3×5)');
    },
  },
  {
    name: 'v2 on: overflow progress carries to next fill (chained claims)',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      // Tier 0 threshold is 4; give 6 progress → overflow of 2
      const overfilled = { ...withEvent, rewardBarProgress: 6 };
      const claimed = claimIslandRunContractV2RewardBar({ state: overfilled, nowMs: 2_000 });
      assert(claimed.payout, 'Expected payout');
      assertEqual(claimed.state.rewardBarProgress, 2, 'Expected overflow progress of 2 carried over');
    },
  },
  {
    name: 'v2 on: chained claims resolve multiple fills in one go',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      // Tier 0 threshold=4, tier 1 threshold=6. Give 12 progress → should fill twice (4+6=10, 2 left over)
      const massProgress = { ...withEvent, rewardBarProgress: 12 };
      const result = resolveChainedRewardBarClaims({ state: massProgress, nowMs: 2_000 });
      assert(result.payouts.length >= 2, `Expected at least 2 chained claims, got ${result.payouts.length}`);
      assertEqual(result.payouts[0]!.rewardKind, 'dice', 'Expected first chain reward to be dice');
      assertEqual(result.payouts[1]!.rewardKind, 'essence', 'Expected second chain reward to be essence');
    },
  },
  {
    name: 'v2 on: high-tier overflow can carry but no longer cheaply chains forever',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const highTierOverflow = {
        ...withEvent,
        rewardBarProgress: 2_000,
        rewardBarClaimCountInEvent: 20,
        rewardBarEscalationTier: 20,
        rewardBarThreshold: resolveEscalatingThreshold(20),
      };

      const result = resolveChainedRewardBarClaims({ state: highTierOverflow, nowMs: 2_000, maxChain: 10 });

      assertEqual(result.payouts.length, 1, 'Expected high-tier overflow to claim once, not cascade through capped 80 thresholds');
      assertEqual(result.state.rewardBarEscalationTier, 21, 'Expected exactly one escalation step');
      assert(
        result.state.rewardBarProgress < resolveEscalatingThreshold(result.state.rewardBarEscalationTier),
        'Expected carried overflow to remain below the next high-tier threshold',
      );
    },
  },
  {
    name: 'economy: x200 progress-tile farming from 2500 dice burns dice overall',
    run: () => {
      const result = simulateProgressTileRolls({
        startingDice: 2_500,
        multiplier: 200,
        rolls: 30,
        tileType: 'chest',
      });

      assert(result.rollsTaken > 0, 'Expected simulation to take at least one ×200 roll');
      assert(result.dicePool < 2_500, `Expected final dice (${result.dicePool}) below starting pool`);
      assert(result.diceAwarded < result.diceSpent, `Expected dice awarded (${result.diceAwarded}) below spent (${result.diceSpent})`);
      assert(result.totalClaims < result.rollsTaken * 5, 'Expected escalating thresholds to prevent max-chain claims every roll');
      assert(result.state.rewardBarEscalationTier >= 20, 'Expected simulation to exercise post-cap tiers');
    },
  },
  {
    name: 'v2 on: sticker completion awards bonus dice and essence',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      // Set tier 3 → threshold is 12; set fragments to 4 so next sticker_fragments claim completes a sticker
      const nearComplete = {
        ...withEvent,
        rewardBarProgress: 12,
        rewardBarClaimCountInEvent: 3,
        rewardBarEscalationTier: 3,
        stickerProgress: { fragments: 4 },
      };
      const claimed = claimIslandRunContractV2RewardBar({ state: nearComplete, nowMs: 2_000 });
      assert(claimed.payout, 'Expected payout');
      // Claim 4 (index 3) → sticker_fragments reward kind
      assertEqual(claimed.payout!.rewardKind, 'sticker_fragments', 'Expected sticker_fragments reward kind');
      assert(claimed.payout!.stickerFragments > 0, 'Expected sticker fragments in payout');
      assertEqual(claimed.payout!.stickersGranted, 1, 'Expected sticker completion');
      assertEqual(claimed.payout!.stickerCompletionBonusDice, 100, 'Expected 100 bonus dice for sticker completion');
      assertEqual(claimed.payout!.stickerCompletionBonusEssence, 50, 'Expected 50 bonus essence for sticker completion');
    },
  },
  {
    name: 'v2 on: feeding_frenzy event rotates in after companion_feast (sequence wraps)',
    run: () => {
      const nowMs = 10_000;
      // companion_feast is index 3; next wraps to feeding_frenzy (index 0)
      const rotated = ensureIslandRunContractV2ActiveTimedEvent({
        nowMs,
        state: {
          ...makeBaseState(),
          activeTimedEvent: {
            eventId: 'companion_feast:0',
            eventType: 'companion_feast',
            startedAtMs: 0,
            expiresAtMs: 5_000,
            version: 4,
          },
          rewardBarBoundEventId: 'companion_feast:0',
          rewardBarLadderId: 'companion_feast_ladder_v1',
        },
      });

      assert(rotated.state.activeTimedEvent, 'Expected rotated event to exist');
      assertEqual(rotated.state.activeTimedEvent?.eventType, 'feeding_frenzy', 'Expected feeding_frenzy event after companion_feast (wrap)');
    },
  },
  // ── Smart multiplier tier tests ──────────────────────────────────────────
  {
    name: 'multiplier: x1 always available even at 0 dice',
    run: () => {
      const tiers = resolveAvailableMultiplierTiers(0);
      assert(tiers.length > 0, 'Expected at least one tier');
      assertEqual(tiers[0]!.multiplier, 1, 'Expected ×1 tier');
      assertEqual(tiers[0]!.unlocked, true, 'Expected ×1 always unlocked');
    },
  },
  {
    name: 'multiplier: small tiers unlock as soon as they are affordable',
    run: () => {
      const tiers = resolveAvailableMultiplierTiers(10);
      const x2 = tiers.find((t) => t.multiplier === 2);
      const x5 = tiers.find((t) => t.multiplier === 5);
      const x10 = tiers.find((t) => t.multiplier === 10);
      const x20 = tiers.find((t) => t.multiplier === 20);
      assert(x2, 'Expected ×2 tier to exist');
      assertEqual(x2!.unlocked, true, 'Expected ×2 unlocked at 10 dice');
      assertEqual(x5!.unlocked, true, 'Expected ×5 unlocked at 10 dice');
      assertEqual(x10!.unlocked, false, 'Expected ×10 locked at 10 dice to preserve two-roll runway');
      assertEqual(x20!.unlocked, false, 'Expected ×20 locked at 10 dice');
    },
  },
  {
    name: 'multiplier: tiers unlock progressively with dice stash',
    run: () => {
      const tiers50 = resolveAvailableMultiplierTiers(50);
      const tiers100 = resolveAvailableMultiplierTiers(100);
      const tiers250 = resolveAvailableMultiplierTiers(250);
      const tiers1000 = resolveAvailableMultiplierTiers(1_000);
      const tiers2000 = resolveAvailableMultiplierTiers(2_000);
      const unlocked50 = tiers50.filter((t) => t.unlocked).map((t) => t.multiplier);
      const unlocked100 = tiers100.filter((t) => t.unlocked).map((t) => t.multiplier);
      const unlocked250 = tiers250.filter((t) => t.unlocked).map((t) => t.multiplier);
      const unlocked1000 = tiers1000.filter((t) => t.unlocked).map((t) => t.multiplier);
      const unlocked2000 = tiers2000.filter((t) => t.unlocked).map((t) => t.multiplier);
      assert(unlocked50.includes(1), 'Expected ×1 unlocked at 50 dice');
      assert(unlocked50.includes(2), 'Expected ×2 unlocked at 50 dice');
      assert(unlocked50.includes(3), 'Expected ×3 unlocked at 50 dice');
      assert(unlocked50.includes(10), 'Expected ×10 unlocked at 50 dice');
      assert(!unlocked50.includes(20), 'Expected ×20 locked until 100 dice');
      assert(unlocked100.includes(20), 'Expected ×20 unlocked at 100 dice');
      assert(!unlocked100.includes(50), 'Expected ×50 locked until 250 dice');
      assert(unlocked250.includes(50), 'Expected ×50 unlocked at 250 dice');
      assert(!unlocked250.includes(100), 'Expected ×100 locked until 1000 dice');
      assert(unlocked1000.includes(100), 'Expected ×100 unlocked at 1000 dice');
      assert(!unlocked1000.includes(200), 'Expected ×200 locked until 2000 dice');
      assert(unlocked2000.includes(200), 'Expected ×200 unlocked at 2000 dice');
    },
  },
  {
    name: 'multiplier: resolveMaxMultiplierForPool returns highest unlocked',
    run: () => {
      assertEqual(resolveMaxMultiplierForPool(0), 1, 'Expected max ×1 at 0 dice');
      assertEqual(resolveMaxMultiplierForPool(2), 2, 'Expected max ×2 at 2 dice');
      assertEqual(resolveMaxMultiplierForPool(10), 5, 'Expected max ×5 before ×10 runway opens');
      assertEqual(resolveMaxMultiplierForPool(20), 10, 'Expected max ×10 at 20 dice');
      assertEqual(resolveMaxMultiplierForPool(99), 10, 'Expected max ×10 before ×20 opens');
      assertEqual(resolveMaxMultiplierForPool(100), 20, 'Expected max ×20 at 100 dice');
      assertEqual(resolveMaxMultiplierForPool(249), 20, 'Expected max ×20 before ×50 opens');
      assertEqual(resolveMaxMultiplierForPool(250), 50, 'Expected max ×50 at 250 dice');
      assertEqual(resolveMaxMultiplierForPool(1000), 100, 'Expected max ×100 at 1000 dice');
      assertEqual(resolveMaxMultiplierForPool(2000), 200, 'Expected max ×200 at 2000 dice');
    },
  },
  {
    name: 'multiplier: dice cost scales with multiplier',
    run: () => {
      assertEqual(resolveDiceCostForMultiplier(1), 1, 'Expected cost 1 at ×1');
      assertEqual(resolveDiceCostForMultiplier(5), 5, 'Expected cost 5 at ×5');
      assertEqual(resolveDiceCostForMultiplier(10), 10, 'Expected cost 10 at ×10');
      assertEqual(resolveDiceCostForMultiplier(100), 100, 'Expected cost 100 at ×100');
      assertEqual(resolveDiceCostForMultiplier(200), 200, 'Expected cost 200 at ×200');
    },
  },
  {
    name: 'multiplier: clampMultiplierToPool downgrades when pool drops',
    run: () => {
      // Player selected ×20 but only has 15 dice now — clamp to the highest affordable open tier.
      assertEqual(clampMultiplierToPool(20, 15), 5, 'Expected clamp to ×5 at 15 dice');
      // Player selected ×5 with 5 dice — OK, they can afford it.
      assertEqual(clampMultiplierToPool(5, 5), 5, 'Expected ×5 stays at 5 dice');
      // Player selected ×50 but only has 200 dice — max they can use is ×20 until ×50 opens at 250.
      assertEqual(clampMultiplierToPool(50, 200), 20, 'Expected clamp to ×20 at 200 dice');
    },
  },
  {
    name: 'multiplier: clampMultiplierToPool ensures affordability',
    run: () => {
      // Player has exactly 4 dice — can afford ×3, but ×5 needs 5 dice.
      const clamped = clampMultiplierToPool(100, 4);
      const cost = resolveDiceCostForMultiplier(clamped);
      assert(cost <= 4, `Expected clamped multiplier cost (${cost}) to be affordable with 4 dice`);
      assertEqual(clamped, 3, 'Expected ×3 at 4 dice');
    },
  },
];
