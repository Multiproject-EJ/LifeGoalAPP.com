import * as THREE from 'three';

export type Island14HoneyWorldVector3 = readonly [number, number, number];

/**
 * Structural material contract: the existing Island 014 material object can be
 * passed directly without importing the legacy world module or its concrete
 * material subclasses.
 */
export interface Island14HoneyWorldMaterialsLike {
  honeyRock: THREE.Material;
  honeyRockShadow: THREE.Material;
  waxCream: THREE.Material;
  warmGold: THREE.Material;
  paleGold: THREE.Material;
  darkBronze: THREE.Material;
  royalPurple: THREE.Material;
  honeyGlass: THREE.Material;
  honeyLiquid: THREE.Material;
  honeyHighlight: THREE.Material;
  warmWindow?: THREE.Material;
  leaf?: THREE.Material;
  cloud?: THREE.Material;
  haze?: THREE.Material;
}

export const ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES = {
  world: 'ISLAND_14_HONEY_WORLD_PRESENTATION_V2',
  hero: 'ISLAND_14_V2_INTEGRATED_GREAT_HONEYFALL',
  reservoir: 'ISLAND_14_V2_HONEYFALL_CROWN_RESERVOIR',
  fall: 'ISLAND_14_V2_HONEYFALL_VOLUMETRIC_BODY',
  impactPool: 'ISLAND_14_V2_HONEYFALL_IMPACT_POOL',
  overflow: 'ISLAND_14_V2_HONEYFALL_OVERFLOW',
  terrain: 'ISLAND_14_V2_IRREGULAR_HONEY_ROCK_TERRACES',
  distantScenery: 'ISLAND_14_V2_DISTANT_HIVE_ISLET_SCENERY',
} as const;

export type Island14HoneyWorldSemanticRole =
  | 'world-presentation'
  | 'hero-honeyfall-assembly'
  | 'nectar-reservoir'
  | 'reservoir-support'
  | 'nectar-spout'
  | 'liquid-meniscus'
  | 'volumetric-honeyfall'
  | 'viscous-honey-lobe'
  | 'honey-sheen'
  | 'impact-pool'
  | 'impact-surge'
  | 'overflow-fall'
  | 'catch-pool'
  | 'terrace-enhancer'
  | 'terrace-tier'
  | 'cliff-buttress'
  | 'honeyfall-attachment-socket'
  | 'distant-scenery'
  | 'atmosphere-cloud'
  | 'atmosphere-haze'
  | 'distant-islet'
  | 'inhabited-hive'
  | 'hive-window'
  | 'hive-entry'
  | 'islet-honey-drip'
  | 'vegetation';

export interface Island14PresentationPartRecord {
  id: string;
  object: THREE.Object3D;
  role: Island14HoneyWorldSemanticRole;
}

export interface Island14IntegratedGreatHoneyfallV2Options {
  position?: Island14HoneyWorldVector3;
  scale?: number;
  seed?: number;
  namePrefix?: string;
}

export interface Island14IntegratedGreatHoneyfallV2Runtime {
  root: THREE.Group;
  reservoir: THREE.Group;
  fall: THREE.Group;
  impactPool: THREE.Group;
  overflow: THREE.Group;
  parts: Island14PresentationPartRecord[];
  animate: (elapsedSeconds: number, reducedMotion?: boolean) => void;
}

export interface Island14HoneyRockTerraceEnhancerV2Options {
  position?: Island14HoneyWorldVector3;
  scale?: number;
  radius?: number;
  seed?: number;
  sectors?: number;
}

export interface Island14DistantHiveIsletPlacement {
  angle: number;
  radius: number;
  height: number;
  scale: number;
}

export interface Island14DistantHiveIsletSceneryV2Options {
  position?: Island14HoneyWorldVector3;
  scale?: number;
  seed?: number;
  placements?: readonly Island14DistantHiveIsletPlacement[];
}

export interface Island14HoneyWorldPresentationV2Options {
  position?: Island14HoneyWorldVector3;
  scale?: number;
  honeyfall?: Island14IntegratedGreatHoneyfallV2Options | false;
  terraces?: Island14HoneyRockTerraceEnhancerV2Options | false;
  distantIslets?: Island14DistantHiveIsletSceneryV2Options | false;
}

export interface Island14HoneyWorldPresentationV2Runtime {
  root: THREE.Group;
  honeyfall?: Island14IntegratedGreatHoneyfallV2Runtime;
  terraces?: THREE.Group;
  distantIslets?: THREE.Group;
  animate: (elapsedSeconds: number, reducedMotion?: boolean) => void;
}

type ViscousProfilePoint = {
  y: number;
  x: number;
  z: number;
  width: number;
  depth: number;
};

const TAU = Math.PI * 2;
const PRESENTATION_STAGE = 5;

function applyTransform(
  root: THREE.Object3D,
  position: Island14HoneyWorldVector3 | undefined,
  scale: number | undefined,
) {
  if (position) root.position.set(position[0], position[1], position[2]);
  root.scale.setScalar(scale ?? 1);
}

function noise01(seed: number, index: number) {
  const value = Math.sin(seed * 91.733 + index * 47.117) * 43758.5453;
  return value - Math.floor(value);
}

function tagPresentationObject<T extends THREE.Object3D>(
  object: T,
  name: string,
  semanticRole: Island14HoneyWorldSemanticRole,
  materialRole: string,
  partId: string,
) {
  object.name = name;
  object.userData = {
    ...object.userData,
    island14HoneyWorldPresentationV2: true,
    presentationOnly: true,
    gameplayWrites: false,
    cameraIndependent: true,
    authored360: true,
    semanticRole,
    materialRole,
    partId,
    constructionStage: PRESENTATION_STAGE,
  };
  if (object instanceof THREE.Mesh) {
    object.castShadow = true;
    object.receiveShadow = true;
    object.userData.hasRealSideThickness = true;
  }
  return object;
}

function finishGeometry(geometry: THREE.BufferGeometry) {
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();
  return geometry;
}

/** Closed irregular prism used for rock shelves, islands and pools. */
function createIrregularDiscGeometry(
  topRadius: number,
  bottomRadius: number,
  height: number,
  segments: number,
  seed: number,
  radialVariation = 0.1,
) {
  const positions: number[] = [0, height * 0.5, 0, 0, -height * 0.5, 0];
  const topRadii: number[] = [];
  const bottomRadii: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const sharedVariation = (noise01(seed, index) - 0.5) * 2 * radialVariation;
    topRadii.push(topRadius * (1 + sharedVariation));
    bottomRadii.push(bottomRadius * (1 + sharedVariation * 0.72 + (noise01(seed + 19, index) - 0.5) * 0.05));
  }
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * TAU;
    positions.push(Math.cos(angle) * topRadii[index], height * 0.5, Math.sin(angle) * topRadii[index]);
  }
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * TAU;
    positions.push(Math.cos(angle) * bottomRadii[index], -height * 0.5, Math.sin(angle) * bottomRadii[index]);
  }
  const indices: number[] = [];
  const topStart = 2;
  const bottomStart = 2 + segments;
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    indices.push(0, topStart + next, topStart + index);
    indices.push(1, bottomStart + index, bottomStart + next);
    indices.push(
      topStart + index,
      topStart + next,
      bottomStart + next,
      topStart + index,
      bottomStart + next,
      bottomStart + index,
    );
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return finishGeometry(geometry);
}

/** Closed annular wedge with top, underside, radial walls and both end caps. */
function createAnnularSectorGeometry(
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
  bottomY: number,
  topY: number,
  steps = 5,
) {
  const positions: number[] = [];
  for (let step = 0; step <= steps; step += 1) {
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, step / steps);
    const cosine = Math.cos(angle);
    const sine = Math.sin(angle);
    positions.push(
      cosine * innerRadius, topY, sine * innerRadius,
      cosine * outerRadius, topY, sine * outerRadius,
      cosine * innerRadius, bottomY, sine * innerRadius,
      cosine * outerRadius, bottomY, sine * outerRadius,
    );
  }
  const indices: number[] = [];
  for (let step = 0; step < steps; step += 1) {
    const current = step * 4;
    const next = (step + 1) * 4;
    const topInner = current;
    const topOuter = current + 1;
    const bottomInner = current + 2;
    const bottomOuter = current + 3;
    const nextTopInner = next;
    const nextTopOuter = next + 1;
    const nextBottomInner = next + 2;
    const nextBottomOuter = next + 3;
    indices.push(
      topInner, nextTopOuter, topOuter,
      topInner, nextTopInner, nextTopOuter,
      bottomInner, bottomOuter, nextBottomOuter,
      bottomInner, nextBottomOuter, nextBottomInner,
      topOuter, nextTopOuter, nextBottomOuter,
      topOuter, nextBottomOuter, bottomOuter,
      topInner, bottomInner, nextBottomInner,
      topInner, nextBottomInner, nextTopInner,
    );
  }
  indices.push(0, 1, 3, 0, 3, 2);
  const final = steps * 4;
  indices.push(final, final + 3, final + 1, final, final + 2, final + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return finishGeometry(geometry);
}

/**
 * A closed, wide, asymmetrical honey solid. It is deliberately not a tube:
 * width and depth are independently authored at every height band.
 */
function createViscousSolidGeometry(profile: readonly ViscousProfilePoint[], radialSegments = 12) {
  const positions: number[] = [];
  profile.forEach((point, profileIndex) => {
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const angle = radialIndex / radialSegments * TAU;
      const edgeWarp = 1 + Math.sin(profileIndex * 1.73 + radialIndex * 2.19) * 0.035;
      positions.push(
        point.x + Math.cos(angle) * point.width * 0.5 * edgeWarp,
        point.y,
        point.z + Math.sin(angle) * point.depth * 0.5 * edgeWarp,
      );
    }
  });
  const topCenter = positions.length / 3;
  const top = profile[0];
  positions.push(top.x, top.y, top.z);
  const bottomCenter = positions.length / 3;
  const bottom = profile[profile.length - 1];
  positions.push(bottom.x, bottom.y, bottom.z);
  const indices: number[] = [];
  for (let profileIndex = 0; profileIndex < profile.length - 1; profileIndex += 1) {
    const currentStart = profileIndex * radialSegments;
    const nextStart = (profileIndex + 1) * radialSegments;
    for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
      const radialNext = (radialIndex + 1) % radialSegments;
      indices.push(
        currentStart + radialIndex,
        currentStart + radialNext,
        nextStart + radialNext,
        currentStart + radialIndex,
        nextStart + radialNext,
        nextStart + radialIndex,
      );
    }
  }
  const bottomStart = (profile.length - 1) * radialSegments;
  for (let radialIndex = 0; radialIndex < radialSegments; radialIndex += 1) {
    const radialNext = (radialIndex + 1) % radialSegments;
    indices.push(topCenter, radialNext, radialIndex);
    indices.push(bottomCenter, bottomStart + radialIndex, bottomStart + radialNext);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return finishGeometry(geometry);
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  semanticRole: Island14HoneyWorldSemanticRole,
  materialRole: string,
  partId: string,
) {
  return tagPresentationObject(
    new THREE.Mesh(geometry, material),
    name,
    semanticRole,
    materialRole,
    partId,
  );
}

function createHexRelief(
  radius: number,
  depth: number,
  material: THREE.Material,
  name: string,
  role: Island14HoneyWorldSemanticRole,
  materialRole: string,
  partId: string,
) {
  const relief = mesh(
    new THREE.CylinderGeometry(radius, radius, depth, 6),
    material,
    name,
    role,
    materialRole,
    partId,
  );
  relief.rotation.x = Math.PI / 2;
  return relief;
}

export function createIsland14IntegratedGreatHoneyfallV2(
  materials: Island14HoneyWorldMaterialsLike,
  options: Island14IntegratedGreatHoneyfallV2Options = {},
): Island14IntegratedGreatHoneyfallV2Runtime {
  const seed = options.seed ?? 14024;
  const prefix = options.namePrefix ?? 'ISLAND_14_V2_HONEYFALL';
  const root = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.hero,
    'hero-honeyfall-assembly',
    'mixed-honey-architecture',
    'great-honeyfall-v2',
  );
  applyTransform(root, options.position, options.scale);

  const reservoir = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.reservoir,
    'nectar-reservoir',
    'honey-rock-gold-liquid',
    'great-honeyfall-reservoir',
  );
  const reservoirPlinth = mesh(
    createIrregularDiscGeometry(1.48, 1.32, 0.62, 14, seed, 0.08),
    materials.honeyRock,
    `${prefix}_RESERVOIR_ROCK_PLINTH`,
    'reservoir-support',
    'honey-rock',
    'great-honeyfall-reservoir',
  );
  reservoirPlinth.position.y = 4.62;
  reservoir.add(reservoirPlinth);

  const cisternProfile = [
    new THREE.Vector2(0, -0.46),
    new THREE.Vector2(0.78, -0.46),
    new THREE.Vector2(1.04, -0.27),
    new THREE.Vector2(1.16, 0.08),
    new THREE.Vector2(1.08, 0.42),
    new THREE.Vector2(0.82, 0.54),
    new THREE.Vector2(0, 0.54),
  ];
  const cistern = mesh(
    new THREE.LatheGeometry(cisternProfile, 18),
    materials.warmGold,
    `${prefix}_SOLID_CROWN_CISTERN`,
    'nectar-reservoir',
    'royal-gold',
    'great-honeyfall-reservoir',
  );
  cistern.position.y = 5.15;
  reservoir.add(cistern);

  const nectarSurface = mesh(
    new THREE.SphereGeometry(0.82, 18, 12),
    materials.honeyLiquid,
    `${prefix}_RESERVOIR_NECTAR_SURFACE`,
    'nectar-reservoir',
    'liquid-honey',
    'great-honeyfall-reservoir',
  );
  nectarSurface.position.y = 5.67;
  nectarSurface.scale.set(1, 0.13, 1);
  reservoir.add(nectarSurface);

  for (let buttressIndex = 0; buttressIndex < 6; buttressIndex += 1) {
    const angle = buttressIndex / 6 * TAU;
    const buttress = mesh(
      new THREE.BoxGeometry(0.23, 0.92, 0.34),
      buttressIndex % 2 ? materials.paleGold : materials.darkBronze,
      `${prefix}_RESERVOIR_BUTTRESS_${buttressIndex + 1}`,
      'reservoir-support',
      buttressIndex % 2 ? 'pale-gold' : 'dark-bronze',
      'great-honeyfall-reservoir',
    );
    buttress.position.set(Math.cos(angle) * 1.18, 4.92, Math.sin(angle) * 1.18);
    buttress.rotation.y = -angle;
    reservoir.add(buttress);
  }

  const spout = mesh(
    createIrregularDiscGeometry(0.58, 0.52, 0.82, 8, seed + 8, 0.05),
    materials.warmGold,
    `${prefix}_DEEP_ATTACHED_SPILLWAY`,
    'nectar-spout',
    'royal-gold',
    'great-honeyfall-spout',
  );
  spout.rotation.x = Math.PI / 2;
  spout.scale.set(1.25, 1, 0.72);
  spout.position.set(0, 4.48, 0.91);
  reservoir.add(spout);

  const spoutNectar = mesh(
    createViscousSolidGeometry([
      { x: 0, y: 4.68, z: 0.68, width: 0.82, depth: 0.52 },
      { x: -0.02, y: 4.48, z: 0.92, width: 1.0, depth: 0.55 },
      { x: 0.03, y: 4.30, z: 1.03, width: 1.13, depth: 0.5 },
    ]),
    materials.honeyGlass,
    `${prefix}_WELDED_SPILLWAY_NECTAR`,
    'nectar-spout',
    'deep-amber-honey',
    'great-honeyfall-spout',
  );
  reservoir.add(spoutNectar);
  root.add(reservoir);

  const fall = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.fall,
    'volumetric-honeyfall',
    'liquid-honey',
    'great-honeyfall-body',
  );
  const mainFallProfile: ViscousProfilePoint[] = [
    { x: 0.00, y: 5.18, z: 0.78, width: 0.92, depth: 0.82 },
    { x: 0.04, y: 4.82, z: 0.88, width: 1.18, depth: 0.84 },
    { x: 0.02, y: 4.36, z: 1.01, width: 1.12, depth: 0.50 },
    { x: -0.08, y: 3.95, z: 1.04, width: 1.42, depth: 0.56 },
    { x: 0.07, y: 3.48, z: 1.06, width: 1.56, depth: 0.59 },
    { x: -0.12, y: 2.94, z: 1.09, width: 1.45, depth: 0.63 },
    { x: 0.10, y: 2.38, z: 1.12, width: 1.72, depth: 0.65 },
    { x: -0.04, y: 1.82, z: 1.15, width: 1.62, depth: 0.69 },
    { x: 0.13, y: 1.27, z: 1.20, width: 1.92, depth: 0.73 },
    { x: 0.02, y: 0.87, z: 1.26, width: 2.12, depth: 0.78 },
  ];
  const mainFall = mesh(
    createViscousSolidGeometry(mainFallProfile, 14),
    materials.honeyLiquid,
    `${prefix}_THICK_ASYMMETRICAL_MAIN_FALL`,
    'volumetric-honeyfall',
    'liquid-honey',
    'great-honeyfall-body',
  );
  mainFall.userData.attachment = {
    parentSocket: `${prefix}_DEEP_ATTACHED_SPILLWAY`,
    contactType: 'overlapping-weld',
    overlap: 0.22,
    downstreamSocket: ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.impactPool,
  };
  fall.add(mainFall);

  // A broad 360 nectar shoulder keeps the moved/scaled crown reservoir fused
  // to the hero body. It is deliberately a closed viscous mass rather than a
  // collar hoop, pipe or view-facing patch.
  const crownWeld = mesh(
    createViscousSolidGeometry([
      { x: 0, y: 5.28, z: 0.42, width: 0.88, depth: 0.90 },
      { x: 0, y: 4.92, z: 0.58, width: 1.34, depth: 1.22 },
      { x: 0, y: 4.46, z: 0.78, width: 1.52, depth: 1.36 },
      { x: 0, y: 4.04, z: 0.88, width: 1.38, depth: 1.30 },
    ], 16),
    materials.honeyGlass,
    `${prefix}_BROAD_RESERVOIR_TO_FALL_WELD`,
    'liquid-meniscus',
    'deep-amber-honey',
    'great-honeyfall-body',
  );
  crownWeld.userData.attachment = {
    parentSocket: `${prefix}_RESERVOIR_NECTAR_SURFACE`,
    contactType: 'broad-360-overlap-weld',
    overlap: 0.42,
  };
  fall.add(crownWeld);

  const allFaceCascades: THREE.Mesh[] = [mainFall];
  const cascadeAngles = [Math.PI / 2, Math.PI, Math.PI * 1.5];
  cascadeAngles.forEach((angle, cascadeIndex) => {
    const cascade = mesh(
      createViscousSolidGeometry([
        { x: 0.02, y: 4.62, z: 0.56, width: 0.72, depth: 0.46 },
        { x: -0.08, y: 4.06, z: 0.74, width: 0.92, depth: 0.52 },
        { x: 0.10, y: 3.32, z: 0.88, width: 1.04, depth: 0.58 },
        { x: -0.06, y: 2.52, z: 1.00, width: 0.88, depth: 0.62 },
        { x: 0.08, y: 1.72, z: 1.12, width: 1.14, depth: 0.70 },
        { x: 0.00, y: 0.86, z: 1.24, width: 1.42, depth: 0.78 },
      ], 12),
      cascadeIndex === 1 ? materials.honeyLiquid : materials.honeyGlass,
      `${prefix}_AUTHORED_${['RIGHT', 'REAR', 'LEFT'][cascadeIndex]}_CASCADE`,
      'volumetric-honeyfall',
      cascadeIndex === 1 ? 'liquid-honey' : 'deep-amber-honey',
      'great-honeyfall-body',
    );
    cascade.rotation.y = angle;
    cascade.userData.attachment = {
      parentSocket: `${prefix}_BROAD_RESERVOIR_TO_FALL_WELD`,
      contactType: 'multi-face-fused-overlap',
      overlap: 0.30,
      orbitCoverageDegrees: Math.round(angle * 180 / Math.PI),
    };
    allFaceCascades.push(cascade);
    fall.add(cascade);

    const sheen = mesh(
      createViscousSolidGeometry([
        { x: -0.11, y: 4.28, z: 0.82, width: 0.13, depth: 0.14 },
        { x: 0.04, y: 3.54, z: 1.03, width: 0.16, depth: 0.16 },
        { x: -0.06, y: 2.72, z: 1.16, width: 0.12, depth: 0.15 },
        { x: 0.03, y: 1.88, z: 1.28, width: 0.18, depth: 0.18 },
        { x: -0.02, y: 1.22, z: 1.35, width: 0.10, depth: 0.13 },
      ], 8),
      materials.honeyHighlight,
      `${prefix}_${['RIGHT', 'REAR', 'LEFT'][cascadeIndex]}_SOLID_RUNNING_GLINT`,
      'honey-sheen',
      'honey-highlight',
      'great-honeyfall-body',
    );
    sheen.rotation.y = angle;
    sheen.castShadow = false;
    sheen.userData.attachment = {
      parentSocket: cascade.name,
      contactType: 'surface-embedded-solid',
      embedDepth: 0.05,
    };
    fall.add(sheen);
  });

  [-0.62, 0.66].forEach((x, lobeIndex) => {
    const side = lobeIndex === 0 ? -1 : 1;
    const lobe = mesh(
      createViscousSolidGeometry([
        { x, y: 4.05, z: 1.02, width: 0.54, depth: 0.42 },
        { x: x + side * 0.10, y: 3.24, z: 1.08, width: 0.62, depth: 0.46 },
        { x: x - side * 0.04, y: 2.38, z: 1.14, width: 0.48, depth: 0.50 },
        { x: x + side * 0.12, y: 1.55, z: 1.20, width: 0.70, depth: 0.55 },
        { x: x + side * 0.06, y: 0.94, z: 1.27, width: 0.86, depth: 0.62 },
      ], 10),
      materials.honeyGlass,
      `${prefix}_FUSED_SIDE_LOBE_${lobeIndex + 1}`,
      'viscous-honey-lobe',
      'deep-amber-honey',
      'great-honeyfall-body',
    );
    lobe.userData.attachment = {
      parentSocket: `${prefix}_THICK_ASYMMETRICAL_MAIN_FALL`,
      contactType: 'fused-overlap',
      overlap: 0.18,
    };
    fall.add(lobe);
  });

  const glints: THREE.Mesh[] = [];
  [
    [-0.31, 3.18, 1.38, 0.12, 0.86] as const,
    [0.43, 2.20, 1.47, 0.10, 0.62] as const,
    [-0.48, 1.50, 1.52, 0.09, 0.43] as const,
  ].forEach(([x, y, z, radius, height], glintIndex) => {
    const glint = mesh(
      new THREE.SphereGeometry(radius, 12, 8),
      materials.honeyHighlight,
      `${prefix}_SOLID_SURFACE_GLINT_${glintIndex + 1}`,
      'viscous-honey-lobe',
      'honey-highlight',
      'great-honeyfall-body',
    );
    glint.position.set(x, y, z);
    glint.scale.set(1, height / radius, 0.72);
    glint.castShadow = false;
    glint.userData.attachment = {
      parentSocket: `${prefix}_THICK_ASYMMETRICAL_MAIN_FALL`,
      contactType: 'surface-embedded',
      embedDepth: 0.04,
    };
    glints.push(glint);
    fall.add(glint);
  });
  root.add(fall);

  const impactPool = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.impactPool,
    'impact-pool',
    'honey-rock-gold-liquid',
    'great-honeyfall-impact-pool',
  );
  impactPool.position.set(0, 0, 1.30);
  const poolBed = mesh(
    createIrregularDiscGeometry(2.25, 2.08, 0.42, 18, seed + 31, 0.09),
    materials.honeyRockShadow,
    `${prefix}_IMPACT_POOL_ROCK_BED`,
    'impact-pool',
    'honey-rock-shadow',
    'great-honeyfall-impact-pool',
  );
  poolBed.position.y = 0.47;
  impactPool.add(poolBed);
  const pooledHoney = mesh(
    createIrregularDiscGeometry(2.08, 1.94, 0.28, 20, seed + 37, 0.09),
    materials.honeyLiquid,
    `${prefix}_THICK_IMPACT_POOL_NECTAR`,
    'impact-pool',
    'liquid-honey',
    'great-honeyfall-impact-pool',
  );
  pooledHoney.position.y = 0.82;
  impactPool.add(pooledHoney);
  for (let rimIndex = 0; rimIndex < 12; rimIndex += 1) {
    const angleStart = rimIndex / 12 * TAU + 0.012;
    const angleEnd = (rimIndex + 1) / 12 * TAU - 0.012;
    const rim = mesh(
      createAnnularSectorGeometry(1.76, 2.18 + (rimIndex % 3) * 0.06, angleStart, angleEnd, 0.64, 0.94, 3),
      rimIndex % 3 === 0 ? materials.honeyRock : rimIndex % 2 ? materials.paleGold : materials.warmGold,
      `${prefix}_IMPACT_BASIN_MASONRY_${rimIndex + 1}`,
      'impact-pool',
      rimIndex % 3 === 0 ? 'honey-rock' : 'royal-gold',
      'great-honeyfall-impact-pool',
    );
    impactPool.add(rim);
  }

  const poolMeniscus = mesh(
    createIrregularDiscGeometry(2.16, 2.02, 0.18, 22, seed + 41, 0.065),
    materials.honeyGlass,
    `${prefix}_BROAD_GLOSSY_IMPACT_MENISCUS`,
    'liquid-meniscus',
    'deep-amber-honey',
    'great-honeyfall-impact-pool',
  );
  poolMeniscus.position.y = 0.91;
  poolMeniscus.userData.attachment = {
    parentSocket: `${prefix}_THICK_IMPACT_POOL_NECTAR`,
    contactType: 'full-surface-overlap',
    overlap: 0.16,
  };
  impactPool.add(poolMeniscus);
  const surgeLobes: THREE.Mesh[] = [];
  for (let surgeIndex = 0; surgeIndex < 12; surgeIndex += 1) {
    const angle = surgeIndex / 12 * TAU + 0.12;
    const surge = mesh(
      new THREE.SphereGeometry(0.30 + surgeIndex % 3 * 0.05, 12, 8),
      surgeIndex % 3 === 0 ? materials.honeyHighlight : materials.honeyLiquid,
      `${prefix}_IMPACT_SURGE_LOBE_${surgeIndex + 1}`,
      'impact-surge',
      surgeIndex % 3 === 0 ? 'honey-highlight' : 'liquid-honey',
      'great-honeyfall-impact-pool',
    );
    surge.position.set(Math.cos(angle) * (0.78 + surgeIndex % 3 * 0.16), 1.02, Math.sin(angle) * (0.74 + surgeIndex % 2 * 0.12));
    surge.scale.set(1.42, 0.58 + surgeIndex % 2 * 0.16, 1.08);
    surge.userData.baseY = surge.position.y;
    surge.castShadow = false;
    surgeLobes.push(surge);
    impactPool.add(surge);
  }
  root.add(impactPool);

  const overflow = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.overflow,
    'overflow-fall',
    'liquid-honey',
    'great-honeyfall-overflow',
  );
  const overflowFall = mesh(
    createViscousSolidGeometry([
      { x: 0.12, y: 0.78, z: 2.92, width: 1.16, depth: 0.52 },
      { x: 0.02, y: 0.40, z: 3.00, width: 1.34, depth: 0.58 },
      { x: -0.12, y: -0.08, z: 3.08, width: 1.18, depth: 0.60 },
      { x: 0.09, y: -0.56, z: 3.17, width: 1.48, depth: 0.67 },
      { x: 0.02, y: -0.91, z: 3.25, width: 1.68, depth: 0.72 },
    ], 12),
    materials.honeyGlass,
    `${prefix}_THICK_POOL_OVERFLOW_FALL`,
    'overflow-fall',
    'deep-amber-honey',
    'great-honeyfall-overflow',
  );
  overflowFall.userData.attachment = {
    parentSocket: `${prefix}_THICK_IMPACT_POOL_NECTAR`,
    contactType: 'overflowing-weld',
    overlap: 0.24,
  };
  overflow.add(overflowFall);
  const overflowFalls: THREE.Mesh[] = [overflowFall];

  [Math.PI / 2, Math.PI, Math.PI * 1.5].forEach((angle, overflowIndex) => {
    const pivot = tagPresentationObject(
      new THREE.Group(),
      `${prefix}_${['RIGHT', 'REAR', 'LEFT'][overflowIndex]}_OVERFLOW_BRANCH`,
      'overflow-fall',
      'liquid-honey-and-rock',
      'great-honeyfall-overflow',
    );
    pivot.position.z = 1.30;
    pivot.rotation.y = angle;
    const branch = mesh(
      createViscousSolidGeometry([
        { x: 0.04, y: 0.84, z: 1.54, width: 0.78, depth: 0.44 },
        { x: -0.05, y: 0.44, z: 1.69, width: 0.94, depth: 0.50 },
        { x: 0.07, y: -0.04, z: 1.80, width: 0.82, depth: 0.54 },
        { x: -0.03, y: -0.54, z: 1.92, width: 1.08, depth: 0.62 },
        { x: 0.02, y: -0.90, z: 2.04, width: 1.24, depth: 0.68 },
      ], 10),
      overflowIndex === 1 ? materials.honeyLiquid : materials.honeyGlass,
      `${prefix}_${['RIGHT', 'REAR', 'LEFT'][overflowIndex]}_THICK_POOL_OVERFLOW`,
      'overflow-fall',
      overflowIndex === 1 ? 'liquid-honey' : 'deep-amber-honey',
      'great-honeyfall-overflow',
    );
    branch.userData.attachment = {
      parentSocket: `${prefix}_BROAD_GLOSSY_IMPACT_MENISCUS`,
      contactType: 'broad-rim-overflow-weld',
      overlap: 0.22,
      orbitCoverageDegrees: Math.round(angle * 180 / Math.PI),
    };
    pivot.add(branch);
    overflowFalls.push(branch);

    const branchRock = mesh(
      createIrregularDiscGeometry(1.04, 0.92, 0.54, 12, seed + 71 + overflowIndex * 13, 0.11),
      overflowIndex % 2 ? materials.honeyRock : materials.honeyRockShadow,
      `${prefix}_${['RIGHT', 'REAR', 'LEFT'][overflowIndex]}_CATCH_POOL_ROCK_SHELF`,
      'catch-pool',
      overflowIndex % 2 ? 'honey-rock' : 'honey-rock-shadow',
      'great-honeyfall-overflow',
    );
    branchRock.position.set(0, -1.13, 2.10);
    pivot.add(branchRock);
    const branchPool = mesh(
      createIrregularDiscGeometry(0.92, 0.84, 0.22, 14, seed + 79 + overflowIndex * 17, 0.09),
      materials.honeyLiquid,
      `${prefix}_${['RIGHT', 'REAR', 'LEFT'][overflowIndex]}_WELDED_CATCH_MENISCUS`,
      'catch-pool',
      'liquid-honey',
      'great-honeyfall-overflow',
    );
    branchPool.position.set(0, -0.92, 2.10);
    branchPool.userData.attachment = {
      parentSocket: branch.name,
      contactType: 'impact-and-rock-overlap',
      overlap: 0.20,
    };
    pivot.add(branchPool);
    overflow.add(pivot);
  });

  const catchSupport = mesh(
    createIrregularDiscGeometry(1.54, 1.38, 0.62, 16, seed + 53, 0.10),
    materials.honeyRockShadow,
    `${prefix}_LOWER_CATCH_POOL_ROCK_SHELF`,
    'catch-pool',
    'honey-rock-shadow',
    'great-honeyfall-overflow',
  );
  catchSupport.position.set(0, -1.25, 3.34);
  overflow.add(catchSupport);
  const catchPool = mesh(
    createIrregularDiscGeometry(1.42, 1.30, 0.32, 16, seed + 59, 0.1),
    materials.honeyLiquid,
    `${prefix}_LOWER_CATCH_POOL`,
    'catch-pool',
    'liquid-honey',
    'great-honeyfall-overflow',
  );
  catchPool.position.set(0, -1.02, 3.34);
  catchPool.userData.attachment = {
    parentSocket: `${prefix}_THICK_POOL_OVERFLOW_FALL`,
    contactType: 'impact-overlap',
    overlap: 0.18,
  };
  overflow.add(catchPool);

  const catchMeniscus = mesh(
    createIrregularDiscGeometry(1.48, 1.38, 0.16, 18, seed + 61, 0.08),
    materials.honeyGlass,
    `${prefix}_LOWER_CATCH_POOL_GLOSSY_MENISCUS`,
    'liquid-meniscus',
    'deep-amber-honey',
    'great-honeyfall-overflow',
  );
  catchMeniscus.position.set(0, -0.84, 3.34);
  catchMeniscus.userData.attachment = {
    parentSocket: catchPool.name,
    contactType: 'full-surface-overlap',
    overlap: 0.12,
  };
  overflow.add(catchMeniscus);
  root.add(overflow);

  const parts: Island14PresentationPartRecord[] = [
    { id: 'great-honeyfall-reservoir', object: reservoir, role: 'nectar-reservoir' },
    { id: 'great-honeyfall-body', object: fall, role: 'volumetric-honeyfall' },
    { id: 'great-honeyfall-impact-pool', object: impactPool, role: 'impact-pool' },
    { id: 'great-honeyfall-overflow', object: overflow, role: 'overflow-fall' },
  ];
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    presentationOnly: true,
    parts,
    sockets: {
      reservoir: `${prefix}_RESERVOIR_NECTAR_SURFACE`,
      fallTop: `${prefix}_WELDED_SPILLWAY_NECTAR`,
      impactPool: `${prefix}_THICK_IMPACT_POOL_NECTAR`,
      overflow: `${prefix}_THICK_POOL_OVERFLOW_FALL`,
    },
    orbitCoverage: {
      cascadeFaces: allFaceCascades.map((cascade) => cascade.name),
      overflowFaces: overflowFalls.map((branch) => branch.name),
      degrees: [0, 90, 180, 270],
    },
  };

  const animate = (elapsedSeconds: number, reducedMotion = false) => {
    const pulse = reducedMotion ? 1 : 1 + Math.sin(elapsedSeconds * 1.35) * 0.035;
    glints.forEach((glint, index) => {
      glint.scale.x = pulse * (index % 2 ? 0.96 : 1.04);
      glint.scale.z = 0.72 * pulse;
    });
    surgeLobes.forEach((surge, index) => {
      const baseY = Number(surge.userData.baseY ?? 1.02);
      surge.position.y = reducedMotion ? baseY : baseY + Math.sin(elapsedSeconds * 1.7 + index * 0.8) * 0.025;
    });
  };

  return { root, reservoir, fall, impactPool, overflow, parts, animate };
}

export function createIsland14HoneyRockTerraceEnhancerV2(
  materials: Island14HoneyWorldMaterialsLike,
  options: Island14HoneyRockTerraceEnhancerV2Options = {},
) {
  const seed = options.seed ?? 14041;
  const radius = options.radius ?? 6.35;
  const sectorCount = Math.max(8, Math.round(options.sectors ?? 12));
  const root = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.terrain,
    'terrace-enhancer',
    'honey-rock-gold',
    'honey-rock-terrace-enhancer-v2',
  );
  applyTransform(root, options.position, options.scale);

  const tiers = [
    { id: 'LOWER', inner: 0.73, outer: 1.04, bottom: -2.65, top: -0.72, material: materials.honeyRockShadow },
    { id: 'MIDDLE', inner: 0.78, outer: 1.00, bottom: -0.86, top: -0.12, material: materials.honeyRock },
    { id: 'UPPER', inner: 0.82, outer: 0.96, bottom: -0.20, top: 0.38, material: materials.waxCream },
  ];
  tiers.forEach((tier, tierIndex) => {
    for (let sectorIndex = 0; sectorIndex < sectorCount; sectorIndex += 1) {
      const sectorAngle = TAU / sectorCount;
      const angularJitter = (noise01(seed + tierIndex * 31, sectorIndex) - 0.5) * sectorAngle * 0.12;
      const start = sectorIndex * sectorAngle - sectorAngle * 0.035 + angularJitter;
      const end = (sectorIndex + 1) * sectorAngle + sectorAngle * 0.035 + angularJitter;
      const outerVariation = 0.93 + noise01(seed + tierIndex * 53, sectorIndex + 12) * 0.14;
      const innerVariation = 0.97 + noise01(seed + tierIndex * 67, sectorIndex + 29) * 0.06;
      const topVariation = (noise01(seed + 79, sectorIndex + tierIndex * 17) - 0.5) * 0.18;
      const sector = mesh(
        createAnnularSectorGeometry(
          radius * tier.inner * innerVariation,
          radius * tier.outer * outerVariation,
          start,
          end,
          tier.bottom - tierIndex * 0.04,
          tier.top + topVariation,
          5,
        ),
        sectorIndex % 4 === 0 && tierIndex !== 2 ? materials.warmGold : tier.material,
        `ISLAND_14_V2_TERRACE_${tier.id}_SECTOR_${sectorIndex + 1}`,
        'terrace-tier',
        sectorIndex % 4 === 0 && tierIndex !== 2 ? 'royal-gold' : `honey-rock-${tier.id.toLowerCase()}`,
        `terrace-${tier.id.toLowerCase()}-${sectorIndex + 1}`,
      );
      root.add(sector);
    }
  });

  // Broad irregular masses now continue around the full island. Their overlap
  // creates a stepped cliff wall without inverted cones or stalactite spikes.
  for (let buttressIndex = 0; buttressIndex < 16; buttressIndex += 1) {
    const angle = buttressIndex / 16 * TAU + 0.11;
    const buttress = mesh(
      new THREE.DodecahedronGeometry(0.72 + buttressIndex % 3 * 0.12, 0),
      buttressIndex % 3 === 0 ? materials.honeyRock : materials.honeyRockShadow,
      `ISLAND_14_V2_BROAD_CLIFF_BUTTRESS_${buttressIndex + 1}`,
      'cliff-buttress',
      buttressIndex % 3 === 0 ? 'honey-rock' : 'honey-rock-shadow',
      `broad-cliff-buttress-${buttressIndex + 1}`,
    );
    const reach = radius * (0.88 + buttressIndex % 3 * 0.035);
    buttress.position.set(Math.cos(angle) * reach, -1.38 - buttressIndex % 4 * 0.19, Math.sin(angle) * reach);
    buttress.scale.set(1.34 + buttressIndex % 2 * 0.18, 1.48 + buttressIndex % 3 * 0.22, 1.16 + buttressIndex % 2 * 0.10);
    buttress.rotation.set(0.08 * (buttressIndex % 2 ? 1 : -1), angle * 0.37, 0.1 * Math.cos(angle));
    root.add(buttress);
  }

  const honeyfallSocketAngles = [0.26, 0.72, 1.28, 1.82, 2.36, 2.86, 3.68, 5.42];
  honeyfallSocketAngles.forEach((angle, socketIndex) => {
    const socket = tagPresentationObject(
      new THREE.Object3D(),
      `ISLAND_14_V2_CLIFF_HONEYFALL_SOCKET_${socketIndex + 1}`,
      'honeyfall-attachment-socket',
      'none',
      `cliff-honeyfall-socket-${socketIndex + 1}`,
    );
    socket.position.set(Math.cos(angle) * radius * 0.96, 0.25, Math.sin(angle) * radius * 0.96);
    socket.rotation.y = -angle + Math.PI / 2;
    socket.userData.attachment = {
      contactType: 'terrain-edge-socket',
      outwardNormal: [Math.cos(angle), 0, Math.sin(angle)],
      protectedRouteInteriorRadius: radius * 0.72,
    };
    root.add(socket);
  });

  const cliffCascadeNames: string[] = [];
  honeyfallSocketAngles.forEach((angle, cascadeIndex) => {
    const cascadeRoot = tagPresentationObject(
      new THREE.Group(),
      `ISLAND_14_V2_CLIFF_CASCADE_ASSEMBLY_${cascadeIndex + 1}`,
      'volumetric-honeyfall',
      'liquid-honey-and-rock',
      `cliff-honey-cascade-${cascadeIndex + 1}`,
    );
    cascadeRoot.rotation.y = Math.PI / 2 - angle;
    const width = 0.70 + cascadeIndex % 3 * 0.22;
    const ledgeRadius = radius * (0.91 + cascadeIndex % 2 * 0.018);
    const cascade = mesh(
      createViscousSolidGeometry([
        { x: 0.02, y: 0.46, z: ledgeRadius, width: width * 1.18, depth: 0.52 },
        { x: -0.08, y: 0.08, z: ledgeRadius + 0.10, width: width * 1.30, depth: 0.58 },
        { x: 0.07, y: -0.62, z: ledgeRadius + 0.18, width, depth: 0.62 },
        { x: -0.05, y: -1.34, z: ledgeRadius + 0.24, width: width * 1.16, depth: 0.66 },
        { x: 0.09, y: -2.02, z: ledgeRadius + 0.30, width: width * 0.90, depth: 0.64 },
        { x: 0.00, y: -2.38, z: ledgeRadius + 0.35, width: width * 1.42, depth: 0.72 },
      ], 10),
      cascadeIndex % 3 === 0 ? materials.honeyLiquid : materials.honeyGlass,
      `ISLAND_14_V2_BROAD_ATTACHED_CLIFF_HONEY_${cascadeIndex + 1}`,
      'volumetric-honeyfall',
      cascadeIndex % 3 === 0 ? 'liquid-honey' : 'deep-amber-honey',
      `cliff-honey-cascade-${cascadeIndex + 1}`,
    );
    cascade.userData.attachment = {
      parentSocket: `ISLAND_14_V2_CLIFF_HONEYFALL_SOCKET_${cascadeIndex + 1}`,
      contactType: 'broad-ledged-overlap',
      overlap: 0.32,
    };
    cascadeRoot.add(cascade);

    const ledgeMeniscus = mesh(
      createViscousSolidGeometry([
        { x: 0, y: 0.55, z: ledgeRadius - 0.30, width: width * 1.56, depth: 0.62 },
        { x: 0.02, y: 0.43, z: ledgeRadius + 0.04, width: width * 1.72, depth: 0.72 },
        { x: -0.02, y: 0.30, z: ledgeRadius + 0.16, width: width * 1.34, depth: 0.58 },
      ], 10),
      materials.honeyHighlight,
      `ISLAND_14_V2_CLIFF_HONEY_MENISCUS_${cascadeIndex + 1}`,
      'liquid-meniscus',
      'honey-highlight',
      `cliff-honey-cascade-${cascadeIndex + 1}`,
    );
    ledgeMeniscus.castShadow = false;
    cascadeRoot.add(ledgeMeniscus);

    const catchRock = mesh(
      createIrregularDiscGeometry(width * 1.08, width * 0.96, 0.48, 12, seed + 211 + cascadeIndex * 19, 0.11),
      cascadeIndex % 2 ? materials.honeyRock : materials.honeyRockShadow,
      `ISLAND_14_V2_CLIFF_HONEY_CATCH_ROCK_${cascadeIndex + 1}`,
      'catch-pool',
      cascadeIndex % 2 ? 'honey-rock' : 'honey-rock-shadow',
      `cliff-honey-cascade-${cascadeIndex + 1}`,
    );
    catchRock.position.set(0, -2.54, ledgeRadius + 0.38);
    cascadeRoot.add(catchRock);
    const catchPool = mesh(
      createIrregularDiscGeometry(width * 0.94, width * 0.86, 0.18, 14, seed + 229 + cascadeIndex * 23, 0.08),
      materials.honeyLiquid,
      `ISLAND_14_V2_CLIFF_HONEY_CATCH_POOL_${cascadeIndex + 1}`,
      'catch-pool',
      'liquid-honey',
      `cliff-honey-cascade-${cascadeIndex + 1}`,
    );
    catchPool.position.set(0, -2.26, ledgeRadius + 0.38);
    cascadeRoot.add(catchPool);
    cliffCascadeNames.push(cascade.name);
    root.add(cascadeRoot);
  });

  root.userData.protectedRouteInteriorRadius = radius * 0.72;
  root.userData.safeForExistingBoard = true;
  root.userData.sculptRuntime = {
    clickable: false,
    explodable: true,
    presentationOnly: true,
    parts: root.children.map((object, index) => ({ id: `terrace-enhancer-part-${index + 1}`, object })),
    sockets: honeyfallSocketAngles.map((_, index) => `ISLAND_14_V2_CLIFF_HONEYFALL_SOCKET_${index + 1}`),
    attachedCliffCascades: cliffCascadeNames,
  };
  return root;
}

const DEFAULT_DISTANT_ISLET_PLACEMENTS: readonly Island14DistantHiveIsletPlacement[] = [
  { angle: 0.08, radius: 10.8, height: 1.8, scale: 0.86 },
  { angle: 0.64, radius: 13.2, height: 3.4, scale: 0.68 },
  { angle: 1.18, radius: 11.6, height: 2.2, scale: 0.80 },
  { angle: 1.78, radius: 14.1, height: 4.0, scale: 0.62 },
  { angle: 2.36, radius: 11.0, height: 1.6, scale: 0.88 },
  { angle: 3.02, radius: 13.6, height: 3.0, scale: 0.70 },
  { angle: 3.68, radius: 11.8, height: 2.4, scale: 0.78 },
  { angle: 4.30, radius: 14.4, height: 3.8, scale: 0.60 },
  { angle: 4.92, radius: 10.9, height: 1.9, scale: 0.84 },
  { angle: 5.62, radius: 13.1, height: 3.2, scale: 0.68 },
];

function createAuthoredDistantHiveIslet(
  materials: Island14HoneyWorldMaterialsLike,
  index: number,
  seed: number,
) {
  const root = tagPresentationObject(
    new THREE.Group(),
    `ISLAND_14_V2_DISTANT_HIVE_ISLET_${index + 1}`,
    'distant-islet',
    'honey-rock-gold-architecture',
    `distant-hive-islet-${index + 1}`,
  );
  const upperRock = mesh(
    createIrregularDiscGeometry(1.24, 1.08, 0.52, 12, seed + index * 17, 0.12),
    index % 2 ? materials.honeyRock : materials.warmGold,
    `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_UPPER_ROCK`,
    'distant-islet',
    index % 2 ? 'honey-rock' : 'royal-gold',
    `distant-hive-islet-${index + 1}`,
  );
  upperRock.position.y = -0.03;
  const lowerRock = mesh(
    createIrregularDiscGeometry(1.06, 0.78, 0.82, 12, seed + index * 17 + 7, 0.13),
    materials.honeyRockShadow,
    `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_LOWER_ROCK`,
    'distant-islet',
    'honey-rock-shadow',
    `distant-hive-islet-${index + 1}`,
  );
  lowerRock.position.y = -0.58;
  root.add(upperRock, lowerRock);

  const inhabitedShelf = mesh(
    createIrregularDiscGeometry(1.08, 0.98, 0.24, 12, seed + index * 17 + 11, 0.075),
    index % 3 === 0 ? materials.paleGold : materials.honeyRock,
    `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_INHABITED_TERRACE`,
    'distant-islet',
    index % 3 === 0 ? 'pale-gold' : 'honey-rock',
    `distant-hive-islet-${index + 1}`,
  );
  inhabitedShelf.position.y = 0.28;
  root.add(inhabitedShelf);

  const hive = tagPresentationObject(
    new THREE.Group(),
    `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_INHABITED_HIVE`,
    'inhabited-hive',
    'wax-gold-bronze',
    `distant-hive-building-${index + 1}`,
  );
  const drumRadius = 0.34 + index % 3 * 0.035;
  const drumHeight = 0.72 + index % 2 * 0.12;
  const drum = mesh(
    new THREE.CylinderGeometry(drumRadius * 0.92, drumRadius, drumHeight, 10),
    index % 2 ? materials.waxCream : materials.warmGold,
    `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_AUTHORED_DRUM`,
    'inhabited-hive',
    index % 2 ? 'wax-cream' : 'royal-gold',
    `distant-hive-building-${index + 1}`,
  );
  drum.position.y = 0.48 + drumHeight * 0.5;
  const eave = mesh(
    new THREE.CylinderGeometry(drumRadius * 1.13, drumRadius * 1.13, 0.12, 10),
    materials.darkBronze,
    `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_DEEP_EAVE`,
    'inhabited-hive',
    'dark-bronze',
    `distant-hive-building-${index + 1}`,
  );
  eave.position.y = 0.50 + drumHeight;
  const dome = mesh(
    new THREE.SphereGeometry(drumRadius * 1.10, 14, 10),
    materials.warmGold,
    `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_BURIED_FULL_DOME`,
    'inhabited-hive',
    'royal-gold',
    `distant-hive-building-${index + 1}`,
  );
  dome.scale.y = 0.62 + index % 3 * 0.05;
  dome.position.y = 0.55 + drumHeight + drumRadius * 0.38;
  const finial = mesh(
    new THREE.ConeGeometry(0.075, 0.24, 6),
    materials.paleGold,
    `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_FACETED_FINIAL`,
    'inhabited-hive',
    'pale-gold',
    `distant-hive-building-${index + 1}`,
  );
  finial.position.y = dome.position.y + drumRadius * 0.75;
  hive.add(drum, eave, dome, finial);

  for (let faceIndex = 0; faceIndex < 4; faceIndex += 1) {
    const angle = faceIndex / 4 * TAU;
    const window = createHexRelief(
      0.105,
      0.075,
      faceIndex === 0 ? materials.royalPurple : materials.warmWindow ?? materials.honeyGlass,
      `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_WINDOW_${faceIndex + 1}`,
      'hive-window',
      faceIndex === 0 ? 'royal-purple' : 'warm-window',
      `distant-hive-building-${index + 1}`,
    );
    window.rotation.y = angle;
    window.position.set(
      Math.sin(angle) * drumRadius * 0.96,
      0.57 + drumHeight * 0.46,
      Math.cos(angle) * drumRadius * 0.96,
    );
    hive.add(window);
  }
  const door = createHexRelief(
    0.16,
    0.09,
    materials.darkBronze,
    `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_SERVICE_ENTRY`,
    'hive-entry',
    'dark-bronze',
    `distant-hive-building-${index + 1}`,
  );
  door.scale.y = 1.32;
  door.position.set(0, 0.67, drumRadius * 1.02);
  hive.add(door);
  for (let stairIndex = 0; stairIndex < 3; stairIndex += 1) {
    const stair = mesh(
      new THREE.BoxGeometry(0.46 - stairIndex * 0.06, 0.08, 0.16),
      materials.paleGold,
      `ISLAND_14_V2_DISTANT_HIVE_${index + 1}_ENTRY_STAIR_${stairIndex + 1}`,
      'hive-entry',
      'pale-gold',
      `distant-hive-building-${index + 1}`,
    );
    stair.position.set(0, 0.30 + stairIndex * 0.075, drumRadius + 0.25 - stairIndex * 0.08);
    hive.add(stair);
  }
  root.add(hive);

  if (index % 2 === 0) {
    const serviceTurret = tagPresentationObject(
      new THREE.Group(),
      `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_SERVICE_TURRET`,
      'inhabited-hive',
      'wax-gold',
      `distant-hive-building-${index + 1}`,
    );
    const turretDrum = mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 0.48, 8),
      materials.waxCream,
      `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_SERVICE_TURRET_DRUM`,
      'inhabited-hive',
      'wax-cream',
      `distant-hive-building-${index + 1}`,
    );
    turretDrum.position.y = 0.60;
    const turretRoof = mesh(
      new THREE.SphereGeometry(0.24, 10, 7),
      materials.warmGold,
      `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_SERVICE_TURRET_ROOF`,
      'inhabited-hive',
      'royal-gold',
      `distant-hive-building-${index + 1}`,
    );
    turretRoof.scale.y = 0.54;
    turretRoof.position.y = 0.87;
    serviceTurret.position.set(index % 4 === 0 ? -0.57 : 0.57, 0, -0.18);
    serviceTurret.add(turretDrum, turretRoof);
    root.add(serviceTurret);
  }

  for (let plantIndex = 0; plantIndex < 3; plantIndex += 1) {
    const angle = 0.7 + plantIndex * 2.05 + index * 0.19;
    const plant = mesh(
      new THREE.DodecahedronGeometry(0.13 + plantIndex * 0.018, 0),
      materials.leaf ?? materials.honeyRockShadow,
      `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_PLANT_${plantIndex + 1}`,
      'vegetation',
      materials.leaf ? 'leaf' : 'honey-rock-shadow',
      `distant-hive-islet-${index + 1}`,
    );
    plant.position.set(Math.cos(angle) * 0.68, 0.34, Math.sin(angle) * 0.68);
    plant.scale.set(1.4, 0.72, 1.0);
    root.add(plant);
  }

  const isletDrip = mesh(
    createViscousSolidGeometry([
      { x: 0.74, y: 0.12, z: 0.10, width: 0.24, depth: 0.24 },
      { x: 0.78, y: -0.26, z: 0.11, width: 0.27, depth: 0.25 },
      { x: 0.75, y: -0.62, z: 0.13, width: 0.18, depth: 0.20 },
    ], 8),
    materials.honeyGlass,
    `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_WELDED_HONEY_DRIP`,
    'islet-honey-drip',
    'deep-amber-honey',
    `distant-hive-islet-${index + 1}`,
  );
  isletDrip.userData.attachment = {
    parentSocket: `ISLAND_14_V2_DISTANT_ISLET_${index + 1}_UPPER_ROCK`,
    contactType: 'ledge-overlap',
    overlap: 0.12,
  };
  root.add(isletDrip);
  return root;
}

export function createIsland14DistantHiveIsletSceneryV2(
  materials: Island14HoneyWorldMaterialsLike,
  options: Island14DistantHiveIsletSceneryV2Options = {},
) {
  const placements = options.placements ?? DEFAULT_DISTANT_ISLET_PLACEMENTS;
  const seed = options.seed ?? 14107;
  const root = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.distantScenery,
    'distant-scenery',
    'honey-rock-gold-architecture',
    'distant-hive-islet-scenery-v2',
  );
  applyTransform(root, options.position, options.scale);

  placements.forEach((placement, index) => {
    const islet = createAuthoredDistantHiveIslet(materials, index, seed);
    const isletX = Math.cos(placement.angle) * placement.radius;
    const isletZ = Math.sin(placement.angle) * placement.radius;
    islet.position.set(
      isletX,
      placement.height,
      isletZ,
    );
    islet.rotation.y = -placement.angle + Math.PI / 2;
    islet.scale.setScalar(placement.scale);
    islet.userData.depthBand = placement.radius < 13.5 ? 'middle-distance' : 'far-distance';
    islet.userData.atmosphereFadeRecommended = THREE.MathUtils.clamp((placement.radius - 11) / 7, 0.18, 0.72);
    root.add(islet);

    const cloudBank = tagPresentationObject(
      new THREE.Group(),
      `ISLAND_14_V2_DISTANT_CLOUD_BANK_${index + 1}`,
      'atmosphere-cloud',
      materials.cloud ? 'cloud' : 'wax-cloud-fallback',
      `distant-cloud-bank-${index + 1}`,
    );
    cloudBank.position.set(isletX, placement.height - 1.10 * placement.scale, isletZ);
    cloudBank.rotation.y = -placement.angle;
    for (let puffIndex = 0; puffIndex < 5; puffIndex += 1) {
      const puff = mesh(
        new THREE.SphereGeometry(0.54 + puffIndex % 3 * 0.14, 12, 8),
        materials.cloud ?? materials.waxCream,
        `ISLAND_14_V2_DISTANT_CLOUD_${index + 1}_PUFF_${puffIndex + 1}`,
        'atmosphere-cloud',
        materials.cloud ? 'cloud' : 'wax-cloud-fallback',
        `distant-cloud-bank-${index + 1}`,
      );
      puff.position.set((puffIndex - 2) * 0.52 * placement.scale, puffIndex % 2 * 0.16, (puffIndex % 3 - 1) * 0.22);
      puff.scale.set(1.36 + puffIndex % 2 * 0.18, 0.54 + puffIndex % 3 * 0.08, 0.82);
      puff.castShadow = false;
      puff.receiveShadow = false;
      cloudBank.add(puff);
    }
    cloudBank.userData.closedVolumeAtmosphere = true;
    cloudBank.userData.closedVolumeOnly = true;
    root.add(cloudBank);

    if (materials.haze) {
      const hazeVolume = mesh(
        new THREE.SphereGeometry(1, 14, 9),
        materials.haze,
        `ISLAND_14_V2_DISTANT_HAZE_VOLUME_${index + 1}`,
        'atmosphere-haze',
        'haze',
        `distant-haze-volume-${index + 1}`,
      );
      hazeVolume.position.set(isletX, placement.height - 0.18, isletZ);
      hazeVolume.scale.set(2.6 * placement.scale, 1.3 * placement.scale, 1.8 * placement.scale);
      hazeVolume.castShadow = false;
      hazeVolume.receiveShadow = false;
      hazeVolume.userData.closedVolumeAtmosphere = true;
      hazeVolume.userData.closedVolumeOnly = true;
      root.add(hazeVolume);
    }
  });
  root.userData.sculptRuntime = {
    clickable: false,
    explodable: true,
    presentationOnly: true,
    parts: root.children.map((object, index) => ({ id: `distant-hive-islet-${index + 1}`, object })),
  };
  return root;
}

export function createIsland14HoneyWorldPresentationV2(
  materials: Island14HoneyWorldMaterialsLike,
  options: Island14HoneyWorldPresentationV2Options = {},
): Island14HoneyWorldPresentationV2Runtime {
  const root = tagPresentationObject(
    new THREE.Group(),
    ISLAND_14_HONEY_WORLD_PRESENTATION_V2_NAMES.world,
    'world-presentation',
    'mixed-honey-world',
    'honey-world-presentation-v2',
  );
  applyTransform(root, options.position, options.scale);

  const honeyfall = options.honeyfall === false
    ? undefined
    : createIsland14IntegratedGreatHoneyfallV2(materials, options.honeyfall ?? {});
  const terraces = options.terraces === false
    ? undefined
    : createIsland14HoneyRockTerraceEnhancerV2(materials, options.terraces ?? {});
  const distantIslets = options.distantIslets === false
    ? undefined
    : createIsland14DistantHiveIsletSceneryV2(materials, options.distantIslets ?? {});

  if (terraces) root.add(terraces);
  if (distantIslets) root.add(distantIslets);
  if (honeyfall) root.add(honeyfall.root);
  root.userData.sculptRuntime = {
    clickable: false,
    explodable: true,
    presentationOnly: true,
    parts: [terraces, distantIslets, honeyfall?.root]
      .filter((object): object is THREE.Group => object !== undefined)
      .map((object) => ({ id: object.userData.partId, object })),
  };

  return {
    root,
    honeyfall,
    terraces,
    distantIslets,
    animate: (elapsedSeconds: number, reducedMotion = false) => {
      honeyfall?.animate(elapsedSeconds, reducedMotion);
    },
  };
}
