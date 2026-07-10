export type TodoSwipeAction = 'complete';

export function getTodoSwipeAction(isExpanded: boolean): TodoSwipeAction | null {
  return isExpanded ? null : 'complete';
}

export function getTodoSwipeArmedDirection(params: {
  clampedOffsetPx: number;
  armThresholdPx: number;
  swipeAction: TodoSwipeAction | null;
}): 'right' | null {
  if (!params.swipeAction) {
    return null;
  }
  return params.clampedOffsetPx >= params.armThresholdPx ? 'right' : null;
}

/**
 * Move the active todo id at `fromIndex` to `toIndex`, returning the new ordering.
 * Indices are clamped so out-of-range drops land at the nearest valid slot.
 * Used by the long-press drag-to-reorder gesture on the Today screen.
 */
export function reorderTodoIds(ids: string[], fromIndex: number, toIndex: number): string[] {
  if (fromIndex < 0 || fromIndex >= ids.length) return ids.slice();
  const clampedTo = Math.max(0, Math.min(ids.length - 1, toIndex));
  if (fromIndex === clampedTo) return ids.slice();
  const next = ids.slice();
  const [moved] = next.splice(fromIndex, 1);
  next.splice(clampedTo, 0, moved);
  return next;
}

/**
 * Given the pointer's Y position and the cached vertical midpoints of the active
 * todo rows (in their pre-drag order), return the index the dragged row should
 * settle into. Mirrors the crossing logic used during a live reorder drag.
 */
export function computeTodoReorderTargetIndex(params: {
  pointerY: number;
  startIndex: number;
  midpoints: number[];
}): number {
  const { pointerY, startIndex, midpoints } = params;
  let target = startIndex;
  if (pointerY > (midpoints[startIndex] ?? pointerY)) {
    for (let i = startIndex + 1; i < midpoints.length; i += 1) {
      if (pointerY > midpoints[i]) target = i;
      else break;
    }
  } else {
    for (let i = startIndex - 1; i >= 0; i -= 1) {
      if (pointerY < midpoints[i]) target = i;
      else break;
    }
  }
  return target;
}
