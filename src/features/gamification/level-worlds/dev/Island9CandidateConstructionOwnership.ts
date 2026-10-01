import type * as THREE from 'three';
import type { CandidateMeshConstructionOwnership } from './IslandCandidateConstructionPreview';

type Candidate = 'memory-press' | 'great-fuse';
type Schedule = readonly [CandidateMeshConstructionOwnership['buildLevel'], CandidateMeshConstructionOwnership['phase']];
/** Explicit assembly schedules. Phase is never inferred from mesh height or legacy group stage. */
const memory: Readonly<Record<string, Schedule>> = {
  'memory-press-polygonal-foundation': [0, 1],
  'memory-press-lower-furnace-throat': [1, 2],
  'memory-press-pressure-collar-lower': [1, 3],
  'memory-press-pressure-collar-middle': [1, 3],
  'memory-press-pressure-collar-upper': [1, 3],
  'memory-press-occupied-pressure-chambers': [1, 2],
  'memory-press-dominant-chimney': [2, 3],
  'memory-press-curved-drive-housing': [2, 4],
  'memory-press-outer-frame-and-drive': [2, 4],
  'memory-press-drive-wheel': [2, 4],
  'memory-press-unequal-auxiliary-towers': [3, 4],
  'memory-press-tall-auxiliary': [3, 4],
  'memory-press-short-auxiliary': [3, 4],
};
const fuse: Readonly<Record<string, Schedule>> = {
  'fuse-grounded-base': [0, 1], 'fuse-spine': [1, 2],
  'fuse-charge-cell-01': [1, 3], 'fuse-charge-cell-02': [1, 3], 'fuse-charge-cell-03': [1, 3],
  'fuse-charge-cell-04': [2, 3], 'fuse-charge-cell-05': [2, 3], 'fuse-charge-cell-06': [2, 3],
  'fuse-charge-cell-07': [3, 3], 'fuse-charge-cell-08': [3, 3],
  'eccentric-drive': [2, 2], 'fuse-eccentric-flywheel-pivot': [2, 4],
  'fuse-lower-drive-housing': [2, 3], 'fuse-open-upper-collar': [3, 3],
  'fuse-asymmetric-return-pipes': [3, 4],
};
/** Unwired resolver for the current candidate factories, not production activation.
 * The nearest semantic owner must be known: unknown child owners cannot silently
 * inherit an ancestor's schedule. Preserve every original mesh/pivot identity.
 * No phase5 finish is invented for these neutral structural candidates.
 */
export function resolveIsland9CandidateConstructionOwnership(candidate: Candidate, mesh: THREE.Mesh): CandidateMeshConstructionOwnership {
  const schedule = candidate === 'memory-press' ? memory : candidate === 'great-fuse' ? fuse : null;
  if (!schedule) throw new Error(`Unknown Island9 construction candidate: ${candidate}`);
  let node: THREE.Object3D | null = mesh;
  while (node && typeof node.userData.partId !== 'string') node = node.parent;
  const id = node?.userData.partId;
  const value = typeof id === 'string' && Object.prototype.hasOwnProperty.call(schedule, id) ? schedule[id] : undefined;
  if (!value) throw new Error(`Unknown ${candidate} construction owner: ${String(id)} (${mesh.name})`);
  return { buildLevel: value[0], phase: value[1], preserveObjectIdentity: true };
}
