import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import {
  CROWN_CITADEL_DETAIL_PROFILES,
  type Island3DQuality,
} from './island5ThreePilotContract';

export type CrownCitadelBuildLevel = 1 | 2 | 3;

export interface CrownCitadelMaterials {
  limestone: THREE.MeshStandardMaterial;
  limestoneShade: THREE.MeshStandardMaterial;
  limestoneBright: THREE.MeshStandardMaterial;
  purpleRoof: THREE.MeshStandardMaterial;
  purpleRoofBright: THREE.MeshStandardMaterial;
  gold: THREE.MeshStandardMaterial;
  deepWindow: THREE.MeshStandardMaterial;
  aquaGlass: THREE.MeshPhysicalMaterial;
  voiceGlow: THREE.MeshStandardMaterial;
  banner: THREE.MeshStandardMaterial;
  reefAccent: THREE.MeshStandardMaterial;
  pearlAccent: THREE.MeshStandardMaterial;
}

export interface CrownCitadelModelOptions {
  level: CrownCitadelBuildLevel;
  quality: Island3DQuality;
  materials: CrownCitadelMaterials;
  compact?: boolean;
}

const mesh = (geometry: THREE.BufferGeometry, material: THREE.Material) => new THREE.Mesh(geometry, material);

function markStructural(object: THREE.Mesh) {
  object.castShadow = true;
  object.receiveShadow = true;
  return object;
}

/**
 * The procedural source stays easy to art-direct as many small architectural
 * pieces, then ships to the renderer as a handful of material batches. This
 * keeps the embellished high-tier model from turning every window, rib and
 * baluster into its own phone draw call.
 */
export function compactStaticGeometry(root: THREE.Group, batchName = 'CROWN_CITADEL') {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const batches = new Map<string, {
    material: THREE.Material;
    castShadow: boolean;
    geometries: THREE.BufferGeometry[];
  }>();
  const sourceMeshes: THREE.Mesh[] = [];

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh) || child.name === 'CROWN_CITADEL_VOICE_PRISM') return;
    const material = Array.isArray(child.material) ? child.material[0] : child.material;
    const key = `${material.uuid}:${child.castShadow ? 'shadow' : 'visual'}`;
    const batch = batches.get(key) ?? {
      material,
      castShadow: child.castShadow,
      geometries: [] as THREE.BufferGeometry[],
    };
    const localMatrix = inverseRoot.clone().multiply(child.matrixWorld);
    const cloned = child.geometry.clone();
    const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
    if (geometry !== cloned) cloned.dispose();
    geometry.applyMatrix4(localMatrix);
    batch.geometries.push(geometry);
    batches.set(key, batch);
    sourceMeshes.push(child);
  });

  sourceMeshes.forEach((source) => {
    source.parent?.remove(source);
    source.geometry.dispose();
  });

  let batchIndex = 0;
  batches.forEach((batch) => {
    const geometry = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((source) => source.dispose());
    if (!geometry) return;
    const merged = mesh(geometry, batch.material);
    merged.name = `${batchName}_BATCH_${batchIndex}`;
    merged.castShadow = batch.castShadow;
    merged.receiveShadow = true;
    root.add(merged);
    batchIndex += 1;
  });
  root.userData.staticMaterialBatches = batchIndex;
  if (batchName === 'CROWN_CITADEL') root.userData.crownCitadelMaterialBatches = batchIndex;
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  material: THREE.Material,
) {
  return mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function addWindow(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  x: number,
  y: number,
  z: number,
  rotationY = 0,
  scale = 1,
) {
  const window = mesh(new THREE.BoxGeometry(0.13 * scale, 0.29 * scale, 0.035), materials.deepWindow);
  window.position.set(x, y, z);
  window.rotation.y = rotationY;
  parent.add(window);

  const point = mesh(new THREE.ConeGeometry(0.071 * scale, 0.13 * scale, 3), materials.voiceGlow);
  point.position.set(x, y + 0.205 * scale, z);
  point.rotation.z = Math.PI;
  point.rotation.y = rotationY;
  parent.add(point);
}

function addGoldBand(parent: THREE.Group, radius: number, y: number, segments: number, material: THREE.Material) {
  const band = mesh(new THREE.TorusGeometry(radius, 0.035, 6, segments), material);
  band.rotation.x = Math.PI / 2;
  band.position.y = y;
  parent.add(band);
}

function createBeamBetween(
  from: THREE.Vector3,
  to: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = new THREE.Vector3().subVectors(to, from);
  const beam = mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 6), material);
  beam.position.copy(from).add(to).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return beam;
}

function createTower(options: {
  height: number;
  radius: number;
  roofHeight: number;
  segments: number;
  windowFaces: number;
  roofRibs: boolean;
  restored: boolean;
  materials: CrownCitadelMaterials;
}) {
  const group = new THREE.Group();
  const { materials } = options;
  const body = cylinder(options.radius * 0.9, options.radius, options.height, options.segments, materials.limestone);
  body.position.y = options.height / 2;
  markStructural(body);
  group.add(body);

  const foot = cylinder(options.radius * 1.08, options.radius * 1.13, 0.16, options.segments, materials.limestoneShade);
  foot.position.y = 0.08;
  const gallery = cylinder(options.radius * 1.09, options.radius * 1.09, 0.12, options.segments, materials.gold);
  gallery.position.y = options.height - 0.11;
  group.add(foot, gallery);

  for (let index = 0; index < options.windowFaces; index += 1) {
    const angle = (index / options.windowFaces) * Math.PI * 2;
    const radius = options.radius * 0.925;
    const window = mesh(new THREE.BoxGeometry(0.09, 0.26, 0.028), materials.deepWindow);
    window.position.set(Math.sin(angle) * radius, options.height * 0.57, Math.cos(angle) * radius);
    window.rotation.y = angle;
    group.add(window);
    if (options.restored) {
      const lowerWindow = mesh(new THREE.BoxGeometry(0.075, 0.2, 0.03), materials.deepWindow);
      lowerWindow.position.set(Math.sin(angle) * (radius + 0.005), options.height * 0.3, Math.cos(angle) * (radius + 0.005));
      lowerWindow.rotation.y = angle;
      const crown = mesh(new THREE.ConeGeometry(0.052, 0.11, 3), materials.gold);
      crown.position.set(Math.sin(angle) * (radius + 0.012), options.height * 0.72, Math.cos(angle) * (radius + 0.012));
      crown.rotation.z = Math.PI;
      crown.rotation.y = angle;
      group.add(lowerWindow, crown);
    }
  }

  if (options.restored) {
    addGoldBand(group, options.radius * 0.98, options.height * 0.45, options.segments * 2, materials.gold);
    addGoldBand(group, options.radius * 0.94, options.height * 0.76, options.segments * 2, materials.gold);
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const pilaster = mesh(new THREE.BoxGeometry(0.075, options.height * 0.62, 0.06), materials.limestoneBright);
      pilaster.position.set(
        Math.sin(angle) * options.radius * 0.94,
        options.height * 0.43,
        Math.cos(angle) * options.radius * 0.94,
      );
      pilaster.rotation.y = angle;
      const capital = mesh(new THREE.BoxGeometry(0.13, 0.07, 0.1), materials.gold);
      capital.position.set(
        Math.sin(angle) * options.radius * 0.97,
        options.height * 0.75,
        Math.cos(angle) * options.radius * 0.97,
      );
      capital.rotation.y = angle;
      group.add(pilaster, capital);
    }
  }

  const roof = mesh(
    new THREE.ConeGeometry(options.radius * 1.34, options.roofHeight, options.segments),
    materials.purpleRoof,
  );
  roof.position.y = options.height + options.roofHeight / 2 - 0.01;
  markStructural(roof);
  group.add(roof);

  addGoldBand(group, options.radius * 1.32, options.height + 0.015, options.segments * 2, materials.gold);

  if (options.roofRibs) {
    const tip = new THREE.Vector3(0, options.height + options.roofHeight, 0);
    for (let index = 0; index < 4; index += 1) {
      const angle = (index / 4) * Math.PI * 2;
      const start = new THREE.Vector3(
        Math.sin(angle) * options.radius * 1.18,
        options.height + 0.04,
        Math.cos(angle) * options.radius * 1.18,
      );
      group.add(createBeamBetween(start, tip, 0.018, materials.gold));
    }
  }

  const finial = mesh(new THREE.OctahedronGeometry(options.radius * 0.17), materials.gold);
  finial.position.y = options.height + options.roofHeight + options.radius * 0.15;
  group.add(finial);
  return group;
}

function addFrontStair(parent: THREE.Group, materials: CrownCitadelMaterials) {
  for (let index = 0; index < 4; index += 1) {
    const step = mesh(
      new THREE.BoxGeometry(0.98 + index * 0.18, 0.1, 0.24),
      index % 2 === 0 ? materials.limestoneBright : materials.limestone,
    );
    step.position.set(0, 0.25 + index * 0.08, 1.14 - index * 0.15);
    parent.add(step);
  }
}

function addKeepWindows(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  rows: number,
) {
  for (let row = 0; row < rows; row += 1) {
    const y = 1.08 + row * 0.48;
    for (const x of [-0.63, 0, 0.63]) addWindow(parent, materials, x, y, 0.816, 0, row === 0 ? 1 : 0.82);
    addWindow(parent, materials, -1.106, y, -0.27, -Math.PI / 2, 0.86);
    addWindow(parent, materials, 1.106, y, -0.27, Math.PI / 2, 0.86);
  }
}

function addBalustrade(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  count: number,
) {
  if (count === 0) return;
  for (let index = 0; index < count; index += 1) {
    const angle = (index / count) * Math.PI * 2;
    if (Math.abs(Math.sin(angle)) < 0.28 && Math.cos(angle) > 0) continue;
    const post = cylinder(0.045, 0.055, 0.31, 6, materials.limestoneBright);
    post.position.set(Math.sin(angle) * 1.72, 0.6, Math.cos(angle) * 1.72);
    parent.add(post);
  }
  addGoldBand(parent, 1.72, 0.76, 48, materials.gold);
}

function addBanners(parent: THREE.Group, materials: CrownCitadelMaterials) {
  for (const x of [-0.56, 0.56]) {
    const pole = cylinder(0.018, 0.018, 0.82, 6, materials.gold);
    pole.position.set(x, 1.53, 0.852);
    const banner = mesh(new THREE.PlaneGeometry(0.25, 0.48), materials.banner);
    banner.position.set(x + (x < 0 ? 0.12 : -0.12), 1.43, 0.875);
    parent.add(pole, banner);
  }
}

function addShellOrnaments(parent: THREE.Group, materials: CrownCitadelMaterials) {
  for (const x of [-0.38, 0.38]) {
    const shell = mesh(new THREE.TorusGeometry(0.15, 0.025, 6, 14, Math.PI), materials.gold);
    shell.position.set(x, 0.87, 0.846);
    shell.rotation.z = Math.PI;
    parent.add(shell);
  }
}

function addRestorationReefAccents(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  reefCount: number,
  pearlCount: number,
) {
  for (let index = 0; index < reefCount; index += 1) {
    const angle = 0.34 + (index / Math.max(1, reefCount)) * Math.PI * 2;
    const radius = 1.58 + (index % 3) * 0.09;
    const height = 0.16 + (index % 4) * 0.045;
    const coral = mesh(new THREE.ConeGeometry(0.045 + (index % 2) * 0.018, height, 5), materials.reefAccent);
    coral.position.set(Math.sin(angle) * radius, 0.59 + height / 2, Math.cos(angle) * radius);
    coral.rotation.z = Math.sin(angle * 2) * 0.18;
    parent.add(coral);
  }

  for (let index = 0; index < pearlCount; index += 1) {
    const angle = (index / Math.max(1, pearlCount)) * Math.PI * 2 + Math.PI / 8;
    const radius = 1.48;
    const stem = cylinder(0.018, 0.026, 0.2, 5, materials.gold);
    stem.position.set(Math.sin(angle) * radius, 0.69, Math.cos(angle) * radius);
    const pearl = mesh(new THREE.SphereGeometry(0.065, 8, 6), materials.pearlAccent);
    pearl.position.set(Math.sin(angle) * radius, 0.82, Math.cos(angle) * radius);
    parent.add(stem, pearl);
  }
}

function addCrownAndVoicePrism(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  segments: number,
) {
  const crown = new THREE.Group();
  crown.name = 'CROWN_CITADEL_CROWN';
  crown.position.y = 3.86;

  const halo = mesh(new THREE.TorusGeometry(0.38, 0.045, 7, segments * 2), materials.gold);
  halo.rotation.x = Math.PI / 2;
  crown.add(halo);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2;
    const spike = mesh(new THREE.ConeGeometry(0.055, 0.34, 5), materials.gold);
    spike.position.set(Math.cos(angle) * 0.36, 0.18, Math.sin(angle) * 0.36);
    crown.add(spike);
  }

  const prism = mesh(new THREE.OctahedronGeometry(0.2, 0), materials.voiceGlow);
  prism.name = 'CROWN_CITADEL_VOICE_PRISM';
  prism.position.y = 0.48;
  crown.add(prism);

  const light = new THREE.PointLight(0x69f2e4, 2.1, 4.4, 2);
  light.name = 'CROWN_CITADEL_VOICE_LIGHT';
  light.position.y = 0.44;
  crown.add(light);
  parent.add(crown);
}

function addRestoredFacadeArchitecture(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  segments: number,
  ornamentCount: number,
) {
  const cornice = mesh(new THREE.BoxGeometry(2.42, 0.14, 0.22), materials.gold);
  cornice.position.set(0, 1.78, 0.79);
  const balcony = mesh(new THREE.BoxGeometry(1.34, 0.12, 0.34), materials.limestoneBright);
  balcony.position.set(0, 1.57, 0.94);
  const balconyRail = mesh(new THREE.BoxGeometry(1.28, 0.06, 0.05), materials.gold);
  balconyRail.position.set(0, 1.82, 1.1);
  const galleryLintel = mesh(new THREE.BoxGeometry(1.3, 0.1, 0.12), materials.gold);
  galleryLintel.position.set(0, 2.12, 1.08);
  parent.add(cornice, balcony, balconyRail, galleryLintel);

  const portalArch = mesh(new THREE.TorusGeometry(0.36, 0.065, 8, segments * 2, Math.PI), materials.gold);
  portalArch.position.set(0, 1.21, 0.866);
  const portalGlow = mesh(new THREE.TorusGeometry(0.265, 0.035, 7, segments * 2, Math.PI), materials.aquaGlass);
  portalGlow.position.set(0, 1.21, 0.873);
  const roseFrame = mesh(new THREE.TorusGeometry(0.2, 0.04, 7, segments * 2), materials.gold);
  roseFrame.position.set(0, 1.62, 0.87);
  const roseGlass = mesh(new THREE.CircleGeometry(0.15, segments), materials.aquaGlass);
  roseGlass.position.set(0, 1.62, 0.875);
  parent.add(portalArch, portalGlow, roseFrame, roseGlass);
  for (const x of [-0.18, -0.06, 0.06, 0.18]) {
    const gateBar = mesh(new THREE.BoxGeometry(0.025, 0.5, 0.025), materials.gold);
    gateBar.position.set(x, 0.88, 0.86);
    parent.add(gateBar);
  }
  const gateCrossbar = mesh(new THREE.BoxGeometry(0.44, 0.035, 0.03), materials.gold);
  gateCrossbar.position.set(0, 0.92, 0.862);
  parent.add(gateCrossbar);

  const buttressX = [-1.32, -0.78, 0.78, 1.32];
  buttressX.forEach((x, index) => {
    const height = index === 0 || index === buttressX.length - 1 ? 1.2 : 1.46;
    const buttress = mesh(new THREE.BoxGeometry(0.17, height, 0.22), materials.limestoneShade);
    buttress.position.set(x, 0.52 + height / 2, 0.73);
    markStructural(buttress);
    const capital = mesh(new THREE.BoxGeometry(0.25, 0.1, 0.28), materials.gold);
    capital.position.set(x, 0.55 + height, 0.73);
    const pinnacle = mesh(new THREE.ConeGeometry(0.12, 0.34, 5), materials.purpleRoofBright);
    pinnacle.position.set(x, 0.77 + height, 0.73);
    parent.add(buttress, capital, pinnacle);
  });

  const columnCount = Math.max(4, Math.min(8, Math.round(ornamentCount / 2)));
  for (let index = 0; index < columnCount; index += 1) {
    const t = columnCount === 1 ? 0.5 : index / (columnCount - 1);
    const x = -0.58 + t * 1.16;
    if (Math.abs(x) < 0.2) continue;
    const column = cylinder(0.045, 0.06, 0.52, 7, materials.limestoneBright);
    column.position.set(x, 1.79, 1.08);
    const capital = mesh(new THREE.BoxGeometry(0.14, 0.07, 0.12), materials.gold);
    capital.position.set(x, 2.06, 1.08);
    parent.add(column, capital);
  }

  for (const x of [-1.1, 1.1]) {
    addWindow(parent, materials, x, 1.11, 0.595, 0, 0.82);
    const crest = mesh(new THREE.OctahedronGeometry(0.1), materials.pearlAccent);
    crest.position.set(x, 1.9, -0.02);
    parent.add(crest);
  }
}

function addRestoredDrumGallery(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  segments: number,
  windowCount: number,
) {
  for (const y of [2.02, 2.55]) {
    for (let index = 0; index < windowCount; index += 1) {
      const angle = (index / windowCount) * Math.PI * 2;
      const radius = 0.635;
      const frame = mesh(new THREE.BoxGeometry(0.13, 0.35, 0.045), materials.gold);
      frame.position.set(Math.sin(angle) * radius, y, Math.cos(angle) * radius - 0.12);
      frame.rotation.y = angle;
      const glass = mesh(new THREE.BoxGeometry(0.078, 0.25, 0.052), materials.deepWindow);
      glass.position.set(Math.sin(angle) * (radius + 0.008), y, Math.cos(angle) * (radius + 0.008) - 0.12);
      glass.rotation.y = angle;
      const point = mesh(new THREE.ConeGeometry(0.055, 0.13, 3), materials.voiceGlow);
      point.position.set(Math.sin(angle) * (radius + 0.014), y + 0.22, Math.cos(angle) * (radius + 0.014) - 0.12);
      point.rotation.z = Math.PI;
      point.rotation.y = angle;
      parent.add(frame, glass, point);
    }
  }

  const galleryFloor = mesh(new THREE.TorusGeometry(0.78, 0.075, 8, segments * 3), materials.limestoneBright);
  galleryFloor.rotation.x = Math.PI / 2;
  galleryFloor.position.set(0, 2.93, -0.12);
  const galleryRail = mesh(new THREE.TorusGeometry(0.77, 0.035, 7, segments * 3), materials.gold);
  galleryRail.rotation.x = Math.PI / 2;
  galleryRail.position.set(0, 3.14, -0.12);
  parent.add(galleryFloor, galleryRail);
  for (let index = 0; index < windowCount; index += 1) {
    const angle = (index / windowCount) * Math.PI * 2;
    const post = cylinder(0.022, 0.028, 0.22, 6, materials.gold);
    post.position.set(Math.sin(angle) * 0.77, 3.03, Math.cos(angle) * 0.77 - 0.12);
    parent.add(post);
  }
  addGoldBand(parent, 0.69, 1.61, segments * 3, materials.gold);
}

function addRestoredRoofTracery(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  segments: number,
  ribCount: number,
) {
  const roofBaseY = 3.28;
  const roofTip = new THREE.Vector3(0, 4.38, -0.12);
  for (let index = 0; index < ribCount; index += 1) {
    const angle = (index / ribCount) * Math.PI * 2;
    const start = new THREE.Vector3(Math.sin(angle) * 0.87, roofBaseY, Math.cos(angle) * 0.87 - 0.12);
    parent.add(createBeamBetween(start, roofTip, 0.025, materials.gold));
  }
  addGoldBand(parent, 0.91, roofBaseY + 0.015, segments * 3, materials.gold);
  addGoldBand(parent, 0.54, 3.74, segments * 3, materials.gold);

  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    const dormer = mesh(new THREE.ConeGeometry(0.13, 0.28, 4), materials.gold);
    dormer.position.set(Math.sin(angle) * 0.63, 3.54, Math.cos(angle) * 0.63 - 0.12);
    dormer.rotation.y = angle + Math.PI / 4;
    parent.add(dormer);
  }
}

function addRestoredFlyingButtresses(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
) {
  const towerPositions: readonly [number, number][] = [
    [-0.94, -0.62], [0.94, -0.62], [-0.94, 0.62], [0.94, 0.62],
  ];
  for (const [x, z] of towerPositions) {
    const from = new THREE.Vector3(x * 0.48, 2.45, z * 0.48 - 0.07);
    const to = new THREE.Vector3(x * 0.8, 1.92, z * 0.8);
    const support = createBeamBetween(from, to, 0.045, materials.limestoneBright);
    markStructural(support);
    const jewel = mesh(new THREE.OctahedronGeometry(0.075), materials.aquaGlass);
    jewel.position.copy(to);
    parent.add(support, jewel);
  }
}

function addFoundationStageArchitecture(
  parent: THREE.Group,
  materials: CrownCitadelMaterials,
  quality: Island3DQuality,
  towerPositions: readonly (readonly [number, number])[],
) {
  // L1 is a complete ceremonial foundation court rather than a bare block.
  // Its detail is horizontal and close to the ground so L2/L3 retain the
  // dramatic tower, dome and skyline progression.
  const frontCornice = mesh(new THREE.BoxGeometry(2.28, 0.09, 0.08), materials.gold);
  frontCornice.position.set(0, 1.36, 0.82);
  const rearCornice = frontCornice.clone();
  rearCornice.position.z = -0.82;
  const sideCornice = mesh(new THREE.BoxGeometry(0.08, 0.09, 1.56), materials.gold);
  sideCornice.position.set(-1.1, 1.36, 0);
  const sideCorniceMirror = sideCornice.clone();
  sideCorniceMirror.position.x = 1.1;
  parent.add(frontCornice, rearCornice, sideCornice, sideCorniceMirror);

  const roofAxis = mesh(new THREE.BoxGeometry(0.19, 0.025, 1.18), materials.purpleRoof);
  roofAxis.position.set(0, 1.365, 0);
  const roofCross = mesh(new THREE.BoxGeometry(1.38, 0.026, 0.19), materials.purpleRoofBright);
  roofCross.position.set(0, 1.366, 0);
  const roofMedallion = mesh(new THREE.CircleGeometry(0.23, quality === 'low' ? 12 : 24), materials.aquaGlass);
  roofMedallion.rotation.x = -Math.PI / 2;
  roofMedallion.position.set(0, 1.382, 0);
  const roofMedallionRing = mesh(new THREE.TorusGeometry(0.24, 0.024, 6, quality === 'low' ? 14 : 24), materials.gold);
  roofMedallionRing.rotation.x = Math.PI / 2;
  roofMedallionRing.position.set(0, 1.39, 0);
  const foundationCrest = mesh(new THREE.OctahedronGeometry(0.09), materials.pearlAccent);
  foundationCrest.position.set(0, 1.51, 0);
  parent.add(roofAxis, roofCross, roofMedallion, roofMedallionRing, foundationCrest);

  const portalArch = mesh(new THREE.TorusGeometry(0.34, 0.045, 7, 24, Math.PI), materials.limestoneBright);
  portalArch.position.set(0, 1.16, 0.855);
  portalArch.rotation.z = Math.PI;
  const portalGold = mesh(new THREE.TorusGeometry(0.275, 0.026, 6, 22, Math.PI), materials.gold);
  portalGold.position.set(0, 1.16, 0.89);
  portalGold.rotation.z = Math.PI;
  const portalPearl = mesh(new THREE.OctahedronGeometry(0.07), materials.pearlAccent);
  portalPearl.position.set(0, 1.33, 0.91);
  parent.add(portalArch, portalGold, portalPearl);

  for (const x of [-0.72, 0.72]) {
    const buttress = mesh(new THREE.BoxGeometry(0.19, 0.68, 0.22), materials.limestoneShade);
    buttress.position.set(x, 0.99, 0.85);
    const capital = mesh(new THREE.BoxGeometry(0.27, 0.09, 0.27), materials.gold);
    capital.position.set(x, 1.33, 0.86);
    parent.add(buttress, capital);
    addWindow(parent, materials, x * 0.55, 1.02, 0.855, 0, 0.8);
  }

  addWindow(parent, materials, -1.1, 1.02, -0.26, -Math.PI / 2, 0.78);
  addWindow(parent, materials, 1.1, 1.02, -0.26, Math.PI / 2, 0.78);
  if (quality !== 'low') {
    addWindow(parent, materials, -1.1, 1.02, 0.28, -Math.PI / 2, 0.72);
    addWindow(parent, materials, 1.1, 1.02, 0.28, Math.PI / 2, 0.72);
  }

  for (const [x, z] of towerPositions) {
    const collar = mesh(new THREE.TorusGeometry(0.37, 0.035, 6, 18), materials.gold);
    collar.rotation.x = Math.PI / 2;
    collar.position.set(x, 0.92, z);
    const shallowCap = mesh(new THREE.ConeGeometry(0.35, 0.22, 8), materials.purpleRoof);
    shallowCap.position.set(x, 1.04, z);
    const capPearl = mesh(new THREE.OctahedronGeometry(0.055), materials.voiceGlow);
    capPearl.position.set(x, 1.19, z);
    parent.add(collar, shallowCap, capPearl);
  }

  const thresholdInlay = mesh(new THREE.RingGeometry(0.18, 0.24, quality === 'low' ? 12 : 24), materials.aquaGlass);
  thresholdInlay.rotation.x = -Math.PI / 2;
  thresholdInlay.position.set(0, 0.575, 1.03);
  parent.add(thresholdInlay);
}

export function createCrownCitadelModel({ level, quality, materials, compact = true }: CrownCitadelModelOptions) {
  const detail = CROWN_CITADEL_DETAIL_PROFILES[quality];
  const root = new THREE.Group();
  root.name = 'CROWN_CITADEL_MODEL';
  root.userData.crownCitadelLevel = level;
  root.userData.crownCitadelQuality = quality;

  const floodgateBase = cylinder(1.78, 1.92, 0.34, detail.radialSegments * 2, materials.limestoneShade);
  floodgateBase.position.y = 0.17;
  const pearlTerrace = cylinder(1.6, 1.72, 0.24, detail.radialSegments * 2, materials.limestoneBright);
  pearlTerrace.position.y = 0.42;
  const aquaInlay = mesh(new THREE.TorusGeometry(1.46, 0.055, 8, detail.radialSegments * 3), materials.aquaGlass);
  aquaInlay.rotation.x = Math.PI / 2;
  aquaInlay.position.y = 0.555;
  root.add(floodgateBase, pearlTerrace, aquaInlay);
  markStructural(floodgateBase);
  markStructural(pearlTerrace);
  addFrontStair(root, materials);

  const keepFoundation = mesh(new THREE.BoxGeometry(2.16, 0.86, 1.6), materials.limestone);
  keepFoundation.position.y = 0.92;
  markStructural(keepFoundation);
  root.add(keepFoundation);
  if (level >= 2) {
    const upperKeep = mesh(new THREE.BoxGeometry(2.08, 0.76, 1.54), materials.limestone);
    upperKeep.position.y = 1.73;
    markStructural(upperKeep);
    root.add(upperKeep);
  }

  const gate = mesh(new THREE.BoxGeometry(0.5, 0.58, 0.045), materials.deepWindow);
  gate.position.set(0, 0.86, 0.824);
  const gateCrown = mesh(new THREE.ConeGeometry(0.285, 0.28, 3), materials.gold);
  gateCrown.position.set(0, 1.24, 0.835);
  gateCrown.rotation.z = Math.PI;
  root.add(gate, gateCrown);

  const towerPositions: readonly [number, number][] = [
    [-0.94, -0.62], [0.94, -0.62], [-0.94, 0.62], [0.94, 0.62],
  ];

  if (level === 1) {
    for (const [x, z] of towerPositions) {
      const towerFoot = cylinder(0.37, 0.43, 0.52, detail.radialSegments, materials.limestoneShade);
      towerFoot.position.set(x, 0.65, z);
      markStructural(towerFoot);
      root.add(towerFoot);
    }
    addFoundationStageArchitecture(root, materials, quality, towerPositions);
    addBalustrade(root, materials, detail.balustradePosts);
    return root;
  }

  addKeepWindows(root, materials, detail.keepWindowRows);

  const centralDrum = cylinder(0.63, 0.72, 2.3, detail.radialSegments, materials.limestoneBright);
  centralDrum.position.set(0, 2.18, -0.12);
  markStructural(centralDrum);
  root.add(centralDrum);
  addGoldBand(root, 0.68, 2.82, detail.radialSegments * 2, materials.gold);

  const centralRoof = mesh(
    new THREE.ConeGeometry(0.94, 1.12, detail.radialSegments),
    level === 3 ? materials.purpleRoofBright : materials.purpleRoof,
  );
  centralRoof.position.set(0, 3.82, -0.12);
  markStructural(centralRoof);
  root.add(centralRoof);

  for (let index = 0; index < towerPositions.length; index += 1) {
    const [x, z] = towerPositions[index];
    const tower = createTower({
      height: index < 2 ? 1.8 : 1.65,
      radius: 0.39,
      roofHeight: index < 2 ? 0.82 : 0.74,
      segments: detail.radialSegments,
      windowFaces: detail.towerWindowFaces,
      roofRibs: detail.roofRibs && level === 3,
      restored: level === 3,
      materials,
    });
    tower.position.set(x, 0.47, z);
    root.add(tower);
  }

  const sideWingGeometry = new THREE.BoxGeometry(0.64, 0.82, 1.2);
  for (const x of [-1.1, 1.1]) {
    const wing = mesh(sideWingGeometry.clone(), materials.limestone);
    wing.position.set(x, 0.92, -0.02);
    const wingRoof = mesh(new THREE.ConeGeometry(0.58, 0.48, 4), materials.purpleRoof);
    wingRoof.position.set(x, 1.57, -0.02);
    wingRoof.rotation.y = Math.PI / 4;
    markStructural(wing);
    markStructural(wingRoof);
    root.add(wing, wingRoof);
  }

  addBalustrade(root, materials, detail.balustradePosts);

  if (detail.banners) addBanners(root, materials);
  if (detail.shellOrnaments) addShellOrnaments(root, materials);

  if (level === 3) {
    const restoredWindowCount = quality === 'high' ? 10 : quality === 'medium' ? 8 : 6;
    const restoredRoofRibs = quality === 'high' ? 10 : quality === 'medium' ? 8 : 6;
    addRestoredFacadeArchitecture(root, materials, detail.radialSegments, detail.balustradePosts);
    addRestoredDrumGallery(root, materials, detail.radialSegments, restoredWindowCount);
    addRestoredRoofTracery(root, materials, detail.radialSegments, restoredRoofRibs);
    addRestoredFlyingButtresses(root, materials);
    addRestorationReefAccents(
      root,
      materials,
      detail.reefAccentCount,
      detail.pearlLanternCount,
    );
    addCrownAndVoicePrism(root, materials, detail.radialSegments);
  } else {
    const pearl = mesh(new THREE.SphereGeometry(0.14, detail.radialSegments, 8), materials.aquaGlass);
    pearl.position.set(0, 4.42, -0.12);
    root.add(pearl);
  }

  root.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.receiveShadow = true;
    }
  });
  if (compact) compactStaticGeometry(root);
  return root;
}
