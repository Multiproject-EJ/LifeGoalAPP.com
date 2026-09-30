import * as THREE from 'three';
import { createIsland7DeepSeaLifeV2 } from './Island7DeepSeaLifeV2';
import { applyIsland7RockSurfaceV2 } from './Island7RockSurfaceV2';
import { createIsland7WaterAtmosphereV2 } from './Island7WaterAtmosphereV2';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Island3DQuality } from './island5ThreePilotContract';
import { disposeIsland7Reef } from './Island7AuthoredReef';
import { createIsland7ArchiveReefGardenV2 } from './Island7ArchiveReefGardenV2';
import { createIsland7ReefGardenV2 } from './Island7ReefGardenV2';
import { createIsland7FusedReefTerraces } from './Island7FusedReefTerraces';

export interface Island7EnvironmentV2 {
  root: THREE.Group;
  ready: Promise<void>;
  setNight: (amount: number) => void;
  animate: (elapsed: number) => void;
  dispose: () => void;
}

/** Authored terrain assembly built from the independently approved reef macro.
 * No gameplay state or camera ownership lives here. */
export function createIsland7UnderwaterEnvironmentV2(options: {
  quality: Island3DQuality;
  clay?: boolean;
  neutral?: boolean;
}): Island7EnvironmentV2 {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_V2_ENVIRONMENT_ROOT';
  root.userData.presentationOnly = true;
  root.userData.representationFamily = 'reusable-unapproved-fused-reef-terraces-v002';
  root.userData.activeReviewScope = 'parked-unapproved-terrain-context';
  root.userData.backgroundRepresentation = 'world-space-geometry';
  root.userData.status = 'loading';
  root.userData.environmentBudget = { triangles: 0, drawCalls: 0 };
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  const materials: Array<{ material: THREE.MeshStandardMaterial; day: THREE.Color }> = [];
  let garden: ReturnType<typeof createIsland7ReefGardenV2> | null = null;
  let archiveGarden: ReturnType<typeof createIsland7ArchiveReefGardenV2> | null = null;
  let atmosphere: ReturnType<typeof createIsland7WaterAtmosphereV2> | null = null;
  let deepLife: ReturnType<typeof createIsland7DeepSeaLifeV2> | null = null;
  const reefLights: THREE.PointLight[] = [];
  let night = 0, disposed = false;
  const applyNight = () => {
    for (const { material, day } of materials) {
      material.color.copy(day).multiplyScalar(1 - night * 0.08);
      if (material.userData.island7Daylight) material.userData.island7Daylight.value = 1 - night;
    }
    garden?.setNight(night); archiveGarden?.setNight(night); atmosphere?.setNight(night); deepLife?.setNight(night);
    reefLights.forEach((light, index) => { light.intensity = night * (index === 1 ? 7 : index < 3 ? 12 : 3.5); });
    root.userData.nightMix = night;
  };
  const ready = createIsland7FusedReefTerraces(options.quality, controller.signal).then(shelf => {
    if (disposed) { disposeIsland7Reef(shelf); return; }
    const seenMaterials = new Set<THREE.Material>();
    const diagnostic = options.clay ? new THREE.MeshNormalMaterial()
      : options.neutral ? new THREE.MeshStandardMaterial({ color: 0xa5adb5, roughness: 0.9, metalness: 0 }) : null;
    const replacedMaterials = new Set<THREE.Material>();
    shelf.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      node.castShadow = false; node.receiveShadow = true;
      if (!diagnostic) {
        // Weld only coincident vertices in each geological body, retaining
        // separate authored masses and every original vertex position.
        if (!(node instanceof THREE.InstancedMesh)) {
          const source = node.geometry; const weldInput = source.clone();
          weldInput.deleteAttribute('normal');
          node.geometry = mergeVertices(weldInput, 0.00001); node.geometry.computeVertexNormals();
          source.dispose(); weldInput.dispose();
        }
        const positions = node.geometry.getAttribute('position'), normals = node.geometry.getAttribute('normal');
        const colors = new Float32Array(positions.count * 3);
        const deep = new THREE.Color(0x12304a), mineral = new THREE.Color(0x497984), reef = new THREE.Color(0x317574), color = new THREE.Color();
        for (let i = 0; i < positions.count; i++) {
          const x = positions.getX(i), y = positions.getY(i), z = positions.getZ(i);
          const upward = Math.max(0, normals.getY(i));
          const band = Math.sin(y * 2.1 + Math.sin(x * 0.9) + z * 0.31) * 0.5 + 0.5;
          color.copy(deep).lerp(mineral, 0.18 + upward * 0.5 + band * 0.15);
          color.lerp(reef, upward * 0.32).multiplyScalar(0.88 + Math.sin(x * 2.5 + z * 1.7) * 0.08);
          colors.set([color.r,color.g,color.b], i * 3);
        }
        node.geometry.setAttribute('color',new THREE.BufferAttribute(colors,3));
        if (node.material instanceof THREE.MeshStandardMaterial) { node.material.color.setHex(0xffffff); node.material.roughness = 0.98; node.material.metalness = 0; node.material.vertexColors = true; node.material.needsUpdate = true; }
      }
      if (diagnostic) {
        (Array.isArray(node.material) ? node.material : [node.material]).forEach(material => replacedMaterials.add(material));
        node.material = diagnostic;
      } else if (node.material instanceof THREE.MeshStandardMaterial && !seenMaterials.has(node.material)) {
        seenMaterials.add(node.material);
        applyIsland7RockSurfaceV2(node.material);
        materials.push({ material: node.material, day: node.material.color.clone() });
      }
    });
    replacedMaterials.forEach(material => material.dispose());
    root.add(shelf);
    if (!diagnostic) {
      garden = createIsland7ReefGardenV2(shelf, options.quality);
      root.add(garden.root);
      archiveGarden = createIsland7ArchiveReefGardenV2(shelf, options.quality);
      root.add(archiveGarden.root);
      atmosphere = createIsland7WaterAtmosphereV2(shelf, options.quality); root.add(atmosphere.root);
      deepLife = createIsland7DeepSeaLifeV2(options.quality); root.add(deepLife.root);
      // Five broad, shadow-free pools illuminate real rock and architecture.
      // No per-colony lights or screen-space fake background glow.
      for (const [x, y, z, color] of [[-5.6, -1, 4.5, 0x50fbdc], [5.6, -1, 4.2, 0xa073ff], [0, -0.6, -5.8, 0x45bbff], [-4.36, 1.2, -3.3, 0xffba69], [0, 1.0, 2.3, 0xffd89e]]) {
        const light = new THREE.PointLight(color, 0, 7, 2);
        light.name = 'ISLAND_7_V2_REEF_LIGHT_POOL';
        light.position.set(x, y, z); root.add(light); reefLights.push(light);
      }
      root.userData.livingReefColonies = garden.root.userData.colonies;
    }
    // The island renderer freezes static world matrices after initial setup;
    // this asynchronously loaded subtree must publish its actual transform.
    root.updateWorldMatrix(true, true);
    applyNight();
    let triangles = 0, drawCalls = 0;
    root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3 * (node instanceof THREE.InstancedMesh ? node.count : 1);
      drawCalls += 1;
    });
    root.userData.environmentBudget = { triangles, drawCalls };
    root.userData.status = 'ready';
  }).catch(error => {
    if (!disposed) root.userData.status = 'error';
    throw error;
  }).finally(() => window.clearTimeout(timeout));
  return {
    root, ready,
    setNight: value => {
      night = THREE.MathUtils.clamp(Number.isFinite(value) ? value : 0, 0, 1);
      applyNight();
    },
    animate: elapsed => { garden?.animate(elapsed); archiveGarden?.animate(elapsed); atmosphere?.animate(elapsed); deepLife?.animate(elapsed); },
    dispose: () => {
      if (disposed) return;
      disposed = true; root.userData.status = 'disposed';
      controller.abort(); window.clearTimeout(timeout);
      disposeIsland7Reef(root); root.clear(); materials.length = 0; garden = null; atmosphere = null; deepLife = null; reefLights.length = 0;
    },
  };
}
