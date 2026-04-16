import {
  applyIslandRunContractV2RewardBarProgress,
  canClaimIslandRunContractV2RewardBar,
  claimIslandRunContractV2RewardBar,
  ensureIslandRunContractV2ActiveTimedEvent,
  resolveEscalatingThreshold,
  resolveNextRewardKind,
  resolveChainedRewardBarClaims,
} from '../islandRunContractV2RewardBar';
import type { IslandRunRewardBarRuntimeSlice } from '../islandRunContractV2RewardBar';
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
        source: { kind: 'tile', tileType: 'egg_shard' },
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
    name: 'v2 on: escalating thresholds increase with tier',
    run: () => {
      const t0 = resolveEscalatingThreshold(0);
      const t1 = resolveEscalatingThreshold(1);
      const t5 = resolveEscalatingThreshold(5);
      const t9 = resolveEscalatingThreshold(9);
      assertEqual(t0, 4, 'Expected tier 0 threshold of 4');
      assertEqual(t1, 6, 'Expected tier 1 threshold of 6');
      assert(t5 > t1, 'Expected tier 5 threshold higher than tier 1');
      assert(t9 > t5, 'Expected tier 9 threshold higher than tier 5');
      // Beyond ladder length should clamp to last
      const t99 = resolveEscalatingThreshold(99);
      assertEqual(t99, t9, 'Expected tier beyond ladder to clamp to last value');
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
    name: 'v2 on: multiplier increases progress contributed',
    run: () => {
      const withEvent = ensureIslandRunContractV2ActiveTimedEvent({ state: makeBaseState(), nowMs: 1_000 }).state;
      const x1 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'egg_shard' },
        nowMs: 1_100,
        multiplier: 1,
      });
      const x3 = applyIslandRunContractV2RewardBarProgress({
        state: withEvent,
        source: { kind: 'tile', tileType: 'egg_shard' },
        nowMs: 1_100,
        multiplier: 3,
      });
      assertEqual(x1.rewardBarProgress, 4, 'Expected x1 multiplier progress of 4');
      assertEqual(x3.rewardBarProgress, 12, 'Expected x3 multiplier progress of 12');
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
    name: 'v2 on: lucky_spin event rotates in after companion_feast',
    run: () => {
      const nowMs = 10_000;
      // companion_feast is index 2; next should be lucky_spin (index 3)
      const rotated = ensureIslandRunContractV2ActiveTimedEvent({
        nowMs,
        state: {
          ...makeBaseState(),
          activeTimedEvent: {
            eventId: 'companion_feast:0',
            eventType: 'companion_feast',
            startedAtMs: 0,
            expiresAtMs: 5_000,
            version: 3,
          },
          rewardBarBoundEventId: 'companion_feast:0',
          rewardBarLadderId: 'companion_feast_ladder_v1',
        },
      });

      assert(rotated.state.activeTimedEvent, 'Expected rotated event to exist');
      assertEqual(rotated.state.activeTimedEvent?.eventType, 'lucky_spin', 'Expected lucky_spin event after companion_feast');
    },
  },
];
