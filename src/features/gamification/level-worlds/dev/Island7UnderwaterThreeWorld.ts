import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
} from './island5ThreePilotContract';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export const ISLAND_7_UNDERWATER_WORLD_NAME = 'Abyssal Pearl Kingdom';
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_7_UNDERWATER_LANDMARK_LABELS = {
  boss: 'Pearl Throne Palace',
  hatchery: 'Nautilus Hatchery Grotto',
  habit: 'Living Reef Sanctuary',
  wisdom: 'Tidemind Archive',
  event: 'Compass Current Portal',
} as const;

export interface Island7UnderwaterMaterials {
  oceanStone: THREE.MeshStandardMaterial;
  deepStone: THREE.MeshStandardMaterial;
  sand: THREE.MeshStandardMaterial;
  pearl: THREE.MeshPhysicalMaterial;
  shell: THREE.MeshPhysicalMaterial;
  turquoise: THREE.MeshPhysicalMaterial;
  gold: THREE.MeshStandardMaterial;
  warmWindow: THREE.MeshBasicMaterial;
  coralPink: THREE.MeshStandardMaterial;
  coralViolet: THREE.MeshStandardMaterial;
  coralGold: THREE.MeshStandardMaterial;
  kelp: THREE.MeshStandardMaterial;
  kelpLight: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  violetCrystal: THREE.MeshPhysicalMaterial;
  portal: THREE.MeshBasicMaterial;
  egg: THREE.MeshPhysicalMaterial;
  nest: THREE.MeshStandardMaterial;
  book: THREE.MeshStandardMaterial;
  caustic: THREE.MeshBasicMaterial;
  bubble: THREE.MeshBasicMaterial;
}

export interface Island7UnderwaterAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3) => void;
}

// High deliberately stops at 16 radial segments. The difference from 18 is
// invisible at the phone camera, but multiplied through five landmarks it
// provides the safety margin needed below Island 007's 180k peak contract.
const segmentCount = (quality: Island3DQuality) => quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
const detailScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.62 : 0.34;

export const ISLAND_7_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.25;
export const ISLAND_7_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.25;

export function isIsland7RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_7_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_7_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, segments = 16) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function markShadows(root: THREE.Object3D, enabled: boolean) {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = enabled;
    child.receiveShadow = true;
  });
}

function createTexture(size: number, kind: 'stone' | 'shell' | 'gold' | 'sand', relief = false) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const noise = ((x * 43 + y * 71 + x * y * 11) % 31) - 15;
      const ripple = Math.sin(x * 0.14 + Math.sin(y * 0.09) * 2.7);
      let value = 150 + noise;
      if (kind === 'stone') value = 128 + noise + ripple * 16 + (((x + y * 2) % 37 < 2) ? -42 : 0);
      if (kind === 'shell') value = 185 + noise * 0.35 + Math.sin(Math.atan2(y - size / 2, x - size / 2) * 12) * 18;
      if (kind === 'gold') value = 205 + noise * 0.32 + ((x + y * 3) % 19 < 2 ? -24 : 0);
      if (kind === 'sand') value = 170 + noise * 0.72 + (Math.sin(x * 0.2) + Math.cos(y * 0.17)) * 5;
      if (relief) value = 128 + (value - 150) * 1.4;
      const clamped = THREE.MathUtils.clamp(value, 18, 242);
      data[offset] = clamped;
      data[offset + 1] = clamped;
      data[offset + 2] = clamped;
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = relief ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'stone' ? 3 : 4, kind === 'stone' ? 3 : 4);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland7UnderwaterMaterials(): Island7UnderwaterMaterials {
  const stoneMap = createTexture(128, 'stone');
  const stoneRelief = createTexture(128, 'stone', true);
  const shellMap = createTexture(96, 'shell');
  const shellRelief = createTexture(96, 'shell', true);
  const goldRelief = createTexture(64, 'gold', true);
  const sandMap = createTexture(96, 'sand');
  const sandRelief = createTexture(96, 'sand', true);
  return {
    oceanStone: new THREE.MeshStandardMaterial({ color: 0x246f80, map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.085, roughness: 0.74, metalness: 0.05 }),
    deepStone: new THREE.MeshStandardMaterial({ color: 0x103847, map: stoneMap, bumpMap: stoneRelief, bumpScale: 0.11, roughness: 0.88, metalness: 0.03, emissive: 0x032735, emissiveIntensity: 0.18 }),
    sand: new THREE.MeshStandardMaterial({ color: 0x438f91, map: sandMap, bumpMap: sandRelief, bumpScale: 0.045, roughness: 0.82, emissive: 0x032b35, emissiveIntensity: 0.06 }),
    pearl: new THREE.MeshPhysicalMaterial({ color: 0xe6fbff, map: shellMap, bumpMap: shellRelief, bumpScale: 0.012, roughness: 0.13, clearcoat: 1, clearcoatRoughness: 0.08, iridescence: 0.82, iridescenceIOR: 1.28, iridescenceThicknessRange: [120, 410], emissive: 0x167e9a, emissiveIntensity: 0.3 }),
    shell: new THREE.MeshPhysicalMaterial({ color: 0xc9eee9, map: shellMap, bumpMap: shellRelief, bumpScale: 0.024, roughness: 0.22, clearcoat: 0.84, clearcoatRoughness: 0.14, iridescence: 0.52, iridescenceIOR: 1.22, emissive: 0x064653, emissiveIntensity: 0.14 }),
    turquoise: new THREE.MeshPhysicalMaterial({ color: 0x078ca5, roughness: 0.2, metalness: 0.16, clearcoat: 0.86, clearcoatRoughness: 0.13, emissive: 0x044f64, emissiveIntensity: 0.46 }),
    // Keep the trim luminous in an underwater scene without an HDRI. A highly
    // metallic gold went almost black at focus angles because it had little
    // environment to reflect; this still reads as metal but preserves the
    // warm authored hierarchy on real phone cameras.
    gold: new THREE.MeshStandardMaterial({ color: 0xe2b348, bumpMap: goldRelief, bumpScale: 0.014, roughness: 0.31, metalness: 0.42, emissive: 0x6f3107, emissiveIntensity: 0.28 }),
    warmWindow: new THREE.MeshBasicMaterial({ color: 0xffb23e, transparent: true, opacity: 1, toneMapped: false, depthWrite: false }),
    coralPink: new THREE.MeshStandardMaterial({ color: 0xff78a9, roughness: 0.55, emissive: 0x6b1746, emissiveIntensity: 0.32 }),
    coralViolet: new THREE.MeshStandardMaterial({ color: 0xb96bea, roughness: 0.5, emissive: 0x56157e, emissiveIntensity: 0.34 }),
    coralGold: new THREE.MeshStandardMaterial({ color: 0xf0aa62, roughness: 0.62, emissive: 0x63300e, emissiveIntensity: 0.18 }),
    kelp: new THREE.MeshStandardMaterial({ color: 0x176651, roughness: 0.7, side: THREE.DoubleSide }),
    kelpLight: new THREE.MeshStandardMaterial({ color: 0x52a65e, roughness: 0.64, emissive: 0x123f32, emissiveIntensity: 0.18, side: THREE.DoubleSide }),
    crystal: new THREE.MeshPhysicalMaterial({ color: 0x36d8d8, roughness: 0.08, transmission: 0, transparent: true, opacity: 0.44, clearcoat: 1, emissive: 0x087487, emissiveIntensity: 0.72, depthWrite: false }),
    violetCrystal: new THREE.MeshPhysicalMaterial({ color: 0x8a43ed, roughness: 0.07, transmission: 0, transparent: true, opacity: 0.7, clearcoat: 1, emissive: 0x3e139c, emissiveIntensity: 0.95, depthWrite: false }),
    portal: new THREE.MeshBasicMaterial({ color: 0x8d7dff, transparent: true, opacity: 0.76, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    egg: new THREE.MeshPhysicalMaterial({ color: 0xdff6e9, roughness: 0.16, clearcoat: 0.9, clearcoatRoughness: 0.1, iridescence: 0.65, emissive: 0x206b91, emissiveIntensity: 0.3 }),
    nest: new THREE.MeshStandardMaterial({ color: 0x9b7652, roughness: 0.92 }),
    book: new THREE.MeshStandardMaterial({ color: 0x79514a, roughness: 0.68, emissive: 0x24120d, emissiveIntensity: 0.1 }),
    caustic: new THREE.MeshBasicMaterial({ color: 0xbaffff, transparent: true, opacity: 0.052, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false, toneMapped: false }),
    bubble: new THREE.MeshBasicMaterial({ color: 0xcfffff, transparent: true, opacity: 0.32, depthWrite: false }),
  };
}

function addRing(root: THREE.Group, radius: number, tube: number, y: number, material: THREE.Material, quality: Island3DQuality, vertical = false) {
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius, tube, 6, segmentCount(quality) * 2), material);
  ring.rotation.x = vertical ? 0 : Math.PI / 2;
  ring.position.y = y;
  root.add(ring);
  return ring;
}

function addStairs(root: THREE.Group, width: number, depth: number, materials: Island7UnderwaterMaterials, count = 4) {
  for (let index = 0; index < count; index += 1) {
    const step = box(width - index * 0.08, 0.09, depth / count + 0.04, materials.shell);
    step.position.set(0, 0.12 + index * 0.07, 0.72 + index * depth / count);
    root.add(step);
  }
}

function addPlinth(root: THREE.Group, radius: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality, y = 0.14) {
  const segments = segmentCount(quality);
  const lower = cylinder(radius * 1.06, radius * 1.12, 0.18, materials.oceanStone, segments);
  lower.position.y = y;
  const upper = cylinder(radius, radius * 1.03, 0.16, materials.sand, segments);
  upper.position.y = y + 0.16;
  root.add(lower, upper);
  addRing(root, radius * 0.9, 0.025, y + 0.25, materials.gold, quality);
}

function addShellArcade(
  root: THREE.Group,
  radius: number,
  y: number,
  count: number,
  materials: Island7UnderwaterMaterials,
  quality: Island3DQuality,
) {
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2;
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(radius * 0.16, 0.028, 5, Math.max(8, segmentCount(quality)), Math.PI),
      materials.gold,
    );
    arch.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
    arch.rotation.set(0, -angle + Math.PI / 2, Math.PI);
    root.add(arch);
    const recess = box(radius * 0.2, radius * 0.23, 0.035, index % 3 === 0 ? materials.warmWindow : materials.turquoise);
    recess.position.set(Math.cos(angle) * radius * 1.01, y - radius * 0.11, Math.sin(angle) * radius * 1.01);
    recess.rotation.y = -angle + Math.PI / 2;
    root.add(recess);
  }
}

function addPointedShellPanel(
  root: THREE.Group,
  angle: number,
  radius: number,
  y: number,
  width: number,
  height: number,
  materials: Island7UnderwaterMaterials,
) {
  const makeShape = (scale: number) => {
    const half = width * scale * 0.5;
    const shape = new THREE.Shape();
    shape.moveTo(-half, -height * scale * 0.5);
    shape.lineTo(half, -height * scale * 0.5);
    shape.lineTo(half * 0.92, height * scale * 0.08);
    shape.quadraticCurveTo(half * 0.62, height * scale * 0.3, 0, height * scale * 0.5);
    shape.quadraticCurveTo(-half * 0.62, height * scale * 0.3, -half * 0.92, height * scale * 0.08);
    shape.closePath();
    return shape;
  };
  const trim = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeShape(1), { depth: 0.06, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.018, bevelThickness: 0.014 }),
    materials.gold,
  );
  trim.position.set(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
  trim.rotation.y = -angle + Math.PI / 2;
  const inset = new THREE.Mesh(
    new THREE.ExtrudeGeometry(makeShape(0.78), { depth: 0.035, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.01, bevelThickness: 0.01 }),
    materials.turquoise,
  );
  inset.position.set(0, -height * 0.04, 0.065);
  trim.add(inset);
  root.add(trim);
}

function addPearlFinial(root: THREE.Group, x: number, y: number, z: number, scale: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const stem = cylinder(0.025 * scale, 0.04 * scale, 0.22 * scale, materials.gold, 8);
  stem.position.set(x, y, z);
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.085 * scale, segmentCount(quality), Math.max(6, segmentCount(quality) / 2)), materials.pearl);
  pearl.position.set(x, y + 0.15 * scale, z);
  root.add(stem, pearl);
}

function addArchedWindow(root: THREE.Group, x: number, y: number, z: number, scale: number, materials: Island7UnderwaterMaterials, rotationY = 0) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = rotationY;
  const halfWidth = 0.08 * scale;
  const baseY = -0.14 * scale;
  const shoulderY = 0.07 * scale;
  const windowShape = new THREE.Shape();
  windowShape.moveTo(-halfWidth, baseY);
  windowShape.lineTo(halfWidth, baseY);
  windowShape.lineTo(halfWidth, shoulderY);
  windowShape.quadraticCurveTo(halfWidth, 0.14 * scale, 0, 0.16 * scale);
  windowShape.quadraticCurveTo(-halfWidth, 0.14 * scale, -halfWidth, shoulderY);
  windowShape.closePath();
  const window = new THREE.Mesh(
    new THREE.ExtrudeGeometry(windowShape, { depth: 0.025, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.008 * scale, bevelThickness: 0.008 }),
    materials.warmWindow,
  );
  window.position.z = 0.025;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(0.085 * scale, 0.018 * scale, 5, 12, Math.PI), materials.gold);
  arch.rotation.z = Math.PI;
  arch.position.y = 0.14 * scale;
  arch.position.z = 0.065;
  const sill = box(0.22 * scale, 0.025 * scale, 0.05, materials.gold);
  sill.position.y = -0.145 * scale;
  sill.position.z = 0.045;
  const mullion = box(0.012 * scale, 0.27 * scale, 0.035, materials.gold);
  mullion.position.set(0, -0.005 * scale, 0.065);
  const transom = box(0.15 * scale, 0.012 * scale, 0.035, materials.gold);
  transom.position.set(0, 0.055 * scale, 0.065);
  group.add(window, arch, sill, mullion, transom);
  root.add(group);
}

function createShellRoof(radius: number, height: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const group = new THREE.Group();
  const dome = new THREE.Mesh(new THREE.SphereGeometry(radius, segmentCount(quality), Math.max(7, segmentCount(quality) / 2), 0, Math.PI * 2, 0, Math.PI / 2), materials.turquoise);
  dome.scale.y = height / radius;
  group.add(dome);
  const ribCount = quality === 'high' ? 12 : quality === 'medium' ? 8 : 5;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.66, 0.018, 5, 14, Math.PI / 2), materials.gold);
    rib.rotation.y = angle;
    rib.rotation.z = Math.PI / 2;
    rib.position.y = radius * 0.08;
    group.add(rib);
  }
  return group;
}

function createOnionSpire(
  radius: number,
  height: number,
  materials: Island7UnderwaterMaterials,
  quality: Island3DQuality,
  material: THREE.Material = materials.turquoise,
) {
  const root = new THREE.Group();
  const points = [
    new THREE.Vector2(radius * 0.16, 0),
    new THREE.Vector2(radius * 0.72, height * 0.11),
    new THREE.Vector2(radius, height * 0.33),
    new THREE.Vector2(radius * 0.78, height * 0.58),
    new THREE.Vector2(radius * 0.28, height * 0.86),
    new THREE.Vector2(0.02, height),
  ];
  root.add(new THREE.Mesh(new THREE.LatheGeometry(points, segmentCount(quality)), material));
  const ribCount = quality === 'high' ? 6 : quality === 'medium' ? 5 : 4;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const radial = (value: number, y: number) => new THREE.Vector3(Math.cos(angle) * value, y, Math.sin(angle) * value);
    const ribCurve = new THREE.CatmullRomCurve3([
      radial(radius * 0.64, height * 0.1),
      radial(radius * 0.98, height * 0.34),
      radial(radius * 0.72, height * 0.6),
      radial(radius * 0.25, height * 0.86),
      radial(0.02, height * 0.98),
    ]);
    root.add(new THREE.Mesh(
      new THREE.TubeGeometry(ribCurve, 7, Math.max(0.012, radius * 0.026), 4, false),
      materials.gold,
    ));
  }
  addRing(root, radius * 0.72, radius * 0.035, height * 0.1, materials.gold, quality);
  return root;
}

function createPalaceTower(
  radius: number,
  height: number,
  materials: Island7UnderwaterMaterials,
  quality: Island3DQuality,
  bodyMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  const base = cylinder(radius * 1.14, radius * 1.28, 0.16, materials.oceanStone, segmentCount(quality));
  base.position.y = 0.08;
  const body = cylinder(radius, radius * 1.06, height, bodyMaterial, segmentCount(quality));
  body.position.y = 0.16 + height / 2;
  root.add(base, body);
  addRing(root, radius * 1.02, radius * 0.075, 0.16 + height * 0.58, materials.gold, quality);
  addRing(root, radius * 1.08, radius * 0.09, 0.16 + height, materials.gold, quality);
  const spire = createOnionSpire(radius * 1.34, height * 0.78, materials, quality, materials.turquoise);
  spire.position.y = 0.16 + height;
  root.add(spire);
  addPearlFinial(root, 0, 0.16 + height * 1.82, 0, 0.9, materials, quality);
  return root;
}

const ISLAND_7_ANIMATED_LANDMARK_PARTS = new Set([
  'ISLAND_7_BUBBLE_WHEEL',
  'ISLAND_7_ARCHIVE_ARMILLARY',
  'ISLAND_7_PORTAL_SURFACE',
  'ISLAND_7_PORTAL_VORTEX_RING',
  'ISLAND_7_PORTAL_INNER_VORTEX',
  'ISLAND_7_COMPASS_ROSE',
  'ISLAND_7_PALACE_PEARL_CORE',
  'ISLAND_7_SANCTUARY_INTERIOR_GARDEN',
  'ISLAND_7_ARCHIVE_VISIBLE_INTERIOR',
]);

/** Merge decorative architecture into material batches while preserving the
 * few named parts that move at runtime. The outer root remains the canonical
 * interaction target, so this changes rendering cost without changing play.
 */
function compactUnderwaterLandmark(root: THREE.Group, landmarkId: string, materials: Island7UnderwaterMaterials) {
  const animatedParts: THREE.Object3D[] = [];
  root.traverse((object) => {
    if (ISLAND_7_ANIMATED_LANDMARK_PARTS.has(object.name)) animatedParts.push(object);
  });
  const animatedEscrow = new THREE.Group();
  root.updateMatrixWorld(true);
  animatedParts.forEach((object) => animatedEscrow.attach(object));
  const inverseRoot = root.matrixWorld.clone().invert();
  const opaqueGeometries: THREE.BufferGeometry[] = [];
  const opaqueSources: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    if (material.transparent || material.opacity < 1) return;
    const cloned = object.geometry.clone();
    const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
    if (geometry !== cloned) cloned.dispose();
    geometry.applyMatrix4(inverseRoot.clone().multiply(object.matrixWorld));
    for (const attributeName of Object.keys(geometry.attributes)) {
      if (attributeName !== 'position' && attributeName !== 'normal' && attributeName !== 'uv') geometry.deleteAttribute(attributeName);
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
      const color = material === materials.gold
        ? new THREE.Color(0xe2b348)
        : 'color' in material && material.color instanceof THREE.Color
      ? material.color
      : new THREE.Color(0xffffff);
    const positions = geometry.getAttribute('position');
    const normals = geometry.getAttribute('normal');
    const colors = new Float32Array(positions.count * 3);
    const shadedColor = new THREE.Color();
    for (let vertex = 0; vertex < positions.count; vertex += 1) {
      // Preserve the one-draw landmark batch, but bake enough large-scale
      // tonal structure into its vertex colours that towers no longer read as
      // smooth monochrome maquettes on a phone. Upward faces catch caustic
      // light; recessed/lower walls remain jewel-dark; a restrained vertical
      // ripple suggests shell and dressed-stone bands without adding geometry.
      const height = positions.getY(vertex);
      const upward = Math.max(0, normals.getY(vertex));
      const outward = Math.abs(normals.getZ(vertex)) * 0.035;
      const striation = Math.sin(height * 11.5 + positions.getX(vertex) * 2.2) * 0.035;
      const lighting = THREE.MathUtils.clamp(0.76 + upward * 0.17 + outward + height * 0.045 + striation, 0.64, 1.13);
      shadedColor.copy(color).multiplyScalar(lighting);
      colors[vertex * 3] = shadedColor.r;
      colors[vertex * 3 + 1] = shadedColor.g;
      colors[vertex * 3 + 2] = shadedColor.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    opaqueGeometries.push(geometry);
    opaqueSources.push(object);
  });
  opaqueSources.forEach((object) => {
    object.parent?.remove(object);
    object.geometry.dispose();
  });
  const opaqueGeometry = opaqueGeometries.length ? mergeGeometries(opaqueGeometries, false) : null;
  opaqueGeometries.forEach((geometry) => geometry.dispose());
  if (opaqueGeometry) {
    const architectureMaterial = new THREE.MeshStandardMaterial({
      vertexColors: true,
      bumpMap: materials.shell.bumpMap,
      bumpScale: 0.009,
      roughness: 0.27,
      metalness: 0.28,
      emissive: 0x012c38,
      emissiveIntensity: 0.16,
    });
    const architecture = new THREE.Mesh(opaqueGeometry, architectureMaterial);
    architecture.name = `ISLAND7_${landmarkId.toUpperCase()}_ARCHITECTURE_BATCH`;
    architecture.receiveShadow = true;
    root.add(architecture);
  }
  // Transparent crystals, windows and portal surfaces retain their material
  // behavior, but are still merged by shared material where possible.
  compactStaticGeometry(root, `ISLAND7_${landmarkId.toUpperCase()}_TRANSLUCENT`);
  root.updateMatrixWorld(true);
  animatedParts.forEach((object) => root.attach(object));
}

function addHeroFacade(
  root: THREE.Group,
  landmarkId: Island5LandmarkDefinition['id'],
  materials: Island7UnderwaterMaterials,
  quality: Island3DQuality,
) {
  const facade = new THREE.Group();
  facade.name = `ISLAND_7_${landmarkId.toUpperCase()}_HERO_FACADE`;
  const addDoor = (width: number, height: number, y: number, z: number) => {
    const halfWidth = width / 2;
    const doorShape = new THREE.Shape();
    doorShape.moveTo(-halfWidth, -height / 2);
    doorShape.lineTo(halfWidth, -height / 2);
    doorShape.lineTo(halfWidth, height * 0.18);
    doorShape.quadraticCurveTo(halfWidth, height * 0.46, 0, height / 2);
    doorShape.quadraticCurveTo(-halfWidth, height * 0.46, -halfWidth, height * 0.18);
    doorShape.closePath();
    const door = new THREE.Mesh(
      new THREE.ExtrudeGeometry(doorShape, { depth: 0.06, bevelEnabled: true, bevelSegments: 1, bevelSize: 0.018, bevelThickness: 0.015 }),
      materials.warmWindow,
    );
    door.position.set(0, y, z);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(width * 0.56, 0.045, 6, segmentCount(quality), Math.PI), materials.gold);
    arch.position.set(0, y + height * 0.48, z + 0.025);
    arch.rotation.z = Math.PI;
    const leftJamb = box(0.055, height * 0.8, 0.09, materials.gold);
    const rightJamb = leftJamb.clone();
    leftJamb.position.set(-halfWidth - 0.015, y - height * 0.08, z + 0.04);
    rightJamb.position.set(halfWidth + 0.015, y - height * 0.08, z + 0.04);
    facade.add(door, arch, leftJamb, rightJamb);
  };
  if (landmarkId === 'boss') {
    addDoor(0.5, 0.72, 0.76, 1.36);
    for (const x of [-0.48, 0.48]) addArchedWindow(facade, x, 1.42, 1.18, 1.42, materials, 0);
    const pearlArch = new THREE.Mesh(new THREE.TorusGeometry(0.38, 0.045, 6, segmentCount(quality), Math.PI), materials.gold);
    pearlArch.position.set(0, 1.68, 1.22);
    pearlArch.rotation.z = Math.PI;
    facade.add(pearlArch);
  } else if (landmarkId === 'hatchery') {
    addDoor(0.38, 0.48, 0.56, 0.9);
    for (const x of [-0.52, 0.52]) addArchedWindow(facade, x, 0.72, 0.73, 0.9, materials, 0);
  } else if (landmarkId === 'habit') {
    addDoor(0.42, 0.64, 0.72, 0.73);
    for (const x of [-0.44, 0.44]) addArchedWindow(facade, x, 1.02, 0.7, 1.34, materials, 0);
  } else if (landmarkId === 'wisdom') {
    addDoor(0.46, 0.72, 0.72, 1.01);
    for (const x of [-0.46, 0.46]) addArchedWindow(facade, x, 1.1, 0.95, 1.34, materials, 0);
    for (const x of [-0.3, 0.3]) addArchedWindow(facade, x, 1.76, 0.72, 0.88, materials, 0);
  } else {
    for (const x of [-0.73, 0.73]) addArchedWindow(facade, x, 0.94, 0.22, 1.08, materials, 0);
  }
  compactStaticGeometry(facade, `ISLAND7_${landmarkId.toUpperCase()}_HERO_FACADE`);
  root.add(facade);
}

function addCrystal(root: THREE.Group, x: number, y: number, z: number, size: number, material: THREE.Material, rotation = 0) {
  const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(size, 0), material);
  crystal.position.set(x, y, z);
  crystal.scale.y = 1.75;
  crystal.rotation.y = rotation;
  root.add(crystal);
  return crystal;
}

function compactJewelInterior(root: THREE.Group, name: string, emissive: number) {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const geometries: THREE.BufferGeometry[] = [];
  const sources: THREE.Mesh[] = [];
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    const material = Array.isArray(object.material) ? object.material[0] : object.material;
    const cloned = object.geometry.clone();
    const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
    if (geometry !== cloned) cloned.dispose();
    geometry.applyMatrix4(inverse.clone().multiply(object.matrixWorld));
    for (const attributeName of Object.keys(geometry.attributes)) {
      if (attributeName !== 'position' && attributeName !== 'normal') geometry.deleteAttribute(attributeName);
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const color = 'color' in material && material.color instanceof THREE.Color ? material.color : new THREE.Color(0xffffff);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let index = 0; index < colors.length; index += 3) {
      colors[index] = color.r;
      colors[index + 1] = color.g;
      colors[index + 2] = color.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometries.push(geometry);
    sources.push(object);
  });
  sources.forEach((object) => {
    object.parent?.remove(object);
    object.geometry.dispose();
  });
  const merged = geometries.length ? mergeGeometries(geometries, false) : null;
  geometries.forEach((geometry) => geometry.dispose());
  if (!merged) return;
  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.34,
    metalness: 0.16,
    emissive,
    emissiveIntensity: 0.48,
  });
  const mesh = new THREE.Mesh(merged, material);
  mesh.name = name;
  root.add(mesh);
}

function createNautilusHatchery(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_NAUTILUS_HATCHERY';
  addPlinth(root, 1.05 + level * 0.08, materials, quality);
  addStairs(root, 0.78, 0.62, materials, level + 2);
  const shellRoot = new THREE.Group();
  shellRoot.position.set(0, 0.78, -0.24);
  shellRoot.rotation.set(-0.06, 0, -0.12);
  const shellBack = cylinder(0.69 + level * 0.07, 0.74 + level * 0.07, 0.28, materials.shell, segmentCount(quality) * 2);
  shellBack.rotation.x = Math.PI / 2;
  shellBack.position.set(0, 0.08, -0.12);
  shellRoot.add(shellBack);
  const loops = level === 1 ? 3 : level === 2 ? 5 : 7;
  for (let index = loops; index >= 1; index -= 1) {
    const radius = 0.17 + index * 0.095;
    const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.075 + index * 0.012, 7, segmentCount(quality) * 2, Math.PI * 1.62), materials.shell);
    torus.rotation.z = -0.68;
    torus.position.set(-0.05 + index * 0.025, index * 0.025, 0);
    shellRoot.add(torus);
  }
  const shellLip = new THREE.Mesh(new THREE.TorusGeometry(0.68 + level * 0.07, 0.08, 7, segmentCount(quality) * 2, Math.PI * 1.72), materials.gold);
  shellLip.rotation.z = -0.68;
  shellLip.position.z = 0.035;
  shellRoot.add(shellLip);
  root.add(shellRoot);

  const shellChamber = new THREE.Mesh(
    new THREE.SphereGeometry(0.62 + level * 0.055, segmentCount(quality), Math.max(8, segmentCount(quality) / 2), 0, Math.PI, 0, Math.PI),
    materials.shell,
  );
  shellChamber.scale.set(1, 1.08, 0.34);
  shellChamber.position.set(0, 0.83, -0.14);
  shellChamber.rotation.y = Math.PI / 2;
  // At L3 the expanded spiral already forms a complete shell mass; retaining
  // the half-sphere chamber exposes its cut plane as a tall blade through the
  // eggs. Lower levels keep it to provide enough body before all spiral bands
  // have been constructed.
  if (level < 3) root.add(shellChamber);
  const chamberGlow = new THREE.Mesh(
    new THREE.CircleGeometry(0.43 + level * 0.035, segmentCount(quality)),
    materials.warmWindow,
  );
  chamberGlow.position.set(0, 0.82, 0.035);
  root.add(chamberGlow);
  if (level === 3) {
    const cavity = new THREE.Mesh(new THREE.CircleGeometry(0.5, segmentCount(quality) * 2), new THREE.MeshBasicMaterial({ color: 0x102c38 }));
    cavity.position.set(0, 0.82, 0.044);
    const cavityGlow = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.48, segmentCount(quality) * 2), materials.warmWindow);
    cavityGlow.position.set(0, 0.82, 0.052);
    root.add(cavity, cavityGlow);
  }

  const nest = new THREE.Mesh(new THREE.TorusGeometry(0.44 + level * 0.05, 0.11, 7, segmentCount(quality) * 2), materials.nest);
  nest.rotation.x = Math.PI / 2;
  nest.position.set(0, 0.67, 0.19);
  root.add(nest);
  const eggCount = level === 1 ? 2 : level === 2 ? 4 : 7;
  for (let index = 0; index < eggCount; index += 1) {
    const angle = index / Math.max(1, eggCount) * Math.PI * 2;
    const egg = new THREE.Mesh(new THREE.SphereGeometry(0.11 + index % 2 * 0.016, segmentCount(quality), 8), materials.egg.clone());
    egg.scale.y = 1.28;
    egg.position.set(Math.cos(angle) * (index === 0 ? 0 : 0.24), 0.78 + (index % 3) * 0.035, 0.2 + Math.sin(angle) * 0.16);
    (egg.material as THREE.MeshPhysicalMaterial).color.offsetHSL(index * 0.025, 0, 0);
    root.add(egg);
  }
  if (level >= 2) {
    [-0.72, 0.72].forEach((x) => {
      const column = cylinder(0.08, 0.1, 0.62 + level * 0.1, materials.turquoise, 10);
      column.position.set(x, 0.58, 0.26);
      root.add(column);
      addPearlFinial(root, x, 1.03 + level * 0.1, 0.26, 0.85, materials, quality);
    });
  }
  if (level === 3) {
    addRing(root, 0.95, 0.035, 0.34, materials.gold, quality);
    const shellHalo = new THREE.Mesh(new THREE.TorusGeometry(0.66, 0.035, 6, 24, Math.PI * 1.5), materials.gold);
    shellHalo.position.set(0, 0.8, -0.08);
    shellHalo.rotation.set(0, Math.PI / 2, -0.9);
    root.add(shellHalo);
    // Keep the cavity open: the old full-height center blade bisected the nest
    // and made the eggs look trapped behind a spear. Two short asymmetric shell
    // lips preserve the nautilus layering without obstructing the focal read.
    for (const side of [-1, 1]) {
      const shellLip = box(0.1, 0.5, 0.11, materials.shell);
      shellLip.position.set(side * 0.36, 0.58, 0.25);
      shellLip.rotation.z = side * -0.2;
      root.add(shellLip);
    }
    for (let index = 0; index < 5; index += 1) addCrystal(root, -0.78 + index * 0.39, 0.46, -0.5 + Math.abs(index - 2) * 0.08, 0.08, index % 2 ? materials.violetCrystal : materials.crystal, index);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      const pearlColumn = cylinder(0.045, 0.065, 0.46, materials.turquoise, 8);
      pearlColumn.position.set(Math.cos(angle) * 0.82, 0.5, Math.sin(angle) * 0.68);
      root.add(pearlColumn);
      addPearlFinial(root, pearlColumn.position.x, 0.78, pearlColumn.position.z, 0.56, materials, quality);
    }
  }
  return root;
}

function createHabitSanctuary(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_LIVING_REEF_SANCTUARY';
  addPlinth(root, 1.05 + level * 0.08, materials, quality);
  addStairs(root, 0.82, 0.64, materials, level + 2);
  const columns = level === 1 ? 4 : level === 2 ? 6 : 8;
  for (let index = 0; index < columns; index += 1) {
    const angle = index / columns * Math.PI * 2;
    const column = cylinder(0.075, 0.11, 0.68 + level * 0.16, index % 2 ? materials.shell : materials.turquoise, 10);
    column.position.set(Math.cos(angle) * 0.7, 0.69 + level * 0.08, Math.sin(angle) * 0.58);
    root.add(column);
    addPearlFinial(root, column.position.x, column.position.y + column.geometry.parameters.height / 2 + 0.06, column.position.z, 0.72, materials, quality);
    const arch = new THREE.Mesh(
      new THREE.TorusGeometry(0.22, 0.026, 5, 12, Math.PI),
      materials.gold,
    );
    arch.position.set(Math.cos(angle) * 0.57, 1.05 + level * 0.1, Math.sin(angle) * 0.48);
    arch.rotation.set(0, -angle + Math.PI / 2, Math.PI);
    root.add(arch);
  }
  const sanctuaryCore = cylinder(0.48, 0.56, 0.72 + level * 0.12, materials.turquoise, segmentCount(quality));
  sanctuaryCore.position.y = 0.67 + level * 0.06;
  root.add(sanctuaryCore);
  const sanctuaryWindows = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < sanctuaryWindows; index += 1) {
    const angle = index / sanctuaryWindows * Math.PI * 2;
    addArchedWindow(root, Math.cos(angle) * 0.51, 0.76 + level * 0.06, Math.sin(angle) * 0.51, 0.72, materials, -angle + Math.PI / 2);
  }
  const glassCrown = new THREE.Mesh(
    new THREE.SphereGeometry(0.7 + level * 0.04, segmentCount(quality), Math.max(8, segmentCount(quality) / 2), 0, Math.PI * 2, 0, Math.PI / 2),
    materials.crystal,
  );
  glassCrown.scale.y = 1.22;
  glassCrown.position.y = 1.28 + level * 0.13;
  root.add(glassCrown);
  if (level === 3) {
    const gardenCore = new THREE.Group();
    gardenCore.name = 'ISLAND_7_SANCTUARY_INTERIOR_GARDEN';
    const trunk = cylinder(0.075, 0.12, 0.68, materials.coralGold, 9);
    trunk.position.y = 1.47;
    gardenCore.add(trunk);
    for (let index = 0; index < 9; index += 1) {
      const angle = index / 9 * Math.PI * 2;
      const height = 0.42 + index % 3 * 0.12;
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(Math.cos(angle) * 0.08, 1.42, Math.sin(angle) * 0.07),
        new THREE.Vector3(Math.cos(angle + 0.25) * 0.28, 1.42 + height * 0.5, Math.sin(angle + 0.25) * 0.23),
        new THREE.Vector3(Math.cos(angle - 0.18) * 0.5, 1.42 + height, Math.sin(angle - 0.18) * 0.4),
      ]);
      gardenCore.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.035 + index % 2 * 0.012, 5, false), index % 3 === 0 ? materials.coralGold : index % 2 ? materials.coralPink : materials.coralViolet));
      if (index % 2 === 0) {
        const plate = new THREE.Mesh(new THREE.SphereGeometry(0.17 + index % 3 * 0.025, 10, 6), index % 4 ? materials.coralPink : materials.coralViolet);
        plate.scale.set(1.35, 0.24, 0.85);
        plate.position.set(Math.cos(angle - 0.18) * 0.5, 1.42 + height, Math.sin(angle - 0.18) * 0.4);
        plate.rotation.y = -angle;
        gardenCore.add(plate);
      }
    }
    const gardenPearl = new THREE.Mesh(new THREE.SphereGeometry(0.17, 12, 8), materials.pearl);
    gardenPearl.position.y = 1.72;
    gardenCore.add(gardenPearl);
    for (let index = 0; index < 5; index += 1) {
      const angle = index / 5 * Math.PI * 2 + 0.35;
      const plate = new THREE.Mesh(
        new THREE.SphereGeometry(0.23 + index % 2 * 0.04, 10, 6),
        index % 2 ? materials.coralGold : materials.coralPink,
      );
      plate.scale.set(1.45, 0.3, 0.95);
      plate.position.set(Math.cos(angle) * 0.35, 1.28 + index % 3 * 0.13, Math.sin(angle) * 0.32);
      plate.rotation.y = -angle;
      gardenCore.add(plate);
    }
    compactJewelInterior(gardenCore, 'ISLAND_7_SANCTUARY_JEWEL_GARDEN_BATCH', 0x40124f);
    root.add(gardenCore);
  }
  const ribCount = quality === 'high' ? 8 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * 0.67, 1.27 + level * 0.13, Math.sin(angle) * 0.67),
      new THREE.Vector3(Math.cos(angle) * 0.48, 1.72 + level * 0.14, Math.sin(angle) * 0.48),
      new THREE.Vector3(0, 2.12 + level * 0.12, 0),
    ]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.025, 5, false), materials.gold));
  }
  addRing(root, 0.69 + level * 0.04, 0.035, 1.27 + level * 0.13, materials.gold, quality);
  if (level === 3) addShellArcade(root, 0.79, 1.02, 6, materials, quality);
  if (level === 3) {
    const crown = createOnionSpire(0.24, 0.66, materials, quality, materials.shell);
    crown.position.y = 1.98 + level * 0.12;
    root.add(crown);
    addPearlFinial(root, 0, 2.76, 0, 0.75, materials, quality);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addCrystal(root, Math.cos(angle) * 0.92, 0.44, Math.sin(angle) * 0.76, 0.075, index % 2 ? materials.coralPink : materials.crystal, angle);
    }
  }
  if (level >= 2) {
    const wheel = new THREE.Group();
    wheel.name = 'ISLAND_7_BUBBLE_WHEEL';
    addRing(wheel, 0.3, 0.025, 0, materials.gold, quality, true);
    for (let index = 0; index < 6; index += 1) {
      const spoke = box(0.025, 0.24, 0.025, materials.gold);
      spoke.rotation.z = index / 6 * Math.PI * 2;
      wheel.add(spoke);
    }
    wheel.position.set(0.82, 0.75, 0.05);
    wheel.rotation.y = Math.PI / 2;
    root.add(wheel);
  }
  const kelpCount = Math.round((5 + level * 3) * detailScale(quality));
  for (let index = 0; index < kelpCount; index += 1) {
    const angle = index / Math.max(1, kelpCount) * Math.PI * 2 + 0.3;
    const height = 0.42 + (index % 4) * 0.12;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(Math.sin(index) * 0.06, height * 0.45, 0),
      new THREE.Vector3(Math.cos(index * 1.7) * 0.11, height, 0),
    ]);
    const kelp = new THREE.Mesh(new THREE.TubeGeometry(curve, 6, 0.025 + index % 2 * 0.009, 5, false), index % 3 ? materials.kelp : materials.kelpLight);
    kelp.name = 'ISLAND_7_SWAY_KELP';
    kelp.position.set(Math.cos(angle) * 0.95, 0.28, Math.sin(angle) * 0.8);
    kelp.userData.phase = index * 0.71;
    root.add(kelp);
  }
  return root;
}

function createWisdomArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_TIDEMIND_ARCHIVE';
  addPlinth(root, 1.06 + level * 0.08, materials, quality);
  addStairs(root, 0.82, 0.66, materials, level + 2);
  const bodyHeight = level === 3 ? 1.28 : 0.72 + level * 0.12;
  const body = cylinder(0.72 + level * 0.06, 0.82 + level * 0.07, bodyHeight, materials.turquoise, segmentCount(quality));
  body.position.y = level === 3 ? 0.88 : 0.72 + level * 0.06;
  root.add(body);
  const archiveEntrance = new THREE.Group();
  archiveEntrance.name = 'ISLAND_7_ARCHIVE_ENTRANCE';
  const archiveDoor = box(0.48, 0.72 + level * 0.08, 0.08, materials.warmWindow);
  archiveDoor.position.set(0, 0.71 + level * 0.06, 0.8 + level * 0.07);
  const archiveArch = new THREE.Mesh(new THREE.TorusGeometry(0.29, 0.05, 6, 18, Math.PI), materials.gold);
  archiveArch.position.set(0, 1.02 + level * 0.1, 0.84 + level * 0.07);
  archiveArch.rotation.z = Math.PI;
  archiveEntrance.add(archiveDoor, archiveArch);
  for (const x of [-0.37, 0.37]) {
    const entranceColumn = cylinder(0.05, 0.07, 0.75 + level * 0.08, materials.shell, 8);
    entranceColumn.position.set(x, 0.72 + level * 0.06, 0.83 + level * 0.07);
    archiveEntrance.add(entranceColumn);
  }
  root.add(archiveEntrance);
  addRing(root, 0.76 + level * 0.065, 0.035, 0.55, materials.gold, quality);
  addRing(root, 0.75 + level * 0.065, 0.04, 1.02 + level * 0.09, materials.gold, quality);
  const archiveFacets = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
  for (let index = 0; index < archiveFacets; index += 1) {
    const angle = index / archiveFacets * Math.PI * 2;
    const rib = box(0.055, 0.66 + level * 0.11, 0.05, materials.gold);
    rib.position.set(Math.cos(angle) * (0.73 + level * 0.065), 0.72 + level * 0.06, Math.sin(angle) * (0.73 + level * 0.065));
    rib.rotation.y = -angle + Math.PI / 2;
    root.add(rib);
    addArchedWindow(root, Math.cos(angle + Math.PI / archiveFacets) * (0.735 + level * 0.065), 0.77 + level * 0.06, Math.sin(angle + Math.PI / archiveFacets) * (0.735 + level * 0.065), 0.58, materials, -(angle + Math.PI / archiveFacets) + Math.PI / 2);
  }
  const shelfCount = Math.round((6 + level * 3) * detailScale(quality));
  for (let index = 0; index < shelfCount; index += 1) {
    const angle = index / Math.max(1, shelfCount) * Math.PI * 1.5 + Math.PI * 0.75;
    const shelf = box(0.28, 0.38 + level * 0.08, 0.08, materials.book);
    shelf.position.set(Math.cos(angle) * 0.69, 0.7, Math.sin(angle) * 0.69);
    shelf.rotation.y = -angle + Math.PI / 2;
    root.add(shelf);
    for (let row = 0; row < (quality === 'high' ? 3 : 2); row += 1) {
      const book = box(0.19, 0.035, 0.04, row % 2 ? materials.coralViolet : materials.gold);
      book.position.set(shelf.position.x, 0.58 + row * 0.11, shelf.position.z);
      book.rotation.y = shelf.rotation.y;
      root.add(book);
    }
  }
  if (level < 3) {
    const dome = createOnionSpire(0.64 + level * 0.055, 0.82 + level * 0.16, materials, quality, materials.shell);
    dome.position.y = 1.08 + level * 0.13;
    root.add(dome);
  }
  if (level === 3) {
    const archiveGlassMaterial = materials.crystal.clone();
    archiveGlassMaterial.color.setHex(0x2db7c8);
    archiveGlassMaterial.opacity = 0.48;
    archiveGlassMaterial.emissive.setHex(0x075267);
    archiveGlassMaterial.emissiveIntensity = 0.56;
    archiveGlassMaterial.side = THREE.DoubleSide;
    archiveGlassMaterial.depthWrite = false;
    archiveGlassMaterial.forceSinglePass = true;
    const glassDome = new THREE.Mesh(
      new THREE.SphereGeometry(0.79, segmentCount(quality), Math.max(7, Math.round(segmentCount(quality) / 2)), 0, Math.PI * 2, 0, Math.PI / 2),
      archiveGlassMaterial,
    );
    glassDome.name = 'ISLAND_7_ARCHIVE_GLASS_DOME';
    glassDome.scale.y = 1.05;
    glassDome.position.y = 1.5;
    root.add(glassDome);
    // A solid lower drum stops the dome reading as an unfinished wire cage at
    // overview distance, while the transparent upper shell still reveals the
    // warm library interior in focus views.
    const domeDrum = cylinder(0.78, 0.83, 0.28, materials.turquoise, segmentCount(quality));
    domeDrum.position.y = 1.39;
    root.add(domeDrum);
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addArchedWindow(root, Math.cos(angle) * 0.785, 1.47, Math.sin(angle) * 0.785, 0.56, materials, -angle + Math.PI / 2);
      const galleryLight = box(0.22, 0.16, 0.045, materials.warmWindow);
      galleryLight.position.set(Math.cos(angle) * 0.81, 1.3, Math.sin(angle) * 0.81);
      galleryLight.rotation.y = -angle + Math.PI / 2;
      root.add(galleryLight);
    }
    addRing(root, 0.8, 0.045, 1.5, materials.gold, quality);
    addRing(root, 0.77, 0.065, 1.28, materials.gold, quality);
    addShellArcade(root, 0.91, 1.3, 6, materials, quality);
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      addPointedShellPanel(root, angle, 0.9, 0.93, 0.34, 0.94, materials);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const ribCurve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(Math.cos(angle) * 0.78, 1.5, Math.sin(angle) * 0.78),
        new THREE.Vector3(Math.cos(angle) * 0.58, 2.0, Math.sin(angle) * 0.58),
        new THREE.Vector3(0, 2.3, 0),
      );
      root.add(new THREE.Mesh(new THREE.TubeGeometry(ribCurve, 7, 0.032, 5, false), materials.gold));
    }
    const interior = new THREE.Group();
    interior.name = 'ISLAND_7_ARCHIVE_VISIBLE_INTERIOR';
    const backWall = box(0.96, 0.82, 0.06, materials.book);
    backWall.position.set(0, 1.45, -0.32);
    interior.add(backWall);
    for (let shelfIndex = 0; shelfIndex < 4; shelfIndex += 1) {
      const shelf = box(0.92, 0.035, 0.09, materials.gold);
      shelf.position.set(0, 1.19 + shelfIndex * 0.18, -0.27);
      interior.add(shelf);
      for (let bookIndex = 0; bookIndex < 7; bookIndex += 1) {
        const book = box(0.075, 0.12 + bookIndex % 2 * 0.025, 0.06, bookIndex % 3 === 0 ? materials.coralViolet : bookIndex % 3 === 1 ? materials.coralGold : materials.book);
        book.position.set(-0.36 + bookIndex * 0.12, 1.27 + shelfIndex * 0.18, -0.22);
        interior.add(book);
      }
    }
    const readingPearl = new THREE.Mesh(new THREE.SphereGeometry(0.13, 10, 7), materials.pearl);
    readingPearl.position.set(0, 1.42, 0.05);
    interior.add(readingPearl);
    const armillary = new THREE.Group();
    addRing(armillary, 0.24, 0.018, 0, materials.gold, quality, true);
    const armillaryCross = addRing(armillary, 0.24, 0.018, 0, materials.gold, quality, true);
    armillaryCross.rotation.y = Math.PI / 2;
    armillary.position.set(0, 1.76, -0.02);
    interior.add(armillary);
    const interiorGlow = new THREE.Mesh(new THREE.CircleGeometry(0.34, 14), materials.warmWindow);
    interiorGlow.position.set(0, 1.48, -0.29);
    interiorGlow.scale.set(1.4, 0.9, 1);
    interior.add(interiorGlow);
    compactJewelInterior(interior, 'ISLAND_7_ARCHIVE_JEWEL_INTERIOR_BATCH', 0x5a2408);
    root.add(interior);
    const archiveSpire = createOnionSpire(0.2, 0.5, materials, quality, materials.shell);
    archiveSpire.position.y = 2.22;
    root.add(archiveSpire);
    addPearlFinial(root, 0, 2.68, 0, 0.72, materials, quality);
  }
  if (level >= 2) {
    const globe = new THREE.Group();
    globe.name = 'ISLAND_7_ARCHIVE_ARMILLARY';
    addRing(globe, 0.22, 0.018, 0, materials.gold, quality, true);
    const second = addRing(globe, 0.22, 0.018, 0, materials.gold, quality, true);
    second.rotation.y = Math.PI / 2;
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 7), materials.crystal);
    globe.add(core);
    globe.position.set(-0.54, 0.58, 0.65);
    root.add(globe);
  }
  const desk = box(0.55, 0.1, 0.34, materials.book);
  desk.position.set(0, 0.48, 0.76);
  const openBook = box(0.44, 0.025, 0.28, materials.sand);
  openBook.position.set(0, 0.55, 0.76);
  root.add(desk, openBook);
  if (level === 3) {
    const readingGallery = box(1.08, 0.32, 0.3, materials.turquoise);
    readingGallery.position.set(0, 0.79, 0.76);
    const galleryWindow = box(0.78, 0.4, 0.055, materials.warmWindow);
    galleryWindow.position.set(0, 0.82, 1.01);
    root.add(readingGallery, galleryWindow);
    for (const x of [-0.38, 0, 0.38]) addArchedWindow(root, x, 0.86, 1.05, 0.96, materials, 0);
    for (const x of [-0.74, 0.74]) {
      const turret = createPalaceTower(0.13, 0.6, materials, quality, materials.turquoise);
      turret.position.set(x, 0.35, 0.08);
      root.add(turret);
    }
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const balcony = cylinder(0.18, 0.22, 0.08, materials.gold, 10);
      balcony.position.set(Math.cos(angle) * 0.88, 0.88, Math.sin(angle) * 0.88);
      root.add(balcony);
      addPearlFinial(root, balcony.position.x, 1.04, balcony.position.z, 0.58, materials, quality);
    }
  }
  return root;
}

function createCompassPortal(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_COMPASS_CURRENT_PORTAL';
  addPlinth(root, 1.05 + level * 0.08, materials, quality);
  addStairs(root, 0.84, 0.66, materials, level + 2);
  const archRadius = 0.68 + level * 0.13;
  const arch = new THREE.Mesh(new THREE.TorusGeometry(archRadius, 0.1 + level * 0.015, 8, segmentCount(quality) * 2, Math.PI), materials.gold);
  arch.rotation.z = Math.PI;
  arch.position.y = 1.02 + level * 0.16;
  root.add(arch);
  [-archRadius, archRadius].forEach((x) => {
    const pillar = cylinder(0.12, 0.17, 1.05 + level * 0.17, materials.turquoise, 10);
    pillar.position.set(x, 0.72 + level * 0.1, 0);
    root.add(pillar);
    addPearlFinial(root, x, 1.3 + level * 0.19, 0, 0.84, materials, quality);
  });
  if (level === 3) {
    const outerArch = new THREE.Mesh(new THREE.TorusGeometry(archRadius * 1.17, 0.045, 6, segmentCount(quality) * 2, Math.PI), materials.shell);
    outerArch.rotation.z = Math.PI;
    outerArch.position.y = 1.02 + level * 0.16;
    root.add(outerArch);
    for (const x of [-archRadius * 1.17, archRadius * 1.17]) {
      const outerPillar = cylinder(0.075, 0.105, 1.12 + level * 0.17, materials.shell, 10);
      outerPillar.position.set(x, 0.75 + level * 0.1, 0.03);
      root.add(outerPillar);
    }
  }
  const portalMaterial = materials.portal.clone();
  portalMaterial.color.set(0x704dff);
  portalMaterial.opacity = 0.84;
  const portalBackplate = new THREE.Mesh(
    new THREE.CircleGeometry(archRadius * 0.82, segmentCount(quality)),
    new THREE.MeshBasicMaterial({ color: 0x071b55, transparent: true, opacity: 0.78, depthWrite: false }),
  );
  portalBackplate.position.set(0, 1.02 + level * 0.16, -0.018);
  portalBackplate.scale.y = 1.28;
  root.add(portalBackplate);
  const portal = new THREE.Mesh(new THREE.CircleGeometry(archRadius * 0.78, segmentCount(quality) * 2), portalMaterial);
  portal.name = 'ISLAND_7_PORTAL_SURFACE';
  portal.position.y = 1.02 + level * 0.16;
  portal.scale.y = 1.28;
  portal.userData.baseOpacity = 0.64;
  root.add(portal);
  const vortexRing = new THREE.Mesh(new THREE.TorusGeometry(archRadius * 0.7, 0.035, 6, segmentCount(quality) * 2, Math.PI * 1.55), materials.violetCrystal);
  vortexRing.name = 'ISLAND_7_PORTAL_VORTEX_RING';
  vortexRing.position.set(0, 1.02 + level * 0.16, 0.025);
  vortexRing.scale.y = 1.28;
  vortexRing.rotation.z = 0.45;
  root.add(vortexRing);
  const innerVortex = new THREE.Mesh(new THREE.TorusGeometry(archRadius * 0.48, 0.026, 5, segmentCount(quality) * 2, Math.PI * 1.35), materials.crystal);
  innerVortex.name = 'ISLAND_7_PORTAL_INNER_VORTEX';
  innerVortex.position.set(0, 1.02 + level * 0.16, 0.04);
  innerVortex.scale.y = 1.28;
  innerVortex.rotation.z = -0.82;
  root.add(innerVortex);
  if (level === 3) {
    const vortexCoreMaterial = materials.portal.clone();
    vortexCoreMaterial.color.set(0xff8df5);
    vortexCoreMaterial.opacity = 0.28;
    const vortexCore = new THREE.Mesh(new THREE.RingGeometry(archRadius * 0.14, archRadius * 0.3, segmentCount(quality) * 2, 1, 0.55, Math.PI * 1.38), vortexCoreMaterial);
    vortexCore.position.set(0, 1.02 + level * 0.16, 0.055);
    vortexCore.scale.y = 1.28;
    vortexCore.rotation.z = 1.1;
    root.add(vortexCore);
  }
  const compass = new THREE.Group();
  compass.name = 'ISLAND_7_COMPASS_ROSE';
  addRing(compass, 0.38 + level * 0.04, 0.025, 0, materials.gold, quality);
  for (let index = 0; index < 8; index += 1) {
    const needle = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.36, 3), index % 2 ? materials.crystal : materials.gold);
    needle.rotation.z = -index / 8 * Math.PI * 2;
    needle.position.set(Math.cos(index / 8 * Math.PI * 2) * 0.18, 0.02, Math.sin(index / 8 * Math.PI * 2) * 0.18);
    compass.add(needle);
  }
  compass.position.set(0, 0.39, 0.68);
  root.add(compass);
  if (level === 3) {
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addCrystal(root, Math.cos(angle) * 0.92, 0.46, Math.sin(angle) * 0.76, 0.1, index % 2 ? materials.violetCrystal : materials.crystal, angle);
    }
    for (const x of [-1.12, 1.12]) {
      const tower = createPalaceTower(0.14, 0.75, materials, quality, materials.turquoise);
      tower.position.set(x, 0.36, 0.04);
      root.add(tower);
    }
  }
  return root;
}

function createPearlPalace(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_PEARL_THRONE_PALACE';
  addPlinth(root, 1.38 + level * 0.11, materials, quality, 0.13);
  addStairs(root, 0.95 + level * 0.08, 0.82, materials, level + 3);
  const base = cylinder(0.83 + level * 0.08, 1.02 + level * 0.08, 0.82 + level * 0.18, materials.turquoise, segmentCount(quality));
  base.position.y = 0.74 + level * 0.08;
  root.add(base);
  if (level === 3) {
    // Break the cylindrical mass into an inhabited, tiered palace facade.
    const lowerGallery = cylinder(1.04, 1.12, 0.28, materials.shell, segmentCount(quality));
    lowerGallery.position.y = 0.52;
    const upperGallery = cylinder(0.76, 0.86, 0.42, materials.turquoise, segmentCount(quality));
    upperGallery.position.y = 1.42;
    const lantern = cylinder(0.36, 0.46, 0.4, materials.shell, segmentCount(quality));
    lantern.position.y = 1.84;
    root.add(lowerGallery, upperGallery, lantern);
    addRing(root, 1.12, 0.055, 1.22, materials.gold, quality);
    addRing(root, 0.54, 0.038, 1.65, materials.gold, quality);
    addShellArcade(root, 1.08, 1.28, 8, materials, quality);
    const galleryWindows = 8;
    for (let index = 0; index < galleryWindows; index += 1) {
      const angle = index / galleryWindows * Math.PI * 2;
      addArchedWindow(root, Math.cos(angle) * 0.87, 1.43, Math.sin(angle) * 0.87, 0.78, materials, -angle + Math.PI / 2);
    }
    // A small number of large glowing bays provides inhabited depth at the
    // board camera without multiplying architectural draw calls.
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addArchedWindow(root, Math.cos(angle) * 0.43, 1.86, Math.sin(angle) * 0.43, 0.56, materials, -angle + Math.PI / 2);
    }
    // Four large shell buttresses give the palace the vertical, regal mass of
    // the goal image without relying on phone-invisible surface noise.
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
      const pier = box(0.28, 1.12, 0.32, index % 2 ? materials.shell : materials.turquoise);
      pier.position.set(Math.cos(angle) * 0.82, 1.0, Math.sin(angle) * 0.82);
      pier.rotation.y = -angle;
      root.add(pier);
      const pierCrown = createOnionSpire(0.2, 0.52, materials, quality, materials.shell);
      pierCrown.position.set(Math.cos(angle) * 0.82, 1.55, Math.sin(angle) * 0.82);
      root.add(pierCrown);
    }
    for (let index = 0; index < 6; index += 1) {
      const angle = index / 6 * Math.PI * 2;
      addPointedShellPanel(root, angle, 1.04, 0.84, 0.4, 1.04, materials);
    }
  }
  const baseGoldBands = level === 3 ? 3 : 2;
  for (let band = 0; band < baseGoldBands; band += 1) {
    addRing(root, 0.89 + level * 0.075, 0.028, 0.48 + band * 0.31, materials.gold, quality);
  }
  const facadePanels = quality === 'high' ? 12 : quality === 'medium' ? 8 : 6;
  for (let index = 0; index < facadePanels; index += 1) {
    const angle = index / facadePanels * Math.PI * 2;
    const panel = box(0.16, 0.62 + level * 0.08, 0.065, index % 2 ? materials.shell : materials.gold);
    panel.position.set(Math.cos(angle) * (0.87 + level * 0.075), 0.72 + level * 0.08, Math.sin(angle) * (0.87 + level * 0.075));
    panel.rotation.y = -angle + Math.PI / 2;
    root.add(panel);
  }
  const windowCount = quality === 'high' ? 10 : quality === 'medium' ? 7 : 4;
  for (let index = 0; index < windowCount; index += 1) {
    const angle = index / windowCount * Math.PI * 2;
    addArchedWindow(root, Math.cos(angle) * (0.86 + level * 0.07), 0.78 + level * 0.1, Math.sin(angle) * (0.86 + level * 0.07), 0.9, materials, -angle + Math.PI / 2);
  }
  const roof = createOnionSpire(
    level === 3 ? 0.49 : 0.72 + level * 0.065,
    level === 3 ? 1.02 : 1.08 + level * 0.25,
    materials,
    quality,
    materials.shell,
  );
  roof.position.y = level === 3 ? 2.02 : 1.08 + level * 0.18;
  root.add(roof);
  const entrance = new THREE.Group();
  entrance.name = 'ISLAND_7_PALACE_ENTRANCE';
  const doorway = box(0.42 + level * 0.035, 0.62 + level * 0.08, 0.08, materials.warmWindow);
  doorway.position.set(0, 0.74 + level * 0.06, 0.95 + level * 0.08);
  const entranceArch = new THREE.Mesh(
    new THREE.TorusGeometry(0.25 + level * 0.018, 0.045, 6, segmentCount(quality), Math.PI),
    materials.gold,
  );
  entranceArch.position.set(0, 1.01 + level * 0.1, 1.02 + level * 0.08);
  entranceArch.rotation.z = Math.PI;
  entrance.add(doorway, entranceArch);
  for (const x of [-0.34, 0.34]) {
    const doorColumn = cylinder(0.045, 0.065, 0.62 + level * 0.08, materials.gold, 8);
    doorColumn.position.set(x, 0.72 + level * 0.06, 1.01 + level * 0.08);
    entrance.add(doorColumn);
  }
  root.add(entrance);
  if (level === 3) {
    const transept = box(0.92, 0.86, 0.46, materials.shell);
    transept.position.set(0, 0.82, 1.0);
    const transeptRoof = createOnionSpire(0.42, 0.62, materials, quality, materials.turquoise);
    transeptRoof.position.set(0, 1.25, 1.0);
    root.add(transept, transeptRoof);
    for (const x of [-0.27, 0.27]) addArchedWindow(root, x, 0.92, 1.25, 0.92, materials, 0);
  }
  const towerCount = level === 1 ? 2 : 4;
  for (let index = 0; index < towerCount; index += 1) {
    const angle = index / towerCount * Math.PI * 2 + Math.PI / 4;
    const radius = level === 1 ? 0.68 : 0.92 + level * 0.04;
    const height = 0.72 + level * 0.18 + (index === 0 && level === 3 ? 0.18 : 0);
    const tower = createPalaceTower(0.19, height, materials, quality, index % 2 ? materials.shell : materials.turquoise);
    tower.position.set(Math.cos(angle) * radius, level === 3 ? 0.38 : 0.46, Math.sin(angle) * radius);
    if (level === 3) tower.scale.set(0.86, 1.18 + index % 2 * 0.08, 0.86);
    root.add(tower);
  }
  const pearlSize = 0.16 + level * 0.055;
  const pearlMaterial = materials.pearl.clone();
  pearlMaterial.map = null;
  pearlMaterial.bumpMap = null;
  pearlMaterial.emissiveIntensity = 0.55;
  const pearl = new THREE.Mesh(new THREE.SphereGeometry(pearlSize, segmentCount(quality), Math.max(8, segmentCount(quality) / 2)), pearlMaterial);
  pearl.name = 'ISLAND_7_PALACE_PEARL_CORE';
  pearl.position.set(0, level === 3 ? 1.66 : 1.28 + level * 0.25, level === 3 ? 1.03 : 0.89);
  pearl.userData.baseScale = 1;
  root.add(pearl);
  if (level >= 2) {
    const crown = new THREE.Group();
    crown.name = 'ISLAND_7_PALACE_CROWN';
    addRing(crown, 0.34 + level * 0.04, 0.025, 0, materials.gold, quality, true);
    crown.position.set(0, 1.87 + level * 0.25, 0);
    root.add(crown);
  }
  if (level === 3) {
    for (let index = 0; index < 4; index += 1) {
      const angle = index / 4 * Math.PI * 2;
      const buttress = box(0.15, 0.82, 0.18, materials.gold);
      buttress.position.set(Math.cos(angle) * 0.94, 0.76, Math.sin(angle) * 0.94);
      buttress.rotation.y = -angle;
      root.add(buttress);
    }
    for (let index = 0; index < 5; index += 1) {
      const angle = index / 5 * Math.PI * 2 + Math.PI / 4;
      addArchedWindow(root, Math.cos(angle) * 1.04, 1.18 + index % 2 * 0.16, Math.sin(angle) * 1.04, 0.52, materials, -angle + Math.PI / 2);
    }
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      addCrystal(root, Math.cos(angle) * 1.25, 0.46, Math.sin(angle) * 1.12, 0.075, index % 2 ? materials.crystal : materials.violetCrystal, angle);
    }
  }
  return root;
}

export function buildIsland7UnderwaterLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island7UnderwaterMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_7_UNDERWATER_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-007-underwater' };
  if (level === 0) {
    addPlinth(root, definition.id === 'boss' ? 1.45 : 1.08, materials, quality);
  } else {
    const resolved = level as 1 | 2 | 3;
    const building = definition.id === 'hatchery'
      ? createNautilusHatchery(resolved, quality, materials)
      : definition.id === 'habit'
        ? createHabitSanctuary(resolved, quality, materials)
        : definition.id === 'wisdom'
          ? createWisdomArchive(resolved, quality, materials)
          : definition.id === 'event'
            ? createCompassPortal(resolved, quality, materials)
            : createPearlPalace(resolved, quality, materials);
    if (definition.id !== 'boss') building.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    building.scale.setScalar(definition.id === 'boss' ? (resolved === 3 ? 1.34 : resolved === 2 ? 1.14 : 1) : (resolved === 3 ? 1.34 : resolved === 2 ? 1.16 : 1));
    compactUnderwaterLandmark(building, definition.id, materials);
    if (resolved === 3) addHeroFacade(building, definition.id, materials, quality);
    root.add(building);
  }
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  // One hero shadow anchors the central palace. The four satellites keep
  // baked material depth and receive that lighting without each replaying the
  // whole architectural draw list into the shadow map.
  markShadows(root, quality === 'high' && definition.id === 'boss');
  return root;
}

function createSeabedShelf(radius: number, depth: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  const segments = segmentCount(quality) * 2;
  const top = cylinder(radius, radius * 1.035, 0.28, materials.sand, segments);
  top.position.y = 0.12;
  const rim = cylinder(radius * 1.03, radius * 1.08, 0.3, materials.oceanStone, segments);
  rim.position.y = -0.12;
  const rockRoot = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.42, radius * 1.07, depth, segments, 3, false), materials.deepStone);
  rockRoot.position.y = -depth / 2 - 0.24;
  root.add(top, rim, rockRoot);
  const cragCount = Math.max(7, Math.round(segmentCount(quality) * 0.72));
  for (let index = 0; index < cragCount; index += 1) {
    const angle = index / cragCount * Math.PI * 2;
    const width = 0.36 + index % 4 * 0.11;
    const height = depth * (0.42 + index % 5 * 0.075);
    const crag = new THREE.Mesh(new THREE.DodecahedronGeometry(width, 0), materials.deepStone);
    crag.scale.set(1, height / width, 0.75 + index % 3 * 0.13);
    crag.position.set(Math.cos(angle) * radius * 0.88, -0.48 - height * 0.42, Math.sin(angle) * radius * 0.88);
    crag.rotation.set(index * 0.08, -angle, index % 2 ? 0.15 : -0.12);
    root.add(crag);
    if (index % 3 === 0) {
      const ledge = cylinder(width * 0.58, width * 0.72, 0.12, materials.oceanStone, 8);
      ledge.position.set(Math.cos(angle) * radius * 0.94, -0.34 - (index % 2) * 0.46, Math.sin(angle) * radius * 0.94);
      root.add(ledge);
    }
  }
  return root;
}

function createTerrainRelief(materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_TERRAIN_RELIEF';
  const shelfMaterial = materials.oceanStone.clone();
  shelfMaterial.color.setHex(0x398b94);
  shelfMaterial.emissive.setHex(0x0b4652);
  shelfMaterial.emissiveIntensity = 0.17;
  const anchors: Array<[number, number, number, number]> = [
    [-1.75, -1.2, 1.05, 0.15], [1.6, -1.35, 0.88, 1.1],
    [-1.55, 1.42, 0.92, 2.05], [1.65, 1.25, 1.02, 2.85],
    [-6.0, -1.75, 0.78, 0.8], [6.05, 1.65, 0.84, 2.2],
    [-1.7, 6.0, 0.72, 1.5], [1.8, -6.0, 0.76, 2.65],
  ];
  anchors.forEach(([x, z, scale, rotation], index) => {
    const shelf = new THREE.Mesh(new THREE.DodecahedronGeometry(scale, 0), shelfMaterial);
    shelf.scale.set(1.55, 0.055 + index % 2 * 0.018, 0.82 + index % 3 * 0.08);
    shelf.position.set(x, 0.31 + index % 2 * 0.008, z);
    shelf.rotation.y = rotation;
    root.add(shelf);
    if (index < 4) {
      const sandRim = new THREE.Mesh(new THREE.TorusGeometry(scale * 0.68, 0.035, 5, 12), materials.sand);
      sandRim.position.set(x, 0.37, z);
      sandRim.scale.set(1.5, 1, 0.78);
      sandRim.rotation.x = Math.PI / 2;
      sandRim.rotation.z = rotation;
      root.add(sandRim);
    }
    if (index < 4) {
      const garden = new THREE.Mesh(new THREE.IcosahedronGeometry(scale * 0.42, 0), index % 2 ? materials.kelp : materials.kelpLight);
      garden.scale.set(1.35, 0.08, 0.82);
      garden.position.set(x * 1.03, 0.39, z * 1.03);
      garden.rotation.y = rotation + 0.4;
      root.add(garden);
    }
  });
  return root;
}

function addArchitecturalReefGardens(root: THREE.Group, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const anchors: Array<[number, number, number, number]> = [
    [-2.35, -1.45, 0.68, 0.1], [2.35, -1.45, 0.72, 0.9],
    [-2.25, 1.52, 0.66, 1.7], [2.25, 1.52, 0.7, 2.5],
    [-4.75, -2.55, 0.78, 3.2], [4.75, -2.55, 0.74, 3.9],
    [-4.7, 2.6, 0.76, 4.6], [4.7, 2.6, 0.78, 5.3],
  ];
  anchors.forEach(([x, z, scale, seed], index) => {
    const fanX = x + (index % 2 ? -0.14 : 0.14);
    const fanZ = z - 0.08;
    if (!isIsland7RouteCorridorClear(x, z, scale * 0.22)
      || !isIsland7RouteCorridorClear(fanX, fanZ, scale * 0.34)) return;
    const coral = addCoralCluster(root, x, 0.31, z, scale, seed, materials, quality);
    coral.scale.y = 1.38;
    addSeaFan(root, fanX, 0.32, fanZ, scale * 0.82, seed + 0.4, materials, quality);
  });
}

function addCoralCluster(root: THREE.Group, x: number, y: number, z: number, scale: number, seed: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const group = new THREE.Group();
  group.name = 'ISLAND_7_CORAL_CLUSTER';
  group.position.set(x, y, z);
  group.rotation.y = seed * 0.73;
  const material = seed % 3 < 1 ? materials.coralPink : seed % 3 < 2 ? materials.coralViolet : materials.coralGold;
  const branchCount = quality === 'high' ? 5 : quality === 'medium' ? 4 : 3;
  for (let index = 0; index < branchCount; index += 1) {
    const angle = index / branchCount * Math.PI * 2 + seed;
    const height = scale * (0.42 + (index % 3) * 0.13);
    const radial = scale * (0.09 + (index % 2) * 0.035);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * radial * 0.25, 0, Math.sin(angle) * radial * 0.25),
      new THREE.Vector3(Math.cos(angle + 0.18) * radial, height * 0.35, Math.sin(angle + 0.18) * radial),
      new THREE.Vector3(Math.cos(angle - 0.16) * radial * 1.7, height * 0.72, Math.sin(angle - 0.16) * radial * 1.7),
      new THREE.Vector3(Math.cos(angle + 0.28) * radial * 2.25, height, Math.sin(angle + 0.28) * radial * 2.25),
    ]);
    const branch = new THREE.Mesh(new THREE.TubeGeometry(curve, 5, scale * (0.034 + index % 2 * 0.008), 4, false), material);
    const bud = new THREE.Mesh(new THREE.IcosahedronGeometry(scale * (0.058 + index % 2 * 0.012), 0), material);
    bud.position.copy(curve.getPoint(1));
    bud.scale.set(1.25, 0.86, 1.05);
    group.add(branch, bud);
  }
  root.add(group);
  return group;
}

function addSeaFan(root: THREE.Group, x: number, y: number, z: number, scale: number, seed: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const group = new THREE.Group();
  group.name = 'ISLAND_7_SEA_FAN';
  group.position.set(x, y, z);
  group.rotation.y = seed;
  const branches = quality === 'high' ? 9 : quality === 'medium' ? 6 : 4;
  for (let index = 0; index < branches; index += 1) {
    const t = (index / Math.max(1, branches - 1) - 0.5) * 0.8;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(t * scale * 0.35, scale * 0.28, 0),
      new THREE.Vector3(t * scale * 0.72, scale * (0.55 + Math.cos(t * 2) * 0.16), 0),
    ]);
    group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, scale * 0.012, 4, false), index % 2 ? materials.coralViolet : materials.coralPink));
  }
  root.add(group);
  return group;
}

function addKelpBlade(root: THREE.Group, x: number, y: number, z: number, height: number, seed: number, materials: Island7UnderwaterMaterials) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 0, 0),
    new THREE.Vector3(Math.sin(seed) * 0.08, height * 0.34, 0),
    new THREE.Vector3(Math.cos(seed * 1.8) * 0.14, height * 0.68, 0),
    new THREE.Vector3(Math.sin(seed * 2.2) * 0.18, height, 0),
  ]);
  const blade = new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.025, 5, false), seed % 2 ? materials.kelp : materials.kelpLight);
  blade.name = 'ISLAND_7_SWAY_KELP';
  blade.position.set(x, y, z);
  blade.rotation.y = seed;
  blade.userData.phase = seed;
  root.add(blade);
  return blade;
}

function createFish(
  scale: number,
  material: THREE.MeshStandardMaterial,
  eyeMaterial: THREE.MeshBasicMaterial,
  quality: Island3DQuality,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_FISH';
  const body = new THREE.Mesh(new THREE.SphereGeometry(scale, segmentCount(quality), Math.max(6, segmentCount(quality) / 2)), material);
  body.scale.set(1.6, 0.62, 0.78);
  root.add(body);
  const tailPivot = new THREE.Group();
  tailPivot.name = 'ISLAND_7_FISH_TAIL';
  tailPivot.position.x = -scale * 1.55;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.52, scale * 0.9, 3), material);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -scale * 0.35;
  tailPivot.add(tail);
  root.add(tailPivot);
  const fin = new THREE.Mesh(new THREE.ConeGeometry(scale * 0.28, scale * 0.5, 3), material);
  fin.position.y = scale * 0.46;
  root.add(fin);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(scale * 0.1, 7, 5), eyeMaterial);
  eye.position.set(scale * 1.3, scale * 0.12, scale * 0.52);
  root.add(eye);
  root.userData.tailPivot = tailPivot;
  return root;
}

function createHeroFish(material: THREE.MeshStandardMaterial, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_HERO_FISH';
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.24, segmentCount(quality), Math.max(6, segmentCount(quality) / 2)), material);
  body.scale.set(1.75, 0.66, 0.82);
  root.add(body);
  const tailPivot = new THREE.Group();
  tailPivot.position.x = -0.39;
  const tail = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.5, 3), material);
  tail.rotation.z = -Math.PI / 2;
  tail.position.x = -0.18;
  tailPivot.add(tail);
  root.add(tailPivot);
  root.userData.tailPivot = tailPivot;
  root.userData.baseY = 2.15;
  return root;
}

function createFishSchools(quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_FISH_SCHOOLS';
  const schools: THREE.Group[] = [];
  const perSchool = quality === 'high' ? 14 : quality === 'medium' ? 9 : 5;
  const palettes = [0x6de5ed, 0xf3b668, 0x9e8cff];
  const eyeMaterial = new THREE.MeshBasicMaterial({ color: 0x07131b });
  const schoolMaterials = palettes.map((color) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.36,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: 0.08,
  }));
  for (let schoolIndex = 0; schoolIndex < 3; schoolIndex += 1) {
    const school = new THREE.Group();
    school.name = `ISLAND_7_FISH_SCHOOL_${schoolIndex + 1}`;
    const radius = 7.5 + schoolIndex * 3.8;
    school.userData.radius = radius;
    school.userData.speed = 0.065 + schoolIndex * 0.017;
    school.userData.phase = schoolIndex * 2.2;
    for (let index = 0; index < perSchool; index += 1) {
      const swimmer = createFish(
        0.08 + schoolIndex * 0.025 + index % 3 * 0.009,
        schoolMaterials[schoolIndex],
        eyeMaterial,
        quality,
      );
      swimmer.position.set((index % 5) * 0.35, Math.floor(index / 5) * 0.22 + Math.sin(index) * 0.08, (index % 3) * 0.22);
      swimmer.userData.phase = index * 0.7 + schoolIndex;
      school.add(swimmer);
    }
    // The school moves as one shoal at gameplay scale. Batch its bodies, fins,
    // tails and eyes by material to keep the population rich at one draw-call
    // budget instead of paying four calls per tiny fish.
    compactStaticGeometry(school, `ISLAND7_FISH_SCHOOL_${schoolIndex + 1}`);
    root.add(school);
    schools.push(school);
  }
  return { root, schools };
}

function createJellyfish(scale: number, materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_JELLYFISH';
  const bell = new THREE.Mesh(new THREE.SphereGeometry(scale, segmentCount(quality), 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.violetCrystal.clone());
  bell.scale.y = 0.65;
  root.add(bell);
  const tentacleRoot = new THREE.Group();
  tentacleRoot.name = 'ISLAND_7_JELLYFISH_TENTACLES';
  const tentacles = quality === 'high' ? 6 : quality === 'medium' ? 4 : 3;
  for (let index = 0; index < tentacles; index += 1) {
    const angle = index / tentacles * Math.PI * 2;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(Math.cos(angle) * scale * 0.42, -scale * 0.12, Math.sin(angle) * scale * 0.42),
      new THREE.Vector3(Math.cos(angle + 0.4) * scale * 0.5, -scale * 0.85, Math.sin(angle + 0.4) * scale * 0.5),
      new THREE.Vector3(Math.cos(angle - 0.3) * scale * 0.3, -scale * 1.65, Math.sin(angle - 0.3) * scale * 0.3),
    ]);
    tentacleRoot.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 6, scale * 0.025, 4, false), materials.portal));
  }
  compactStaticGeometry(tentacleRoot, 'ISLAND7_JELLY_TENTACLES');
  root.add(tentacleRoot);
  root.userData.bell = bell;
  return root;
}

function createSubmarine(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_FANTASY_SUBMARINE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-007-underwater', role: 'ambient-submarine' };
  const staticShell = new THREE.Group();
  staticShell.name = 'ISLAND_7_SUBMARINE_STATIC_SHELL';
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.34, 1.4, 6, segmentCount(quality)), materials.gold);
  hull.rotation.z = Math.PI / 2;
  staticShell.add(hull);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.3, segmentCount(quality), 8, 0, Math.PI * 2, 0, Math.PI / 2), materials.crystal);
  dome.position.set(0.12, 0.28, 0);
  staticShell.add(dome);
  for (let index = -2; index <= 2; index += 1) {
    const porthole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.03, 10), materials.crystal);
    porthole.rotation.x = Math.PI / 2;
    porthole.position.set(index * 0.28, 0.02, 0.31);
    staticShell.add(porthole);
  }
  compactStaticGeometry(staticShell, 'ISLAND7_SUBMARINE_SHELL');
  root.add(staticShell);
  const propeller = new THREE.Group();
  propeller.name = 'ISLAND_7_SUBMARINE_PROPELLER';
  propeller.position.x = -1.03;
  for (let index = 0; index < 4; index += 1) {
    const blade = box(0.05, 0.42, 0.1, materials.gold);
    blade.rotation.x = index / 4 * Math.PI * 2;
    propeller.add(blade);
  }
  root.add(propeller);
  if (quality === 'high') {
    const light = new THREE.SpotLight(0x9fffff, 4.2, 11, Math.PI / 9, 0.65, 1.5);
    light.position.set(1, 0, 0);
    light.target.position.set(7, -1, 0);
    root.add(light, light.target);
  }
  root.userData.propeller = propeller;
  return root;
}

function createManta(materials: Island7UnderwaterMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_MANTA';
  const shape = new THREE.Shape();
  shape.moveTo(0.9, 0);
  shape.bezierCurveTo(0.35, 0.2, 0.18, 0.58, 0, 0.3);
  shape.bezierCurveTo(-0.18, 0.58, -0.35, 0.2, -0.9, 0);
  shape.bezierCurveTo(-0.38, -0.12, -0.18, -0.26, 0, -0.18);
  shape.bezierCurveTo(0.18, -0.26, 0.38, -0.12, 0.9, 0);
  const body = new THREE.Mesh(new THREE.ShapeGeometry(shape, 8), materials.deepStone);
  body.rotation.x = -Math.PI / 2;
  root.add(body);
  const tailCurve = new THREE.CatmullRomCurve3([new THREE.Vector3(0, 0, 0.18), new THREE.Vector3(0, 0, 0.8), new THREE.Vector3(0.1, 0, 1.5)]);
  root.add(new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 8, 0.025, 5, false), materials.deepStone));
  return root;
}

function createWhaleSilhouette(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_WHALE_SILHOUETTE';
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1, quality === 'high' ? 14 : 10, quality === 'low' ? 6 : 8),
    materials.deepStone,
  );
  body.scale.set(2.35, 0.68, 0.72);
  root.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.72, 10, 7), materials.deepStone);
  head.scale.set(1.18, 0.78, 0.92);
  head.position.x = 1.9;
  root.add(head);
  const tailStock = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.75, 7), materials.deepStone);
  tailStock.rotation.z = Math.PI / 2;
  tailStock.position.x = -2.28;
  root.add(tailStock);
  const flukeShape = new THREE.Shape();
  flukeShape.moveTo(0, 0);
  flukeShape.bezierCurveTo(-0.25, 0.2, -0.8, 0.42, -1.34, 0.26);
  flukeShape.bezierCurveTo(-0.8, -0.02, -0.32, -0.16, 0, 0);
  flukeShape.bezierCurveTo(0.32, -0.16, 0.8, -0.02, 1.34, 0.26);
  flukeShape.bezierCurveTo(0.8, 0.42, 0.25, 0.2, 0, 0);
  const flukes = new THREE.Mesh(new THREE.ShapeGeometry(flukeShape, 5), materials.deepStone);
  flukes.rotation.x = -Math.PI / 2;
  flukes.rotation.z = Math.PI / 2;
  flukes.position.x = -3.1;
  root.add(flukes);
  [-1, 1].forEach((side) => {
    const fin = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.2, 3), materials.deepStone);
    fin.rotation.set(side * 0.12, 0, side * (Math.PI / 2 + 0.18));
    fin.position.set(0.3, -0.24, side * 0.72);
    root.add(fin);
  });
  compactStaticGeometry(root, 'ISLAND7_WHALE');
  return root;
}

function createLightShaft(materials: Island7UnderwaterMaterials, quality: Island3DQuality, index: number) {
  const geometry = new THREE.ConeGeometry(0.42 + index % 3 * 0.16, 12 + index % 4, quality === 'high' ? 12 : 7, 1, true);
  geometry.translate(0, -geometry.parameters.height / 2, 0);
  const material = materials.caustic.clone();
  material.opacity = quality === 'high' ? 0.032 : quality === 'medium' ? 0.024 : 0.016;
  const shaft = new THREE.Mesh(geometry, material);
  shaft.name = 'ISLAND_7_SURFACE_LIGHT_SHAFT';
  shaft.rotation.z = 0.09 + index % 2 * 0.04;
  shaft.userData.phase = index * 0.73;
  shaft.userData.baseOpacity = material.opacity;
  return shaft;
}

function createCausticRings(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_CAUSTIC_FIELD';
  const count = quality === 'high' ? 30 : quality === 'medium' ? 19 : 10;
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399963;
    const radius = 0.7 + (index % 9) * 0.72;
    const width = 0.24 + index % 5 * 0.075;
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-width, 0, -width * 0.2),
      new THREE.Vector3(-width * 0.42, 0, width * (0.45 + index % 2 * 0.18)),
      new THREE.Vector3(width * 0.25, 0, width * 0.34),
      new THREE.Vector3(width, 0, -width * (0.12 + index % 3 * 0.07)),
    ]);
    const shimmer = new THREE.Mesh(new THREE.TubeGeometry(curve, 5, 0.009, 3, false), materials.caustic);
    shimmer.position.set(Math.cos(angle) * radius, 0.325, Math.sin(angle) * radius);
    shimmer.rotation.y = angle + index * 0.31;
    shimmer.userData.phase = index * 0.41;
    root.add(shimmer);
  }
  compactStaticGeometry(root, 'ISLAND7_CAUSTIC_FIELD');
  return root;
}

function createBubbleField(materials: Island7UnderwaterMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_7_BUBBLE_FIELD';
  const count = quality === 'high' ? 96 : quality === 'medium' ? 58 : 28;
  const geometry = new THREE.SphereGeometry(1, 6, 5);
  const bubbles = new THREE.InstancedMesh(geometry, materials.bubble, count);
  bubbles.name = 'ISLAND_7_BUBBLE_INSTANCES';
  bubbles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const positions: THREE.Vector3[] = [];
  const speeds: number[] = [];
  const phases: number[] = [];
  const scales: number[] = [];
  const matrix = new THREE.Matrix4();
  const ventAnchors = [
    new THREE.Vector2(-5.8, -4.5), new THREE.Vector2(5.8, -4.4),
    new THREE.Vector2(-5.8, 4.5), new THREE.Vector2(5.8, 4.5),
    new THREE.Vector2(-6.8, 0.7), new THREE.Vector2(6.8, -0.6),
  ];
  for (let index = 0; index < count; index += 1) {
    const anchor = ventAnchors[index % ventAnchors.length];
    const angle = index * 2.399963;
    const spread = 0.08 + (index % 5) * 0.035;
    const position = new THREE.Vector3(
      anchor.x + Math.cos(angle) * spread,
      -0.2 + (index % 13) * 0.52,
      anchor.y + Math.sin(angle) * spread,
    );
    const scale = 0.025 + index % 4 * 0.012;
    positions.push(position);
    speeds.push(0.2 + index % 7 * 0.055);
    phases.push(index * 0.37);
    scales.push(scale);
    matrix.compose(position, new THREE.Quaternion(), new THREE.Vector3(scale, scale, scale));
    bubbles.setMatrixAt(index, matrix);
  }
  root.add(bubbles);
  return { root, bubbles, positions, speeds, phases, scales };
}

export function createIsland7UnderwaterLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island7UnderwaterMaterials,
  ocean: THREE.Mesh,
): Island7UnderwaterAmbienceRuntime {
  const quality = profile.id;
  const root = new THREE.Group();
  root.name = 'ISLAND_7_UNDERWATER_LIVING_AMBIENCE';
  root.userData.sculptRuntime = { clickable: true, explodable: true, world: 'island-007-underwater' };
  ocean.visible = false;

  const staticScenery = new THREE.Group();
  staticScenery.name = 'ISLAND_7_STATIC_SCENERY';
  staticScenery.add(createSeabedShelf(6.55, 2.7, materials, quality));
  staticScenery.add(createTerrainRelief(materials));
  root.add(staticScenery);
  const animatedKelp = new THREE.Group();
  animatedKelp.name = 'ISLAND_7_ANIMATED_KELP_GARDEN';
  root.add(animatedKelp);

  const lobePositions: Array<[number, number, number]> = [[-4.55, -4.05, 2.15], [4.55, -4.05, 2.05], [-4.55, 4.05, 2.2], [4.55, 4.05, 2.1]];
  lobePositions.forEach(([x, z, radius], index) => {
    const lobe = createSeabedShelf(radius, 1.55 + index % 2 * 0.3, materials, quality);
    lobe.position.set(x, -0.06, z);
    lobe.scale.z = 0.88 + index % 3 * 0.05;
    staticScenery.add(lobe);
  });
  addArchitecturalReefGardens(staticScenery, materials, quality);

  const heroReefAnchors: Array<[number, number, number, number]> = [
    [-6.2, -4.8, 1.75, 0.2], [-4.9, -6.0, 1.55, 0.7], [6.15, -4.7, 1.8, 1.1], [4.8, -6.05, 1.55, 1.6],
    [-6.15, 4.7, 1.8, 2.1], [-4.75, 6.05, 1.55, 2.6], [6.2, 4.8, 1.75, 3.1], [4.9, 6.0, 1.55, 3.6],
    [-7.2, 0.8, 1.45, 4.1], [7.2, -0.7, 1.5, 4.6], [-1.0, -7.0, 1.4, 5.1], [1.1, 7.0, 1.45, 5.6],
  ];
  heroReefAnchors.forEach(([x, z, scale, seed], index) => {
    const cluster = addCoralCluster(staticScenery, x, 0.26, z, scale, seed, materials, quality);
    cluster.scale.set(1.15, 1.55, 1.15);
    const fan = addSeaFan(staticScenery, x * 0.985, 0.3, z * 0.985, scale * 1.2, seed + 0.5, materials, quality);
    fan.scale.set(1.2, 1.45, 1.2);
    if (index % 2 === 0) {
      const vent = cylinder(0.12, 0.2, 0.3, materials.oceanStone, 8);
      vent.position.set(x * 0.94, 0.43, z * 0.94);
      staticScenery.add(vent);
    }
  });

  const reefCount = Math.round(52 * detailScale(quality));
  const coralGroups: THREE.Group[] = [];
  for (let index = 0; index < reefCount; index += 1) {
    const angle = index / reefCount * Math.PI * 2 + 0.14;
    const radius = index % 3 === 0 ? 6.1 + index % 4 * 0.14 : 2.38 + index % 5 * 0.12;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.94;
    const scale = 0.6 + index % 5 * 0.1;
    if (!isIsland7RouteCorridorClear(x, z, scale * 0.28)) continue;
    coralGroups.push(addCoralCluster(staticScenery, x, 0.28, z, scale, index + 0.4, materials, quality));
    if (index % 2 === 0) coralGroups.push(addSeaFan(staticScenery, x * 0.96, 0.3, z * 0.96, scale * 0.72, angle, materials, quality));
  }

  const kelpCount = Math.round(36 * detailScale(quality));
  for (let index = 0; index < kelpCount; index += 1) {
    const angle = index / kelpCount * Math.PI * 2 + 0.3;
    const radius = 5.75 + index % 4 * 0.23;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    if (!isIsland7RouteCorridorClear(x, z, 0.16)) continue;
    addKelpBlade(animatedKelp, x, 0.28, z, 0.65 + index % 4 * 0.18, index * 0.61, materials);
  }
  // Individual kelp tubes are authored with their world transforms baked in,
  // then consolidated by their two materials. A subtle whole-garden breath
  // below keeps the mass alive while avoiding dozens of tiny draw calls.
  compactStaticGeometry(animatedKelp, 'ISLAND7_KELP_GARDEN');

  // The optimized environment texture supplies distant cavern depth; nearby
  // coral clusters remain procedural so the foreground responds to camera and
  // light without adding opaque spike silhouettes behind the palace.

  const ruinCount = quality === 'high' ? 15 : quality === 'medium' ? 9 : 5;
  for (let index = 0; index < ruinCount; index += 1) {
    const angle = index / ruinCount * Math.PI * 2 + 0.6;
    const radius = index % 2 ? 2.28 : 6.15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 0.92;
    if (!isIsland7RouteCorridorClear(x, z, 0.16)) continue;
    const fragment = index % 3 === 0
      ? cylinder(0.08, 0.11, 0.32 + index % 4 * 0.09, materials.oceanStone, 8)
      : box(0.18 + index % 3 * 0.06, 0.12, 0.24, materials.oceanStone);
    fragment.position.set(x, 0.42, z);
    fragment.rotation.set(index * 0.07, angle, index % 2 ? 0.18 : -0.12);
    staticScenery.add(fragment);
  }

  const caustics = createCausticRings(materials, quality);
  root.add(caustics);
  const lightShafts: THREE.Mesh[] = [];
  // Four broad shafts produce the same readable volume as seven overlapping
  // cones at the phone camera, with substantially less transparent overdraw.
  const shaftCount = quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;
  for (let index = 0; index < shaftCount; index += 1) {
    const shaft = createLightShaft(materials, quality, index);
    const angle = index / shaftCount * Math.PI * 2 + 0.2;
    const radius = 2.5 + index % 3 * 3.1;
    shaft.position.set(Math.cos(angle) * radius, 11.5, Math.sin(angle) * radius - 1);
    shaft.userData.baseX = shaft.position.x;
    root.add(shaft);
    lightShafts.push(shaft);
  }

  const { root: bubbleRoot, bubbles, positions: bubblePositions, speeds: bubbleSpeeds, phases: bubblePhases, scales: bubbleScales } = createBubbleField(materials, quality);
  root.add(bubbleRoot);
  const fishSchools = createFishSchools(quality);
  root.add(fishSchools.root);

  const foregroundFish = new THREE.Group();
  foregroundFish.name = 'ISLAND_7_FOREGROUND_FISH';
  const foregroundCount = quality === 'high' ? 8 : quality === 'medium' ? 5 : 3;
  const foregroundEye = new THREE.MeshBasicMaterial({ color: 0x07131b });
  const foregroundMaterials = [0x71e4ef, 0xf4b45c].map((color) => new THREE.MeshStandardMaterial({
    color,
    roughness: 0.36,
    metalness: 0.08,
    emissive: color,
    emissiveIntensity: 0.08,
  }));
  for (let index = 0; index < foregroundCount; index += 1) {
    const swimmer = createFish(0.13 + index % 3 * 0.018, foregroundMaterials[index % 2], foregroundEye, quality);
    swimmer.position.set(-3.3 + index * 0.86, 1.05 + index % 3 * 0.28, 5.65 + index % 2 * 0.42);
    foregroundFish.add(swimmer);
  }
  compactStaticGeometry(foregroundFish, 'ISLAND7_FOREGROUND_FISH');
  foregroundFish.userData.baseX = foregroundFish.position.x;
  foregroundFish.userData.baseY = foregroundFish.position.y;
  root.add(foregroundFish);

  const heroFishMaterial = new THREE.MeshStandardMaterial({
    color: 0xffc25f,
    roughness: 0.34,
    metalness: 0.08,
    emissive: 0x7d3109,
    emissiveIntensity: 0.22,
  });
  const heroFish = createHeroFish(heroFishMaterial, quality);
  heroFish.position.set(-8.5, 2.15, 6.2);
  root.add(heroFish);

  const jellyfish: THREE.Group[] = [];
  // Two hero jellies are deliberately staged in opposing depth lanes. More
  // individual stacks were visually redundant in overview and pushed orbit
  // choreography over the 175-call contract.
  const jellyCount = quality === 'high' ? 2 : quality === 'medium' ? 2 : 1;
  for (let index = 0; index < jellyCount; index += 1) {
    const jelly = createJellyfish(0.18 + index % 3 * 0.045, materials, quality);
    const angle = index / jellyCount * Math.PI * 2 + 0.7;
    const radius = 7.8 + index % 3 * 2.6;
    jelly.position.set(Math.cos(angle) * radius, 1.2 + index % 5 * 1.25, Math.sin(angle) * radius);
    jelly.userData.baseY = jelly.position.y;
    jelly.userData.phase = index * 0.83;
    root.add(jelly);
    jellyfish.push(jelly);
  }

  const mantaOrbit = new THREE.Group();
  mantaOrbit.name = 'ISLAND_7_MANTA_ORBIT';
  const manta = createManta(materials);
  manta.scale.setScalar(1.45);
  manta.position.set(0, 6.3, -12.5);
  mantaOrbit.add(manta);
  root.add(mantaOrbit);

  const whale = createWhaleSilhouette(materials, quality);
  whale.scale.setScalar(1.05);
  whale.position.set(-15, 6.9, -28);
  whale.rotation.y = 0.5;
  root.add(whale);

  const submarineOrbit = new THREE.Group();
  submarineOrbit.name = 'ISLAND_7_SUBMARINE_ORBIT';
  const submarine = createSubmarine(materials, quality);
  submarine.position.set(-10.5, -0.9, 5.5);
  submarine.scale.setScalar(0.9);
  submarineOrbit.add(submarine);
  root.add(submarineOrbit);

  const surface = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 44, quality === 'high' ? 18 : quality === 'medium' ? 12 : 8, quality === 'high' ? 18 : quality === 'medium' ? 12 : 8),
    new THREE.MeshBasicMaterial({ color: 0x8ef8ff, transparent: true, opacity: 0.2, side: THREE.DoubleSide, depthWrite: false, forceSinglePass: true }),
  );
  surface.name = 'ISLAND_7_WATER_SURFACE_CEILING';
  surface.rotation.x = Math.PI / 2;
  surface.position.y = 11.8;
  root.add(surface);
  const surfacePositions = surface.geometry.attributes.position as THREE.BufferAttribute;
  const surfaceBasePositions = new Float32Array(surfacePositions.array as ArrayLike<number>);

  const localMotesCount = quality === 'high' ? 260 : quality === 'medium' ? 150 : 72;
  const positions = new Float32Array(localMotesCount * 3);
  for (let index = 0; index < localMotesCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.5 + (index % 47) / 47 * 18;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = -2 + (index % 37) / 37 * 14;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const motes = new THREE.Points(moteGeometry, new THREE.PointsMaterial({ color: 0xb9ffff, size: quality === 'low' ? 0.09 : 0.055, transparent: true, opacity: 0.42, depthWrite: false, blending: THREE.AdditiveBlending }));
  motes.name = 'ISLAND_7_WATER_MOTES';
  root.add(motes);

  compactStaticGeometry(staticScenery, 'ISLAND7_UNDERWATER_SCENERY');
  scene.add(root);
  // Transparent/moving ambience should not participate in shadow maps. The
  // landmarks remain shadow-casting; this keeps the living-water layer cheap.
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.castShadow = false;
    child.receiveShadow = child.parent === staticScenery;
  });

  let cached = false;
  const wheels: THREE.Object3D[] = [];
  const compasses: THREE.Object3D[] = [];
  const portals: THREE.Mesh[] = [];
  const portalVortexRings: THREE.Object3D[] = [];
  const portalInnerVortices: THREE.Object3D[] = [];
  const palacePearls: THREE.Object3D[] = [];
  const armillaries: THREE.Object3D[] = [];
  const cacheAnimated = () => {
    if (cached) return;
    cached = true;
    scene.traverse((object) => {
      if (object.name === 'ISLAND_7_BUBBLE_WHEEL') wheels.push(object);
      if (object.name === 'ISLAND_7_COMPASS_ROSE') compasses.push(object);
      if (object.name === 'ISLAND_7_PORTAL_SURFACE' && object instanceof THREE.Mesh) portals.push(object);
      if (object.name === 'ISLAND_7_PORTAL_VORTEX_RING') portalVortexRings.push(object);
      if (object.name === 'ISLAND_7_PORTAL_INNER_VORTEX') portalInnerVortices.push(object);
      if (object.name === 'ISLAND_7_PALACE_PEARL_CORE') palacePearls.push(object);
      if (object.name === 'ISLAND_7_ARCHIVE_ARMILLARY') armillaries.push(object);
    });
  };
  const bubbleMatrix = new THREE.Matrix4();
  const bubbleQuaternion = new THREE.Quaternion();
  const bubblePosition = new THREE.Vector3();
  const bubbleScale = new THREE.Vector3();
  let lastSurfaceUpdate = Number.NEGATIVE_INFINITY;
  const surfaceUpdateInterval = quality === 'high' ? 1 / 24 : quality === 'medium' ? 1 / 18 : Number.POSITIVE_INFINITY;

  return {
    root,
    animate: (elapsed) => {
      cacheAnimated();
      motes.rotation.y = elapsed * 0.008;
      caustics.rotation.y = elapsed * 0.018;
      caustics.scale.setScalar(0.94 + Math.sin(elapsed * 0.55) * 0.06);
      lightShafts.forEach((shaft, index) => {
        shaft.position.x = Number(shaft.userData.baseX) + Math.sin(elapsed * 0.12 + index) * 0.12;
        const material = shaft.material as THREE.MeshBasicMaterial;
        material.opacity = Number(shaft.userData.baseOpacity) * (0.76 + Math.sin(elapsed * 0.31 + Number(shaft.userData.phase)) * 0.24);
      });
      for (let index = 0; index < bubblePositions.length; index += 1) {
        const base = bubblePositions[index];
        const phase = bubblePhases[index];
        const rise = (elapsed * bubbleSpeeds[index] + phase) % 8.5;
        const scale = bubbleScales[index];
        bubblePosition.set(base.x + Math.sin(elapsed * 0.7 + phase) * 0.06, base.y + rise, base.z);
        bubbleScale.setScalar(scale);
        bubbleMatrix.compose(bubblePosition, bubbleQuaternion, bubbleScale);
        bubbles.setMatrixAt(index, bubbleMatrix);
      }
      bubbles.instanceMatrix.needsUpdate = true;
      fishSchools.schools.forEach((school, index) => {
        const angle = elapsed * Number(school.userData.speed) + Number(school.userData.phase);
        const radius = Number(school.userData.radius);
        school.position.set(Math.cos(angle) * radius, 2.2 + index * 1.5 + Math.sin(elapsed * 0.17 + index) * 0.5, Math.sin(angle) * radius);
        school.rotation.y = -angle + Math.PI / 2;
      });
      foregroundFish.position.x = Number(foregroundFish.userData.baseX) + Math.sin(elapsed * 0.38) * 0.55;
      foregroundFish.position.y = Number(foregroundFish.userData.baseY) + Math.sin(elapsed * 0.72) * 0.07;
      foregroundFish.rotation.y = Math.sin(elapsed * 0.24) * 0.06;
      heroFish.position.x = -8.5 + ((elapsed * 0.82) % 17);
      heroFish.position.y = Number(heroFish.userData.baseY) + Math.sin(elapsed * 0.9) * 0.22;
      heroFish.rotation.y = Math.sin(elapsed * 0.18) * 0.08;
      const heroTail = heroFish.userData.tailPivot as THREE.Object3D | undefined;
      if (heroTail) heroTail.rotation.y = Math.sin(elapsed * 7.2) * 0.42;
      jellyfish.forEach((jelly, index) => {
        const phase = Number(jelly.userData.phase);
        jelly.position.y = Number(jelly.userData.baseY) + Math.sin(elapsed * 0.32 + phase) * 0.38;
        jelly.rotation.y = elapsed * (index % 2 ? 0.08 : -0.06) + phase;
        const pulse = 0.88 + Math.sin(elapsed * 1.05 + phase) * 0.12;
        const bell = jelly.userData.bell as THREE.Object3D | undefined;
        if (bell) bell.scale.set(1 + (1 - pulse) * 0.35, pulse * 0.65, 1 + (1 - pulse) * 0.35);
      });
      mantaOrbit.rotation.y = elapsed * 0.035;
      manta.rotation.z = Math.sin(elapsed * 0.48) * 0.1;
      whale.position.x = -15 + ((elapsed * 0.24) % 34);
    // Keep the whale below the phone notch/header lane so the slow silhouette
    // is actually visible during gameplay rather than living behind chrome.
    whale.position.y = 6.9 + Math.sin(elapsed * 0.09) * 0.4;
      submarineOrbit.rotation.y = -elapsed * 0.024;
      submarine.position.y = -0.9 + Math.sin(elapsed * 0.22) * 0.26;
      const propeller = submarine.userData.propeller as THREE.Object3D | undefined;
      if (propeller) propeller.rotation.x = elapsed * 4.6;
      if (quality !== 'low' && elapsed - lastSurfaceUpdate >= surfaceUpdateInterval) {
        lastSurfaceUpdate = elapsed;
        for (let index = 0; index < surfacePositions.count; index += 1) {
          const offset = index * 3;
          const x = surfaceBasePositions[offset];
          const y = surfaceBasePositions[offset + 1];
          surfacePositions.setZ(index, Math.sin(x * 0.48 + elapsed * 0.42) * 0.08 + Math.cos(y * 0.36 - elapsed * 0.31) * 0.055);
        }
        surfacePositions.needsUpdate = true;
      }
      animatedKelp.rotation.z = Math.sin(elapsed * 0.36) * 0.006;
      animatedKelp.scale.y = 1 + Math.sin(elapsed * 0.48) * 0.018;
      coralGroups.forEach((coral, index) => { coral.rotation.z = Math.sin(elapsed * 0.22 + index) * 0.008; });
      wheels.forEach((wheel) => { wheel.rotation.z = elapsed * 0.22; });
      compasses.forEach((compass) => { compass.rotation.y = elapsed * 0.18; });
      armillaries.forEach((armillary) => { armillary.rotation.y = elapsed * 0.14; });
      portals.forEach((portal, index) => {
        const material = portal.material as THREE.MeshBasicMaterial;
        material.opacity = Number(portal.userData.baseOpacity ?? 0.64) * (0.82 + Math.sin(elapsed * 1.2 + index) * 0.18);
      });
      portalVortexRings.forEach((ring) => {
        ring.rotation.z = 0.45 + elapsed * 0.14;
      });
      portalInnerVortices.forEach((ring) => {
        ring.rotation.z = -0.82 - elapsed * 0.22;
      });
      palacePearls.forEach((pearl, index) => {
        const pulse = 1 + Math.sin(elapsed * 0.82 + index) * 0.05;
        pearl.scale.setScalar(pulse);
        const material = (pearl as THREE.Mesh).material;
        if (material instanceof THREE.MeshPhysicalMaterial) material.emissiveIntensity = 0.3 + Math.sin(elapsed * 0.82 + index) * 0.1;
      });
    },
    updateView: (cameraPosition) => {
      whale.visible = cameraPosition.distanceTo(whale.position) < 85;
    },
  };
}
