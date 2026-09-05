export type IslandRunAuthored3DWorldSource = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 18 | 20 | 22;

export interface IslandRun3DWorldRoute {
  runtimeIslandNumber: number;
  worldSourceNumber: IslandRunAuthored3DWorldSource;
  role: 'ordinary' | 'arena';
}

/**
 * Authored visual-world routing for the current procedural-island batch.
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
  { runtimeIslandNumber: 6, worldSourceNumber: 6, role: 'ordinary' },
  { runtimeIslandNumber: 7, worldSourceNumber: 7, role: 'ordinary' },
  { runtimeIslandNumber: 8, worldSourceNumber: 8, role: 'ordinary' },
  { runtimeIslandNumber: 9, worldSourceNumber: 9, role: 'ordinary' },
  { runtimeIslandNumber: 10, worldSourceNumber: 10, role: 'arena' },
  // Island 011 intentionally preserves the pre-Assembly-Crater First Light
  // world. Source 011 is a dependency-based variant of source 001 rather than
  // a duplicate binary asset pack; the renderer keeps its original Sun Court.
  { runtimeIslandNumber: 11, worldSourceNumber: 11, role: 'ordinary' },
  { runtimeIslandNumber: 12, worldSourceNumber: 12, role: 'ordinary' },
  { runtimeIslandNumber: 13, worldSourceNumber: 13, role: 'ordinary' },
  { runtimeIslandNumber: 14, worldSourceNumber: 14, role: 'ordinary' },
  { runtimeIslandNumber: 18, worldSourceNumber: 18, role: 'ordinary' },
  // Eivind explicitly promoted the completed Fisherman's Village pack into
  // runtime Island 016. Source 022 remains an internal visual-pack identity;
  // runtime progression, story, persistence and PWA copy all use Island 016.
  { runtimeIslandNumber: 16, worldSourceNumber: 22, role: 'ordinary' },
  // The supplied concept image contains a baked Island 043 label, but runtime
  // Island 020 owns this authored Lava Labyrinth world and its Arena cadence.
  { runtimeIslandNumber: 20, worldSourceNumber: 20, role: 'arena' },
];

const ROUTES_BY_RUNTIME_ISLAND = new Map(
  ISLAND_RUN_3D_WORLD_ROUTES.map((route) => [route.runtimeIslandNumber, route]),
);

export function resolveIslandRun3DWorldRoute(runtimeIslandNumber: number): IslandRun3DWorldRoute | null {
  return ROUTES_BY_RUNTIME_ISLAND.get(runtimeIslandNumber) ?? null;
}
