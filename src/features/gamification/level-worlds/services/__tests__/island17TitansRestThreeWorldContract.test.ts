import * as THREE from 'three';
import {
  ISLAND_3D_QUALITY_PROFILES,
  ISLAND_5_LANDMARKS,
} from '../../dev/island5ThreePilotContract';
import {
  buildIsland17TitansRestLandmark,
  collectIsland17RuntimePartManifest,
  compactIsland17StaticGeometry,
  createIsland17TitansRestLivingAmbience,
  createIsland17TitansRestMaterials,
  isIsland17RouteCorridorClear,
  ISLAND_17_RUNTIME_PART_IDS,
} from '../../dev/Island17TitansRestThreeWorld';
import { assert, assertEqual, type TestCase } from './testHarness';
import { createTitanSpineRestoration, getTitanSpinePartStage } from '../../dev/Island17SpineRestoration';

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

export const island17TitansRestThreeWorldContractTests: TestCase[] = [
  {
    name: 'island batching retains authored texture coordinates and maps custom geometry',
    run: () => {
      const root = new THREE.Group();
      const material = new THREE.MeshStandardMaterial();
      const authored = new THREE.BoxGeometry(1, 1, 1).toNonIndexed();
      const originalUV = Array.from(authored.getAttribute('uv').array);
      const custom = new THREE.BoxGeometry(1, 1, 1);
      custom.deleteAttribute('uv');
      const first = new THREE.Mesh(authored, material);
      const second = new THREE.Mesh(custom, material);
      second.position.x = 2;
      root.add(first, second);
      compactIsland17StaticGeometry(root, 'TEXTURE_TEST');
      assertEqual(root.children.length, 1, 'compatible textured meshes still batch');
      const merged = root.children[0] as THREE.Mesh;
      const uv = merged.geometry.getAttribute('uv');
      assertEqual(uv.count, merged.geometry.getAttribute('position').count, 'all vertices have UVs');
      assert(originalUV.every((value, index) => uv.array[index] === value), 'authored UVs remain unchanged');
      assert(Array.from(uv.array).every(Number.isFinite), 'generated coordinates are finite');
      disposeRoot(root);
      material.dispose();
    },
  },
  {
    name: 'spine restoration preserves saved sections, animates only new bones and freezes reduced motion',
    run: () => {
      const root = new THREE.Group();
      const model = new THREE.Group();
      root.add(model);
      const material = new THREE.MeshStandardMaterial();
      for (let index = 1; index <= 8; index += 1) {
        const node = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), material);
        node.name = `ISLAND_17_RIB_BRIDGE_RAISED_VERTEBRA_${index}`;
        node.position.z = 9 - index * 0.5;
        model.add(node);
      }
      const rig = createTitanSpineRestoration(root);
      rig.bind(model);
      const sections = () => model.children.filter(node => node.userData.restorationStage && node.visible);
      rig.update({ islandNumber: 17, activatedStages: 4, stageCount: 8 }, true);
      assertEqual(sections().length, 4, 'saved state restores four sections immediately');
      assertEqual(rig.animate(10, false).burst, 0, 'hydration does not replay celebration');
      rig.update({ islandNumber: 17, activatedStages: 5, stageCount: 8 });
      rig.animate(10.6, false);
      assertEqual(sections().length, 5, 'only one new section appears');
      const fifth = model.children.find(node => node.userData.restorationStage === 5)!;
      assert(fifth.position.y < -0.1, 'new section rises from below its final position');
      assert(sections().slice(0, 4).every(node => node.position.y === 0), 'existing sections stay still');
      rig.animate(11, true);
      assertEqual(fifth.position.y, 0, 'reduced motion settles immediately');
      rig.animate(20, false);
      rig.update({ islandNumber: 17, activatedStages: 8, stageCount: 8, constructionSequence: 1 });
      assert(rig.animate(22.5, false).finale, 'last repair triggers finale');
      assert(!rig.animate(30, false).finale, 'finale ends instead of looping forever');
      rig.update({ islandNumber: 17, activatedStages: 8, stageCount: 8, constructionSequence: 2 });
      assert(rig.animate(32.5, false).finale, 'presentation replay can repeat finale');
      assertEqual(getTitanSpinePartStage('TitanBridge_Rib_10_L'), 7, 'sculpt final rib belongs to eighth section');
      assertEqual(getTitanSpinePartStage('TitanBridge_CalcifiedStep_28'), 7, 'last step shares final section');
      disposeRoot(root);
      material.dispose();
    },
  },
  {
    name: 'authors five clickable Titan Rest landmark families with distinct L3 silhouettes',
    run: () => {
      const materials = createIsland17TitansRestMaterials();
      const l3Sizes: string[] = [];
      ISLAND_5_LANDMARKS.forEach((landmark) => {
        const levels = ([0, 1, 2, 3] as const).map((level) => {
          const root = buildIsland17TitansRestLandmark(landmark, level, 'low', materials);
          assert(root.userData.sculptRuntime?.clickable, `${landmark.id} must remain clickable`);
          assert(Boolean(root.getObjectByName(`ISLAND_17_${landmark.id.toUpperCase()}_FOCUS_SOCKET`)), `${landmark.id} needs a focus socket`);
          const size = new THREE.Box3().setFromObject(root).getSize(new THREE.Vector3());
          disposeRoot(root);
          return size;
        });
        if (landmark.id !== 'boss') {
          assert(levels[1].y > levels[0].y, `${landmark.id} L1 must rise above its empty platform`);
          assert(levels[3].y > levels[1].y, `${landmark.id} L3 must add a stronger silhouette`);
          l3Sizes.push(`${levels[3].x.toFixed(2)}:${levels[3].y.toFixed(2)}:${levels[3].z.toFixed(2)}`);
        }
      });
      assertEqual(new Set(l3Sizes).size, 4, 'all four outer Titan Rest L3 landmarks need distinct bounds');
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'exposes skull, rib bridge, soulfire, waterfall and landmark runtime parts',
    run: () => {
      assert(isIsland17RouteCorridorClear(0, 0, 2.1), 'the central skull and pit remain inside the protected route');
      assert(!isIsland17RouteCorridorClear(3.4, 0, 0.12), 'the canonical route annulus remains protected');
      assert(isIsland17RouteCorridorClear(5.0, 0, 0.3), 'bone ruins and edge scenery remain outside the route');
      const materials = createIsland17TitansRestMaterials();
      const scene = new THREE.Scene();
      const sharedWater = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
      const runtime = createIsland17TitansRestLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES.low, materials, sharedWater);
      runtime.animate(4.5);
      runtime.updateView?.(new THREE.Vector3(0, 10, 20), new THREE.Vector3());
      assertEqual(sharedWater.visible, false, "Titan's Rest must not inherit an ocean plane");
      assert(Boolean(runtime.root.getObjectByName('ISLAND_17_FLOATING_CLIFF')), 'the floating cliff must be a named macro terrain part');
      runtime.root.updateMatrixWorld(true);
      const cliff = runtime.root.getObjectByName('ISLAND_17_FLOATING_CLIFF')!;
      const pitRay = new THREE.Raycaster(new THREE.Vector3(0, 2, 0), new THREE.Vector3(0, -1, 0), 0, 2.8);
      assertEqual(pitRay.intersectObject(cliff, true).length, 0, 'cliff caps must not seal the recessed soulfire pit');
      const cliffCrags = runtime.root.getObjectByName('ISLAND_17_LAYERED_BASALT_CLIFF_FACE_CRAGS');
      assert(cliffCrags instanceof THREE.InstancedMesh, 'the cliff face needs layered faceted crags instead of one smooth under-island cone');
      assert((cliffCrags as THREE.InstancedMesh).count >= 44, 'Low quality must keep enough cliff crags for the floating-island silhouette to read');
      const mossShelves = runtime.root.getObjectByName('ISLAND_17_CLIFF_FACE_MOSSY_BROKEN_SHELVES');
      assert(mossShelves instanceof THREE.InstancedMesh, 'the layered cliff face needs broken moss shelves for material and depth breakup');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_17_CENTRAL_SOULFIRE_PIT')), 'the central soulfire pit must be visible before landmark detail');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_17_RIB_BRIDGE_SPINE')), 'the rib bridge mission object must be present in the blockout');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_17_CHAIN_WATERFALL_DEPTH')), 'hanging chains and waterfalls are part of the death-island silhouette');
      const readableChainLinks = runtime.root.getObjectByName('ISLAND_17_READABLE_ALTERNATING_CHAIN_LINK_INSTANCES');
      assert(readableChainLinks instanceof THREE.InstancedMesh, 'hanging chain curtains need readable alternating links instead of rod-only placeholders');
      assert((readableChainLinks as THREE.InstancedMesh).count >= 100, 'even low quality must preserve enough linked-chain rhythm to read at phone scale');
      const stormCloud = runtime.root.getObjectByName('ISLAND_17_STORM_CLOUD_1');
      assert(stormCloud instanceof THREE.InstancedMesh, 'storm silhouettes need clustered cloud volumes instead of single flattened spheres');
      assertEqual((stormCloud as THREE.InstancedMesh).count, 5, 'each storm silhouette should preserve a five-lobe authored profile');
      const ribMission = runtime.root.getObjectByName('ISLAND_17_RIB_BRIDGE_SPINE');
      for (let angle = 0; angle < 360; angle += 45) {
        const radians = angle * Math.PI / 180;
        runtime.updateView?.(new THREE.Vector3(Math.sin(radians) * 18, 8, Math.cos(radians) * 18), new THREE.Vector3());
        assert(ribMission?.visible, `mission bridge remains visible at orbit ${angle}`);
      }
      const missionLayers = ribMission?.userData.missionAnimation?.layers;
      assert(Array.isArray(missionLayers) && missionLayers.length >= 3, 'the rib mission must combine a pulse wave, soul current, and chain response');
      const travellingSoulCurrent = runtime.root.getObjectByName('ISLAND_17_RIB_MISSION_TRAVELLING_SOUL_CURRENT');
      assert(travellingSoulCurrent instanceof THREE.InstancedMesh, 'the mission needs a staged travelling soul-current layer');
      assert((travellingSoulCurrent as THREE.InstancedMesh).count >= 8, 'the low-quality mission current must remain continuous enough to read');
      const commissionHalos = runtime.root.getObjectByName('ISLAND_17_RIB_MISSION_COMMISSION_SHOCK_HALOS');
      assert(commissionHalos instanceof THREE.InstancedMesh, 'the mission needs a distinct commissioning shock-halo climax');
      assertEqual((commissionHalos as THREE.InstancedMesh).count, 2, 'the commissioning climax should preserve two readable shock rings');
      const commissionBurst = runtime.root.getObjectByName('ISLAND_17_RIB_MISSION_COMMISSION_CROWN_BURST');
      assert(commissionBurst instanceof THREE.InstancedMesh, 'the commissioning climax needs an eight-shard crown burst');
      assertEqual((commissionBurst as THREE.InstancedMesh).count, 8, 'the commissioning crown burst must keep its full radial rhythm');
      assert(Boolean(runtime.root.getObjectByName('ISLAND_17_BONE_RUIN_CITY')), 'bone ruin density must exist outside the route corridor');
      const manifest = collectIsland17RuntimePartManifest([runtime.root]);
      const partNames = new Set(manifest.parts.map((part) => part.name));
      ['floating-cliff', 'central-soulfire-pit', 'rib-bridge-spine', 'chain-waterfall-depth', 'bone-ruin-city', 'soulfire-network'].forEach((part) => {
        assert(partNames.has(part as typeof ISLAND_17_RUNTIME_PART_IDS[number]), `manifest must include ${part}`);
      });
      assert(ISLAND_17_RUNTIME_PART_IDS.length >= 16, 'the selected Titan world needs explicit named part coverage');
      disposeRoot(runtime.root);
      sharedWater.geometry.dispose();
      (sharedWater.material as THREE.Material).dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
  },
  {
    name: 'keeps the first Island 017 blockout inside the mobile scene budget',
    run: () => {
      (['low', 'medium', 'high'] as const).forEach((quality) => {
        const materials = createIsland17TitansRestMaterials();
        const scene = new THREE.Scene();
        const sharedWater = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial());
        const ambience = createIsland17TitansRestLivingAmbience(scene, ISLAND_3D_QUALITY_PROFILES[quality], materials, sharedWater);
        ambience.updateStagedRestoration({ islandNumber: 17, activatedStages: 8, stageCount: 8 }, true);
        ambience.animate(7.25);
        const landmarks = ISLAND_5_LANDMARKS.map((landmark) => buildIsland17TitansRestLandmark(landmark, 3, quality, materials));
        const measurement = measureVisibleRuntime([ambience.root, ...landmarks]);
        const drawCallBreakdown = [
          `ambience=${measureVisibleRuntime([ambience.root]).drawCalls}`,
          ...ISLAND_5_LANDMARKS.map((landmark, index) => `${landmark.id}=${measureVisibleRuntime([landmarks[index]]).drawCalls}`),
        ].join(', ');
        const ambienceBreakdown = ambience.root.children
          .map((child) => `${child.name || child.type}=${measureVisibleRuntime([child]).drawCalls}`)
          .join(', ');
        assert(measurement.drawCalls <= 190, `${quality} Island 017 blockout must stay at or below 190 authored draw calls (got ${measurement.drawCalls}; ${drawCallBreakdown}; ${ambienceBreakdown})`);
        assert(measurement.triangles < 180_000, `${quality} Island 017 blockout must stay below 180k authored triangles (got ${measurement.triangles})`);
        [ambience.root, ...landmarks].forEach(disposeRoot);
        sharedWater.geometry.dispose();
        (sharedWater.material as THREE.Material).dispose();
        Object.values(materials).forEach((material) => material.dispose());
      });
    },
  },
];
