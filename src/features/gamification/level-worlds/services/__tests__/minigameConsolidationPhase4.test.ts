/**
 * Phase 4 consolidation-plan tests — Boss Stop Shooter Blitz launcher.
 * See `docs/gameplay/MINIGAME_EVENTS_CONSOLIDATION_PLAN.md` §12 Phase 4.
 */
import {
  __resetIslandRunFeatureFlagsForTests,
  __setIslandRunFeatureFlagsForTests,
} from '../../../../../config/islandRunFeatureFlags';
import { resolveBossType, getBossTrialConfig } from '../bossService';
import {
  resolveBossStopMinigame,
  type MinigameLaunchDescriptor,
} from '../islandRunMinigameLauncherService';
import { assert, assertEqual, type TestCase } from './testHarness';

function firstFightIsland(): number {
  // resolveBossType returns 'fight' when islandNumber % 4 === 3.
  for (let i = 1; i <= 200; i += 1) {
    if (resolveBossType(i) === 'fight') return i;
  }
  throw new Error('No fight boss island found — bossService invariants changed');
}

function firstMilestoneIsland(): number {
  for (let i = 1; i <= 200; i += 1) {
    if (resolveBossType(i) === 'milestone') return i;
  }
  throw new Error('No milestone boss island found — bossService invariants changed');
}

export const minigameConsolidationPhase4Tests: TestCase[] = [
  {
    name: 'resolveBossStopMinigame returns null when the shooter-blitz flag is off (default)',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      const result = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: firstFightIsland() });
      assertEqual(result, null, 'flag off → no launch descriptor, legacy path stays in charge');
    },
  },
  {
    name: 'resolveBossStopMinigame returns a shooter_blitz descriptor for fight bosses when flag is on',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunShooterBlitzBossEnabled: true });
      const island = firstFightIsland();
      const expected = getBossTrialConfig(island);
      const result = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: island });
      __resetIslandRunFeatureFlagsForTests();
      assert(result !== null, 'fight boss + flag on → descriptor returned');
      const descriptor = result as MinigameLaunchDescriptor;
      assertEqual(descriptor.minigameId, 'shooter_blitz', 'minigameId matches the registered manifest');
      assertEqual(descriptor.config.bossType, 'fight', 'fight boss propagated to descriptor');
      assertEqual(descriptor.config.islandNumber, island, 'island number propagated to descriptor');
      assertEqual(descriptor.config.scoreTarget, expected.scoreTarget, 'score target from bossService');
      assertEqual(
        descriptor.config.trialDurationSec,
        expected.trialDurationSec,
        'trial duration from bossService',
      );
    },
  },
  {
    name: 'resolveBossStopMinigame returns null for milestone bosses even when the flag is on',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunShooterBlitzBossEnabled: true });
      const island = firstMilestoneIsland();
      const result = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: island });
      __resetIslandRunFeatureFlagsForTests();
      assertEqual(
        result,
        null,
        'milestone bosses keep the existing inline trial — shooter_blitz is fight-only for now',
      );
    },
  },
  {
    name: 'resolveBossStopMinigame scales config deterministically per island difficulty band',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunShooterBlitzBossEnabled: true });
      // Island 3 is the first fight boss (3 % 4 === 3) and sits in the "Easy"
      // difficulty band (≤ 20). Island 23 is the next fight boss after the
      // Easy cutoff (23 % 4 === 3, > 20) and should therefore live in the
      // "Medium" band — which must surface as a strictly larger scoreTarget.
      const easy = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: 3 });
      const medium = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: 23 });
      __resetIslandRunFeatureFlagsForTests();
      assert(easy !== null && medium !== null, 'both fight islands produce descriptors when flag is on');
      const easyDesc = easy as MinigameLaunchDescriptor;
      const mediumDesc = medium as MinigameLaunchDescriptor;
      assert(
        mediumDesc.config.scoreTarget > easyDesc.config.scoreTarget,
        'harder band has a higher score target',
      );
      assert(
        mediumDesc.config.trialDurationSec < easyDesc.config.trialDurationSec,
        'harder band gives less time',
      );
    },
  },
  {
    name: 'resolveBossStopMinigame is pure — flipping the flag off reverts to null on the next call',
    run: () => {
      __resetIslandRunFeatureFlagsForTests();
      __setIslandRunFeatureFlagsForTests({ islandRunShooterBlitzBossEnabled: true });
      const island = firstFightIsland();
      const on = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: island });
      __resetIslandRunFeatureFlagsForTests();
      const off = resolveBossStopMinigame({ kind: 'fixed_boss', islandNumber: island });
      assert(on !== null && off === null, 'flag controls the return value on every call (no caching)');
    },
  },
];
