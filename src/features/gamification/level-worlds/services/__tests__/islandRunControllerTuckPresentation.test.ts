import {
  ISLAND_RUN_CONTROLLER_TUCK_SWIPE_THRESHOLD_PX,
  resolveIslandRunControllerTuckGesture,
} from '../islandRunControllerTuckPresentation';
import { assertEqual, type TestCase } from './testHarness';

export const islandRunControllerTuckPresentationTests: TestCase[] = [
  {
    name: 'downward swipe tucks the controller and upward swipe restores it',
    run: () => {
      assertEqual(
        resolveIslandRunControllerTuckGesture({ deltaX: 2, deltaY: 48, currentlyTucked: false }).nextTucked,
        true,
        'a clear downward swipe should tuck the controller',
      );
      assertEqual(
        resolveIslandRunControllerTuckGesture({ deltaX: -3, deltaY: -52, currentlyTucked: true }).nextTucked,
        false,
        'a clear upward swipe should restore the controller',
      );
    },
  },
  {
    name: 'tap-sized and horizontal gestures leave controller presentation unchanged',
    run: () => {
      const tap = resolveIslandRunControllerTuckGesture({ deltaX: 3, deltaY: 8, currentlyTucked: false });
      assertEqual(tap.isSwipe, false, 'a tap-sized move should not be classified as a swipe');
      assertEqual(tap.nextTucked, false, 'a tap-sized move should preserve the current state');
      const horizontal = resolveIslandRunControllerTuckGesture({
        deltaX: 70,
        deltaY: ISLAND_RUN_CONTROLLER_TUCK_SWIPE_THRESHOLD_PX + 2,
        currentlyTucked: true,
      });
      assertEqual(horizontal.isSwipe, false, 'a mostly horizontal move should not tuck or restore the tray');
      assertEqual(horizontal.nextTucked, true, 'a mostly horizontal move should preserve the current state');
    },
  },
];
