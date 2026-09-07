import * as THREE from 'three';

/** Two-stage rotational damping. The physical seat position is never filtered:
 * a positional chase spring would pull the eye out of the wagon in corners. */
export function createWonderRideCameraFilter() {
  const lead = new THREE.Quaternion();
  const orientation = new THREE.Quaternion();
  let ready = false;
  return {
    reset() { ready = false; },
    update(target: THREE.Quaternion, deltaSeconds: number, snap = false) {
      if (!ready || snap) {
        lead.copy(target);
        orientation.copy(target);
        ready = true;
      } else {
        // Small bounded integration steps keep 30/60/120 Hz responses close.
        const elapsed = THREE.MathUtils.clamp(deltaSeconds, 0, .1);
        const steps = Math.max(1, Math.ceil(elapsed * 120));
        const alpha = 1 - Math.exp(-14 * elapsed / steps);
        for (let i = 0; i < steps; i++) {
          lead.slerp(target, alpha);
          orientation.slerp(lead, alpha);
        }
      }
      return orientation;
    },
  };
}
