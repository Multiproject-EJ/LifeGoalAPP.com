import * as THREE from 'three';

export type Island14SatelliteBuildLevel = 1 | 2 | 3;

/**
 * Structural material contract shared with Island 014 without importing its
 * monolith. Every entry is deliberately typed as THREE.Material so callers can
 * supply standard, physical, toon, or quality-tier variants.
 */
export interface Island14SatelliteMaterials {
  honeyRock: THREE.Material;
  honeyRockShadow: THREE.Material;
  warmGold: THREE.Material;
  paleGold: THREE.Material;
  darkBronze: THREE.Material;
  royalPurple: THREE.Material;
  honeyGlass: THREE.Material;
  warmWindow: THREE.Material;
  waxCream: THREE.Material;
}

type ConstructionStage = 1 | 2 | 3 | 4 | 5;

type SatelliteLandmarkId = 'hatchery' | 'habit' | 'wisdom' | 'event';

const UP = new THREE.Vector3(0, 1, 0);

function presentMesh(
  mesh: THREE.Mesh,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  semanticRole: string,
) {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.userData = {
    ...mesh.userData,
    island14SatelliteV2: true,
    landmarkId,
    constructionStage: stage,
    semanticRole,
  };
  return mesh;
}

function presentGroup(
  group: THREE.Group,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  semanticRole: string,
) {
  group.name = name;
  group.userData = {
    ...group.userData,
    island14SatelliteV2: true,
    landmarkId,
    constructionStage: stage,
    semanticRole,
  };
  return group;
}

function setRootMetadata(
  root: THREE.Group,
  landmarkId: SatelliteLandmarkId,
  level: Island14SatelliteBuildLevel,
  constructionFamily: string,
  silhouette: string,
) {
  root.userData = {
    island14SatelliteV2: true,
    landmarkId,
    buildLevel: level,
    constructionFamily,
    frontAxis: '+Z',
    authoredElevations: ['front', 'right', 'rear', 'left'],
    constructionStages: [
      'foundation',
      'body',
      'upper-silhouette',
      'working-mechanism',
      'commissioning-detail',
    ],
    phoneSilhouette: silhouette,
    presentationOnly: true,
  };
  return root;
}

function hexPlate(
  radius: number,
  height: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
  topScale = 0.96,
) {
  return presentMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(radius * topScale, radius, height, 6, 1, false), material),
    name,
    stage,
    landmarkId,
    role,
  );
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
) {
  return presentMesh(
    new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material),
    name,
    stage,
    landmarkId,
    role,
  );
}

function thickRing(
  radius: number,
  tube: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
) {
  const ring = presentMesh(
    new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 8, 32), material),
    name,
    stage,
    landmarkId,
    role,
  );
  ring.rotation.x = Math.PI / 2;
  return ring;
}

function tubeBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
) {
  const direction = end.clone().sub(start);
  const mesh = presentMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 8, 1, false), material),
    name,
    stage,
    landmarkId,
    role,
  );
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(UP, direction.normalize());
  return mesh;
}

function polygonShape(radius: number, sides: number, rotation = Math.PI / 6) {
  const shape = new THREE.Shape();
  for (let index = 0; index < sides; index += 1) {
    const angle = rotation + index / sides * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

function polygonHole(radius: number, sides: number, rotation = Math.PI / 6) {
  const hole = new THREE.Path();
  for (let index = sides - 1; index >= 0; index -= 1) {
    const angle = rotation + index / sides * Math.PI * 2;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius;
    if (index === sides - 1) hole.moveTo(x, y);
    else hole.lineTo(x, y);
  }
  hole.closePath();
  return hole;
}

function hexFrame(
  radius: number,
  thickness: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
) {
  const shape = polygonShape(radius, 6);
  shape.holes.push(polygonHole(Math.max(0.04, radius - thickness), 6));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.025, thickness * 0.24),
    bevelThickness: Math.min(0.025, depth * 0.24),
    curveSegments: 1,
    steps: 1,
  });
  geometry.center();
  return presentMesh(new THREE.Mesh(geometry, material), name, stage, landmarkId, role);
}

function pointedArchShape(width: number, height: number) {
  const half = width / 2;
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(half, height * 0.55);
  shape.lineTo(width * 0.34, height * 0.76);
  shape.lineTo(0, height);
  shape.lineTo(-width * 0.34, height * 0.76);
  shape.lineTo(-half, height * 0.55);
  shape.closePath();
  return shape;
}

function pointedArchHole(width: number, height: number, inset: number) {
  const innerWidth = width - inset * 2;
  const innerHeight = height - inset * 1.5;
  const half = innerWidth / 2;
  const base = inset * 0.72;
  const hole = new THREE.Path();
  hole.moveTo(-half, base);
  hole.lineTo(-half, base + innerHeight * 0.55);
  hole.lineTo(-innerWidth * 0.34, base + innerHeight * 0.76);
  hole.lineTo(0, base + innerHeight);
  hole.lineTo(innerWidth * 0.34, base + innerHeight * 0.76);
  hole.lineTo(half, base + innerHeight * 0.55);
  hole.lineTo(half, base);
  hole.closePath();
  return hole;
}

function archFrame(
  width: number,
  height: number,
  inset: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
) {
  const shape = pointedArchShape(width, height);
  shape.holes.push(pointedArchHole(width, height, inset));
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.025,
    bevelThickness: 0.025,
  });
  geometry.center();
  return presentMesh(new THREE.Mesh(geometry, material), name, stage, landmarkId, role);
}

function archPanel(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
) {
  const geometry = new THREE.ExtrudeGeometry(pointedArchShape(width, height), {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.018,
    bevelThickness: 0.018,
  });
  geometry.center();
  return presentMesh(new THREE.Mesh(geometry, material), name, stage, landmarkId, role);
}

function lathedBody(
  profile: readonly [number, number][],
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  landmarkId: SatelliteLandmarkId,
  role: string,
  segments = 18,
) {
  const points = profile.map(([radius, y]) => new THREE.Vector2(radius, y));
  return presentMesh(
    new THREE.Mesh(new THREE.LatheGeometry(points, segments, 0, Math.PI * 2), material),
    name,
    stage,
    landmarkId,
    role,
  );
}

function addCardinalSteps(
  root: THREE.Group,
  prefix: string,
  landmarkId: SatelliteLandmarkId,
  material: THREE.Material,
  radius: number,
) {
  for (let directionIndex = 0; directionIndex < 4; directionIndex += 1) {
    const angle = directionIndex * Math.PI / 2;
    const direction = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    for (let step = 0; step < 3; step += 1) {
      const tread = box(
        0.82 - step * 0.08,
        0.10,
        0.28,
        material,
        `${prefix}_CARDINAL_STAIR_${directionIndex + 1}_${step + 1}`,
        1,
        landmarkId,
        'grounded-entry-step',
      );
      tread.position.copy(direction).multiplyScalar(radius + 0.24 - step * 0.18);
      tread.position.y = 0.05 + step * 0.075;
      tread.rotation.y = angle;
      root.add(tread);
    }
  }
}

function addRadialHexWindows(
  root: THREE.Group,
  prefix: string,
  landmarkId: SatelliteLandmarkId,
  frameMaterial: THREE.Material,
  insetMaterial: THREE.Material,
  radius: number,
  y: number,
  count: number,
  cellRadius: number,
  stage: ConstructionStage,
  phase = 0,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = phase + index / count * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    const recess = presentMesh(
      new THREE.Mesh(new THREE.CylinderGeometry(cellRadius * 0.80, cellRadius * 0.80, 0.08, 6), insetMaterial),
      `${prefix}_OCCUPIED_CELL_${index + 1}`,
      stage,
      landmarkId,
      'occupied-honeycomb-window',
    );
    // CylinderGeometry grows on +Y. Rotate that axis onto +Z before yawing
    // around the building so the shallow inset follows the radial surface.
    // The previous Z rotation left every inset facing sideways and produced a
    // spiky silhouette in three-quarter/rear Nursery evidence.
    recess.rotation.x = Math.PI / 2;
    recess.rotation.y = angle;
    recess.position.set(x, y, z);
    const frame = hexFrame(
      cellRadius,
      cellRadius * 0.18,
      0.06,
      frameMaterial,
      `${prefix}_WINDOW_FRAME_${index + 1}`,
      stage,
      landmarkId,
      'structural-honeycomb-window-frame',
    );
    frame.rotation.y = angle;
    frame.position.set(x * 1.003, y, z * 1.003);
    root.add(recess, frame);
  }
}

function addFrontAndRearDoors(
  root: THREE.Group,
  prefix: string,
  landmarkId: SatelliteLandmarkId,
  materials: Island14SatelliteMaterials,
  y: number,
  z: number,
  width: number,
  height: number,
  stage: ConstructionStage,
) {
  for (const side of [1, -1] as const) {
    const face = side === 1 ? 'FRONT' : 'REAR';
    const panel = archPanel(
      width * 0.76,
      height * 0.83,
      0.12,
      materials.royalPurple,
      `${prefix}_${face}_DOOR_PANEL`,
      stage,
      landmarkId,
      side === 1 ? 'primary-entrance-door' : 'authored-rear-service-door',
    );
    panel.position.set(0, y, side * z);
    panel.rotation.y = side === 1 ? 0 : Math.PI;
    const frame = archFrame(
      width,
      height,
      width * 0.12,
      0.18,
      materials.paleGold,
      `${prefix}_${face}_DEEP_DOOR_FRAME`,
      stage,
      landmarkId,
      side === 1 ? 'deep-primary-entrance-frame' : 'rear-service-entrance-frame',
    );
    frame.position.set(0, y, side * (z + 0.03));
    frame.rotation.y = side === 1 ? 0 : Math.PI;
    root.add(panel, frame);
  }
}

function createBeeCrest(
  prefix: string,
  landmarkId: SatelliteLandmarkId,
  materials: Island14SatelliteMaterials,
  scale: number,
  stage: ConstructionStage,
) {
  const crest = presentGroup(new THREE.Group(), `${prefix}_BEE_CREST`, stage, landmarkId, 'phone-readable-bee-crest');
  const body = presentMesh(
    new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), materials.darkBronze),
    `${prefix}_BEE_BODY`,
    stage,
    landmarkId,
    'bee-body',
  );
  body.scale.set(0.78, 1.35, 0.62);
  const stripe = thickRing(0.16, 0.045, materials.paleGold, `${prefix}_BEE_STRIPE`, stage, landmarkId, 'bee-stripe');
  stripe.rotation.x = 0;
  stripe.position.y = 0.02;
  for (const side of [-1, 1]) {
    const wing = presentMesh(
      new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 7), materials.honeyGlass),
      `${prefix}_BEE_WING_${side}`,
      stage,
      landmarkId,
      'bee-wing',
    );
    wing.position.set(side * 0.22, 0.05, 0);
    wing.scale.set(1.05, 0.54, 0.34);
    wing.rotation.z = side * -0.42;
    crest.add(wing);
  }
  crest.add(body, stripe);
  crest.scale.setScalar(scale);
  return crest;
}

export function createIsland14QueensNurseryV2(
  level: Island14SatelliteBuildLevel,
  materials: Island14SatelliteMaterials,
) {
  const landmarkId = 'hatchery' as const;
  const root = setRootMetadata(
    presentGroup(new THREE.Group(), 'ISLAND_14_V2_QUEENS_NURSERY', 1, landmarkId, 'landmark-root'),
    landmarkId,
    level,
    'threejs-continuous-honeycomb-brood-egg-v3',
    'compact pointed brood egg wrapped in shallow connected honeycomb relief',
  );

  const foundation = hexPlate(1.28, 0.22, materials.honeyRock, 'ISLAND_14_V2_NURSERY_FOUNDATION', 1, landmarkId, 'compact-grounded-foundation');
  foundation.position.y = 0.11;
  const foundationBand = hexPlate(1.17, 0.10, materials.paleGold, 'ISLAND_14_V2_NURSERY_FOUNDATION_BAND', 1, landmarkId, 'low-foundation-honeycomb-band', 1);
  foundationBand.position.y = 0.27;
  root.add(foundation, foundationBand);
  addCardinalSteps(root, 'ISLAND_14_V2_NURSERY', landmarkId, materials.paleGold, 1.08);

  const egg = lathedBody(
    [
      [0, 0], [0.52, 0.03], [0.72, 0.36], [0.81, 0.86], [0.79, 1.30],
      [0.66, 1.70], [0.44, 2.02], [0.19, 2.23], [0.045, 2.32], [0, 2.33],
    ],
    // The canonical icon is a dense amber brood egg, not a pale/open lantern.
    // A continuous dark shell stays directly behind the translucent amber
    // facets so every orbit remains visibly occupied while the gold ribs read.
    materials.honeyRock,
    'ISLAND_14_V2_NURSERY_BROAD_EGG_CHAMBER',
    2,
    landmarkId,
    'royal-brood-egg-chamber',
    20,
  );
  egg.position.y = 0.33;
  egg.scale.z = 0.97;
  root.add(egg);
  // One shallow staggered mosaic wraps the egg. This keeps the warm-gold body
  // dominant and gives every orbit the same connected honeycomb read without
  // the silhouette-breaking duplicate front cells used by the retired family.
  addRadialHexWindows(root, 'ISLAND_14_V2_NURSERY_LOWER', landmarkId, materials.paleGold, materials.honeyGlass, 0.75, 0.82, 9, 0.245, 2, Math.PI / 9);
  addRadialHexWindows(root, 'ISLAND_14_V2_NURSERY_MIDDLE_LOW', landmarkId, materials.paleGold, materials.honeyGlass, 0.81, 1.22, 10, 0.255, 2, 0);
  if (level >= 2) {
    addRadialHexWindows(root, 'ISLAND_14_V2_NURSERY_MIDDLE_HIGH', landmarkId, materials.paleGold, materials.honeyGlass, 0.79, 1.62, 9, 0.245, 3, Math.PI / 9);
    addRadialHexWindows(root, 'ISLAND_14_V2_NURSERY_UPPER', landmarkId, materials.paleGold, materials.honeyGlass, 0.68, 1.98, 7, 0.215, 3, 0);
  }
  if (level >= 3) {
    addRadialHexWindows(root, 'ISLAND_14_V2_NURSERY_CROWN_CELLS', landmarkId, materials.paleGold, materials.honeyGlass, 0.48, 2.29, 5, 0.145, 4, Math.PI / 5);
  }

  const lowerWaxCradle = presentGroup(
    new THREE.Group(),
    'ISLAND_14_V2_NURSERY_LOWER_WAX_CRADLE',
    2,
    landmarkId,
    'layered-wax-petal-egg-cradle',
  );
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const petal = presentMesh(
      new THREE.Mesh(new THREE.SphereGeometry(0.25, 10, 7), materials.paleGold),
      `ISLAND_14_V2_NURSERY_CRADLE_PETAL_${index + 1}`,
      2,
      landmarkId,
      'lower-wax-cradle-petal',
    );
    petal.position.set(Math.sin(angle) * 0.71, 0.39, Math.cos(angle) * 0.71);
    petal.scale.set(0.72, 0.22, 1.12);
    petal.rotation.y = angle;
    lowerWaxCradle.add(petal);
  }
  root.add(lowerWaxCradle);

  if (level >= 2) {
    const crownSeat = thickRing(0.23, 0.045, materials.paleGold, 'ISLAND_14_V2_NURSERY_FINIAL_SEAT', 3, landmarkId, 'small-royal-finial-seat');
    crownSeat.position.y = 2.64;
    root.add(crownSeat);

    // Convex beads and tapered drops make the surface read as viscous honey,
    // while their small socketed groups remain safe for construction reveals.
    const dripAngles = [0.52, 2.48, 3.78, 5.62] as const;
    dripAngles.forEach((angle, index) => {
      const bead = presentMesh(
        new THREE.Mesh(new THREE.SphereGeometry(0.105, 10, 7), materials.honeyGlass),
        `ISLAND_14_V2_NURSERY_HONEY_BEAD_${index + 1}`,
        4,
        landmarkId,
        'convex-honey-meniscus-bead',
      );
      bead.position.set(Math.sin(angle) * 0.83, 0.40, Math.cos(angle) * 0.83);
      bead.scale.set(0.86, 1.45 + index % 2 * 0.35, 0.86);
      const drop = presentMesh(
        new THREE.Mesh(new THREE.SphereGeometry(0.07, 9, 6), materials.honeyGlass),
        `ISLAND_14_V2_NURSERY_HONEY_DROP_${index + 1}`,
        4,
        landmarkId,
        'tapered-honey-drop',
      );
      drop.position.copy(bead.position);
      drop.position.y -= 0.14 + index % 2 * 0.07;
      drop.scale.set(0.8, 1.55, 0.8);
      root.add(bead, drop);
    });
  }

  if (level >= 3) {
    const finial = lathedBody(
      [[0,0],[0.14,0.025],[0.18,0.12],[0.12,0.25],[0.04,0.36],[0,0.39]],
      materials.honeyGlass,
      'ISLAND_14_V2_NURSERY_HONEY_FINIAL',
      5,
      landmarkId,
      'small-honey-drop-royal-finial',
      12,
    );
    finial.position.y = 2.62;
    root.add(finial);
  }

  // A local 12% prominence increase keeps the egg-and-crown silhouette above
  // neighboring architecture without changing world placement or integration.
  root.scale.setScalar(1.12);
  root.userData.localPhoneProminenceScale = 1.12;
  return root;
}

export function createIsland14PollinatorYardV2(
  level: Island14SatelliteBuildLevel,
  materials: Island14SatelliteMaterials,
) {
  const landmarkId = 'habit' as const;
  const root = setRootMetadata(
    presentGroup(new THREE.Group(), 'ISLAND_14_V2_POLLINATOR_YARD', 1, landmarkId, 'landmark-root'),
    landmarkId,
    level,
    'threejs-continuous-extruded-seven-cell-civic-hive-v4',
    'low broad occupied seven-cell civic hive with one dominant bee chamber',
  );
  const court = hexPlate(1.56, 0.28, materials.honeyRock, 'ISLAND_14_V2_YARD_HEX_COURT', 1, landmarkId, 'low-broad-civic-work-apron');
  court.position.y = 0.14;
  const courtBand = hexPlate(1.45, 0.11, materials.paleGold, 'ISLAND_14_V2_YARD_COURT_BAND', 1, landmarkId, 'continuous-civic-foundation-band', 1);
  courtBand.position.y = 0.33;
  root.add(court, courtBand);
  addCardinalSteps(root, 'ISLAND_14_V2_YARD', landmarkId, materials.paleGold, 1.34);

  const center = new THREE.Vector3(0, 1.17, 0);
  const outerCenters = Array.from({ length: 6 }, (_, index) => {
    const angle = index / 6 * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * 0.70, 1.17 + Math.sin(angle) * 0.50, 0);
  });
  const outerUnlockLevel = [2, 3, 3, 2, 1, 1] as const;

  const addOccupiedCell = (
    cellId: string,
    position: THREE.Vector3,
    radius: number,
    depth: number,
    stage: ConstructionStage,
    dominant: boolean,
  ) => {
    const shell = presentMesh(
      new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 6, 1, false), dominant ? materials.paleGold : materials.warmGold),
      `ISLAND_14_V2_YARD_${cellId}_OCCUPIED_ROOM_SHELL`,
      stage,
      landmarkId,
      dominant ? 'dominant-central-occupied-chamber' : 'connected-outer-occupied-room',
    );
    shell.rotation.x = Math.PI / 2;
    shell.position.copy(position);
    root.add(shell);

    for (const face of [-1, 1]) {
      const socket = presentMesh(
        new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.77, radius * 0.77, 0.085, 6, 1, false), materials.darkBronze),
        `ISLAND_14_V2_YARD_${cellId}_${face > 0 ? 'FRONT' : 'REAR'}_DEEP_SOCKET`,
        stage,
        landmarkId,
        dominant ? 'dominant-dark-occupied-cell-socket' : 'dark-occupied-cell-socket',
      );
      socket.rotation.x = Math.PI / 2;
      socket.position.copy(position);
      socket.position.z = face * (depth * 0.5 + 0.018);
      const frame = hexFrame(
        radius * 0.97,
        radius * 0.17,
        0.10,
        materials.paleGold,
        `ISLAND_14_V2_YARD_${cellId}_${face > 0 ? 'FRONT' : 'REAR'}_STRUCTURAL_FRAME`,
        stage,
        landmarkId,
        face > 0 ? 'front-continuous-cell-frame' : 'rear-continuous-cell-frame',
      );
      frame.position.copy(socket.position);
      frame.position.z += face * 0.055;
      if (face < 0) frame.rotation.y = Math.PI;
      root.add(socket, frame);
    }
  };

  // Keep the chambers genuinely extruded, but compact enough that a side view
  // reads as a civic building rather than seven long shipping containers.
  addOccupiedCell('CENTRAL', center, 0.52, 0.64, 2, true);
  outerCenters.forEach((position, index) => {
    if (level < outerUnlockLevel[index]) return;
    const stage = outerUnlockLevel[index] === 1 ? 2 : outerUnlockLevel[index] === 2 ? 3 : 4;
    addOccupiedCell(`OUTER_${index + 1}`, position, 0.36, 0.54, stage, false);
    const direction = position.clone().sub(center).normalize();
    root.add(tubeBetween(
      center.clone().add(direction.clone().multiplyScalar(0.26)),
      position.clone().sub(direction.clone().multiplyScalar(0.20)),
      0.12,
      materials.paleGold,
      `ISLAND_14_V2_YARD_CELL_COLLAR_${index + 1}`,
      stage,
      landmarkId,
      'structural-cell-to-center-collar',
    ));
  });

  const undercroft = box(1.46, 0.42, 0.72, materials.waxCream, 'ISLAND_14_V2_YARD_LOW_CIVIC_UNDERCROFT', 2, landmarkId, 'subordinate-low-civic-undercroft');
  undercroft.position.set(0, 0.54, -0.10);
  root.add(undercroft);

  // The approved turnaround has authored side elevations. These smaller
  // service cells preserve the seven-cell front identity while ensuring the
  // landmark remains unmistakably honeycomb architecture at 90 and 270°.
  for (const side of [-1, 1]) {
    const sideFaceX = side * 0.79;
    const sideCells = [
      { y: 0.66, z: -0.20, radius: 0.22 },
      { y: 0.66, z: 0.24, radius: 0.22 },
      { y: 1.10, z: 0.02, radius: 0.24 },
    ];
    sideCells.forEach((cell, index) => {
      const socket = presentMesh(
        new THREE.Mesh(new THREE.CylinderGeometry(cell.radius * 0.78, cell.radius * 0.78, 0.075, 6, 1, false), materials.darkBronze),
        `ISLAND_14_V2_YARD_SIDE_${side > 0 ? 'RIGHT' : 'LEFT'}_SERVICE_SOCKET_${index + 1}`,
        3,
        landmarkId,
        'authored-side-honeycomb-service-socket',
      );
      socket.rotation.z = Math.PI / 2;
      socket.position.set(sideFaceX + side * 0.018, cell.y, cell.z);
      const frame = hexFrame(
        cell.radius,
        cell.radius * 0.18,
        0.09,
        materials.paleGold,
        `ISLAND_14_V2_YARD_SIDE_${side > 0 ? 'RIGHT' : 'LEFT'}_SERVICE_FRAME_${index + 1}`,
        3,
        landmarkId,
        'authored-side-honeycomb-service-frame',
      );
      frame.rotation.y = side * Math.PI / 2;
      frame.position.set(sideFaceX + side * 0.072, cell.y, cell.z);
      root.add(socket, frame);
    });
  }

  const rearDoorPanel = archPanel(0.44, 0.46, 0.07, materials.darkBronze, 'ISLAND_14_V2_YARD_REAR_SERVICE_DOOR', 3, landmarkId, 'closed-rear-service-entry');
  rearDoorPanel.position.set(0, 0.57, -0.49);
  rearDoorPanel.rotation.y = Math.PI;
  const rearDoorFrame = archFrame(0.52, 0.54, 0.07, 0.09, materials.paleGold, 'ISLAND_14_V2_YARD_REAR_SERVICE_DOOR_FRAME', 3, landmarkId, 'supported-rear-service-entry-frame');
  rearDoorFrame.position.set(0, 0.57, -0.54);
  rearDoorFrame.rotation.y = Math.PI;
  root.add(rearDoorPanel, rearDoorFrame);

  if (level >= 2) {
    for (const side of [-1, 1]) {
      const honeyChannel = tubeBetween(
        new THREE.Vector3(side * 1.08, 0.42, 0.52),
        new THREE.Vector3(side * 0.52, 0.68, 0.30),
        0.065,
        materials.honeyGlass,
        `ISLAND_14_V2_YARD_HONEY_WORK_CHANNEL_${side}`,
        4,
        landmarkId,
        'subordinate-honey-work-channel',
      );
      root.add(honeyChannel);
    }
  }

  if (level >= 3) {
    const crest = createBeeCrest('ISLAND_14_V2_YARD_EMBEDDED', landmarkId, materials, 0.96, 5);
    crest.position.set(0, center.y, 0.42);
    crest.userData = {
      ...crest.userData,
      semanticRole: 'embedded-central-cell-bee-relief',
    };
    const crownSeat = hexPlate(0.35, 0.15, materials.paleGold, 'ISLAND_14_V2_YARD_LOW_CROWN_SEAT', 5, landmarkId, 'subordinate-central-cell-crown-seat', 1);
    crownSeat.position.set(0, 1.92, 0);
    const finial = lathedBody(
      [[0,0],[0.11,0.03],[0.14,0.12],[0.08,0.24],[0.025,0.31],[0,0.33]],
      materials.honeyGlass,
      'ISLAND_14_V2_YARD_SMALL_HONEY_FINIAL',
      5,
      landmarkId,
      'subordinate-honey-finial',
      12,
    );
    finial.position.y = 2.00;
    root.add(crest, crownSeat, finial);

    const rearRosette = presentGroup(
      new THREE.Group(),
      'ISLAND_14_V2_YARD_REAR_HONEYCOMB_ROSETTE',
      5,
      landmarkId,
      'authored-rear-honeycomb-service-emblem',
    );
    const rearHub = presentMesh(
      new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.055, 6, 1, false), materials.honeyGlass),
      'ISLAND_14_V2_YARD_REAR_ROSETTE_HUB',
      5,
      landmarkId,
      'rear-honeycomb-rosette-hub',
    );
    rearHub.rotation.x = Math.PI / 2;
    rearRosette.add(rearHub);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const petal = presentMesh(
        new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.05, 6, 1, false), materials.warmGold),
        `ISLAND_14_V2_YARD_REAR_ROSETTE_CELL_${index + 1}`,
        5,
        landmarkId,
        'rear-honeycomb-rosette-cell',
      );
      petal.rotation.x = Math.PI / 2;
      petal.position.set(Math.cos(angle) * 0.16, Math.sin(angle) * 0.16, 0);
      rearRosette.add(petal);
    }
    rearRosette.position.set(0, center.y, -0.42);
    root.add(rearRosette);
  }
  return root;
}

export function createIsland14HiveArchivesV2(
  level: Island14SatelliteBuildLevel,
  materials: Island14SatelliteMaterials,
) {
  const landmarkId = 'wisdom' as const;
  const root = setRootMetadata(
    presentGroup(new THREE.Group(), 'ISLAND_14_V2_HIVE_ARCHIVES', 1, landmarkId, 'landmark-root'),
    landmarkId,
    level,
    'threejs-open-book-hex-library-v2',
    'wide open-book library with purple pages, shelf windows and a hex wisdom crown',
  );
  const foundation = hexPlate(1.70, 0.30, materials.honeyRock, 'ISLAND_14_V2_ARCHIVES_FOUNDATION', 1, landmarkId, 'wide-library-foundation');
  foundation.position.y = 0.15;
  const hall = hexPlate(1.42, 1.10, materials.waxCream, 'ISLAND_14_V2_ARCHIVES_READING_HALL', 2, landmarkId, 'broad-hex-reading-hall', 0.92);
  hall.position.y = 0.88;
  root.add(foundation, hall);
  addCardinalSteps(root, 'ISLAND_14_V2_ARCHIVES', landmarkId, materials.paleGold, 1.48);
  addFrontAndRearDoors(root, 'ISLAND_14_V2_ARCHIVES', landmarkId, materials, 0.90, 1.28, 0.90, 1.12, 2);
  addRadialHexWindows(root, 'ISLAND_14_V2_ARCHIVES_SHELF_WINDOWS', landmarkId, materials.paleGold, materials.darkBronze, 1.30, 1.10, 8, 0.22, 2, Math.PI / 8);

  const bookPortal = presentGroup(new THREE.Group(), 'ISLAND_14_V2_ARCHIVES_OPEN_BOOK_PORTAL', 2, landmarkId, 'open-book-entrance-symbol');
  for (const side of [-1, 1]) {
    const page = box(0.62, 0.086, 0.67, materials.royalPurple, `ISLAND_14_V2_ARCHIVES_PORTAL_PAGE_${side}`, 2, landmarkId, 'open-book-portal-page');
    page.position.set(side * 0.30, 1.54, 1.43);
    page.rotation.z = side * -0.28;
    bookPortal.add(page);
  }
  root.add(bookPortal);

  if (level >= 2) {
    const bookRoof = presentGroup(new THREE.Group(), 'ISLAND_14_V2_ARCHIVES_MONUMENTAL_OPEN_BOOK_ROOF', 3, landmarkId, 'monumental-open-book-silhouette');
    for (const side of [-1, 1]) {
      const pageBase = box(1.54, 0.15, 1.98, materials.paleGold, `ISLAND_14_V2_ARCHIVES_ROOF_PAGE_BASE_${side}`, 3, landmarkId, 'structural-book-roof-page');
      pageBase.position.set(side * 0.66, 1.80, -0.02);
      pageBase.rotation.z = side * -0.27;
      const pageInset = box(1.30, 0.08, 1.73, materials.royalPurple, `ISLAND_14_V2_ARCHIVES_ROOF_PAGE_INSET_${side}`, 3, landmarkId, 'purple-archive-page');
      pageInset.position.set(side * 0.67, 1.91, -0.02);
      pageInset.rotation.z = side * -0.27;
      bookRoof.add(pageBase, pageInset);
    }
    const spine = tubeBetween(new THREE.Vector3(0, 1.69, -1.01), new THREE.Vector3(0, 1.69, 1.01), 0.12, materials.darkBronze, 'ISLAND_14_V2_ARCHIVES_BOOK_SPINE', 3, landmarkId, 'open-book-spine');
    root.add(bookRoof, spine);

    for (const side of [-1, 1]) {
      const pod = hexPlate(0.48, 0.78, materials.warmGold, `ISLAND_14_V2_ARCHIVES_READING_POD_${side}`, 3, landmarkId, 'side-reading-pod', 0.92);
      pod.position.set(side * 1.28, 0.66, -0.12);
      const window = hexFrame(0.27, 0.07, 0.12, materials.paleGold, `ISLAND_14_V2_ARCHIVES_READING_POD_WINDOW_${side}`, 3, landmarkId, 'reading-pod-window');
      window.position.set(side * 1.28, 0.84, 0.40);
      root.add(pod, window);
    }
  }

  if (level >= 3) {
    const crownSeat = hexPlate(0.70, 0.30, materials.darkBronze, 'ISLAND_14_V2_ARCHIVES_WISDOM_LANTERN', 4, landmarkId, 'wisdom-lantern-seat', 0.92);
    crownSeat.position.y = 2.22;
    const crown = hexFrame(0.72, 0.14, 0.18, materials.paleGold, 'ISLAND_14_V2_ARCHIVES_WISDOM_CROWN', 5, landmarkId, 'large-hex-wisdom-crown');
    crown.position.set(0, 2.76, 0);
    const rearCrown = crown.clone();
    rearCrown.name = 'ISLAND_14_V2_ARCHIVES_REAR_WISDOM_CROWN';
    rearCrown.rotation.y = Math.PI;
    rearCrown.position.z = -0.16;
    const crest = createBeeCrest('ISLAND_14_V2_ARCHIVES', landmarkId, materials, 0.71, 5);
    crest.position.set(0, 2.76, 0.21);
    root.add(crownSeat, crown, rearCrown, crest);
  }
  return root;
}

export function createIsland14NectarTrialsV2(
  level: Island14SatelliteBuildLevel,
  materials: Island14SatelliteMaterials,
) {
  const landmarkId = 'event' as const;
  const root = setRootMetadata(
    presentGroup(new THREE.Group(), 'ISLAND_14_V2_NECTAR_TRIALS', 1, landmarkId, 'landmark-root'),
    landmarkId,
    level,
    'threejs-open-arcade-crossed-honey-dipper-arena-v3',
    'low open arena crowned by two crossed grooved honey dippers',
  );

  const foundation = hexPlate(1.58, 0.30, materials.honeyRock, 'ISLAND_14_V2_TRIALS_FOUNDATION', 1, landmarkId, 'broad-arena-foundation');
  foundation.position.y = 0.17;
  const arena = hexPlate(1.38, 0.20, materials.paleGold, 'ISLAND_14_V2_TRIALS_ARENA_FLOOR', 1, landmarkId, 'raised-honeycomb-arena-floor', 1);
  arena.position.y = 0.39;
  const arenaInset = hexPlate(1.16, 0.07, materials.waxCream, 'ISLAND_14_V2_TRIALS_OPEN_CONTEST_FLOOR', 1, landmarkId, 'unobstructed-open-contest-floor', 1);
  arenaInset.position.y = 0.525;
  const coreDais = hexPlate(0.42, 0.16, materials.darkBronze, 'ISLAND_14_V2_TRIALS_CHALLENGE_DAIS', 2, landmarkId, 'compact-challenge-mechanism-dais', 1);
  coreDais.position.y = 0.61;
  const lowerArcadeRing = thickRing(1.28, 0.085, materials.warmGold, 'ISLAND_14_V2_TRIALS_LOWER_ARCADE_RING', 2, landmarkId, 'continuous-lower-arcade-ring');
  lowerArcadeRing.position.y = 0.60;
  root.add(foundation, arena, arenaInset, coreDais, lowerArcadeRing);
  addCardinalSteps(root, 'ISLAND_14_V2_TRIALS', landmarkId, materials.paleGold, 1.38);

  const nectarCore = presentMesh(new THREE.Mesh(new THREE.IcosahedronGeometry(0.27, 1), materials.honeyGlass), 'ISLAND_14_V2_TRIALS_NECTAR_CORE', 2, landmarkId, 'compact-exposed-nectar-challenge-core');
  nectarCore.position.set(0, 0.96, 0);
  root.add(nectarCore);

  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const x = Math.sin(angle) * 1.26;
    const z = Math.cos(angle) * 1.26;
    root.add(tubeBetween(
      new THREE.Vector3(x, 0.42, z),
      new THREE.Vector3(x, 1.92, z),
      0.095,
      materials.warmGold,
      `ISLAND_14_V2_TRIALS_ARENA_COLUMN_${index + 1}`,
      3,
      landmarkId,
      'open-arcade-column',
    ));
    const capital = hexPlate(0.15, 0.14, materials.paleGold, `ISLAND_14_V2_TRIALS_COLUMN_CAPITAL_${index + 1}`, 3, landmarkId, 'arcade-column-capital', 0.84);
    capital.position.set(x, 1.92, z);
    root.add(capital);
  }

  if (level >= 2) {
    const oculus = thickRing(0.79, 0.10, materials.paleGold, 'ISLAND_14_V2_TRIALS_OPEN_OCULUS_RING', 3, landmarkId, 'open-canopy-oculus');
    oculus.position.y = 2.02;
    const crownRing = thickRing(1.27, 0.085, materials.warmGold, 'ISLAND_14_V2_TRIALS_CROWN_RING', 3, landmarkId, 'low-arena-crown-ring');
    crownRing.position.y = 1.98;
    root.add(oculus, crownRing);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const startA = new THREE.Vector3(Math.sin(angle) * 0.82, 2.04, Math.cos(angle) * 0.82);
      const startB = new THREE.Vector3(Math.sin(angle + Math.PI / 3) * 0.82, 2.04, Math.cos(angle + Math.PI / 3) * 0.82);
      const outerA = new THREE.Vector3(Math.sin(angle) * 1.26, 1.96, Math.cos(angle) * 1.26);
      const outerB = new THREE.Vector3(Math.sin(angle + Math.PI / 3) * 1.26, 1.96, Math.cos(angle + Math.PI / 3) * 1.26);
      const canopyShape = new THREE.BufferGeometry().setFromPoints([startA, outerA, outerB, startB]);
      canopyShape.setIndex([0, 1, 2, 0, 2, 3]);
      canopyShape.computeVertexNormals();
      const canopyPanel = presentMesh(
        new THREE.Mesh(canopyShape, index % 2 === 0 ? materials.honeyGlass : materials.warmGold),
        `ISLAND_14_V2_TRIALS_HONEY_CANOPY_PANEL_${index + 1}`,
        3,
        landmarkId,
        'low-segmented-honey-oculus-canopy',
      );
      root.add(canopyPanel);
    }
  }

  if (level >= 3) {
    const createHoneyDipper = (side: -1 | 1, prefix: string) => {
      const dipper = presentGroup(new THREE.Group(), `${prefix}_${side < 0 ? 'LEFT' : 'RIGHT'}`, 5, landmarkId, 'ribbed-honey-dipper-emblem');
      const handle = presentMesh(
        new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.075, 1.38, 10), materials.darkBronze),
        `${prefix}_${side < 0 ? 'LEFT' : 'RIGHT'}_SLENDER_HANDLE`,
        5,
        landmarkId,
        'honey-dipper-handle',
      );
      handle.position.y = -0.16;
      const head = lathedBody(
        [[0.08,0],[0.18,0.04],[0.23,0.10],[0.16,0.17],[0.23,0.24],[0.16,0.31],[0.21,0.38],[0.09,0.46]],
        materials.warmGold,
        `${prefix}_${side < 0 ? 'LEFT' : 'RIGHT'}_RIBBED_HONEY_HEAD`,
        5,
        landmarkId,
        'phone-readable-grooved-honey-dipper-head',
        14,
      );
      head.position.y = 0.53;
      const glaze = presentMesh(
        new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 7), materials.honeyGlass),
        `${prefix}_${side < 0 ? 'LEFT' : 'RIGHT'}_GLOSSY_HONEY_GLAZE`,
        5,
        landmarkId,
        'glossy-honey-dipper-coating',
      );
      glaze.position.y = 0.75;
      glaze.scale.set(1.10, 0.34, 1.10);
      const drop = presentMesh(
        new THREE.Mesh(new THREE.SphereGeometry(0.075, 9, 6), materials.honeyGlass),
        `${prefix}_${side < 0 ? 'LEFT' : 'RIGHT'}_HANGING_HONEY_DROP`,
        5,
        landmarkId,
        'restrained-honey-dipper-drop',
      );
      drop.position.set(side * -0.07, 0.94, 0);
      drop.scale.set(0.76, 1.42, 0.76);
      dipper.add(handle, head, glaze, drop);
      dipper.rotation.z = side * 0.62;
      return dipper;
    };

    const frontEmblem = presentGroup(new THREE.Group(), 'ISLAND_14_V2_TRIALS_FRONT_CROSSED_HONEY_DIPPERS', 5, landmarkId, 'physically-seated-front-crossed-honey-dipper-emblem');
    frontEmblem.position.set(0, 1.45, 1.31);
    frontEmblem.add(
      createHoneyDipper(-1, 'ISLAND_14_V2_TRIALS_FRONT_DIPPER'),
      createHoneyDipper(1, 'ISLAND_14_V2_TRIALS_FRONT_DIPPER'),
    );
    const frontMedallion = hexPlate(0.28, 0.13, materials.honeyGlass, 'ISLAND_14_V2_TRIALS_FRONT_NECTAR_MEDALLION', 5, landmarkId, 'front-emblem-structural-seat', 1);
    frontMedallion.rotation.x = Math.PI / 2;
    frontMedallion.position.set(0, 1.46, 1.34);

    const rearEmblem = frontEmblem.clone(true);
    rearEmblem.name = 'ISLAND_14_V2_TRIALS_REAR_CROSSED_HONEY_DIPPERS';
    rearEmblem.position.set(0, 1.45, -1.31);
    rearEmblem.rotation.y = Math.PI;
    rearEmblem.userData = {
      ...frontEmblem.userData,
      semanticRole: 'physically-seated-rear-crossed-honey-dipper-emblem',
    };
    const rearMedallion = frontMedallion.clone();
    rearMedallion.name = 'ISLAND_14_V2_TRIALS_REAR_NECTAR_MEDALLION';
    rearMedallion.position.z = -1.34;
    rearMedallion.rotation.y = Math.PI;

    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const banner = box(0.22, 0.42, 0.055, materials.royalPurple, `ISLAND_14_V2_TRIALS_SMALL_BANNER_${index + 1}`, 5, landmarkId, 'subordinate-arena-victory-banner');
      banner.position.set(Math.sin(angle) * 1.27, 1.30, Math.cos(angle) * 1.27);
      banner.rotation.y = angle;
      root.add(banner);
    }
    root.add(frontEmblem, frontMedallion, rearEmblem, rearMedallion);
  }
  return root;
}

export const ISLAND_14_SATELLITE_LANDMARK_FACTORIES_V2 = {
  hatchery: createIsland14QueensNurseryV2,
  habit: createIsland14PollinatorYardV2,
  wisdom: createIsland14HiveArchivesV2,
  event: createIsland14NectarTrialsV2,
} as const;

export function createIsland14SatelliteLandmarkV2(
  landmarkId: keyof typeof ISLAND_14_SATELLITE_LANDMARK_FACTORIES_V2,
  level: Island14SatelliteBuildLevel,
  materials: Island14SatelliteMaterials,
) {
  return ISLAND_14_SATELLITE_LANDMARK_FACTORIES_V2[landmarkId](level, materials);
}
