import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface IslandConstructionRevealPart {
  mesh: THREE.Mesh;
  materials: Array<THREE.Material & { opacity: number; transparent: boolean; depthWrite: boolean }>;
  baseOpacities: number[];
  threshold: number;
  stage: number;
  temporary: boolean;
}

export interface IslandConstructionLevelDelta {
  currentRoot: THREE.Group | null;
  targetRoot: THREE.Group;
  revealParts: IslandConstructionRevealPart[];
  retainedMeshCount: number;
  additiveMeshCount: number;
  stageCounts: Readonly<Record<number, number>>;
  revealBatchCount: number;
  applyProgress: (progress: number, options?: { working?: boolean }) => void;
}

function quantize(value: number) {
  return Math.round(value * 100) / 100;
}

function meshSignature(mesh: THREE.Mesh, root: THREE.Object3D) {
  mesh.geometry.computeBoundingBox();
  const size = mesh.geometry.boundingBox?.getSize(new THREE.Vector3()) ?? new THREE.Vector3();
  const worldPosition = mesh.getWorldPosition(new THREE.Vector3());
  const localPosition = root.worldToLocal(worldPosition.clone());
  const worldScale = mesh.getWorldScale(new THREE.Vector3());
  return [
    mesh.name.replace(/(?:L|LEVEL)[-_ ]?[0-3]/gi, 'LEVEL'),
    mesh.geometry.type,
    quantize(size.x), quantize(size.y), quantize(size.z),
    quantize(localPosition.x), quantize(localPosition.y), quantize(localPosition.z),
    quantize(worldScale.x), quantize(worldScale.y), quantize(worldScale.z),
  ].join('|');
}

function collectSignatureCounts(root: THREE.Object3D | null) {
  const counts = new Map<string, number>();
  if (!root) return counts;
  root.updateWorldMatrix(true, true);
  root.traverse((entry) => {
    if (!(entry instanceof THREE.Mesh)) return;
    const signature = meshSignature(entry, root);
    counts.set(signature, (counts.get(signature) ?? 0) + 1);
  });
  return counts;
}

function resolveInheritedConstructionValue(entry: THREE.Object3D, key: string, root: THREE.Object3D) {
  let current: THREE.Object3D | null = entry;
  while (current) {
    if (current.userData[key] !== undefined) return current.userData[key];
    if (current === root) break;
    current = current.parent;
  }
  return undefined;
}

/**
 * Keeps the funded level opaque and turns the target level into additive-only
 * reveal geometry. Matching uses a consumed geometry/placement multiset, so
 * repeated columns and rails do not collapse into one false match.
 */
export function prepareIslandConstructionLevelDelta(options: {
  currentRoot: THREE.Group | null;
  targetRoot: THREE.Group;
}): IslandConstructionLevelDelta {
  const currentSignatures = collectSignatureCounts(options.currentRoot);
  options.targetRoot.updateWorldMatrix(true, true);
  const targetBounds = new THREE.Box3().setFromObject(options.targetRoot);
  const targetHeight = Math.max(0.001, targetBounds.max.y - targetBounds.min.y);
  const additiveCandidates: Array<{
    mesh: THREE.Mesh;
    normalizedHeight: number;
    stage: number | null;
    temporary: boolean;
    sourceMaterials: THREE.Material[];
  }> = [];
  const retainedMeshes: THREE.Mesh[] = [];
  let retainedMeshCount = 0;

  options.targetRoot.traverse((entry) => {
    if (!(entry instanceof THREE.Mesh)) return;
    const signature = meshSignature(entry, options.targetRoot);
    const remaining = currentSignatures.get(signature) ?? 0;
    if (remaining > 0) {
      currentSignatures.set(signature, remaining - 1);
      entry.visible = false;
      retainedMeshes.push(entry);
      retainedMeshCount += 1;
      return;
    }
    const centerY = new THREE.Box3().setFromObject(entry).getCenter(new THREE.Vector3()).y;
    additiveCandidates.push({
      mesh: entry,
      normalizedHeight: THREE.MathUtils.clamp((centerY - targetBounds.min.y) / targetHeight, 0, 1),
      stage: Number.isFinite(Number(resolveInheritedConstructionValue(entry, 'constructionStage', options.targetRoot)))
        ? THREE.MathUtils.clamp(
            Math.round(Number(resolveInheritedConstructionValue(entry, 'constructionStage', options.targetRoot))),
            1,
            5,
          )
        : null,
      temporary: Boolean(resolveInheritedConstructionValue(entry, 'constructionTemporary', options.targetRoot)),
      sourceMaterials: Array.isArray(entry.material) ? entry.material : [entry.material],
    });
  });

  additiveCandidates.sort((a, b) => (
    (a.stage ?? 99) - (b.stage ?? 99)
    || a.normalizedHeight - b.normalizedHeight
    || a.mesh.name.localeCompare(b.mesh.name)
  ));
  const stageCounts = additiveCandidates.reduce<Record<number, number>>((counts, candidate) => {
    const stage = candidate.stage ?? THREE.MathUtils.clamp(Math.floor(candidate.normalizedHeight * 5) + 1, 1, 5);
    counts[stage] = (counts[stage] ?? 0) + 1;
    return counts;
  }, {});
  const stageMembers = new Map<number, typeof additiveCandidates>();
  additiveCandidates.forEach((candidate) => {
    if (candidate.stage === null) return;
    const members = stageMembers.get(candidate.stage) ?? [];
    members.push(candidate);
    stageMembers.set(candidate.stage, members);
  });
  const inverseTarget = options.targetRoot.matrixWorld.clone().invert();
  const batchGroups = new Map<string, typeof additiveCandidates>();
  const unbatchedCandidates: typeof additiveCandidates = [];
  additiveCandidates.forEach((candidate) => {
    if (candidate.sourceMaterials.length !== 1) {
      unbatchedCandidates.push(candidate);
      return;
    }
    const stage = candidate.stage ?? THREE.MathUtils.clamp(Math.floor(candidate.normalizedHeight * 5) + 1, 1, 5);
    const attributeSignature = Object.entries(candidate.mesh.geometry.attributes)
      .map(([name, attribute]) => `${name}:${attribute.itemSize}:${attribute.normalized ? 1 : 0}`)
      .sort()
      .join(',');
    const key = `${stage}|${candidate.temporary ? 1 : 0}|${candidate.sourceMaterials[0].uuid}|${attributeSignature}`;
    const group = batchGroups.get(key) ?? [];
    group.push(candidate);
    batchGroups.set(key, group);
  });

  const revealCandidates: typeof additiveCandidates = [...unbatchedCandidates];
  let batchIndex = 0;
  batchGroups.forEach((members) => {
    const geometries = members.map((candidate) => {
      const source = candidate.mesh.geometry.clone();
      const geometry = source.index ? source.toNonIndexed() : source;
      if (geometry !== source) source.dispose();
      geometry.applyMatrix4(inverseTarget.clone().multiply(candidate.mesh.matrixWorld));
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) {
      revealCandidates.push(...members);
      return;
    }
    const first = members[0];
    const stage = first.stage ?? THREE.MathUtils.clamp(Math.floor(first.normalizedHeight * 5) + 1, 1, 5);
    const mesh = new THREE.Mesh(merged, first.sourceMaterials[0]);
    mesh.name = `ISLAND_RUN_CONSTRUCTION_STAGE_${stage}_BATCH_${batchIndex}`;
    mesh.userData.constructionStage = stage;
    mesh.userData.constructionTemporary = first.temporary;
    mesh.castShadow = members.some((candidate) => candidate.mesh.castShadow);
    mesh.receiveShadow = members.some((candidate) => candidate.mesh.receiveShadow);
    options.targetRoot.add(mesh);
    members.forEach((candidate) => {
      candidate.mesh.parent?.remove(candidate.mesh);
      candidate.mesh.geometry.dispose();
    });
    revealCandidates.push({
      mesh,
      normalizedHeight: members.reduce((sum, candidate) => sum + candidate.normalizedHeight, 0) / members.length,
      stage,
      temporary: first.temporary,
      sourceMaterials: first.sourceMaterials,
    });
    batchIndex += 1;
  });

  // Target meshes that exactly match the funded level are no longer needed
  // after the consumed-multiset comparison. Removing them prevents invisible
  // duplicates from bloating traversal and makes the preview purely additive.
  retainedMeshes.forEach((entry) => {
    entry.parent?.remove(entry);
    entry.geometry.dispose();
  });

  revealCandidates.sort((a, b) => (
    (a.stage ?? 99) - (b.stage ?? 99)
    || a.normalizedHeight - b.normalizedHeight
    || a.mesh.name.localeCompare(b.mesh.name)
  ));
  const revealParts: IslandConstructionRevealPart[] = revealCandidates.map((candidate, index) => {
    const { mesh, normalizedHeight, temporary } = candidate;
    const originalMaterials = candidate.sourceMaterials;
    const materials = originalMaterials.map((material) => {
      const clone = material.clone() as IslandConstructionRevealPart['materials'][number];
      clone.transparent = true;
      clone.depthWrite = false;
      return clone;
    });
    mesh.material = Array.isArray(mesh.material) ? materials : materials[0];
    const sequenceBias = revealCandidates.length > 1 ? index / (revealCandidates.length - 1) : 0;
    const stage = candidate.stage ?? THREE.MathUtils.clamp(Math.floor(normalizedHeight * 5) + 1, 1, 5);
    const authoredStageMembers = stageMembers.get(stage);
    const authoredStageIndex = authoredStageMembers?.indexOf(candidate) ?? -1;
    const stageBias = authoredStageMembers && authoredStageMembers.length > 1 && authoredStageIndex >= 0
      ? authoredStageIndex / (authoredStageMembers.length - 1)
      : 0.5;
    return {
      mesh,
      materials,
      baseOpacities: originalMaterials.map((material) => material.opacity),
      threshold: candidate.stage === null
        ? THREE.MathUtils.clamp(0.04 + normalizedHeight * 0.66 + sequenceBias * 0.2, 0.04, 0.9)
        : THREE.MathUtils.clamp((stage - 1) * 0.2 + 0.035 + stageBias * 0.12, 0.035, 0.955),
      stage,
      temporary,
    };
  });

  const applyProgress = (progress: number, presentation: { working?: boolean } = {}) => {
    const clamped = THREE.MathUtils.clamp(progress, 0, 1);
    revealParts.forEach((part) => {
      const reveal = THREE.MathUtils.smoothstep(clamped, part.threshold - 0.055, part.threshold + 0.045);
      const presentationVisibility = part.temporary ? Boolean(presentation.working) && clamped < 0.999 : true;
      part.mesh.visible = presentationVisibility && reveal > 0.01;
      part.materials.forEach((material, index) => {
        material.opacity = part.baseOpacities[index] * reveal * (presentationVisibility ? 1 : 0);
        material.depthWrite = presentationVisibility && reveal > 0.92 && part.baseOpacities[index] > 0.55;
      });
    });
  };

  applyProgress(0);
  return {
    currentRoot: options.currentRoot,
    targetRoot: options.targetRoot,
    revealParts,
    retainedMeshCount,
    additiveMeshCount: additiveCandidates.length,
    stageCounts,
    revealBatchCount: revealParts.length,
    applyProgress,
  };
}
