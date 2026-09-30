import * as THREE from 'three';

/**
 * Island 002 Opening Arena hover base (presentation only).
 *
 * A massive flying construction plot: a thick disc with hover engines, rim
 * lights and a rocky keel. It is towed in by airship tugs over three rolls,
 * anchored beside the island with chains, carries a steel lattice and cranes,
 * and grows the Opening Arena in three levels (lower bowl → upper tier →
 * canopy, floodlights and crowd). Never writes gameplay state.
 */

export type OpeningArenaVisualStage = 'hidden' | 'in_transit' | 'arriving' | 'anchored';

const smooth = (t: number) => { const x = THREE.MathUtils.clamp(t, 0, 1); return x * x * (3 - 2 * x); };
export const OPENING_ARENA_ARRIVAL_SECONDS = 9;

function createRandom(seed: number) {
  let state = seed >>> 0;
  return () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
}

export function createOpeningArenaHoverBase() {
  const root = new THREE.Group();
  root.name = 'ISLAND_2_OPENING_ARENA_HOVER_BASE';
  root.visible = false;
  const disposables: Array<{ dispose: () => void }> = [];
  const track = <T extends { dispose: () => void }>(item: T) => { disposables.push(item); return item; };
  const random = createRandom(2002);

  // Everything is authored at unit scale (disc radius 1) and scaled on placement.
  const base = new THREE.Group();
  root.add(base);
  const steel = track(new THREE.MeshStandardMaterial({ color: '#8e98a6', roughness: 0.42, metalness: 0.78 }));
  const darkSteel = track(new THREE.MeshStandardMaterial({ color: '#46505e', roughness: 0.5, metalness: 0.7 }));
  const deck = track(new THREE.MeshStandardMaterial({ color: '#c7cdd6', roughness: 0.7, metalness: 0.25 }));
  const rock = track(new THREE.MeshStandardMaterial({ color: '#7d7468', roughness: 1, flatShading: true }));
  const engineGlow = track(new THREE.MeshBasicMaterial({ color: '#7fe3ff', transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false }));
  const rimLight = track(new THREE.MeshStandardMaterial({ color: '#fff4c2', emissive: '#ffd54a', emissiveIntensity: 1.3 }));

  const disc = new THREE.Mesh(track(new THREE.CylinderGeometry(1, 0.92, 0.12, 48)), deck);
  disc.receiveShadow = true;
  disc.castShadow = true;
  base.add(disc);
  const rim = new THREE.Mesh(track(new THREE.TorusGeometry(1, 0.035, 8, 96)), darkSteel);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.06;
  base.add(rim);
  const keel = new THREE.Mesh(track(new THREE.ConeGeometry(0.9, 0.9, 14)), rock);
  keel.rotation.x = Math.PI;
  keel.position.y = -0.51;
  base.add(keel);
  const lightGeometry = track(new THREE.BoxGeometry(0.03, 0.02, 0.03));
  for (let i = 0; i < 36; i += 1) {
    const a = (i / 36) * Math.PI * 2;
    const light = new THREE.Mesh(lightGeometry, rimLight);
    light.position.set(Math.cos(a) * 1.005, 0.07, Math.sin(a) * 1.005);
    base.add(light);
  }
  // Hover engines under the rim.
  const engineGeometry = track(new THREE.CylinderGeometry(0.09, 0.12, 0.08, 16));
  const glowGeometry = track(new THREE.CircleGeometry(0.1, 20));
  const engineGlows: THREE.Mesh[] = [];
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const engine = new THREE.Mesh(engineGeometry, darkSteel);
    engine.position.set(Math.cos(a) * 0.72, -0.1, Math.sin(a) * 0.72);
    base.add(engine);
    const glow = new THREE.Mesh(glowGeometry, engineGlow);
    glow.rotation.x = Math.PI / 2;
    glow.position.set(engine.position.x, -0.145, engine.position.z);
    base.add(glow);
    engineGlows.push(glow);
  }

  // Steel construction: lattice columns around the rim and two tower cranes.
  const construction = new THREE.Group();
  base.add(construction);
  const columnGeometry = track(new THREE.BoxGeometry(0.03, 0.42, 0.03));
  const beamGeometry = track(new THREE.BoxGeometry(0.2, 0.02, 0.02));
  const columns: THREE.Mesh[] = [];
  for (let i = 0; i < 18; i += 1) {
    const a = (i / 18) * Math.PI * 2;
    const column = new THREE.Mesh(columnGeometry, steel);
    column.position.set(Math.cos(a) * 0.82, 0.27, Math.sin(a) * 0.82);
    construction.add(column);
    columns.push(column);
    const beam = new THREE.Mesh(beamGeometry, steel);
    beam.position.set(Math.cos(a + Math.PI / 18) * 0.81, 0.44, Math.sin(a + Math.PI / 18) * 0.81);
    beam.rotation.y = -(a + Math.PI / 18) + Math.PI / 2;
    construction.add(beam);
  }
  const craneYellow = track(new THREE.MeshStandardMaterial({ color: '#f2b322', roughness: 0.5, metalness: 0.3 }));
  const cranes = [0.6, 3.6].map((angle) => {
    const crane = new THREE.Group();
    const mast = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 1.0, 0.05)), craneYellow);
    mast.position.y = 0.56;
    const jib = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 0.04, 0.04)), craneYellow);
    jib.position.set(0.22, 1.05, 0);
    const counter = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.07, 0.07)), darkSteel);
    counter.position.set(-0.15, 1.02, 0);
    const hook = new THREE.Mesh(track(new THREE.BoxGeometry(0.008, 0.4, 0.008)), darkSteel);
    hook.position.set(0.45, 0.84, 0);
    crane.add(mast, jib, counter, hook);
    crane.position.set(Math.cos(angle) * 0.55, 0, Math.sin(angle) * 0.55);
    crane.rotation.y = angle;
    construction.add(crane);
    return crane;
  });

  // The Opening Arena, level by level.
  const arena = new THREE.Group();
  base.add(arena);
  const seatA = track(new THREE.MeshStandardMaterial({ color: '#e84a5f', roughness: 0.6 }));
  const seatB = track(new THREE.MeshStandardMaterial({ color: '#f7f3ea', roughness: 0.6 }));
  const pitch = new THREE.Mesh(track(new THREE.CylinderGeometry(0.34, 0.34, 0.02, 40)), track(new THREE.MeshStandardMaterial({ color: '#3fae5a', roughness: 0.9 })));
  pitch.position.y = 0.07;
  pitch.scale.z = 0.72;
  arena.add(pitch);
  const tierGeometry = (inner: number, outer: number, height: number) => track(new THREE.CylinderGeometry(outer, inner, height, 56, 1, true));
  const makeTier = (inner: number, outer: number, height: number, y: number, material: THREE.Material) => {
    const tier = new THREE.Mesh(tierGeometry(inner, outer, height), material);
    tier.material = material;
    (tier.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    tier.position.y = y;
    tier.scale.z = 0.8;
    tier.castShadow = true;
    arena.add(tier);
    return tier;
  };
  const lowerBowl = [makeTier(0.38, 0.52, 0.12, 0.13, seatA), makeTier(0.52, 0.6, 0.06, 0.22, seatB)];
  const upperTier = [makeTier(0.6, 0.74, 0.16, 0.33, seatA), makeTier(0.74, 0.78, 0.06, 0.44, seatB)];
  const outerWall = new THREE.Mesh(track(new THREE.CylinderGeometry(0.79, 0.79, 0.42, 56, 1, true)), track(new THREE.MeshStandardMaterial({ color: '#d9d2c3', roughness: 0.7, side: THREE.DoubleSide })));
  outerWall.position.y = 0.27;
  outerWall.scale.z = 0.8;
  arena.add(outerWall);
  const upperColumns: THREE.Mesh[] = [];
  const upperColumnGeometry = track(new THREE.CylinderGeometry(0.018, 0.018, 0.5, 8));
  for (let i = 0; i < 16; i += 1) {
    const a = (i / 16) * Math.PI * 2;
    const column = new THREE.Mesh(upperColumnGeometry, steel);
    column.position.set(Math.cos(a) * 0.8, 0.3, Math.sin(a) * 0.8 * 0.8);
    arena.add(column);
    upperColumns.push(column);
  }
  const canopy = new THREE.Mesh(track(new THREE.TorusGeometry(0.7, 0.07, 8, 64)), track(new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 0.35, metalness: 0.2 })));
  canopy.rotation.x = Math.PI / 2;
  canopy.position.y = 0.56;
  canopy.scale.set(1, 0.8, 0.5);
  arena.add(canopy);
  const floodMaterial = track(new THREE.MeshStandardMaterial({ color: '#fffbe6', emissive: '#fff2b0', emissiveIntensity: 1.6 }));
  const floodlights = [0.5, 2.1, 3.7, 5.3].map((a) => {
    const tower = new THREE.Group();
    const mast = new THREE.Mesh(track(new THREE.CylinderGeometry(0.015, 0.02, 0.8, 8)), steel);
    mast.position.y = 0.45;
    const lamp = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.06, 0.03)), floodMaterial);
    lamp.position.y = 0.87;
    tower.add(mast, lamp);
    tower.position.set(Math.cos(a) * 0.86, 0, Math.sin(a) * 0.86 * 0.8);
    tower.lookAt(0, 0, 0);
    arena.add(tower);
    return tower;
  });
  const bannerColors = ['#e84a5f', '#3d7bff', '#f2b322', '#2fbf71'];
  const banners = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + 0.2;
    const banner = new THREE.Mesh(track(new THREE.PlaneGeometry(0.07, 0.12)), track(new THREE.MeshStandardMaterial({ color: bannerColors[i % 4], side: THREE.DoubleSide })));
    banner.position.set(Math.cos(a) * 0.8, 0.6, Math.sin(a) * 0.8 * 0.8);
    banner.lookAt(0, 0.6, 0);
    arena.add(banner);
    return banner;
  });
  // Crowd: tiny figures in the seats (instanced), filling in at Level 3.
  const crowdCount = 520;
  const crowd = new THREE.InstancedMesh(track(new THREE.BoxGeometry(0.018, 0.028, 0.018)), track(new THREE.MeshStandardMaterial({ roughness: 0.8 })), crowdCount);
  const crowdMatrix = new THREE.Matrix4();
  const crowdColors = ['#f4d35e', '#ee964b', '#f95738', '#3d7bff', '#ffffff', '#2fbf71', '#a26bff'].map((c) => new THREE.Color(c));
  for (let i = 0; i < crowdCount; i += 1) {
    const a = random() * Math.PI * 2;
    const upper = random() < 0.45;
    const r = upper ? 0.62 + random() * 0.1 : 0.4 + random() * 0.18;
    const y = upper ? 0.34 + (r - 0.62) * 1.1 : 0.14 + (r - 0.4) * 0.6;
    crowdMatrix.makeTranslation(Math.cos(a) * r, y + 0.03, Math.sin(a) * r * 0.8);
    crowd.setMatrixAt(i, crowdMatrix);
    crowd.setColorAt(i, crowdColors[i % crowdColors.length]);
  }
  arena.add(crowd);

  // Airship tugs and tow cables for the delivery.
  const tugs = new THREE.Group();
  root.add(tugs);
  const tugBody = track(new THREE.MeshStandardMaterial({ color: '#f1ece2', roughness: 0.45 }));
  const tugList = [-1, 0, 1].map((side) => {
    const tug = new THREE.Group();
    const envelope = new THREE.Mesh(track(new THREE.SphereGeometry(1, 20, 12)), tugBody);
    envelope.scale.set(0.34, 0.12, 0.12);
    const gondola = new THREE.Mesh(track(new THREE.BoxGeometry(0.14, 0.05, 0.06)), darkSteel);
    gondola.position.y = -0.15;
    tug.add(envelope, gondola);
    tug.userData.side = side;
    tugs.add(tug);
    return tug;
  });
  const cableMaterial = track(new THREE.LineBasicMaterial({ color: '#2d3440' }));
  const cableGeometry = track(new THREE.BufferGeometry());
  cableGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(6 * 3), 3));
  const cables = new THREE.LineSegments(cableGeometry, cableMaterial);
  cables.frustumCulled = false;
  root.add(cables);
  // Anchor chains to the island rim.
  const chainGeometry = track(new THREE.BufferGeometry());
  chainGeometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(4 * 6), 3));
  const chains = new THREE.LineSegments(chainGeometry, track(new THREE.LineBasicMaterial({ color: '#1c2129' })));
  chains.frustumCulled = false;
  root.add(chains);

  let placed = false;
  const anchorPosition = new THREE.Vector3();
  const approachDirection = new THREE.Vector3(0, 0, -1);
  const islandAnchors: THREE.Vector3[] = [];
  let baseRadius = 6;
  let stage: OpeningArenaVisualStage = 'hidden';
  let arenaLevel = 0;
  let rollsUntilDelivery = 3;
  let arrivalT = 0;

  /** Beside the island, on the far side from the camera, clear of the island. */
  function place(options: { centre: THREE.Vector3; islandRadius: number; groundY: number; viewFrom: THREE.Vector3 }) {
    const { centre, islandRadius, groundY, viewFrom } = options;
    baseRadius = THREE.MathUtils.clamp(islandRadius * 0.62, 4, 16);
    const out = new THREE.Vector3(centre.x - viewFrom.x, 0, centre.z - viewFrom.z);
    if (out.lengthSq() < 1e-4) out.set(0, 0, -1);
    out.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), 0.22);
    approachDirection.copy(out);
    anchorPosition.copy(centre).addScaledVector(out, islandRadius + baseRadius * 1.2);
    anchorPosition.y = groundY + baseRadius * 0.28;
    base.scale.setScalar(baseRadius);
    const side = new THREE.Vector3(-out.z, 0, out.x);
    islandAnchors.length = 0;
    [-0.55, 0.55].forEach((k) => {
      islandAnchors.push(centre.clone().addScaledVector(out, islandRadius * 0.92).addScaledVector(side, k * islandRadius * 0.5).setY(groundY + 0.2));
    });
    placed = true;
  }

  function setState(next: { stage: OpeningArenaVisualStage; arenaLevel: number; rollsUntilDelivery: number }) {
    stage = next.stage;
    arenaLevel = Math.max(0, Math.min(3, Math.floor(next.arenaLevel)));
    rollsUntilDelivery = next.rollsUntilDelivery;
    root.visible = placed && stage !== 'hidden';
    const anchored = stage === 'anchored';
    construction.visible = anchored && arenaLevel < 3;
    cranes.forEach((crane) => { crane.visible = anchored && arenaLevel < 3; });
    columns.forEach((column) => { column.visible = anchored && arenaLevel < 2; });
    arena.visible = anchored && arenaLevel >= 1;
    lowerBowl.forEach((mesh) => { mesh.visible = arenaLevel >= 1; });
    pitch.visible = arenaLevel >= 1;
    outerWall.visible = arenaLevel >= 2;
    upperTier.forEach((mesh) => { mesh.visible = arenaLevel >= 2; });
    upperColumns.forEach((mesh) => { mesh.visible = arenaLevel >= 2; });
    canopy.visible = arenaLevel >= 3;
    floodlights.forEach((tower) => { tower.visible = arenaLevel >= 3; });
    banners.forEach((banner) => { banner.visible = arenaLevel >= 3; });
    crowd.visible = arenaLevel >= 3;
    tugs.visible = stage === 'in_transit' || stage === 'arriving';
    cables.visible = tugs.visible;
    chains.visible = anchored || (stage === 'arriving' && arrivalT > OPENING_ARENA_ARRIVAL_SECONDS * 0.72);
  }

  /** Where the base floats at this moment (far away in transit, gliding in on arrival). */
  function resolveBasePosition(t: number, reduced: boolean): THREE.Vector3 {
    if (stage === 'anchored') {
      return anchorPosition.clone().add(new THREE.Vector3(0, reduced ? 0 : Math.sin(t * 0.6) * baseRadius * 0.01, 0));
    }
    // Visible on the horizon behind the island, closer with every roll.
    const far = stage === 'in_transit'
      ? THREE.MathUtils.lerp(baseRadius * 5, baseRadius * 2.2, 1 - Math.max(0, rollsUntilDelivery - 1) / 2)
      : THREE.MathUtils.lerp(baseRadius * 2.2, 0, smooth(arrivalT / (OPENING_ARENA_ARRIVAL_SECONDS * 0.7)));
    const lift = stage === 'in_transit' ? baseRadius * 0.25 : baseRadius * 0.25 * (1 - smooth(arrivalT / (OPENING_ARENA_ARRIVAL_SECONDS * 0.75)));
    return anchorPosition.clone().addScaledVector(approachDirection, far).add(new THREE.Vector3(0, lift + (reduced ? 0 : Math.sin(t * 0.8) * baseRadius * 0.02), 0));
  }

  const cableEnds = new THREE.Vector3();
  function update(t: number, dt: number, reduced: boolean) {
    if (!placed || stage === 'hidden') return;
    if (stage === 'arriving') arrivalT = Math.min(OPENING_ARENA_ARRIVAL_SECONDS, arrivalT + dt);
    const position = resolveBasePosition(t, reduced);
    base.position.copy(position);
    base.rotation.y = reduced ? 0 : Math.sin(t * 0.1) * 0.02;
    engineGlows.forEach((glow, i) => {
      (glow.material as THREE.MeshBasicMaterial).opacity = reduced ? 0.8 : 0.6 + Math.sin(t * 6 + i) * 0.25;
    });
    // Tugs fly ahead of the base, towing it on cables.
    if (tugs.visible) {
      const side = new THREE.Vector3(-approachDirection.z, 0, approachDirection.x);
      const positions = cableGeometry.getAttribute('position') as THREE.BufferAttribute;
      tugList.forEach((tug, i) => {
        const offset = tug.userData.side as number;
        tug.position.copy(position)
          .addScaledVector(approachDirection, -baseRadius * 1.9)
          .addScaledVector(side, offset * baseRadius * 0.9)
          .add(new THREE.Vector3(0, baseRadius * 0.9 + (reduced ? 0 : Math.sin(t * 1.3 + i) * baseRadius * 0.05), 0));
        tug.scale.setScalar(baseRadius * 0.9);
        tug.lookAt(tug.position.clone().addScaledVector(approachDirection, -1));
        tug.rotateY(Math.PI / 2);
        cableEnds.copy(position).addScaledVector(side, offset * baseRadius * 0.6).addScaledVector(approachDirection, -baseRadius * 0.8);
        positions.setXYZ(i * 2, tug.position.x, tug.position.y - baseRadius * 0.12, tug.position.z);
        positions.setXYZ(i * 2 + 1, cableEnds.x, cableEnds.y + baseRadius * 0.05, cableEnds.z);
      });
      positions.needsUpdate = true;
    }
    // Anchor chains from the base to the island rim.
    if (chains.visible) {
      const positions = chainGeometry.getAttribute('position') as THREE.BufferAttribute;
      const shoot = stage === 'anchored' ? 1 : smooth((arrivalT - OPENING_ARENA_ARRIVAL_SECONDS * 0.72) / (OPENING_ARENA_ARRIVAL_SECONDS * 0.15));
      const side = new THREE.Vector3(-approachDirection.z, 0, approachDirection.x);
      islandAnchors.forEach((anchor, i) => {
        const from = position.clone().addScaledVector(approachDirection, -baseRadius * 0.95).addScaledVector(side, (i === 0 ? -1 : 1) * baseRadius * 0.35);
        const to = from.clone().lerp(anchor, shoot);
        positions.setXYZ(i * 2, from.x, from.y, from.z);
        positions.setXYZ(i * 2 + 1, to.x, to.y, to.z);
      });
      positions.needsUpdate = true;
    }
    if (!reduced && cranes[0].visible) cranes.forEach((crane, i) => { crane.rotation.y += dt * (i === 0 ? 0.15 : -0.12); });
  }

  return {
    root,
    get placed() { return placed; },
    get arrivalProgress() { return arrivalT / OPENING_ARENA_ARRIVAL_SECONDS; },
    get focusPoint() { return base.position.clone(); },
    get radius() { return baseRadius; },
    resetArrival() { arrivalT = 0; },
    place,
    setState,
    update,
    hitTargets: [base] as THREE.Object3D[],
    dispose() {
      root.parent?.remove(root);
      disposables.forEach((item) => item.dispose());
    },
  };
}
