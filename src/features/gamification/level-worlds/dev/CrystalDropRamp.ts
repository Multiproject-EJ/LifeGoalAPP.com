import * as THREE from 'three';

/**
 * Island 002 corner landmark variant: a Crystal Miners drop ramp
 * (user decision 2026-10-02; presentation only).
 *
 * Celestial Sky Kingdom floats above the clouds. Each corner landmark becomes
 * a ski-jump launch ramp that points off the island's edge; when a Crystal
 * Miners expedition starts, a drill pod slides down every ramp, launches off
 * the kicker and dives down past the island into the clouds — into the mine.
 * Built like any landmark:
 * - L1: a crystal-studded launch pad and the back scaffold tower;
 * - L2: the curved track with rails and supports;
 * - L3: a drill pod loaded at the top, a pulsing beacon and rail lights.
 *
 * Local space: the ramp runs along +Z, which the caller turns to face outward.
 */
export const CRYSTAL_DROP_RAMP_LAUNCH_MS = 2600;

export function createCrystalDropRamp(options: { level: number; size: number }) {
  const level = Math.max(0, Math.min(3, Math.floor(options.level)));
  const s = Math.max(0.4, options.size);
  const root = new THREE.Group();
  root.name = 'ISLAND_2_CRYSTAL_DROP_RAMP';
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };

  const steel = track(new THREE.MeshStandardMaterial({ color: '#c3d2e2', roughness: 0.35, metalness: 0.6 }));
  const deckMat = track(new THREE.MeshStandardMaterial({ color: '#d9e4ef', roughness: 0.5, metalness: 0.25 }));
  const padMat = track(new THREE.MeshStandardMaterial({ color: '#f1ead8', roughness: 0.5, metalness: 0.2 }));
  const crystalMat = track(new THREE.MeshStandardMaterial({ color: '#8ef6ff', emissive: '#39c6ff', emissiveIntensity: 0.9, roughness: 0.15, flatShading: true }));
  const glowMat = track(new THREE.MeshBasicMaterial({ color: '#9ff7ff' }));
  const podMat = track(new THREE.MeshStandardMaterial({ color: '#ffb03a', roughness: 0.35, metalness: 0.55, emissive: '#5a2a00', emissiveIntensity: 0.35 }));
  const drillMat = track(new THREE.MeshStandardMaterial({ color: '#c9d3dd', roughness: 0.25, metalness: 0.9 }));

  // L1: launch pad + crystal studs + back scaffold tower.
  const pad = new THREE.Mesh(track(new THREE.CylinderGeometry(s * 0.46, s * 0.5, s * 0.08, 6)), padMat);
  pad.position.y = s * 0.04;
  pad.castShadow = true;
  pad.receiveShadow = true;
  root.add(pad);
  const goldMat = track(new THREE.MeshStandardMaterial({ color: '#f5cc4e', roughness: 0.3, metalness: 0.75 }));
  const trim = new THREE.Mesh(track(new THREE.TorusGeometry(s * 0.48, s * 0.018, 6, 6)), goldMat);
  trim.rotation.x = Math.PI / 2;
  trim.rotation.z = Math.PI / 6;
  trim.position.y = s * 0.08;
  root.add(trim);
  const studGeometry = track(new THREE.OctahedronGeometry(s * 0.06, 0));
  for (let i = 0; i < 6; i += 1) {
    const a = (i / 6) * Math.PI * 2;
    const stud = new THREE.Mesh(studGeometry, crystalMat);
    stud.position.set(Math.cos(a) * s * 0.42, s * 0.12, Math.sin(a) * s * 0.42);
    stud.scale.y = 1.6;
    root.add(stud);
  }
  const towerHeight = level >= 2 ? s * 0.95 : s * 0.45;
  const legGeometry = track(new THREE.BoxGeometry(s * 0.04, towerHeight, s * 0.04));
  for (const x of [-1, 1]) for (const z of [-1, 1]) {
    const leg = new THREE.Mesh(legGeometry, steel);
    leg.position.set(x * s * 0.14, s * 0.08 + towerHeight / 2, -s * 0.34 + z * s * 0.08);
    leg.castShadow = true;
    root.add(leg);
  }
  const braceGeometry = track(new THREE.BoxGeometry(s * 0.32, s * 0.025, s * 0.025));
  for (let k = 1; k <= 3; k += 1) {
    const brace = new THREE.Mesh(braceGeometry, steel);
    brace.position.set(0, s * 0.08 + (towerHeight * k) / 4, -s * 0.26);
    root.add(brace);
  }

  // The ski-jump path: high at the back, a long dip, then a kicker at the edge.
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, s * 1.02, -s * 0.34),
    new THREE.Vector3(0, s * 0.7, -s * 0.1),
    new THREE.Vector3(0, s * 0.28, s * 0.22),
    new THREE.Vector3(0, s * 0.24, s * 0.42),
    new THREE.Vector3(0, s * 0.36, s * 0.62),
  ]);
  if (level >= 2) {
    const railGeometry = track(new THREE.TubeGeometry(curve, 40, s * 0.018, 6, false));
    for (const x of [-1, 1]) {
      const rail = new THREE.Mesh(railGeometry, steel);
      rail.position.x = x * s * 0.11;
      root.add(rail);
    }
    const plankGeometry = track(new THREE.BoxGeometry(s * 0.22, s * 0.02, s * 0.055));
    for (let i = 0; i <= 14; i += 1) {
      const u = i / 14;
      const plank = new THREE.Mesh(plankGeometry, deckMat);
      plank.position.copy(curve.getPointAt(u)).add(new THREE.Vector3(0, -s * 0.015, 0));
      plank.lookAt(plank.position.clone().add(curve.getTangentAt(u)));
      root.add(plank);
    }
    const strutGeometry = track(new THREE.CylinderGeometry(s * 0.018, s * 0.022, 1, 6));
    for (const u of [0.35, 0.6, 0.82, 0.97]) {
      const p = curve.getPointAt(u);
      const height = Math.max(0.01, p.y - s * 0.08);
      for (const x of [-1, 1]) {
        const strut = new THREE.Mesh(strutGeometry, steel);
        strut.scale.y = height;
        strut.position.set(x * s * 0.11, s * 0.08 + height / 2, p.z);
        root.add(strut);
      }
    }
  }

  // L3: beacon, rail lights and the loaded drill pod.
  const beacon = new THREE.Mesh(track(new THREE.OctahedronGeometry(s * 0.09, 0)), crystalMat);
  beacon.position.set(0, s * 0.08 + towerHeight + s * 0.12, -s * 0.34);
  beacon.scale.y = 1.7;
  beacon.visible = level >= 3;
  root.add(beacon);
  const lights: THREE.Mesh[] = [];
  if (level >= 3) {
    const lightGeometry = track(new THREE.SphereGeometry(s * 0.022, 8, 6));
    for (let i = 0; i < 8; i += 1) {
      const u = 0.08 + (i / 7) * 0.88;
      for (const x of [-1, 1]) {
        const light = new THREE.Mesh(lightGeometry, glowMat);
        light.position.copy(curve.getPointAt(u)).add(new THREE.Vector3(x * s * 0.13, s * 0.03, 0));
        light.userData.u = u;
        root.add(light);
        lights.push(light);
      }
    }
  }
  const pod = new THREE.Group();
  const body = new THREE.Mesh(track(new THREE.CylinderGeometry(s * 0.11, s * 0.11, s * 0.28, 14)), podMat);
  body.rotation.x = Math.PI / 2;
  const drill = new THREE.Mesh(track(new THREE.ConeGeometry(s * 0.11, s * 0.2, 14)), drillMat);
  drill.rotation.x = Math.PI / 2;
  drill.position.z = s * 0.24;
  const podWindow = new THREE.Mesh(track(new THREE.SphereGeometry(s * 0.065, 10, 8)), crystalMat);
  podWindow.position.set(0, s * 0.09, -s * 0.03);
  pod.add(body, drill, podWindow);
  pod.castShadow = true;
  root.add(pod);
  const podStart = level >= 2 ? curve.getPointAt(0).clone().add(new THREE.Vector3(0, s * 0.1, 0)) : new THREE.Vector3(0, s * 0.16, 0);
  // Crystal trail: glowing beads that follow the pod once it leaves the kicker.
  const trailMat = track(new THREE.MeshBasicMaterial({ color: '#9ff7ff', transparent: true, opacity: 0.85, depthWrite: false, blending: THREE.AdditiveBlending }));
  const trailGeometry = track(new THREE.SphereGeometry(s * 0.06, 8, 6));
  const trail = Array.from({ length: 10 }, (_, index) => {
    const bead = new THREE.Mesh(trailGeometry, trailMat);
    bead.scale.setScalar(1 - index * 0.085);
    bead.visible = false;
    root.add(bead);
    return bead;
  });
  const trailHistory: THREE.Vector3[] = [];
  const restPod = () => {
    trailHistory.length = 0;
    trail.forEach((bead) => { bead.visible = false; });
    pod.position.copy(podStart);
    pod.rotation.set(level >= 2 ? 0.55 : 0, 0, 0);
    pod.scale.setScalar(1);
    pod.visible = level >= 3;
  };
  restPod();

  const kickerEnd = curve.getPointAt(1);
  const kickerDir = curve.getTangentAt(1).normalize();
  const flightSpeed = s * 2.6;
  const gravity = s * 9;
  /**
   * 0..1 launch progress (each ramp is staggered by the caller). Slide down
   * the track, leave the kicker, then fall past the island into the clouds.
   */
  function setLaunchProgress(progress: number) {
    if (progress <= 0) { restPod(); if (level >= 3) pod.visible = true; return; }
    pod.visible = progress < 1;
    if (progress >= 1) { trail.forEach((bead) => { bead.visible = false; }); return; }
    const slideEnd = level >= 2 ? 0.34 : 0.12;
    if (progress < slideEnd) {
      const u = progress / slideEnd;
      if (level >= 2) {
        const eased = u * u;
        pod.position.copy(curve.getPointAt(eased)).add(new THREE.Vector3(0, s * 0.1, 0));
        const tangent = curve.getTangentAt(eased);
        pod.rotation.set(-Math.atan2(tangent.y, tangent.z), 0, 0);
      } else {
        pod.position.copy(podStart).add(new THREE.Vector3(0, u * s * 0.3, 0));
      }
      return;
    }
    const time = (progress - slideEnd) * (CRYSTAL_DROP_RAMP_LAUNCH_MS / 1000);
    const start = level >= 2 ? kickerEnd : podStart.clone().add(new THREE.Vector3(0, s * 0.3, 0));
    const dir = level >= 2 ? kickerDir : new THREE.Vector3(0, 0.6, 0.8).normalize();
    const vy = dir.y * flightSpeed - gravity * time;
    pod.position.set(0, start.y + dir.y * flightSpeed * time - 0.5 * gravity * time * time, start.z + dir.z * flightSpeed * time);
    pod.rotation.set(-Math.atan2(vy, dir.z * flightSpeed), 0, 0);
    drill.rotation.y += 0.6;
    pod.scale.setScalar(Math.max(0.45, 1 - time * 0.3));
    trailHistory.unshift(pod.position.clone());
    if (trailHistory.length > trail.length * 2) trailHistory.length = trail.length * 2;
    trail.forEach((bead, index) => {
      const point = trailHistory[index * 2 + 1];
      bead.visible = Boolean(point);
      if (point) bead.position.copy(point);
    });
  }

  function update(t: number, reducedMotion: boolean) {
    if (level < 3) return;
    beacon.rotation.y = reducedMotion ? 0 : t * 0.9;
    const pulse = reducedMotion ? 1 : 0.85 + Math.sin(t * 3) * 0.15;
    beacon.scale.set(pulse, 1.7 * pulse, pulse);
    lights.forEach((light) => {
      const u = light.userData.u as number;
      const on = reducedMotion ? 1 : (Math.sin(t * 6 - u * 12) + 1) / 2;
      light.scale.setScalar(0.6 + on * 0.6);
    });
  }

  function dispose() {
    disposables.forEach((item) => item.dispose());
  }

  return { root, pod, setLaunchProgress, update, dispose };
}
