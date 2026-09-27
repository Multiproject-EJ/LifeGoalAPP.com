/**
 * Explore points: small pulsing energy dots on an island that are not tasks.
 * Tapping one flies the camera to a fun point of view with a caption, and
 * Back returns to the island. Presentation only; never touches gameplay.
 */
export type IslandExplorePointId = 'island1-waterfall' | 'island1-assembly-hall';

export interface IslandExplorePoint {
  id: IslandExplorePointId;
  label: string;
  blurb: string;
  /** Where the energy dot floats (scene space). */
  anchor: readonly [number, number, number];
  camera: {
    position: readonly [number, number, number];
    target: readonly [number, number, number];
    fov: number;
  };
  /** Show the finished-Assembly subterranean cutaway while viewing. */
  assemblyCutaway?: boolean;
}

export interface IslandExploreContext {
  /** Island 001 Assembly is built (crater mission complete). */
  assemblyComplete: boolean;
}

const ISLAND_1_WATERFALL: IslandExplorePoint = {
  id: 'island1-waterfall',
  label: 'Waterfall Overlook',
  blurb: 'Where the spring spills off First Light Shore into the sea.',
  anchor: [0.9, 0.9, 6.3],
  camera: { position: [0, 0.4, 15.2], target: [0, -0.7, 6.6], fov: 44 },
};

const ISLAND_1_ASSEMBLY_HALL: IslandExplorePoint = {
  id: 'island1-assembly-hall',
  label: 'Inside the Assembly',
  blurb: 'The peacekeeping Assembly hall you built beneath the island.',
  anchor: [0, 1.25, 0],
  camera: { position: [0, -0.55, 6.6], target: [0, -2.25, -0.6], fov: 62 },
  assemblyCutaway: true,
};

export function getIslandExplorePoints(
  islandNumber: number,
  context: IslandExploreContext,
): IslandExplorePoint[] {
  if (islandNumber === 1) {
    return context.assemblyComplete
      ? [ISLAND_1_WATERFALL, ISLAND_1_ASSEMBLY_HALL]
      : [ISLAND_1_WATERFALL];
  }
  return [];
}
