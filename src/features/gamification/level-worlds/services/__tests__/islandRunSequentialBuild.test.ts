import {
  canBuildIslandRunSequentialTarget,
  deriveIslandRunSequentialBuildParts,
  deriveIslandRunSequentialBuildView,
  getIslandRunSequentialBuildLockReason,
  resolveIslandRunSequentialBuildTarget,
  type IslandRunSequentialBuildTarget,
} from '../islandRunSequentialBuild';
import type { IslandRunContractV2BuildState } from '../islandRunContractV2EssenceBuild';
import { assert, assertDeepEqual, assertEqual, type TestCase } from './testHarness';

const state = (buildLevel: number, spentEssence = 0, requiredEssence = 120): IslandRunContractV2BuildState => ({
  buildLevel,
  spentEssence,
  requiredEssence,
});

const states = (levels: readonly number[], options?: { spent?: Record<number, number>; required?: Record<number, number> }) =>
  levels.map((level, stopIndex) => state(level, options?.spent?.[stopIndex] ?? 0, options?.required?.[stopIndex] ?? 120));

const expectTarget = (
  target: IslandRunSequentialBuildTarget | null,
  expected: Pick<IslandRunSequentialBuildTarget, 'stopIndex' | 'stopId' | 'targetLevel' | 'sequencePosition'> | null,
) => {
  if (!expected) {
    assertEqual(target, null, 'Expected no active target');
    return;
  }
  if (!target) throw new Error('Expected active target');
  assertEqual(target.stopIndex, expected.stopIndex, 'Unexpected target stopIndex');
  assertEqual(target.stopId, expected.stopId, 'Unexpected target stopId');
  assertEqual(target.targetLevel, expected.targetLevel, 'Unexpected target level');
  assertEqual(target.sequencePosition, expected.sequencePosition, 'Unexpected sequence position');
  assertEqual(target.totalSequenceSteps, 15, 'Expected 15 total sequence steps');
};

export const islandRunSequentialBuildTests: TestCase[] = [
  {
    name: 'sequential target resolves fresh and normal progression states',
    run: () => {
      expectTarget(resolveIslandRunSequentialBuildTarget(states([0, 0, 0, 0, 0])), {
        stopIndex: 0, stopId: 'hatchery', targetLevel: 1, sequencePosition: 1,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([1, 0, 0, 0, 0])), {
        stopIndex: 1, stopId: 'habit', targetLevel: 1, sequencePosition: 2,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([1, 1, 1, 1, 1])), {
        stopIndex: 0, stopId: 'hatchery', targetLevel: 2, sequencePosition: 6,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([2, 2, 2, 2, 2])), {
        stopIndex: 0, stopId: 'hatchery', targetLevel: 3, sequencePosition: 11,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([3, 3, 3, 3, 2])), {
        stopIndex: 4, stopId: 'boss', targetLevel: 3, sequencePosition: 15,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([3, 3, 3, 3, 3])), null);
    },
  },
  {
    name: 'sequential target preserves uneven legacy states and finds earliest missing step',
    run: () => {
      expectTarget(resolveIslandRunSequentialBuildTarget(states([2, 0, 1, 0, 0])), {
        stopIndex: 1, stopId: 'habit', targetLevel: 1, sequencePosition: 2,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([1, 2, 1, 1, 1])), {
        stopIndex: 0, stopId: 'hatchery', targetLevel: 2, sequencePosition: 6,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget(states([3, 3, 2, 3, 3])), {
        stopIndex: 2, stopId: 'mystery', targetLevel: 3, sequencePosition: 13,
      });

      const view = deriveIslandRunSequentialBuildView(states([0, 2, 0, 0, 0], { spent: { 1: 77 } }));
      expectTarget(view.activeTarget, { stopIndex: 0, stopId: 'hatchery', targetLevel: 1, sequencePosition: 1 });
      assertEqual(view.spentEssence, 0, 'Expected active view to use only active target progress');
      assertEqual(view.nextTarget?.stopId, 'habit', 'Expected next target to derive from canonical order');
    },
  },
  {
    name: 'five visual construction parts derive thresholds, statuses, and remaining essence',
    run: () => {
      assertDeepEqual(
        deriveIslandRunSequentialBuildParts({ requiredEssence: 120, spentEssence: 0 }).map((part) => part.status),
        ['active', 'locked', 'locked', 'locked', 'locked'],
        'Expected spent 0 to activate part 1',
      );
      assertDeepEqual(
        deriveIslandRunSequentialBuildParts({ requiredEssence: 120, spentEssence: 24 }).map((part) => part.status),
        ['complete', 'active', 'locked', 'locked', 'locked'],
        'Expected exact first threshold to complete part 1 and activate part 2',
      );
      const spent30 = deriveIslandRunSequentialBuildParts({ requiredEssence: 120, spentEssence: 30 });
      assertEqual(spent30[1].status, 'active', 'Expected part 2 active at 30/120');
      assertEqual(spent30[1].remainingEssence, 18, 'Expected 18 essence remaining to second threshold');
      const spent119 = deriveIslandRunSequentialBuildParts({ requiredEssence: 120, spentEssence: 119 });
      assertEqual(spent119[4].status, 'active', 'Expected part 5 active at 119/120');
      assertEqual(spent119[4].remainingEssence, 1, 'Expected 1 essence remaining to final threshold');
      assertDeepEqual(
        deriveIslandRunSequentialBuildParts({ requiredEssence: 120, spentEssence: 120 }).map((part) => part.status),
        ['complete', 'complete', 'complete', 'complete', 'complete'],
        'Expected spent at required to complete all thresholds safely',
      );
      assertDeepEqual(
        deriveIslandRunSequentialBuildParts({ requiredEssence: 121, spentEssence: 0 }).map((part) => part.thresholdEssence),
        [25, 49, 73, 97, 121],
        'Expected non-divisible thresholds to be monotonic and end at required essence',
      );
    },
  },
  {
    name: 'view derives positions, rounds, completion, and active parts',
    run: () => {
      for (let targetLevel = 1; targetLevel <= 3; targetLevel += 1) {
        for (let stopIndex = 0; stopIndex < 5; stopIndex += 1) {
          const levels = Array.from({ length: 5 }, (_, idx) => {
            if (idx < stopIndex) return targetLevel;
            if (idx === stopIndex) return targetLevel - 1;
            return Math.max(0, targetLevel - 1);
          });
          const view = deriveIslandRunSequentialBuildView(states(levels));
          if (!view.activeTarget) throw new Error('Expected active target for incomplete sampled state');
          assertEqual(view.activeTarget.sequencePosition, ((targetLevel - 1) * 5) + stopIndex + 1, 'Expected position formula for all targets');
          assertEqual(view.currentRound, targetLevel as 1 | 2 | 3, 'Expected current round to match target level');
        }
      }

      assertEqual(deriveIslandRunSequentialBuildView(states([1, 1, 1, 1, 1])).completedRounds, 1, 'Expected one completed round');
      assertEqual(deriveIslandRunSequentialBuildView(states([2, 2, 2, 2, 2])).completedRounds, 2, 'Expected two completed rounds');
      const complete = deriveIslandRunSequentialBuildView(states([3, 3, 3, 3, 3]));
      assertEqual(complete.isFullyBuilt, true, 'Expected complete island to be fully built');
      assertEqual(complete.completedRounds, 3, 'Expected fully complete island to have three completed rounds');
      assertEqual(complete.completedSequenceSteps, 15, 'Expected fully complete island to have 15 completed sequence steps');
      assertEqual(complete.activeTarget, null, 'Expected fully complete island to have no active target');
      assertEqual(complete.nextTarget, null, 'Expected fully complete island to have no next target');
    },
  },
  {
    name: 'lock helper allows active target and returns reason codes for inactive or complete targets',
    run: () => {
      const fresh = states([0, 0, 0, 0, 0]);
      assertEqual(canBuildIslandRunSequentialTarget(0, fresh), true, 'Expected active target to be buildable');
      assertEqual(getIslandRunSequentialBuildLockReason(1, fresh), 'not_active_target', 'Expected future target lock reason');
      assertEqual(getIslandRunSequentialBuildLockReason(0, states([3, 0, 0, 0, 0])), 'already_fully_built', 'Expected fully built inactive stop reason');
      assertEqual(getIslandRunSequentialBuildLockReason(4, states([3, 3, 3, 3, 3])), 'all_builds_complete', 'Expected all-complete reason');
    },
  },
  {
    name: 'defensive normalization handles missing, null, negative, over-level, invalid cost, and extra entries',
    run: () => {
      expectTarget(resolveIslandRunSequentialBuildTarget([]), {
        stopIndex: 0, stopId: 'hatchery', targetLevel: 1, sequencePosition: 1,
      });
      expectTarget(resolveIslandRunSequentialBuildTarget([null, state(1), undefined]), {
        stopIndex: 0, stopId: 'hatchery', targetLevel: 1, sequencePosition: 1,
      });
      const negative = deriveIslandRunSequentialBuildView([state(-4, -10, -50), state(0), state(0), state(0), state(0)]);
      assertEqual(negative.spentEssence, 0, 'Expected negative spent essence to clamp to zero');
      assertEqual(negative.requiredEssence, 0, 'Expected invalid required essence to clamp to zero');
      assertDeepEqual(negative.parts.map((part) => part.thresholdEssence), [0, 0, 0, 0, 0], 'Expected zero invalid thresholds');
      assertEqual(resolveIslandRunSequentialBuildTarget(states([9, 9, 9, 9, 9])), null, 'Expected build levels above 3 to clamp complete');
      expectTarget(resolveIslandRunSequentialBuildTarget([...states([3, 3, 3, 3, 3]), state(0)]), null);
    },
  },
  {
    name: 'sampled build-level combinations always derive earliest missing target and stable part invariants',
    run: () => {
      for (let a = 0; a <= 3; a += 1) {
        for (let b = 0; b <= 3; b += 1) {
          for (let c = 0; c <= 3; c += 1) {
            for (let d = 0; d <= 3; d += 1) {
              for (let e = 0; e <= 3; e += 1) {
                const levels = [a, b, c, d, e];
                const target = resolveIslandRunSequentialBuildTarget(states(levels));
                const fullyBuilt = levels.every((level) => level === 3);
                assertEqual(target === null, fullyBuilt, 'Expected null target only when every normalized level is 3');
                if (target) {
                  assert(target.sequencePosition >= 1 && target.sequencePosition <= 15, 'Expected position within 1-15');
                  assertEqual(levels[target.stopIndex] < target.targetLevel, true, 'Expected target to be earliest missing pair');
                  const view = deriveIslandRunSequentialBuildView(states(levels, { spent: { [target.stopIndex]: 30 }, required: { [target.stopIndex]: 121 } }));
                  assertEqual(view.parts.filter((part) => part.status === 'active').length, 1, 'Expected exactly one active part for incomplete valid target');
                  for (let index = 1; index < view.parts.length; index += 1) {
                    assert(view.parts[index].thresholdEssence >= view.parts[index - 1].thresholdEssence, 'Expected monotonic thresholds');
                  }
                  assertEqual(view.parts[4].thresholdEssence, 121, 'Expected final threshold to equal required essence');
                }
              }
            }
          }
        }
      }
    },
  },
];
