// Island 040 is an explicit stand-in (a visual copy of source 004), not the Cosmic Outpost production pack.
export type IslandRunAuthored3DWorldSource = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14 | 15 | 17 | 18 | 19 | 20 | 22 | 40;

export interface IslandRun3DWorldRoute {
  runtimeIslandNumber: number;
  worldSourceNumber: IslandRunAuthored3DWorldSource;
  role: 'ordinary' | 'arena';
  presentationStatus?: 'placeholder';
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
  // Eivind moved Fisherman's Village (source 022) forward to runtime Island 006
  // so it comes right before the underwater Island 007; Moonveil Nexus
  // (source 006) moved to runtime Island 016. Both are Disc Arena cadence islands.
  { runtimeIslandNumber: 6, worldSourceNumber: 22, role: 'ordinary' },
  { runtimeIslandNumber: 7, worldSourceNumber: 7, role: 'ordinary' },
  // The Living Compass is now the Island 008 revelation. Source numbers remain
  // stable authored-pack identities, while runtime numbers own progression.
  { runtimeIslandNumber: 8, worldSourceNumber: 18, role: 'ordinary' },
  { runtimeIslandNumber: 9, worldSourceNumber: 9, role: 'ordinary' },
  { runtimeIslandNumber: 10, worldSourceNumber: 10, role: 'arena' },
  // Island 011 intentionally preserves the pre-Assembly-Crater First Light
  // world. Source 011 is a dependency-based variant of source 001 rather than
  // a duplicate binary asset pack; the renderer keeps its original Sun Court.
  { runtimeIslandNumber: 11, worldSourceNumber: 11, role: 'ordinary' },
  { runtimeIslandNumber: 12, worldSourceNumber: 12, role: 'ordinary' },
  { runtimeIslandNumber: 13, worldSourceNumber: 13, role: 'ordinary' },
  { runtimeIslandNumber: 14, worldSourceNumber: 14, role: 'ordinary' },
  { runtimeIslandNumber: 18, worldSourceNumber: 8, role: 'ordinary' },
  { runtimeIslandNumber: 19, worldSourceNumber: 19, role: 'ordinary' },
  // Moonveil Nexus now plays at runtime Island 016 (swapped with Fisherman's Village).
  { runtimeIslandNumber: 16, worldSourceNumber: 6, role: 'ordinary' },
  // The supplied concept image contains a baked Island 043 label, but runtime
  // Island 020 owns this authored Lava Labyrinth world and its Arena cadence.
  { runtimeIslandNumber: 20, worldSourceNumber: 20, role: 'arena' },
  {
    runtimeIslandNumber: 15,
    worldSourceNumber: 15,
    // Approved Frozen Throne mission exception: this is an ordinary Boss world.
    // Its palace is authored procedurally by Island5ThreePilot; there is no GLB route.
    role: 'ordinary',
  },
  // The Titan's Rest source image is baked with an ISLAND 016 label, but
  // Eivind reassigned that death/Titan world to runtime Island 017 so runtime
  // Island 016 can remain Fisherman's Village.
  { runtimeIslandNumber: 17, worldSourceNumber: 17, role: 'ordinary' },
  // Island 040 reuses the Crown Citadel look (source 004, what new-campaign
  // players see on Island 002) instead of the temporary placeholder pack.
  // Visual only: Island 040 keeps its own story, missions and Arena cadence.
  { runtimeIslandNumber: 40, worldSourceNumber: 4, role: 'arena', presentationStatus: 'placeholder' },
];

const ROUTES_BY_RUNTIME_ISLAND = new Map(
  ISLAND_RUN_3D_WORLD_ROUTES.map((route) => [route.runtimeIslandNumber, route]),
);

export function resolveIslandRun3DWorldRoute(runtimeIslandNumber: number): IslandRun3DWorldRoute | null {
  return ROUTES_BY_RUNTIME_ISLAND.get(runtimeIslandNumber) ?? null;
}
