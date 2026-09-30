import * as THREE from 'three';

/**
 * Island 002 Stormfront add-on structures on the 3D board (presentation only):
 * - Storm-Safe Lightning Grid: lightning rods around the board path and a
 *   copper grounding ring. L1: two rods; L2: four rods and the ring; L3: six
 *   rods with glowing tips and arcs crackling between them.
 * - Covered Sky Hangar: a covered landing strip by the Event Arena where the
 *   arena planes take off and are stored. L1: runway; L2: arched frame;
 *   L3: full cover, parked planes and a plane that takes off and returns.
 * Level 0 (after the strike, not started) shows survey stakes where each one
 * will stand. Never writes gameplay state.
 */

const ROD_SLOTS = 6;
const RODS_BY_LEVEL = [0, 2, 4, 6];
const HANGAR_LENGTH = 6.4;
const HANGAR_WIDTH = 2.3;
const PLANE_LOOP_SECONDS = 14;

function createPlane(bodyColor: string, stripeColor: string) {
  const plane = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.45, metalness: 0.2 });
  const stripe = new THREE.MeshStandardMaterial({ color: stripeColor, roughness: 0.5 });
  const fuselage = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.9, 4, 10), body);
  fuselage.rotation.z = Math.PI / 2;
  plane.add(fuselage);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 1.3), stripe);
  wing.position.set(0.05, 0, 0);
  plane.add(wing);
  const tailWing = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.03, 0.5), stripe);
  tailWing.position.set(-0.55, 0.04, 0);
  plane.add(tailWing);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 0.03), stripe);
  fin.position.set(-0.56, 0.17, 0);
  plane.add(fin);
  const propeller = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.42, 0.05), new THREE.MeshStandardMaterial({ color: '#2b2f36' }));
  propeller.position.set(0.63, 0, 0);
  plane.add(propeller);
  plane.traverse((node) => { if ((node as THREE.Mesh).isMesh) { node.castShadow = true; } });
  return { plane, propeller };
}

export function createStormfrontStructures() {
  const root = new THREE.Group();
  root.name = 'ISLAND_2_STORMFRONT_STRUCTURES';
  root.visible = false;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };

  const steel = track(new THREE.MeshStandardMaterial({ color: '#8f99a6', roughness: 0.4, metalness: 0.75 }));
  const copper = track(new THREE.MeshStandardMaterial({ color: '#c47a3c', roughness: 0.35, metalness: 0.8, emissive: '#ff9a4a', emissiveIntensity: 0 }));
  const tipGlow = track(new THREE.MeshStandardMaterial({ color: '#dfeeff', emissive: '#6fb0ff', emissiveIntensity: 0.2, roughness: 0.2 }));
  const stake = track(new THREE.MeshStandardMaterial({ color: '#ff8a1f', roughness: 0.6 }));
  const concrete = track(new THREE.MeshStandardMaterial({ color: '#b9b4aa', roughness: 0.9 }));

  // Lightning grid.
  const grid = new THREE.Group();
  root.add(grid);
  const rodGeometry = track(new THREE.CylinderGeometry(0.045, 0.07, 2.6, 8));
  const rodBaseGeometry = track(new THREE.CylinderGeometry(0.22, 0.28, 0.18, 10));
  const tipGeometry = track(new THREE.SphereGeometry(0.11, 12, 8));
  const stakeGeometry = track(new THREE.BoxGeometry(0.06, 0.55, 0.06));
  const rods = Array.from({ length: ROD_SLOTS }, () => {
    const group = new THREE.Group();
    const base = new THREE.Mesh(rodBaseGeometry, concrete);
    base.position.y = 0.09;
    const rod = new THREE.Mesh(rodGeometry, steel);
    rod.position.y = 1.4;
    const tip = new THREE.Mesh(tipGeometry, tipGlow);
    tip.position.y = 2.75;
    const marker = new THREE.Mesh(stakeGeometry, stake);
    marker.position.y = 0.28;
    group.add(base, rod, tip, marker);
    [base, rod, tip].forEach((mesh) => { mesh.castShadow = true; });
    grid.add(group);
    return { group, parts: [base, rod, tip], marker, tip };
  });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1, 0.05, 6, 128), copper);
  ring.rotation.x = Math.PI / 2;
  track(ring.geometry);
  grid.add(ring);
  // Arcs between adjacent rod tips at L3.
  const arcMaterial = track(new THREE.LineBasicMaterial({ color: '#cfe6ff', transparent: true, opacity: 0 }));
  const arcGeometry = track(new THREE.BufferGeometry());
  arcGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(10 * 6), 3));
  const arc = new THREE.LineSegments(arcGeometry, arcMaterial);
  arc.frustumCulled = false;
  grid.add(arc);

  // Covered sky hangar.
  const hangar = new THREE.Group();
  root.add(hangar);
  // The hangar stands on its own floating sky-dock beside the island (clear of
  // every landmark on any island), linked to the rim by a short bridge.
  const dockRadius = HANGAR_LENGTH / 2 + 0.9;
  const dockTop = new THREE.Mesh(track(new THREE.CylinderGeometry(dockRadius, dockRadius * 0.96, 0.35, 14)), track(new THREE.MeshStandardMaterial({ color: '#8fc56a', roughness: 0.9 })));
  dockTop.position.y = -0.175;
  dockTop.scale.z = (HANGAR_WIDTH / 2 + 1.1) / dockRadius;
  dockTop.receiveShadow = true;
  const dockRock = new THREE.Mesh(track(new THREE.ConeGeometry(dockRadius * 0.95, 3.2, 12)), track(new THREE.MeshStandardMaterial({ color: '#a39f98', roughness: 1, flatShading: true })));
  dockRock.rotation.x = Math.PI;
  dockRock.position.y = -0.35 - 1.6;
  dockRock.scale.z = dockTop.scale.z;
  const bridge = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 0.12, 1)), track(new THREE.MeshStandardMaterial({ color: '#c9a878', roughness: 0.8 })));
  bridge.castShadow = true;
  hangar.add(dockTop, dockRock, bridge);
  const runway = new THREE.Mesh(track(new THREE.BoxGeometry(HANGAR_LENGTH, 0.1, HANGAR_WIDTH)), track(new THREE.MeshStandardMaterial({ color: '#3b4048', roughness: 0.85 })));
  runway.position.y = 0.05;
  runway.receiveShadow = true;
  hangar.add(runway);
  const markingMaterial = track(new THREE.MeshBasicMaterial({ color: '#f4f1e6' }));
  const markingGeometry = track(new THREE.BoxGeometry(0.45, 0.02, 0.08));
  const markings = Array.from({ length: 6 }, (_, i) => {
    const mark = new THREE.Mesh(markingGeometry, markingMaterial);
    mark.position.set(-HANGAR_LENGTH / 2 + 0.6 + i * 1.05, 0.11, 0);
    hangar.add(mark);
    return mark;
  });
  const edgeLightMaterial = track(new THREE.MeshStandardMaterial({ color: '#9fd2ff', emissive: '#4fa8ff', emissiveIntensity: 1.2 }));
  const edgeLightGeometry = track(new THREE.BoxGeometry(0.1, 0.06, 0.1));
  const edgeLights: THREE.Mesh[] = [];
  for (let i = 0; i < 7; i += 1) {
    for (const side of [-1, 1]) {
      const light = new THREE.Mesh(edgeLightGeometry, edgeLightMaterial);
      light.position.set(-HANGAR_LENGTH / 2 + 0.3 + i * ((HANGAR_LENGTH - 0.6) / 6), 0.12, side * (HANGAR_WIDTH / 2 - 0.08));
      hangar.add(light);
      edgeLights.push(light);
    }
  }
  const ribGeometry = track(new THREE.TorusGeometry(HANGAR_WIDTH / 2 + 0.05, 0.06, 6, 20, Math.PI));
  const ribs = Array.from({ length: 5 }, (_, i) => {
    const rib = new THREE.Mesh(ribGeometry, steel);
    rib.position.set(-HANGAR_LENGTH / 2 + 1.1 + i * 1.05, 0.1, 0);
    rib.rotation.y = Math.PI / 2;
    rib.castShadow = true;
    hangar.add(rib);
    return rib;
  });
  const roofMaterial = track(new THREE.MeshStandardMaterial({ color: '#dfe7ef', roughness: 0.35, metalness: 0.4, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
  const roof = new THREE.Mesh(track(new THREE.CylinderGeometry(HANGAR_WIDTH / 2 + 0.08, HANGAR_WIDTH / 2 + 0.08, 4.6, 24, 1, true, -Math.PI / 2, Math.PI)), roofMaterial);
  roof.rotation.z = Math.PI / 2;
  roof.position.set(-HANGAR_LENGTH / 2 + 3.2, 0.1, 0);
  roof.castShadow = true;
  hangar.add(roof);
  const stakeMarkers = [[-1, -1], [-1, 1], [1, -1], [1, 1]].map(([x, z]) => {
    const marker = new THREE.Mesh(stakeGeometry, stake);
    marker.position.set(x * HANGAR_LENGTH / 2, 0.28, z * HANGAR_WIDTH / 2);
    hangar.add(marker);
    return marker;
  });
  const parked = [createPlane('#f4f6fa', '#e0343a'), createPlane('#f4f6fa', '#2f6fe0')];
  parked.forEach((entry, i) => {
    entry.plane.position.set(-HANGAR_LENGTH / 2 + 1.5 + i * 1.9, 0.33, i === 0 ? -0.35 : 0.35);
    entry.plane.rotation.y = Math.PI;
    hangar.add(entry.plane);
  });
  const flyer = createPlane('#fff7e8', '#f2b322');
  hangar.add(flyer.plane);
  parked.concat(flyer).forEach((entry) => entry.plane.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh) { track(mesh.geometry); track(mesh.material as THREE.Material); }
  }));

  const gridFlagAnchor = new THREE.Vector3();
  const hangarFlagAnchor = new THREE.Vector3();
  let placed = false;
  let gridLevel = 0;
  let hangarLevel = 0;

  /**
   * Places the structures once: rods just outside the board path, the ring
   * around it, and the hangar past the Event Arena on solid ground.
   */
  function place(options: {
    tilePositions: ReadonlyArray<readonly [number, number, number]>;
    eventCentre: THREE.Vector3 | null;
    groundAt: (x: number, z: number) => number | null;
    /** Landmark bounds the hangar footprint must stay clear of. */
    blockers?: readonly THREE.Box3[];
    /** Camera position: the dock leans to the far side so it stays in frame. */
    viewFrom?: THREE.Vector3;
  }) {
    const { tilePositions, eventCentre, groundAt } = options;
    const blockers = options.blockers ?? [];
    if (tilePositions.length < 6) return;
    const centroid = new THREE.Vector3();
    tilePositions.forEach(([x, y, z]) => centroid.add(new THREE.Vector3(x, y, z)));
    centroid.divideScalar(tilePositions.length);
    const pathRadius = tilePositions.reduce((sum, [x, , z]) => sum + Math.hypot(x - centroid.x, z - centroid.z), 0) / tilePositions.length;
    const maxRadius = Math.max(...tilePositions.map(([x, , z]) => Math.hypot(x - centroid.x, z - centroid.z)));
    rods.forEach((rod, index) => {
      const tile = tilePositions[Math.floor(((index + 0.5) / ROD_SLOTS) * tilePositions.length) % tilePositions.length];
      const out = new THREE.Vector3(tile[0] - centroid.x, 0, tile[2] - centroid.z).normalize();
      let x = tile[0] + out.x * 1.25;
      let z = tile[2] + out.z * 1.25;
      // Hits far above the path are tree canopies or roofs, not ground.
      const ground = (gx: number, gz: number) => { const h = groundAt(gx, gz); return h !== null && Math.abs(h - tile[1]) < 0.8 ? h : null; };
      let y = ground(x, z);
      if (y === null) { x = tile[0] - out.x * 1.1; z = tile[2] - out.z * 1.1; y = ground(x, z) ?? tile[1]; }
      rod.group.position.set(x, y, z);
    });
    ring.position.set(centroid.x, centroid.y + 0.06, centroid.z);
    ring.scale.setScalar(pathRadius + 0.75);
    // Hangar: past the Event Arena, pulled inward until it sits on ground.
    const dir = eventCentre
      ? new THREE.Vector3(eventCentre.x - centroid.x, 0, eventCentre.z - centroid.z)
      : new THREE.Vector3(1, 0, 0);
    if (dir.lengthSq() < 1e-4) dir.set(1, 0, 0);
    dir.normalize();
    const tangent = new THREE.Vector3(-dir.z, 0, dir.x);
    // Sky-dock: beside the Event Arena, pushed out until its footprint clears
    // every landmark, level with the board path.
    const pathY = [...tilePositions.map(([, y]) => y)].sort((a, b) => a - b)[Math.floor(tilePositions.length / 2)];
    const out = dir.clone();
    if (options.viewFrom) {
      const toCamera = new THREE.Vector3(options.viewFrom.x - centroid.x, 0, options.viewFrom.z - centroid.z);
      if (toCamera.lengthSq() > 1e-4) out.multiplyScalar(0.35).addScaledVector(toCamera.normalize(), -1).normalize();
    }
    const along = new THREE.Vector3(-out.z, 0, out.x);
    const halfDepth = HANGAR_WIDTH / 2 + 1.1;
    const clearOf = (cx: number, cz: number) => [-1, 0, 1].every((a) => [-1, 1].every((b) => {
      const x = cx + along.x * a * dockRadius + out.x * b * halfDepth;
      const z = cz + along.z * a * dockRadius + out.z * b * halfDepth;
      return !blockers.some((box) => x > box.min.x - 0.3 && x < box.max.x + 0.3 && z > box.min.z - 0.3 && z < box.max.z + 0.3);
    }));
    let distance = maxRadius + halfDepth + 0.8;
    for (let step = 0; step < 16 && !clearOf(centroid.x + out.x * distance, centroid.z + out.z * distance); step += 1) distance += 0.6;
    const chosen = { x: centroid.x + out.x * distance, y: pathY, z: centroid.z + out.z * distance, along, out };
    hangar.position.set(chosen.x, chosen.y, chosen.z);
    hangar.rotation.y = Math.atan2(-chosen.along.z, chosen.along.x);
    // Bridge from the dock's inner edge back towards the island rim.
    const rimGap = Math.max(0.6, distance - halfDepth - maxRadius + 0.6);
    bridge.scale.z = rimGap;
    const inwardLocal = new THREE.Vector3(-out.x, 0, -out.z).applyAxisAngle(new THREE.Vector3(0, 1, 0), -hangar.rotation.y);
    bridge.position.set(inwardLocal.x * (halfDepth + rimGap / 2), -0.05, inwardLocal.z * (halfDepth + rimGap / 2));
    bridge.rotation.y = Math.atan2(inwardLocal.x, inwardLocal.z);

    gridFlagAnchor.copy(rods[0].group.position).add(new THREE.Vector3(0.45, 0, 0.45));
    hangarFlagAnchor.copy(hangar.position).addScaledVector(chosen.out, HANGAR_WIDTH / 2 + 0.5);
    root.userData.hangarPlacement = `sky-dock@${distance.toFixed(1)}`;
    placed = true;
  }

  function setLevels(grid: number, hangarLvl: number) {
    gridLevel = Math.max(0, Math.min(3, Math.floor(grid)));
    hangarLevel = Math.max(0, Math.min(3, Math.floor(hangarLvl)));
    rods.forEach((rod, index) => {
      const built = index < RODS_BY_LEVEL[gridLevel];
      rod.parts.forEach((part) => { part.visible = built; });
      // Survey stakes show where the next rods go.
      rod.marker.visible = !built && index < RODS_BY_LEVEL[Math.min(3, gridLevel + 1)];
    });
    ring.visible = gridLevel >= 2;
    runway.visible = hangarLevel >= 1;
    markings.forEach((mark) => { mark.visible = hangarLevel >= 1; });
    edgeLights.forEach((light) => { light.visible = hangarLevel >= 1; });
    ribs.forEach((rib) => { rib.visible = hangarLevel >= 2; });
    roof.visible = hangarLevel >= 3;
    parked.forEach((entry) => { entry.plane.visible = hangarLevel >= 3; });
    flyer.plane.visible = hangarLevel >= 3;
    stakeMarkers.forEach((marker) => { marker.visible = hangarLevel === 0; });
  }

  const arcPoint = new THREE.Vector3();
  function update(t: number, reducedMotion: boolean) {
    if (!placed) return;
    tipGlow.emissiveIntensity = gridLevel >= 3 ? (reducedMotion ? 1.4 : 1.2 + Math.sin(t * 3) * 0.5) : 0.25;
    copper.emissiveIntensity = gridLevel >= 3 ? 0.25 + (reducedMotion ? 0 : Math.max(0, Math.sin(t * 1.3)) * 0.35) : 0;
    edgeLightMaterial.emissiveIntensity = reducedMotion ? 1.2 : 0.8 + Math.max(0, Math.sin(t * 4)) * 0.8;
    // Arcs: every few seconds a crackle jumps between two neighbouring rods.
    const cycle = t % 3.2;
    const arcVisible = gridLevel >= 3 && !reducedMotion && cycle < 0.28;
    arcMaterial.opacity = arcVisible ? 0.9 * (1 - cycle / 0.28) : 0;
    if (arcVisible) {
      const pair = Math.floor(t / 3.2) % ROD_SLOTS;
      const a = rods[pair].tip.getWorldPosition(new THREE.Vector3());
      const b = rods[(pair + 1) % ROD_SLOTS].tip.getWorldPosition(new THREE.Vector3());
      grid.worldToLocal(a);
      grid.worldToLocal(b);
      const positions = arcGeometry.getAttribute('position') as THREE.BufferAttribute;
      let previous = a.clone();
      for (let i = 1; i <= 10; i += 1) {
        arcPoint.copy(a).lerp(b, i / 10);
        if (i < 10) {
          arcPoint.y += Math.sin(i * 1.7 + t * 40) * 0.25 + 0.4 * Math.sin((i / 10) * Math.PI);
          arcPoint.x += Math.sin(i * 2.9 + t * 31) * 0.15;
        }
        positions.setXYZ((i - 1) * 2, previous.x, previous.y, previous.z);
        positions.setXYZ((i - 1) * 2 + 1, arcPoint.x, arcPoint.y, arcPoint.z);
        previous = arcPoint.clone();
      }
      positions.needsUpdate = true;
    }
    // Takeoff loop: roll out of the hangar, climb away, return and park.
    if (flyer.plane.visible) {
      parked.forEach((entry) => { entry.propeller.rotation.x = reducedMotion ? 0 : t * 30; });
      if (reducedMotion) {
        flyer.plane.position.set(HANGAR_LENGTH / 2 - 0.9, 0.33, 0);
        flyer.plane.rotation.set(0, 0, 0);
      } else {
        const p = (t % PLANE_LOOP_SECONDS) / PLANE_LOOP_SECONDS;
        const s = THREE.MathUtils.smoothstep;
        const x0 = -HANGAR_LENGTH / 2 + 3.4;
        const x1 = HANGAR_LENGTH / 2;
        let x: number; let y: number; let heading = 0; let pitch = 0; let scale = 1;
        if (p < 0.3) {
          // Taxi out of the hangar and roll down the strip.
          x = THREE.MathUtils.lerp(x0, x1, s(p, 0.05, 0.3));
          y = 0.33 + s(p, 0.2, 0.3) * 0.4;
        } else if (p < 0.55) {
          // Climb out and away.
          const u = (p - 0.3) / 0.25;
          x = x1 + u * 9;
          y = 0.73 + u * 3;
          pitch = 0.25;
          scale = 1 - s(p, 0.48, 0.55);
        } else if (p < 0.72) {
          x = x1 + 9; y = 3.7; scale = 0;
        } else {
          // Glide home, land and roll back under the cover.
          const u = s(p, 0.72, 0.95);
          x = THREE.MathUtils.lerp(x1 + 7, x0, u);
          y = 0.33 + (1 - s(p, 0.72, 0.84)) * 2.6;
          heading = Math.PI;
          pitch = p < 0.84 ? -0.12 : 0;
          scale = s(p, 0.72, 0.76);
        }
        flyer.plane.position.set(x, y, 0);
        flyer.plane.rotation.set(0, heading, pitch);
        flyer.plane.scale.setScalar(scale);
        flyer.propeller.rotation.x = t * 40;
      }
    }
  }

  return {
    root,
    get placed() { return placed; },
    place,
    setLevels,
    update,
    gridFlagAnchor,
    hangarFlagAnchor,
    hitTargets: [grid, hangar] as THREE.Object3D[],
    dispose() {
      root.parent?.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
