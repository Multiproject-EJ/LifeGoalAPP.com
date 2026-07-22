/**
 * Presentation-only discovery states for Island Run landmark artwork.
 *
 * This intentionally consumes the canonical stop status without creating a
 * second progression authority. The result controls only fog, colour and
 * reveal styling in the board renderer.
 */
export type IslandRunLandmarkDiscoveryState = 'veiled' | 'emerging' | 'revealed' | 'restored';

export function resolveIslandRunLandmarkDiscoveryState(
  stopProgressState: string | null | undefined,
): IslandRunLandmarkDiscoveryState {
  switch (stopProgressState) {
    case 'completed':
      return 'restored';
    case 'ticket_required':
      return 'emerging';
    case 'locked':
    case 'pending':
      return 'veiled';
    default:
      return 'revealed';
  }
}

export function resolveIslandRunDiscoveryProgress(
  states: readonly IslandRunLandmarkDiscoveryState[],
): number {
  if (states.length === 0) return 1;

  const revealedWeight = states.reduce((total, state) => {
    if (state === 'restored') return total + 1;
    if (state === 'revealed') return total + 0.82;
    if (state === 'emerging') return total + 0.42;
    return total;
  }, 0);

  return Math.max(0, Math.min(1, revealedWeight / states.length));
}
