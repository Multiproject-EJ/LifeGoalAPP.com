export const ISLAND_RUN_CONTROLLER_TUCK_SWIPE_THRESHOLD_PX = 34;

export type IslandRunControllerTuckGesture = {
  deltaX: number;
  deltaY: number;
  currentlyTucked: boolean;
};

export type IslandRunControllerTuckGestureResult = {
  isSwipe: boolean;
  nextTucked: boolean;
};

/**
 * Presentation-only gesture resolver for the Island Run controller tray.
 * Vertical intent must be unambiguous so ordinary taps and horizontal camera
 * gestures never hide the controls accidentally.
 */
export function resolveIslandRunControllerTuckGesture({
  deltaX,
  deltaY,
  currentlyTucked,
}: IslandRunControllerTuckGesture): IslandRunControllerTuckGestureResult {
  const isVerticalSwipe = Math.abs(deltaY) >= ISLAND_RUN_CONTROLLER_TUCK_SWIPE_THRESHOLD_PX
    && Math.abs(deltaY) > Math.abs(deltaX) * 1.15;
  if (!isVerticalSwipe) {
    return { isSwipe: false, nextTucked: currentlyTucked };
  }
  return { isSwipe: true, nextTucked: deltaY > 0 };
}
