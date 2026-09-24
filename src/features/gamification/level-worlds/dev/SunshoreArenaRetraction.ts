import * as THREE from 'three';

/** Visual-only mechanism. Gameplay remains owned by the existing battle presentation. */
export function createSunshoreArenaRetraction(root: THREE.Object3D) {
  let crown: THREE.Object3D | undefined;
  root.traverse(node => { if (node.userData.sunshoreRetractingCrown) crown = node; });
  if (!crown) return null;
  const moving = crown;
  const travel = Number(moving.userData.sunshoreRetractionTravel);
  const crownBounds = new THREE.Box3().setFromObject(moving);
  const raisedTop = crownBounds.isEmpty() ? 1 : crownBounds.max.y;
  let amount = 0, from = 0, target = 0, started = 0;
  moving.position.y = -travel;
  return {
    update(elapsed: number, active: boolean, reducedMotion: boolean) {
      const next = active ? 1 : 0;
      if (next !== target) { from = amount; target = next; started = elapsed; }
      const t = Math.min(1, Math.max(0, (elapsed - started) / (target ? 1.8 : 1.5)));
      const eased = t * t * (3 - 2 * t);
      amount = reducedMotion ? target : from + (target - from) * eased;
      moving.position.y = -travel * (1 - amount);
      return { amount, active, heightFraction: .3 + .7 * amount, top: Math.max(1.05, raisedTop - travel * (1 - amount)) };
    },
  };
}
