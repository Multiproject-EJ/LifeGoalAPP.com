import * as THREE from 'three';
import {
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_5_LANDMARKS,
} from '../../dev/island5ThreePilotContract';
import {
  buildIsland10RootheartLandmark,
  collectIsland10RuntimePartManifest,
  createIsland10RootheartLivingAmbience,
  createIsland10RootheartMaterials,
  isIsland10RouteCorridorClear,
  ISLAND_10_RUNTIME_PART_IDS,
} from '../../dev/Island10RootheartThreeWorld';
import { assert, assertEqual, type TestCase } from './testHarness';

function disposeRoot(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.InstancedMesh)) return;
    object.geometry.dispose();
  });
}

function measureVisibleRuntime(roots: THREE.Object3D[]) {
  let drawCalls = 0;
  let triangles = 0;
  roots.forEach((root) => {
    root.updateMatrixWorld(true);
    root.traverse((object) => {
      let cursor: THREE.Object3D | null = object;
      while (cursor) {
        if (!cursor.visible) return;
        cursor = cursor.parent;
      }
      if (!(object instanceof THREE.Mesh || object instanceof THREE.InstancedMesh || object instanceof THREE.Points)) return;
      drawCalls += 1;
      const positionCount = object.geometry.attributes.position?.count ?? 0;
      const indexCount = object.geometry.index?.count ?? 0;
      const instanceCount = object instanceof THREE.InstancedMesh ? object.count : 1;
      triangles += Math.floor((indexCount || positionCount) / 3) * instanceCount;
    });
  });
  return { drawCalls, triangles };
}

export const island10RootheartThreeWorldContractTests: TestCase[] = [
  {
    name: 'authors five clickable Rootheart families with additive L1 L2 L3 silhouettes',
    run: () => {
      const materials = createIsland10RootheartMaterials();
      const l3Sizes: string[] = [];
      ISLAND_5_LANDMARKS.forEach((landmark) => {
        const levels = ([0, 1, 2, 3] as const).map((level) => {
          const root = buildIsland10RootheartLandmark(landmark, level, 'low', materials);
          assert(root.userData.sculptRuntime?.clickable, `${landmark.id} must remain clickable`);
          assert(Boolean(root.getObjectByName(`ISLAND_10_${landmark.id.toUpperCase()}_FOCUS_SOCKET`)), `${landmark.id} needs a focus socket`);
          if (landmark.id === 'boss') {
            const guardianSocket = root.getObjectByName('ISLAND_10_HIDDEN_GUARDIAN_SOCKET');
            assert(Boolean(guardianSocket), 'Rootheart Arena needs a named unresolved guardian socket');
            assertEqual(guardianSocket?.visible, false, 'unselected Island 010 guardian must stay hidden');
          }
          const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
          disposeRoot(root);
          return size;
        });
        if (landmark.id !== 'boss') {
          assert(levels[1].y > levels[0].y, `${landmark.id} L1 must rise above its empty platform`);
          assert(levels[3].y > levels[1].y, `${landmark.id} L3 must add a taller identity silhouette`);
          l3Sizes.push(`${levels[3].x.toFixed(2)}:${levels[3].y.toFixed(2)}:${levels[3].z.toFixed(2)}`);
        }
      });
      assertEqual(new Set(l3Sizes).size, 4, 'all four outer Rootheart L3 landmarks need distinct bounds');
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'keeps ambience outside the real tile corridor and exposes the complete canopy part manifest',
    run: () => {
      assert(isIsland10RouteCorridorClear(0, 0, 2.1), 'the low central arena remains safely inside the route');
      assert(!isIsland10RouteCorridorClear(3.4, 0, 0.12), 'the canonical route annulus is protected');
      assert(isIsland10RouteCorridorClear(5.0, 0, 0.3), 'exterior branch platforms remain outside the route');
      const materials = createIsland10RootheartMaterials();
      const scene = new THREE.Scene();
      const sharedWater = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
      const runtime = createIsland10RootheartLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials, sharedWater);
      runtime.animate(2.5);
      runtime.updateView?.(new THREE.Vector3(0, 10, 20), new THREE.Vector3());
      assertEqual(sharedWater.visible, false, 'Rootheart Canopy City must not inherit an ocean plane');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_THREE_TREE_FRAME')), 'three intact trunks must frame the suspended city');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_SUSPENDED_BOARD_UNDERFRAME')), 'the board needs a visible suspended support structure');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_LOW_OPEN_ROOTHEART_ARENA')), 'the low open arena must exist before its guardian is selected');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_BUILDER_NETWORK')), 'builder inhabitants must make the canopy city feel lived in');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_ROOTHEART_POWERWORKS')), 'the optional Powerworks engine must expose one named root');
      runtime.updatePowerworksStage?.({ buildStage: 3 });
      runtime.animate(7.25);
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_POWERWORKS_HEARTWHEEL_PIVOT')), 'the below-island heartwheel must be independently animated');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_POWERWORKS_SYNCHRONIZED_SLUICE_GATE_ARRAY')), 'the water load must use a named synchronized gate array');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_POWERWORKS_TRANSMISSION_ARRAY')), 'the counter-rotating transmission must remain a named assembly');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_POWERWORKS_COUNTER_GEAR')), 'the transmission needs a physically readable counter gear');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_POWERWORKS_HEARTLIGHT_DYNAMO')), 'the low central dynamo must remain a named assembly');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_10_POWERWORKS_TRAVELLING_POWER_PULSES')), 'the completed engine must distribute visible power pulses');
      const manifest = collectIsland10RuntimePartManifest([runtime.root]);
      const partNames = new Set(manifest.parts.map((part) => part.name));
      ['three-tree-frame', 'board-underframe', 'rootheart-arena', 'branch-support-network', 'builder-network'].forEach((part) => {
        assert(partNames.has(part as typeof ISLAND_10_RUNTIME_PART_IDS[number]), `manifest must include ${part}`);
      });
      assert(ISLAND_10_RUNTIME_PART_IDS.length >= 28, 'the selected dense city needs explicit named part coverage');
      disposeRoot(runtime.root);
      sharedWater.geometry.dispose();
      (sharedWater.material as THREE.Material).dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'keeps the complete Island 010 authored world inside the mobile scene budget',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const materials = createIsland10RootheartMaterials();
        const scene = new THREE.Scene();
        const sharedWater = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
        const ambience = createIsland10RootheartLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES[quality], materials, sharedWater);
        ambience.updatePowerworksStage?.({ buildStage: 3 });
        ambience.animate(7.25);
        const landmarks = ISLAND_5_LANDMARKS.map((landmark) => buildIsland10RootheartLandmark(landmark, 3, quality, materials));
        const measurement = measureVisibleRuntime([ambience.root, ...landmarks]);
        // The original 175-call ceiling covered the canopy city before its
        // optional signature engine existed. Stage 3 adds independently timed
        // wheel/gear/shaft/capacitor pivots; 200 is the explicit completed-world
        // ceiling after batching that subsystem from 60 calls down to 25.
        assert(measurement.drawCalls <= 200, `${quality} completed Island 010 artwork must stay at or below 200 authored draw calls (got ${measurement.drawCalls})`);
        assert(measurement.triangles < 180_000, `${quality} Island 010 artwork must stay below 180k authored triangles (got ${measurement.triangles})`);
        [ambience.root, ...landmarks].forEach(disposeRoot);
        sharedWater.geometry.dispose();
        (sharedWater.material as THREE.Material).dispose();
        Object.values(materials).forEach((material) => material.dispose());
      });
    },
  },
];
