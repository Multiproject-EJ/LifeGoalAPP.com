import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { disposeIsland7Reef, loadIsland7ReefShelf } from './Island7AuthoredReef';
import type { Island3DQuality } from './island5ThreePilotContract';

const FOUNDATIONS = [
  { id: 'board', position: [0, -0.36, 0], scale: [1.7, 1.05, 1.7], yaw: 4 },
  { id: 'hatchery', position: [-4.55, -0.40, -4.05], scale: [0.65, 0.65, 0.65], yaw: -24 },
  { id: 'sanctuary', position: [4.55, -0.43, -4.05], scale: [0.66, 0.66, 0.66], yaw: 37 },
  { id: 'archive', position: [-4.55, -0.38, 4.05], scale: [0.66, 0.66, 0.66], yaw: -17 },
  { id: 'portal', position: [4.55, -0.41, 4.05], scale: [0.64, 0.64, 0.64], yaw: 44 },
];

function checkAbort(signal?: AbortSignal) {
  if (signal?.aborted) throw new DOMException('Fused reef terraces aborted', 'AbortError');
}

async function loadGlb(url: string, signal?: AbortSignal) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`Fused reef asset unavailable (${response.status}): ${url}`);
  return (await new GLTFLoader().parseAsync(await response.arrayBuffer(), '/assets/islands/island-007/v2/')).scene;
}

/** Three continuous geological bodies fused from the accepted closed reef,
 * basin floor and five unchanged top collars. Caller owns all resources. */
export async function createIsland7FusedReefTerraces(quality: Island3DQuality, signal?: AbortSignal): Promise<THREE.Group> {
  checkAbort(signal);
  const root = await loadGlb(`/assets/islands/island-007/v2/fused-reef-terraces-v002/fused-reef-terraces-${quality}.glb`, signal);
  root.name = 'ISLAND_7_FUSED_REEF_TERRACES_V002';
  const compactStudy = import.meta.env.DEV && typeof window !== 'undefined'
    && new URLSearchParams(window.location.search).get('island7CompactRootStudy') === '1';
  let unattachedGeometry: THREE.BufferGeometry | null = null;
  let unattachedMaterial: THREE.MeshStandardMaterial | null = null;
  try {
    checkAbort(signal);
    const source = quality === 'high' ? await loadIsland7ReefShelf('low', signal)
      : await loadGlb(`/assets/islands/island-007/v2/canyon-lods-v001/reef-shelf-${quality === 'medium' ? 'medium' : 'low'}.glb`, signal);
    try {
      checkAbort(signal); source.updateMatrixWorld(true);
      const meshes: THREE.Mesh[] = [];
      source.traverse(node => { if (node instanceof THREE.Mesh) meshes.push(node); });
      if (meshes.length !== 1) throw new Error('Expected a single accepted reef foundation source');
      unattachedGeometry = meshes[0].geometry.clone().applyMatrix4(meshes[0].matrixWorld);
    } finally { disposeIsland7Reef(source); }
    unattachedMaterial = new THREE.MeshStandardMaterial({ color: 0x316777, roughness: 0.94, metalness: 0 });
    const placements = compactStudy ? FOUNDATIONS.slice(1) : FOUNDATIONS;
    if (compactStudy) {
      // Counterfactual composition study: preserve every vertex at the board collar,
      // compact only the lower original geology, and remove the occluding footing.
      const board = FOUNDATIONS[0], pose = new THREE.Object3D();
      pose.position.fromArray(board.position); pose.scale.fromArray(board.scale);
      pose.rotation.y = THREE.MathUtils.degToRad(board.yaw); pose.updateMatrix();
      const geometry = unattachedGeometry.clone().applyMatrix4(pose.matrix);
      const positions = geometry.getAttribute('position');
      for (let i = 0; i < positions.count; i++) {
        const y = positions.getY(i);
        if (y < -1.8) positions.setY(i, -1.8 - 4 * (1 - Math.exp((y + 1.8) / 4)));
      }
      positions.needsUpdate = true; geometry.computeVertexNormals();
      geometry.computeBoundingBox(); geometry.computeBoundingSphere();
      const compact = new THREE.Mesh(geometry, unattachedMaterial.clone());
      compact.name = 'ISLAND_7_COMPACT_BOARD_ROOT_STUDY'; root.add(compact);
      const oldFooting: THREE.Mesh[] = [];
      root.traverse(node => { if (node instanceof THREE.Mesh && node.name.includes('COMMON_GEOLOGICAL_FOOTING')) oldFooting.push(node); });
      if (oldFooting.length !== 1) throw new Error('Expected one common footing for compact-root diagnostic');
      oldFooting.forEach(mesh => { mesh.removeFromParent(); mesh.geometry.dispose(); });
      // Its GLTF material is shared by the retained banks and floor.
    }
    const supports = new THREE.InstancedMesh(unattachedGeometry, unattachedMaterial, placements.length);
    supports.name = 'ISLAND_7_FIVE_FROZEN_REEF_FOUNDATIONS';
    const transform = new THREE.Object3D();
    placements.forEach((placement, index) => {
      transform.position.fromArray(placement.position); transform.scale.fromArray(placement.scale);
      transform.rotation.set(0, THREE.MathUtils.degToRad(placement.yaw), 0); transform.updateMatrix();
      supports.setMatrixAt(index, transform.matrix);
    });
    supports.instanceMatrix.needsUpdate = true; supports.computeBoundingBox(); supports.computeBoundingSphere();
    supports.userData.sourceRevision = 'worker-reef-v002'; supports.userData.placements = placements;
    root.add(supports); unattachedGeometry = null; unattachedMaterial = null;
    checkAbort(signal);
    let triangles = 0, drawCalls = 0;
    root.traverse(node => {
      if (!(node instanceof THREE.Mesh)) return;
      triangles += (node.geometry.index?.count ?? node.geometry.attributes.position.count) / 3
        * (node instanceof THREE.InstancedMesh ? node.count : 1);
      drawCalls += Array.isArray(node.material) ? node.material.length : 1;
    });
    const triangleLimit = quality === 'high' ? 42000 : quality === 'medium' ? 27000 : 16000;
    if (triangles > triangleLimit || drawCalls > 16) throw new Error(`Fused reef budget exceeded: ${triangles} triangles, ${drawCalls} draws`);
    root.userData = { ...root.userData, revision: 'fused-reef-terraces-v002', presentationOnly: true,
      representationFamily: 'continuous-fused-geological-terraces',
      visualApproval: 'pending-independent-macro-QC', worldCoordinatesBaked: true,
      environmentBudget: { quality, triangles, drawCalls, triangleLimit, foundationCount: 5 },
      source: { bankAndFooting: 'worker-reef-v002 closed approved geometry', foundation: 'worker-reef-v002' },
      sculptRuntime: { clickable: false, explodable: true, presentationOnly: true,
        destructionGroups: [{ id: 'fused-reef-terraces', breakable: false }] } };
    return root;
  } catch (error) {
    unattachedGeometry?.dispose(); unattachedMaterial?.dispose(); disposeIsland7Reef(root); throw error;
  }
}
