/**
 * Phase 3 consolidation-plan tests — Event Engine.
 * See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §12 Phase 3 and §9.
 */
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import {
  EVENT_IDS,
  advanceEventIfExpired,
  emitEventTransitionTelemetry,
  getActiveEvent,
  getEventDisplayMeta,
  getEventRotationTemplates,
  getActiveEventStickerId,
  getEventMilestoneLadder,
  parseEventId,
  recordEventProgress,
  resolveEventTokenPresentation,
} from '../islandRunEventEngine';
import type { IslandRunRewardBarRuntimeSlice } from '../islandRunContractV2RewardBar';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

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

function withCapturedConsoleInfo<T>(fn: () => T): { result: T; calls: unknown[][] } {
  const calls: unknown[][] = [];
  const original = console.info;
  console.info = (...args: unknown[]) => {
    calls.push(args);
  };
  try {
    const result = fn();
    return { result, calls };
  } finally {
    console.info = original;
  }
}

export const minigameConsolidationPhase3Tests: TestCase[] = [
  {
    name: 'EVENT_IDS lists the four canonical events in rotation order',
    run: () => {
      assertDeepEqual(
        [...EVENT_IDS],
        ['feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast'],
        'EVENT_IDS must match rotation 1→2→3→4 from plan §2.1',
      );
    },
  },
  {
    name: 'parseEventId extracts templateId from record event id',
    run: () => {
      assertEqual(parseEventId('feeding_frenzy:1700000000000'), 'feeding_frenzy', 'valid id parses');
      assertEqual(parseEventId('lucky_spin:1'), 'lucky_spin', 'valid id parses');
      assertEqual(parseEventId(null), null, 'null → null');
      assertEqual(parseEventId(undefined), null, 'undefined → null');
      assertEqual(parseEventId(''), null, 'empty → null');
      assertEqual(parseEventId('unknown_event:123'), null, 'unknown template → null');
    },
  },
  {
    name: 'getActiveEvent returns null when no event is present',
    run: () => {
      const descriptor = getActiveEvent(makeBaseState(), 1_000);
      assertEqual(descriptor, null, 'fresh state has no active event');
    },
  },
  {
    name: 'getActiveEvent returns a descriptor with canonical metadata',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const advanced = advanceEventIfExpired(makeBaseState(), 5_000);
      const descriptor = getActiveEvent(advanced.state, 5_000);
      assert(descriptor, 'expected active event descriptor after advance');
      assertEqual(descriptor!.eventId, 'feeding_frenzy', 'first event is feeding_frenzy');
      assertEqual(descriptor!.icon, '🔥', 'icon matches banner meta');
      assertEqual(descriptor!.displayName, 'Feeding Frenzy', 'display name matches banner meta');
      assertEqual(descriptor!.ladderId, 'feeding_frenzy_ladder_v1', 'ladder id carried through');
      assertEqual(descriptor!.stickerId, 'feeding_frenzy_sticker', 'sticker id carried through');
      assertEqual(descriptor!.startedAtMs, 5_000, 'startedAt from nowMs');
      assertEqual(descriptor!.remainingMs, 8 * 60 * 60 * 1000, '8h duration remaining at start');
    },
  },
  {
    name: 'getActiveEvent returns null when current event has expired',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const firstAdvance = advanceEventIfExpired(makeBaseState(), 1_000);
      const expiresAt = firstAdvance.state.activeTimedEvent!.expiresAtMs;
      const descriptor = getActiveEvent(firstAdvance.state, expiresAt + 10);
      assertEqual(descriptor, null, 'expired slot returns null (caller must advance)');
    },
  },
  {
    name: 'advanceEventIfExpired seeds the first event and reports transition',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const result = advanceEventIfExpired(makeBaseState(), 1_000);
      assertEqual(result.eventChanged, true, 'first assignment counts as a change');
      assertEqual(result.previousEventId, null, 'no prior event');
      assertEqual(result.nextEventId, 'feeding_frenzy', 'first event is feeding_frenzy');
      assert(result.state.activeTimedEvent, 'state now has an active event');
    },
  },
  {
    name: 'advanceEventIfExpired rotates to the next event after expiry',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const first = advanceEventIfExpired(makeBaseState(), 1_000);
      const expiresAt = first.state.activeTimedEvent!.expiresAtMs;
      const second = advanceEventIfExpired(first.state, expiresAt + 1);
      assertEqual(second.eventChanged, true, 'rotation changes the event');
      assertEqual(second.previousEventId, 'feeding_frenzy', 'prior was feeding_frenzy');
      assertEqual(second.nextEventId, 'lucky_spin', 'next is lucky_spin');
    },
  },
  {
    name: 'advanceEventIfExpired is idempotent while the active event is live',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const first = advanceEventIfExpired(makeBaseState(), 1_000);
      const second = advanceEventIfExpired(first.state, 2_000);
      assertEqual(second.eventChanged, false, 'no change mid-event');
      assertEqual(second.previousEventId, 'feeding_frenzy', 'prev id echoed back');
      assertEqual(second.nextEventId, 'feeding_frenzy', 'next id matches prev');
    },
  },
  {
    name: 'rotation cycles back to feeding_frenzy after companion_feast',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      let state = makeBaseState();
      let nowMs = 1_000;
      const seen: Array<string | null> = [];
      for (let i = 0; i < 5; i += 1) {
        const result = advanceEventIfExpired(state, nowMs);
        seen.push(result.nextEventId);
        state = result.state;
        nowMs = state.activeTimedEvent!.expiresAtMs + 1;
      }
      assertDeepEqual(
        seen,
        ['feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast', 'feeding_frenzy'],
        'rotation cycles 1→2→3→4→1',
      );
    },
  },
  {
    name: 'recordEventProgress increments reward-bar progress via the engine',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const seeded = advanceEventIfExpired(makeBaseState(), 1_000).state;
      const withProgress = recordEventProgress({
        state: seeded,
        source: { kind: 'creature_feed', treatType: 'basic' },
        nowMs: 1_000,
      });
      // creature_feed weight is 4 (see ENCOUNTER_REWARD_BAR_PROGRESS / memory)
      assertEqual(withProgress.rewardBarProgress, 4, 'creature_feed contributes +4');
      assertEqual(
        withProgress.activeTimedEventProgress.feedingActions,
        1,
        'feeding actions counter increments',
      );
    },
  },
  {
    name: 'getActiveEventStickerId routes fragments to the active event sticker',
    run: () => {
      assertEqual(getActiveEventStickerId('feeding_frenzy'), 'feeding_frenzy_sticker', 'feeding');
      assertEqual(getActiveEventStickerId('lucky_spin'), 'lucky_spin_sticker', 'spin');
      assertEqual(getActiveEventStickerId('space_excavator'), 'space_excavator_sticker', 'excavator');
      assertEqual(getActiveEventStickerId('companion_feast'), 'companion_feast_sticker', 'feast');
      assertEqual(getActiveEventStickerId(null), null, 'null → null');
    },
  },
  {
    name: 'getEventDisplayMeta returns canonical icon/display labels with fallback for unknown events',
    run: () => {
      assertDeepEqual(
        getEventDisplayMeta('feeding_frenzy'),
        { icon: '🔥', displayName: 'Feeding Frenzy' },
        'canonical event meta should match banner config',
      );
      assertDeepEqual(
        getEventDisplayMeta('future_event_mode'),
        { icon: '⭐', displayName: 'Future Event Mode' },
        'unknown event ids should still render a readable fallback',
      );
    },
  },
  {
    name: 'resolveEventTokenPresentation uses event icon and readable token labels with safe fallback',
    run: () => {
      assertDeepEqual(
        resolveEventTokenPresentation('space_excavator'),
        {
          icon: '🚀',
          labelSingular: 'Space Excavator token',
          labelPlural: 'Space Excavator tokens',
        },
        'canonical event token presentation should inherit event icon/display name',
      );
      assertDeepEqual(
        resolveEventTokenPresentation(null),
        {
          icon: '🎫',
          labelSingular: 'Event token',
          labelPlural: 'Event tokens',
        },
        'missing/unknown event should use neutral ticket fallback',
      );
    },
  },
  {
    name: 'getEventRotationTemplates exposes all canonical event templates for UI renderers',
    run: () => {
      const templates = getEventRotationTemplates();
      assertEqual(templates.length, 4, 'all four canonical events should be exposed');
      assertDeepEqual(
        templates.map((template) => template.eventId),
        ['feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast'],
        'rotation template order must remain canonical',
      );
      assert(templates.every((template) => template.displayName.length > 0), 'every template should include a non-empty display label');
      assert(templates.every((template) => template.icon.length > 0), 'every template should include an icon');
    },
  },
  {
    name: 'getEventMilestoneLadder returns monotonically non-decreasing thresholds',
    run: () => {
      const ladder = getEventMilestoneLadder('feeding_frenzy');
      assertEqual(ladder.length, 10, 'default ladder length is 10');
      assertEqual(ladder[0]!.tier, 0, 'first tier is 0');
      assertEqual(ladder[0]!.threshold, 4, 'tier 0 threshold = 4 per ESCALATING_THRESHOLDS');
      for (let i = 1; i < ladder.length; i += 1) {
        assert(
          ladder[i]!.threshold >= ladder[i - 1]!.threshold,
          `ladder thresholds must be non-decreasing at tier ${i}`,
        );
      }
    },
  },
  {
    name: 'emitEventTransitionTelemetry is a no-op while the engine flag is off',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const { calls } = withCapturedConsoleInfo(() => {
        emitEventTransitionTelemetry({
          previousEventId: 'feeding_frenzy',
          nextEventId: 'lucky_spin',
          nowMs: 1_000,
        });
      });
      assertEqual(calls.length, 0, 'flag off → no console.info emission');
    },
  },
  {
    name: 'emitEventTransitionTelemetry logs one line when the engine flag is on',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunEventEngineEnabled: true });
      const { calls } = withCapturedConsoleInfo(() => {
        emitEventTransitionTelemetry({
          previousEventId: 'feeding_frenzy',
          nextEventId: 'lucky_spin',
          nowMs: 1_000,
        });
      });
      __resetIslandRunFeatureFlagsForTests();
      assertEqual(calls.length, 1, 'flag on → exactly one telemetry line');
      assertEqual(calls[0]![0], '[IslandRunEventEngine] event_transition', 'stable telemetry tag');
    },
  },
  {
    name: 'advanceEventIfExpired emits telemetry only when the canonical event id changes (flag on)',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunEventEngineEnabled: true });
      const { calls } = withCapturedConsoleInfo(() => {
        const first = advanceEventIfExpired(makeBaseState(), 1_000);
        // Idempotent call — no transition.
        advanceEventIfExpired(first.state, 2_000);
        // Force rotation.
        advanceEventIfExpired(first.state, first.state.activeTimedEvent!.expiresAtMs + 1);
      });
      __resetIslandRunFeatureFlagsForTests();
      assertEqual(calls.length, 2, '1st-assignment + rotation = 2 telemetry lines; idempotent call = 0');
    },
  },
];
