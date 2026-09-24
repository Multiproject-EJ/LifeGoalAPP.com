import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';
import type { IslandStagedRestorationPresentation } from './IslandStagedRestorationThreePresentation';

const STAGES = 8;
const REPAIR_SECONDS = 2.4;

/** Map the authored ribs, steps and waystones to the same eight repair sections. */
export function getTitanSpinePartStage(name: string, fallbackRibCount = 8): number | null {
  const sculpt = /^TitanBridge_(VertebralBody|NeuralArch|Rib|RibBandA|RibBandB|TransverseProcessL|TransverseProcessR|CalcifiedStep|Waystone)_(\d+)/.exec(name);
  if (sculpt) {
    const count = sculpt[1] === 'CalcifiedStep' ? 28 : sculpt[1] === 'Waystone' ? 5 : 10;
    return Math.min(STAGES - 1, Math.floor((Number(sculpt[2]) - 1) * STAGES / count));
  }
  const fallback = /^ISLAND_17_RIB_BRIDGE_(TAPERED_ARCH|RIB_HEAD|RIB_WEATHER_BAND|RAISED_VERTEBRA|NEURAL_ARCH|SPINOUS_PROCESS|STERNUM_WALKWAY_SLAB|VERTEBRAL_PROCESS|SIDE_SKULL_RELIC)_(\d+)/.exec(name);
  return fallback ? Math.min(STAGES - 1, Math.floor((Number(fallback[2]) - 1) * STAGES / fallbackRibCount)) : null;
}

export function createTitanSpineRestoration(root: THREE.Group, bonePalette: THREE.MeshStandardMaterial[] = []) {
  const batchedBone = bonePalette[0]?.clone();
  if (batchedBone) {
    batchedBone.name = 'Titan spine bone palette';
    batchedBone.color.set(0xffffff);
    batchedBone.vertexColors = true;
  }
  let activatedStages = 0;
  let previousStages = 0;
  let sequence = 0;
  let initialized = false;
  let lastElapsed = 0;
  let repairStartedAt: number | null = null;
  const bindings: Array<{ group: THREE.Group; stage: number; up: THREE.Vector3 }> = [];

  const bind = (model: THREE.Group, fallbackRibCount = 8) => {
    const candidates: Array<{ node: THREE.Object3D; stage: number }> = [];
    model.traverse((node) => {
      const stage = getTitanSpinePartStage(node.name, fallbackRibCount);
      if (stage !== null && node.parent) candidates.push({ node, stage });
    });
    const byParent = new Map<THREE.Object3D, Map<number, THREE.Group>>();
    model.updateWorldMatrix(true, true);
    candidates.forEach(({ node, stage }) => {
      const parent = node.parent!;
      let groups = byParent.get(parent);
      if (!groups) { groups = new Map(); byParent.set(parent, groups); }
      let group = groups.get(stage);
      if (!group) {
        group = new THREE.Group();
        group.name = `ISLAND_17_SPINE_REPAIR_SECTION_${stage + 1}`;
        group.userData.restorationStage = stage + 1;
        parent.add(group);
        groups.set(stage, group);
        const up = parent.worldToLocal(new THREE.Vector3(0, 1, 0))
          .sub(parent.worldToLocal(new THREE.Vector3()));
        bindings.push({ group, stage, up });
      }
      // The new group has the same parent and an identity transform.
      group.add(node);
    });
    byParent.forEach((groups) => groups.forEach((group) => {
      // These bone variants share texture maps. Vertex colors retain their
      // ivory/aged tones while reducing each section to one bone draw call.
      group.traverse(node => {
        if (!(node instanceof THREE.Mesh) || !batchedBone || Array.isArray(node.material)
          || !bonePalette.includes(node.material as THREE.MeshStandardMaterial)) return;
        const source = node.material as THREE.MeshStandardMaterial;
        const count = node.geometry.getAttribute('position').count;
        const colors = new Float32Array(count * 3);
        for (let index = 0; index < count; index += 1) source.color.toArray(colors, index * 3);
        node.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        node.material = batchedBone;
      });
      compactStaticGeometry(group, `${group.name}_BATCH`, { preserveKeepSeparate: true });
      group.userData.keepSeparate = true;
      group.traverse(node => { if (node instanceof THREE.Mesh) node.userData.keepSeparate = true; });
      group.visible = Number(group.userData.restorationStage) <= activatedStages;
    }));
  };

  const unbind = (model: THREE.Group) => {
    for (let index = bindings.length - 1; index >= 0; index -= 1) {
      let parent: THREE.Object3D | null = bindings[index].group;
      while (parent && parent !== model) parent = parent.parent;
      if (parent) bindings.splice(index, 1);
    }
  };

  const update = (presentation: IslandStagedRestorationPresentation, immediate = false) => {
    if (presentation.islandNumber !== 17) return;
    const next = Number.isFinite(presentation.activatedStages)
      ? THREE.MathUtils.clamp(Math.floor(presentation.activatedStages), 0, STAGES) : 0;
    const nextSequence = presentation.constructionSequence ?? 0;
    const shouldAnimate = initialized && !immediate
      && (next > activatedStages || (next === STAGES && nextSequence !== sequence));
    previousStages = activatedStages;
    activatedStages = next;
    sequence = nextSequence;
    repairStartedAt = shouldAnimate ? lastElapsed : null;
    initialized = true;
    root.userData.activatedStages = activatedStages;
    bindings.forEach(({ group, stage }) => {
      group.visible = stage < activatedStages;
      group.position.set(0, 0, 0);
    });
  };

  const animate = (elapsed: number, reducedMotion: boolean) => {
    lastElapsed = elapsed;
    const age = repairStartedAt === null ? Infinity : Math.max(0, elapsed - repairStartedAt);
    if (reducedMotion) repairStartedAt = null;
    const lift = reducedMotion ? 1 : THREE.MathUtils.smoothstep(age, 0, REPAIR_SECONDS);
    bindings.forEach(({ group, stage, up }) => {
      group.visible = stage < activatedStages;
      const isNew = stage >= previousStages && stage < activatedStages;
      // New bones rise from the abyss without moving the existing bridge or route.
      if (isNew && lift < 1) group.position.copy(up).multiplyScalar(-1.7 * (1 - lift));
      else group.position.set(0, 0, 0);
    });
    const duration = activatedStages === STAGES ? 5 : REPAIR_SECONDS + 0.6;
    const burst = reducedMotion || age > duration ? 0
      : Math.sin(Math.PI * THREE.MathUtils.clamp(age / duration, 0, 1));
    root.userData.missionRepairActive = burst > 0;
    return { activatedStages, burst, finale: activatedStages === STAGES && burst > 0 };
  };

  return { bind, unbind, update, animate };
}
