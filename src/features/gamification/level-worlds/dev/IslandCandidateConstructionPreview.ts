import * as THREE from 'three';
import {
  applyIslandConstructionAuthoring,
  resolveIslandLandmarkConstructionProfile,
  type IslandConstructionPreviewMode,
} from './IslandConstructionAuthoring';
import type { Island3DQuality, Island5LandmarkId } from './island5ThreePilotContract';

export type CandidateBuildLevel = 0 | 1 | 2 | 3;
export type CandidateConstructionPhase = 1 | 2 | 3 | 4 | 5;
export interface CandidateMeshConstructionOwnership {
  buildLevel: CandidateBuildLevel;
  phase: CandidateConstructionPhase;
  /** Keep newly added render geometry under its named pivot during delta reveal. */
  preserveObjectIdentity: boolean;
}

function snapshotMetadata(node: THREE.Object3D, keys: readonly string[]) {
  const descriptors = keys.map(key => [key, Object.getOwnPropertyDescriptor(node.userData, key)] as const);
  return () => descriptors.forEach(([key, descriptor]) => {
    if (descriptor) Object.defineProperty(node.userData, key, descriptor);
    else delete node.userData[key];
  });
}

function meshResources(root: THREE.Object3D) {
  const resources = new Set<THREE.BufferGeometry | THREE.Material>();
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    resources.add(node.geometry);
    const materials = Array.isArray(node.material) ? node.material : [node.material];
    materials.forEach(material => resources.add(material));
  });
  return resources;
}

/**
 * Opt-in preparation for a NEW candidate factory result, before its caller starts
 * construction playback. This does not approve a model or activate production.
 *
 * Every mesh needs explicit ownership and an identity policy from its factory.
 * In particular, a group's
 * legacy constructionStage=0..3 is NOT interpreted as a mesh's five-phase order.
 * Shared construction authoring sees an unattached identity content group, so
 * world-space landmark translation/rotation/scale cannot leak into its local rig.
 * Geometry, materials, pivots, sockets and the canonical root retain identity.
 */
export function prepareCandidateConstructionPreview(options: {
  root: THREE.Group;
  worldSourceNumber: number;
  landmarkId: Island5LandmarkId;
  quality: Island3DQuality;
  buildLevel: CandidateBuildLevel;
  preview?: IslandConstructionPreviewMode;
  resolveOwnership: (mesh: THREE.Mesh) => CandidateMeshConstructionOwnership;
}) {
  // An ordinary factory result must remain byte-for-byte untouched by this seam.
  if (!options.preview) return null;
  const { root } = options;
  if (root.userData.candidateConstructionPreview) throw new Error('Construction preview already prepared; use a fresh factory result.');
  if (!resolveIslandLandmarkConstructionProfile(options.worldSourceNumber, options.landmarkId)) {
    throw new Error('Candidate has no registered construction profile.');
  }
  const ownership = new Map<THREE.Mesh, CandidateMeshConstructionOwnership>();
  const phaseCountsByBuildLevel: Record<number, Record<number, number>> = {};
  root.traverse(node => {
    if (!(node instanceof THREE.Mesh)) return;
    if (node.userData.constructionTemporary) throw new Error('Candidate already contains temporary construction dressing.');
    const owner = options.resolveOwnership(node);
    if (!owner || !Number.isInteger(owner.buildLevel) || owner.buildLevel < 0 || owner.buildLevel > options.buildLevel
      || !Number.isInteger(owner.phase) || owner.phase < 1 || owner.phase > 5
      || typeof owner.preserveObjectIdentity !== 'boolean') {
      throw new Error(`Explicit build-level/phase ownership required for mesh ${node.name || node.uuid}.`);
    }
    ownership.set(node, { ...owner });
    const counts = phaseCountsByBuildLevel[owner.buildLevel] ??= {};
    counts[owner.phase] = (counts[owner.phase] ?? 0) + 1;
  });
  if (!ownership.size) throw new Error('Candidate has no construction geometry.');

  // Preflight above completes before any mutation. The wrapper is an identity
  // transform, preserving all existing child-local transforms and named nodes.
  const content = new THREE.Group();
  content.name = 'ISLAND_CANDIDATE_CONSTRUCTION_LOCAL_CONTENT';
  const originalChildren = [...root.children];
  const originalResources = meshResources(root);
  const restoreMetadata = [
    snapshotMetadata(root, ['authoredConstruction', 'candidateConstructionPreview']),
    ...[...ownership.keys()].map(node => snapshotMetadata(node, [
      'constructionBuildLevel', 'constructionStage', 'constructionPreserveOwnership',
    ])),
  ];
  try {
    for (const child of originalChildren) content.add(child);
    ownership.forEach((owner, node) => {
      node.userData.constructionBuildLevel = owner.buildLevel;
      node.userData.constructionStage = owner.phase;
      node.userData.constructionPreserveOwnership = owner.preserveObjectIdentity;
    });
    const authored = applyIslandConstructionAuthoring({
      root: content,
      worldSourceNumber: options.worldSourceNumber,
      landmarkId: options.landmarkId,
      quality: options.quality,
      includeTemporaryRig: options.preview === 'target',
    });
    root.add(content);
    root.userData.authoredConstruction = content.userData.authoredConstruction;
    root.userData.candidateConstructionPreview = {
      schema: 'candidate-local-construction-preview-v1',
      mode: options.preview,
      buildLevel: options.buildLevel,
      phaseCountsByBuildLevel,
      presentationOnly: true,
    };
    return { root, content, rig: authored?.rig ?? null, ownership, phaseCountsByBuildLevel };
  } catch (error) {
    // Reachable dressing belongs to this attempt; original/shared resources do not.
    const createdResources = [...meshResources(content)].filter(resource => !originalResources.has(resource));
    root.remove(content);
    originalChildren.forEach(child => root.add(child));
    restoreMetadata.forEach(restore => restore());
    root.updateWorldMatrix(true, true);
    createdResources.forEach(resource => {
      try { resource.dispose(); } catch { /* Preserve the original authoring error. */ }
    });
    throw error;
  }
}
