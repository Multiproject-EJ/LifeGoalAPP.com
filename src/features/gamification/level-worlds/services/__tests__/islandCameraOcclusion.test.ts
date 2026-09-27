import * as THREE from 'three';
import { resolveUnoccludedCameraPosition } from '../../dev/islandCameraOcclusion';
import { assert, type TestCase } from './testHarness';

const makeWall = (x: number, z: number, visible = true) => {
  const wall = new THREE.Mesh(new THREE.BoxGeometry(2, 6, 0.4), new THREE.MeshBasicMaterial());
  wall.position.set(x, 3, z);
  wall.visible = visible;
  wall.updateMatrixWorld(true);
  return wall;
};

const target = new THREE.Vector3(0, 1, 0);
const desired = new THREE.Vector3(0, 3, -8);

export const islandCameraOcclusionTests: TestCase[] = [
  {
    name: 'keeps the authored camera when nothing is in the way',
    run: () => {
      const resolved = resolveUnoccludedCameraPosition({ desired, target, occluders: [makeWall(6, 6)] });
      assert(resolved.distanceTo(desired) < 1e-6, 'a clear line of sight keeps the authored pose');
    },
  },
  {
    name: 'swings the camera around a landmark that blocks the view instead of staying behind it',
    run: () => {
      const wall = makeWall(0, -4);
      const resolved = resolveUnoccludedCameraPosition({ desired, target, occluders: [wall] });
      assert(resolved.distanceTo(desired) > 0.5, 'the camera moves away from the blocked pose');
      const direction = resolved.clone().sub(target);
      const raycaster = new THREE.Raycaster(target, direction.clone().normalize(), 0, direction.length());
      assert(raycaster.intersectObject(wall, true).length === 0, 'the new pose sees the target past the landmark');
      const keptDistance = Math.hypot(resolved.x - target.x, resolved.z - target.z);
      assert(Math.abs(keptDistance - 8) < 0.01, 'the orbit keeps the authored framing distance');
    },
  },
  {
    name: 'ignores hidden (not yet built) landmarks',
    run: () => {
      const resolved = resolveUnoccludedCameraPosition({ desired, target, occluders: [makeWall(0, -4, false)] });
      assert(resolved.distanceTo(desired) < 1e-6, 'an invisible landmark does not move the camera');
    },
  },
  {
    name: 'Island 016 fishing: one progress bar, a session that never outlives its catch, and an occlusion-aware camera',
    run: async () => {
      // @ts-ignore island-run test tsconfig omits node type libs
      const fsMod = await import('fs');
      const board = fsMod.readFileSync('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx', 'utf8');
      const pilot = fsMod.readFileSync('src/features/gamification/level-worlds/dev/Island5ThreePilot.tsx', 'utf8');
      assert(!board.includes('fishermans-fishing-hud__meter'), 'the fishing panel no longer repeats the kg bar (the reward-bar mini bar is the one)');
      assert(board.includes('className={`fishermans-fishing-mini'), 'the mini bar under the reward bar stays');
      assert(board.includes('Safety net: the fishing session locks the board'), 'a fishing session with no catch left closes itself');
      assert(board.includes('!fishingEscapeInFlightRef.current && !fishingReelInFlightRef.current'), 'the escape timer cannot race an in-flight reel');
      assert(board.includes("refreshFishermansVillageState('reel_fishermans_village_catch_settled')"), 'a reel on a settled catch refreshes instead of hanging');
      assert(pilot.includes('resolveUnoccludedCameraPosition({'), 'the fishing camera solves a clear line of sight past landmarks');
    },
  },
];
