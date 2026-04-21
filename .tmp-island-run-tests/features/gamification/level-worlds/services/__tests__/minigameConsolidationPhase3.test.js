"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.minigameConsolidationPhase3Tests = void 0;
/**
 * Phase 3 consolidation-plan tests — Event Engine.
 * See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §12 Phase 3 and §9.
 */
const islandRunFeatureFlags_1 = require("../../../../../config/islandRunFeatureFlags");
const islandRunEventEngine_1 = require("../islandRunEventEngine");
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
function withCapturedConsoleInfo(fn) {
    const calls = [];
    const original = console.info;
    console.info = (...args) => {
        calls.push(args);
    };
    try {
        const result = fn();
        return { result, calls };
    }
    finally {
        console.info = original;
    }
}
exports.minigameConsolidationPhase3Tests = [
    {
        name: 'EVENT_IDS lists the four canonical events in rotation order',
        run: () => {
            (0, testHarness_1.assertDeepEqual)([...islandRunEventEngine_1.EVENT_IDS], ['feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast'], 'EVENT_IDS must match rotation 1→2→3→4 from plan §2.1');
        },
    },
    {
        name: 'parseEventId extracts templateId from record event id',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.parseEventId)('feeding_frenzy:1700000000000'), 'feeding_frenzy', 'valid id parses');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.parseEventId)('lucky_spin:1'), 'lucky_spin', 'valid id parses');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.parseEventId)(null), null, 'null → null');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.parseEventId)(undefined), null, 'undefined → null');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.parseEventId)(''), null, 'empty → null');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.parseEventId)('unknown_event:123'), null, 'unknown template → null');
        },
    },
    {
        name: 'getActiveEvent returns null when no event is present',
        run: () => {
            const descriptor = (0, islandRunEventEngine_1.getActiveEvent)(makeBaseState(), 1000);
            (0, testHarness_1.assertEqual)(descriptor, null, 'fresh state has no active event');
        },
    },
    {
        name: 'getActiveEvent returns a descriptor with canonical metadata',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const advanced = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 5000);
            const descriptor = (0, islandRunEventEngine_1.getActiveEvent)(advanced.state, 5000);
            (0, testHarness_1.assert)(descriptor, 'expected active event descriptor after advance');
            (0, testHarness_1.assertEqual)(descriptor.eventId, 'feeding_frenzy', 'first event is feeding_frenzy');
            (0, testHarness_1.assertEqual)(descriptor.icon, '🔥', 'icon matches banner meta');
            (0, testHarness_1.assertEqual)(descriptor.displayName, 'Feeding Frenzy', 'display name matches banner meta');
            (0, testHarness_1.assertEqual)(descriptor.ladderId, 'feeding_frenzy_ladder_v1', 'ladder id carried through');
            (0, testHarness_1.assertEqual)(descriptor.stickerId, 'feeding_frenzy_sticker', 'sticker id carried through');
            (0, testHarness_1.assertEqual)(descriptor.startedAtMs, 5000, 'startedAt from nowMs');
            (0, testHarness_1.assertEqual)(descriptor.remainingMs, 8 * 60 * 60 * 1000, '8h duration remaining at start');
        },
    },
    {
        name: 'getActiveEvent returns null when current event has expired',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const firstAdvance = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 1000);
            const expiresAt = firstAdvance.state.activeTimedEvent.expiresAtMs;
            const descriptor = (0, islandRunEventEngine_1.getActiveEvent)(firstAdvance.state, expiresAt + 10);
            (0, testHarness_1.assertEqual)(descriptor, null, 'expired slot returns null (caller must advance)');
        },
    },
    {
        name: 'advanceEventIfExpired seeds the first event and reports transition',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const result = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 1000);
            (0, testHarness_1.assertEqual)(result.eventChanged, true, 'first assignment counts as a change');
            (0, testHarness_1.assertEqual)(result.previousEventId, null, 'no prior event');
            (0, testHarness_1.assertEqual)(result.nextEventId, 'feeding_frenzy', 'first event is feeding_frenzy');
            (0, testHarness_1.assert)(result.state.activeTimedEvent, 'state now has an active event');
        },
    },
    {
        name: 'advanceEventIfExpired rotates to the next event after expiry',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const first = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 1000);
            const expiresAt = first.state.activeTimedEvent.expiresAtMs;
            const second = (0, islandRunEventEngine_1.advanceEventIfExpired)(first.state, expiresAt + 1);
            (0, testHarness_1.assertEqual)(second.eventChanged, true, 'rotation changes the event');
            (0, testHarness_1.assertEqual)(second.previousEventId, 'feeding_frenzy', 'prior was feeding_frenzy');
            (0, testHarness_1.assertEqual)(second.nextEventId, 'lucky_spin', 'next is lucky_spin');
        },
    },
    {
        name: 'advanceEventIfExpired is idempotent while the active event is live',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const first = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 1000);
            const second = (0, islandRunEventEngine_1.advanceEventIfExpired)(first.state, 2000);
            (0, testHarness_1.assertEqual)(second.eventChanged, false, 'no change mid-event');
            (0, testHarness_1.assertEqual)(second.previousEventId, 'feeding_frenzy', 'prev id echoed back');
            (0, testHarness_1.assertEqual)(second.nextEventId, 'feeding_frenzy', 'next id matches prev');
        },
    },
    {
        name: 'rotation cycles back to feeding_frenzy after companion_feast',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            let state = makeBaseState();
            let nowMs = 1000;
            const seen = [];
            for (let i = 0; i < 5; i += 1) {
                const result = (0, islandRunEventEngine_1.advanceEventIfExpired)(state, nowMs);
                seen.push(result.nextEventId);
                state = result.state;
                nowMs = state.activeTimedEvent.expiresAtMs + 1;
            }
            (0, testHarness_1.assertDeepEqual)(seen, ['feeding_frenzy', 'lucky_spin', 'space_excavator', 'companion_feast', 'feeding_frenzy'], 'rotation cycles 1→2→3→4→1');
        },
    },
    {
        name: 'recordEventProgress increments reward-bar progress via the engine',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const seeded = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 1000).state;
            const withProgress = (0, islandRunEventEngine_1.recordEventProgress)({
                state: seeded,
                source: { kind: 'creature_feed', treatType: 'basic' },
                nowMs: 1000,
            });
            // creature_feed weight is 4 (see ENCOUNTER_REWARD_BAR_PROGRESS / memory)
            (0, testHarness_1.assertEqual)(withProgress.rewardBarProgress, 4, 'creature_feed contributes +4');
            (0, testHarness_1.assertEqual)(withProgress.activeTimedEventProgress.feedingActions, 1, 'feeding actions counter increments');
        },
    },
    {
        name: 'getActiveEventStickerId routes fragments to the active event sticker',
        run: () => {
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.getActiveEventStickerId)('feeding_frenzy'), 'feeding_frenzy_sticker', 'feeding');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.getActiveEventStickerId)('lucky_spin'), 'lucky_spin_sticker', 'spin');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.getActiveEventStickerId)('space_excavator'), 'space_excavator_sticker', 'excavator');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.getActiveEventStickerId)('companion_feast'), 'companion_feast_sticker', 'feast');
            (0, testHarness_1.assertEqual)((0, islandRunEventEngine_1.getActiveEventStickerId)(null), null, 'null → null');
        },
    },
    {
        name: 'getEventMilestoneLadder returns monotonically non-decreasing thresholds',
        run: () => {
            const ladder = (0, islandRunEventEngine_1.getEventMilestoneLadder)('feeding_frenzy');
            (0, testHarness_1.assertEqual)(ladder.length, 10, 'default ladder length is 10');
            (0, testHarness_1.assertEqual)(ladder[0].tier, 0, 'first tier is 0');
            (0, testHarness_1.assertEqual)(ladder[0].threshold, 4, 'tier 0 threshold = 4 per ESCALATING_THRESHOLDS');
            for (let i = 1; i < ladder.length; i += 1) {
                (0, testHarness_1.assert)(ladder[i].threshold >= ladder[i - 1].threshold, `ladder thresholds must be non-decreasing at tier ${i}`);
            }
        },
    },
    {
        name: 'emitEventTransitionTelemetry is a no-op while the engine flag is off',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            const { calls } = withCapturedConsoleInfo(() => {
                (0, islandRunEventEngine_1.emitEventTransitionTelemetry)({
                    previousEventId: 'feeding_frenzy',
                    nextEventId: 'lucky_spin',
                    nowMs: 1000,
                });
            });
            (0, testHarness_1.assertEqual)(calls.length, 0, 'flag off → no console.info emission');
        },
    },
    {
        name: 'emitEventTransitionTelemetry logs one line when the engine flag is on',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ islandRunEventEngineEnabled: true });
            const { calls } = withCapturedConsoleInfo(() => {
                (0, islandRunEventEngine_1.emitEventTransitionTelemetry)({
                    previousEventId: 'feeding_frenzy',
                    nextEventId: 'lucky_spin',
                    nowMs: 1000,
                });
            });
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, testHarness_1.assertEqual)(calls.length, 1, 'flag on → exactly one telemetry line');
            (0, testHarness_1.assertEqual)(calls[0][0], '[IslandRunEventEngine] event_transition', 'stable telemetry tag');
        },
    },
    {
        name: 'advanceEventIfExpired emits telemetry only when the canonical event id changes (flag on)',
        run: () => {
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, islandRunFeatureFlags_1.__setIslandRunFeatureFlagsForTests)({ islandRunEventEngineEnabled: true });
            const { calls } = withCapturedConsoleInfo(() => {
                const first = (0, islandRunEventEngine_1.advanceEventIfExpired)(makeBaseState(), 1000);
                // Idempotent call — no transition.
                (0, islandRunEventEngine_1.advanceEventIfExpired)(first.state, 2000);
                // Force rotation.
                (0, islandRunEventEngine_1.advanceEventIfExpired)(first.state, first.state.activeTimedEvent.expiresAtMs + 1);
            });
            (0, islandRunFeatureFlags_1.__resetIslandRunFeatureFlagsForTests)();
            (0, testHarness_1.assertEqual)(calls.length, 2, '1st-assignment + rotation = 2 telemetry lines; idempotent call = 0');
        },
    },
];
