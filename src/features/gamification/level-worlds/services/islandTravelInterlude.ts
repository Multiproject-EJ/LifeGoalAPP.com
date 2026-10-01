import { getIslandDisplayName } from './islandNames';
import { getVoyageEra, getVoyageIslandArt, getVoyageNodeX } from './islandVoyageMap';
import { DRIFT_VOYAGE_COMPLETION_CAPTION, isDriftVoyageCompletionTravel } from './islandRunDriftVoyage';

/**
 * Cozy ship-interior travel interlude (user request 2026-09-30): every trip
 * between islands cuts inside the expedition ship for a calm moment — lying
 * on the tree-house deck high in the Great Tree, or sitting with a cup of
 * coffee looking at the tree — while planets drift past the dome glass. A
 * route strip links the island you left to the one you are flying to.
 *
 * Presentation only: the canonical travel action runs underneath, unchanged.
 */
export type TravelInterludeVignette = 'treehouse-deck' | 'coffee-by-the-tree' | 'dome-stargazing';

export const TRAVEL_INTERLUDE_VIGNETTES: readonly TravelInterludeVignette[] = [
  'treehouse-deck',
  'coffee-by-the-tree',
  'dome-stargazing',
];

export const TRAVEL_INTERLUDE_DURATION_MS = 6500;
export const TRAVEL_INTERLUDE_REDUCED_MOTION_DURATION_MS = 3500;
/** Never let a stalled render hold travel hostage. */
export const TRAVEL_INTERLUDE_FALLBACK_MS = TRAVEL_INTERLUDE_DURATION_MS + 4000;

const VIGNETTE_CAPTIONS: Record<TravelInterludeVignette, readonly string[]> = {
  'treehouse-deck': [
    'Stretched out on the tree-house deck, watching worlds drift by.',
    'Up in the Great Tree, the stars feel close enough to touch.',
  ],
  'coffee-by-the-tree': [
    'A warm cup of coffee beneath the Great Tree. The next island can wait a moment.',
    'Coffee, quiet leaves, and planets sliding past the glass.',
  ],
  'dome-stargazing': [
    'The dome lights dim. Somewhere out there, the next island is waiting.',
    'Soft hum of the engines, slow turn of the stars.',
  ],
};

export interface TravelInterludeIsland {
  islandNumber: number;
  name: string;
  art: string;
  eraTint: string;
}

export interface TravelInterludePlan {
  vignette: TravelInterludeVignette;
  caption: string;
  durationMs: number;
  reducedMotion: boolean;
  from: TravelInterludeIsland;
  to: TravelInterludeIsland;
  /** Horizontal positions (percent) of the two route nodes, from the voyage map. */
  routeX: { from: number; to: number };
}

function describeIsland(islandNumber: number): TravelInterludeIsland {
  return {
    islandNumber,
    name: getIslandDisplayName(islandNumber),
    art: getVoyageIslandArt(islandNumber),
    eraTint: getVoyageEra(islandNumber).tint,
  };
}

/** Deterministic rotation so consecutive trips show different vignettes. */
export function resolveTravelInterludeVignette(toIslandNumber: number): TravelInterludeVignette {
  const index = ((Math.trunc(toIslandNumber) % TRAVEL_INTERLUDE_VIGNETTES.length) + TRAVEL_INTERLUDE_VIGNETTES.length)
    % TRAVEL_INTERLUDE_VIGNETTES.length;
  return TRAVEL_INTERLUDE_VIGNETTES[index]!;
}

export function resolveTravelInterludePlan(options: {
  fromIslandNumber: number;
  toIslandNumber: number;
  reducedMotion: boolean;
}): TravelInterludePlan {
  const vignette = resolveTravelInterludeVignette(options.toIslandNumber);
  const captions = VIGNETTE_CAPTIONS[vignette];
  const caption = isDriftVoyageCompletionTravel({ fromIslandNumber: options.fromIslandNumber, toIslandNumber: options.toIslandNumber })
    ? DRIFT_VOYAGE_COMPLETION_CAPTION
    : captions[Math.abs(Math.trunc(options.fromIslandNumber)) % captions.length]!;
  return {
    vignette,
    caption,
    durationMs: options.reducedMotion ? TRAVEL_INTERLUDE_REDUCED_MOTION_DURATION_MS : TRAVEL_INTERLUDE_DURATION_MS,
    reducedMotion: options.reducedMotion,
    from: describeIsland(options.fromIslandNumber),
    to: describeIsland(options.toIslandNumber),
    routeX: { from: getVoyageNodeX(options.fromIslandNumber), to: getVoyageNodeX(options.toIslandNumber) },
  };
}

/** Ship marker progress along the route strip (eased, 0..1). */
export function resolveTravelInterludeRouteProgress(elapsedMs: number, durationMs: number): number {
  if (durationMs <= 0) return 1;
  const t = Math.min(1, Math.max(0, elapsedMs / durationMs));
  return t * t * (3 - 2 * t);
}
