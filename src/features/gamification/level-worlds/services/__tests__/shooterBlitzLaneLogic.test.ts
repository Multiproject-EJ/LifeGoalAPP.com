import {
  applyShooterStrafeIntent,
  areLanesAligned,
  clampShooterLane,
  laneToPercent,
} from '../../../games/shooter-blitz/shooterBlitzLaneLogic';
import { assertEqual, type TestCase } from './testHarness';

export const shooterBlitzLaneLogicTests: TestCase[] = [
  {
    name: 'clampShooterLane keeps values in -1..1',
    run: () => {
      assertEqual(clampShooterLane(-4), -1, 'lower bound clamps to left lane');
      assertEqual(clampShooterLane(4), 1, 'upper bound clamps to right lane');
      assertEqual(clampShooterLane(0), 0, 'middle lane stays centered');
    },
  },
  {
    name: 'applyShooterStrafeIntent moves one lane per intent',
    run: () => {
      assertEqual(applyShooterStrafeIntent(0, 'left'), -1, 'center + left -> left lane');
      assertEqual(applyShooterStrafeIntent(-1, 'left'), -1, 'left lane does not move past bound');
      assertEqual(applyShooterStrafeIntent(0, 'right'), 1, 'center + right -> right lane');
      assertEqual(applyShooterStrafeIntent(1, 'right'), 1, 'right lane does not move past bound');
      assertEqual(applyShooterStrafeIntent(0, 'fire'), 0, 'fire does not change lane');
    },
  },
  {
    name: 'laneToPercent maps lanes to stable arena positions',
    run: () => {
      assertEqual(laneToPercent(-1), 12, 'left lane offset');
      assertEqual(laneToPercent(0), 50, 'center lane offset');
      assertEqual(laneToPercent(1), 88, 'right lane offset');
    },
  },
  {
    name: 'areLanesAligned only returns true when lanes match exactly',
    run: () => {
      assertEqual(areLanesAligned(-1, -1), true, 'matching lanes align');
      assertEqual(areLanesAligned(0, -1), false, 'mismatched lanes do not align');
      assertEqual(areLanesAligned(1, 0), false, 'mismatched lanes do not align');
    },
  },
];
