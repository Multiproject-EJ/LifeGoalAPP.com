import * as THREE from 'three';

/**
 * Island 008: the caretaker visits as a masked jungle wizard (user request
 * 2026-09-30). He zaps onto the tile the player just landed on and asks the
 * baseline questions. This module adds his golden guardian mask (worn on the
 * caretaker's head bone) and the energy-zap arrival effect. Presentation only.
 */
export function createWizardMask(): { root: THREE.Group; dispose: () => void } {
  const root = new THREE.Group();
  root.name = 'ISLAND_008_WIZARD_MASK';
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };
  const gold = track(new THREE.MeshStandardMaterial({ color: 0xd9a632, metalness: 0.75, roughness: 0.32, emissive: 0x4a3000, emissiveIntensity: 0.35 }));
  const jade = track(new THREE.MeshStandardMaterial({ color: 0x2fbf8f, metalness: 0.2, roughness: 0.35, emissive: 0x0b5c43, emissiveIntensity: 0.6 }));
  const glow = track(new THREE.MeshBasicMaterial({ color: 0x9cffe0 }));
  const feather = track(new THREE.MeshStandardMaterial({ color: 0x1f8f6a, roughness: 0.7, side: THREE.DoubleSide }));
  const featherTip = track(new THREE.MeshStandardMaterial({ color: 0xe8b23a, roughness: 0.6, side: THREE.DoubleSide }));

  // Face plate: a slightly curved golden shield over the shadow face.
  const plate = new THREE.Mesh(track(new THREE.SphereGeometry(0.62, 18, 12, -0.95, 1.9, 0.62, 1.55)), gold);
  plate.name = 'WIZARD_MASK_PLATE';
  plate.rotation.y = -Math.PI / 2;
  plate.scale.set(1, 1.12, 1);
  plate.position.set(0, -0.02, 0.24);
  root.add(plate);
  // Brow ridge and jade forehead jewel.
  const brow = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.07, 0.12)), gold);
  brow.position.set(0, 0.16, 0.84);
  root.add(brow);
  const jewel = new THREE.Mesh(track(new THREE.OctahedronGeometry(0.075)), jade);
  jewel.position.set(0, 0.27, 0.86);
  root.add(jewel);
  // Glowing eye slits.
  const eyeGeometry = track(new THREE.BoxGeometry(0.17, 0.05, 0.04));
  [-0.22, 0.22].forEach((x) => {
    const eye = new THREE.Mesh(eyeGeometry, glow);
    eye.position.set(x, 0.03, 0.86);
    eye.rotation.z = x < 0 ? -0.18 : 0.18;
    root.add(eye);
  });
  // Tusks and chin glyph.
  const tuskGeometry = track(new THREE.ConeGeometry(0.035, 0.16, 6));
  [-0.16, 0.16].forEach((x) => {
    const tusk = new THREE.Mesh(tuskGeometry, jade);
    tusk.position.set(x, -0.3, 0.8);
    tusk.rotation.x = Math.PI;
    root.add(tusk);
  });
  // Feather crest fanning above the hood.
  const featherGeometry = track(new THREE.PlaneGeometry(0.11, 0.55));
  const tipGeometry = track(new THREE.PlaneGeometry(0.11, 0.12));
  for (let i = 0; i < 7; i += 1) {
    const angle = (i - 3) * 0.24;
    const group = new THREE.Group();
    group.position.set(0, 0.42, 0.62);
    group.rotation.set(-0.35, 0, angle);
    const blade = new THREE.Mesh(featherGeometry, feather);
    blade.position.y = 0.3;
    const tip = new THREE.Mesh(tipGeometry, featherTip);
    tip.position.y = 0.6;
    group.add(blade, tip);
    root.add(group);
  }
  return { root, dispose: () => disposables.forEach((item) => item.dispose()) };
}

/** Energy-zap arrival: a light beam, an expanding ground ring and sparks. */
export function createWizardZapEffect(): {
  root: THREE.Group;
  update: (age: number, reducedMotion: boolean) => void;
  dispose: () => void;
} {
  const root = new THREE.Group();
  root.name = 'ISLAND_008_WIZARD_ZAP';
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };
  const beamMaterial = track(new THREE.MeshBasicMaterial({ color: 0x8dffd8, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const ringMaterial = track(new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
  const sparkMaterial = track(new THREE.MeshBasicMaterial({ color: 0xc9fff0, transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }));
  const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(0.18, 0.32, 3.2, 16, 1, true)), beamMaterial);
  beam.position.y = 1.6;
  const ring = new THREE.Mesh(track(new THREE.RingGeometry(0.2, 0.32, 32)), ringMaterial);
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  const sparks = new THREE.Group();
  const sparkGeometry = track(new THREE.OctahedronGeometry(0.04));
  for (let i = 0; i < 14; i += 1) {
    const spark = new THREE.Mesh(sparkGeometry, sparkMaterial);
    spark.userData.angle = (i / 14) * Math.PI * 2;
    spark.userData.speed = 0.6 + (i % 4) * 0.18;
    sparks.add(spark);
  }
  root.add(beam, ring, sparks);
  root.visible = false;
  const update = (age: number, reducedMotion: boolean) => {
    const duration = reducedMotion ? 0.3 : 0.9;
    const t = age / duration;
    root.visible = t >= 0 && t < 1;
    if (!root.visible) return;
    beamMaterial.opacity = (1 - t) * 0.85;
    beam.scale.set(1 - t * 0.6, 1, 1 - t * 0.6);
    ringMaterial.opacity = (1 - t) * 0.9;
    ring.scale.setScalar(1 + t * 4);
    sparkMaterial.opacity = 1 - t;
    sparks.children.forEach((spark) => {
      const angle = spark.userData.angle as number;
      const radius = t * 1.1 * (spark.userData.speed as number);
      spark.position.set(Math.cos(angle) * radius, 0.2 + Math.sin(t * Math.PI) * 0.8 * (spark.userData.speed as number), Math.sin(angle) * radius);
    });
  };
  return { root, update, dispose: () => { root.parent?.remove(root); disposables.forEach((item) => item.dispose()); } };
}

export const WIZARD_ZAP_SECONDS = 0.9;
