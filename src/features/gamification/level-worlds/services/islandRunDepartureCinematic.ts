/**
 * Island departure cinematic timeline (Island Complete, part B). Pure data so
 * the board, the 3D scene and tests agree on the beats. Presentation only: the
 * cinematic never writes gameplay state; travel runs after it completes.
 */
export const ISLAND_DEPARTURE_DURATION = 7.4;

export type IslandDepartureShot = 'zoom-to-ship' | 'travel-mode' | 'ground-takeoff' | 'side-flight';

export const ISLAND_DEPARTURE_BEATS: ReadonlyArray<{ shot: IslandDepartureShot; start: number; end: number }> = [
  { shot: 'zoom-to-ship', start: 0, end: 1.6 },
  { shot: 'travel-mode', start: 1.6, end: 3.2 },
  { shot: 'ground-takeoff', start: 3.2, end: 5.2 },
  { shot: 'side-flight', start: 5.2, end: ISLAND_DEPARTURE_DURATION },
];

export function resolveIslandDepartureShot(timeSeconds: number): IslandDepartureShot {
  const beat = ISLAND_DEPARTURE_BEATS.find((entry) => timeSeconds < entry.end);
  return beat?.shot ?? 'side-flight';
}

/** The board waits this long for the scene before travelling anyway. */
export const ISLAND_DEPARTURE_FALLBACK_MS = Math.round(ISLAND_DEPARTURE_DURATION * 1000) + 2500;

/** The cinematic needs the 3D island; reduced motion goes straight to travel. */
export function shouldPlayIslandDepartureCinematic(options: { hasThreeScene: boolean; reducedMotion: boolean }): boolean {
  return options.hasThreeScene && !options.reducedMotion;
}
