export type IslandRunAuthored3DWorldSource = 1 | 2 | 3 | 4 | 5;

export interface IslandRun3DWorldRoute {
  runtimeIslandNumber: number;
  worldSourceNumber: IslandRunAuthored3DWorldSource;
  role: 'ordinary' | 'arena';
}

/**
 * Authored visual-world routing for the first-five-island pilot.
 *
 * Runtime island numbers continue to own story, progression, rewards, arena
 * cadence, and persistence. `worldSourceNumber` selects only the authored 3D
 * geometry/material pack. Keeping the route explicit protects gameplay identity
 * while still allowing visual packs to be revised or reassigned independently.
 */
export const ISLAND_RUN_3D_WORLD_ROUTES: readonly IslandRun3DWorldRoute[] = [
  { runtimeIslandNumber: 1, worldSourceNumber: 1, role: 'ordinary' },
  { runtimeIslandNumber: 2, worldSourceNumber: 2, role: 'ordinary' },
  { runtimeIslandNumber: 3, worldSourceNumber: 3, role: 'ordinary' },
  { runtimeIslandNumber: 4, worldSourceNumber: 4, role: 'ordinary' },
  { runtimeIslandNumber: 5, worldSourceNumber: 5, role: 'arena' },
];

const ROUTES_BY_RUNTIME_ISLAND = new Map(
  ISLAND_RUN_3D_WORLD_ROUTES.map((route) => [route.runtimeIslandNumber, route]),
);

export function resolveIslandRun3DWorldRoute(runtimeIslandNumber: number): IslandRun3DWorldRoute | null {
  return ROUTES_BY_RUNTIME_ISLAND.get(runtimeIslandNumber) ?? null;
}
