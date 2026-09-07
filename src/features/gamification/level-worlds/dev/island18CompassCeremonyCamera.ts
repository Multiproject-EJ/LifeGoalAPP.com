import * as THREE from 'three';

const SHOTS = [
  { at: 0.18, position: [10.8, 10.9, 19.4], target: null },
  { at: 0.62, position: [-9, 16.4, 15], target: [0, 14, -0.18] },
  { at: 0.74, position: [1.2, 20, 13], target: [0, 18.2, -0.18] },
  { at: 0.94, position: [3.6, 16.8, 12.4], target: [-0.32, 10.65, -0.18] },
] as const;

/** Shared endpoints keep the look-up, descent and arrival hold continuous. */
export function resolveIsland18CompassCeremonyCamera(
  progress: number,
  origin: { position: THREE.Vector3; target: THREE.Vector3 },
  focus: THREE.Vector3,
  aspectRatio = 1,
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const position = new THREE.Vector3();
  const target = new THREE.Vector3();
  let previousAt = 0;
  let previousPosition = origin.position;
  let previousTarget = origin.target;
  for (const shot of SHOTS) {
    const nextPosition = new THREE.Vector3(...shot.position);
    if (shot.at === 0.94) nextPosition.z *= THREE.MathUtils.clamp(0.74 / aspectRatio, 1, 1.8);
    const nextTarget = shot.target ? new THREE.Vector3(...shot.target) : focus;
    if (progress <= shot.at) {
      const blend = THREE.MathUtils.smoothstep(progress, previousAt, shot.at);
      return {
        position: position.lerpVectors(previousPosition, nextPosition, blend),
        target: target.lerpVectors(previousTarget, nextTarget, blend),
      };
    }
    previousAt = shot.at;
    previousPosition = nextPosition;
    previousTarget = nextTarget;
  }
  return { position: position.copy(previousPosition), target: target.copy(previousTarget) };
}
