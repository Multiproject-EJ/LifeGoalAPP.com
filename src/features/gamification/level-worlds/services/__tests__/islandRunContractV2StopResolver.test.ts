import {
  canPostponeIslandRunStop,
  resolveIslandRunContractV2Stops,
  resolveIslandRunStep1CompleteForProgression,
  resolveIslandRunFullClearForProgression,
  isIslandRunFinishedForDepartureV2,
} from '../islandRunContractV2StopResolver';
import { MAX_BUILD_LEVEL } from '../islandRunContractV2EssenceBuild';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const FULL_BUILD_STATES = Array.from({ length: 5 }, () => ({
  requiredEssence: 50,
  spentEssence: 50,
  buildLevel: MAX_BUILD_LEVEL,
}));

const EMPTY_BUILD_STATES = Array.from({ length: 5 }, () => ({
  requiredEssence: 50,
  spentEssence: 0,
  buildLevel: 0,
}));

function assertResolvedFrontier(
  stopStatesByIndex: Array<{ objectiveComplete: boolean; buildComplete: boolean; accessUnlocked?: boolean; postponedAtMs?: number | null }>,
  expectedStatuses: string[],
  expectedRecommendedStopIndex: number,
  message: string,
  stopTicketsPaidByIsland?: Record<string, number[]>,
) {
  const result = resolveIslandRunContractV2Stops({
    stopStatesByIndex,
    stopTicketsPaidByIsland,
    islandNumber: 1,
  });

  assertDeepEqual(result.statusesByIndex, expectedStatuses, `${message}: statuses`);
  assertEqual(result.recommendedStopIndex, expectedRecommendedStopIndex, `${message}: recommended stop`);
}

export const islandRunContractV2StopResolverTests: TestCase[] = [
  {
    name: 'legacy save without access fields: brand-new island keeps only Hatchery active',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        ['active', 'locked', 'locked', 'locked', 'locked'],
        0,
        'brand-new legacy island',
      );
    },
  },
  {
    name: 'legacy save without access fields: Hatchery complete reconstructs Habit frontier',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        ['completed', 'active', 'locked', 'locked', 'locked'],
        1,
        'Hatchery-complete legacy island',
      );
    },
  },
  {
    name: 'legacy save without access fields: Habit complete reconstructs Mystery frontier',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        ['completed', 'completed', 'active', 'locked', 'locked'],
        2,
        'Habit-complete legacy island',
      );
    },
  },
  {
    name: 'legacy save without access fields: several completions reconstruct Wisdom frontier',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        ['completed', 'completed', 'completed', 'active', 'locked'],
        3,
        'Wisdom-next legacy island',
      );
    },
  },
  {
    name: 'legacy save without access fields: paid ticket on next incomplete stop preserves active frontier',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        ['completed', 'active', 'locked', 'locked', 'locked'],
        1,
        'paid-ticket legacy frontier',
        { '1': [1] },
      );
    },
  },
  {
    name: 'legacy save without access fields: fully completed island stays completed at Boss',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
        ],
        ['completed', 'completed', 'completed', 'completed', 'completed'],
        4,
        'fully completed legacy island',
      );
    },
  },
  {
    name: 'legacy save without access fields: completion plus ticket data does not unlock beyond legitimate frontier',
    run: () => {
      assertResolvedFrontier(
        [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        ['completed', 'completed', 'active', 'locked', 'locked'],
        2,
        'partial legacy island with paid future ticket',
        { '1': [1, 2, 3] },
      );
    },
  },
  {
    name: 'resolver picks first stop without objective complete as active and locks all later stops',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false }, // objective done, build pending — still counted as done for sequencing
          { objectiveComplete: false, buildComplete: false }, // objective not done → active
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });

      assertEqual(result.activeStopIndex, 1, 'Expected stop index 1 to be active (first stop without objective)');
      assertEqual(result.activeStopType, 'habit', 'Expected active stop type to match index 1');
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'active', 'locked', 'locked', 'locked'],
        'Expected stop 0 completed (objective done) and stop 1 active',
      );
    },
  },
  {
    name: 'resolver advances on objectiveComplete alone — build does not gate stop unlock',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false }, // objective done, no build
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });

      assertEqual(result.activeStopIndex, 1, 'Expected stop 1 to be active — stop 0 objective done even without build');
      assertEqual(result.activeStopType, 'habit', 'Expected hatchery to be followed by habit');
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'active', 'locked', 'locked', 'locked'],
        'Expected stop 0 completed when objective complete, regardless of build',
      );
    },
  },
  {
    name: 'resolver returns last index when all objectives are complete while marking every stop completed',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: true },
        ],
      });

      assertEqual(result.activeStopIndex, 4, 'Expected final stop index to be returned after full completion');
      assertEqual(result.activeStopType, 'boss', 'Expected boss type for final stop index');
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'completed', 'completed', 'completed', 'completed'],
        'Expected all stop statuses to remain completed after full completion',
      );
    },
  },
  {
    name: 'resolver treats malformed truthy values as incomplete because completion requires explicit booleans',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: 'true' as unknown as boolean, buildComplete: 'true' as unknown as boolean },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });
      assertEqual(result.activeStopIndex, 0, 'Expected malformed truthy values to remain incomplete');
      assertDeepEqual(result.statusesByIndex, ['active', 'locked', 'locked', 'locked', 'locked'], 'Expected strict boolean completion checks');
    },
  },
  {
    name: 'resolver handles missing or short stop arrays deterministically',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [],
      });
      assertEqual(result.activeStopIndex, 0, 'Expected first stop to remain active with missing state');
      assertEqual(result.activeStopType, 'hatchery', 'Expected hatchery as deterministic fallback active type');
      assertDeepEqual(result.statusesByIndex, ['active', 'locked', 'locked', 'locked', 'locked'], 'Expected missing entries to remain locked after step 1');
    },
  },
  {
    name: 'progression gating uses v2 stop state and ignores legacy completion values when v2 is on',
    run: () => {
      const stopStatesByIndex = [
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];
      assertEqual(
        resolveIslandRunStep1CompleteForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex,
          legacyStep1Complete: true,
        }),
        false,
        'Expected v2 mode to ignore legacy-complete step1 without hatchery flag and stay incomplete',
      );
      assertEqual(
        resolveIslandRunFullClearForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex,
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: true,
          legacyIslandFullyCleared: true,
        }),
        false,
        'Expected v2 mode to ignore legacy full-clear when objectives are not done',
      );
      assertEqual(
        resolveIslandRunStep1CompleteForProgression({
          islandRunContractV2Enabled: false,
          stopStatesByIndex,
          legacyStep1Complete: true,
        }),
        true,
        'Expected legacy mode to preserve existing step1 behavior',
      );
    },
  },
  {
    name: 'v2 full clear requires objectives + builds + hatchery egg resolved',
    run: () => {
      const allObjectives = Array.from({ length: 5 }, () => ({ objectiveComplete: true, buildComplete: false }));

      assertEqual(
        resolveIslandRunFullClearForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: allObjectives,
          stopBuildStateByIndex: EMPTY_BUILD_STATES,
          hatcheryEggResolved: true,
          legacyIslandFullyCleared: false,
        }),
        false,
        'Expected not cleared: builds not done',
      );

      assertEqual(
        resolveIslandRunFullClearForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: allObjectives,
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: false,
          legacyIslandFullyCleared: false,
        }),
        false,
        'Expected not cleared: hatchery egg not resolved',
      );

      assertEqual(
        resolveIslandRunFullClearForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: allObjectives,
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: true,
          legacyIslandFullyCleared: false,
        }),
        true,
        'Expected cleared when all objectives + all builds + egg resolved',
      );
    },
  },

  {
    name: 'departure finish gate only requires restored landmarks, resolved egg, and defeated boss',
    run: () => {
      const incompleteObjectives = Array.from({ length: 5 }, () => ({ objectiveComplete: false, buildComplete: true }));

      assertEqual(
        isIslandRunFinishedForDepartureV2({
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: true,
          bossDefeated: true,
        }),
        true,
        'Expected departure-ready when buildings are fully restored, egg is resolved, and boss is defeated',
      );
      assertEqual(
        resolveIslandRunFullClearForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: incompleteObjectives,
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: true,
          legacyIslandFullyCleared: false,
        }),
        false,
        'Expected broader progression full-clear to remain objective-aware',
      );
      assertEqual(
        isIslandRunFinishedForDepartureV2({
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: true,
          bossDefeated: false,
        }),
        false,
        'Expected no departure-ready state before boss defeat',
      );
      assertEqual(
        isIslandRunFinishedForDepartureV2({
          stopBuildStateByIndex: FULL_BUILD_STATES,
          hatcheryEggResolved: false,
          bossDefeated: true,
        }),
        false,
        'Expected no departure-ready state before egg collection/sale',
      );
      assertEqual(
        isIslandRunFinishedForDepartureV2({
          stopBuildStateByIndex: EMPTY_BUILD_STATES,
          hatcheryEggResolved: true,
          bossDefeated: true,
        }),
        false,
        'Expected no departure-ready state before all landmark builds reach max level',
      );
    },
  },
  {
    name: 'v2 step1 resolves from stopStatesByIndex[0].objectiveComplete only',
    run: () => {
      const incompleteStates = [
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];
      assertEqual(
        resolveIslandRunStep1CompleteForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: incompleteStates,
          legacyStep1Complete: true,
        }),
        false,
        'Expected step1 to remain incomplete when v2 stop 0 objective is false, regardless of legacy flag',
      );
      assertEqual(
        resolveIslandRunStep1CompleteForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: [
            { objectiveComplete: true, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
          ],
          legacyStep1Complete: false,
        }),
        true,
        'Expected step1 to resolve true when v2 stop 0 objective is complete',
      );
    },
  },
  // ── P1-11: ticket_required status ────────────────────────────────────────
  {
    name: 'ticket_required: emitted when active stop (index > 0) has no paid ticket on current island',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false }, // hatchery done → stop 1 is next
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        stopTicketsPaidByIsland: { '1': [] }, // no tickets paid on island 1
        islandNumber: 1,
      });
      assertEqual(result.activeStopIndex, 1, 'Expected stop 1 to be active');
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'ticket_required', 'locked', 'locked', 'locked'],
        'Expected ticket_required for the active stop when its ticket is unpaid',
      );
    },
  },
  {
    name: 'ticket_required: collapses back to active once ticket is paid for that stop index on this island',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        stopTicketsPaidByIsland: { '1': [1] },
        islandNumber: 1,
      });
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'active', 'locked', 'locked', 'locked'],
        'Paid ticket on active stop keeps legacy active status',
      );
    },
  },
  {
    name: 'ticket_required: hatchery (index 0) never reports ticket_required — it is implicitly free',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        // Even a malformed ledger that tries to "un-pay" hatchery should be ignored.
        stopTicketsPaidByIsland: { '1': [] },
        islandNumber: 1,
      });
      assertDeepEqual(
        result.statusesByIndex,
        ['active', 'locked', 'locked', 'locked', 'locked'],
        'Hatchery active stays active regardless of ticket ledger',
      );
    },
  },
  {
    name: 'ticket_required: omitted ticket params preserve legacy active/locked two-state behaviour',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'active', 'locked', 'locked', 'locked'],
        'Without ticket params, resolver falls back to legacy two-state behaviour',
      );
    },
  },
  {
    name: 'ticket_required: ledger is scoped per island — a ticket paid on island 2 does not unlock island 1',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        stopTicketsPaidByIsland: { '2': [1] }, // paid on island 2 only
        islandNumber: 1,
      });
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'ticket_required', 'locked', 'locked', 'locked'],
        'Paid ticket on a different island must not leak into another island',
      );
    },
  },
  {
    name: 'postponed stop remains incomplete and accessible while immediate next stop becomes recommended',
    run: () => {
      const states = [
        { objectiveComplete: true, buildComplete: false, accessUnlocked: true },
        { objectiveComplete: false, buildComplete: false, accessUnlocked: true, postponedAtMs: 1000 },
        { objectiveComplete: false, buildComplete: false, accessUnlocked: true },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: states,
        stopTicketsPaidByIsland: { '1': [1, 2] },
        islandNumber: 1,
      });
      assertEqual(result.activeStopIndex, 1, 'Habit remains the first incomplete objective for completion authority');
      assertEqual(result.recommendedStopIndex, 2, 'Immediate next unlocked stop should be recommended');
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'postponed', 'active', 'locked', 'locked'],
        'Habit remains postponed/incomplete while Mystery is the active recommendation',
      );
    },
  },
  {
    name: 'postponement eligibility opens only the immediate next ordinary stop and enforces open limit',
    run: () => {
      const states = [
        { objectiveComplete: true, buildComplete: false, accessUnlocked: true },
        { objectiveComplete: false, buildComplete: false, accessUnlocked: true },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
        { objectiveComplete: false, buildComplete: false },
      ];
      const allowed = canPostponeIslandRunStop({ stopStatesByIndex: states, stopIndex: 1 });
      assertEqual(allowed.ok, true, 'Habit should be postponable after it is accessible');
      if (allowed.ok) assertEqual(allowed.nextStopIndex, 2, 'Only Mystery should be unlocked next');

      const limit = canPostponeIslandRunStop({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false, accessUnlocked: true },
          { objectiveComplete: false, buildComplete: false, accessUnlocked: true, postponedAtMs: 1 },
          { objectiveComplete: false, buildComplete: false, accessUnlocked: true },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
        stopIndex: 2,
        maxOpenIncompleteStops: 2,
      });
      assertEqual(limit.ok, false, 'Configured open incomplete limit should block another postponement');
      if (!limit.ok) assertEqual(limit.reason, 'open_limit_reached', 'Limit block reason should be explicit');
    },
  },
  {
    name: 'ticket_required: not emitted when all objectives are complete (final-state has no active stop)',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: true, buildComplete: false },
        ],
        stopTicketsPaidByIsland: { '1': [] },
        islandNumber: 1,
      });
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'completed', 'completed', 'completed', 'completed'],
        'All-complete state reports completed across the board — no ticket_required synthesized',
      );
    },
  },
];
