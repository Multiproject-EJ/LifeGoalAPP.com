import * as THREE from 'three';

/**
 * Keeps a scripted camera from sitting behind scenery. Given the authored
 * camera position and its look target, returns the authored position when the
 * line of sight is clear; otherwise the nearest clear orbit around the target
 * (same distance, swung sideways and, if needed, lifted). If every candidate is
 * blocked, the camera is pulled in front of the first obstacle.
 */
const SWING_RADIANS = [0, 0.3, -0.3, 0.6, -0.6, 0.9, -0.9, 1.25, -1.25];
const LIFTS = [0, 1.6, 3.2];
const CLEARANCE = 0.3;

function isRenderedMesh(object: THREE.Object3D): boolean {
  if (!(object as THREE.Mesh).isMesh) return false;
  for (let node: THREE.Object3D | null = object; node; node = node.parent) {
    if (!node.visible) return false;
  }
  const materials = ([] as THREE.Material[]).concat((object as THREE.Mesh).material ?? []);
  return materials.some((material) => material.visible && (!material.transparent || material.opacity >= 0.5));
}

function firstBlockingDistance(
  raycaster: THREE.Raycaster,
  target: THREE.Vector3,
  candidate: THREE.Vector3,
  occluders: THREE.Object3D[],
): number | null {
  const direction = candidate.clone().sub(target);
  const distance = direction.length();
  if (distance <= CLEARANCE) return null;
  raycaster.set(target, direction.normalize());
  raycaster.near = 0;
  raycaster.far = distance - CLEARANCE;
  const hit = raycaster.intersectObjects(occluders, true).find((entry) => isRenderedMesh(entry.object));
  return hit ? hit.distance : null;
}

export function resolveUnoccludedCameraPosition(options: {
  desired: THREE.Vector3;
  target: THREE.Vector3;
  occluders: THREE.Object3D[];
  raycaster?: THREE.Raycaster;
}): THREE.Vector3 {
  const { desired, target, occluders } = options;
  if (occluders.length === 0) return desired.clone();
  const raycaster = options.raycaster ?? new THREE.Raycaster();
  const offset = desired.clone().sub(target);
  const horizontal = Math.hypot(offset.x, offset.z);
  const baseAngle = Math.atan2(offset.x, offset.z);
  for (const lift of LIFTS) {
    for (const swing of SWING_RADIANS) {
      const angle = baseAngle + swing;
      const candidate = new THREE.Vector3(
        target.x + Math.sin(angle) * horizontal,
        desired.y + lift,
        target.z + Math.cos(angle) * horizontal,
      );
      if (firstBlockingDistance(raycaster, target, candidate, occluders) === null) return candidate;
    }
  }
  const blockedAt = firstBlockingDistance(raycaster, target, desired, occluders);
  if (blockedAt === null) return desired.clone();
  const pulledIn = Math.max(1.2, blockedAt - 0.6);
  return target.clone().add(offset.normalize().multiplyScalar(pulledIn));
}
