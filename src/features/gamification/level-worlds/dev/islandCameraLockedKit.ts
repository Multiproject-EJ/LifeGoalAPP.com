import islandKit from './camera-locked-kit-v1.json';

export const ISLAND_KIT_VERSION = islandKit.version;
export const ISLAND_KIT_SCENE = islandKit.scene;

export type IslandKitCheck = {
  id: string;
  label: string;
  passed: boolean;
  detail: string;
};

export function evaluateIslandKit(): IslandKitCheck[] {
  const scene = ISLAND_KIT_SCENE;
  const boardCenterX = scene.playableBoard.x + scene.playableBoard.width / 2;
  const boardCenterY = scene.playableBoard.y + scene.playableBoard.height / 2;
  const [topLeft, topRight, bottomLeft, bottomRight] = scene.satellites;
  const minSatelliteDiameter = Math.min(...scene.satellites.map((satellite) => satellite.rx * 2));
  const levelSizes = scene.landmarkEnvelope.levelSizes;

  return [
    {
      id: 'camera',
      label: 'Final camera only',
      passed: scene.finalAngleRatio === 0.73,
      detail: 'All generated ground is authored at the finished 0.73 ellipse ratio; runtime adds no second tilt.',
    },
    {
      id: 'center',
      label: 'Board is the anchor',
      passed: boardCenterX === scene.centerX && boardCenterY === scene.centerY,
      detail: `Board, tile ring and center island share (${scene.centerX}, ${scene.centerY}).`,
    },
    {
      id: 'symmetry',
      label: 'Satellites are mirrored',
      passed:
        topLeft.cx + topRight.cx === scene.width
        && bottomLeft.cx + bottomRight.cx === scene.width
        && topLeft.cy === topRight.cy
        && bottomLeft.cy === bottomRight.cy,
      detail: 'Left/right landmark foundations use one mirrored footprint contract.',
    },
    {
      id: 'capacity',
      label: 'L3 landmark capacity',
      passed: minSatelliteDiameter >= 550 && levelSizes[2] <= minSatelliteDiameter,
      detail: 'Each satellite is 550 units wide with a protected 480-unit L3 building footprint.',
    },
    {
      id: 'growth',
      label: 'Levels double exactly',
      passed: levelSizes[1] === levelSizes[0] * 2 && levelSizes[2] === levelSizes[1] * 2,
      detail: 'L2 is exactly 2× L1 and L3 is exactly 2× L2 in both width and height.',
    },
    {
      id: 'clearance',
      label: 'Tile ring stays clear',
      passed: scene.centerIsland.rx > scene.tileRing.rx && scene.centerIsland.ry > scene.tileRing.ry,
      detail: 'Generated terrain must remain beneath the ring; buildings and labels may not enter it.',
    },
  ];
}
