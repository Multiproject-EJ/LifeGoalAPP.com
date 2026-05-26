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
