import * as THREE from 'three';

/**
 * Island 002 centre landmark variant: the Golden Sky Lift (presentation only).
 *
 * A massive, intricate golden lift that carries up to 200 guests at a time.
 * Its shaft sinks into a swirling cloud well in the middle of the island (the
 * guests ride up out of the clouds) and rises as an ornate golden tower.
 * Built like any landmark:
 * - L1: the gilded base ring and the cloud well, with four pillar stubs;
 * - L2: the full four-pillar lattice tower with golden rings;
 * - L3: the crown dome, a glowing glass cabin riding the shaft, light rays,
 *   and guests streaming off towards the Opening Arena.
 */
export function createGoldenSkyLift(options: { level: number; height: number; radius: number }) {
  const { level, height, radius } = options;
  const root = new THREE.Group();
  root.name = 'ISLAND_2_GOLDEN_SKY_LIFT';
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };

  const gold = track(new THREE.MeshStandardMaterial({ color: '#f5cc4e', roughness: 0.26, metalness: 0.75, emissive: '#7a5200', emissiveIntensity: 0.4 }));
  const paleGold = track(new THREE.MeshStandardMaterial({ color: '#f6dc86', roughness: 0.3, metalness: 0.8 }));
  const ivory = track(new THREE.MeshStandardMaterial({ color: '#f5efe0', roughness: 0.55 }));
  const cloudMat = track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, transparent: true, opacity: 0.92 }));
  const wellMat = track(new THREE.MeshBasicMaterial({ color: '#9fd7ff' }));

  // Base: gilded ring platform around the cloud well.
  const base = new THREE.Mesh(track(new THREE.CylinderGeometry(radius, radius * 1.08, radius * 0.16, 40, 1, false)), ivory);
  base.position.y = radius * 0.08;
  base.castShadow = true;
  base.receiveShadow = true;
  root.add(base);
  const trim = new THREE.Mesh(track(new THREE.TorusGeometry(radius * 1.02, radius * 0.035, 8, 64)), gold);
  trim.rotation.x = Math.PI / 2;
  trim.position.y = radius * 0.16;
  root.add(trim);
  const well = new THREE.Mesh(track(new THREE.CircleGeometry(radius * 0.62, 40)), wellMat);
  well.rotation.x = -Math.PI / 2;
  well.position.y = radius * 0.165;
  root.add(well);
  // Cloud swirl inside the well: the shaft disappears down into the clouds.
  const cloudGeometry = track(new THREE.SphereGeometry(1, 12, 8));
  const clouds = new THREE.Group();
  for (let i = 0; i < 9; i += 1) {
    const puff = new THREE.Mesh(cloudGeometry, cloudMat);
    const a = (i / 9) * Math.PI * 2;
    puff.position.set(Math.cos(a) * radius * 0.36, radius * 0.17, Math.sin(a) * radius * 0.36);
    puff.scale.set(radius * 0.22, radius * 0.07, radius * 0.2);
    clouds.add(puff);
  }
  root.add(clouds);

  // Four golden pillars (stubs at L1, full height from L2).
  const pillarHeight = level >= 2 ? height : height * 0.18;
  const pillarGeometry = track(new THREE.CylinderGeometry(radius * 0.055, radius * 0.07, pillarHeight, 10));
  for (let i = 0; i < 4; i += 1) {
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    const pillar = new THREE.Mesh(pillarGeometry, gold);
    pillar.position.set(Math.cos(a) * radius * 0.5, radius * 0.16 + pillarHeight / 2, Math.sin(a) * radius * 0.5);
    pillar.castShadow = true;
    root.add(pillar);
  }
  if (level >= 2) {
    // Golden rings and filigree bracing up the tower.
    const ringGeometry = track(new THREE.TorusGeometry(radius * 0.55, radius * 0.025, 6, 40));
    const rings = 6;
    for (let i = 1; i <= rings; i += 1) {
      const ring = new THREE.Mesh(ringGeometry, i % 2 === 0 ? gold : paleGold);
      ring.rotation.x = Math.PI / 2;
      ring.position.y = radius * 0.16 + (height * i) / (rings + 1);
      root.add(ring);
    }
    const braceGeometry = track(new THREE.BoxGeometry(radius * 0.02, height / (rings + 1) * 1.35, radius * 0.02));
    for (let i = 0; i < rings; i += 1) {
      for (let side = 0; side < 4; side += 1) {
        const a = (side / 4) * Math.PI * 2;
        const brace = new THREE.Mesh(braceGeometry, paleGold);
        brace.position.set(Math.cos(a) * radius * 0.54, radius * 0.16 + (height * (i + 0.5)) / (rings + 1) + height / (rings + 1) * 0.5, Math.sin(a) * radius * 0.54);
        brace.rotation.set(0, -a, (i % 2 === 0 ? 1 : -1) * 0.75);
        root.add(brace);
      }
    }
  }

  // L3: crown dome, riding glass cabin, light rays and streaming guests.
  let cabin: THREE.Group | null = null;
  const walkers: THREE.InstancedMesh | null = level >= 3
    ? new THREE.InstancedMesh(track(new THREE.BoxGeometry(radius * 0.035, radius * 0.07, radius * 0.035)), track(new THREE.MeshStandardMaterial({ roughness: 0.8 })), 40)
    : null;
  if (level >= 3) {
    const crownY = radius * 0.16 + height;
    const dome = new THREE.Mesh(track(new THREE.SphereGeometry(radius * 0.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2)), gold);
    dome.position.y = crownY;
    dome.castShadow = true;
    root.add(dome);
    const crownRing = new THREE.Mesh(track(new THREE.TorusGeometry(radius * 0.62, radius * 0.05, 8, 48)), paleGold);
    crownRing.rotation.x = Math.PI / 2;
    crownRing.position.y = crownY;
    root.add(crownRing);
    const spire = new THREE.Mesh(track(new THREE.ConeGeometry(radius * 0.08, radius * 0.7, 12)), gold);
    spire.position.y = crownY + radius * 0.85;
    root.add(spire);
    const orb = new THREE.Mesh(track(new THREE.SphereGeometry(radius * 0.09, 16, 12)), track(new THREE.MeshStandardMaterial({ color: '#fff6c8', emissive: '#ffd54a', emissiveIntensity: 2 })));
    orb.position.y = crownY + radius * 1.25;
    root.add(orb);
    cabin = new THREE.Group();
    const glass = new THREE.Mesh(track(new THREE.CylinderGeometry(radius * 0.36, radius * 0.36, radius * 0.5, 24, 1, true)), track(new THREE.MeshStandardMaterial({ color: '#bfe8ff', emissive: '#6fc3ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.55, side: THREE.DoubleSide })));
    const floor = new THREE.Mesh(track(new THREE.CylinderGeometry(radius * 0.38, radius * 0.38, radius * 0.05, 24)), gold);
    floor.position.y = -radius * 0.25;
    const roof = new THREE.Mesh(track(new THREE.CylinderGeometry(radius * 0.4, radius * 0.38, radius * 0.06, 24)), gold);
    roof.position.y = radius * 0.25;
    cabin.add(glass, floor, roof);
    root.add(cabin);
    // Soft light shaft through the tower.
    const beam = new THREE.Mesh(track(new THREE.CylinderGeometry(radius * 0.3, radius * 0.45, height, 20, 1, true)), track(new THREE.MeshBasicMaterial({ color: '#fff3c4', transparent: true, opacity: 0.12, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide })));
    beam.position.y = radius * 0.16 + height / 2;
    root.add(beam);
  }
  if (walkers) {
    const colors = ['#f4d35e', '#ee964b', '#f95738', '#3d7bff', '#ffffff', '#2fbf71'].map((c) => new THREE.Color(c));
    for (let i = 0; i < walkers.count; i += 1) walkers.setColorAt(i, colors[i % colors.length]);
    walkers.frustumCulled = false;
    root.add(walkers);
  }

  const matrix = new THREE.Matrix4();
  const crowdTargetLocal = new THREE.Vector3(radius * 4, 0, 0);
  function update(t: number, reducedMotion: boolean) {
    clouds.rotation.y = reducedMotion ? 0 : t * 0.25;
    if (cabin) {
      const ride = reducedMotion ? 0.5 : (Math.sin(t * 0.45) + 1) / 2;
      cabin.position.y = radius * 0.45 + ride * (height - radius * 0.6);
    }
    if (walkers) {
      // Guests step off the lift and walk in a stream to find their seats.
      for (let i = 0; i < walkers.count; i += 1) {
        const p = reducedMotion ? (i / walkers.count) : ((t * 0.06 + i / walkers.count) % 1);
        const x = THREE.MathUtils.lerp(radius * 0.7, crowdTargetLocal.x, p) + Math.sin(i * 12.9) * radius * 0.12;
        const z = THREE.MathUtils.lerp(0, crowdTargetLocal.z, p) + Math.cos(i * 7.3) * radius * 0.12;
        const hop = reducedMotion ? 0 : Math.abs(Math.sin(t * 6 + i)) * radius * 0.015;
        matrix.makeTranslation(x, radius * 0.2 + hop, z);
        walkers.setMatrixAt(i, matrix);
      }
      walkers.instanceMatrix.needsUpdate = true;
    }
  }

  return {
    root,
    update,
    /** Direction/distance (in the lift's local space) the guests walk towards. */
    setCrowdTarget(local: THREE.Vector3 | null) {
      if (walkers) walkers.visible = local !== null;
      if (local) crowdTargetLocal.copy(local);
    },
    dispose() {
      root.parent?.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
