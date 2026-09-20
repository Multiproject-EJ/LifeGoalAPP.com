export type LandmarkAttention = 'none' | 'soft' | 'blue';

/** Presentation only: activity completion and eligibility remain canonical. */
export function resolveLandmarkAttention(input: {
  id: string; level: number; complete: boolean; allBuilt: boolean; actionable: boolean;
}): LandmarkAttention {
  if (input.complete && input.level >= 3) return 'none';
  if (input.id === 'hatchery') return input.allBuilt && input.actionable ? 'blue' : 'none';
  return input.level >= 3 && input.actionable ? 'blue' : 'soft';
}
