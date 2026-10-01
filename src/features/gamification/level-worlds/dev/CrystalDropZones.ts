import * as THREE from 'three';

/**
 * Island 002 Crystal Miners drop zones (presentation only): four glowing
 * crystal pads, one beside each outer landmark, where Crystal Miners
 * expeditions drop in. Tapping one opens the Event Arena (its own game
 * choice, tickets and gating decide what can be played).
 */
export function createCrystalDropZones() {
  const root = new THREE.Group();
  root.name = 'ISLAND_2_CRYSTAL_DROP_ZONES';
  root.visible = false;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };
  const padMat = track(new THREE.MeshStandardMaterial({ color: '#2b3d55', roughness: 0.4, metalness: 0.6 }));
  const ringMat = track(new THREE.MeshBasicMaterial({ color: '#7ff3ff', transparent: true, opacity: 0.8, depthWrite: false }));
  const crystalMat = track(new THREE.MeshStandardMaterial({ color: '#8ef6ff', emissive: '#39c6ff', emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, flatShading: true }));
  const beamMat = track(new THREE.MeshBasicMaterial({ color: '#9ff7ff', transparent: true, opacity: 0.18, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const padGeometry = track(new THREE.CylinderGeometry(0.55, 0.62, 0.08, 6));
  const ringGeometry = track(new THREE.RingGeometry(0.62, 0.7, 6));
  const crystalGeometry = track(new THREE.OctahedronGeometry(0.22, 0));
  const beamGeometry = track(new THREE.CylinderGeometry(0.12, 0.3, 2.4, 12, 1, true));
  const zones = Array.from({ length: 4 }, () => {
    const zone = new THREE.Group();
    const pad = new THREE.Mesh(padGeometry, padMat);
    pad.position.y = 0.04;
    const ring = new THREE.Mesh(ringGeometry, ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.09;
    const crystal = new THREE.Mesh(crystalGeometry, crystalMat);
    crystal.scale.set(1, 1.6, 1);
    crystal.position.y = 0.75;
    const beam = new THREE.Mesh(beamGeometry, beamMat);
    beam.position.y = 1.2;
    zone.add(pad, ring, crystal, beam);
    root.add(zone);
    return { zone, crystal, ring };
  });
  let placed = false;

  /** One pad per outer landmark, on the side facing the island centre. */
  function place(anchors: readonly THREE.Vector3[]) {
    anchors.slice(0, 4).forEach((anchor, index) => { zones[index].zone.position.copy(anchor); zones[index].zone.scale.setScalar(1.6); });
    placed = anchors.length > 0;
  }

  function update(t: number, reducedMotion: boolean) {
    if (!placed) return;
    zones.forEach(({ crystal, ring }, index) => {
      crystal.rotation.y = reducedMotion ? 0 : t * 1.2 + index;
      crystal.position.y = 0.75 + (reducedMotion ? 0 : Math.sin(t * 2 + index) * 0.08);
      ring.scale.setScalar(reducedMotion ? 1 : 1 + ((t * 0.8 + index * 0.25) % 1) * 0.35);
      (ring.material as THREE.MeshBasicMaterial).opacity = reducedMotion ? 0.7 : 0.8 * (1 - ((t * 0.8 + index * 0.25) % 1));
    });
  }

  return {
    root,
    get placed() { return placed; },
    place,
    update,
    hitTargets: zones.map(({ zone }) => zone) as THREE.Object3D[],
    dispose() {
      root.parent?.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
