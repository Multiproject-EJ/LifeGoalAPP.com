import {
  resolveIslandRunContractV2Stops,
  resolveIslandRunStep1CompleteForProgression,
  resolveIslandRunFullClearForProgression,
} from '../islandRunContractV2StopResolver';
import { assertDeepEqual, assertEqual, type TestCase } from './testHarness';

export const islandRunContractV2StopResolverTests: TestCase[] = [
  {
    name: 'resolver picks first incomplete stop as active and locks all later stops',
    run: () => {
      const result = resolveIslandRunContractV2Stops({
        stopStatesByIndex: [
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: true, buildComplete: false },
          { objectiveComplete: true, buildComplete: true },
          { objectiveComplete: false, buildComplete: false },
          { objectiveComplete: false, buildComplete: false },
        ],
      });

      assertEqual(result.activeStopIndex, 1, 'Expected stop index 1 to be active (first incomplete stop)');
      assertEqual(result.activeStopType, 'habit', 'Expected active stop type to match index 1');
      assertDeepEqual(
        result.statusesByIndex,
        ['completed', 'active', 'locked', 'locked', 'locked'],
        'Expected strict sequential progression with no early unlocks',
      );
    },
  },
  {
    name: 'resolver treats buildComplete as required and does not infer completion from objectiveComplete',
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

      assertEqual(result.activeStopIndex, 0, 'Expected stop 0 to remain active until both completion flags are true');
      assertEqual(result.activeStopType, 'hatchery', 'Expected hatchery to remain active');
      assertDeepEqual(
        result.statusesByIndex,
        ['active', 'locked', 'locked', 'locked', 'locked'],
        'Expected all later stops to remain locked while active stop is incomplete',
      );
    },
  },
  {
    name: 'resolver returns last index when all stops are complete while marking every stop completed',
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
          legacyIslandFullyCleared: true,
        }),
        false,
        'Expected v2 mode to ignore legacy full-clear and stay incomplete',
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
    name: 'v2 step1 resolves true when hatcheryEffectivelyComplete bridges egg lifecycle to v2 state',
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
          hatcheryEffectivelyComplete: true,
        }),
        true,
        'Expected hatcheryEffectivelyComplete to unblock step1 in v2 when egg has been set/collected/sold',
      );
      assertEqual(
        resolveIslandRunStep1CompleteForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex,
          legacyStep1Complete: false,
          hatcheryEffectivelyComplete: false,
        }),
        false,
        'Expected step1 to remain incomplete when neither v2 state nor hatchery flag says done',
      );
      assertEqual(
        resolveIslandRunStep1CompleteForProgression({
          islandRunContractV2Enabled: true,
          stopStatesByIndex: [
            { objectiveComplete: true, buildComplete: true },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
            { objectiveComplete: false, buildComplete: false },
          ],
          legacyStep1Complete: false,
          hatcheryEffectivelyComplete: false,
        }),
        true,
        'Expected v2 stop state to take priority even when hatchery flag is false',
      );
    },
  },
];
