export type IslandRunBuildOpenDisposition = 'open_now' | 'queue_until_landed';

export interface ResolveIslandRunBuildOpenDispositionOptions {
  isRolling: boolean;
  hasPendingHopSequence: boolean;
  isAnimatingHop: boolean;
}

/**
 * Build is a presentation surface, so this resolver never mutates gameplay.
 * It only prevents Build from interrupting the canonical roll/hop/land chain.
 */
export function resolveIslandRunBuildOpenDisposition(
  options: ResolveIslandRunBuildOpenDispositionOptions,
): IslandRunBuildOpenDisposition {
  return options.isRolling || options.hasPendingHopSequence || options.isAnimatingHop
    ? 'queue_until_landed'
    : 'open_now';
}
