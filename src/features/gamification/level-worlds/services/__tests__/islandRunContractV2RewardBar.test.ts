import {
  applyIslandRunContractV2RewardBarProgress,
  canClaimIslandRunContractV2RewardBar,
  claimIslandRunContractV2RewardBar,
  ensureIslandRunContractV2ActiveTimedEvent,
} from '../islandRunContractV2RewardBar';
import type { IslandRunRewardBarRuntimeSlice } from '../islandRunContractV2RewardBar';
import { assert, assertEqual, type TestCase } from './testHarness';

function makeBaseState(): IslandRunRewardBarRuntimeSlice {
  return {
    rewardBarProgress: 0,
    rewardBarThreshold: 10,
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
        rewardBarProgress: 10,
      };
      assert(canClaimIslandRunContractV2RewardBar(claimable), 'Expected claim gate true at threshold');

      const claimed = claimIslandRunContractV2RewardBar({ state: claimable, nowMs: 2_000 });
      assert(claimed.payout, 'Expected payout when claim gate is satisfied');
      assertEqual(claimed.state.rewardBarProgress, 0, 'Expected reward bar reset on claim');
      assertEqual(claimed.state.rewardBarClaimCountInEvent, 1, 'Expected claim count increment');
      assertEqual(claimed.state.rewardBarEscalationTier, 1, 'Expected escalation tier increment');
      assertEqual(claimed.state.rewardBarLastClaimAtMs, 2_000, 'Expected claim timestamp update');
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
];
