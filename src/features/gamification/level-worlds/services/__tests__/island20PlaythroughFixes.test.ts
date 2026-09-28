import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import {
  carveIsland20AuthoredCityRouteCorridor,
  ISLAND_20_AUTHORED_CITY_GLB,
  ISLAND_20_AUTHORED_CITY_SCALE,
  ISLAND_20_ROUTE_CLEARANCE_INNER_RADIUS,
  ISLAND_20_ROUTE_CLEARANCE_OUTER_RADIUS,
} from '../../dev/Island20LavaLabyrinthThreeWorld';
import { assert, type TestCase } from './testHarness';

async function readSource(path: string): Promise<string> {
  // @ts-ignore Node test runner provides fs.
  const fs = await import('fs');
  return fs.readFileSync(path, 'utf8');
}

async function loadAuthoredCity(): Promise<THREE.Group> {
  // @ts-ignore Node test runner provides fs.
  const fs = await import('fs');
  const buffer: Uint8Array = fs.readFileSync(`public${ISLAND_20_AUTHORED_CITY_GLB}`);
  const data = buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
  const gltf = await new Promise<{ scene: THREE.Group }>((resolve, reject) => {
    new GLTFLoader().parse(data, '', resolve, reject);
  });
  gltf.scene.scale.setScalar(ISLAND_20_AUTHORED_CITY_SCALE);
  return gltf.scene;
}

function countTrianglesTouchingCorridor(root: THREE.Object3D): { touching: number; total: number } {
  root.updateMatrixWorld(true);
  const vertex = new THREE.Vector3();
  let touching = 0;
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const position = object.geometry.getAttribute('position');
    const index = object.geometry.getIndex();
    const count = index ? index.count / 3 : position.count / 3;
    for (let t = 0; t < count; t += 1) {
      const radii = [0, 1, 2].map((corner) => {
        const i = index ? index.getX(t * 3 + corner) : t * 3 + corner;
        vertex.fromBufferAttribute(position, i).applyMatrix4(object.matrixWorld);
        return Math.hypot(vertex.x, vertex.z);
      });
      total += 1;
      if (Math.max(...radii) > ISLAND_20_ROUTE_CLEARANCE_INNER_RADIUS
        && Math.min(...radii) < ISLAND_20_ROUTE_CLEARANCE_OUTER_RADIUS) touching += 1;
    }
  });
  return { touching, total };
}

export const island20PlaythroughFixesTests: TestCase[] = [
  {
    name: 'the authored lava canal shader declares the uniforms its vertex stage animates with',
    run: async () => {
      const source = await readSource('src/features/gamification/level-worlds/dev/Island20LavaLabyrinthThreeWorld.ts');
      const vertexShaders = source.split('vertexShader: `').slice(1).map((chunk) => chunk.slice(0, chunk.indexOf('`')));
      assert(vertexShaders.length >= 3, 'the Island 020 world authors its own vertex shaders');
      vertexShaders.forEach((shader, index) => {
        ['uElapsed', 'uThermalPulse', 'uMotionMix'].forEach((uniform) => {
          if (!new RegExp(`\\b${uniform}\\b`).test(shader.replace(/uniform float \w+;/g, ''))) return;
          assert(shader.includes(`uniform float ${uniform};`), `vertex shader ${index + 1} uses ${uniform} without declaring it (the lava canals failed to compile)`);
        });
      });
    },
  },
  {
    name: 'the authored lava city leaves the circular tile board readable',
    run: async () => {
      const city = await loadAuthoredCity();
      const before = countTrianglesTouchingCorridor(city);
      assert(before.touching > 1000, `the raw GLB covers the tile ring (${before.touching} triangles)`);
      const removed = carveIsland20AuthoredCityRouteCorridor(city);
      const after = countTrianglesTouchingCorridor(city);
      assert(removed === before.touching, 'every triangle over the ring is carved away');
      assert(after.touching === 0, `no city geometry remains on the tile ring (${after.touching})`);
      assert(after.total > before.total * 0.4, `the labyrinth city itself survives (${after.total}/${before.total})`);
      const loaderSource = await readSource('src/features/gamification/level-worlds/dev/Island20LavaLabyrinthThreeWorld.ts');
      assert(loaderSource.includes('carveIsland20AuthoredCityRouteCorridor(authoredRoot);\n  return authoredRoot;'), 'the runtime loader carves the corridor');
    },
  },
  {
    name: 'the mission phone can never be stranded folded with every button disabled',
    run: async () => {
      const modal = await readSource('src/features/gamification/level-worlds/components/IslandMissionBriefingModal.tsx');
      assert(modal.includes("if (isOpenRef.current && phaseRef.current === 'folding') updatePhase('unfolding');"), 'a fold that leaves the phone open unfolds it again');
      const board = await readSource('src/features/gamification/level-worlds/components/IslandRunBoardPrototype.tsx');
      assert(!board.includes('if (stagedRestorationDescriptor) setShowMissionPhoneBriefing(true);'), 'the staged mission row no longer closes and reopens the phone in one batch');
      assert(board.includes("if (objectiveIndex === 0 && [1, 3, 10, 13].includes(islandNumber)) return 'launch';"), 'staged mission rows show their details instead of folding the phone');
    },
  },
  {
    name: 'the labyrinth objective says what is missing instead of a flat 0 / 5',
    run: async () => {
      const objectives = await readSource('src/features/gamification/level-worlds/services/islandRunMissionObjectives.ts');
      assert(objectives.includes('`${landmarkProgress.objectivesComplete} / ${landmarkCount} activities`'), 'built landmarks with open activities are named');
      assert(objectives.includes('`${landmarkProgress.buildsComplete} / ${landmarkCount} built`'), 'unbuilt landmarks are named');
    },
  },
];
