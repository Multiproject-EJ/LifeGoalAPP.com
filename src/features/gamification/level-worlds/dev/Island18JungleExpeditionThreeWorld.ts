import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import { ISLAND_5_LANDMARKS } from './island5ThreePilotContract';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

type BuildLevel = 0 | 1 | 2 | 3;
type ConstructionStage = 1 | 2 | 3 | 4 | 5;

export const ISLAND_18_JUNGLE_EXPEDITION_WORLD_NAME = 'Jungle Expedition';
export const ISLAND_18_LIVING_COMPASS_MISSION_ID = 'jungle-expedition-living-compass';
export const ISLAND_18_LIVING_COMPASS_MAX_STAGE = 5;
export const ISLAND_18_WEATHER_CYCLE_SECONDS = 180;
export const ISLAND_18_STORM_FLASH_COUNT_WEIGHTS = [0.46, 0.33, 0.12, 0.06, 0.03] as const;

const ISLAND_18_STORM_FLASH_CENTERS = [
  [113.2],
  [111.2, 118.4],
  [108.9, 114.8, 121.2],
  [107.8, 111.7, 116.5, 121.8],
  [106.7, 109.9, 113.4, 117.5, 121.9],
] as const;

const fractionalPart = (value: number) => value - Math.floor(value);

export function getIsland18StormFlashPlan(cycleIndex: number) {
  const normalizedCycleIndex = Math.max(0, Math.floor(cycleIndex));
  const countRoll = fractionalPart(0.61 + normalizedCycleIndex * 0.754877666);
  let cumulativeWeight = 0;
  let flashCount = 1;
  for (let index = 0; index < ISLAND_18_STORM_FLASH_COUNT_WEIGHTS.length; index += 1) {
    cumulativeWeight += ISLAND_18_STORM_FLASH_COUNT_WEIGHTS[index];
    if (countRoll < cumulativeWeight) {
      flashCount = index + 1;
      break;
    }
  }
  const cycleJitter = normalizedCycleIndex === 0
    ? 0
    : (fractionalPart(0.37 + normalizedCycleIndex * 0.618033989) - 0.5) * 0.64;
  const centers = ISLAND_18_STORM_FLASH_CENTERS[flashCount - 1].map((center, index) => (
    center
    + cycleJitter
    + (normalizedCycleIndex === 0
      ? 0
      : (fractionalPart(normalizedCycleIndex * 0.414213562 + index * 0.271828183) - 0.5) * 0.22)
  ));
  return { cycleIndex: normalizedCycleIndex, flashCount, centers };
}

export const ISLAND_18_JUNGLE_EXPEDITION_LANDMARK_LABELS = {
  boss: 'Lost City Temple',
  hatchery: 'Explorer Nest',
  habit: 'Jungle Path',
  wisdom: "Explorer's Camp",
  event: 'Survival Trials',
} as const;

export interface Island18JungleExpeditionMaterials {
  ruinStone: THREE.MeshStandardMaterial;
  ruinStoneLight: THREE.MeshStandardMaterial;
  ruinStoneDark: THREE.MeshStandardMaterial;
  ruinStoneWet: THREE.MeshStandardMaterial;
  moss: THREE.MeshStandardMaterial;
  leaf: THREE.MeshStandardMaterial;
  leafLight: THREE.MeshStandardMaterial;
  leafDeep: THREE.MeshStandardMaterial;
  vine: THREE.MeshStandardMaterial;
  rope: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  brassDark: THREE.MeshStandardMaterial;
  routeIvory: THREE.MeshStandardMaterial;
  routeViolet: THREE.MeshStandardMaterial;
  routeAzure: THREE.MeshStandardMaterial;
  emerald: THREE.MeshPhysicalMaterial;
  amber: THREE.MeshStandardMaterial;
  water: THREE.MeshPhysicalMaterial;
  waterfall: THREE.MeshPhysicalMaterial;
  foam: THREE.MeshStandardMaterial;
  flower: THREE.MeshStandardMaterial;
  basinGround: THREE.MeshStandardMaterial;
  canopyVolume: THREE.ShaderMaterial;
  mist: THREE.MeshBasicMaterial;
  cloud: THREE.MeshBasicMaterial;
}

export interface Island18LivingCompassPresentation {
  activatedStages: number;
  constructionSequence?: number;
  completed?: boolean;
}

export interface Island18JungleExpeditionAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number, reducedMotion?: boolean) => void;
  setLivingCompassStage: (presentation: Island18LivingCompassPresentation, replay?: boolean) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
}

export const ISLAND_18_RUNTIME_PART_IDS = [
  'floating-cliff-and-temple-terraces',
  'board-route-corridor',
  'lost-city-temple-shell',
  'temple-stair-and-door-network',
  'guardian-mask-crown',
  'living-compass-mechanism',
  'explorer-nest',
  'jungle-path',
  'survival-trials',
  'explorers-camp',
  'rope-skybridges',
  'waterfall-and-pool-system',
  'jungle-canopy-and-vines',
  'stone-relief-and-moss',
  'brass-emerald-amber-accents',
  'depth-islands-and-horizon',
  'sky-cloud-and-sun-system',
  'living-ambience',
  'construction-choreography',
  'emerald-zenith-fx',
] as const;

export type Island18RuntimePartId = typeof ISLAND_18_RUNTIME_PART_IDS[number];

export function registerIsland18RuntimePart<T extends THREE.Object3D>(
  id: Island18RuntimePartId,
  object: T,
  role = 'environment',
): T {
  object.userData.island18RuntimePartId = id;
  object.userData.island18RuntimeRole = role;
  object.userData.clickable = true;
  object.userData.explodable = true;
  return object;
}

export function collectIsland18RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Array<{ name: string; role: string; objectName: string }> = [];
  roots.forEach((root) => root.traverse((object) => {
    const id = object.userData.island18RuntimePartId;
    if (typeof id !== 'string') return;
    parts.push({
      name: id,
      role: String(object.userData.island18RuntimeRole ?? 'environment'),
      objectName: object.name,
    });
  }));
  return { parts };
}

function compactIsland18LandmarkGeometry(root: THREE.Group, batchName: string) {
  root.updateMatrixWorld(true);
  const inverseRoot = root.matrixWorld.clone().invert();
  const structuralGeometries: THREE.BufferGeometry[] = [];
  const organicGeometries: THREE.BufferGeometry[] = [];
  const emissiveAccentGeometries: THREE.BufferGeometry[] = [];
  const accentBatches = new Map<string, { material: THREE.Material; geometries: THREE.BufferGeometry[] }>();
  const sourceMeshes: THREE.Mesh[] = [];
  let structuralMap: THREE.Texture | null = null;
  let structuralRoughnessMap: THREE.Texture | null = null;
  let structuralBumpMap: THREE.Texture | null = null;
  let structuralEmissiveMap: THREE.Texture | null = null;
  let structuralEmissiveIntensity = 0;

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const material = Array.isArray(child.material) ? child.material[0] : child.material;
    const cloned = child.geometry.clone();
    const geometry = cloned.index ? cloned.toNonIndexed() : cloned;
    if (geometry !== cloned) cloned.dispose();
    geometry.applyMatrix4(inverseRoot.clone().multiply(child.matrixWorld));
    for (const attributeName of Object.keys(geometry.attributes)) {
      if (attributeName !== 'position' && attributeName !== 'normal' && attributeName !== 'uv') geometry.deleteAttribute(attributeName);
    }
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const emissiveIntensity = material instanceof THREE.MeshStandardMaterial
      && material.emissive.getHex() !== 0
      ? material.emissiveIntensity
      : 0;
    const canJoinEmissiveBatch = !material.transparent
      && material.blending === THREE.NormalBlending
      && !material.map
      && emissiveIntensity >= 0.3;
    const preserveAccent = material.transparent
      || material.blending !== THREE.NormalBlending
      || emissiveIntensity >= 0.3;
    if (canJoinEmissiveBatch) {
      const color = 'color' in material && material.color instanceof THREE.Color
        ? material.color
        : new THREE.Color(0xffffff);
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let offset = 0; offset < colors.length; offset += 3) {
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      emissiveAccentGeometries.push(geometry);
    } else if (preserveAccent) {
      const batch = accentBatches.get(material.uuid) ?? {
        material,
        geometries: [] as THREE.BufferGeometry[],
      };
      batch.geometries.push(geometry);
      accentBatches.set(material.uuid, batch);
    } else {
      if (material instanceof THREE.MeshStandardMaterial) {
        structuralMap ??= material.map;
        structuralRoughnessMap ??= material.roughnessMap;
        structuralBumpMap ??= material.bumpMap;
        structuralEmissiveMap ??= material.emissiveMap;
        structuralEmissiveIntensity = Math.max(structuralEmissiveIntensity, material.emissiveIntensity);
      }
      const color = 'color' in material && material.color instanceof THREE.Color
        ? material.color
        : new THREE.Color(0xffffff);
      const colors = new Float32Array(geometry.getAttribute('position').count * 3);
      for (let offset = 0; offset < colors.length; offset += 3) {
        colors[offset] = color.r;
        colors[offset + 1] = color.g;
        colors[offset + 2] = color.b;
      }
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      const isOrganicSurface = material instanceof THREE.MeshStandardMaterial
        && material.side === THREE.DoubleSide
        && !material.map
        && material.metalness < 0.2;
      (isOrganicSurface ? organicGeometries : structuralGeometries).push(geometry);
    }
    sourceMeshes.push(child);
  });

  sourceMeshes.forEach((source) => {
    source.parent?.remove(source);
    source.geometry.dispose();
  });
  const structuralGeometry = structuralGeometries.length
    ? mergeGeometries(structuralGeometries, false)
    : null;
  structuralGeometries.forEach((geometry) => geometry.dispose());
  const organicGeometry = organicGeometries.length
    ? mergeGeometries(organicGeometries, false)
    : null;
  organicGeometries.forEach((geometry) => geometry.dispose());
  const emissiveAccentGeometry = emissiveAccentGeometries.length
    ? mergeGeometries(emissiveAccentGeometries, false)
    : null;
  emissiveAccentGeometries.forEach((geometry) => geometry.dispose());
  if (structuralGeometry) {
    const structuralMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.64,
      metalness: 0.17,
      map: structuralMap,
      emissive: structuralEmissiveMap ? 0x526044 : 0x000000,
      emissiveMap: structuralEmissiveMap,
      emissiveIntensity: structuralEmissiveIntensity,
      roughnessMap: structuralRoughnessMap,
      bumpMap: structuralBumpMap,
      bumpScale: 0.052,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const structuralMesh = presentMesh(
      new THREE.Mesh(structuralGeometry, structuralMaterial),
      `${batchName}_STRUCTURE`,
      5,
    );
    root.add(structuralMesh);
  }
  if (organicGeometry) {
    const organicMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      vertexColors: true,
      roughness: 0.84,
      metalness: 0,
      flatShading: true,
      side: THREE.DoubleSide,
    });
    const organicMesh = presentMesh(
      new THREE.Mesh(organicGeometry, organicMaterial),
      `${batchName}_ORGANIC`,
      5,
    );
    root.add(organicMesh);
  }
  if (emissiveAccentGeometry) {
    const emissiveAccentMaterial = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      vertexColors: true,
      toneMapped: false,
    });
    const emissiveAccentMesh = presentMesh(
      new THREE.Mesh(emissiveAccentGeometry, emissiveAccentMaterial),
      `${batchName}_EMISSIVE_ACCENTS`,
      5,
    );
    root.add(emissiveAccentMesh);
  }
  let accentIndex = 0;
  accentBatches.forEach((batch) => {
    const geometry = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((source) => source.dispose());
    if (!geometry) return;
    const accent = presentMesh(
      new THREE.Mesh(geometry, batch.material),
      `${batchName}_ACCENT_${accentIndex + 1}`,
      5,
    );
    root.add(accent);
    accentIndex += 1;
  });
  root.userData.staticMaterialBatches = (structuralGeometry ? 1 : 0)
    + (organicGeometry ? 1 : 0)
    + (emissiveAccentGeometry ? 1 : 0)
    + accentIndex;
}

function markStage<T extends THREE.Object3D>(object: T, stage: ConstructionStage): T {
  object.userData.constructionStage = stage;
  return object;
}

function presentMesh<T extends THREE.Mesh>(mesh: T, name: string, stage: ConstructionStage): T {
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return markStage(mesh, stage);
}

function box(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
) {
  return presentMesh(new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material), name, stage);
}

function roundedBox(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  radius = 0.045,
  segments = 1,
) {
  const safeRadius = Math.min(radius, width * 0.22, height * 0.22, depth * 0.22);
  return presentMesh(
    new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, Math.max(1, segments), safeRadius), material),
    name,
    stage,
  );
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  segments = 12,
) {
  return presentMesh(
    new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material),
    name,
    stage,
  );
}

function sphere(
  radius: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  segments = 12,
) {
  return presentMesh(
    new THREE.Mesh(new THREE.SphereGeometry(radius, segments, Math.max(7, Math.round(segments * 0.68))), material),
    name,
    stage,
  );
}

function cone(
  radius: number,
  height: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  segments = 8,
) {
  return presentMesh(new THREE.Mesh(new THREE.ConeGeometry(radius, height, segments), material), name, stage);
}

function torus(
  radius: number,
  tube: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  radialSegments = 7,
  tubularSegments = 28,
) {
  return presentMesh(
    new THREE.Mesh(new THREE.TorusGeometry(radius, tube, radialSegments, tubularSegments), material),
    name,
    stage,
  );
}

function beamBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  name: string,
  stage: ConstructionStage,
  segments = 7,
) {
  const direction = end.clone().sub(start);
  const beam = cylinder(radius, radius, direction.length(), material, name, stage, segments);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return beam;
}

function createNoiseTexture(
  name: string,
  seed: number,
  palette: readonly [THREE.ColorRepresentation, THREE.ColorRepresentation],
  mode: 'color' | 'scalar',
) {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const low = new THREE.Color(palette[0]);
  const high = new THREE.Color(palette[1]);
  const scratch = new THREE.Color();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const ridge = Math.abs(Math.sin((x + seed * 13) * 0.117) * Math.cos((y - seed * 7) * 0.083));
      const grain = 0.5 + 0.5 * Math.sin(x * 1.73 + y * 2.11 + seed * 9.17);
      const cellular = 0.5 + 0.5 * Math.sin(Math.hypot(x - 64, y - 64) * 0.41 + seed);
      const value = THREE.MathUtils.clamp(ridge * 0.5 + grain * 0.28 + cellular * 0.22, 0, 1);
      const offset = (y * size + x) * 4;
      if (mode === 'color') {
        scratch.copy(low).lerp(high, value);
        data[offset] = Math.round(scratch.r * 255);
        data[offset + 1] = Math.round(scratch.g * 255);
        data[offset + 2] = Math.round(scratch.b * 255);
      } else {
        const scalar = Math.round(value * 255);
        data[offset] = scalar;
        data[offset + 1] = scalar;
        data[offset + 2] = scalar;
      }
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = name;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4.5, 4.5);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = mode === 'color' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createWaterSurfaceTexture() {
  const size = 128;
  const data = new Uint8Array(size * size * 4);
  const deep = new THREE.Color(0x0d858c);
  const middle = new THREE.Color(0x45d6c9);
  const glint = new THREE.Color(0xc4fff2);
  const scratch = new THREE.Color();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const nx = x / size * Math.PI * 2;
      const ny = y / size * Math.PI * 2;
      const warp = Math.sin(nx * 2 + Math.cos(ny * 3) * 0.72) * 0.5
        + Math.cos(ny * 2 - Math.sin(nx * 3) * 0.58) * 0.34;
      const crossingRipples = Math.sin(nx * 4 + ny * 1.5 + warp * 1.8) * 0.22
        + Math.cos(ny * 5 - nx * 0.75 - warp * 1.3) * 0.18;
      const broadValue = THREE.MathUtils.clamp(0.5 + warp * 0.24 + crossingRipples, 0, 1);
      const caustic = Math.pow(Math.max(0, Math.sin(nx * 3.2 + warp) * Math.cos(ny * 3.7 - warp)), 5);
      scratch.copy(deep).lerp(middle, broadValue).lerp(glint, caustic * 0.42);
      const offset = (y * size + x) * 4;
      data[offset] = Math.round(scratch.r * 255);
      data[offset + 1] = Math.round(scratch.g * 255);
      data[offset + 2] = Math.round(scratch.b * 255);
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = 'ISLAND_18_WATER_ALBEDO';
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(0.72, 1.35);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
}

function createRuinSurfaceMaps() {
  const size = 256;
  const albedo = new Uint8Array(size * size * 4);
  const roughness = new Uint8Array(size * size * 4);
  const relief = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const broad = Math.sin(x * 0.038 + Math.sin(y * 0.021) * 1.7) * 0.5
        + Math.cos(y * 0.044 - x * 0.012) * 0.32;
      const grain = Math.sin(x * 0.71 + y * 0.43) * Math.cos(y * 0.91 - x * 0.17);
      const pitSeed = Math.sin(x * 0.137 + y * 0.227) * Math.sin(x * 0.061 - y * 0.183);
      const pit = Math.max(0, Math.abs(pitSeed) - 0.86) / 0.14;
      const hairline = Math.max(0, 1 - Math.abs(Math.sin(x * 0.019 + y * 0.034 + Math.sin(y * 0.011) * 2.2)) / 0.045);
      const albedoValue = THREE.MathUtils.clamp(228 + broad * 10 + grain * 4 - pit * 20 - hairline * 8, 174, 248);
      const roughnessValue = THREE.MathUtils.clamp(218 + broad * 8 + grain * 12 + pit * 18, 155, 248);
      const reliefValue = THREE.MathUtils.clamp(132 + broad * 8 + grain * 6 - pit * 34 - hairline * 17, 76, 174);
      [albedo, roughness, relief].forEach((data, channelIndex) => {
        const value = channelIndex === 0 ? albedoValue : channelIndex === 1 ? roughnessValue : reliefValue;
        data[offset] = value;
        data[offset + 1] = value;
        data[offset + 2] = value;
        data[offset + 3] = 255;
      });
    }
  }
  const createTexture = (data: Uint8Array, name: string, colorSpace: THREE.ColorSpace) => {
    const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    texture.name = name;
    texture.colorSpace = colorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(1.45, 1.45);
    texture.magFilter = THREE.LinearFilter;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
    return texture;
  };
  return {
    albedo: createTexture(albedo, 'ISLAND_18_RUIN_ALBEDO', THREE.SRGBColorSpace),
    roughness: createTexture(roughness, 'ISLAND_18_RUIN_ROUGHNESS', THREE.NoColorSpace),
    relief: createTexture(relief, 'ISLAND_18_RUIN_RELIEF', THREE.NoColorSpace),
  };
}

export function createIsland18JungleExpeditionMaterials(): Island18JungleExpeditionMaterials {
  const waterAlbedo = createWaterSurfaceTexture();
  const waterfallAlbedo = waterAlbedo.clone();
  waterfallAlbedo.name = 'ISLAND_18_WATERFALL_ALBEDO';
  waterfallAlbedo.repeat.set(1.15, 5.8);
  waterfallAlbedo.needsUpdate = true;
  const ruinSurface = createRuinSurfaceMaps();
  const ruinRelief = ruinSurface.relief;
  ruinRelief.name = 'ISLAND_18_MOSSY_RUIN_STONE_RELIEF';
  ruinRelief.colorSpace = THREE.NoColorSpace;
  ruinRelief.wrapS = THREE.RepeatWrapping;
  ruinRelief.wrapT = THREE.RepeatWrapping;
  ruinRelief.repeat.set(1.72, 1.72);
  ruinRelief.magFilter = THREE.LinearFilter;
  ruinRelief.minFilter = THREE.LinearMipmapLinearFilter;
  const ruinMaterial = (color: THREE.ColorRepresentation, roughness: number, bumpScale: number) => new THREE.MeshStandardMaterial({
    color,
    map: ruinSurface.albedo,
    roughnessMap: ruinSurface.roughness,
    bumpMap: ruinRelief,
    bumpScale,
    roughness,
    metalness: 0.015,
    flatShading: true,
  });
  const materials: Island18JungleExpeditionMaterials = {
    ruinStone: ruinMaterial(0x70794b, 0.8, 0.082),
    ruinStoneLight: ruinMaterial(0xa58f55, 0.72, 0.068),
    ruinStoneDark: ruinMaterial(0x293d2c, 0.9, 0.09),
    ruinStoneWet: ruinMaterial(0x1f6152, 0.38, 0.078),
    moss: new THREE.MeshStandardMaterial({ color: 0x3f8f25, roughness: 0.86, metalness: 0, side: THREE.DoubleSide }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x197536, roughness: 0.7, side: THREE.DoubleSide }),
    leafLight: new THREE.MeshStandardMaterial({ color: 0x70bf43, roughness: 0.66, side: THREE.DoubleSide }),
    leafDeep: new THREE.MeshStandardMaterial({ color: 0x093b25, roughness: 0.76, side: THREE.DoubleSide }),
    vine: new THREE.MeshStandardMaterial({ color: 0x2d621b, roughness: 0.86 }),
    rope: new THREE.MeshStandardMaterial({ color: 0x795128, roughness: 0.96 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x71431f, roughness: 0.82, metalness: 0.01 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xe5ba50, roughness: 0.24, metalness: 0.78, emissive: 0x664008, emissiveIntensity: 0.18 }),
    brassDark: new THREE.MeshStandardMaterial({ color: 0x6c4b1d, roughness: 0.4, metalness: 0.7 }),
    routeIvory: new THREE.MeshStandardMaterial({ color: 0xe4d39b, roughness: 0.72, metalness: 0.04 }),
    routeViolet: new THREE.MeshStandardMaterial({ color: 0x633b86, roughness: 0.58, metalness: 0.08, emissive: 0x251032, emissiveIntensity: 0.12 }),
    routeAzure: new THREE.MeshStandardMaterial({ color: 0x207899, roughness: 0.5, metalness: 0.12, emissive: 0x092d37, emissiveIntensity: 0.1 }),
    emerald: new THREE.MeshPhysicalMaterial({
      color: 0x1ad073,
      roughness: 0.08,
      metalness: 0.08,
      clearcoat: 1,
      clearcoatRoughness: 0.05,
      emissive: 0x00a75c,
      emissiveIntensity: 0.46,
    }),
    amber: new THREE.MeshStandardMaterial({ color: 0xffb234, roughness: 0.22, metalness: 0.08, emissive: 0xb45400, emissiveIntensity: 0.5 }),
    water: new THREE.MeshPhysicalMaterial({ color: 0x32e5d7, map: waterAlbedo, vertexColors: true, roughness: 0.08, metalness: 0.02, clearcoat: 1, clearcoatRoughness: 0.025, transparent: true, opacity: 0.88, side: THREE.DoubleSide, depthWrite: false, emissive: 0x087f7e, emissiveIntensity: 0.11 }),
    waterfall: new THREE.MeshPhysicalMaterial({ color: 0x86fff0, map: waterfallAlbedo, roughness: 0.07, clearcoat: 0.94, transparent: true, opacity: 0.86, side: THREE.DoubleSide, depthWrite: false, emissive: 0x0d8886, emissiveIntensity: 0.2 }),
    foam: new THREE.MeshStandardMaterial({ color: 0xb8f7ec, roughness: 0.38, transparent: true, opacity: 0.74, depthWrite: false, emissive: 0x4baea6, emissiveIntensity: 0.09 }),
    flower: new THREE.MeshStandardMaterial({ color: 0xa854b7, roughness: 0.64, emissive: 0x35113c, emissiveIntensity: 0.12 }),
    basinGround: new THREE.MeshStandardMaterial({ color: 0xffffff, vertexColors: true, roughness: 0.92, metalness: 0, flatShading: true }),
    canopyVolume: new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWeatherDarkness: { value: 0 },
      },
      vertexColors: true,
      vertexShader: `
        attribute float canopySize;
        varying vec3 vCanopyColor;
        uniform float uTime;
        uniform float uWeatherDarkness;
        void main() {
          vec3 swayedPosition = position;
          swayedPosition.x += sin(uTime * 0.36 + position.z * 0.19 + position.x * 0.07) * 0.07;
          swayedPosition.z += cos(uTime * 0.3 + position.x * 0.16) * 0.045;
          vec4 mvPosition = modelViewMatrix * vec4(swayedPosition, 1.0);
          gl_Position = projectionMatrix * mvPosition;
          gl_PointSize = clamp(canopySize * (1100.0 / max(2.0, -mvPosition.z)), 8.0, 44.0);
          vCanopyColor = color;
        }
      `,
      fragmentShader: `
        varying vec3 vCanopyColor;
        uniform float uWeatherDarkness;
        void main() {
          vec2 centered = gl_PointCoord - vec2(0.5);
          float angle = atan(centered.y, centered.x);
          float leafEdge = 0.39 + cos(angle * 7.0) * 0.034 + sin(angle * 5.0) * 0.018;
          float radius = length(centered);
          if (radius > leafEdge) discard;
          float normalizedRadius = clamp(radius / max(leafEdge, 0.001), 0.0, 1.0);
          float crownDepth = sqrt(max(0.0, 1.0 - normalizedRadius * normalizedRadius));
          vec3 crownNormal = normalize(vec3(centered.x * 1.48, centered.y * 1.48, crownDepth));
          vec3 lightDirection = normalize(vec3(-0.46, 0.72, 0.52));
          float diffuse = 0.58 + max(dot(crownNormal, lightDirection), 0.0) * 0.76;
          float facet = 0.94 + step(0.5, fract((angle / 6.2831853 + 1.0) * 7.0)) * 0.08;
          float leafVein = pow(max(0.0, cos(angle * 7.0)), 18.0) * (1.0 - normalizedRadius) * 0.08;
          float centerGlow = smoothstep(leafEdge, 0.03, radius) * 0.08;
          vec3 stormTint = mix(vec3(1.0), vec3(0.36, 0.52, 0.48), uWeatherDarkness);
          vec3 litColor = (vCanopyColor * (diffuse * facet + centerGlow + leafVein) + vec3(0.014, 0.046, 0.018)) * stormTint;
          gl_FragColor = vec4(litColor, 1.0);
        }
      `,
      depthWrite: true,
      depthTest: true,
      transparent: false,
      toneMapped: true,
    }),
    mist: new THREE.MeshBasicMaterial({ color: 0xc8fff3, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }),
    cloud: new THREE.MeshBasicMaterial({ color: 0xffffff, vertexColors: true, transparent: true, opacity: 0.2, depthWrite: false, fog: false, toneMapped: false }),
  };
  const residentWorkTime = { value: 0 };
  const residentWorkMotion = { value: 0 };
  const faunaMotionTime = { value: 0 };
  const faunaMotionAmount = { value: 0 };
  materials.basinGround.userData.residentWorkTime = residentWorkTime;
  materials.basinGround.userData.residentWorkMotion = residentWorkMotion;
  materials.basinGround.userData.faunaMotionTime = faunaMotionTime;
  materials.basinGround.userData.faunaMotionAmount = faunaMotionAmount;
  materials.basinGround.onBeforeCompile = (shader) => {
    shader.uniforms.uResidentWorkTime = residentWorkTime;
    shader.uniforms.uResidentWorkMotion = residentWorkMotion;
    shader.uniforms.uFaunaMotionTime = faunaMotionTime;
    shader.uniforms.uFaunaMotionAmount = faunaMotionAmount;
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
        attribute float residentRole;
        attribute vec3 residentAnchor;
        attribute float faunaRole;
        attribute vec3 faunaAnchor;
        varying float vFaunaVisibility;
        uniform float uResidentWorkTime;
        uniform float uResidentWorkMotion;
        uniform float uFaunaMotionTime;
        uniform float uFaunaMotionAmount;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
        vFaunaVisibility = step(0.5, faunaRole);
        if (residentRole > 0.5) {
          float role = floor(residentRole + 0.5);
          float phase = uResidentWorkTime * (0.72 + role * 0.13)
            + residentAnchor.x * 0.31 + residentAnchor.z * 0.23;
          float work = sin(phase) * uResidentWorkMotion;
          vec3 localResident = transformed - residentAnchor;
          if (role < 1.5) {
            localResident.y += abs(work) * 0.035;
            localResident.z += work * 0.025;
          } else if (role < 2.5) {
            float turn = work * 0.075;
            localResident.xz = mat2(cos(turn), -sin(turn), sin(turn), cos(turn)) * localResident.xz;
            localResident.y += abs(work) * 0.018;
          } else if (role < 3.5) {
            float studyLean = work * 0.035;
            localResident.yz = mat2(cos(studyLean), -sin(studyLean), sin(studyLean), cos(studyLean)) * localResident.yz;
          } else {
            localResident.y += work * 0.045;
            localResident.x += sin(phase * 0.54) * uResidentWorkMotion * 0.018;
          }
          transformed = residentAnchor + localResident;
        }
        if (faunaRole > 0.5) {
          float fauna = floor(faunaRole + 0.5);
          float phase = uFaunaMotionTime * (0.64 + fauna * 0.055)
            + faunaAnchor.x * 0.27 + faunaAnchor.z * 0.19;
          float motion = uFaunaMotionAmount;
          float gait = sin(phase);
          vec3 localFauna = transformed - faunaAnchor;
          if (fauna < 1.5) {
            localFauna.y += max(gait, 0.0) * 0.095 * motion;
            localFauna.x += sin(phase * 0.5) * 0.025 * motion;
          } else if (fauna < 2.5) {
            float baskTurn = gait * 0.055 * motion;
            localFauna.xz = mat2(cos(baskTurn), -sin(baskTurn), sin(baskTurn), cos(baskTurn)) * localFauna.xz;
          } else if (fauna < 3.5) {
            localFauna.y += abs(gait) * 0.024 * motion;
            localFauna.x += sin(phase * 0.46) * 0.035 * motion;
          } else if (fauna < 4.5) {
            float branchSway = gait * 0.075 * motion;
            localFauna.xy = mat2(cos(branchSway), -sin(branchSway), sin(branchSway), cos(branchSway)) * localFauna.xy;
          } else if (fauna < 5.5) {
            localFauna.y += max(gait, 0.0) * 0.055 * motion;
            float perchTurn = sin(phase * 0.62) * 0.06 * motion;
            localFauna.xz = mat2(cos(perchTurn), -sin(perchTurn), sin(perchTurn), cos(perchTurn)) * localFauna.xz;
          } else if (fauna < 6.5) {
            localFauna.x += sin(phase * 0.38) * 0.028 * motion;
          } else if (fauna < 8.5) {
            localFauna.y += abs(gait) * 0.032 * motion;
            localFauna.z += gait * 0.045 * motion;
          } else if (fauna < 10.5) {
            localFauna.y += abs(gait) * 0.026 * motion;
            localFauna.x += sin(phase * 0.41) * 0.05 * motion;
          } else {
            float waterTurn = gait * 0.035 * motion;
            localFauna.xz = mat2(cos(waterTurn), -sin(waterTurn), sin(waterTurn), cos(waterTurn)) * localFauna.xz;
            localFauna.y += sin(phase * 0.54) * 0.012 * motion;
          }
          transformed = faunaAnchor + localFauna;
        }`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
        varying float vFaunaVisibility;`,
      )
      .replace(
        '#include <dithering_fragment>',
        `if (vFaunaVisibility > 0.5) {
          gl_FragColor.rgb = gl_FragColor.rgb * 1.24 + vec3(0.055, 0.038, 0.012);
        }
        #include <dithering_fragment>`,
      );
  };
  materials.basinGround.customProgramCacheKey = () => 'island-18-resident-and-fauna-motion-v3';
  materials.water.forceSinglePass = true;
  materials.waterfall.forceSinglePass = true;
  materials.mist.forceSinglePass = true;
  materials.cloud.forceSinglePass = true;
  return materials;
}

function createStoneBlockWall(
  root: THREE.Group,
  prefix: string,
  width: number,
  height: number,
  depth: number,
  rows: number,
  columns: number,
  material: THREE.Material,
  stage: ConstructionStage,
) {
  const blockWidth = width / columns;
  const blockHeight = height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const stagger = row % 2 === 0 ? 0 : blockWidth * 0.38;
      const block = box(
        blockWidth * 0.93,
        blockHeight * 0.88,
        depth * (0.92 + ((row + column) % 3) * 0.035),
        material,
        `${prefix}_BLOCK_${row + 1}_${column + 1}`,
        stage,
      );
      block.position.set(
        -width / 2 + blockWidth * (column + 0.5) + stagger - (row % 2 ? blockWidth * 0.19 : 0),
        blockHeight * (row + 0.5),
        ((row * 7 + column * 3) % 5 - 2) * 0.012,
      );
      block.rotation.z = ((row * 5 + column * 11) % 7 - 3) * 0.006;
      root.add(block);
    }
  }
}

function createBroadLeafGeometry() {
  const perimeter = [
    [0, -0.54, 0], [-0.24, -0.28, -0.01], [-0.4, 0.04, 0.01], [-0.3, 0.34, 0.025],
    [0, 0.62, 0], [0.3, 0.34, 0.025], [0.4, 0.04, 0.01], [0.24, -0.28, -0.01],
  ] as const;
  const positions = [0, 0.02, 0.09, ...perimeter.flat()];
  const uvs = [0.5, 0.5, ...perimeter.flatMap(([x, y]) => [0.5 + x, 0.46 + y * 0.78])];
  const indices: number[] = [];
  for (let index = 0; index < perimeter.length; index += 1) {
    indices.push(0, index + 1, (index + 1) % perimeter.length + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addStoneBlockFacade(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  width: number,
  height: number,
  rows: number,
  columns: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  rotationY = 0,
) {
  const facade = markStage(new THREE.Group(), stage);
  facade.name = prefix;
  facade.position.set(...position);
  facade.rotation.y = rotationY;
  const blockWidth = width / columns;
  const blockHeight = height / rows;
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const edgeColumn = column === 0 || column === columns - 1;
      const material = (row + column) % 7 === 0
        ? materials.ruinStoneLight
        : (row * 3 + column) % 5 === 0
          ? materials.ruinStoneDark
          : materials.ruinStone;
      const block = roundedBox(
        blockWidth * (edgeColumn ? 0.88 : 0.94),
        blockHeight * 0.88,
        0.15 + ((row + column) % 3) * 0.015,
        material,
        `${prefix}_BLOCK_${row + 1}_${column + 1}`,
        stage,
        0.018,
      );
      const stagger = row % 2 === 0 ? 0 : blockWidth * 0.23;
      block.position.set(
        -width * 0.5 + blockWidth * (column + 0.5) + stagger - (row % 2 ? blockWidth * 0.12 : 0),
        -height * 0.5 + blockHeight * (row + 0.5),
        ((row * 7 + column * 11) % 5 - 2) * 0.012,
      );
      block.rotation.z = ((row * 5 + column * 3) % 7 - 3) * 0.009;
      facade.add(block);
    }
  }
  root.add(facade);
  return facade;
}

function addStonePortal(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  width: number,
  height: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  rotationY = 0,
) {
  const portal = markStage(new THREE.Group(), stage);
  portal.name = prefix;
  portal.position.set(...position);
  portal.rotation.y = rotationY;
  const recess = roundedBox(width * 0.62, height * 0.72, 0.28, materials.ruinStoneDark, `${prefix}_DEEP_RECESS`, stage, 0.055, 2);
  recess.position.y = -height * 0.08;
  const doorway = roundedBox(width * 0.43, height * 0.57, 0.3, materials.amber, `${prefix}_LIT_INTERIOR`, stage, 0.045, 2);
  doorway.position.set(0, -height * 0.13, 0.035);
  portal.add(recess, doorway);
  [-1, 1].forEach((side) => {
    const pier = roundedBox(width * 0.2, height * 0.78, 0.34, side < 0 ? materials.ruinStone : materials.ruinStoneLight, `${prefix}_PIER_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage, 0.045, 1);
    pier.position.set(side * width * 0.39, -height * 0.05, 0.02);
    portal.add(pier);
    for (let index = 0; index < 3; index += 1) {
      const voussoir = roundedBox(width * 0.24, height * 0.16, 0.37, index === 1 ? materials.brassDark : materials.ruinStoneLight, `${prefix}_ARCH_STONE_${side}_${index + 1}`, stage, 0.03, 1);
      const angle = side * (0.32 + index * 0.34);
      voussoir.position.set(Math.sin(angle) * width * 0.46, height * (0.33 + Math.cos(angle) * 0.22), 0.035);
      voussoir.rotation.z = -angle;
      portal.add(voussoir);
    }
  });
  const keystone = roundedBox(width * 0.24, height * 0.24, 0.4, materials.brass, `${prefix}_KEYSTONE`, stage, 0.03, 1);
  keystone.position.set(0, height * 0.58, 0.045);
  keystone.rotation.z = Math.PI / 4;
  portal.add(keystone);
  root.add(portal);
  return portal;
}

function addOpenRouteTunnelMouth(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  materials: Island18JungleExpeditionMaterials,
  rotationY = 0,
) {
  const mouth = markStage(new THREE.Group(), 3);
  mouth.name = prefix;
  mouth.position.set(...position);
  mouth.rotation.y = rotationY;
  const openingWidth = 0.78;
  const pierHeight = 0.66;
  [-1, 1].forEach((side) => {
    const pier = box(
      0.18,
      pierHeight,
      0.22,
      side < 0 ? materials.ruinStone : materials.ruinStoneLight,
      `${prefix}_${side < 0 ? 'LEFT' : 'RIGHT'}_JAMB`,
      3,
    );
    pier.position.set(side * openingWidth * 0.56, pierHeight * 0.5, 0);
    mouth.add(pier);
  });
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 6 * Math.PI;
    const voussoir = box(
      0.18,
      0.22,
      0.24,
      index === 3 ? materials.brass : index % 2 === 0 ? materials.ruinStoneLight : materials.ruinStone,
      `${prefix}_ARCH_STONE_${index + 1}`,
      3,
    );
    voussoir.position.set(
      Math.cos(angle) * openingWidth * 0.52,
      pierHeight + Math.sin(angle) * 0.34,
      0,
    );
    voussoir.rotation.z = Math.PI * 0.5 - angle;
    mouth.add(voussoir);
  }
  [-1, 1].forEach((side) => {
    const guideLight = presentMesh(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), materials.amber),
      `${prefix}_AMBER_GUIDE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      3,
    );
    guideLight.position.set(side * openingWidth * 0.33, 0.48, -0.035);
    mouth.add(guideLight);
  });
  root.add(mouth);
  return mouth;
}

function addTempleRouteTunnel(
  root: THREE.Group,
  side: -1 | 1,
  materials: Island18JungleExpeditionMaterials,
) {
  const sideName = side < 0 ? 'WEST' : 'EAST';
  const tunnel = markStage(new THREE.Group(), 2);
  tunnel.name = `ISLAND_18_TEMPLE_${sideName}_ROUTE_TUNNEL`;
  const tunnelCenterX = side * 2.24;
  tunnel.userData.routeClearance = {
    axis: 'z',
    width: 1.18,
    height: 1.48,
    boardRadius: 3.4,
    includesRouteFloor: true,
  };

  addOpenRouteTunnelMouth(
    tunnel,
    `${tunnel.name}_FRONT_ENTRY`,
    [tunnelCenterX, 0.45, 0.84],
    materials,
  );
  addOpenRouteTunnelMouth(
    tunnel,
    `${tunnel.name}_REAR_EXIT`,
    [tunnelCenterX, 0.45, -1.17],
    materials,
    Math.PI,
  );

  const routeFloor = markStage(new THREE.Group(), 2);
  routeFloor.name = `${tunnel.name}_ROUTE_FLOOR`;
  const routeMaterials = side < 0
    ? [materials.routeAzure, materials.routeIvory, materials.routeViolet]
    : [materials.routeViolet, materials.routeIvory, materials.routeAzure];
  [-0.76, -0.18, 0.4].forEach((z, index) => {
    const panel = box(
      0.7,
      0.045,
      0.56,
      routeMaterials[index],
      `${routeFloor.name}_PANEL_${index + 1}`,
      2,
    );
    panel.position.set(tunnelCenterX, 0.44, z);
    routeFloor.add(panel);
  });
  const ceiling = box(
    0.78,
    0.08,
    1.86,
    materials.ruinStoneDark,
    `${tunnel.name}_VAULTED_CEILING`,
    3,
  );
  ceiling.position.set(tunnelCenterX, 1.32, -0.17);
  tunnel.add(routeFloor, ceiling);
  root.add(tunnel);
  return tunnel;
}

function addTempleBalustrade(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  width: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  rotationY = 0,
) {
  const rail = markStage(new THREE.Group(), stage);
  rail.name = prefix;
  rail.position.set(...position);
  rail.rotation.y = rotationY;
  const top = roundedBox(width, 0.09, 0.14, materials.brassDark, `${prefix}_TOP_RAIL`, stage, 0.025);
  top.position.y = 0.38;
  const sill = roundedBox(width * 1.03, 0.08, 0.17, materials.ruinStoneLight, `${prefix}_SILL`, stage, 0.025);
  rail.add(top, sill);
  const postCount = Math.max(3, Math.round(width / 0.28));
  for (let index = 0; index < postCount; index += 1) {
    const t = postCount === 1 ? 0.5 : index / (postCount - 1);
    const post = cylinder(0.035, 0.05, 0.35, index % 4 === 0 ? materials.brass : materials.ruinStone, `${prefix}_POST_${index + 1}`, stage, 6);
    post.position.set((t - 0.5) * width * 0.9, 0.19, 0);
    rail.add(post);
  }
  root.add(rail);
  return rail;
}

function addCarvedReliefPanel(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  scale: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  rotationY = 0,
) {
  const panel = markStage(new THREE.Group(), stage);
  panel.name = prefix;
  panel.position.set(...position);
  panel.rotation.y = rotationY;
  panel.scale.setScalar(scale);
  const plaque = roundedBox(0.68, 0.84, 0.1, materials.ruinStoneLight, `${prefix}_PLAQUE`, stage, 0.055, 2);
  panel.add(plaque);
  const center = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), materials.emerald);
  center.name = `${prefix}_EMERALD_GLYPH`;
  center.position.z = 0.09;
  center.scale.set(0.72, 1, 0.42);
  markStage(center, stage);
  panel.add(center);
  for (let index = 0; index < 4; index += 1) {
    const angle = index / 4 * Math.PI * 2 + Math.PI / 4;
    const bar = roundedBox(0.08, 0.3, 0.08, materials.brassDark, `${prefix}_RAY_${index + 1}`, stage, 0.014);
    bar.position.set(Math.cos(angle) * 0.24, Math.sin(angle) * 0.29, 0.085);
    bar.rotation.z = -angle;
    panel.add(bar);
  }
  root.add(panel);
  return panel;
}

function addMossFringe(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  width: number,
  depth: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  rotationY = 0,
) {
  const fringe = markStage(new THREE.Group(), stage);
  fringe.name = prefix;
  fringe.position.set(...position);
  fringe.rotation.y = rotationY;
  const mat = roundedBox(width, 0.07, depth, materials.moss, `${prefix}_MOSS_MAT`, stage, 0.022);
  fringe.add(mat);
  const tendrilCount = Math.max(3, Math.round(width / 0.24));
  for (let index = 0; index < tendrilCount; index += 1) {
    const t = tendrilCount === 1 ? 0.5 : index / (tendrilCount - 1);
    const length = 0.18 + (index % 4) * 0.08;
    const tendril = cylinder(0.012, 0.018, length, materials.vine, `${prefix}_TENDRIL_${index + 1}`, stage, 5);
    tendril.position.set((t - 0.5) * width * 0.9, -length * 0.5, depth * 0.28);
    tendril.rotation.z = ((index % 3) - 1) * 0.08;
    fringe.add(tendril);
  }
  root.add(fringe);
  return fringe;
}

function addAmberNiche(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  scale = 1,
) {
  const recess = roundedBox(0.24 * scale, 0.34 * scale, 0.12, materials.ruinStoneDark, `${prefix}_RECESS`, stage, 0.035);
  recess.position.set(...position);
  const glow = roundedBox(0.12 * scale, 0.2 * scale, 0.13, materials.amber, `${prefix}_GLOW`, stage, 0.028);
  glow.position.set(position[0], position[1] - 0.02 * scale, position[2] + 0.03);
  root.add(recess, glow);
}

function addLeafCluster(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  scale: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage = 5,
) {
  const cluster = markStage(new THREE.Group(), stage);
  cluster.name = prefix;
  cluster.position.set(...position);
  cluster.scale.setScalar(scale);
  const clusterMaterial = prefix.length % 3 === 0
    ? materials.leafLight
    : prefix.length % 2 === 0
      ? materials.leaf
      : materials.leafDeep;
  for (let index = 0; index < 7; index += 1) {
    const angle = index / 7 * Math.PI * 2 + (index % 2) * 0.22;
    const leaf = presentMesh(new THREE.Mesh(createBroadLeafGeometry(), clusterMaterial), `${prefix}_LEAF_${index + 1}`, stage);
    leaf.scale.set(0.72, 0.82, 0.72);
    leaf.position.set(Math.cos(angle) * 0.24, 0.18 + Math.sin(angle) * 0.12, Math.sin(angle) * 0.24);
    leaf.rotation.z = -angle + Math.PI / 2;
    leaf.rotation.x = -0.18 + (index % 3) * 0.14;
    cluster.add(leaf);
  }
  compactStaticGeometry(cluster, `${prefix}_FOLIAGE`);
  cluster.children.forEach((child) => markStage(child, stage));
  root.add(cluster);
  return cluster;
}

function clearFrontProcessionalLane(angle: number, index: number, shift = 0.76) {
  if (Math.sin(angle) <= 0.38 || Math.abs(Math.cos(angle)) >= 0.7) return angle;
  return angle + (index % 2 === 0 ? shift : -shift);
}

function createInstancedCanopyField(
  clusterCount: number,
  materials: Island18JungleExpeditionMaterials,
) {
  const root = registerIsland18RuntimePart('jungle-canopy-and-vines', new THREE.Group(), 'foliage');
  root.name = 'ISLAND_18_INSTANCED_JUNGLE_CANOPY_FIELD';
  const leafGeometry = createBroadLeafGeometry();
  const materialList = [materials.leafLight, materials.leaf, materials.leafDeep] as const;
  const placements: Array<Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>> = [[], [], []];
  const euler = new THREE.Euler();
  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const rawAngle = clusterIndex / clusterCount * Math.PI * 2 + (clusterIndex % 5) * 0.08;
    const angle = clearFrontProcessionalLane(rawAngle, clusterIndex, 0.82);
    const lane = clusterIndex % 3;
    const radius = lane === 0 ? 2.28 : lane === 1 ? 4.82 : 5.74;
    const clusterScale = 0.62 + (clusterIndex % 5) * 0.1;
    const clusterPosition = new THREE.Vector3(
      Math.cos(angle) * radius,
      0.52 + (clusterIndex % 4) * 0.08,
      Math.sin(angle) * radius,
    );
    for (let leafIndex = 0; leafIndex < 7; leafIndex += 1) {
      const leafAngle = leafIndex / 7 * Math.PI * 2 + (leafIndex % 2) * 0.22;
      const materialIndex = leafIndex % 3 === 0 ? 0 : leafIndex % 2 === 0 ? 1 : 2;
      placements[materialIndex].push({
        position: clusterPosition.clone().add(new THREE.Vector3(
          Math.cos(leafAngle) * 0.24 * clusterScale,
          (0.18 + Math.sin(leafAngle) * 0.12) * clusterScale,
          Math.sin(leafAngle) * 0.24 * clusterScale,
        )),
        quaternion: new THREE.Quaternion().setFromEuler(euler.set(
          -0.18 + (leafIndex % 3) * 0.14,
          0,
          -leafAngle + Math.PI / 2,
        )),
        scale: new THREE.Vector3(0.76, 0.86, 0.76).multiplyScalar(clusterScale),
      });
    }
  }
  const matrix = new THREE.Matrix4();
  const meshes = placements.map((entries, materialIndex) => {
    const mesh = new THREE.InstancedMesh(leafGeometry, materialList[materialIndex], entries.length);
    mesh.name = `ISLAND_18_CANOPY_LEAF_BATCH_${materialIndex + 1}`;
    entries.forEach((entry, index) => {
      matrix.compose(entry.position, entry.quaternion, entry.scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.windPhase = materialIndex * 1.73;
    root.add(mesh);
    return mesh;
  });
  return { root, meshes };
}

function createInstancedPalmGrove(
  treeCount: number,
  materials: Island18JungleExpeditionMaterials,
) {
  const root = registerIsland18RuntimePart('jungle-canopy-and-vines', new THREE.Group(), 'foliage');
  root.name = 'ISLAND_18_INSTANCED_PALM_GROVE';
  root.userData.windPhase = 2.17;
  const trunkGeometry = new THREE.CylinderGeometry(0.085, 0.14, 1, 7);
  const frondGeometry = createBroadLeafGeometry();
  const trunkPlacements: Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }> = [];
  const frondPlacements: Array<Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>> = [[], []];
  const euler = new THREE.Euler();
  for (let treeIndex = 0; treeIndex < treeCount; treeIndex += 1) {
    const rawAngle = treeIndex / treeCount * Math.PI * 2 + 0.18;
    const angle = clearFrontProcessionalLane(rawAngle, treeIndex, 0.9);
    const radius = 4.72 + (treeIndex % 4) * 0.27;
    const height = 1.48 + (treeIndex % 5) * 0.22;
    const lean = ((treeIndex % 3) - 1) * 0.075;
    const base = new THREE.Vector3(Math.cos(angle) * radius, 0.36, Math.sin(angle) * radius);
    const crown = base.clone().add(new THREE.Vector3(lean * height * 0.55, height, 0));
    trunkPlacements.push({
      position: base.clone().add(crown).multiplyScalar(0.5),
      quaternion: new THREE.Quaternion().setFromEuler(euler.set(0, -angle, lean)),
      scale: new THREE.Vector3(1, height, 1),
    });
    for (let frondIndex = 0; frondIndex < 7; frondIndex += 1) {
      const frondAngle = frondIndex / 7 * Math.PI * 2 + angle + (treeIndex % 2) * 0.16;
      const length = 0.86 + (frondIndex % 3) * 0.13;
      frondPlacements[(treeIndex + frondIndex) % 2].push({
        position: crown.clone().add(new THREE.Vector3(Math.cos(frondAngle) * length * 0.38, 0.03 - (frondIndex % 2) * 0.09, Math.sin(frondAngle) * length * 0.38)),
        quaternion: new THREE.Quaternion().setFromEuler(euler.set(
          (frondIndex % 3 - 1) * 0.08,
          -frondAngle,
          Math.PI / 2 + (frondIndex % 2 === 0 ? 1 : -1) * 0.12,
        )),
        scale: new THREE.Vector3(length * 0.48, length * 1.68, 0.72),
      });
    }
  }
  const matrix = new THREE.Matrix4();
  const trunkMesh = new THREE.InstancedMesh(trunkGeometry, materials.wood, trunkPlacements.length);
  trunkMesh.name = 'ISLAND_18_PALM_TRUNK_BATCH';
  trunkPlacements.forEach((entry, index) => {
    matrix.compose(entry.position, entry.quaternion, entry.scale);
    trunkMesh.setMatrixAt(index, matrix);
  });
  trunkMesh.instanceMatrix.needsUpdate = true;
  trunkMesh.castShadow = true;
  trunkMesh.receiveShadow = true;
  root.add(trunkMesh);
  frondPlacements.forEach((entries, materialIndex) => {
    const frondMesh = new THREE.InstancedMesh(
      frondGeometry,
      materialIndex === 0 ? materials.leafLight : materials.leafDeep,
      entries.length,
    );
    frondMesh.name = `ISLAND_18_PALM_FROND_BATCH_${materialIndex + 1}`;
    entries.forEach((entry, index) => {
      matrix.compose(entry.position, entry.quaternion, entry.scale);
      frondMesh.setMatrixAt(index, matrix);
    });
    frondMesh.instanceMatrix.needsUpdate = true;
    frondMesh.castShadow = true;
    frondMesh.receiveShadow = true;
    root.add(frondMesh);
  });
  return root;
}

function createInstancedUnderstoryField(
  clusterCount: number,
  materials: Island18JungleExpeditionMaterials,
) {
  const root = registerIsland18RuntimePart('jungle-canopy-and-vines', new THREE.Group(), 'foliage');
  root.name = 'ISLAND_18_INSTANCED_UNDERSTORY_FIELD';
  const geometry = createBroadLeafGeometry();
  const materialList = [materials.leafDeep, materials.leaf, materials.leafLight] as const;
  const placements: Array<Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>> = [[], [], []];
  const euler = new THREE.Euler();
  for (let clusterIndex = 0; clusterIndex < clusterCount; clusterIndex += 1) {
    const rawAngle = clusterIndex * 2.399963 + (clusterIndex % 7) * 0.07;
    const angle = clearFrontProcessionalLane(rawAngle, clusterIndex, 0.82);
    const lane = clusterIndex % 4;
    const radius = lane === 0 ? 2.22 : lane === 1 ? 4.76 : lane === 2 ? 5.34 : 5.86;
    const center = new THREE.Vector3(
      Math.cos(angle) * radius,
      0.42 + (clusterIndex % 3) * 0.035,
      Math.sin(angle) * radius,
    );
    const leafCount = 5 + clusterIndex % 3;
    for (let leafIndex = 0; leafIndex < leafCount; leafIndex += 1) {
      const leafAngle = leafIndex / leafCount * Math.PI * 2 + angle * 0.17;
      const size = 0.24 + (clusterIndex + leafIndex) % 4 * 0.045;
      const materialIndex = (clusterIndex + leafIndex) % 3;
      placements[materialIndex].push({
        position: center.clone().add(new THREE.Vector3(Math.cos(leafAngle) * 0.12, size * 0.38, Math.sin(leafAngle) * 0.12)),
        quaternion: new THREE.Quaternion().setFromEuler(euler.set(-0.22 + leafIndex % 3 * 0.11, -leafAngle, -leafAngle + Math.PI / 2)),
        scale: new THREE.Vector3(size * 0.92, size * 1.6, size),
      });
    }
  }
  const matrix = new THREE.Matrix4();
  const meshes = placements.map((entries, materialIndex) => {
    const mesh = new THREE.InstancedMesh(geometry, materialList[materialIndex], entries.length);
    mesh.name = `ISLAND_18_UNDERSTORY_LEAF_BATCH_${materialIndex + 1}`;
    entries.forEach((entry, index) => {
      matrix.compose(entry.position, entry.quaternion, entry.scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  });
  return { root, meshes };
}

function createTempleOvergrowthField(
  density: number,
  materials: Island18JungleExpeditionMaterials,
) {
  const root = registerIsland18RuntimePart('jungle-canopy-and-vines', new THREE.Group(), 'foliage');
  root.name = 'ISLAND_18_TEMPLE_OVERGROWTH_FIELD';
  const geometry = createBroadLeafGeometry();
  const materialList = [materials.leafDeep, materials.leaf, materials.leafLight] as const;
  const anchors = [
    [-2.25, 1.45, 0.3], [2.28, 1.68, -0.18], [-1.9, 2.8, -0.2], [1.94, 3.0, -0.18],
    [-1.2, 4.35, 0.08], [1.28, 4.62, -0.08], [-0.55, 5.36, 0.16], [0.62, 5.6, -0.05],
    [-1.8, 1.14, -1.02], [1.74, 1.22, -1.04], [-0.92, 3.56, -0.86], [0.96, 3.72, -0.86],
  ] as const;
  const placements: Array<Array<{ position: THREE.Vector3; quaternion: THREE.Quaternion; scale: THREE.Vector3 }>> = [[], [], []];
  const euler = new THREE.Euler();
  for (let clusterIndex = 0; clusterIndex < density; clusterIndex += 1) {
    const anchor = anchors[clusterIndex % anchors.length];
    const orbit = clusterIndex * 2.399963;
    const center = new THREE.Vector3(
      anchor[0] + Math.cos(orbit) * (0.12 + clusterIndex % 3 * 0.05),
      anchor[1] + (clusterIndex % 4) * 0.08,
      anchor[2] + Math.sin(orbit) * 0.12,
    );
    for (let leafIndex = 0; leafIndex < 6; leafIndex += 1) {
      const leafAngle = leafIndex / 6 * Math.PI * 2 + orbit * 0.11;
      const size = 0.22 + (clusterIndex + leafIndex) % 4 * 0.045;
      const materialIndex = (clusterIndex * 2 + leafIndex) % 3;
      placements[materialIndex].push({
        position: center.clone().add(new THREE.Vector3(Math.cos(leafAngle) * 0.14, Math.sin(leafAngle * 2) * 0.05, Math.sin(leafAngle) * 0.14)),
        quaternion: new THREE.Quaternion().setFromEuler(euler.set(-0.28 + leafIndex % 3 * 0.12, -leafAngle, -leafAngle + Math.PI / 2)),
        scale: new THREE.Vector3(size, size * 1.42, size),
      });
    }
  }
  const matrix = new THREE.Matrix4();
  const meshes = placements.map((entries, materialIndex) => {
    const mesh = new THREE.InstancedMesh(geometry, materialList[materialIndex], entries.length);
    mesh.name = `ISLAND_18_TEMPLE_OVERGROWTH_BATCH_${materialIndex + 1}`;
    entries.forEach((entry, index) => {
      matrix.compose(entry.position, entry.quaternion, entry.scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = false;
    mesh.receiveShadow = true;
    root.add(mesh);
    return mesh;
  });
  return { root, meshes };
}

interface Island18AerialFaunaSpec {
  species: string;
  phase: number;
  radius: number;
  altitude: number;
  speed: number;
  scale: number;
  streamSkimmer: boolean;
}

function createJungleAerialFaunaBatch(profile: Island3DQualityProfile) {
  const positions = new Float32Array([
    -0.17, 0, 0, 0.13, 0.07, 0, 0.13, -0.07, 0,
    -0.04, 0.01, 0, -0.38, 0.03, -0.13, -0.11, 0.08, 0.08,
    -0.04, 0.01, 0, -0.11, 0.08, 0.08, 0.18, 0.04, -0.18,
    0.1, 0.035, 0, 0.32, 0.03, 0, 0.14, -0.025, 0,
  ]);
  const colors = new Float32Array([
    0.16, 0.08, 0.05, 0.94, 0.28, 0.12, 0.16, 0.08, 0.05,
    0.92, 0.22, 0.18, 0.98, 0.48, 0.2, 0.18, 0.3, 0.82,
    0.92, 0.22, 0.18, 0.18, 0.3, 0.82, 0.98, 0.48, 0.2,
    1, 0.9, 0.25, 1, 0.65, 0.12, 0.82, 0.32, 0.08,
  ]);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    vertexColors: true,
    side: THREE.DoubleSide,
    toneMapped: true,
  });
  const count = profile.id === 'high' ? 18 : profile.id === 'medium' ? 13 : 9;
  const species = [
    'scarlet-macaw',
    'keel-billed-toucan',
    'violet-sabrewing-hummingbird',
    'blue-morpho-butterfly',
    'golden-parakeet',
    'orchid-dragonfly',
  ] as const;
  const palette = [0xff5a32, 0xffb82d, 0x55c9ff, 0x2e72ff, 0xd4e84d, 0x54efd5] as const;
  const specs: Island18AerialFaunaSpec[] = [];
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = 'ISLAND_18_EXOTIC_AERIAL_FAUNA_BATCH';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  for (let index = 0; index < count; index += 1) {
    const speciesIndex = index % species.length;
    specs.push({
      species: species[speciesIndex],
      phase: index * 2.399963 + speciesIndex * 0.34,
      radius: speciesIndex === 3 || speciesIndex === 5 ? 5.2 + index % 4 * 0.64 : 6.6 + index % 4 * 1.08,
      altitude: speciesIndex === 3 || speciesIndex === 5 ? 2.45 + index % 3 * 0.38 : 8.8 + index % 4 * 0.72,
      speed: 0.09 + speciesIndex * 0.012 + index % 3 * 0.008,
      scale: speciesIndex === 3 || speciesIndex === 5 ? 0.78 + index % 2 * 0.14 : 1.52 + index % 3 * 0.24,
      streamSkimmer: speciesIndex === 3 || speciesIndex === 5,
    });
    mesh.setColorAt(index, new THREE.Color(palette[speciesIndex]));
  }
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  mesh.userData.species = [...species];
  mesh.userData.individualCount = count;
  mesh.castShadow = false;
  mesh.receiveShadow = false;
  mesh.frustumCulled = false;
  return { mesh, specs };
}

function createIsland18WeatherLineField(profile: Island3DQualityProfile) {
  const segmentCount = profile.id === 'high' ? 150 : profile.id === 'medium' ? 96 : 54;
  const positions = new Float32Array(segmentCount * 6);
  const colors = new Float32Array(segmentCount * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.LineBasicMaterial({
    vertexColors: true,
    transparent: true,
    opacity: 0,
    blending: THREE.NormalBlending,
    depthWrite: false,
    toneMapped: false,
  });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'ISLAND_18_WEATHER_RAIN_LIGHTNING_AND_SUNRAY_FIELD';
  lines.visible = false;
  lines.frustumCulled = false;
  lines.renderOrder = 120;
  lines.userData.cycleSeconds = ISLAND_18_WEATHER_CYCLE_SECONDS;
  return { lines, positions, colors, material, segmentCount };
}

function addLandmarkContactShadows(
  root: THREE.Group,
  satellitePositions: readonly Island5LandmarkDefinition[],
) {
  const geometry = new THREE.CircleGeometry(1, 28);
  const material = new THREE.MeshBasicMaterial({
    color: 0x102b1c,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -1,
  });
  const placements = [
    { position: new THREE.Vector3(0, 0.497, -0.08), scale: new THREE.Vector3(1.7, 1.04, 1) },
    ...satellitePositions.map((landmark) => ({
      position: new THREE.Vector3(landmark.position[0], 0.176, landmark.position[2]),
      scale: new THREE.Vector3(1.18, 0.78, 1),
    })),
  ];
  const shadows = new THREE.InstancedMesh(geometry, material, placements.length);
  shadows.name = 'ISLAND_18_LANDMARK_CONTACT_SHADOW_BATCH';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(-Math.PI / 2, 0, 0));
  placements.forEach((placement, index) => {
    matrix.compose(placement.position, quaternion, placement.scale);
    shadows.setMatrixAt(index, matrix);
  });
  shadows.instanceMatrix.needsUpdate = true;
  shadows.renderOrder = 1;
  root.add(shadows);
}

function addVine(
  root: THREE.Group,
  prefix: string,
  points: readonly THREE.Vector3[],
  material: THREE.Material,
  stage: ConstructionStage,
  radius = 0.028,
) {
  const curve = new THREE.CatmullRomCurve3(points.map((point) => point.clone()));
  const geometry = new THREE.TubeGeometry(curve, Math.max(12, points.length * 7), radius, 5, false);
  const vine = presentMesh(new THREE.Mesh(geometry, material), prefix, stage);
  root.add(vine);
  return vine;
}

function addTieredStairs(
  root: THREE.Group,
  prefix: string,
  width: number,
  depth: number,
  steps: number,
  y: number,
  z: number,
  material: THREE.Material,
  stage: ConstructionStage,
) {
  for (let index = 0; index < steps; index += 1) {
    const step = box(
      width - index * width * 0.035,
      0.1,
      depth / steps + 0.045,
      material,
      `${prefix}_STEP_${index + 1}`,
      stage,
    );
    step.position.set(0, y + 0.05 + index * 0.1, z + index * depth / steps);
    root.add(step);
  }
}

function addStoneStairFlight(
  root: THREE.Group,
  prefix: string,
  bottom: THREE.Vector3,
  top: THREE.Vector3,
  width: number,
  steps: number,
  material: THREE.Material,
  stage: ConstructionStage,
) {
  const planar = new THREE.Vector2(top.x - bottom.x, top.z - bottom.z);
  const treadDepth = Math.max(0.1, planar.length() / steps * 1.22);
  const yaw = Math.atan2(planar.x, planar.y);
  for (let index = 0; index < steps; index += 1) {
    const t = steps === 1 ? 1 : index / (steps - 1);
    const step = roundedBox(
      width * (1 - t * 0.08),
      0.11,
      treadDepth,
      material,
      `${prefix}_STEP_${index + 1}`,
      stage,
      0.022,
    );
    step.position.copy(bottom).lerp(top, t);
    step.position.y += 0.055;
    step.rotation.y = yaw;
    root.add(step);
  }
}

function addAmberDoor(
  root: THREE.Group,
  prefix: string,
  x: number,
  y: number,
  z: number,
  scale: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
) {
  const recess = box(0.52 * scale, 0.76 * scale, 0.12, materials.ruinStoneDark, `${prefix}_RECESS`, stage);
  recess.position.set(x, y, z);
  const door = box(0.34 * scale, 0.56 * scale, 0.13, materials.amber, `${prefix}_AMBER_DOOR`, stage);
  door.position.set(x, y - 0.04 * scale, z + 0.025);
  const lintel = box(0.68 * scale, 0.13 * scale, 0.2, materials.brass, `${prefix}_LINTEL`, stage);
  lintel.position.set(x, y + 0.45 * scale, z + 0.02);
  const leftPediment = box(0.4 * scale, 0.085 * scale, 0.16, materials.brassDark, `${prefix}_PEDIMENT_LEFT`, stage);
  leftPediment.position.set(x - 0.15 * scale, y + 0.58 * scale, z + 0.035);
  leftPediment.rotation.z = 0.38;
  const rightPediment = box(0.4 * scale, 0.085 * scale, 0.16, materials.brassDark, `${prefix}_PEDIMENT_RIGHT`, stage);
  rightPediment.position.set(x + 0.15 * scale, y + 0.58 * scale, z + 0.035);
  rightPediment.rotation.z = -0.38;
  root.add(recess, door, lintel, leftPediment, rightPediment);
}

function addGuardianMask(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  scale: number,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
) {
  const mask = markStage(new THREE.Group(), stage);
  mask.name = prefix;
  mask.position.set(...position);
  mask.scale.setScalar(scale);
  const face = box(0.78, 0.96, 0.28, materials.ruinStone, `${prefix}_FACE`, stage);
  face.scale.set(0.82, 1, 0.7);
  const brow = box(0.92, 0.13, 0.34, materials.brassDark, `${prefix}_BROW`, stage);
  brow.position.set(0, 0.2, 0.02);
  const nose = cone(0.17, 0.52, materials.ruinStoneDark, `${prefix}_NOSE`, stage, 4);
  nose.rotation.x = Math.PI / 2;
  nose.position.set(0, -0.02, 0.28);
  const jaw = box(0.58, 0.22, 0.32, materials.ruinStoneDark, `${prefix}_JAW`, stage);
  jaw.position.set(0, -0.48, 0.04);
  mask.add(face, brow, nose, jaw);
  const foreheadJewel = presentMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.12, 0), materials.emerald),
    `${prefix}_FOREHEAD_JEWEL`,
    stage,
  );
  foreheadJewel.scale.set(0.7, 1.25, 0.42);
  foreheadJewel.position.set(0, 0.38, 0.22);
  const mouth = box(0.45, 0.16, 0.12, materials.ruinStoneDark, `${prefix}_MOUTH_RECESS`, stage);
  mouth.position.set(0, -0.3, 0.22);
  mask.add(foreheadJewel, mouth);
  const chinGlyph = presentMesh(
    new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.brass),
    `${prefix}_CHIN_GLYPH`,
    stage,
  );
  chinGlyph.scale.set(0.7, 1.2, 0.38);
  chinGlyph.position.set(0, -0.57, 0.18);
  mask.add(chinGlyph);
  [-0.25, 0.25].forEach((x, index) => {
    const browGlyph = roundedBox(0.28, 0.07, 0.08, materials.brass, `${prefix}_BROW_GLYPH_${index + 1}`, stage, 0.018);
    browGlyph.position.set(x, 0.25, 0.23);
    browGlyph.rotation.z = index === 0 ? 0.28 : -0.28;
    mask.add(browGlyph);
  });
  for (let index = 0; index < 5; index += 1) {
    const tooth = cone(0.035, 0.14 + (index % 2) * 0.025, materials.ruinStoneLight, `${prefix}_MOUTH_TOOTH_${index + 1}`, stage, 4);
    tooth.position.set((index - 2) * 0.08, -0.31, 0.31);
    tooth.rotation.z = Math.PI;
    mask.add(tooth);
  }
  [-1, 1].forEach((side) => {
    const cheek = box(0.22, 0.34, 0.12, materials.ruinStoneLight, `${prefix}_CHEEK_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage);
    cheek.position.set(side * 0.31, -0.08, 0.2);
    cheek.rotation.z = -side * 0.2;
    mask.add(cheek);
    const eye = sphere(0.1, materials.emerald, `${prefix}_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage, 10);
    eye.scale.set(1.25, 0.66, 0.48);
    eye.position.set(side * 0.22, 0.12, 0.24);
    mask.add(eye);
    const earDisc = cylinder(0.16, 0.16, 0.09, materials.brassDark, `${prefix}_EAR_DISC_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage, 10);
    earDisc.rotation.z = Math.PI / 2;
    earDisc.position.set(side * 0.51, -0.02, 0.06);
    const earGem = sphere(0.075, materials.emerald, `${prefix}_EAR_GEM_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage, 8);
    earGem.scale.set(0.48, 1, 1);
    earGem.position.set(side * 0.57, -0.02, 0.08);
    const tusk = cone(0.045, 0.26, materials.ruinStoneLight, `${prefix}_JAW_TUSK_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage, 5);
    tusk.position.set(side * 0.29, -0.49, 0.22);
    tusk.rotation.z = side * 0.22;
    mask.add(earDisc, earGem, tusk);
    for (let index = 0; index < 3; index += 1) {
      const fin = cone(0.12, 0.62 + index * 0.08, index === 1 ? materials.brass : materials.ruinStone, `${prefix}_HEADDRESS_${side}_${index + 1}`, stage, 5);
      fin.position.set(side * (0.48 + index * 0.14), 0.24 + index * 0.12, -0.02);
      fin.rotation.z = -side * (0.45 + index * 0.12);
      mask.add(fin);
    }
    const crownBand = box(0.5, 0.07, 0.12, materials.brass, `${prefix}_CROWN_BAND_${side < 0 ? 'LEFT' : 'RIGHT'}`, stage);
    crownBand.position.set(side * 0.31, 0.48, 0.12);
    crownBand.rotation.z = -side * 0.22;
    mask.add(crownBand);
  });
  for (let index = 0; index < 5; index += 1) {
    const offset = index - 2;
    const crownRay = cone(
      0.09 + (2 - Math.abs(offset)) * 0.012,
      0.58 + (2 - Math.abs(offset)) * 0.12,
      index === 2 ? materials.emerald : index % 2 === 0 ? materials.brass : materials.ruinStoneLight,
      `${prefix}_CENTRAL_CROWN_RAY_${index + 1}`,
      stage,
      5,
    );
    crownRay.position.set(offset * 0.2, 0.72 + (2 - Math.abs(offset)) * 0.07, -0.02);
    crownRay.rotation.z = -offset * 0.16;
    mask.add(crownRay);
  }
  root.add(mask);
  return mask;
}

function addLostCityOrnamentPass(
  root: THREE.Group,
  materials: Island18JungleExpeditionMaterials,
) {
  const stone: THREE.BufferGeometry[] = [];
  const metal: THREE.BufferGeometry[] = [];
  const textile: THREE.BufferGeometry[] = [];
  const addGeometry = (
    target: THREE.BufferGeometry[],
    geometry: THREE.BufferGeometry,
    position: readonly [number, number, number],
    rotation: readonly [number, number, number] = [0, 0, 0],
    scale: readonly [number, number, number] = [1, 1, 1],
  ) => {
    const normalized = geometry.index ? geometry.toNonIndexed() : geometry;
    if (normalized !== geometry) geometry.dispose();
    Object.keys(normalized.attributes).forEach((attributeName) => {
      if (attributeName !== 'position' && attributeName !== 'normal' && attributeName !== 'uv') normalized.deleteAttribute(attributeName);
    });
    if (!normalized.getAttribute('normal')) normalized.computeVertexNormals();
    if (!normalized.getAttribute('uv')) {
      normalized.setAttribute('uv', new THREE.Float32BufferAttribute(
        new Float32Array(normalized.getAttribute('position').count * 2),
        2,
      ));
    }
    normalized.applyMatrix4(new THREE.Matrix4().compose(
      new THREE.Vector3(...position),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),
      new THREE.Vector3(...scale),
    ));
    target.push(normalized);
  };

  const friezes = [
    { y: 1.91, z: 0.59, width: 2.6, count: 9 },
    { y: 3.12, z: 0.54, width: 2.05, count: 7 },
    { y: 4.48, z: 0.39, width: 1.28, count: 5 },
  ] as const;
  friezes.forEach((frieze, tierIndex) => {
    for (let index = 0; index < frieze.count; index += 1) {
      const t = index / (frieze.count - 1);
      const x = (t - 0.5) * frieze.width;
      addGeometry(stone, new THREE.BoxGeometry(0.18, 0.17, 0.07), [x, frieze.y, frieze.z]);
      addGeometry(
        tierIndex === 1 || index % 3 === 0 ? metal : stone,
        new THREE.OctahedronGeometry(0.065 + (index % 2) * 0.012, 0),
        [x, frieze.y, frieze.z + 0.075],
        [0, 0, index % 2 === 0 ? Math.PI / 4 : 0],
        [0.72, 1, 0.34],
      );
    }
  });

  [-1, 1].forEach((side) => {
    [1.82, 3.22, 4.55].forEach((y, index) => {
      addGeometry(
        metal,
        new THREE.ConeGeometry(0.075 + index * 0.012, 0.42 + index * 0.08, 5),
        [side * (1.5 - index * 0.34), y, index === 0 ? 0.48 : 0.18],
        [0, 0, -side * (0.22 + index * 0.05)],
      );
    });
    [2.04, 3.35].forEach((y, index) => {
      addGeometry(textile, new THREE.PlaneGeometry(0.34 - index * 0.04, 0.62 - index * 0.08), [side * (1.16 - index * 0.3), y, 0.68 - index * 0.14], [0, 0, side * 0.08]);
      addGeometry(metal, new THREE.BoxGeometry(0.46 - index * 0.05, 0.055, 0.07), [side * (1.16 - index * 0.3), y + 0.31 - index * 0.04, 0.67 - index * 0.14]);
    });
  });

  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2 + 0.18;
    const radius = 1.68 + (index % 3) * 0.17;
    addGeometry(
      stone,
      new THREE.DodecahedronGeometry(0.08 + (index % 4) * 0.018, 0),
      [Math.cos(angle) * radius, 0.55 + (index % 2) * 0.035, Math.sin(angle) * radius],
      [index * 0.17, angle, index * 0.11],
      [1.35, 0.7, 0.9],
    );
  }

  const addMergedMesh = (geometries: THREE.BufferGeometry[], material: THREE.Material, name: string) => {
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    root.add(presentMesh(new THREE.Mesh(merged, material), name, 5));
  };
  addMergedMesh(stone, materials.routeIvory, 'ISLAND_18_TEMPLE_LOST_CITY_STONE_ORNAMENT_BATCH');
  addMergedMesh(metal, materials.brassDark, 'ISLAND_18_TEMPLE_LOST_CITY_METAL_ORNAMENT_BATCH');
  addMergedMesh(textile, materials.routeViolet, 'ISLAND_18_TEMPLE_LOST_CITY_BANNER_BATCH');
}

function addRopeBridge(
  root: THREE.Group,
  prefix: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  materials: Island18JungleExpeditionMaterials,
  stage: ConstructionStage,
  plankCount = 14,
) {
  const bridge = markStage(new THREE.Group(), stage);
  bridge.name = prefix;
  const direction = end.clone().sub(start);
  const length = direction.length();
  const yaw = Math.atan2(direction.x, direction.z);
  bridge.position.copy(start).add(end).multiplyScalar(0.5);
  bridge.rotation.y = yaw;
  for (let index = 0; index < plankCount; index += 1) {
    const t = plankCount === 1 ? 0.5 : index / (plankCount - 1);
    const plank = box(0.72, 0.075, Math.max(0.17, length / plankCount * 0.82), materials.wood, `${prefix}_PLANK_${index + 1}`, stage);
    plank.position.set(0, -Math.sin(t * Math.PI) * 0.28, (t - 0.5) * length);
    plank.rotation.z = Math.sin(index * 2.1) * 0.035;
    bridge.add(plank);
  }
  [-0.42, 0.42].forEach((x, railIndex) => {
    const points: THREE.Vector3[] = [];
    for (let index = 0; index <= 10; index += 1) {
      const t = index / 10;
      points.push(new THREE.Vector3(x, 0.42 - Math.sin(t * Math.PI) * 0.24, (t - 0.5) * length));
    }
    addVine(bridge, `${prefix}_ROPE_RAIL_${railIndex + 1}`, points, materials.rope, stage, 0.025);
    const anchorFront = cylinder(0.045, 0.065, 0.92, materials.wood, `${prefix}_ANCHOR_${railIndex + 1}_FRONT`, stage, 7);
    anchorFront.position.set(x, 0.42, -length * 0.5 + 0.08);
    const anchorRear = cylinder(0.045, 0.065, 0.92, materials.wood, `${prefix}_ANCHOR_${railIndex + 1}_REAR`, stage, 7);
    anchorRear.position.set(x, 0.42, length * 0.5 - 0.08);
    bridge.add(anchorFront, anchorRear);
    for (let index = 1; index < 6; index += 1) {
      const t = index / 6;
      const deckY = -Math.sin(t * Math.PI) * 0.28;
      const cableY = 0.42 - Math.sin(t * Math.PI) * 0.24;
      const hanger = cylinder(0.012, 0.012, Math.max(0.08, cableY - deckY), materials.rope, `${prefix}_HANGER_${railIndex + 1}_${index}`, stage, 5);
      hanger.position.set(x, (cableY + deckY) * 0.5, (t - 0.5) * length);
      bridge.add(hanger);
    }
  });
  root.add(bridge);
  return bridge;
}

function createExplorerNest(level: 1 | 2 | 3, materials: Island18JungleExpeditionMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_EXPLORER_NEST';
  const platform = cylinder(1.18, 1.32, 0.32, materials.ruinStoneDark, 'ISLAND_18_EXPLORER_NEST_PLATFORM', 1, 11);
  platform.position.y = 0.16;
  const mossCap = cylinder(1.1, 1.18, 0.1, materials.moss, 'ISLAND_18_EXPLORER_NEST_MOSS_CAP', 1, 11);
  mossCap.position.y = 0.37;
  root.add(platform, mossCap);
  const shrineBack = roundedBox(1.52, 1.44, 0.5, materials.ruinStoneDark, 'ISLAND_18_EXPLORER_NEST_SHRINE_BACK', 1, 0.07, 2);
  shrineBack.position.set(0, 1.08, -0.62);
  const shrineCrown = roundedBox(1.72, 0.18, 0.66, materials.ruinStoneLight, 'ISLAND_18_EXPLORER_NEST_SHRINE_CROWN', 1, 0.04);
  shrineCrown.position.set(0, 1.82, -0.62);
  const eggRecess = roundedBox(0.92, 1.1, 0.2, materials.ruinStoneWet, 'ISLAND_18_EXPLORER_NEST_EGG_RECESS', 1, 0.12, 2);
  eggRecess.position.set(0, 1.08, -0.34);
  root.add(shrineBack, shrineCrown, eggRecess);
  addStoneStairFlight(root, 'ISLAND_18_EXPLORER_NEST_ENTRY_STAIR', new THREE.Vector3(0, 0.38, 1.16), new THREE.Vector3(0, 0.58, 0.5), 0.8, 5, materials.ruinStoneLight, 1);
  addCarvedReliefPanel(root, 'ISLAND_18_EXPLORER_NEST_SHRINE_RELIEF', [0, 1.18, -0.3], 0.52, materials, 2);
  for (let index = 0; index < 10; index += 1) {
    const angle = index / 10 * Math.PI * 2;
    const branch = beamBetween(
      new THREE.Vector3(Math.cos(angle) * 0.36, 0.42, Math.sin(angle) * 0.36),
      new THREE.Vector3(Math.cos(angle) * 0.92, 0.58 + (index % 2) * 0.08, Math.sin(angle) * 0.92),
      0.06,
      materials.wood,
      `ISLAND_18_EXPLORER_NEST_BRANCH_${index + 1}`,
      1,
    );
    root.add(branch);
  }
  const eggPedestal = cylinder(0.32, 0.44, 0.28, materials.brassDark, 'ISLAND_18_EXPLORER_NEST_EGG_PEDESTAL', 2, 10);
  eggPedestal.position.set(0, 0.58, 0.02);
  const egg = sphere(0.56, materials.emerald, 'ISLAND_18_EXPLORER_NEST_EMERALD_EGG', 2, 20);
  egg.scale.set(0.8, 1.38, 0.8);
  egg.position.set(0, 1.16, 0.02);
  egg.userData.idleMotion = 'egg-breathe';
  const eggHaloOuter = torus(0.68, 0.06, materials.brass, 'ISLAND_18_EXPLORER_NEST_EGG_HALO_OUTER', 3, 8, 34);
  eggHaloOuter.position.set(0, 1.18, -0.22);
  const eggHaloInner = torus(0.52, 0.026, materials.amber, 'ISLAND_18_EXPLORER_NEST_EGG_HALO_INNER', 4, 6, 30);
  eggHaloInner.position.set(0, 1.18, -0.19);
  root.add(eggPedestal, egg, eggHaloOuter, eggHaloInner);
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const post = cylinder(0.07, 0.1, 1.55, materials.wood, `ISLAND_18_EXPLORER_NEST_CANOPY_POST_${side}`, 3, 7);
      post.position.set(side * 0.72, 1.03, -0.18);
      root.add(post);
    });
    const canopy = cone(0.88, 0.46, materials.leafDeep, 'ISLAND_18_EXPLORER_NEST_CANOPY', 3, 7);
    canopy.position.set(0, 2.22, -0.42);
    canopy.scale.z = 0.72;
    root.add(canopy);
    const canopyBand = torus(0.68, 0.065, materials.brassDark, 'ISLAND_18_EXPLORER_NEST_CANOPY_BAND', 3, 6, 28);
    canopyBand.rotation.x = Math.PI / 2;
    canopyBand.position.set(0, 2.04, -0.42);
    root.add(canopyBand);
    [-1, 1].forEach((side) => {
      const sideShrine = roundedBox(0.34, 0.84, 0.38, materials.ruinStone, `ISLAND_18_EXPLORER_NEST_SIDE_SHRINE_${side}`, 3, 0.045);
      sideShrine.position.set(side * 0.82, 0.82, -0.48);
      const sideGem = sphere(0.09, side < 0 ? materials.amber : materials.emerald, `ISLAND_18_EXPLORER_NEST_SIDE_GEM_${side}`, 4, 9);
      sideGem.position.set(side * 0.82, 1.04, -0.27);
      root.add(sideShrine, sideGem);
    });
    const ring = torus(0.58, 0.045, materials.brass, 'ISLAND_18_EXPLORER_NEST_INCUBATION_RING', 4, 7, 28);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.88;
    root.add(ring);
  }
  if (level >= 3) {
    addGuardianMask(root, 'ISLAND_18_EXPLORER_NEST_GUARDIAN', [0, 2.34, -0.44], 0.38, materials, 5);
    addLeafCluster(root, 'ISLAND_18_EXPLORER_NEST_LEAVES_LEFT', [-1.12, 1.34, -0.58], 0.5, materials);
    addLeafCluster(root, 'ISLAND_18_EXPLORER_NEST_LEAVES_RIGHT', [1.12, 1.24, -0.5], 0.46, materials);
    const beacon = cone(0.16, 0.64, materials.emerald, 'ISLAND_18_EXPLORER_NEST_BEACON', 5, 6);
    beacon.position.set(0, 2.86, -0.4);
    root.add(beacon);
    [-1, 1].forEach((side) => {
      const reliquaryLamp = sphere(0.1, materials.amber, `ISLAND_18_EXPLORER_NEST_RELIQUARY_LAMP_${side}`, 5, 10);
      reliquaryLamp.position.set(side * 0.62, 1.38, -0.16);
      root.add(reliquaryLamp);
    });
    addTempleBalustrade(root, 'ISLAND_18_EXPLORER_NEST_FRONT_RAIL', [0, 0.48, 0.82], 1.54, materials, 5);
    addVine(root, 'ISLAND_18_EXPLORER_NEST_HANGING_ROOT_LEFT', [
      new THREE.Vector3(-0.7, 1.78, -0.5), new THREE.Vector3(-0.9, 1.26, -0.42),
      new THREE.Vector3(-0.74, 0.72, -0.18), new THREE.Vector3(-0.92, 0.16, 0.08),
    ], materials.vine, 5, 0.03);
    addVine(root, 'ISLAND_18_EXPLORER_NEST_HANGING_ROOT_RIGHT', [
      new THREE.Vector3(0.72, 1.8, -0.5), new THREE.Vector3(0.9, 1.34, -0.3),
      new THREE.Vector3(0.78, 0.82, -0.04), new THREE.Vector3(0.96, 0.28, 0.12),
    ], materials.vine, 5, 0.03);
  }
  return registerIsland18RuntimePart('explorer-nest', root, 'landmark');
}

function createJunglePath(level: 1 | 2 | 3, materials: Island18JungleExpeditionMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_JUNGLE_PATH';
  for (let index = 0; index < 4; index += 1) {
    const terrace = box(1.65 - index * 0.16, 0.18, 0.56, materials.ruinStone, `ISLAND_18_JUNGLE_PATH_TERRACE_${index + 1}`, 1);
    terrace.position.set(0, 0.12 + index * 0.18, 0.75 - index * 0.48);
    root.add(terrace);
  }
  [-1, 1].forEach((side) => {
    const pylon = roundedBox(0.34, 1.88, 0.38, materials.ruinStoneDark, `ISLAND_18_JUNGLE_PATH_GATE_PYLON_${side}`, 2, 0.035, 2);
    pylon.position.set(side * 0.82, 1.06, -0.82);
    root.add(pylon);
    const pylonFoot = roundedBox(0.58, 0.28, 0.62, materials.ruinStoneLight, `ISLAND_18_JUNGLE_PATH_GATE_FOOT_${side}`, 2, 0.04);
    pylonFoot.position.set(side * 0.82, 0.28, -0.82);
    const pylonCap = cylinder(0.26, 0.32, 0.2, materials.brassDark, `ISLAND_18_JUNGLE_PATH_GATE_CAP_${side}`, 2, 8);
    pylonCap.position.set(side * 0.82, 2.04, -0.82);
    root.add(pylonFoot, pylonCap);
    const flame = sphere(0.11, materials.amber, `ISLAND_18_JUNGLE_PATH_TORCH_${side}`, 2, 9);
    flame.scale.set(0.72, 1.52, 0.72);
    flame.position.set(side * 0.82, 2.2, -0.82);
    root.add(flame);
  });
  if (level >= 2) {
    const lintel = roundedBox(2.02, 0.3, 0.46, materials.brassDark, 'ISLAND_18_JUNGLE_PATH_GATE_LINTEL', 3, 0.035);
    lintel.position.set(0, 1.94, -0.82);
    root.add(lintel);
    addGuardianMask(root, 'ISLAND_18_JUNGLE_PATH_GATE_MASK', [0, 2.08, -0.54], 0.44, materials, 3);
    const wheel = torus(0.62, 0.085, materials.brass, 'ISLAND_18_JUNGLE_PATH_RHYTHM_WHEEL', 4, 8, 34);
    wheel.position.set(0, 1.02, 0.48);
    const wheelCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), materials.emerald);
    wheelCore.name = 'ISLAND_18_JUNGLE_PATH_RHYTHM_WHEEL_CORE';
    wheelCore.position.set(0, 1.02, 0.5);
    markStage(wheelCore, 4);
    root.add(wheel, wheelCore);
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const spoke = beamBetween(
        new THREE.Vector3(Math.cos(angle) * 0.2, 1.02 + Math.sin(angle) * 0.2, 0.48),
        new THREE.Vector3(Math.cos(angle) * 0.52, 1.02 + Math.sin(angle) * 0.52, 0.48),
        0.025,
        index % 2 === 0 ? materials.brass : materials.brassDark,
        `ISLAND_18_JUNGLE_PATH_RHYTHM_SPOKE_${index + 1}`,
        4,
        6,
      );
      root.add(spoke);
    }
    addTempleBalustrade(root, 'ISLAND_18_JUNGLE_PATH_TERRACE_RAIL_LEFT', [-0.7, 0.7, 0.08], 1.15, materials, 3, Math.PI / 2);
    addTempleBalustrade(root, 'ISLAND_18_JUNGLE_PATH_TERRACE_RAIL_RIGHT', [0.7, 0.7, 0.08], 1.15, materials, 3, Math.PI / 2);
    const pathTowerLeft = roundedBox(0.44, 1.12, 0.52, materials.ruinStoneDark, 'ISLAND_18_JUNGLE_PATH_TOWER_LEFT', 3, 0.055, 2);
    pathTowerLeft.position.set(-0.92, 0.96, -1.0);
    const pathTowerRight = roundedBox(0.44, 1.32, 0.52, materials.ruinStone, 'ISLAND_18_JUNGLE_PATH_TOWER_RIGHT', 3, 0.055, 2);
    pathTowerRight.position.set(0.92, 1.06, -1.0);
    root.add(pathTowerLeft, pathTowerRight);
    addCarvedReliefPanel(root, 'ISLAND_18_JUNGLE_PATH_TOWER_RELIEF_LEFT', [-0.92, 1.04, -0.71], 0.34, materials, 4);
    addCarvedReliefPanel(root, 'ISLAND_18_JUNGLE_PATH_TOWER_RELIEF_RIGHT', [0.92, 1.15, -0.71], 0.34, materials, 4);
  }
  if (level >= 3) {
    const lookout = cylinder(0.62, 0.76, 0.52, materials.ruinStone, 'ISLAND_18_JUNGLE_PATH_LOOKOUT', 5, 9);
    lookout.position.set(0, 1.5, -1.22);
    const canopy = cone(0.72, 0.5, materials.leafDeep, 'ISLAND_18_JUNGLE_PATH_LOOKOUT_CANOPY', 5, 7);
    canopy.position.set(0, 2.36, -1.22);
    root.add(lookout, canopy);
    const lookoutBand = torus(0.59, 0.055, materials.brass, 'ISLAND_18_JUNGLE_PATH_LOOKOUT_BAND', 5, 6, 26);
    lookoutBand.rotation.x = Math.PI / 2;
    lookoutBand.position.set(0, 1.72, -1.22);
    root.add(lookoutBand);
    addStoneStairFlight(root, 'ISLAND_18_JUNGLE_PATH_LOOKOUT_STAIR', new THREE.Vector3(0.62, 0.48, -0.34), new THREE.Vector3(0.42, 1.5, -1.02), 0.48, 8, materials.ruinStoneLight, 5);
    addLeafCluster(root, 'ISLAND_18_JUNGLE_PATH_GATE_CROWN_LEFT', [-1.08, 1.82, -1.14], 0.34, materials);
    addLeafCluster(root, 'ISLAND_18_JUNGLE_PATH_GATE_CROWN_RIGHT', [1.1, 1.96, -1.18], 0.36, materials);
    addVine(root, 'ISLAND_18_JUNGLE_PATH_HERO_VINE', [
      new THREE.Vector3(-0.84, 1.55, -0.75), new THREE.Vector3(-0.52, 1.02, -0.55),
      new THREE.Vector3(-0.68, 0.42, -0.18), new THREE.Vector3(-0.42, 0.08, 0.52),
    ], materials.vine, 5, 0.035);
  }
  return registerIsland18RuntimePart('jungle-path', root, 'landmark');
}

function createSurvivalTrials(level: 1 | 2 | 3, materials: Island18JungleExpeditionMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_SURVIVAL_TRIALS';
  const dais = cylinder(1.15, 1.34, 0.38, materials.ruinStoneDark, 'ISLAND_18_SURVIVAL_TRIALS_DAIS', 1, 6);
  dais.position.y = 0.19;
  const inlay = cylinder(0.82, 0.82, 0.08, materials.brassDark, 'ISLAND_18_SURVIVAL_TRIALS_INLAY', 1, 6);
  inlay.position.y = 0.42;
  root.add(dais, inlay);
  const trialRing = torus(0.92, 0.065, materials.brass, 'ISLAND_18_SURVIVAL_TRIALS_COMPASS_RING', 1, 7, 34);
  trialRing.rotation.x = Math.PI / 2;
  trialRing.position.y = 0.49;
  root.add(trialRing);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const marker = roundedBox(0.18, 0.12, 0.36, index % 2 === 0 ? materials.ruinStoneLight : materials.brassDark, `ISLAND_18_SURVIVAL_TRIALS_RING_MARKER_${index + 1}`, 1, 0.025);
    marker.position.set(Math.cos(angle) * 0.82, 0.5, Math.sin(angle) * 0.82);
    marker.rotation.y = -angle;
    root.add(marker);
  }
  [-1, 1].forEach((side) => {
    const totem = box(0.34, 1.6, 0.36, materials.ruinStone, `ISLAND_18_SURVIVAL_TRIALS_TOTEM_${side}`, 2);
    totem.position.set(side * 0.84, 1.03, -0.18);
    root.add(totem);
    const totemCap = cone(0.26, 0.56, side < 0 ? materials.brassDark : materials.ruinStoneLight, `ISLAND_18_SURVIVAL_TRIALS_TOTEM_CAP_${side}`, 2, 5);
    totemCap.position.set(side * 0.84, 2.04, -0.18);
    root.add(totemCap);
    addGuardianMask(root, `ISLAND_18_SURVIVAL_TRIALS_TOTEM_FACE_${side}`, [side * 0.84, 1.2, 0.03], 0.26, materials, 2);
  });
  const chest = box(0.62, 0.4, 0.42, materials.wood, 'ISLAND_18_SURVIVAL_TRIALS_RELIC_CHEST', 2);
  chest.position.set(0, 0.66, 0.6);
  const chestBand = torus(0.25, 0.04, materials.brass, 'ISLAND_18_SURVIVAL_TRIALS_CHEST_BAND', 2, 6, 18);
  chestBand.rotation.y = Math.PI / 2;
  chestBand.position.copy(chest.position);
  root.add(chest, chestBand);
  if (level >= 2) {
    const beam = box(2.08, 0.18, 0.34, materials.brassDark, 'ISLAND_18_SURVIVAL_TRIALS_CROSSBEAM', 3);
    beam.position.set(0, 1.76, -0.18);
    const winch = cylinder(0.22, 0.22, 0.72, materials.brass, 'ISLAND_18_SURVIVAL_TRIALS_WINCH', 4, 10);
    winch.rotation.z = Math.PI / 2;
    winch.position.set(0, 1.58, -0.12);
    root.add(beam, winch);
    const trialPortalRing = torus(0.84, 0.075, materials.brass, 'ISLAND_18_SURVIVAL_TRIALS_VERTICAL_TRIAL_RING', 3, 8, 38);
    trialPortalRing.position.set(0, 1.34, 0.02);
    const trialPortalInner = torus(0.62, 0.025, materials.emerald, 'ISLAND_18_SURVIVAL_TRIALS_VERTICAL_INNER_RING', 4, 6, 32);
    trialPortalInner.position.set(0, 1.34, 0.05);
    trialPortalInner.rotation.z = Math.PI / 5;
    root.add(trialPortalRing, trialPortalInner);
    for (let index = 0; index < 8; index += 1) {
      const angle = index / 8 * Math.PI * 2;
      const trialGlyph = cone(
        0.075,
        0.28,
        index % 2 === 0 ? materials.brass : materials.ruinStoneLight,
        `ISLAND_18_SURVIVAL_TRIALS_PORTAL_GLYPH_${index + 1}`,
        4,
        4,
      );
      trialGlyph.position.set(Math.cos(angle) * 0.84, 1.34 + Math.sin(angle) * 0.84, 0.04);
      trialGlyph.rotation.z = -angle + Math.PI / 2;
      root.add(trialGlyph);
    }
    [-1, 1].forEach((side) => {
      const bladeArm = beamBetween(new THREE.Vector3(side * 0.18, 1.58, -0.1), new THREE.Vector3(side * 0.66, 1.1, 0.28), 0.035, materials.brass, `ISLAND_18_SURVIVAL_TRIALS_PENDULUM_ARM_${side}`, 4, 7);
      const blade = cone(0.16, 0.62, materials.ruinStoneLight, `ISLAND_18_SURVIVAL_TRIALS_PENDULUM_BLADE_${side}`, 4, 4);
      blade.rotation.z = side * Math.PI / 2;
      blade.position.set(side * 0.72, 1.04, 0.34);
      root.add(bladeArm, blade);
    });
    addTempleBalustrade(root, 'ISLAND_18_SURVIVAL_TRIALS_RELIC_RAIL', [0, 0.55, 0.9], 1.32, materials, 4);
  }
  if (level >= 3) {
    const bridgeDeck = box(0.82, 0.12, 2.1, materials.wood, 'ISLAND_18_SURVIVAL_TRIALS_SKYBRIDGE_DECK', 5);
    bridgeDeck.position.set(0, 1.22, -1.15);
    bridgeDeck.rotation.x = -0.08;
    root.add(bridgeDeck);
    [-0.48, 0.48].forEach((x, index) => {
      const rail = beamBetween(new THREE.Vector3(x, 1.32, -0.2), new THREE.Vector3(x, 1.58, -2.12), 0.028, materials.rope, `ISLAND_18_SURVIVAL_TRIALS_SKYBRIDGE_RAIL_${index + 1}`, 5);
      root.add(rail);
    });
    const crystal = cone(0.2, 0.8, materials.emerald, 'ISLAND_18_SURVIVAL_TRIALS_TRIAL_CRYSTAL', 5, 6);
    crystal.position.set(0, 1.34, 0.1);
    crystal.rotation.z = Math.PI;
    root.add(crystal);
    const trialCrown = torus(0.62, 0.06, materials.brass, 'ISLAND_18_SURVIVAL_TRIALS_SKY_CROWN', 5, 7, 30);
    trialCrown.position.set(0, 2.2, -0.18);
    trialCrown.rotation.x = Math.PI / 2;
    root.add(trialCrown);
    const beaconMast = cylinder(0.05, 0.08, 0.86, materials.brassDark, 'ISLAND_18_SURVIVAL_TRIALS_ZENITH_BEACON_MAST', 5, 7);
    beaconMast.position.set(0, 2.62, -0.18);
    const beaconHalo = torus(0.31, 0.035, materials.brass, 'ISLAND_18_SURVIVAL_TRIALS_ZENITH_BEACON_HALO', 5, 6, 24);
    beaconHalo.position.set(0, 3.02, -0.16);
    const beaconCrystal = presentMesh(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.22, 0), materials.emerald),
      'ISLAND_18_SURVIVAL_TRIALS_ZENITH_BEACON_CRYSTAL',
      5,
    );
    beaconCrystal.scale.set(0.78, 1.42, 0.78);
    beaconCrystal.position.set(0, 3.02, -0.13);
    root.add(beaconMast, beaconHalo, beaconCrystal);
    [-1, 1].forEach((side) => {
      const torchPost = cylinder(0.045, 0.075, 1.05, materials.ruinStoneDark, `ISLAND_18_SURVIVAL_TRIALS_TORCH_POST_${side}`, 5, 7);
      torchPost.position.set(side * 1.08, 0.98, 0.54);
      const flame = sphere(0.11, materials.amber, `ISLAND_18_SURVIVAL_TRIALS_TORCH_FLAME_${side}`, 5, 9);
      flame.scale.set(0.7, 1.5, 0.7);
      flame.position.set(side * 1.08, 1.58, 0.54);
      root.add(torchPost, flame);
    });
    addLeafCluster(root, 'ISLAND_18_SURVIVAL_TRIALS_JUNGLE_LEFT', [-1.28, 0.72, -0.92], 0.32, materials);
    addLeafCluster(root, 'ISLAND_18_SURVIVAL_TRIALS_JUNGLE_RIGHT', [1.3, 0.66, -0.88], 0.3, materials);
  }
  return registerIsland18RuntimePart('survival-trials', root, 'landmark');
}

function createExplorersCamp(level: 1 | 2 | 3, materials: Island18JungleExpeditionMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_EXPLORERS_CAMP';
  const deck = cylinder(1.12, 1.28, 0.3, materials.wood, 'ISLAND_18_EXPLORERS_CAMP_DECK', 1, 10);
  deck.position.y = 0.15;
  const table = roundedBox(1.32, 0.12, 0.82, materials.wood, 'ISLAND_18_EXPLORERS_CAMP_MAP_TABLE', 2, 0.035);
  table.position.set(0.08, 0.86, 0.3);
  root.add(deck, table);
  const stoneFooting = cylinder(1.0, 1.18, 0.24, materials.ruinStoneDark, 'ISLAND_18_EXPLORERS_CAMP_STONE_FOOTING', 1, 10);
  stoneFooting.position.y = 0.02;
  root.add(stoneFooting);
  addStoneStairFlight(root, 'ISLAND_18_EXPLORERS_CAMP_ENTRY_STAIR', new THREE.Vector3(0, 0.2, 1.16), new THREE.Vector3(0, 0.43, 0.62), 0.72, 4, materials.ruinStoneLight, 1);
  [-0.4, 0.4].forEach((x, index) => {
    const leg = cylinder(0.045, 0.055, 0.62, materials.wood, `ISLAND_18_EXPLORERS_CAMP_TABLE_LEG_${index + 1}`, 2, 6);
    leg.position.set(x, 0.5, 0.3);
    root.add(leg);
  });
  const map = roundedBox(1.02, 0.022, 0.58, materials.moss, 'ISLAND_18_EXPLORERS_CAMP_MAP', 2, 0.012);
  map.position.set(0.08, 0.932, 0.3);
  map.rotation.y = 0.12;
  root.add(map);
  for (let index = 0; index < 3; index += 1) {
    const routeLine = roundedBox(0.72 - index * 0.12, 0.018, 0.026, index === 1 ? materials.emerald : materials.brass, `ISLAND_18_EXPLORERS_CAMP_MAP_ROUTE_${index + 1}`, 3, 0.008);
    routeLine.position.set(0.08 + (index - 1) * 0.08, 0.952 + index * 0.003, 0.2 + index * 0.12);
    routeLine.rotation.y = 0.12 + (index - 1) * 0.28;
    root.add(routeLine);
  }
  const chartCase = roundedBox(0.34, 0.5, 0.28, materials.wood, 'ISLAND_18_EXPLORERS_CAMP_CHART_CASE', 2, 0.04);
  chartCase.position.set(-0.68, 0.62, 0.2);
  const chartBand = torus(0.13, 0.025, materials.brass, 'ISLAND_18_EXPLORERS_CAMP_CHART_CASE_BAND', 2, 6, 18);
  chartBand.rotation.y = Math.PI / 2;
  chartBand.position.copy(chartCase.position);
  root.add(chartCase, chartBand);
  if (level >= 2) {
    [-1, 1].forEach((side) => {
      const post = cylinder(0.055, 0.075, 1.78, materials.wood, `ISLAND_18_EXPLORERS_CAMP_PAVILION_POST_${side}`, 3, 7);
      post.position.set(side * 0.78, 1.08, -0.16);
      root.add(post);
    });
    const canopy = cone(0.96, 0.5, materials.flower, 'ISLAND_18_EXPLORERS_CAMP_PAVILION_CANOPY', 3, 6);
    canopy.position.set(0, 2.28, -0.5);
    canopy.scale.z = 0.72;
    root.add(canopy);
    const rearWall = roundedBox(1.42, 0.82, 0.2, materials.ruinStoneDark, 'ISLAND_18_EXPLORERS_CAMP_ARCHIVE_WALL', 3, 0.055, 2);
    rearWall.position.set(0, 1.02, -0.76);
    root.add(rearWall);
    addStoneBlockFacade(root, 'ISLAND_18_EXPLORERS_CAMP_ARCHIVE_BLOCKS', [0, 0.94, -0.6], 1.34, 0.74, 3, 5, materials, 3);
    addCarvedReliefPanel(root, 'ISLAND_18_EXPLORERS_CAMP_ARCHIVE_GLYPH', [0, 1.02, -0.47], 0.42, materials, 4);
    const lantern = sphere(0.15, materials.amber, 'ISLAND_18_EXPLORERS_CAMP_LANTERN', 4, 10);
    lantern.position.set(-0.68, 1.48, 0.46);
    root.add(lantern);
    const signalMast = cylinder(0.035, 0.055, 1.7, materials.wood, 'ISLAND_18_EXPLORERS_CAMP_SIGNAL_MAST', 4, 7);
    signalMast.position.set(0.88, 1.08, -0.38);
    const pennant = roundedBox(0.46, 0.22, 0.025, materials.flower, 'ISLAND_18_EXPLORERS_CAMP_SIGNAL_PENNANT', 4, 0.015);
    pennant.position.set(1.08, 1.76, -0.38);
    pennant.rotation.z = -0.16;
    root.add(signalMast, pennant);
  }
  if (level >= 3) {
    const astrolabe = markStage(new THREE.Group(), 5);
    astrolabe.name = 'ISLAND_18_EXPLORERS_CAMP_ASTROLABE';
    astrolabe.position.set(0.62, 1.36, -0.12);
    [0, Math.PI / 2, Math.PI / 4].forEach((rotation, index) => {
      const ring = torus(0.42 - index * 0.052, 0.032, index === 2 ? materials.emerald : materials.brass, `ISLAND_18_EXPLORERS_CAMP_ASTROLABE_RING_${index + 1}`, 5, 6, 28);
      ring.rotation.y = rotation;
      astrolabe.add(ring);
    });
    const base = cylinder(0.18, 0.28, 0.44, materials.ruinStoneDark, 'ISLAND_18_EXPLORERS_CAMP_ASTROLABE_BASE', 5, 8);
    base.position.set(0.62, 0.72, -0.12);
    root.add(astrolabe, base);
    const telescopeStand = cylinder(0.055, 0.075, 0.82, materials.brassDark, 'ISLAND_18_EXPLORERS_CAMP_TELESCOPE_STAND', 5, 7);
    telescopeStand.position.set(-0.68, 0.94, -0.08);
    const telescope = cylinder(0.09, 0.12, 0.92, materials.brass, 'ISLAND_18_EXPLORERS_CAMP_TELESCOPE', 5, 10);
    telescope.rotation.z = Math.PI / 2 - 0.3;
    telescope.position.set(-0.48, 1.34, -0.08);
    const lens = sphere(0.11, materials.emerald, 'ISLAND_18_EXPLORERS_CAMP_TELESCOPE_LENS', 5, 10);
    lens.position.set(-0.06, 1.47, -0.08);
    lens.scale.set(0.42, 1, 1);
    root.add(telescopeStand, telescope, lens);
    addTempleBalustrade(root, 'ISLAND_18_EXPLORERS_CAMP_LOOKOUT_RAIL', [0, 0.46, 0.86], 1.56, materials, 5);
    addLeafCluster(root, 'ISLAND_18_EXPLORERS_CAMP_GARDEN', [-1.08, 0.58, -0.86], 0.36, materials);
  }
  return registerIsland18RuntimePart('explorers-camp', root, 'landmark');
}

function createLostCityTemple(level: 1 | 2 | 3, materials: Island18JungleExpeditionMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_LOST_CITY_TEMPLE';
  const court = cylinder(2.04, 2.3, 0.38, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_PROCESSIONAL_COURT', 1, 12);
  court.position.y = 0.19;
  const courtCap = cylinder(1.92, 2.04, 0.1, materials.ruinStone, 'ISLAND_18_TEMPLE_COURT_STONE_CAP', 1, 12);
  courtCap.position.y = 0.44;
  const courtMossInlay = torus(1.62, 0.055, materials.moss, 'ISLAND_18_TEMPLE_COURT_MOSS_INLAY', 5, 6, 42);
  courtMossInlay.rotation.x = Math.PI / 2;
  courtMossInlay.position.y = 0.505;
  root.add(court, courtCap, courtMossInlay);
  addStoneStairFlight(
    root,
    'ISLAND_18_TEMPLE_FRONT_PROCESSIONAL',
    new THREE.Vector3(0, 0.42, 2.18),
    new THREE.Vector3(0, 1.24, 0.84),
    1.72,
    11,
    materials.ruinStoneLight,
    1,
  );
  [-0.52, 0, 0.52].forEach((x, index) => {
    const runeRunner = beamBetween(
      new THREE.Vector3(x, 0.53, 2.08),
      new THREE.Vector3(x, 1.34, 0.78),
      index === 1 ? 0.028 : 0.022,
      index === 1 ? materials.brass : materials.brassDark,
      `ISLAND_18_TEMPLE_PROCESSIONAL_RUNE_RUNNER_${index + 1}`,
      3,
      7,
    );
    root.add(runeRunner);
  });
  [-1, 1].forEach((side) => {
    const rail = beamBetween(
      new THREE.Vector3(side * 0.94, 0.72, 2.08),
      new THREE.Vector3(side * 0.94, 1.58, 0.78),
      0.06,
      materials.ruinStoneDark,
      `ISLAND_18_TEMPLE_PROCESSIONAL_SERPENT_RAIL_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      3,
      8,
    );
    root.add(rail);
    [0.18, 0.52, 0.86].forEach((t, index) => {
      const z = THREE.MathUtils.lerp(2.08, 0.78, t);
      const y = THREE.MathUtils.lerp(0.48, 1.34, t);
      const post = cylinder(
        0.035,
        0.055,
        0.5,
        materials.ruinStone,
        `ISLAND_18_TEMPLE_PROCESSIONAL_POST_${side}_${index + 1}`,
        3,
        7,
      );
      post.position.set(side * 0.94, y + 0.16, z);
      root.add(post);
    });
    const serpentHead = presentMesh(
      new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), materials.ruinStoneLight),
      `ISLAND_18_TEMPLE_PROCESSIONAL_SERPENT_HEAD_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      3,
    );
    serpentHead.scale.set(1.35, 0.76, 1.7);
    serpentHead.position.set(side * 0.94, 1.65, 0.72);
    root.add(serpentHead);
    const serpentEye = sphere(
      0.055,
      materials.emerald,
      `ISLAND_18_TEMPLE_PROCESSIONAL_SERPENT_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      4,
      8,
    );
    serpentEye.scale.set(1.1, 0.64, 0.5);
    serpentEye.position.set(side * 0.94, 1.68, 0.59);
    root.add(serpentEye);
    const flame = sphere(
      0.09,
      materials.amber,
      `ISLAND_18_TEMPLE_PROCESSIONAL_FLAME_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      4,
      8,
    );
    flame.scale.set(0.72, 1.5, 0.72);
    flame.position.set(side * 1.22, 1.46, 0.86);
    root.add(flame);
  });

  const lowerPlinth = box(3.28, 0.46, 2.02, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_LOWER_PLINTH', 2);
  lowerPlinth.position.set(0, 0.72, -0.02);
  const lowerSanctuary = box(1.72, 1.18, 1.42, materials.ruinStone, 'ISLAND_18_TEMPLE_LOWER_SANCTUARY', 2);
  lowerSanctuary.position.set(0, 1.26, -0.12);
  const leftPylon = box(0.66, 1.46, 1.48, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_LOWER_LEFT_PYLON', 2);
  leftPylon.position.set(-1.26, 1.3, -0.09);
  const rightPylon = box(0.74, 1.7, 1.42, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_LOWER_RIGHT_PYLON', 2);
  rightPylon.position.set(1.25, 1.4, -0.12);
  const lowerCornice = box(3.08, 0.11, 1.76, materials.brassDark, 'ISLAND_18_TEMPLE_LOWER_CORNICE', 2);
  lowerCornice.position.set(0, 1.7, -0.08);
  root.add(lowerPlinth, lowerSanctuary, leftPylon, rightPylon, lowerCornice);
  const lowerWingLeft = roundedBox(0.82, 0.72, 1.68, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_LOWER_WING_LEFT', 2, 0.065, 2);
  lowerWingLeft.position.set(-1.68, 0.9, -0.12);
  const lowerWingRight = roundedBox(0.72, 0.92, 1.58, materials.ruinStone, 'ISLAND_18_TEMPLE_LOWER_WING_RIGHT', 2, 0.055, 2);
  lowerWingRight.position.set(1.7, 1.0, -0.1);
  const lowerWingLeftCap = roundedBox(0.98, 0.12, 1.82, materials.ruinStoneLight, 'ISLAND_18_TEMPLE_LOWER_WING_LEFT_CAP', 2, 0.035);
  lowerWingLeftCap.position.set(-1.68, 1.3, -0.12);
  const lowerWingRightCap = roundedBox(0.9, 0.12, 1.72, materials.brassDark, 'ISLAND_18_TEMPLE_LOWER_WING_RIGHT_CAP', 2, 0.035);
  lowerWingRightCap.position.set(1.7, 1.5, -0.1);
  root.add(lowerWingLeft, lowerWingRight, lowerWingLeftCap, lowerWingRightCap);
  addStonePortal(root, 'ISLAND_18_TEMPLE_MAIN_PORTAL', [0, 1.24, 0.69], 0.94, 1.18, materials, 2);
  addGuardianMask(root, 'ISLAND_18_TEMPLE_MAIN_GUARDIAN_RELIEF', [0, 2.08, 0.77], 0.5, materials, 3);
  const rearPortal = addStonePortal(root, 'ISLAND_18_TEMPLE_REAR_SHRINE_PORTAL', [0, 1.28, -0.86], 0.7, 0.92, materials, 3, Math.PI);
  rearPortal.position.z = -0.87;
  addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_LOWER_FACADE_LEFT', [-1.12, 1.28, 0.71], 0.92, 1.18, 5, 3, materials, 2);
  addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_LOWER_FACADE_RIGHT', [1.12, 1.3, 0.7], 0.92, 1.28, 5, 3, materials, 2);
  addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_LOWER_SIDE_LEFT', [-1.78, 1.1, -0.1], 1.42, 0.7, 3, 5, materials, 3, -Math.PI / 2);
  addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_LOWER_SIDE_RIGHT', [1.79, 1.2, -0.1], 1.36, 0.82, 4, 5, materials, 3, Math.PI / 2);
  addTempleBalustrade(root, 'ISLAND_18_TEMPLE_LOWER_BALUSTRADE_LEFT', [-1.13, 1.76, 0.82], 0.92, materials, 3);
  addTempleBalustrade(root, 'ISLAND_18_TEMPLE_LOWER_BALUSTRADE_RIGHT', [1.13, 1.78, 0.82], 0.92, materials, 3);
  addStoneStairFlight(root, 'ISLAND_18_TEMPLE_LEFT_WING_STAIR', new THREE.Vector3(-1.76, 0.45, 1.02), new THREE.Vector3(-1.55, 1.36, 0.12), 0.62, 8, materials.ruinStone, 2);
  addStoneStairFlight(root, 'ISLAND_18_TEMPLE_RIGHT_WING_STAIR', new THREE.Vector3(1.78, 0.45, 1.08), new THREE.Vector3(1.58, 1.54, 0.05), 0.62, 9, materials.ruinStoneLight, 2);
  addCarvedReliefPanel(root, 'ISLAND_18_TEMPLE_WING_RELIEF_LEFT', [-1.67, 0.96, 0.76], 0.52, materials, 3);
  addCarvedReliefPanel(root, 'ISLAND_18_TEMPLE_WING_RELIEF_RIGHT', [1.69, 1.12, 0.72], 0.48, materials, 3);
  for (let index = 0; index < 7; index += 1) {
    const rearStep = box(
      1.4 - index * 0.04,
      0.1,
      0.24,
      materials.ruinStone,
      `ISLAND_18_TEMPLE_REAR_STEP_${index + 1}`,
      3,
    );
    rearStep.position.set(0, 0.43 + index * 0.1, -1.18 + index * 0.12);
    root.add(rearStep);
  }

  [-0.76, 0.76].forEach((x, index) => {
    const column = cylinder(0.1, 0.13, 1.03, materials.ruinStone, `ISLAND_18_TEMPLE_FRONT_COLUMN_${index + 1}`, 2, 8);
    column.position.set(x, 1.19, 0.66);
    const capital = box(0.32, 0.14, 0.3, materials.brassDark, `ISLAND_18_TEMPLE_FRONT_CAPITAL_${index + 1}`, 2);
    capital.position.set(x, 1.72, 0.66);
    root.add(column, capital);
  });
  [-1.27, 1.25].forEach((x, index) => {
    const plaque = box(0.38, 0.48, 0.09, materials.ruinStone, `ISLAND_18_TEMPLE_PYLON_PLAQUE_${index + 1}`, 3);
    plaque.position.set(x, 1.34 + index * 0.12, 0.68);
    const plaqueGlyph = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), materials.brass);
    plaqueGlyph.name = `ISLAND_18_TEMPLE_PYLON_PLAQUE_GLYPH_${index + 1}`;
    plaqueGlyph.scale.set(0.72, 1, 0.28);
    plaqueGlyph.position.set(x, 1.34 + index * 0.12, 0.755);
    markStage(plaqueGlyph, 3);
    const pylonGem = sphere(0.12, materials.emerald, `ISLAND_18_TEMPLE_PYLON_GEM_${index + 1}`, 3, 10);
    pylonGem.scale.set(0.7, 1.25, 0.45);
    pylonGem.position.set(x, 1.52 + index * 0.16, 0.65);
    root.add(plaque, plaqueGlyph, pylonGem);
  });

  for (let index = 0; index < 5; index += 1) {
    const relief = box(
      index % 2 === 0 ? 0.28 : 0.18,
      0.09,
      0.08,
      index === 2 ? materials.brass : materials.brassDark,
      `ISLAND_18_TEMPLE_LOWER_GLYPH_RELIEF_${index + 1}`,
      3,
    );
    relief.position.set((index - 2) * 0.34, 1.9 + Math.abs(index - 2) * 0.035, 0.55);
    relief.rotation.z = index % 2 === 0 ? Math.PI / 4 : 0;
    root.add(relief);
  }
  [-1.66, -1.14, 1.14, 1.66].forEach((x, index) => {
    addAmberNiche(root, `ISLAND_18_TEMPLE_LOWER_LAMP_NICHE_${index + 1}`, [x, 1.04 + (index % 2) * 0.16, 0.81], materials, 3, 0.78);
  });
  addMossFringe(root, 'ISLAND_18_TEMPLE_LOWER_MOSS_FRINGE_LEFT', [-1.2, 1.77, 0.72], 1.18, 0.2, materials, 5);
  addMossFringe(root, 'ISLAND_18_TEMPLE_LOWER_MOSS_FRINGE_RIGHT', [1.18, 1.8, 0.72], 1.12, 0.2, materials, 5);
  addMossFringe(root, 'ISLAND_18_TEMPLE_WING_MOSS_FRINGE_LEFT', [-1.78, 1.34, -0.1], 1.28, 0.17, materials, 5, -Math.PI / 2);
  addMossFringe(root, 'ISLAND_18_TEMPLE_WING_MOSS_FRINGE_RIGHT', [1.8, 1.53, -0.1], 1.22, 0.17, materials, 5, Math.PI / 2);

  // The source reads as a whole stepped city rather than a single tower. These
  // lateral precincts widen the destination silhouette while staying inside
  // the canonical route corridor.
  ([-1, 1] as const).forEach((side) => {
    const sideName = side < 0 ? 'LEFT' : 'RIGHT';
    const precinct = markStage(new THREE.Group(), 2);
    precinct.name = `ISLAND_18_TEMPLE_${sideName}_PRECINCT_TERRACE`;
    const precinctCenterX = side * 2.46;
    const tunnelCenterX = side * 2.24;
    const precinctMinX = precinctCenterX - 0.64;
    const precinctMaxX = precinctCenterX + 0.64;
    const openingMinX = tunnelCenterX - 0.39;
    const openingMaxX = tunnelCenterX + 0.39;
    [
      { min: precinctMinX, max: openingMinX, material: materials.ruinStoneDark },
      { min: openingMaxX, max: precinctMaxX, material: materials.ruinStone },
    ].forEach((support, supportIndex) => {
      const width = Math.max(0.18, support.max - support.min);
      const pier = box(
        width,
        0.9,
        1.92,
        support.material,
        `${precinct.name}_TUNNEL_SUPPORT_${supportIndex + 1}`,
        2,
      );
      pier.position.set((support.min + support.max) * 0.5, 0.86, -0.18);
      precinct.add(pier);
    });
    const bridgeDeck = box(
      1.28,
      0.2,
      1.92,
      side < 0 ? materials.ruinStoneDark : materials.ruinStone,
      `${precinct.name}_ROUTE_BRIDGE_DECK`,
      2,
    );
    bridgeDeck.position.set(precinctCenterX, 1.36, -0.18);
    precinct.add(bridgeDeck);
    root.add(precinct);
    addTempleRouteTunnel(root, side, materials);
    const precinctCap = roundedBox(
      1.4,
      0.11,
      2.04,
      side < 0 ? materials.ruinStoneLight : materials.brassDark,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_CAP`,
      3,
      0.035,
    );
    precinctCap.position.set(side * 2.46, 1.51, -0.18);
    const shrine = roundedBox(
      0.72,
      side < 0 ? 1.14 : 1.36,
      0.9,
      materials.ruinStoneDark,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_SHRINE`,
      3,
      0.055,
      2,
    );
    shrine.position.set(side * 2.52, side < 0 ? 2.08 : 2.2, -0.42);
    const shrineRoof = cylinder(
      0.48,
      0.58,
      0.18,
      side < 0 ? materials.brassDark : materials.ruinStoneLight,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_SHRINE_ROOF`,
      4,
      8,
    );
    shrineRoof.position.set(side * 2.52, side < 0 ? 2.76 : 2.96, -0.42);
    root.add(precinctCap, shrine, shrineRoof);
    addStonePortal(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_PORTAL`,
      [side * 2.52, side < 0 ? 2.08 : 2.2, 0.04],
      0.48,
      0.68,
      materials,
      3,
    );
    addStoneBlockFacade(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_BLOCKWORK`,
      [side * 2.52, side < 0 ? 2.08 : 2.2, 0.045],
      0.68,
      side < 0 ? 1.02 : 1.2,
      5,
      3,
      materials,
      3,
    );
    addStoneStairFlight(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_ASCENT`,
      new THREE.Vector3(side * 3.04, 0.48, 0.84),
      new THREE.Vector3(side * 2.82, 1.52, 0.52),
      0.56,
      7,
      side < 0 ? materials.ruinStoneLight : materials.ruinStone,
      3,
    );
    addTempleBalustrade(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_RAIL`,
      [side * 2.46, 1.62, 0.78],
      1.22,
      materials,
      4,
    );
    addCarvedReliefPanel(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_RELIEF`,
      [side * 2.52, side < 0 ? 2.28 : 2.42, 0.08],
      0.38,
      materials,
      4,
    );
    addLeafCluster(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_CANOPY`,
      [side * 2.78, side < 0 ? 2.72 : 2.96, -0.58],
      side < 0 ? 0.6 : 0.66,
      materials,
      5,
    );
    addMossFringe(
      root,
      `ISLAND_18_TEMPLE_${sideName}_PRECINCT_MOSS`,
      [side * 2.46, 1.6, 0.72],
      1.28,
      0.18,
      materials,
      5,
    );
  });

  [-3, 3].forEach((x, index) => {
    const spillway = roundedBox(0.28, 0.98, 0.08, materials.waterfall, `ISLAND_18_TEMPLE_PRECINCT_SPILLWAY_${index + 1}`, 4, 0.025);
    spillway.position.set(x, 0.56, 0.86);
    const spillwayLip = roundedBox(0.52, 0.12, 0.28, materials.brassDark, `ISLAND_18_TEMPLE_PRECINCT_SPILLWAY_LIP_${index + 1}`, 4, 0.025);
    spillwayLip.position.set(x, 1.05, 0.77);
    const lowerPool = cylinder(0.34, 0.42, 0.07, materials.water, `ISLAND_18_TEMPLE_PRECINCT_POOL_${index + 1}`, 4, 12);
    lowerPool.position.set(x, 0.1, 0.92);
    root.add(spillway, spillwayLip, lowerPool);
  });

  if (level >= 2) {
    const middleTerrace = box(2.72, 0.32, 1.72, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_MIDDLE_TERRACE', 3);
    middleTerrace.position.set(-0.03, 1.9, -0.16);
    const middleSanctuary = box(1.62, 1.2, 1.18, materials.ruinStone, 'ISLAND_18_TEMPLE_MIDDLE_SANCTUARY', 3);
    middleSanctuary.position.set(-0.08, 2.38, -0.18);
    const archiveTower = box(0.62, 1.22, 0.84, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_ARCHIVE_TOWER', 3);
    archiveTower.position.set(-1.04, 2.28, -0.14);
    const sideTower = box(0.68, 1.52, 0.9, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_SIDE_TOWER', 3);
    sideTower.position.set(1.02, 2.42, -0.18);
    const middleCornice = box(1.98, 0.1, 1.24, materials.brassDark, 'ISLAND_18_TEMPLE_MIDDLE_CORNICE', 3);
    middleCornice.position.set(0.05, 3, -0.16);
    const middleMossCap = box(1.92, 0.045, 1.18, materials.moss, 'ISLAND_18_TEMPLE_MIDDLE_MOSS_CAP', 5);
    middleMossCap.position.set(-0.04, 3.105, -0.16);
    root.add(middleTerrace, middleSanctuary, sideTower, archiveTower, middleCornice, middleMossCap);
    const middleWingLeft = roundedBox(0.74, 1.1, 1.08, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_MIDDLE_WING_LEFT', 3, 0.055, 2);
    middleWingLeft.position.set(-1.4, 2.25, -0.2);
    const middleWingRight = roundedBox(0.78, 1.36, 1.02, materials.ruinStone, 'ISLAND_18_TEMPLE_MIDDLE_WING_RIGHT', 3, 0.055, 2);
    middleWingRight.position.set(1.4, 2.38, -0.18);
    const leftCrown = cylinder(0.39, 0.46, 0.24, materials.ruinStoneLight, 'ISLAND_18_TEMPLE_MIDDLE_WING_LEFT_CROWN', 4, 8);
    leftCrown.position.set(-1.4, 2.92, -0.2);
    const rightCrown = cylinder(0.42, 0.5, 0.24, materials.brassDark, 'ISLAND_18_TEMPLE_MIDDLE_WING_RIGHT_CROWN', 4, 8);
    rightCrown.position.set(1.4, 3.12, -0.18);
    root.add(middleWingLeft, middleWingRight, leftCrown, rightCrown);
    addStonePortal(root, 'ISLAND_18_TEMPLE_MIDDLE_PORTAL', [-0.08, 2.4, 0.47], 0.68, 0.86, materials, 3);
    addStonePortal(root, 'ISLAND_18_TEMPLE_ARCHIVE_PORTAL', [-1.05, 2.27, 0.34], 0.42, 0.56, materials, 4);
    addStonePortal(root, 'ISLAND_18_TEMPLE_SIDE_PORTAL', [1.03, 2.46, 0.35], 0.46, 0.62, materials, 4);
    addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_MIDDLE_BLOCKS', [-0.08, 2.4, 0.48], 1.58, 1.12, 5, 5, materials, 3);
    addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_ARCHIVE_BLOCKS', [-1.4, 2.24, 0.36], 0.68, 1.02, 5, 2, materials, 4);
    addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_SIDE_TOWER_BLOCKS', [1.4, 2.4, 0.35], 0.72, 1.28, 6, 2, materials, 4);
    addTempleBalustrade(root, 'ISLAND_18_TEMPLE_MIDDLE_GALLERY', [0, 3.14, 0.52], 2.42, materials, 4);
    addTempleBalustrade(root, 'ISLAND_18_TEMPLE_ARCHIVE_GALLERY', [-1.44, 3.02, 0.23], 0.74, materials, 4);
    addTempleBalustrade(root, 'ISLAND_18_TEMPLE_SIDE_GALLERY', [1.42, 3.22, 0.2], 0.78, materials, 4);
    [-1.38, -0.72, 0.58, 1.38].forEach((x, index) => {
      addAmberNiche(root, `ISLAND_18_TEMPLE_MIDDLE_LAMP_NICHE_${index + 1}`, [x, 2.46 + (index % 2) * 0.16, 0.53], materials, 4, 0.66);
    });
    addMossFringe(root, 'ISLAND_18_TEMPLE_MIDDLE_MOSS_FRINGE', [0, 3.13, 0.46], 2.44, 0.18, materials, 5);
    addMossFringe(root, 'ISLAND_18_TEMPLE_ARCHIVE_MOSS_FRINGE', [-1.4, 3.04, 0.28], 0.72, 0.16, materials, 5);
    addMossFringe(root, 'ISLAND_18_TEMPLE_SIDE_MOSS_FRINGE', [1.4, 3.24, 0.28], 0.76, 0.16, materials, 5);
    [-0.56, 0.46].forEach((x, index) => {
      const shrineColumn = cylinder(0.075, 0.095, 0.82, materials.brass, `ISLAND_18_TEMPLE_SHRINE_COLUMN_${index + 1}`, 4, 8);
      shrineColumn.position.set(x, 2.4, 0.46);
      root.add(shrineColumn);
    });
    for (let index = 0; index < 6; index += 1) {
      const buttress = box(0.18, 0.82 + (index % 2) * 0.2, 0.28, materials.ruinStone, `ISLAND_18_TEMPLE_BUTTRESS_${index + 1}`, 3);
      const side = index < 3 ? -1 : 1;
      buttress.position.set(side * (1.47 + (index % 3) * 0.06), 1.55, 0.48 - (index % 3) * 0.56);
      buttress.rotation.z = side * 0.08;
      root.add(buttress);
    }
    [-0.72, 0, 0.72].forEach((x, index) => {
      const archiveRelief = box(0.24, 0.32, 0.07, materials.brassDark, `ISLAND_18_TEMPLE_ARCHIVE_RELIEF_${index + 1}`, 4);
      archiveRelief.position.set(x, 2.64 + (index % 2) * 0.12, 0.44);
      const inset = box(0.1, 0.18, 0.075, index === 1 ? materials.emerald : materials.ruinStone, `ISLAND_18_TEMPLE_ARCHIVE_RELIEF_INSET_${index + 1}`, 4);
      inset.position.set(x, 2.64 + (index % 2) * 0.12, 0.49);
      root.add(archiveRelief, inset);
    });
    addTieredStairs(root, 'ISLAND_18_TEMPLE_SIDE', 0.72, 1.2, 8, 0.45, -0.9, materials.ruinStone, 3);
    root.children.slice(-8).forEach((child) => {
      if (child.name.startsWith('ISLAND_18_TEMPLE_SIDE_STEP')) child.position.x = 1.05;
    });
    addStoneStairFlight(root, 'ISLAND_18_TEMPLE_ASCENT_LEFT', new THREE.Vector3(-1.18, 1.72, 0.7), new THREE.Vector3(-0.72, 3.06, 0.36), 0.58, 11, materials.ruinStoneLight, 3);
    addStoneStairFlight(root, 'ISLAND_18_TEMPLE_ASCENT_RIGHT', new THREE.Vector3(1.5, 1.72, -0.02), new THREE.Vector3(0.76, 3.08, 0.28), 0.55, 11, materials.ruinStone, 3);
    addGuardianMask(root, 'ISLAND_18_TEMPLE_MIDDLE_GUARDIAN_LEFT', [-1.4, 2.48, 0.38], 0.34, materials, 4);
    addGuardianMask(root, 'ISLAND_18_TEMPLE_MIDDLE_GUARDIAN_RIGHT', [1.4, 2.62, 0.38], 0.34, materials, 4);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_MIDDLE_JUNGLE_LEFT', [-1.58, 3.02, -0.28], 0.54, materials, 5);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_MIDDLE_JUNGLE_RIGHT', [1.52, 3.2, -0.14], 0.58, materials, 5);

    // The rear is a second civic face of the Lost City, not the blank back of
    // the hero facade. Projecting galleries and archive towers keep the temple
    // readable while the camera circles through the rear cloud sector.
    const rearGallery = markStage(new THREE.Group(), 4);
    rearGallery.name = 'ISLAND_18_TEMPLE_REAR_PROCESSIONAL_GALLERY';
    const rearGalleryDeck = box(2.66, 0.2, 0.74, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_REAR_GALLERY_DECK', 4);
    rearGalleryDeck.position.set(0, 1.88, -0.94);
    const rearGalleryCap = box(2.86, 0.09, 0.82, materials.ruinStoneLight, 'ISLAND_18_TEMPLE_REAR_GALLERY_CAP', 4);
    rearGalleryCap.position.set(0, 2.01, -0.96);
    const rearGalleryCanopy = box(2.48, 0.13, 0.72, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_REAR_GALLERY_CANOPY', 4);
    rearGalleryCanopy.position.set(0, 2.92, -0.91);
    const rearGalleryCornice = box(2.72, 0.08, 0.12, materials.brassDark, 'ISLAND_18_TEMPLE_REAR_GALLERY_CORNICE', 4);
    rearGalleryCornice.position.set(0, 2.99, -1.22);
    const rearGalleryMoss = box(2.38, 0.055, 0.68, materials.moss, 'ISLAND_18_TEMPLE_REAR_GALLERY_MOSS_CAP', 5);
    rearGalleryMoss.position.set(0, 3.015, -0.9);
    rearGallery.add(rearGalleryDeck, rearGalleryCap, rearGalleryCanopy, rearGalleryCornice, rearGalleryMoss);
    [-0.96, -0.34, 0.34, 0.96].forEach((x, index) => {
      const column = cylinder(
        0.065,
        0.085,
        0.82,
        index % 2 === 0 ? materials.ruinStoneLight : materials.brassDark,
        `ISLAND_18_TEMPLE_REAR_GALLERY_COLUMN_${index + 1}`,
        4,
        6,
      );
      column.position.set(x, 2.48, -1.18);
      const capital = box(0.22, 0.1, 0.22, materials.brass, `ISLAND_18_TEMPLE_REAR_GALLERY_CAPITAL_${index + 1}`, 4);
      capital.position.set(x, 2.9, -1.18);
      rearGallery.add(column, capital);
    });
    [-0.72, 0, 0.72].forEach((x, index) => {
      const recess = box(0.34, 0.48, 0.1, materials.ruinStoneDark, `ISLAND_18_TEMPLE_REAR_ARCHIVE_NICHE_${index + 1}`, 4);
      recess.position.set(x, 2.45 + (index % 2) * 0.08, -0.82);
      const glow = box(0.17, 0.29, 0.11, index === 1 ? materials.emerald : materials.amber, `ISLAND_18_TEMPLE_REAR_ARCHIVE_GLOW_${index + 1}`, 4);
      glow.position.set(x, 2.43 + (index % 2) * 0.08, -0.885);
      const lintel = box(0.46, 0.08, 0.14, materials.brass, `ISLAND_18_TEMPLE_REAR_ARCHIVE_LINTEL_${index + 1}`, 4);
      lintel.position.set(x, 2.74 + (index % 2) * 0.08, -0.89);
      rearGallery.add(recess, glow, lintel);
    });
    root.add(rearGallery);
    addTempleBalustrade(root, 'ISLAND_18_TEMPLE_REAR_GALLERY_RAIL', [0, 2.02, -1.29], 2.56, materials, 4, Math.PI);

    [-1, 1].forEach((side) => {
      const sideName = side < 0 ? 'LEFT' : 'RIGHT';
      const lowerButtress = box(0.74, 0.68, 0.84, materials.ruinStoneDark, `ISLAND_18_TEMPLE_REAR_${sideName}_BUTTRESS`, 4);
      lowerButtress.position.set(side * 1.55, 1.69, -0.72);
      const archiveTowerRear = box(0.5, 1.24, 0.6, side < 0 ? materials.ruinStone : materials.ruinStoneDark, `ISLAND_18_TEMPLE_REAR_${sideName}_ARCHIVE_TOWER`, 4);
      archiveTowerRear.position.set(side * 1.55, 2.43 + (side > 0 ? 0.12 : 0), -0.78);
      const towerCap = cylinder(0.34, 0.4, 0.17, side < 0 ? materials.brassDark : materials.ruinStoneLight, `ISLAND_18_TEMPLE_REAR_${sideName}_ARCHIVE_CAP`, 4, 6);
      towerCap.position.set(side * 1.55, 3.12 + (side > 0 ? 0.12 : 0), -0.78);
      const towerGlow = box(0.16, 0.31, 0.09, materials.amber, `ISLAND_18_TEMPLE_REAR_${sideName}_ARCHIVE_BEACON`, 4);
      towerGlow.position.set(side * 1.55, 2.5 + (side > 0 ? 0.12 : 0), -1.095);
      root.add(lowerButtress, archiveTowerRear, towerCap, towerGlow);

      for (let index = 0; index < 7; index += 1) {
        const t = index / 6;
        const stair = box(
          0.5 - t * 0.04,
          0.1,
          0.24,
          side < 0 ? materials.ruinStoneLight : materials.ruinStone,
          `ISLAND_18_TEMPLE_REAR_${sideName}_ASCENT_STEP_${index + 1}`,
          4,
        );
        stair.position.set(
          side * THREE.MathUtils.lerp(1.92, 1.34, t),
          THREE.MathUtils.lerp(1.1, 1.82, t),
          THREE.MathUtils.lerp(-1.24, -0.98, t),
        );
        stair.rotation.y = -side * 0.42;
        root.add(stair);
      }
      addLeafCluster(
        root,
        `ISLAND_18_TEMPLE_REAR_${sideName}_GALLERY_GARDEN`,
        [side * 1.34, 3.18 + (side > 0 ? 0.1 : 0), -0.9],
        0.4,
        materials,
        5,
      );
    });
  }

  if (level >= 3) {
    const crownDrum = cylinder(0.74, 0.86, 0.34, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_CROWN_DRUM', 4, 8);
    crownDrum.position.set(0.02, 3.28, -0.18);
    const crown = box(1.42, 1.2, 1.02, materials.ruinStone, 'ISLAND_18_TEMPLE_CROWN_TOWER', 4);
    crown.position.set(0.02, 3.82, -0.17);
    const crownCornice = box(1.62, 0.1, 1.12, materials.brassDark, 'ISLAND_18_TEMPLE_CROWN_CORNICE', 4);
    crownCornice.position.set(0.02, 4.37, -0.17);
    const crownMossCap = box(1.54, 0.045, 1.08, materials.moss, 'ISLAND_18_TEMPLE_CROWN_MOSS_CAP', 5);
    crownMossCap.position.set(0.02, 4.47, -0.17);
    root.add(crownDrum, crown, crownCornice, crownMossCap);
    addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_CROWN_BLOCKWORK_FRONT', [0.02, 3.83, 0.33], 1.08, 1.02, 5, 4, materials, 4);
    addStoneBlockFacade(root, 'ISLAND_18_TEMPLE_CROWN_BLOCKWORK_REAR', [0.02, 3.82, -0.67], 1.08, 0.98, 5, 4, materials, 5, Math.PI);
    addTempleBalustrade(root, 'ISLAND_18_TEMPLE_CROWN_BALUSTRADE_FRONT', [0.02, 4.48, 0.35], 1.42, materials, 5);
    const crownRoofLower = roundedBox(1.78, 0.14, 1.28, materials.ruinStoneDark, 'ISLAND_18_TEMPLE_CROWN_ROOF_LOWER', 5, 0.04);
    crownRoofLower.position.set(0.02, 4.62, -0.17);
    const crownRoofMiddle = roundedBox(1.48, 0.14, 1.08, materials.ruinStoneLight, 'ISLAND_18_TEMPLE_CROWN_ROOF_MIDDLE', 5, 0.035);
    crownRoofMiddle.position.set(0.02, 4.76, -0.17);
    const crownRoofUpper = roundedBox(1.08, 0.14, 0.82, materials.brassDark, 'ISLAND_18_TEMPLE_CROWN_ROOF_UPPER', 5, 0.03);
    crownRoofUpper.position.set(0.02, 4.9, -0.17);
    root.add(crownRoofLower, crownRoofMiddle, crownRoofUpper);
    for (let index = 0; index < 5; index += 1) {
      const crownGlyph = cone(
        0.08 + (index % 2) * 0.025,
        0.34 + (index % 3) * 0.08,
        index === 2 ? materials.brass : materials.brassDark,
        `ISLAND_18_TEMPLE_CROWN_GLYPH_${index + 1}`,
        5,
        4,
      );
      crownGlyph.position.set((index - 2) * 0.22, 4.32 + (index % 2) * 0.08, 0.34);
      crownGlyph.rotation.z = (index - 2) * 0.12;
      root.add(crownGlyph);
    }
    addGuardianMask(root, 'ISLAND_18_TEMPLE_GUARDIAN_CROWN', [0.02, 3.92, 0.47], 1.46, materials, 4);
    const rearGuardian = addGuardianMask(root, 'ISLAND_18_TEMPLE_REAR_GUARDIAN', [0.02, 3.7, -0.66], 0.56, materials, 5);
    rearGuardian.rotation.y = Math.PI;
    [-0.72, 0.72].forEach((x, index) => {
      const crystal = cone(0.13, 0.64, materials.emerald, `ISLAND_18_TEMPLE_CROWN_CRYSTAL_${index + 1}`, 5, 6);
      crystal.position.set(x, 4.7, -0.1);
      root.add(crystal);
    });
    [-1, 1].forEach((side) => {
      const watchTower = roundedBox(0.54, 1.18, 0.62, side < 0 ? materials.ruinStoneDark : materials.ruinStone, `ISLAND_18_TEMPLE_CROWN_WATCHTOWER_${side < 0 ? 'LEFT' : 'RIGHT'}`, 5, 0.05, 2);
      watchTower.position.set(side * 1.12, 3.68 + (side > 0 ? 0.18 : 0), -0.2);
      const watchCap = cylinder(0.34, 0.42, 0.22, side < 0 ? materials.brassDark : materials.ruinStoneLight, `ISLAND_18_TEMPLE_CROWN_WATCHTOWER_CAP_${side < 0 ? 'LEFT' : 'RIGHT'}`, 5, 8);
      watchCap.position.set(side * 1.12, 4.36 + (side > 0 ? 0.18 : 0), -0.2);
      const watchEye = sphere(0.1, materials.emerald, `ISLAND_18_TEMPLE_CROWN_WATCHTOWER_EYE_${side < 0 ? 'LEFT' : 'RIGHT'}`, 5, 10);
      watchEye.scale.set(1.15, 0.62, 0.48);
      watchEye.position.set(side * 1.12, 3.88 + (side > 0 ? 0.18 : 0), 0.13);
      root.add(watchTower, watchCap, watchEye);
      for (let index = 0; index < 3; index += 1) {
        const crownFin = cone(0.09 + index * 0.015, 0.48 + index * 0.11, index === 1 ? materials.brass : materials.ruinStoneLight, `ISLAND_18_TEMPLE_CROWN_WATCHTOWER_FIN_${side}_${index + 1}`, 5, 5);
        crownFin.position.set(side * (1.12 + (index - 1) * 0.18), 4.65 + (side > 0 ? 0.18 : 0) + index * 0.06, -0.2);
        crownFin.rotation.z = -side * (index - 1) * 0.18;
        root.add(crownFin);
      }
    });
    addStoneStairFlight(root, 'ISLAND_18_TEMPLE_CROWN_ASCENT', new THREE.Vector3(0.74, 3.1, 0.46), new THREE.Vector3(0.34, 4.5, 0.4), 0.46, 12, materials.ruinStoneLight, 5);
    addCarvedReliefPanel(root, 'ISLAND_18_TEMPLE_CROWN_RELIC_PANEL', [0.02, 4.16, 0.39], 0.56, materials, 5);
    addMossFringe(root, 'ISLAND_18_TEMPLE_CROWN_MOSS_FRINGE', [0.02, 4.52, 0.38], 1.34, 0.16, materials, 5);
    addAmberNiche(root, 'ISLAND_18_TEMPLE_CROWN_LAMP_LEFT', [-0.38, 3.82, 0.4], materials, 5, 0.62);
    addAmberNiche(root, 'ISLAND_18_TEMPLE_CROWN_LAMP_RIGHT', [0.38, 3.82, 0.4], materials, 5, 0.62);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_CROWN_FOLIAGE_LEFT', [-0.8, 4.28, -0.26], 0.58, materials);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_CROWN_FOLIAGE_RIGHT', [0.83, 4.2, -0.02], 0.62, materials);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_LOWER_FOLIAGE_LEFT', [-1.8, 1.48, 0.18], 0.7, materials);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_LOWER_FOLIAGE_RIGHT', [1.78, 1.66, -0.18], 0.74, materials);
    addLeafCluster(root, 'ISLAND_18_TEMPLE_BALCONY_FOLIAGE', [-0.4, 3.2, 0.38], 0.48, materials);
    addVine(root, 'ISLAND_18_TEMPLE_FRONT_HANGING_VINE', [
      new THREE.Vector3(-1.18, 3.05, 0.72), new THREE.Vector3(-1.3, 2.42, 0.78),
      new THREE.Vector3(-1.02, 1.78, 0.82), new THREE.Vector3(-1.14, 1.06, 0.78),
    ], materials.vine, 5, 0.036);
    addVine(root, 'ISLAND_18_TEMPLE_SIDE_HANGING_VINE', [
      new THREE.Vector3(1.26, 4.5, -0.12), new THREE.Vector3(1.45, 3.72, -0.02),
      new THREE.Vector3(1.34, 2.95, 0.12), new THREE.Vector3(1.55, 2.18, 0.1),
    ], materials.vine, 5, 0.034);
    addVine(root, 'ISLAND_18_TEMPLE_REAR_HANGING_VINE', [
      new THREE.Vector3(-0.82, 4.35, -0.66), new THREE.Vector3(-1.02, 3.52, -0.76),
      new THREE.Vector3(-0.86, 2.68, -0.82), new THREE.Vector3(-1.08, 1.78, -0.86),
    ], materials.vine, 5, 0.034);
    addLostCityOrnamentPass(root, materials);
  }

  registerIsland18RuntimePart('lost-city-temple-shell', root, 'landmark');
  const focus = new THREE.Object3D();
  focus.name = 'ISLAND_18_BOSS_FOCUS_SOCKET';
  focus.position.set(0, level >= 3 ? 2.75 : 1.7, 0.2);
  root.add(focus);
  return root;
}

function createFoundationPlot(
  definition: Island5LandmarkDefinition,
  materials: Island18JungleExpeditionMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_18_${definition.id.toUpperCase()}_FOUNDATION_PLOT`;
  root.position.set(...definition.position);
  const radius = definition.id === 'boss' ? 1.82 : 1.16;
  const foundation = cylinder(radius, radius * 1.12, 0.24, materials.ruinStoneDark, `ISLAND_18_${definition.id.toUpperCase()}_FOUNDATION`, 1, definition.id === 'boss' ? 12 : 10);
  foundation.position.y = 0.12;
  const mossRing = torus(radius * 0.72, 0.06, materials.moss, `ISLAND_18_${definition.id.toUpperCase()}_FOUNDATION_MOSS_RING`, 1, 6, 28);
  mossRing.rotation.x = Math.PI / 2;
  mossRing.position.y = 0.27;
  root.add(foundation, mossRing);
  const focus = new THREE.Object3D();
  focus.name = `ISLAND_18_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focus.position.y = 0.42;
  root.add(focus);
  root.userData.landmarkId = definition.id;
  root.userData.buildLevel = 0;
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    sockets: { focus: `ISLAND_18_${definition.id.toUpperCase()}_FOCUS_SOCKET` },
    colliders: [{ id: `island-018-${definition.id}`, type: 'cylinder', isTrigger: true }],
  };
  return root;
}

export function buildIsland18JungleExpeditionLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island18JungleExpeditionMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  if (level === 0) return createFoundationPlot(definition, materials);
  const resolvedLevel = Math.max(1, level) as 1 | 2 | 3;
  const architecture = definition.id === 'boss'
    ? createLostCityTemple(resolvedLevel, materials)
    : definition.id === 'hatchery'
      ? createExplorerNest(resolvedLevel, materials)
      : definition.id === 'habit'
        ? createJunglePath(resolvedLevel, materials)
        : definition.id === 'event'
          ? createSurvivalTrials(resolvedLevel, materials)
          : createExplorersCamp(resolvedLevel, materials);
  architecture.position.set(...definition.position);
  if (definition.id !== 'boss') {
    architecture.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
    const outward = new THREE.Vector2(definition.position[0], definition.position[2]).normalize();
    const offset = definition.id === 'hatchery' ? 0.36 : definition.id === 'habit' ? 0.28 : 0.18;
    architecture.position.x += outward.x * offset;
    architecture.position.z += outward.y * offset;
  } else {
    // L1 establishes the final temple envelope; L2/L3 add chambers, crown and
    // relic detail without rescaling already funded stonework.
    const bossScale = 1.52;
    architecture.scale.set(bossScale, bossScale * 1.1, bossScale);
  }
  architecture.userData.landmarkId = definition.id;
  architecture.userData.buildLevel = level;
  architecture.userData.constructionPreview = options.constructionPreview ?? null;
  if (options.constructionPreview === 'target') {
    applyIslandConstructionAuthoring({
      root: architecture,
      worldSourceNumber: 18,
      landmarkId: definition.id,
      quality,
      includeTemporaryRig: true,
    });
  }
  if (!options.constructionPreview) {
    compactIsland18LandmarkGeometry(architecture, `ISLAND_18_${definition.id.toUpperCase()}_STATIC`);
  }
  architecture.userData.sculptRuntime = {
    ...(architecture.userData.sculptRuntime ?? {}),
    clickable: true,
    explodable: true,
    sockets: { focus: `ISLAND_18_${definition.id.toUpperCase()}_FOCUS_SOCKET` },
    colliders: [{ id: `island-018-${definition.id}`, type: 'cylinder', isTrigger: true }],
  };
  const focus = new THREE.Object3D();
  focus.name = `ISLAND_18_${definition.id.toUpperCase()}_FOCUS_SOCKET`;
  focus.position.y = definition.id === 'boss' ? 2.8 : 1.45;
  architecture.add(focus);
  return architecture;
}

function sampleJungleBasinHeight(radius: number, angle: number) {
  const rise = THREE.MathUtils.smoothstep(radius, 5.1, 46);
  const ridgeStrength = THREE.MathUtils.smoothstep(radius, 7, 17);
  const ridge = (
    Math.sin(angle * 3 + radius * 0.17) * 0.34
    + Math.cos(angle * 5 - radius * 0.09) * 0.18
  ) * ridgeStrength;
  // The legacy cliff remains intact, but the valley floor now rises around its
  // lower rock mass so the whole composition reads as a rooted jungle mesa.
  return -1.18 + rise * 1.32 + ridge * 0.58;
}

function cloneColoredBasinGeometry(
  source: THREE.BufferGeometry,
  transform: THREE.Matrix4,
  color: THREE.Color,
) {
  const clone = source.clone();
  const geometry = clone.index ? clone.toNonIndexed() : clone;
  if (geometry !== clone) clone.dispose();
  geometry.applyMatrix4(transform);
  for (const attributeName of Object.keys(geometry.attributes)) {
    if (attributeName !== 'position' && attributeName !== 'normal') geometry.deleteAttribute(attributeName);
  }
  if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
  const colors = new Float32Array(geometry.getAttribute('position').count * 3);
  for (let offset = 0; offset < colors.length; offset += 3) {
    colors[offset] = color.r;
    colors[offset + 1] = color.g;
    colors[offset + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geometry;
}

function createJungleBasinWaterGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const brightBank = new THREE.Color(0xe6fff8);
  const shallowTurquoise = new THREE.Color(0x8af4d8);
  const deepCurrent = new THREE.Color(0x087c82);
  const streamAngles = [0.12, 0.72, 1.56, 3.02, 4.45, 5.36] as const;
  streamAngles.forEach((baseAngle, streamIndex) => {
    const firstVertex = positions.length / 3;
    const segmentCount = 12;
    for (let segment = 0; segment <= segmentCount; segment += 1) {
      const t = segment / segmentCount;
      const radius = THREE.MathUtils.lerp(6.05, 31 + (streamIndex % 3) * 1.8, t);
      const angle = baseAngle
        + Math.sin(t * Math.PI * (1.4 + streamIndex % 2 * 0.24) + streamIndex) * (0.05 + t * 0.09);
      const widthPulse = 1 + Math.sin(t * Math.PI * 5 + streamIndex * 1.7) * 0.1;
      const foregroundStream = streamIndex === 2;
      const outerWidth = foregroundStream ? 3.45 : streamIndex === 1 ? 2.05 : 1.5 + (streamIndex % 2) * 0.22;
      const width = THREE.MathUtils.lerp(foregroundStream ? 1.12 : 0.62, outerWidth, t) * widthPulse;
      const centerX = Math.cos(angle) * radius;
      const centerZ = Math.sin(angle) * radius;
      const y = sampleJungleBasinHeight(radius, angle)
        + (foregroundStream ? 1.18 : 0.18)
        + Math.sin(t * Math.PI * 8 + streamIndex) * 0.018;
      const sideX = -Math.sin(angle) * width * 0.5;
      const sideZ = Math.cos(angle) * width * 0.5;
      positions.push(
        centerX + sideX, y + 0.014, centerZ + sideZ,
        centerX, y - 0.035, centerZ,
        centerX - sideX, y + 0.014, centerZ - sideZ,
      );
      uvs.push(0, t * 7.5, 0.5, t * 7.5, 1, t * 7.5);
      [brightBank, deepCurrent, foregroundStream ? brightBank : shallowTurquoise].forEach((waterColor) => {
        colors.push(waterColor.r, waterColor.g, waterColor.b);
      });
      if (segment < segmentCount) {
        const a = firstVertex + segment * 3;
        const b = a + 1;
        const c = a + 2;
        const d = a + 3;
        const e = a + 4;
        const f = a + 5;
        indices.push(a, d, b, d, e, b, b, e, c, e, f, c);
      }
    }

    const poolCenterIndex = positions.length / 3;
    const foregroundStream = streamIndex === 2;
    const poolRadius = foregroundStream ? 2.55 : 0.72 + (streamIndex % 3) * 0.08;
    const poolWorldRadius = foregroundStream ? 15.2 : 6.18;
    const poolX = Math.cos(baseAngle) * poolWorldRadius;
    const poolZ = Math.sin(baseAngle) * poolWorldRadius;
    const poolY = sampleJungleBasinHeight(poolWorldRadius, baseAngle) + (foregroundStream ? 1.16 : 0.16);
    positions.push(poolX, poolY, poolZ);
    uvs.push(0.5, 0.5);
    colors.push(deepCurrent.r, deepCurrent.g, deepCurrent.b);
    for (let point = 0; point < 10; point += 1) {
      const angle = point / 10 * Math.PI * 2;
      positions.push(
        poolX + Math.cos(angle) * poolRadius,
        poolY,
        poolZ + Math.sin(angle) * poolRadius * 0.72,
      );
      uvs.push(0.5 + Math.cos(angle) * 0.5, 0.5 + Math.sin(angle) * 0.5);
      colors.push(brightBank.r, brightBank.g, brightBank.b);
    }
    for (let point = 0; point < 10; point += 1) {
      indices.push(
        poolCenterIndex,
        poolCenterIndex + 1 + point,
        poolCenterIndex + 1 + (point + 1) % 10,
      );
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createJungleCanopyVolume(
  profile: Island3DQualityProfile,
  material: THREE.ShaderMaterial,
) {
  const count = profile.id === 'high' ? 1200 : profile.id === 'medium' ? 800 : 500;
  const positions = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const palette = [
    new THREE.Color(0x1e7434),
    new THREE.Color(0x2c8d42),
    new THREE.Color(0x3f9a43),
    new THREE.Color(0x65ad4e),
    new THREE.Color(0x8abc58),
  ] as const;
  const streamClearings = [0.12, 0.72, 1.56, 3.02, 4.45, 5.36] as const;
  const random01 = (seed: number) => {
    const value = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  for (let index = 0; index < count; index += 1) {
    let angle = random01(index * 3.17 + 1.9) * Math.PI * 2;
    const nearStream = streamClearings.some((streamAngle) => (
      Math.abs(Math.atan2(Math.sin(angle - streamAngle), Math.cos(angle - streamAngle))) < 0.055
    ));
    if (nearStream) angle += index % 2 === 0 ? 0.09 : -0.09;
    const radialRandom = random01(index * 7.73 + 4.1);
    const radius = Math.sqrt(8.2 * 8.2 + radialRandom * (44.8 * 44.8 - 8.2 * 8.2));
    const y = sampleJungleBasinHeight(radius, angle)
      + 1.18
      + random01(index * 11.41 + 2.7) * 1.22;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = y;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
    const color = palette[(index * 7 + Math.floor(radius)) % palette.length];
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
    sizes[index] = 1.82 + random01(index * 13.37 + 8.2) * 1.86 + (radius > 28 ? 0.42 : 0);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('canopySize', new THREE.BufferAttribute(sizes, 1));
  const canopy = new THREE.Points(geometry, material);
  canopy.name = 'ISLAND_18_BASIN_CANOPY_VOLUME';
  canopy.userData.clusterCount = count;
  canopy.frustumCulled = false;
  registerIsland18RuntimePart('jungle-canopy-and-vines', canopy, 'volumetric-basin-canopy');
  return canopy;
}

function addFaunaGeometryAttributes(
  geometry: THREE.BufferGeometry,
  motionCode: number,
  anchor: THREE.Vector3,
) {
  const vertexCount = geometry.getAttribute('position').count;
  const roles = new Float32Array(vertexCount);
  roles.fill(motionCode);
  const anchors = new Float32Array(vertexCount * 3);
  for (let index = 0; index < vertexCount; index += 1) {
    anchors[index * 3] = anchor.x;
    anchors[index * 3 + 1] = anchor.y;
    anchors[index * 3 + 2] = anchor.z;
  }
  geometry.setAttribute('faunaRole', new THREE.BufferAttribute(roles, 1));
  geometry.setAttribute('faunaAnchor', new THREE.BufferAttribute(anchors, 3));
  return geometry;
}

function ensureFaunaGeometryAttributes(geometry: THREE.BufferGeometry) {
  const vertexCount = geometry.getAttribute('position').count;
  if (!geometry.getAttribute('faunaRole')) {
    geometry.setAttribute('faunaRole', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
  }
  if (!geometry.getAttribute('faunaAnchor')) {
    geometry.setAttribute('faunaAnchor', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  }
}

function createJungleBasinFaunaGeometry(profile: Island3DQualityProfile) {
  const faunaCatalog = [
    { species: 'red-eyed-tree-frog', radius: 7, angle: 1.82, kind: 'frog', motionCode: 1, body: 0x55d44f, accent: 0xff5b34, scale: 0.9, heightOffset: 0.08 },
    { species: 'emerald-iguana', radius: 8.6, angle: 1.28, kind: 'iguana', motionCode: 2, body: 0x4dbb45, accent: 0xc5ef5b, scale: 1.1, heightOffset: 0.06 },
    { species: 'lowland-tapir', radius: 11.2, angle: 1.93, kind: 'tapir', motionCode: 3, body: 0x4a352f, accent: 0xd6c7a8, scale: 1.25, heightOffset: 0 },
    { species: 'white-faced-capuchin', radius: 9.4, angle: 1.08, kind: 'monkey', motionCode: 4, body: 0x4c382b, accent: 0xe7d6b6, scale: 1, heightOffset: 1.02 },
    { species: 'keel-billed-toucan', radius: 11.4, angle: 1.35, kind: 'toucan', motionCode: 5, body: 0x182322, accent: 0xffc52d, scale: 1, heightOffset: 1.48 },
    { species: 'amazon-river-turtle', radius: 13.5, angle: 1.68, kind: 'turtle', motionCode: 6, body: 0x476a35, accent: 0xb7a548, scale: 1.1, heightOffset: -0.12 },
    { species: 'golden-poison-dart-frog', radius: 10.4, angle: 2, kind: 'frog', motionCode: 1, body: 0xffc928, accent: 0x191b22, scale: 0.85, heightOffset: 0.04 },
    { species: 'ring-tailed-coati', radius: 12.8, angle: 2.12, kind: 'coati', motionCode: 7, body: 0x865f3a, accent: 0xd9b878, scale: 1.15, heightOffset: 0 },
    { species: 'golden-jaguar', radius: 15.2, angle: 1.94, kind: 'jaguar', motionCode: 8, body: 0xd59a32, accent: 0x31271f, scale: 1.25, heightOffset: 0 },
    { species: 'greater-capybara', radius: 15.6, angle: 1.21, kind: 'capybara', motionCode: 9, body: 0x8e623c, accent: 0xd4a66d, scale: 1.3, heightOffset: -0.02 },
    { species: 'spectacled-caiman', radius: 17.2, angle: 1.62, kind: 'caiman', motionCode: 10, body: 0x365f38, accent: 0xa5b65a, scale: 1.4, heightOffset: -0.34 },
    { species: 'brown-throated-sloth', radius: 14.2, angle: 2.2, kind: 'sloth', motionCode: 11, body: 0x71604e, accent: 0xd9c8a5, scale: 1.1, heightOffset: 1.46 },
  ] as const;
  const individualCount = profile.id === 'high' ? faunaCatalog.length : profile.id === 'medium' ? 8 : 6;
  const bodySource = new THREE.DodecahedronGeometry(1, 0);
  const detailSource = new THREE.TetrahedronGeometry(1, 0);
  const taperSource = new THREE.ConeGeometry(1, 1, 5);
  const limbSource = new THREE.BoxGeometry(1, 1, 1);
  const branchSource = new THREE.CylinderGeometry(1, 1, 1, 5, 1);
  const sources = [bodySource, detailSource, taperSource, limbSource, branchSource];
  const geometries: THREE.BufferGeometry[] = [];
  const anchorMatrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();
  const anchorQuaternion = new THREE.Quaternion();
  const localQuaternion = new THREE.Quaternion();
  const localEuler = new THREE.Euler();
  const one = new THREE.Vector3(1, 1, 1);
  const activeFaunaAnchor = new THREE.Vector3();
  let activeFaunaMotionCode = 0;
  const addPart = (
    source: THREE.BufferGeometry,
    anchor: THREE.Matrix4,
    position: readonly [number, number, number],
    scale: readonly [number, number, number],
    color: THREE.ColorRepresentation,
    rotation: readonly [number, number, number] = [0, 0, 0],
  ) => {
    localQuaternion.setFromEuler(localEuler.set(rotation[0], rotation[1], rotation[2]));
    localMatrix.compose(new THREE.Vector3(...position), localQuaternion, new THREE.Vector3(...scale));
    worldMatrix.multiplyMatrices(anchor, localMatrix);
    const geometry = cloneColoredBasinGeometry(source, worldMatrix, new THREE.Color(color));
    geometries.push(addFaunaGeometryAttributes(geometry, activeFaunaMotionCode, activeFaunaAnchor));
  };
  const addHabitatPart = (
    anchor: THREE.Matrix4,
    position: readonly [number, number, number],
    scale: readonly [number, number, number],
    color: THREE.ColorRepresentation,
    rotation: readonly [number, number, number] = [0, 0, 0],
  ) => {
    localQuaternion.setFromEuler(localEuler.set(rotation[0], rotation[1], rotation[2]));
    localMatrix.compose(new THREE.Vector3(...position), localQuaternion, new THREE.Vector3(...scale));
    worldMatrix.multiplyMatrices(anchor, localMatrix);
    geometries.push(cloneColoredBasinGeometry(branchSource, worldMatrix, new THREE.Color(color)));
  };

  faunaCatalog.slice(0, individualCount).forEach((fauna, index) => {
    const groundY = sampleJungleBasinHeight(fauna.radius, fauna.angle) + 1.58 + fauna.heightOffset;
    activeFaunaAnchor.set(Math.cos(fauna.angle) * fauna.radius, groundY, Math.sin(fauna.angle) * fauna.radius);
    activeFaunaMotionCode = fauna.motionCode;
    anchorQuaternion.setFromEuler(new THREE.Euler(0, -fauna.angle + (index % 2 ? 0.42 : -0.28), 0));
    anchorMatrix.compose(
      activeFaunaAnchor,
      anchorQuaternion,
      one,
    );
    const s = fauna.scale;
    if (fauna.kind === 'monkey' || fauna.kind === 'toucan') {
      addHabitatPart(anchorMatrix, [0, 0.12 * s, 0], [0.11 * s, 1.25 * s, 0.11 * s], 0x5d4628, [0, 0, Math.PI / 2]);
      addHabitatPart(anchorMatrix, [-0.16 * s, 0.16 * s, 0], [0.14 * s, 0.58 * s, 0.14 * s], 0x3e792f, [0, 0, Math.PI / 2]);
    } else if (fauna.kind === 'sloth') {
      addHabitatPart(anchorMatrix, [0, 1.38 * s, 0], [0.14 * s, 1.45 * s, 0.14 * s], 0x5d4628, [0, 0, Math.PI / 2]);
      addHabitatPart(anchorMatrix, [0.16 * s, 1.43 * s, 0], [0.17 * s, 0.72 * s, 0.17 * s], 0x3e792f, [0, 0, Math.PI / 2]);
    }
    if (fauna.kind === 'frog') {
      addPart(bodySource, anchorMatrix, [0, 0.18 * s, 0], [0.36 * s, 0.23 * s, 0.31 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.31 * s, 0.25 * s, 0], [0.24 * s, 0.21 * s, 0.27 * s], fauna.body);
      [[-0.28, -0.24], [-0.28, 0.24], [0.2, -0.29], [0.2, 0.29]].forEach(([x, z]) => {
        addPart(detailSource, anchorMatrix, [x * s, 0.06 * s, z * s], [0.19 * s, 0.07 * s, 0.14 * s], fauna.accent);
      });
      [-1, 1].forEach((side) => addPart(detailSource, anchorMatrix, [0.39 * s, 0.39 * s, side * 0.13 * s], [0.075 * s, 0.075 * s, 0.075 * s], 0xf4f7d4));
    } else if (fauna.kind === 'iguana') {
      addPart(bodySource, anchorMatrix, [0, 0.27 * s, 0], [0.62 * s, 0.27 * s, 0.3 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.5 * s, 0.34 * s, 0], [0.28 * s, 0.24 * s, 0.25 * s], fauna.accent);
      addPart(taperSource, anchorMatrix, [-0.72 * s, 0.25 * s, 0], [0.2 * s, 1.06 * s, 0.2 * s], fauna.body, [0, 0, Math.PI / 2]);
      for (let spike = 0; spike < 4; spike += 1) {
        addPart(detailSource, anchorMatrix, [(-0.28 + spike * 0.2) * s, (0.54 + spike % 2 * 0.05) * s, 0], [0.09 * s, 0.16 * s, 0.07 * s], fauna.accent);
      }
    } else if (fauna.kind === 'tapir') {
      addPart(bodySource, anchorMatrix, [0, 0.43 * s, 0], [0.78 * s, 0.46 * s, 0.42 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.66 * s, 0.46 * s, 0], [0.4 * s, 0.35 * s, 0.34 * s], fauna.accent);
      addPart(taperSource, anchorMatrix, [0.95 * s, 0.38 * s, 0], [0.16 * s, 0.38 * s, 0.16 * s], fauna.body, [0, 0, -Math.PI / 2]);
      [[-0.42, -0.24], [-0.42, 0.24], [0.38, -0.24], [0.38, 0.24]].forEach(([x, z]) => {
        addPart(limbSource, anchorMatrix, [x * s, 0.16 * s, z * s], [0.13 * s, 0.34 * s, 0.13 * s], fauna.body);
      });
    } else if (fauna.kind === 'monkey') {
      addPart(bodySource, anchorMatrix, [0, 0.55 * s, 0], [0.42 * s, 0.54 * s, 0.34 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.08 * s, 1.02 * s, 0], [0.3 * s, 0.3 * s, 0.27 * s], fauna.accent);
      [-1, 1].forEach((side) => addPart(taperSource, anchorMatrix, [0.02 * s, 0.58 * s, side * 0.42 * s], [0.1 * s, 0.68 * s, 0.1 * s], fauna.body, [Math.PI / 2, 0, 0]));
      for (let tail = 0; tail < 3; tail += 1) {
        addPart(taperSource, anchorMatrix, [(-0.38 - tail * 0.2) * s, (0.58 + tail * 0.16) * s, 0], [0.08 * s, 0.42 * s, 0.08 * s], fauna.body, [0, 0, 0.84 + tail * 0.34]);
      }
    } else if (fauna.kind === 'toucan') {
      addPart(bodySource, anchorMatrix, [0, 0.44 * s, 0], [0.34 * s, 0.46 * s, 0.28 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.18 * s, 0.83 * s, 0], [0.24 * s, 0.25 * s, 0.23 * s], 0xf2e8cd);
      addPart(taperSource, anchorMatrix, [0.53 * s, 0.82 * s, 0], [0.18 * s, 0.64 * s, 0.16 * s], fauna.accent, [0, 0, -Math.PI / 2]);
      addPart(detailSource, anchorMatrix, [-0.04 * s, 0.49 * s, -0.27 * s], [0.28 * s, 0.35 * s, 0.08 * s], 0x177b62);
    } else if (fauna.kind === 'turtle') {
      addPart(bodySource, anchorMatrix, [0, 0.18 * s, 0], [0.54 * s, 0.19 * s, 0.42 * s], fauna.body);
      addPart(detailSource, anchorMatrix, [0.48 * s, 0.17 * s, 0], [0.2 * s, 0.15 * s, 0.16 * s], fauna.accent);
      [[-0.24, -0.38], [-0.24, 0.38], [0.26, -0.38], [0.26, 0.38]].forEach(([x, z]) => {
        addPart(detailSource, anchorMatrix, [x * s, 0.08 * s, z * s], [0.2 * s, 0.08 * s, 0.16 * s], fauna.accent);
      });
    } else if (fauna.kind === 'jaguar') {
      addPart(bodySource, anchorMatrix, [0, 0.46 * s, 0], [0.78 * s, 0.38 * s, 0.34 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.72 * s, 0.58 * s, 0], [0.34 * s, 0.31 * s, 0.3 * s], fauna.body);
      addPart(taperSource, anchorMatrix, [0.98 * s, 0.52 * s, 0], [0.12 * s, 0.3 * s, 0.12 * s], fauna.accent, [0, 0, -Math.PI / 2]);
      [[-0.42, -0.23], [-0.42, 0.23], [0.42, -0.23], [0.42, 0.23]].forEach(([x, z]) => {
        addPart(limbSource, anchorMatrix, [x * s, 0.19 * s, z * s], [0.14 * s, 0.42 * s, 0.14 * s], fauna.body);
      });
      for (let tail = 0; tail < 3; tail += 1) {
        addPart(taperSource, anchorMatrix, [(-0.62 - tail * 0.26) * s, (0.48 + tail * 0.11) * s, 0], [0.09 * s, 0.5 * s, 0.09 * s], fauna.body, [0, 0, 0.98 + tail * 0.23]);
      }
      [[-0.28, -0.3], [0.08, 0.31], [0.34, -0.29], [0.61, 0.22]].forEach(([x, z]) => {
        addPart(detailSource, anchorMatrix, [x * s, 0.73 * s, z * s], [0.07 * s, 0.045 * s, 0.07 * s], fauna.accent);
      });
    } else if (fauna.kind === 'capybara') {
      addPart(bodySource, anchorMatrix, [0, 0.46 * s, 0], [0.82 * s, 0.5 * s, 0.46 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.7 * s, 0.56 * s, 0], [0.42 * s, 0.4 * s, 0.38 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.98 * s, 0.49 * s, 0], [0.22 * s, 0.18 * s, 0.24 * s], fauna.accent);
      [-1, 1].forEach((side) => {
        addPart(detailSource, anchorMatrix, [0.68 * s, 0.91 * s, side * 0.22 * s], [0.1 * s, 0.12 * s, 0.09 * s], fauna.accent);
      });
      [[-0.42, -0.27], [-0.42, 0.27], [0.38, -0.27], [0.38, 0.27]].forEach(([x, z]) => {
        addPart(limbSource, anchorMatrix, [x * s, 0.18 * s, z * s], [0.15 * s, 0.36 * s, 0.15 * s], fauna.body);
      });
    } else if (fauna.kind === 'caiman') {
      addPart(bodySource, anchorMatrix, [0, 0.2 * s, 0], [0.94 * s, 0.22 * s, 0.4 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.82 * s, 0.23 * s, 0], [0.48 * s, 0.2 * s, 0.34 * s], fauna.accent);
      addPart(taperSource, anchorMatrix, [-1.08 * s, 0.19 * s, 0], [0.22 * s, 1.28 * s, 0.2 * s], fauna.body, [0, 0, Math.PI / 2]);
      [[-0.45, -0.42], [-0.45, 0.42], [0.42, -0.42], [0.42, 0.42]].forEach(([x, z]) => {
        addPart(taperSource, anchorMatrix, [x * s, 0.08 * s, z * s], [0.1 * s, 0.42 * s, 0.1 * s], fauna.accent, [Math.PI / 2, 0, 0]);
      });
      for (let ridge = 0; ridge < 5; ridge += 1) {
        addPart(detailSource, anchorMatrix, [(-0.55 + ridge * 0.29) * s, 0.42 * s, 0], [0.1 * s, 0.13 * s, 0.09 * s], fauna.accent);
      }
    } else if (fauna.kind === 'sloth') {
      addPart(bodySource, anchorMatrix, [0, 0.66 * s, 0], [0.44 * s, 0.62 * s, 0.36 * s], fauna.body, [0, 0, -0.12]);
      addPart(bodySource, anchorMatrix, [0.14 * s, 1.18 * s, 0], [0.31 * s, 0.29 * s, 0.27 * s], fauna.accent);
      [-1, 1].forEach((side) => {
        addPart(taperSource, anchorMatrix, [side * 0.3 * s, 0.83 * s, 0], [0.1 * s, 0.82 * s, 0.1 * s], fauna.body, [0, 0, side * -0.48]);
        addPart(taperSource, anchorMatrix, [side * 0.22 * s, 0.34 * s, 0], [0.1 * s, 0.64 * s, 0.1 * s], fauna.body, [0, 0, side * 0.36]);
      });
      [-1, 1].forEach((side) => {
        addPart(detailSource, anchorMatrix, [0.3 * s, 1.26 * s, side * 0.11 * s], [0.065 * s, 0.065 * s, 0.055 * s], 0x242b25);
      });
    } else {
      addPart(bodySource, anchorMatrix, [0, 0.34 * s, 0], [0.68 * s, 0.34 * s, 0.28 * s], fauna.body);
      addPart(bodySource, anchorMatrix, [0.58 * s, 0.42 * s, 0], [0.29 * s, 0.26 * s, 0.23 * s], fauna.accent);
      addPart(taperSource, anchorMatrix, [0.83 * s, 0.38 * s, 0], [0.12 * s, 0.34 * s, 0.12 * s], fauna.body, [0, 0, -Math.PI / 2]);
      for (let tail = 0; tail < 3; tail += 1) {
        addPart(taperSource, anchorMatrix, [(-0.55 - tail * 0.2) * s, (0.42 + tail * 0.1) * s, 0], [0.1 * s, 0.38 * s, 0.1 * s], tail % 2 ? fauna.accent : fauna.body, [0, 0, 0.96]);
      }
    }
  });
  sources.forEach((source) => source.dispose());
  const activeFauna = faunaCatalog.slice(0, individualCount);
  return {
    geometries,
    species: activeFauna.map((entry) => entry.species),
    individualCount,
    minimumRouteRadius: Math.min(...activeFauna.map((entry) => entry.radius)),
    readableForegroundCount: activeFauna.filter((entry) => entry.angle >= 1.05 && entry.angle <= 2.4).length,
    motionLoops: [
      'frog-hopping',
      'basking-tail-sway',
      'forest-floor-gait',
      'branch-sway',
      'perch-hop',
      'river-drift',
      'predator-prowl',
      'wetland-wade',
    ],
  };
}

function addResidentGeometryAttributes(
  geometry: THREE.BufferGeometry,
  roleCode: number,
  anchor: THREE.Vector3,
) {
  const vertexCount = geometry.getAttribute('position').count;
  const roles = new Float32Array(vertexCount);
  roles.fill(roleCode);
  const anchors = new Float32Array(vertexCount * 3);
  for (let index = 0; index < vertexCount; index += 1) {
    anchors[index * 3] = anchor.x;
    anchors[index * 3 + 1] = anchor.y;
    anchors[index * 3 + 2] = anchor.z;
  }
  geometry.setAttribute('residentRole', new THREE.BufferAttribute(roles, 1));
  geometry.setAttribute('residentAnchor', new THREE.BufferAttribute(anchors, 3));
  return geometry;
}

function ensureResidentGeometryAttributes(geometry: THREE.BufferGeometry) {
  const vertexCount = geometry.getAttribute('position').count;
  if (!geometry.getAttribute('residentRole')) {
    geometry.setAttribute('residentRole', new THREE.BufferAttribute(new Float32Array(vertexCount), 1));
  }
  if (!geometry.getAttribute('residentAnchor')) {
    geometry.setAttribute('residentAnchor', new THREE.BufferAttribute(new Float32Array(vertexCount * 3), 3));
  }
}

function createJungleResidentWorkGeometry(profile: Island3DQualityProfile) {
  const residentCatalog = [
    { role: 'river-gatherer', roleCode: 1, radius: 5.34, angle: 1.88, yawOffset: -0.18, stature: 0.92, skin: 0x8f5d3b, tunic: 0x2c8a77, accent: 0xf0b84c },
    { role: 'temple-conservator', roleCode: 2, radius: 5.48, angle: 2.27, yawOffset: 0.24, stature: 1.04, skin: 0x6e452f, tunic: 0xa34d45, accent: 0xe4ca72 },
    { role: 'expedition-cartographer', roleCode: 3, radius: 5.48, angle: 0.9, yawOffset: -0.22, stature: 0.98, skin: 0xb97a52, tunic: 0x405c96, accent: 0xd9c88f },
    { role: 'canopy-gardener', roleCode: 4, radius: 5.66, angle: 1.29, yawOffset: 0.16, stature: 1.08, skin: 0x7b4f36, tunic: 0xb56a32, accent: 0x58b96f },
    { role: 'river-gatherer', roleCode: 1, radius: 5.72, angle: 4.4, yawOffset: 0.2, stature: 1.02, skin: 0x5f3b2c, tunic: 0x835b9a, accent: 0x68d4bf },
    { role: 'temple-conservator', roleCode: 2, radius: 5.5, angle: 5.55, yawOffset: -0.18, stature: 0.96, skin: 0xa76c46, tunic: 0x286a59, accent: 0xe78e43 },
  ] as const;
  const individualCount = profile.id === 'high' ? 6 : profile.id === 'medium' ? 5 : 4;
  const bodySource = new THREE.BoxGeometry(1, 1, 1);
  const headSource = new THREE.OctahedronGeometry(1, 0);
  const headwearSource = new THREE.ConeGeometry(1, 1, 5);
  const vesselSource = new THREE.CylinderGeometry(1, 0.82, 1, 5, 1);
  const sources = [bodySource, headSource, headwearSource, vesselSource];
  const geometries: THREE.BufferGeometry[] = [];
  const anchorMatrix = new THREE.Matrix4();
  const localMatrix = new THREE.Matrix4();
  const worldMatrix = new THREE.Matrix4();
  const anchorQuaternion = new THREE.Quaternion();
  const localQuaternion = new THREE.Quaternion();
  const localEuler = new THREE.Euler();
  const unitScale = new THREE.Vector3(1, 1, 1);
  const localPosition = new THREE.Vector3();
  const localScale = new THREE.Vector3();
  const addPart = (
    source: THREE.BufferGeometry,
    anchor: THREE.Matrix4,
    anchorPosition: THREE.Vector3,
    roleCode: number,
    position: readonly [number, number, number],
    scale: readonly [number, number, number],
    color: THREE.ColorRepresentation,
    rotation: readonly [number, number, number] = [0, 0, 0],
  ) => {
    localQuaternion.setFromEuler(localEuler.set(rotation[0], rotation[1], rotation[2]));
    localMatrix.compose(
      localPosition.set(position[0], position[1], position[2]),
      localQuaternion,
      localScale.set(scale[0], scale[1], scale[2]),
    );
    worldMatrix.multiplyMatrices(anchor, localMatrix);
    const geometry = cloneColoredBasinGeometry(source, worldMatrix, new THREE.Color(color));
    geometries.push(addResidentGeometryAttributes(geometry, roleCode, anchorPosition));
  };

  residentCatalog.slice(0, individualCount).forEach((resident) => {
    const groundY = sampleJungleBasinHeight(resident.radius, resident.angle) + 1.58;
    const anchorPosition = new THREE.Vector3(
      Math.cos(resident.angle) * resident.radius,
      groundY,
      Math.sin(resident.angle) * resident.radius,
    );
    anchorQuaternion.setFromEuler(new THREE.Euler(0, -resident.angle - Math.PI / 2 + resident.yawOffset, 0));
    anchorMatrix.compose(anchorPosition, anchorQuaternion, unitScale);
    const stature = resident.stature;
    const lowerCloth = new THREE.Color(resident.tunic).multiplyScalar(0.68);
    addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0, 0.76 * stature, 0], [0.34, 0.54 * stature, 0.25], resident.tunic);
    addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0, 0.77 * stature, 0.155], [0.37, 0.1, 0.035], resident.accent);
    addPart(headSource, anchorMatrix, anchorPosition, resident.roleCode, [0, 1.2 * stature, 0.015], [0.215, 0.245, 0.205], resident.skin);
    addPart(headwearSource, anchorMatrix, anchorPosition, resident.roleCode, [0, 1.43 * stature, -0.005], [0.26, 0.23, 0.26], resident.accent);
    [-1, 1].forEach((side) => {
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [side * 0.115, 0.28 * stature, 0], [0.13, 0.48 * stature, 0.145], lowerCloth);
    });

    if (resident.roleCode === 1) {
      [-1, 1].forEach((side) => {
        addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [side * 0.265, 0.72 * stature, 0.18], [0.11, 0.43, 0.11], resident.skin, [0.72, 0, side * 0.16]);
      });
      addPart(vesselSource, anchorMatrix, anchorPosition, resident.roleCode, [0, 0.3, 0.5], [0.31, 0.22, 0.31], 0x8a5529);
      addPart(vesselSource, anchorMatrix, anchorPosition, resident.roleCode, [0, 0.39, 0.5], [0.23, 0.035, 0.23], 0x59d9c9);
    } else if (resident.roleCode === 2) {
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [-0.25, 0.83 * stature, 0.05], [0.11, 0.42, 0.11], resident.skin, [0, 0, -0.38]);
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0.24, 0.98 * stature, 0.15], [0.11, 0.54, 0.11], resident.skin, [0.58, 0, 0.32]);
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0.32, 0.94 * stature, 0.37], [0.035, 0.68, 0.035], 0x795128, [0.42, 0, 0.16]);
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0.35, 1.2 * stature, 0.48], [0.16, 0.08, 0.045], 0x77a445, [0.22, 0, 0.16]);
    } else if (resident.roleCode === 3) {
      [-1, 1].forEach((side) => {
        addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [side * 0.27, 0.78 * stature, 0.2], [0.1, 0.39, 0.1], resident.skin, [0.82, 0, side * 0.12]);
      });
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0, 0.61 * stature, 0.43], [0.58, 0.035, 0.4], 0xd8c889, [0.12, 0, 0]);
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0, 0.63 * stature, 0.44], [0.04, 0.015, 0.34], 0x73562d, [0.12, 0.45, 0]);
    } else {
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [-0.24, 0.78 * stature, 0.04], [0.11, 0.42, 0.11], resident.skin, [0, 0, -0.42]);
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0.24, 0.98 * stature, 0.1], [0.11, 0.48, 0.11], resident.skin, [0.12, 0, 0.36]);
      addPart(bodySource, anchorMatrix, anchorPosition, resident.roleCode, [0.34, 1.04 * stature, 0.12], [0.045, 1.42, 0.045], 0x6e4d28, [0, 0, -0.18]);
      addPart(headwearSource, anchorMatrix, anchorPosition, resident.roleCode, [0.47, 1.66 * stature, 0.12], [0.15, 0.34, 0.08], 0x80b942, [0, 0, -0.52]);
      addPart(vesselSource, anchorMatrix, anchorPosition, resident.roleCode, [-0.34, 0.36, 0.14], [0.29, 0.22, 0.29], 0x78502c);
    }
  });
  sources.forEach((source) => source.dispose());
  const activeResidents = residentCatalog.slice(0, individualCount);
  return {
    geometries,
    individualCount,
    roles: [...new Set(activeResidents.map((resident) => resident.role))],
    minimumRouteRadius: Math.min(...activeResidents.map((resident) => resident.radius)),
    workLoops: ['water-gathering', 'stone-conservation', 'map-surveying', 'canopy-tending'],
  };
}

function addContinuousJungleBasin(
  root: THREE.Group,
  profile: Island3DQualityProfile,
  materials: Island18JungleExpeditionMaterials,
) {
  const basin = registerIsland18RuntimePart(
    'depth-islands-and-horizon',
    new THREE.Group(),
    'grounded-jungle-basin',
  );
  basin.name = 'ISLAND_18_CONTINUOUS_JUNGLE_BASIN';
  basin.userData.environmentReading = 'lost-city-above-continuous-jungle-valley';

  const radii = [5.1, 7.2, 10.4, 14.5, 20, 27.5, 36, 46] as const;
  const radialSegments = 36;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const lowerMoss = new THREE.Color(0x102f22);
  const upperMoss = new THREE.Color(0x2d6b31);
  const wetEarth = new THREE.Color(0x1b4435);
  const scratchColor = new THREE.Color();
  radii.forEach((radius, ringIndex) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      const y = sampleJungleBasinHeight(radius, angle);
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      const heightMix = THREE.MathUtils.smoothstep(radius, 5.1, 46);
      scratchColor.copy(lowerMoss).lerp(upperMoss, heightMix * 0.72 + 0.12);
      scratchColor.lerp(wetEarth, 0.14 + ((segment + ringIndex) % 5) * 0.025);
      colors.push(scratchColor.r, scratchColor.g, scratchColor.b);
    }
  });
  for (let ring = 0; ring < radii.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = (ring + 1) * radialSegments + segment;
      const c = ring * radialSegments + next;
      const d = (ring + 1) * radialSegments + next;
      indices.push(a, c, b, c, d, b);
    }
  }
  const terrainSource = new THREE.BufferGeometry();
  terrainSource.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  terrainSource.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  terrainSource.setIndex(indices);
  terrainSource.computeVertexNormals();
  const terrainGeometry = terrainSource.toNonIndexed();
  terrainSource.dispose();
  const canopyRadii = [7.8, 12.8, 19.5, 28, 37.5, 46] as const;
  const canopyPositions: number[] = [];
  const canopyColors: number[] = [];
  const canopyIndices: number[] = [];
  const canopyDeep = new THREE.Color(0x0b3e23);
  const canopyMid = new THREE.Color(0x1e6f31);
  const canopyBright = new THREE.Color(0x4d9638);
  const streamClearings = [0.12, 0.72, 1.56, 3.02, 4.45, 5.36] as const;
  canopyRadii.forEach((radius, ringIndex) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      const radiusJitter = Math.sin(segment * 2.13 + ringIndex * 1.7) * (0.22 + ringIndex * 0.045);
      const authoredRadius = radius + radiusJitter;
      const canopyLift = 0.88
        + THREE.MathUtils.smoothstep(radius, 7.8, 28) * 0.72
        + Math.sin(angle * 5 + ringIndex * 1.4) * 0.24;
      canopyPositions.push(
        Math.cos(angle) * authoredRadius,
        sampleJungleBasinHeight(authoredRadius, angle) + canopyLift,
        Math.sin(angle) * authoredRadius,
      );
      const lightMix = 0.22 + ((segment * 7 + ringIndex * 5) % 11) / 15;
      scratchColor.copy(canopyDeep).lerp(canopyMid, 0.48 + ringIndex * 0.06).lerp(canopyBright, lightMix * 0.42);
      canopyColors.push(scratchColor.r, scratchColor.g, scratchColor.b);
    }
  });
  const isStreamClearing = (angle: number) => streamClearings.some((streamAngle) => (
    Math.abs(Math.atan2(Math.sin(angle - streamAngle), Math.cos(angle - streamAngle))) < 0.075
  ));
  for (let ring = 0; ring < canopyRadii.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment + 0.5) / radialSegments * Math.PI * 2;
      if (isStreamClearing(angle)) continue;
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = (ring + 1) * radialSegments + segment;
      const c = ring * radialSegments + next;
      const d = (ring + 1) * radialSegments + next;
      canopyIndices.push(a, c, b, c, d, b);
    }
  }
  const canopySource = new THREE.BufferGeometry();
  canopySource.setAttribute('position', new THREE.Float32BufferAttribute(canopyPositions, 3));
  canopySource.setAttribute('color', new THREE.Float32BufferAttribute(canopyColors, 3));
  canopySource.setIndex(canopyIndices);
  canopySource.computeVertexNormals();
  const canopyGeometry = canopySource.toNonIndexed();
  canopySource.dispose();
  const combinedGeometry: THREE.BufferGeometry[] = [terrainGeometry, canopyGeometry];

  const treeCount = profile.id === 'high' ? 24 : profile.id === 'medium' ? 19 : 14;
  const trunkSource = new THREE.CylinderGeometry(0.1, 0.18, 1, 4);
  const crownSource = new THREE.OctahedronGeometry(1, 0);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const treeColors = [
    new THREE.Color(0x0c3c24),
    new THREE.Color(0x16572c),
    new THREE.Color(0x2a7231),
    new THREE.Color(0x4c8c39),
  ] as const;
  for (let index = 0; index < treeCount; index += 1) {
    const angle = index * 2.399963 + (index % 4) * 0.17;
    const radius = 9.2 + (index * 11 % 34) + (index % 3) * 0.44;
    const groundY = sampleJungleBasinHeight(radius, angle);
    const trunkHeight = 1.9 + (index % 5) * 0.34;
    quaternion.setFromEuler(new THREE.Euler(0, angle * 0.27, (index % 3 - 1) * 0.035));
    matrix.compose(
      new THREE.Vector3(Math.cos(angle) * radius, groundY + trunkHeight * 0.5, Math.sin(angle) * radius),
      quaternion,
      scale.set(0.72 + (index % 3) * 0.12, trunkHeight, 0.72 + ((index + 1) % 3) * 0.1),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(trunkSource, matrix, new THREE.Color(0x354b26)));
    const crownHeight = 1.28 + (index % 4) * 0.22;
    for (let lobe = 0; lobe < 3; lobe += 1) {
      const lobeAngle = angle + lobe / 3 * Math.PI * 2 + index * 0.19;
      matrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * radius + Math.cos(lobeAngle) * (0.28 + lobe * 0.06),
          groundY + trunkHeight + crownHeight * (0.42 + (lobe === 1 ? 0.18 : 0)),
          Math.sin(angle) * radius + Math.sin(lobeAngle) * (0.28 + lobe * 0.06),
        ),
        quaternion,
        scale.set(
          0.82 + (index + lobe) % 4 * 0.16,
          crownHeight * (0.76 + lobe * 0.08),
          0.74 + (index + lobe * 2) % 4 * 0.15,
        ),
      );
      combinedGeometry.push(cloneColoredBasinGeometry(
        crownSource,
        matrix,
        treeColors[(index + lobe) % treeColors.length],
      ));
    }
  }
  const forestCarpetCount = profile.id === 'high' ? 40 : profile.id === 'medium' ? 32 : 24;
  const carpetCrownSource = new THREE.IcosahedronGeometry(1, 0);
  for (let index = 0; index < forestCarpetCount; index += 1) {
    const angle = index * 2.399963 + Math.sin(index * 1.71) * 0.16;
    const radius = 7.3 + (index * 17 % 38) + (index % 5) * 0.13;
    const groundY = sampleJungleBasinHeight(radius, angle);
    quaternion.setFromEuler(new THREE.Euler(
      (index % 3 - 1) * 0.08,
      angle * 0.23 + index * 0.11,
      ((index + 1) % 3 - 1) * 0.07,
    ));
    matrix.compose(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        groundY + 1.08 + (index % 4) * 0.2,
        Math.sin(angle) * radius,
      ),
      quaternion,
      scale.set(
        1.42 + (index % 5) * 0.38,
        1.08 + (index % 4) * 0.27,
        1.5 + ((index + 2) % 5) * 0.32,
      ),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      carpetCrownSource,
      matrix,
      treeColors[(index * 3 + Math.floor(radius)) % treeColors.length],
    ));
  }
  const buttressSource = new THREE.CylinderGeometry(0.56, 1, 1, 5);
  const buttressAngles = [0.34, 1.18, 1.42, 1.72, 1.98, 2.72, 3.78, 4.86, 5.72] as const;
  buttressAngles.forEach((angle, index) => {
    const frontAnchor = Math.abs(angle - Math.PI / 2) < 0.5;
    const start = new THREE.Vector3(
      Math.cos(angle) * 5.15,
      frontAnchor ? -0.72 - (index % 2) * 0.12 : -1.45 - (index % 2) * 0.22,
      Math.sin(angle) * 5.15,
    );
    const endRadius = frontAnchor ? 11.8 + (index % 3) * 1.35 : 13.2 + (index % 3) * 1.1;
    const end = new THREE.Vector3(
      Math.cos(angle) * endRadius,
      sampleJungleBasinHeight(endRadius, angle) + 0.24,
      Math.sin(angle) * endRadius,
    );
    const direction = end.clone().sub(start);
    quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
    matrix.compose(
      start.clone().add(end).multiplyScalar(0.5),
      quaternion,
      scale.set(
        (frontAnchor ? 0.68 : 1.18) + (index % 2) * (frontAnchor ? 0.12 : 0.22),
        direction.length(),
        (frontAnchor ? 0.96 : 1.46) + (index % 3) * (frontAnchor ? 0.09 : 0.16),
      ),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      buttressSource,
      matrix,
      index % 2 === 0 ? new THREE.Color(0x25472d) : new THREE.Color(0x36542e),
    ));
  });
  const bankPlantRadii = [7.4, 8.8, 10.2, 11.7, 13.1, 14.4] as const;
  const bankLeafSource = new THREE.ConeGeometry(0.22, 1, 4);
  const bankPlantColors = [new THREE.Color(0x55a83d), new THREE.Color(0x97c84c), new THREE.Color(0x216f3a)] as const;
  bankPlantRadii.forEach((radius, radiusIndex) => {
    [-1, 1].forEach((side, sideIndex) => {
      const angle = 1.56 + side * (0.16 + radiusIndex * 0.006);
      const groundY = sampleJungleBasinHeight(radius, angle) + 1.08;
      for (let leafIndex = 0; leafIndex < 2; leafIndex += 1) {
        const leafAngle = angle + side * (0.045 + leafIndex * 0.035);
        quaternion.setFromEuler(new THREE.Euler(
          side * (0.34 + leafIndex * 0.12),
          -leafAngle,
          (leafIndex === 0 ? -1 : 1) * 0.2,
        ));
        matrix.compose(
          new THREE.Vector3(
            Math.cos(angle) * radius + Math.cos(leafAngle) * leafIndex * 0.2,
            groundY + 0.34 + leafIndex * 0.09,
            Math.sin(angle) * radius + Math.sin(leafAngle) * leafIndex * 0.2,
          ),
          quaternion,
          scale.set(0.72 + leafIndex * 0.18, 0.86 + (radiusIndex % 3) * 0.12, 0.42),
        );
        combinedGeometry.push(cloneColoredBasinGeometry(
          bankLeafSource,
          matrix,
          bankPlantColors[(radiusIndex + sideIndex + leafIndex) % bankPlantColors.length],
        ));
      }
    });
  });
  const riverRelicSource = new THREE.TetrahedronGeometry(0.5, 0);
  const riverRootSource = new THREE.CylinderGeometry(0.06, 0.11, 1, 3);
  const riverReedSource = new THREE.ConeGeometry(0.06, 1, 3);
  const riverBloomSource = new THREE.TetrahedronGeometry(0.12, 0);
  const heroStreamRelicCount = profile.id === 'high' ? 24 : profile.id === 'medium' ? 20 : 14;
  const heroStreamRootCount = profile.id === 'high' ? 14 : profile.id === 'medium' ? 12 : 8;
  const heroStreamReedCount = profile.id === 'high' ? 28 : profile.id === 'medium' ? 22 : 16;
  const heroStreamBloomCount = profile.id === 'high' ? 18 : profile.id === 'medium' ? 14 : 10;
  const wetRelicColors = [
    new THREE.Color(0x334c3c),
    new THREE.Color(0x4a6546),
    new THREE.Color(0x71805a),
    new THREE.Color(0x273f37),
  ] as const;
  for (let index = 0; index < heroStreamRelicCount; index += 1) {
    const progress = index / Math.max(1, heroStreamRelicCount - 1);
    const side = index % 2 === 0 ? -1 : 1;
    const z = THREE.MathUtils.lerp(6.3, 14.85, progress) + Math.sin(index * 1.73) * 0.16;
    const bankWidth = THREE.MathUtils.lerp(1.12, 2.18, progress);
    const x = side * (bankWidth + 0.16 + (index % 3) * 0.13);
    const radius = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const groundY = sampleJungleBasinHeight(radius, angle) + 1.02;
    quaternion.setFromEuler(new THREE.Euler(
      index * 0.31,
      angle + index * 0.47,
      side * (0.12 + (index % 3) * 0.05),
    ));
    matrix.compose(
      new THREE.Vector3(x, groundY + 0.08 + (index % 4) * 0.035, z),
      quaternion,
      scale.set(0.42 + (index % 4) * 0.11, 0.2 + (index % 3) * 0.055, 0.36 + ((index + 2) % 4) * 0.09),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      riverRelicSource,
      matrix,
      wetRelicColors[index % wetRelicColors.length],
    ));
  }
  const heroStreamRiverbedPebbleCount = profile.id === 'high' ? 20 : profile.id === 'medium' ? 16 : 12;
  const riverbedColors = [
    new THREE.Color(0x214a48),
    new THREE.Color(0x5d6b4c),
    new THREE.Color(0x84704d),
    new THREE.Color(0x2c665d),
  ] as const;
  for (let index = 0; index < heroStreamRiverbedPebbleCount; index += 1) {
    const progress = index / Math.max(1, heroStreamRiverbedPebbleCount - 1);
    const z = THREE.MathUtils.lerp(6.48, 14.92, progress) + Math.sin(index * 1.31) * 0.14;
    const streamHalfWidth = THREE.MathUtils.lerp(0.44, 1.26, progress);
    const x = Math.sin(index * 2.39) * streamHalfWidth * 0.72;
    const radius = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    quaternion.setFromEuler(new THREE.Euler(index * 0.28, index * 0.61, index * 0.17));
    const pebbleScale = 0.22 + (index % 4) * 0.045;
    matrix.compose(
      new THREE.Vector3(x, sampleJungleBasinHeight(radius, angle) + 1.075, z),
      quaternion,
      scale.set(pebbleScale * 1.45, pebbleScale * 0.42, pebbleScale),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      riverRelicSource,
      matrix,
      riverbedColors[index % riverbedColors.length],
    ));
  }
  for (let index = 0; index < heroStreamRootCount; index += 1) {
    const progress = index / Math.max(1, heroStreamRootCount - 1);
    const side = index % 2 === 0 ? -1 : 1;
    const z = THREE.MathUtils.lerp(6.55, 14.15, progress);
    const x = side * THREE.MathUtils.lerp(1.42, 2.28, progress);
    const radius = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const rootHeight = 0.72 + (index % 4) * 0.18;
    quaternion.setFromEuler(new THREE.Euler(side * 0.34, -angle * 0.18, side * (0.3 + (index % 3) * 0.08)));
    matrix.compose(
      new THREE.Vector3(x, sampleJungleBasinHeight(radius, angle) + 1.04 + rootHeight * 0.5, z),
      quaternion,
      scale.set(0.92 + (index % 3) * 0.12, rootHeight, 0.8 + ((index + 1) % 3) * 0.1),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      riverRootSource,
      matrix,
      index % 2 === 0 ? new THREE.Color(0x38502a) : new THREE.Color(0x4c5e2e),
    ));
  }
  for (let index = 0; index < heroStreamReedCount; index += 1) {
    const progress = index / Math.max(1, heroStreamReedCount - 1);
    const side = index % 2 === 0 ? -1 : 1;
    const z = THREE.MathUtils.lerp(6.45, 15.05, progress) + Math.sin(index * 2.21) * 0.2;
    const x = side * (THREE.MathUtils.lerp(1.18, 2.08, progress) + (index % 4) * 0.07);
    const radius = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    const height = 0.42 + (index % 5) * 0.11;
    quaternion.setFromEuler(new THREE.Euler(side * 0.08, angle * 0.22, side * (0.12 + (index % 3) * 0.04)));
    matrix.compose(
      new THREE.Vector3(x, sampleJungleBasinHeight(radius, angle) + 1.08 + height * 0.5, z),
      quaternion,
      scale.set(0.78 + (index % 3) * 0.13, height, 0.64 + ((index + 1) % 3) * 0.12),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      riverReedSource,
      matrix,
      index % 3 === 0 ? new THREE.Color(0x93b84e) : index % 3 === 1 ? new THREE.Color(0x4c8b3c) : new THREE.Color(0x27683d),
    ));
  }
  const bloomColors = [
    new THREE.Color(0xe865a8),
    new THREE.Color(0xffc94f),
    new THREE.Color(0x63d7df),
    new THREE.Color(0xb77bea),
  ] as const;
  for (let index = 0; index < heroStreamBloomCount; index += 1) {
    const progress = index / Math.max(1, heroStreamBloomCount - 1);
    const side = index % 2 === 0 ? -1 : 1;
    const z = THREE.MathUtils.lerp(6.7, 14.55, progress) + Math.cos(index * 1.93) * 0.17;
    const x = side * (THREE.MathUtils.lerp(1.32, 2.2, progress) + 0.12);
    const radius = Math.hypot(x, z);
    const angle = Math.atan2(z, x);
    quaternion.setFromEuler(new THREE.Euler(index * 0.42, angle + index * 0.58, side * 0.28));
    const bloomScale = 0.92 + (index % 4) * 0.18;
    matrix.compose(
      new THREE.Vector3(x, sampleJungleBasinHeight(radius, angle) + 1.55 + (index % 3) * 0.08, z),
      quaternion,
      scale.set(bloomScale, bloomScale * 0.72, bloomScale),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      riverBloomSource,
      matrix,
      bloomColors[index % bloomColors.length],
    ));
  }
  const riverTerraceRadii = [6.35, 7.55, 8.8, 10.05, 11.3] as const;
  const terraceBlockSource = new THREE.BoxGeometry(1, 1, 1);
  const terraceRubbleSource = new THREE.DodecahedronGeometry(0.5, 0);
  const terraceStoneColors = [
    new THREE.Color(0x596444),
    new THREE.Color(0x68734a),
    new THREE.Color(0x3d563d),
  ] as const;
  const terraceMossColors = [new THREE.Color(0x397e2f), new THREE.Color(0x57983a)] as const;
  riverTerraceRadii.forEach((radius, terraceIndex) => {
    [-1, 1].forEach((side, sideIndex) => {
      const t = terraceIndex / (riverTerraceRadii.length - 1);
      const angle = 1.56 + side * (0.34 + terraceIndex * 0.014);
      const topY = THREE.MathUtils.lerp(0.18, -0.08, t) + Math.sin(terraceIndex * 1.7 + side) * 0.045;
      const height = 0.62 + (terraceIndex % 3) * 0.12;
      const width = 1.78 + terraceIndex * 0.2;
      const depth = 1.16 + (terraceIndex % 2) * 0.2;
      quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2 + side * 0.08, 0));
      matrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * radius,
          topY - height * 0.5,
          Math.sin(angle) * radius,
        ),
        quaternion,
        scale.set(width, height, depth),
      );
      combinedGeometry.push(cloneColoredBasinGeometry(
        terraceBlockSource,
        matrix,
        terraceStoneColors[(terraceIndex + sideIndex) % terraceStoneColors.length],
      ));
      matrix.compose(
        new THREE.Vector3(
          Math.cos(angle) * radius + side * 0.03,
          topY + 0.045,
          Math.sin(angle) * radius,
        ),
        quaternion,
        scale.set(width * 0.94, 0.09, depth * 0.92),
      );
      combinedGeometry.push(cloneColoredBasinGeometry(
        terraceBlockSource,
        matrix,
        terraceMossColors[(terraceIndex + sideIndex) % terraceMossColors.length],
      ));
    });
  });
  for (let index = 0; index < 10; index += 1) {
    const radius = 6.8 + index * 0.52;
    const side = index % 2 === 0 ? -1 : 1;
    const angle = 1.56 + side * (0.48 + (index % 3) * 0.035);
    quaternion.setFromEuler(new THREE.Euler(index * 0.17, angle + index * 0.23, side * 0.12));
    matrix.compose(
      new THREE.Vector3(
        Math.cos(angle) * radius,
        sampleJungleBasinHeight(radius, angle) + 0.86 + (index % 3) * 0.08,
        Math.sin(angle) * radius,
      ),
      quaternion,
      scale.set(0.72 + (index % 3) * 0.15, 0.54 + (index % 2) * 0.18, 0.78 + ((index + 1) % 3) * 0.12),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      terraceRubbleSource,
      matrix,
      terraceStoneColors[(index + 1) % terraceStoneColors.length],
    ));
  }
  const riverGateRadius = 9.35;
  const riverGateGroundY = sampleJungleBasinHeight(riverGateRadius, 1.56) + 0.42;
  [-1, 1].forEach((side, sideIndex) => {
    const columnHeight = 2.12 + sideIndex * 0.18;
    quaternion.setFromEuler(new THREE.Euler(0, side * 0.06, side * 0.035));
    matrix.compose(
      new THREE.Vector3(side * 2.08, riverGateGroundY + columnHeight * 0.5, riverGateRadius),
      quaternion,
      scale.set(0.52, columnHeight, 0.62),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      terraceBlockSource,
      matrix,
      terraceStoneColors[sideIndex],
    ));
    matrix.compose(
      new THREE.Vector3(side * 1.42, riverGateGroundY + columnHeight - 0.08, riverGateRadius),
      quaternion,
      scale.set(1.28, 0.26, 0.58),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      terraceBlockSource,
      matrix,
      terraceStoneColors[(sideIndex + 1) % terraceStoneColors.length],
    ));
    matrix.compose(
      new THREE.Vector3(side * 2.08, riverGateGroundY + columnHeight + 0.12, riverGateRadius),
      quaternion,
      scale.set(0.64, 0.12, 0.74),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      terraceBlockSource,
      matrix,
      terraceMossColors[sideIndex],
    ));
  });
  const lilyPadSource = new THREE.CylinderGeometry(1, 1, 0.08, 10, 1);
  const lotusBudSource = new THREE.OctahedronGeometry(0.5, 0);
  const lilyPadCount = profile.id === 'high' ? 12 : profile.id === 'medium' ? 9 : 7;
  const lotusBudCount = profile.id === 'high' ? 5 : profile.id === 'medium' ? 4 : 3;
  const lilyPadColors = [
    new THREE.Color(0x2b873e),
    new THREE.Color(0x58ad47),
    new THREE.Color(0x96c74a),
  ] as const;
  for (let index = 0; index < lilyPadCount; index += 1) {
    const angle = index * 2.399963 + 0.42;
    const localRadius = 0.58 + (index % 4) * 0.47;
    const x = Math.cos(angle) * localRadius + Math.sin(index * 1.7) * 0.18;
    const z = 12.45 + Math.sin(angle) * localRadius * 0.86;
    const worldRadius = Math.hypot(x, z);
    const worldAngle = Math.atan2(z, x);
    const waterY = sampleJungleBasinHeight(worldRadius, worldAngle) + 1.31;
    quaternion.setFromEuler(new THREE.Euler(0, angle + (index % 3) * 0.32, 0));
    const padScale = 0.24 + (index % 4) * 0.055;
    matrix.compose(
      new THREE.Vector3(x, waterY, z),
      quaternion,
      scale.set(padScale * 1.18, 1, padScale),
    );
    combinedGeometry.push(cloneColoredBasinGeometry(
      lilyPadSource,
      matrix,
      lilyPadColors[index % lilyPadColors.length],
    ));
    if (index < lotusBudCount) {
      quaternion.setFromEuler(new THREE.Euler(index * 0.29, angle, index * 0.17));
      matrix.compose(
        new THREE.Vector3(x + 0.06, waterY + 0.12, z - 0.04),
        quaternion,
        scale.set(0.18, 0.24, 0.18),
      );
      combinedGeometry.push(cloneColoredBasinGeometry(
        lotusBudSource,
        matrix,
        index % 2 === 0 ? new THREE.Color(0xf277b8) : new THREE.Color(0xffdb6e),
      ));
    }
  }
  const basinFauna = createJungleBasinFaunaGeometry(profile);
  combinedGeometry.push(...basinFauna.geometries);
  const residentNetwork = createJungleResidentWorkGeometry(profile);
  combinedGeometry.push(...residentNetwork.geometries);
  combinedGeometry.forEach(ensureResidentGeometryAttributes);
  combinedGeometry.forEach(ensureFaunaGeometryAttributes);
  trunkSource.dispose();
  crownSource.dispose();
  carpetCrownSource.dispose();
  buttressSource.dispose();
  bankLeafSource.dispose();
  riverRelicSource.dispose();
  riverRootSource.dispose();
  riverReedSource.dispose();
  riverBloomSource.dispose();
  terraceBlockSource.dispose();
  terraceRubbleSource.dispose();
  lilyPadSource.dispose();
  lotusBudSource.dispose();
  const mergedBasinGeometry = mergeGeometries(combinedGeometry, false);
  combinedGeometry.forEach((geometry) => geometry.dispose());
  if (!mergedBasinGeometry) return basin;
  const basinMesh = presentMesh(
    new THREE.Mesh(mergedBasinGeometry, materials.basinGround),
    'ISLAND_18_CONTINUOUS_JUNGLE_BASIN_MESH',
    5,
  );
  basinMesh.castShadow = false;
  basinMesh.receiveShadow = true;
  basin.add(basinMesh);

  const faunaMarker = registerIsland18RuntimePart('living-ambience', new THREE.Object3D(), 'exotic-basin-fauna');
  faunaMarker.name = 'ISLAND_18_EXOTIC_BASIN_FAUNA_ECOLOGY';
  faunaMarker.userData.species = basinFauna.species;
  faunaMarker.userData.individualCount = basinFauna.individualCount;
  faunaMarker.userData.minimumRouteRadius = basinFauna.minimumRouteRadius;
  faunaMarker.userData.readableForegroundCount = basinFauna.readableForegroundCount;
  faunaMarker.userData.motionLoops = basinFauna.motionLoops;
  faunaMarker.userData.batchedInto = basinMesh.name;
  faunaMarker.userData.presentationOnly = true;
  basin.add(faunaMarker);

  const residentMarker = registerIsland18RuntimePart('living-ambience', new THREE.Object3D(), 'resident-work-network');
  residentMarker.name = 'ISLAND_18_JUNGLE_RESIDENT_WORK_NETWORK';
  residentMarker.userData.roles = residentNetwork.roles;
  residentMarker.userData.individualCount = residentNetwork.individualCount;
  residentMarker.userData.workLoops = residentNetwork.workLoops;
  residentMarker.userData.minimumRouteRadius = residentNetwork.minimumRouteRadius;
  residentMarker.userData.batchedInto = basinMesh.name;
  residentMarker.userData.presentationOnly = true;
  basin.add(residentMarker);

  const canopyMarker = new THREE.Object3D();
  canopyMarker.name = 'ISLAND_18_BASIN_CANOPY_DEPTH';
  canopyMarker.userData.treeCount = treeCount;
  canopyMarker.userData.forestCarpetCount = forestCarpetCount;
  canopyMarker.userData.canopyBlanketRings = canopyRadii.length;
  canopyMarker.userData.cliffButtressCount = buttressAngles.length;
  canopyMarker.userData.heroStreamBankPlantCount = bankPlantRadii.length * 4;
  canopyMarker.userData.heroStreamRelicCount = heroStreamRelicCount;
  canopyMarker.userData.heroStreamRiverbedPebbleCount = heroStreamRiverbedPebbleCount;
  canopyMarker.userData.heroStreamRootCount = heroStreamRootCount;
  canopyMarker.userData.heroStreamReedCount = heroStreamReedCount;
  canopyMarker.userData.heroStreamBloomCount = heroStreamBloomCount;
  canopyMarker.userData.heroStreamLilyPadCount = lilyPadCount;
  canopyMarker.userData.heroStreamLotusBudCount = lotusBudCount;
  canopyMarker.userData.riverTerraceCount = riverTerraceRadii.length * 2;
  canopyMarker.userData.riverGateClearance = { width: 1.1, height: 1.8, radius: riverGateRadius };
  basin.add(canopyMarker);
  basin.add(createJungleCanopyVolume(profile, materials.canopyVolume));
  const riverGeometry = createJungleBasinWaterGeometry();
  const templePoolGeometry = new THREE.CylinderGeometry(2.42, 2.62, 0.12, 40);
  templePoolGeometry.translate(0, 0.34, 0);
  const templePoolPositions = templePoolGeometry.getAttribute('position') as THREE.BufferAttribute;
  const templePoolColors = new Float32Array(templePoolPositions.count * 3);
  const templePoolDeep = new THREE.Color(0x1a7e80);
  const templePoolRim = new THREE.Color(0xb7ffea);
  const templePoolColor = new THREE.Color();
  for (let index = 0; index < templePoolPositions.count; index += 1) {
    const radius = Math.hypot(templePoolPositions.getX(index), templePoolPositions.getZ(index));
    templePoolColor.copy(templePoolDeep).lerp(templePoolRim, THREE.MathUtils.smoothstep(radius, 1.5, 2.62));
    templePoolColors[index * 3] = templePoolColor.r;
    templePoolColors[index * 3 + 1] = templePoolColor.g;
    templePoolColors[index * 3 + 2] = templePoolColor.b;
  }
  templePoolGeometry.setAttribute('color', new THREE.BufferAttribute(templePoolColors, 3));
  const catchPoolAngle = 1.56;
  const catchPoolWorldRadius = 12.45;
  const catchPoolX = Math.cos(catchPoolAngle) * catchPoolWorldRadius;
  const catchPoolZ = Math.sin(catchPoolAngle) * catchPoolWorldRadius;
  const catchPoolY = sampleJungleBasinHeight(catchPoolWorldRadius, catchPoolAngle) + 1.18;
  const catchPoolGeometry = new THREE.CylinderGeometry(2.68, 2.84, 0.14, 28);
  catchPoolGeometry.translate(catchPoolX, catchPoolY, catchPoolZ);
  const catchPoolPositions = catchPoolGeometry.getAttribute('position') as THREE.BufferAttribute;
  const catchPoolColors = new Float32Array(catchPoolPositions.count * 3);
  const catchPoolDeep = new THREE.Color(0x087783);
  const catchPoolRim = new THREE.Color(0xe7fff7);
  const catchPoolColor = new THREE.Color();
  for (let index = 0; index < catchPoolPositions.count; index += 1) {
    const radius = Math.hypot(
      catchPoolPositions.getX(index) - catchPoolX,
      catchPoolPositions.getZ(index) - catchPoolZ,
    );
    catchPoolColor.copy(catchPoolDeep).lerp(catchPoolRim, THREE.MathUtils.smoothstep(radius, 1.56, 2.84));
    catchPoolColors[index * 3] = catchPoolColor.r;
    catchPoolColors[index * 3 + 1] = catchPoolColor.g;
    catchPoolColors[index * 3 + 2] = catchPoolColor.b;
  }
  catchPoolGeometry.setAttribute('color', new THREE.BufferAttribute(catchPoolColors, 3));
  const catchPoolFoamGeometry = new THREE.TorusGeometry(2.42, 0.1, 4, 28);
  catchPoolFoamGeometry.rotateX(Math.PI / 2);
  catchPoolFoamGeometry.translate(catchPoolX, catchPoolY + 0.11, catchPoolZ);
  const catchPoolFoamPositions = catchPoolFoamGeometry.getAttribute('position') as THREE.BufferAttribute;
  const catchPoolFoamColors = new Float32Array(catchPoolFoamPositions.count * 3);
  const catchPoolFoam = new THREE.Color(0xf1fff9);
  for (let offset = 0; offset < catchPoolFoamColors.length; offset += 3) {
    catchPoolFoamColors[offset] = catchPoolFoam.r;
    catchPoolFoamColors[offset + 1] = catchPoolFoam.g;
    catchPoolFoamColors[offset + 2] = catchPoolFoam.b;
  }
  catchPoolFoamGeometry.setAttribute('color', new THREE.BufferAttribute(catchPoolFoamColors, 3));
  const rippleSpecs = [
    { x: -1.24, z: 11.72, radius: 0.42 },
    { x: 0.92, z: 11.95, radius: 0.56 },
    { x: -0.42, z: 12.58, radius: 0.7 },
    { x: 1.34, z: 12.94, radius: 0.34 },
    { x: -1.56, z: 13.18, radius: 0.52 },
    { x: 0.28, z: 13.46, radius: 0.44 },
    { x: 1.62, z: 13.74, radius: 0.66 },
    { x: -0.82, z: 14.05, radius: 0.36 },
    { x: 0.74, z: 14.42, radius: 0.5 },
  ] as const;
  const rippleColor = new THREE.Color(0xd9fff6);
  const rippleGeometries = rippleSpecs.map((ripple, index) => {
    const radius = Math.hypot(ripple.x, ripple.z);
    const angle = Math.atan2(ripple.z, ripple.x);
    const y = sampleJungleBasinHeight(radius, angle) + 1.34 + (index % 3) * 0.006;
    const geometry = new THREE.TorusGeometry(ripple.radius, 0.018 + (index % 2) * 0.007, 3, 16);
    geometry.rotateX(Math.PI / 2);
    geometry.scale(1, 1, 0.74 + (index % 3) * 0.08);
    geometry.translate(ripple.x, y, ripple.z);
    const position = geometry.getAttribute('position') as THREE.BufferAttribute;
    const vertexColors = new Float32Array(position.count * 3);
    for (let offset = 0; offset < vertexColors.length; offset += 3) {
      vertexColors[offset] = rippleColor.r;
      vertexColors[offset + 1] = rippleColor.g;
      vertexColors[offset + 2] = rippleColor.b;
    }
    geometry.setAttribute('color', new THREE.BufferAttribute(vertexColors, 3));
    return geometry;
  });
  const basinWaterGeometry = mergeGeometries([
    riverGeometry,
    templePoolGeometry,
    catchPoolGeometry,
    catchPoolFoamGeometry,
    ...rippleGeometries,
  ], false) ?? riverGeometry;
  if (basinWaterGeometry !== riverGeometry) riverGeometry.dispose();
  templePoolGeometry.dispose();
  catchPoolGeometry.dispose();
  catchPoolFoamGeometry.dispose();
  rippleGeometries.forEach((geometry) => geometry.dispose());
  const riverMesh = presentMesh(
    new THREE.Mesh(basinWaterGeometry, materials.water),
    'ISLAND_18_BASIN_RIVER_NETWORK',
    5,
  );
  riverMesh.castShadow = false;
  riverMesh.receiveShadow = false;
  riverMesh.userData.foregroundStream = {
    width: 3.45,
    lagoonRadius: 2.55,
    surfaceLift: 1.18,
    heroCascadeAngle: 1.56,
    catchPoolRadius: 2.68,
    catchPoolPosition: [catchPoolX, catchPoolY, catchPoolZ],
    rippleCount: rippleSpecs.length,
    lilyPadCount,
    lotusBudCount,
  };
  registerIsland18RuntimePart('waterfall-and-pool-system', riverMesh, 'basin-river');
  basin.add(riverMesh);
  const poolMarker = registerIsland18RuntimePart(
    'waterfall-and-pool-system',
    new THREE.Object3D(),
    'turquoise-temple-pool',
  );
  poolMarker.name = 'ISLAND_18_TEMPLE_TURQUOISE_POOL';
  poolMarker.position.y = 0.34;
  basin.add(poolMarker);
  root.add(basin);
  return basin;
}

function addFloatingCliff(
  root: THREE.Group,
  materials: Island18JungleExpeditionMaterials,
) {
  const cliff = registerIsland18RuntimePart('floating-cliff-and-temple-terraces', new THREE.Group());
  cliff.name = 'ISLAND_18_FLOATING_CLIFF';
  const crown = cylinder(6.2, 6.48, 0.54, materials.ruinStoneDark, 'ISLAND_18_CLIFF_CROWN', 1, 14);
  crown.position.y = -0.12;
  const terrace = cylinder(6.06, 6.2, 0.18, materials.moss, 'ISLAND_18_CLIFF_MOSS_TERRACE', 1, 14);
  terrace.position.y = 0.25;
  const upper = cylinder(5.88, 4.85, 1.8, materials.ruinStone, 'ISLAND_18_CLIFF_UPPER_MASS', 1, 14);
  upper.position.y = -1.28;
  const middle = cylinder(4.8, 3.35, 2.2, materials.ruinStoneDark, 'ISLAND_18_CLIFF_MIDDLE_MASS', 1, 13);
  middle.position.y = -3.2;
  const lower = cylinder(3.28, 1.12, 2.45, materials.ruinStoneWet, 'ISLAND_18_CLIFF_LOWER_TAPER', 1, 11);
  lower.position.y = -5.45;
  const tip = cone(1.2, 1.85, materials.ruinStoneDark, 'ISLAND_18_CLIFF_TIP', 1, 9);
  tip.position.y = -7.55;
  cliff.add(crown, terrace, upper, middle, lower, tip);
  for (let index = 0; index < 34; index += 1) {
    const angle = index / 34 * Math.PI * 2 + (index % 4) * 0.04;
    const frontness = Math.max(0, Math.sin(angle));
    const radius = 5.62 + (index % 3) * 0.18;
    const ledge = presentMesh(
      new THREE.Mesh(
        new THREE.DodecahedronGeometry(0.52 + (index % 4) * 0.08, 0),
        index % 5 === 0 ? materials.ruinStoneWet : index % 3 === 0 ? materials.ruinStoneLight : materials.ruinStoneDark,
      ),
      `ISLAND_18_CLIFF_CROWN_LEDGE_${index + 1}`,
      1,
    );
    ledge.position.set(
      Math.cos(angle) * radius,
      -0.38 - (index % 4) * 0.16 - frontness * 0.18,
      Math.sin(angle) * radius,
    );
    ledge.scale.set(
      1.24 + frontness * 0.52,
      0.72 + (index % 3) * 0.16 + frontness * 0.18,
      0.88 + frontness * 0.48,
    );
    ledge.rotation.set((index % 3 - 1) * 0.09, -angle + index * 0.07, (index % 2 ? 1 : -1) * 0.08);
    cliff.add(ledge);
  }
  for (let index = 0; index < 22; index += 1) {
    const angle = index / 22 * Math.PI * 2 + 0.12;
    const shelf = roundedBox(
      0.72 + (index % 4) * 0.12,
      0.18 + (index % 3) * 0.05,
      0.46 + (index % 5) * 0.08,
      index % 4 === 0 ? materials.ruinStoneLight : materials.ruinStoneDark,
      `ISLAND_18_CLIFF_RUIN_SHELF_${index + 1}`,
      5,
      0.035,
    );
    shelf.position.set(Math.cos(angle) * 5.72, -0.74 - (index % 3) * 0.24, Math.sin(angle) * 5.72);
    shelf.rotation.y = -angle;
    cliff.add(shelf);
  }
  for (let index = 0; index < 18; index += 1) {
    const angle = index / 18 * Math.PI * 2 + (index % 3) * 0.07;
    const radius = 4.2 + (index % 4) * 0.42;
    const length = 1.2 + (index % 5) * 0.38;
    const spur = cone(0.34 + (index % 3) * 0.08, length, index % 4 === 0 ? materials.ruinStoneWet : materials.ruinStoneDark, `ISLAND_18_CLIFF_STALACTITE_${index + 1}`, 5, 6);
    spur.position.set(Math.cos(angle) * radius, -1.25 - length * 0.5 - (index % 3) * 0.5, Math.sin(angle) * radius);
    spur.rotation.z = Math.cos(angle) * 0.18;
    spur.rotation.x = Math.sin(angle) * 0.18;
    cliff.add(spur);
  }
  const groundingVineAngles = [0.9, 1.16, 1.34, 1.78, 1.98, 2.22] as const;
  groundingVineAngles.forEach((angle, index) => {
    const start = new THREE.Vector3(Math.cos(angle) * 5.76, -0.18, Math.sin(angle) * 5.76);
    const middle = new THREE.Vector3(
      Math.cos(angle + (index % 2 === 0 ? 0.045 : -0.045)) * 5.94,
      -1.48 - (index % 3) * 0.18,
      Math.sin(angle + (index % 2 === 0 ? 0.045 : -0.045)) * 5.94,
    );
    const end = new THREE.Vector3(
      Math.cos(angle - (index % 2 === 0 ? 0.08 : -0.08)) * (6.35 + (index % 2) * 0.34),
      -2.72 - (index % 3) * 0.3,
      Math.sin(angle - (index % 2 === 0 ? 0.08 : -0.08)) * (6.35 + (index % 2) * 0.34),
    );
    cliff.add(
      beamBetween(start, middle, 0.048 + (index % 2) * 0.008, materials.vine, `ISLAND_18_CLIFF_GROUNDING_VINE_${index + 1}_UPPER`, 5, 5),
      beamBetween(middle, end, 0.042 + (index % 3) * 0.006, materials.vine, `ISLAND_18_CLIFF_GROUNDING_VINE_${index + 1}_LOWER`, 5, 5),
    );
  });
  const edgeRuinAngles = [0.08, 0.68, 1.92, 2.52, 3.18, 3.78, 5.04, 5.72] as const;
  edgeRuinAngles.forEach((angle, index) => {
    const height = 0.72 + (index % 4) * 0.18;
    const radius = 5.05 + (index % 2) * 0.22;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tower = roundedBox(
      0.38 + (index % 3) * 0.07,
      height,
      0.42 + ((index + 1) % 3) * 0.06,
      index % 2 === 0 ? materials.ruinStoneDark : materials.ruinStone,
      `ISLAND_18_EDGE_CITY_RUIN_${index + 1}`,
      5,
      0.035,
    );
    tower.position.set(x, 0.38 + height * 0.5, z);
    tower.rotation.y = -angle + Math.PI / 2;
    const crown = cylinder(
      0.24 + (index % 3) * 0.03,
      0.3 + (index % 2) * 0.04,
      0.16,
      index % 3 === 0 ? materials.brassDark : materials.ruinStoneLight,
      `ISLAND_18_EDGE_CITY_RUIN_CROWN_${index + 1}`,
      5,
      6,
    );
    crown.position.set(x, 0.86 + height, z);
    const roofFin = cone(
      0.11,
      0.42 + (index % 3) * 0.08,
      index % 2 === 0 ? materials.brassDark : materials.routeIvory,
      `ISLAND_18_EDGE_CITY_RUIN_FIN_${index + 1}`,
      5,
      5,
    );
    roofFin.position.set(x, 1.13 + height, z);
    const window = roundedBox(
      0.12,
      0.22,
      0.06,
      index % 3 === 0 ? materials.routeViolet : materials.routeIvory,
      `ISLAND_18_EDGE_CITY_RUIN_WINDOW_${index + 1}`,
      5,
      0.018,
    );
    window.position.set(x - Math.cos(angle) * 0.24, 0.54 + height * 0.5, z - Math.sin(angle) * 0.24);
    window.rotation.y = -angle + Math.PI / 2;
    cliff.add(tower, crown, roofFin, window);
  });
  compactStaticGeometry(cliff, 'ISLAND_18_FLOATING_CLIFF_STATIC');
  root.add(cliff);
  return cliff;
}

function addRouteTerrain(root: THREE.Group, materials: Island18JungleExpeditionMaterials) {
  const route = registerIsland18RuntimePart('board-route-corridor', new THREE.Group());
  route.name = 'ISLAND_18_BOARD_ROUTE_TERRAIN';
  const causeway = torus(3.4, 0.63, materials.ruinStoneDark, 'ISLAND_18_RAISED_CAUSEWAY', 1, 8, 72);
  causeway.rotation.x = Math.PI / 2;
  causeway.scale.y = 0.46;
  causeway.position.y = 0.12;
  const mossEdge = torus(3.4, 0.72, materials.moss, 'ISLAND_18_CAUSEWAY_MOSS_EDGE', 1, 6, 72);
  mossEdge.rotation.x = Math.PI / 2;
  mossEdge.scale.y = 0.12;
  mossEdge.position.y = -0.02;
  route.add(causeway, mossEdge);
  const routePalette = [materials.routeIvory, materials.routeViolet, materials.routeAzure] as const;
  for (let index = 0; index < 24; index += 1) {
    const angle = index / 24 * Math.PI * 2;
    const panel = roundedBox(
      0.72,
      0.09,
      0.82,
      routePalette[index % routePalette.length],
      `ISLAND_18_ROUTE_CARVED_PANEL_${index + 1}`,
      5,
      0.028,
    );
    panel.position.set(Math.cos(angle) * 3.4, 0.72, Math.sin(angle) * 3.4);
    panel.rotation.y = -angle + Math.PI / 2;
    route.add(panel);
    if (index % 3 === 0) {
      const glyph = presentMesh(
        new THREE.Mesh(new THREE.OctahedronGeometry(index % 6 === 0 ? 0.16 : 0.12, 0), index % 6 === 0 ? materials.emerald : materials.brass),
        `ISLAND_18_ROUTE_CARVED_PANEL_GLYPH_${index + 1}`,
        5,
      );
      glyph.scale.set(1, 0.22, 1);
      glyph.position.set(Math.cos(angle) * 3.4, 0.8, Math.sin(angle) * 3.4);
      glyph.rotation.y = -angle + Math.PI / 4;
      route.add(glyph);
    }
  }
  for (let index = 0; index < 36; index += 1) {
    const angle = index / 36 * Math.PI * 2;
    const stud = cylinder(0.045, 0.055, 0.08, index % 4 === 0 ? materials.emerald : materials.brass, `ISLAND_18_CAUSEWAY_STUD_${index + 1}`, 5, 6);
    stud.position.set(Math.cos(angle) * 4.0, 0.34, Math.sin(angle) * 4.0);
    route.add(stud);
    [-1, 1].forEach((side) => {
      const curbRadius = side < 0 ? 2.72 : 4.08;
      const curb = roundedBox(
        0.42,
        0.19,
        0.18,
        index % 6 === 0 ? materials.ruinStoneLight : index % 4 === 0 ? materials.brassDark : materials.ruinStone,
        `ISLAND_18_ROUTE_${side < 0 ? 'INNER' : 'OUTER'}_CURB_${index + 1}`,
        1,
        0.028,
      );
      curb.position.set(Math.cos(angle) * curbRadius, 0.31, Math.sin(angle) * curbRadius);
      curb.rotation.y = -angle;
      route.add(curb);
    });
  }
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
    const plinth = roundedBox(0.38, 0.22, 0.42, materials.ruinStoneDark, `ISLAND_18_ROUTE_WAYSTONE_PLINTH_${index + 1}`, 5, 0.04);
    plinth.position.set(Math.cos(angle) * 2.52, 0.48, Math.sin(angle) * 2.52);
    plinth.rotation.y = -angle;
    const waystone = cone(0.1, 0.48, index % 2 === 0 ? materials.emerald : materials.brass, `ISLAND_18_ROUTE_WAYSTONE_${index + 1}`, 5, 5);
    waystone.position.set(Math.cos(angle) * 2.52, 0.82, Math.sin(angle) * 2.52);
    route.add(plinth, waystone);
  }
  compactStaticGeometry(route, 'ISLAND_18_ROUTE_TERRAIN_STATIC');
  root.add(route);
  return route;
}

function addWaterfall(
  staticWaterfallFx: THREE.Group,
  prefix: string,
  angle: number,
  radius: number,
  width: number,
  height: number,
  materials: Island18JungleExpeditionMaterials,
  waterfallInstances: Array<{
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    width: number;
    height: number;
  }>,
) {
  const position = new THREE.Vector3(Math.cos(angle) * radius, -height * 0.5 - 0.2, Math.sin(angle) * radius);
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
  waterfallInstances.push({ position, quaternion, width, height });
  const staticFx = new THREE.Group();
  staticFx.name = `${prefix}_STATIC_FOAM_AND_MIST`;
  const lip = sphere(width * 0.52, materials.foam, `${prefix}_LIP_FOAM`, 5, 10);
  lip.scale.set(1, 0.18, 0.35);
  lip.position.y = height * 0.5;
  const base = sphere(width * 0.72, materials.foam, `${prefix}_BASE_FOAM`, 5, 10);
  base.scale.set(1.1, 0.16, 0.58);
  base.position.y = -height * 0.5;
  const mist = sphere(width * 0.9, materials.mist, `${prefix}_MIST`, 5, 9);
  mist.scale.set(1.4, 0.42, 0.72);
  mist.position.y = -height * 0.46;
  staticFx.add(lip, base, mist);
  staticFx.position.copy(position);
  staticFx.quaternion.copy(quaternion);
  staticWaterfallFx.add(staticFx);
}

function addDepthIsland(
  root: THREE.Group,
  prefix: string,
  position: readonly [number, number, number],
  scale: number,
  materials: Island18JungleExpeditionMaterials,
) {
  const island = registerIsland18RuntimePart('depth-islands-and-horizon', new THREE.Group());
  island.name = prefix;
  island.position.set(...position);
  island.scale.setScalar(scale);
  const top = cylinder(1.42, 1.58, 0.3, materials.moss, `${prefix}_TOP`, 5, 10);
  const terrace = cylinder(1.16, 1.34, 0.42, materials.ruinStone, `${prefix}_TERRACE`, 5, 10);
  terrace.position.y = 0.04;
  const body = cone(1.62, 3.5, materials.ruinStoneWet, `${prefix}_BODY`, 5, 10);
  body.position.y = -1.84;
  const lowerRock = cone(0.86, 2.6, materials.ruinStoneDark, `${prefix}_LOWER_ROCK`, 5, 9);
  lowerRock.position.set(0.18, -3.08, -0.08);
  island.add(top, terrace, body, lowerRock);

  const towerBase = box(0.94, 0.66, 0.78, materials.ruinStone, `${prefix}_RUIN_BASE`, 5);
  towerBase.position.set(0.08, 0.48, -0.06);
  const towerMid = box(0.66, 0.72, 0.62, materials.ruinStoneLight, `${prefix}_RUIN_MID`, 5);
  towerMid.position.set(0.06, 1.04, -0.09);
  const towerCrown = box(0.46, 0.48, 0.48, materials.ruinStone, `${prefix}_RUIN_CROWN`, 5);
  towerCrown.position.set(0.06, 1.58, -0.1);
  const crownCap = cylinder(0.32, 0.4, 0.18, materials.moss, `${prefix}_CROWN_MOSS`, 5, 8);
  crownCap.position.set(0.06, 1.89, -0.1);
  const doorway = box(0.22, 0.38, 0.06, materials.amber, `${prefix}_AMBER_DOOR`, 5);
  doorway.position.set(0.08, 0.55, 0.36);
  island.add(towerBase, towerMid, towerCrown, crownCap, doorway);

  const sideRuinLeft = box(0.36, 0.86, 0.34, materials.ruinStoneDark, `${prefix}_SIDE_RUIN_LEFT`, 5);
  sideRuinLeft.position.set(-0.72, 0.6, -0.14);
  const sideRuinRight = box(0.32, 0.68, 0.3, materials.ruinStone, `${prefix}_SIDE_RUIN_RIGHT`, 5);
  sideRuinRight.position.set(0.74, 0.51, -0.3);
  island.add(sideRuinLeft, sideRuinRight);

  const waterfallGeometry = new THREE.PlaneGeometry(0.42, 2.75, 2, 10);
  const waterfallPositions = waterfallGeometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < waterfallPositions.count; index += 1) {
    const x = waterfallPositions.getX(index);
    const y = waterfallPositions.getY(index);
    waterfallPositions.setZ(index, Math.sin(x * 12 + y * 3.4) * 0.045);
  }
  waterfallGeometry.computeVertexNormals();
  const waterfall = presentMesh(
    new THREE.Mesh(waterfallGeometry, materials.waterfall),
    `${prefix}_WATERFALL`,
    5,
  );
  waterfall.position.set(-0.58, -1.16, 1.26);
  waterfall.rotation.y = 0.08;
  waterfall.castShadow = false;
  waterfall.receiveShadow = false;
  island.add(waterfall);

  addLeafCluster(island, `${prefix}_CANOPY_LEFT`, [-0.82, 0.58, 0.08], 0.88, materials);
  addLeafCluster(island, `${prefix}_CANOPY_RIGHT`, [0.88, 0.62, -0.28], 0.82, materials);
  addLeafCluster(island, `${prefix}_CANOPY_CROWN`, [0.1, 1.92, -0.12], 0.54, materials);
  island.add(
    beamBetween(
      new THREE.Vector3(-0.82, 0.08, 0.78),
      new THREE.Vector3(-0.84, -2.42, 0.5),
      0.024,
      materials.vine,
      `${prefix}_HANGING_ROOT_LEFT`,
      5,
      5,
    ),
    beamBetween(
      new THREE.Vector3(0.78, 0.12, 0.62),
      new THREE.Vector3(0.84, -2.08, 0.28),
      0.022,
      materials.vine,
      `${prefix}_HANGING_ROOT_RIGHT`,
      5,
      5,
    ),
  );
  compactStaticGeometry(island, `${prefix}_STATIC`);
  root.add(island);
  return island;
}

function createIsland18ProceduralSkyDome() {
  const radius = 72;
  const geometry = new THREE.SphereGeometry(radius, 12, 8);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  const colors = new Float32Array(positions.count * 3);
  const lower = new THREE.Color(0x79dce8);
  const horizon = new THREE.Color(0xb9f1f5);
  const middle = new THREE.Color(0x52bee8);
  const zenith = new THREE.Color(0x168bd4);
  const color = new THREE.Color();
  for (let index = 0; index < positions.count; index += 1) {
    const normalizedY = THREE.MathUtils.clamp(positions.getY(index) / radius, -1, 1);
    if (normalizedY < -0.58) {
      color.copy(lower).lerp(horizon, THREE.MathUtils.smoothstep(normalizedY, -1, -0.58));
    } else if (normalizedY < -0.28) {
      color.copy(horizon).lerp(middle, THREE.MathUtils.smoothstep(normalizedY, -0.58, -0.28));
    } else {
      color.copy(middle).lerp(zenith, THREE.MathUtils.smoothstep(normalizedY, -0.28, 0.42));
    }
    colors[index * 3] = color.r;
    colors[index * 3 + 1] = color.g;
    colors[index * 3 + 2] = color.b;
  }
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const material = new THREE.MeshBasicMaterial({
    vertexColors: true,
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    toneMapped: false,
  });
  const dome = presentMesh(new THREE.Mesh(geometry, material), 'ISLAND_18_PROCEDURAL_SKY_DOME', 5);
  dome.position.y = 14.5;
  dome.castShadow = false;
  dome.receiveShadow = false;
  dome.renderOrder = -1000;
  dome.frustumCulled = false;
  registerIsland18RuntimePart('sky-cloud-and-sun-system', dome, 'procedural-sky');
  return dome;
}

function createIsland18CloudDepthField(
  profile: Island3DQualityProfile,
  materials: Island18JungleExpeditionMaterials,
) {
  const field = new THREE.Group();
  field.name = 'ISLAND_18_CLOUD_DEPTH_FIELD';
  const layerCounts = profile.id === 'high'
    ? [5, 4, 2]
    : profile.id === 'medium'
      ? [4, 3, 3]
      : [3, 3, 2];
  const layerProfiles = [
    { y: 5.7, z: -15, spread: 14, size: 1.08 },
    { y: 0.2, z: -28, spread: 19, size: 1.62 },
    { y: -3.1, z: -46, spread: 24, size: 2.28 },
  ] as const;
  const layerColors = [new THREE.Color(0xdff5e9), new THREE.Color(0xb7e5e2), new THREE.Color(0x7fbacd)] as const;
  layerProfiles.forEach((layer, layerIndex) => {
    const count = layerCounts[layerIndex];
    for (let clusterIndex = 0; clusterIndex < count; clusterIndex += 1) {
      const lane = count === 1 ? 0 : clusterIndex / (count - 1) - 0.5;
      let clusterX = lane * layer.spread + Math.sin(clusterIndex * 2.17 + layerIndex) * 1.35;
      if (layerIndex === 0 && Math.abs(clusterX) < 3.8) clusterX += clusterX < 0 ? -3.8 : 3.8;
      const clusterY = layer.y + Math.sin(clusterIndex * 1.71 + layerIndex * 0.8) * 1.42;
      const clusterZ = layer.z - Math.abs(lane) * 2.6 + Math.cos(clusterIndex * 1.39) * 1.1;
      const lobeCount = 3;
      for (let lobeIndex = 0; lobeIndex < lobeCount; lobeIndex += 1) {
        const lobe = presentMesh(
          new THREE.Mesh(new THREE.SphereGeometry(1, 4, 3), materials.cloud),
          `ISLAND_18_CLOUD_L${layerIndex + 1}_C${clusterIndex + 1}_${lobeIndex + 1}`,
          5,
        );
        const lobePhase = lobeIndex - (lobeCount - 1) / 2;
        const lobeSize = layer.size * (0.82 + ((clusterIndex + lobeIndex) % 3) * 0.13);
        const lobeShadow = layerColors[layerIndex].clone().multiplyScalar(0.8 + (lobeIndex % 2) * 0.05);
        const lobeLight = new THREE.Color(0xffffff).lerp(new THREE.Color(0xe7fff2), layerIndex * 0.08);
        const lobeColors = new Float32Array(lobe.geometry.getAttribute('position').count * 3);
        const lobePositions = lobe.geometry.getAttribute('position') as THREE.BufferAttribute;
        for (let colorOffset = 0; colorOffset < lobeColors.length; colorOffset += 3) {
          const vertexIndex = colorOffset / 3;
          const verticalLight = THREE.MathUtils.smoothstep(lobePositions.getY(vertexIndex), -0.72, 0.78);
          const lobeColor = lobeShadow.clone().lerp(lobeLight, 0.22 + verticalLight * 0.78);
          lobeColors[colorOffset] = lobeColor.r;
          lobeColors[colorOffset + 1] = lobeColor.g;
          lobeColors[colorOffset + 2] = lobeColor.b;
        }
        lobe.geometry.setAttribute('color', new THREE.BufferAttribute(lobeColors, 3));
        lobe.position.set(
          clusterX + lobePhase * layer.size * 1.24,
          clusterY + (lobeIndex === 1 ? layer.size * 0.42 : (lobeIndex % 2) * layer.size * 0.12),
          clusterZ + Math.sin(lobeIndex * 2.4 + clusterIndex) * layer.size * 0.32,
        );
        lobe.scale.set(lobeSize * 1.58, lobeSize * 0.82, lobeSize * 1.2);
        lobe.castShadow = false;
        lobe.receiveShadow = false;
        field.add(lobe);
      }
    }
  });
  compactStaticGeometry(field, 'ISLAND_18_CLOUD_DEPTH_FIELD_STATIC');
  field.userData.baseY = field.position.y;
  registerIsland18RuntimePart('sky-cloud-and-sun-system', field, 'cloud-depth');
  return field;
}

function addIsland18DistantCanyonField(
  root: THREE.Group,
  materials: Island18JungleExpeditionMaterials,
) {
  const field = new THREE.Group();
  field.name = 'ISLAND_18_DISTANT_CANYON_FIELD';
  const lanes = [-0.72, -0.5, -0.31, 0.31, 0.5, 0.72] as const;
  lanes.forEach((lane, index) => {
    const z = -58 - (index % 3) * 5.4;
    const height = 7.4 + (index % 4) * 1.05;
    const radius = 1.65 + (index % 3) * 0.42;
    const x = lane * 31 + Math.sin(index * 1.9) * 0.62;
    const depthScale = 0.74 + (index % 3) * 0.1;
    const peak = cylinder(
      radius * 0.62,
      radius,
      height,
      index % 3 === 0 ? materials.ruinStoneWet : materials.ruinStone,
      `ISLAND_18_DISTANT_CANYON_PEAK_${index + 1}`,
      5,
      7,
    );
    peak.position.set(x, -21.5 + height * 0.42, z);
    peak.scale.z = depthScale;
    const shoulder = cylinder(
      radius * 0.78,
      radius * 0.92,
      1.05 + (index % 2) * 0.32,
      materials.ruinStoneLight,
      `ISLAND_18_DISTANT_CANYON_SHOULDER_${index + 1}`,
      5,
      7,
    );
    shoulder.position.set(x, peak.position.y + height * 0.46, z);
    shoulder.scale.z = depthScale;
    const crown = cylinder(
      radius * 0.58,
      radius * 0.72,
      0.58 + (index % 2) * 0.18,
      materials.moss,
      `ISLAND_18_DISTANT_CANYON_CROWN_${index + 1}`,
      5,
      7,
    );
    crown.position.set(x, shoulder.position.y + 0.74, z);
    crown.scale.z = depthScale;
    field.add(peak, shoulder, crown);
    if (index % 3 === 1) {
      const waterfall = new THREE.Mesh(
        new THREE.PlaneGeometry(0.34 + (index % 3) * 0.08, 3.4 + (index % 2) * 0.8, 1, 5),
        materials.waterfall,
      );
      waterfall.name = `ISLAND_18_DISTANT_CANYON_WATERFALL_${index + 1}`;
      waterfall.position.set(x - radius * 0.34, peak.position.y + height * 0.12, z + radius * depthScale * 0.64);
      waterfall.castShadow = false;
      waterfall.receiveShadow = false;
      field.add(waterfall);
    }
  });
  root.add(field);
  return field;
}

function createLivingCompassMechanism(materials: Island18JungleExpeditionMaterials) {
  const root = registerIsland18RuntimePart('living-compass-mechanism', new THREE.Group(), 'mission');
  root.name = 'ISLAND_18_LIVING_COMPASS';
  root.position.set(0, 9.18, -0.18);
  root.scale.setScalar(1.18);
  const rings: THREE.Mesh[] = [];
  [0.72, 0.92, 1.12].forEach((radius, index) => {
    const ring = torus(radius, 0.055 - index * 0.006, index === 1 ? materials.emerald : materials.brass, `ISLAND_18_LIVING_COMPASS_RING_${index + 1}`, 5, 7, 42);
    ring.rotation.set(index === 0 ? Math.PI / 2 : 0, index === 2 ? Math.PI / 2 : index * 0.45, index * 0.36);
    ring.visible = false;
    rings.push(ring);
    root.add(ring);
  });
  const core = sphere(0.22, materials.emerald, 'ISLAND_18_LIVING_COMPASS_CORE', 5, 14);
  core.visible = false;
  root.add(core);
  const glyphs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.06, 6),
    materials.brassDark,
    5,
  );
  glyphs.name = 'ISLAND_18_WAYFINDER_GLYPH_BATCH';
  glyphs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  glyphs.visible = false;
  const glyphMatrix = new THREE.Matrix4();
  const glyphQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  for (let index = 0; index < 5; index += 1) {
    const angle = index / 5 * Math.PI * 2 - Math.PI / 2;
    glyphMatrix.compose(
      new THREE.Vector3(Math.cos(angle) * 0.64, Math.sin(angle) * 0.64, 0.08),
      glyphQuaternion,
      new THREE.Vector3(0.001, 0.001, 0.001),
    );
    glyphs.setMatrixAt(index, glyphMatrix);
  }
  glyphs.instanceMatrix.needsUpdate = true;
  root.add(glyphs);
  const glyphMarkers = Array.from({ length: 5 }, (_, index) => {
    const marker = new THREE.Object3D();
    marker.name = `ISLAND_18_WAYFINDER_GLYPH_${index + 1}`;
    marker.visible = false;
    root.add(marker);
    return marker;
  });
  root.userData.rings = rings;
  root.userData.glyphBatch = glyphs;
  root.userData.glyphMarkers = glyphMarkers;
  root.userData.core = core;
  return { root, rings, glyphs, glyphMarkers, core };
}

export function getIsland18EmeraldZenithFocus() {
  return new THREE.Vector3(0, 7.2, -0.2);
}

export function createIsland18JungleExpeditionLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island18JungleExpeditionMaterials,
): Island18JungleExpeditionAmbienceRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_18_JUNGLE_EXPEDITION_WORLD';
  root.userData.worldIdentity = {
    runtimeIslandNumber: 18,
    missionId: ISLAND_18_LIVING_COMPASS_MISSION_ID,
    representation: 'procedural-threejs',
    referenceProjectionCount: 0,
  };
  const primarySkyLight = scene.getObjectByName('ISLAND_18_PRIMARY_SKY_LIGHT') as THREE.HemisphereLight | undefined;
  const primarySunLight = scene.getObjectByName('ISLAND_18_PRIMARY_SUN_LIGHT') as THREE.DirectionalLight | undefined;
  const turquoiseBounceLight = scene.getObjectByName('ISLAND_18_TURQUOISE_SKY_BOUNCE_LIGHT') as THREE.DirectionalLight | undefined;
  const primarySkyBaseIntensity = primarySkyLight?.intensity ?? 1.58;
  const primarySunBaseIntensity = primarySunLight?.intensity ?? 3.75;
  const turquoiseBounceBaseIntensity = turquoiseBounceLight?.intensity ?? 0.46;
  const primarySkyBaseColor = primarySkyLight?.color.clone() ?? new THREE.Color(0xdaf6d8);
  const primarySkyBaseGroundColor = primarySkyLight?.groundColor.clone() ?? new THREE.Color(0x173b26);
  const primarySunBaseColor = primarySunLight?.color.clone() ?? new THREE.Color(0xffdda6);
  const stormSkyLightColor = new THREE.Color(0x7896a1);
  const stormGroundLightColor = new THREE.Color(0x0b201c);
  const stormSunLightColor = new THREE.Color(0xa8bec1);
  const animatedLeaves: THREE.Object3D[] = [];
  const waterfallInstances: Array<{
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
    width: number;
    height: number;
  }> = [];
  const floatingSlabs: Array<{ rest: THREE.Vector3; orbit: THREE.Vector3; width: number }> = [];
  const cloudLayers: THREE.Group[] = [];
  const ropeBridges: THREE.Group[] = [];
  const vineGates: THREE.Group[] = [];

  addContinuousJungleBasin(root, profile, materials);
  addFloatingCliff(root, materials);
  addRouteTerrain(root, materials);

  const innerRuins = registerIsland18RuntimePart('stone-relief-and-moss', new THREE.Group(), 'landscape');
  innerRuins.name = 'ISLAND_18_PROCESSIONAL_RUINS_AND_BEACONS';
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2 + Math.PI / 8;
    const radius = 2.72 + (index % 2) * 0.16;
    const pillarHeight = 0.58 + (index % 3) * 0.14;
    const plinth = cylinder(0.2, 0.27, 0.18, materials.ruinStoneDark, `ISLAND_18_PROCESSIONAL_PLINTH_${index + 1}`, 5, 8);
    plinth.position.set(Math.cos(angle) * radius, 0.5, Math.sin(angle) * radius);
    const pillar = box(0.23, pillarHeight, 0.23, index % 2 === 0 ? materials.ruinStone : materials.ruinStoneDark, `ISLAND_18_PROCESSIONAL_PILLAR_${index + 1}`, 5);
    pillar.position.set(Math.cos(angle) * radius, 0.82 + pillarHeight * 0.5, Math.sin(angle) * radius);
    pillar.rotation.y = -angle;
    const beacon = sphere(0.095, index % 3 === 0 ? materials.emerald : materials.amber, `ISLAND_18_PROCESSIONAL_BEACON_${index + 1}`, 5, 9);
    beacon.position.set(Math.cos(angle) * radius, 0.86 + pillarHeight, Math.sin(angle) * radius);
    innerRuins.add(plinth, pillar, beacon);
  }
  compactStaticGeometry(innerRuins, 'ISLAND_18_PROCESSIONAL_RUINS_STATIC');
  root.add(innerRuins);

  const satellitePositions = ISLAND_5_LANDMARKS.filter((landmark) => landmark.id !== 'boss');
  const satelliteTerrain = new THREE.Group();
  satelliteTerrain.name = 'ISLAND_18_SATELLITE_TERRAIN';
  satellitePositions.forEach((landmark, index) => {
    const satellite = cylinder(1.55, 1.82, 0.42, materials.ruinStoneDark, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_CROWN`, 1, 10);
    satellite.position.set(landmark.position[0], -0.14, landmark.position[2]);
    satelliteTerrain.add(satellite);
    const underside = cone(1.78, 2.8 + index * 0.18, materials.ruinStoneDark, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_UNDERSIDE`, 1, 9);
    underside.position.set(landmark.position[0], -1.65 - index * 0.08, landmark.position[2]);
    satelliteTerrain.add(underside);
    const mossCap = cylinder(1.48, 1.55, 0.1, materials.moss, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_MOSS`, 5, 10);
    mossCap.position.set(landmark.position[0], 0.12, landmark.position[2]);
    const lowerTerrace = cylinder(1.28, 1.46, 0.22, index % 2 === 0 ? materials.ruinStone : materials.ruinStoneWet, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_LOWER_TERRACE`, 5, 10);
    lowerTerrace.position.set(landmark.position[0], 0.2, landmark.position[2]);
    const upperTerrace = cylinder(1.08, 1.24, 0.18, materials.ruinStoneLight, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_UPPER_TERRACE`, 5, 10);
    upperTerrace.position.set(landmark.position[0], 0.38, landmark.position[2]);
    satelliteTerrain.add(mossCap, lowerTerrace, upperTerrace);
    const radialAngle = Math.atan2(landmark.position[0], landmark.position[2]);
    [-1, 1].forEach((side) => {
      const shoulderAngle = radialAngle + side * 0.72;
      const shoulder = presentMesh(
        new THREE.Mesh(new THREE.DodecahedronGeometry(0.54 + index * 0.04, 0), side < 0 ? materials.ruinStoneDark : materials.ruinStoneWet),
        `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_SHOULDER_${side}`,
        5,
      );
      shoulder.position.set(
        landmark.position[0] + Math.sin(shoulderAngle) * 1.34,
        -0.42 - (side > 0 ? 0.18 : 0),
        landmark.position[2] + Math.cos(shoulderAngle) * 1.34,
      );
      shoulder.scale.set(1.25, 1.5, 1.05);
      satelliteTerrain.add(shoulder);
    });
    for (let shardIndex = 0; shardIndex < 6; shardIndex += 1) {
      const shardAngle = shardIndex / 6 * Math.PI * 2 + index * 0.31;
      const shardRadius = 0.72 + shardIndex % 3 * 0.22;
      const shardLength = 0.82 + (shardIndex + index) % 4 * 0.28;
      const shard = cone(
        0.18 + shardIndex % 2 * 0.07,
        shardLength,
        shardIndex % 3 === 0 ? materials.ruinStoneWet : materials.ruinStoneDark,
        `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_ROOT_CRAG_${shardIndex + 1}`,
        5,
        6,
      );
      shard.position.set(
        landmark.position[0] + Math.cos(shardAngle) * shardRadius,
        -2.72 - shardIndex % 2 * 0.24,
        landmark.position[2] + Math.sin(shardAngle) * shardRadius,
      );
      shard.rotation.x = Math.sin(shardAngle) * 0.16;
      shard.rotation.z = -Math.cos(shardAngle) * 0.16;
      satelliteTerrain.add(shard);
    }
    [-1, 1].forEach((side) => {
      const rootStart = new THREE.Vector3(
        landmark.position[0] + side * 0.72,
        0.16,
        landmark.position[2] + (index % 2 === 0 ? 0.42 : -0.42),
      );
      addVine(satelliteTerrain, `ISLAND_18_${landmark.id.toUpperCase()}_HANGING_ROOT_${side}`, [
        rootStart,
        rootStart.clone().add(new THREE.Vector3(side * 0.12, -0.72, 0.08)),
        rootStart.clone().add(new THREE.Vector3(-side * 0.08, -1.48, -0.06)),
        rootStart.clone().add(new THREE.Vector3(side * 0.16, -2.18, 0.1)),
      ], materials.vine, 5, 0.028);
    });
    const markerAngle = radialAngle + (index % 2 === 0 ? 0.94 : -0.94);
    const markerPosition = new THREE.Vector3(
      landmark.position[0] + Math.sin(markerAngle) * 1.12,
      0.88,
      landmark.position[2] + Math.cos(markerAngle) * 1.12,
    );
    const markerTower = roundedBox(0.28, 1.06 + index * 0.08, 0.3, materials.ruinStoneDark, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_MARKER_TOWER`, 5, 0.045);
    markerTower.position.copy(markerPosition);
    const markerLight = sphere(0.085, index % 2 === 0 ? materials.amber : materials.emerald, `ISLAND_18_${landmark.id.toUpperCase()}_SATELLITE_MARKER_LIGHT`, 5, 9);
    markerLight.position.copy(markerPosition).add(new THREE.Vector3(0, 0.66 + index * 0.04, 0));
    satelliteTerrain.add(markerTower, markerLight);
  });
  compactStaticGeometry(satelliteTerrain, 'ISLAND_18_SATELLITE_TERRAIN_STATIC');
  root.add(satelliteTerrain);
  addLandmarkContactShadows(root, satellitePositions);

  const bridgePairs = [
    [new THREE.Vector3(-2.2, 0.42, 1.25), new THREE.Vector3(satellitePositions[0].position[0] * 0.78, 0.42, satellitePositions[0].position[2] * 0.78)],
    [new THREE.Vector3(2.15, 0.44, 1.18), new THREE.Vector3(satellitePositions[1].position[0] * 0.78, 0.44, satellitePositions[1].position[2] * 0.78)],
    [new THREE.Vector3(-2.18, 0.42, -1.2), new THREE.Vector3(satellitePositions[2].position[0] * 0.78, 0.42, satellitePositions[2].position[2] * 0.78)],
    [new THREE.Vector3(2.16, 0.42, -1.18), new THREE.Vector3(satellitePositions[3].position[0] * 0.78, 0.42, satellitePositions[3].position[2] * 0.78)],
  ] as const;
  bridgePairs.forEach(([start, end], index) => {
    const bridge = addRopeBridge(root, `ISLAND_18_ROPE_SKYBRIDGE_${index + 1}`, start, end, materials, 5, profile.id === 'low' ? 10 : 14);
    registerIsland18RuntimePart('rope-skybridges', bridge, 'bridge');
    compactStaticGeometry(bridge, `${bridge.name}_STATIC`);
    bridge.userData.restY = bridge.position.y;
    ropeBridges.push(bridge);
  });

  [-0.52, 0.52].forEach((offset, index) => {
    const gate = new THREE.Group();
    gate.name = `ISLAND_18_JUNGLE_PATH_VINE_GATE_${index + 1}`;
    gate.position.set(4.36 + offset, 0.35, -3.9);
    addVine(gate, `${gate.name}_CURTAIN`, [
      new THREE.Vector3(0, 1.7, 0),
      new THREE.Vector3(index === 0 ? 0.16 : -0.16, 1.12, 0.06),
      new THREE.Vector3(index === 0 ? -0.1 : 0.1, 0.56, -0.03),
      new THREE.Vector3(0.06, 0, 0.04),
    ], materials.vine, 5, 0.045);
    addLeafCluster(gate, `${gate.name}_CROWN`, [0, 1.72, 0], 0.58, materials);
    gate.userData.closedY = gate.position.y;
    vineGates.push(gate);
    root.add(gate);
  });

  const staticWaterfallFx = new THREE.Group();
  staticWaterfallFx.name = 'ISLAND_18_WATERFALL_STATIC_FX';
  [0.12, 0.72, 1.56, 2.24, 3.02, 3.74, 4.45, 5.36].forEach((angle, index) => {
    const heroFrontCascade = index === 2;
    addWaterfall(
      staticWaterfallFx,
      `ISLAND_18_WATERFALL_${index + 1}`,
      angle,
      index % 3 === 0 ? 6.08 : 5.84,
      heroFrontCascade ? 1.45 : index % 2 === 0 ? 0.72 : 0.5,
      heroFrontCascade ? 6.35 : index % 3 === 0 ? 5.9 : 4.6,
      materials,
      waterfallInstances,
    );
  });
  const heroRiverCascadeRadii = [7.08, 8.62, 10.18, 11.82, 13.58] as const;
  heroRiverCascadeRadii.forEach((radius, index) => {
    const angle = 1.56 + Math.sin(index * 1.74) * 0.018;
    const width = 1.12 + index * 0.23;
    const height = 0.32 + (index % 3) * 0.08;
    const streamSurfaceY = sampleJungleBasinHeight(radius, angle) + 1.18;
    const position = new THREE.Vector3(
      Math.cos(angle) * radius,
      streamSurfaceY - height * 0.5 - 0.015,
      Math.sin(angle) * radius,
    );
    const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0));
    waterfallInstances.push({ position, quaternion, width, height });
    const lip = sphere(width * 0.2, materials.foam, `ISLAND_18_HERO_RIVER_CASCADE_${index + 1}_LIP`, 5, 5);
    lip.position.set(position.x - width * 0.12, streamSurfaceY + 0.018, position.z - 0.025);
    lip.scale.set(1.34, 0.18, 0.42);
    lip.rotation.z = index % 2 === 0 ? 0.08 : -0.06;
    const plunge = sphere(width * 0.23, materials.foam, `ISLAND_18_HERO_RIVER_CASCADE_${index + 1}_PLUNGE`, 5, 5);
    plunge.position.set(position.x + width * 0.1, streamSurfaceY - height + 0.03, position.z + 0.09);
    plunge.scale.set(1.46, 0.16, 0.48);
    plunge.rotation.z = index % 2 === 0 ? -0.1 : 0.07;
    staticWaterfallFx.add(lip, plunge);
  });
  root.userData.heroRiverCascadeCount = heroRiverCascadeRadii.length;
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2 + 0.18;
    const radius = 7.2 + (index % 4) * 1.55;
    const mistBand = presentMesh(
      new THREE.Mesh(new THREE.PlaneGeometry(1, 1), materials.mist),
      `ISLAND_18_BASIN_MIST_BAND_${index + 1}`,
      5,
    );
    mistBand.position.set(
      Math.cos(angle) * radius,
      sampleJungleBasinHeight(radius, angle) + 0.42 + (index % 3) * 0.12,
      Math.sin(angle) * radius,
    );
    mistBand.rotation.set(-Math.PI / 2 + (index % 2 ? 0.08 : -0.06), -angle, 0);
    mistBand.scale.set(2.2 + (index % 3) * 0.55, 0.62 + (index % 2) * 0.18, 1);
    mistBand.castShadow = false;
    mistBand.receiveShadow = false;
    staticWaterfallFx.add(mistBand);
  }
  const waterfallSheetGeometry = new THREE.PlaneGeometry(1, 1, 1, 7);
  const waterfallSheetPositions = waterfallSheetGeometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < waterfallSheetPositions.count; index += 1) {
    const x = waterfallSheetPositions.getX(index);
    const y = waterfallSheetPositions.getY(index);
    waterfallSheetPositions.setZ(index, Math.sin(x * 5.2 + y * 4.8) * 0.045 + Math.cos(y * 6.2) * 0.02);
  }
  waterfallSheetGeometry.computeVertexNormals();
  const waterfallSheets = new THREE.InstancedMesh(
    waterfallSheetGeometry,
    materials.waterfall,
    waterfallInstances.length,
  );
  waterfallSheets.name = 'ISLAND_18_WATERFALL_SHEET_BATCH';
  waterfallSheets.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  waterfallSheets.castShadow = false;
  waterfallSheets.receiveShadow = false;
  const waterfallSheetMatrix = new THREE.Matrix4();
  const waterfallSheetScale = new THREE.Vector3();
  const waterfallSheetPosition = new THREE.Vector3();
  waterfallInstances.forEach((fall, index) => {
    waterfallSheetMatrix.compose(
      fall.position,
      fall.quaternion,
      waterfallSheetScale.set(fall.width, fall.height, 1),
    );
    waterfallSheets.setMatrixAt(index, waterfallSheetMatrix);
  });
  waterfallSheets.instanceMatrix.needsUpdate = true;
  registerIsland18RuntimePart('waterfall-and-pool-system', waterfallSheets, 'water');
  root.add(waterfallSheets);
  compactStaticGeometry(staticWaterfallFx, 'ISLAND_18_WATERFALL_STATIC_FX');
  root.add(staticWaterfallFx);

  const foliageCount = profile.id === 'high' ? 50 : profile.id === 'medium' ? 46 : 30;
  const canopyField = createInstancedCanopyField(foliageCount, materials);
  root.add(canopyField.root);
  animatedLeaves.push(...canopyField.meshes);
  const palmGrove = createInstancedPalmGrove(profile.id === 'high' ? 12 : profile.id === 'medium' ? 10 : 8, materials);
  root.add(palmGrove);
  animatedLeaves.push(palmGrove);
  const understory = createInstancedUnderstoryField(profile.id === 'high' ? 54 : profile.id === 'medium' ? 52 : 38, materials);
  root.add(understory.root);
  const templeOvergrowth = createTempleOvergrowthField(profile.id === 'high' ? 32 : profile.id === 'medium' ? 30 : 24, materials);
  root.add(templeOvergrowth.root);

  const hangingVines = registerIsland18RuntimePart('jungle-canopy-and-vines', new THREE.Group(), 'foliage');
  hangingVines.name = 'ISLAND_18_HANGING_VINES';
  for (let index = 0; index < (profile.id === 'high' ? 22 : 14); index += 1) {
    const angle = index / 22 * Math.PI * 2 + 0.14;
    const start = new THREE.Vector3(Math.cos(angle) * 5.6, 0.18, Math.sin(angle) * 5.6);
    const length = 1.4 + (index % 4) * 0.38;
    addVine(hangingVines, `ISLAND_18_HANGING_VINE_${index + 1}`, [
      start,
      start.clone().add(new THREE.Vector3(Math.sin(angle) * 0.18, -length * 0.35, Math.cos(angle) * 0.18)),
      start.clone().add(new THREE.Vector3(-Math.sin(angle) * 0.12, -length * 0.72, -Math.cos(angle) * 0.12)),
      start.clone().add(new THREE.Vector3(Math.sin(angle) * 0.1, -length, Math.cos(angle) * 0.1)),
    ], materials.vine, 5, 0.026);
  }
  compactStaticGeometry(hangingVines, 'ISLAND_18_HANGING_VINES_STATIC');
  root.add(hangingVines);

  const depthIslands = registerIsland18RuntimePart('depth-islands-and-horizon', new THREE.Group(), 'horizon');
  depthIslands.name = 'ISLAND_18_DEPTH_ISLAND_NETWORK';
  const frontDepthSector = new THREE.Group();
  frontDepthSector.name = 'ISLAND_18_FRONT_DEPTH_SECTOR';
  addDepthIsland(frontDepthSector, 'ISLAND_18_DEPTH_ISLAND_LEFT', [-5.2, 3.4, -16], 2, materials);
  addDepthIsland(frontDepthSector, 'ISLAND_18_DEPTH_ISLAND_RIGHT', [5.5, 3.8, -19], 2.12, materials);
  addDepthIsland(frontDepthSector, 'ISLAND_18_DEPTH_ISLAND_REAR', [-1.8, 1.4, -27], 1.76, materials);
  addDepthIsland(frontDepthSector, 'ISLAND_18_DEPTH_ISLAND_FAR_LEFT', [-7.4, -0.8, -35], 1.9, materials);
  addDepthIsland(frontDepthSector, 'ISLAND_18_DEPTH_ISLAND_FAR_RIGHT', [7.2, -1, -39], 2, materials);
  addIsland18DistantCanyonField(frontDepthSector, materials);
  compactStaticGeometry(frontDepthSector, 'ISLAND_18_FRONT_DEPTH_SECTOR_STATIC');
  const rearDepthSector = new THREE.Group();
  rearDepthSector.name = 'ISLAND_18_REAR_DEPTH_SECTOR';
  addDepthIsland(rearDepthSector, 'ISLAND_18_REAR_DEPTH_ISLAND_LEFT', [-5.4, 3.2, -18], 1.96, materials);
  addDepthIsland(rearDepthSector, 'ISLAND_18_REAR_DEPTH_ISLAND_RIGHT', [5.6, 3.6, -21], 2.08, materials);
  addDepthIsland(rearDepthSector, 'ISLAND_18_REAR_DEPTH_ISLAND_CENTRE', [0.8, 0.6, -33], 1.74, materials);
  compactStaticGeometry(rearDepthSector, 'ISLAND_18_REAR_DEPTH_SECTOR_STATIC');
  rearDepthSector.rotation.y = Math.PI;
  rearDepthSector.visible = false;
  const eastDepthSector = rearDepthSector.clone(true);
  eastDepthSector.name = 'ISLAND_18_EAST_DEPTH_SECTOR';
  eastDepthSector.rotation.y = Math.PI / 2;
  eastDepthSector.visible = false;
  const westDepthSector = rearDepthSector.clone(true);
  westDepthSector.name = 'ISLAND_18_WEST_DEPTH_SECTOR';
  westDepthSector.rotation.y = -Math.PI / 2;
  westDepthSector.visible = false;
  depthIslands.add(frontDepthSector, rearDepthSector, eastDepthSector, westDepthSector);
  root.add(depthIslands);

  const skyRoot = registerIsland18RuntimePart('sky-cloud-and-sun-system', new THREE.Group(), 'sky');
  skyRoot.name = 'ISLAND_18_WORLD_SPACE_SKY';
  const skyDome = createIsland18ProceduralSkyDome();
  const skyDomeMaterial = skyDome.material as THREE.MeshBasicMaterial;
  skyRoot.add(skyDome);
  const cloudDepthField = createIsland18CloudDepthField(profile, materials);
  cloudDepthField.userData.baseRotationY = 0;
  const rearCloudDepthField = cloudDepthField.clone(true);
  rearCloudDepthField.name = 'ISLAND_18_REAR_CLOUD_DEPTH_FIELD';
  rearCloudDepthField.rotation.y = Math.PI;
  rearCloudDepthField.userData.baseRotationY = Math.PI;
  rearCloudDepthField.visible = false;
  const eastCloudDepthField = cloudDepthField.clone(true);
  eastCloudDepthField.name = 'ISLAND_18_EAST_CLOUD_DEPTH_FIELD';
  eastCloudDepthField.rotation.y = Math.PI / 2;
  eastCloudDepthField.userData.baseRotationY = Math.PI / 2;
  eastCloudDepthField.visible = false;
  const westCloudDepthField = cloudDepthField.clone(true);
  westCloudDepthField.name = 'ISLAND_18_WEST_CLOUD_DEPTH_FIELD';
  westCloudDepthField.rotation.y = -Math.PI / 2;
  westCloudDepthField.userData.baseRotationY = -Math.PI / 2;
  westCloudDepthField.visible = false;
  cloudLayers.push(cloudDepthField, rearCloudDepthField, eastCloudDepthField, westCloudDepthField);
  skyRoot.add(cloudDepthField, rearCloudDepthField, eastCloudDepthField, westCloudDepthField);
  const sunAnchor = registerIsland18RuntimePart('sky-cloud-and-sun-system', new THREE.Object3D(), 'world-space-sun-anchor');
  sunAnchor.name = 'ISLAND_18_WORLD_SPACE_SUN';
  sunAnchor.position.set(6.8, -1, -32);
  sunAnchor.userData.proceduralGlowSurface = 'ISLAND_18_WORLD_SPACE_SUN_CORE';
  const sunCoreMaterial = new THREE.MeshBasicMaterial({
    color: 0xffe8a4,
    transparent: true,
    opacity: 1,
    fog: false,
    toneMapped: false,
  });
  const sunCore = sphere(
    1.26,
    sunCoreMaterial,
    'ISLAND_18_WORLD_SPACE_SUN_CORE',
    5,
    12,
  );
  sunCore.castShadow = false;
  sunCore.receiveShadow = false;
  sunAnchor.add(sunCore);
  skyRoot.add(sunAnchor);
  const aerialFauna = createJungleAerialFaunaBatch(profile);
  registerIsland18RuntimePart('living-ambience', aerialFauna.mesh, 'animated-exotic-fauna');
  skyRoot.add(aerialFauna.mesh);
  const weatherField = createIsland18WeatherLineField(profile);
  registerIsland18RuntimePart('living-ambience', weatherField.lines, 'cyclical-jungle-weather');
  skyRoot.add(weatherField.lines);
  const weatherSkyLight = new THREE.HemisphereLight(0x9feaff, 0x173821, 0.42);
  weatherSkyLight.name = 'ISLAND_18_WEATHER_SKY_LIGHT';
  const weatherSunLight = new THREE.DirectionalLight(0xffe6a6, 0.54);
  weatherSunLight.name = 'ISLAND_18_WEATHER_SUN_LIGHT';
  weatherSunLight.position.set(10, 18, 12);
  const lightningLight = new THREE.PointLight(0xd9f5ff, 0, 58, 1.2);
  lightningLight.name = 'ISLAND_18_WEATHER_LIGHTNING_FLASH';
  lightningLight.position.set(-6, 15, 5);
  skyRoot.add(weatherSkyLight, weatherSunLight, lightningLight);
  root.add(skyRoot);
  const practicalHaloMaterial = new THREE.MeshBasicMaterial({
    color: 0xffb34f,
    transparent: true,
    opacity: 0.025,
    depthWrite: false,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const practicalHaloSites = [
    { position: new THREE.Vector3(0, 2.72, 1.42), radius: 0.92 },
    { position: new THREE.Vector3(-0.72, 1.54, 1.68), radius: 0.44 },
    { position: new THREE.Vector3(0.72, 1.54, 1.68), radius: 0.44 },
    { position: new THREE.Vector3(-4.36, 1.36, -3.42), radius: 0.56 },
    { position: new THREE.Vector3(3.55, 1.42, -3.45), radius: 0.5 },
    { position: new THREE.Vector3(5.17, 1.42, -3.45), radius: 0.5 },
    { position: new THREE.Vector3(-4.95, 1.6, 4.36), radius: 0.62 },
    { position: new THREE.Vector3(3.5, 1.5, 4.44), radius: 0.5 },
    { position: new THREE.Vector3(5.22, 1.5, 4.44), radius: 0.5 },
  ] as const;
  const practicalHaloField = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, 8, 6),
    practicalHaloMaterial,
    practicalHaloSites.length,
  );
  practicalHaloField.name = 'ISLAND_18_PRACTICAL_LIGHT_HALO_FIELD';
  practicalHaloField.castShadow = false;
  practicalHaloField.receiveShadow = false;
  practicalHaloField.renderOrder = 6;
  const practicalHaloMatrix = new THREE.Matrix4();
  const practicalHaloQuaternion = new THREE.Quaternion();
  const practicalHaloScale = new THREE.Vector3();
  practicalHaloSites.forEach((site, index) => {
    practicalHaloMatrix.compose(
      site.position,
      practicalHaloQuaternion,
      practicalHaloScale.setScalar(site.radius),
    );
    practicalHaloField.setMatrixAt(index, practicalHaloMatrix);
  });
  practicalHaloField.instanceMatrix.needsUpdate = true;
  practicalHaloField.userData.presentationOnly = true;
  practicalHaloField.userData.siteCount = practicalHaloSites.length;
  registerIsland18RuntimePart('living-ambience', practicalHaloField, 'storm-responsive-practical-halos');
  root.add(practicalHaloField);
  const practicalPoolSpecs = [
    { id: 'EXPLORER_NEST', position: new THREE.Vector3(-4.36, 1.42, -3.46), distance: 5.2 },
    { id: 'JUNGLE_PATH', position: new THREE.Vector3(4.36, 1.5, -3.5), distance: 5.4 },
    { id: 'EXPLORERS_CAMP', position: new THREE.Vector3(-4.72, 1.58, 4.12), distance: 5.6 },
    { id: 'SURVIVAL_TRIALS', position: new THREE.Vector3(4.36, 1.56, 4.18), distance: 5.4 },
  ] as const;
  const practicalPoolCount = profile.id === 'high' ? 4 : profile.id === 'medium' ? 2 : 1;
  const practicalPoolLights = practicalPoolSpecs.slice(0, practicalPoolCount).map((spec, index) => {
    const light = new THREE.PointLight(index % 2 === 0 ? 0xffa44a : 0xffbc58, 0.08, spec.distance, 1.92);
    light.name = `ISLAND_18_${spec.id}_PRACTICAL_POOL`;
    light.position.copy(spec.position);
    light.castShadow = false;
    root.add(light);
    return light;
  });
  root.userData.practicalLightNetwork = {
    haloSiteCount: practicalHaloSites.length,
    pooledLightCount: practicalPoolLights.length,
    quality: profile.id,
    presentationOnly: true,
  };
  root.userData.weatherCycle = {
    durationSeconds: ISLAND_18_WEATHER_CYCLE_SECONDS,
    phases: ['clear-rest', 'cloud-gathering', 'storm-darkening', 'rain-and-lightning', 'sunbreak', 'clear-recovery'],
    stormFlashCountRange: [1, 5],
    stormFlashCountWeights: ISLAND_18_STORM_FLASH_COUNT_WEIGHTS,
    reducedMotion: 'holds-clear-rest',
  };

  const compass = createLivingCompassMechanism(materials);
  root.add(compass.root);
  const zenithFx = registerIsland18RuntimePart('emerald-zenith-fx', new THREE.Group(), 'mission-fx');
  zenithFx.name = 'ISLAND_18_EMERALD_ZENITH_FX';
  root.add(zenithFx);
  const floatingSlabMesh = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1, 0.16, 0.38),
    materials.ruinStone,
    12,
  );
  floatingSlabMesh.name = 'ISLAND_18_ZENITH_FLOATING_SLAB_BATCH';
  floatingSlabMesh.visible = false;
  floatingSlabMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  zenithFx.add(floatingSlabMesh);
  const floatingSlabMatrix = new THREE.Matrix4();
  const floatingSlabQuaternion = new THREE.Quaternion();
  const floatingSlabEuler = new THREE.Euler();
  const floatingSlabPosition = new THREE.Vector3();
  const floatingSlabScale = new THREE.Vector3();
  for (let index = 0; index < 12; index += 1) {
    const angle = index / 12 * Math.PI * 2;
    const width = 0.55 + (index % 3) * 0.12;
    const rest = new THREE.Vector3(Math.cos(angle) * 1.78, 5.74 + (index % 3) * 0.22, Math.sin(angle) * 1.28 - 0.18);
    const orbit = new THREE.Vector3(Math.cos(angle) * 4.8, 1.1 + (index % 4) * 0.55, Math.sin(angle) * 4.2);
    floatingSlabQuaternion.setFromEuler(floatingSlabEuler.set(0, -angle, 0));
    floatingSlabMatrix.compose(rest, floatingSlabQuaternion, floatingSlabScale.set(width, 1, 1));
    floatingSlabMesh.setMatrixAt(index, floatingSlabMatrix);
    floatingSlabs.push({ rest, orbit, width });
  }
  floatingSlabMesh.instanceMatrix.needsUpdate = true;
  const beam = cylinder(0.56, 1.08, 19.5, materials.emerald, 'ISLAND_18_ZENITH_SKY_BEAM', 5, 12);
  beam.position.set(0, 17.45, -0.18);
  beam.visible = false;
  beam.material = new THREE.MeshBasicMaterial({
    color: 0x19dc6c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  beam.castShadow = false;
  zenithFx.add(beam);
  const skyHaloRings: THREE.Mesh[] = [];
  for (let index = 0; index < 3; index += 1) {
    const halo = torus(1.45 + index * 0.48, 0.082, materials.emerald, `ISLAND_18_ZENITH_SKY_HALO_${index + 1}`, 5, 7, 48);
    halo.material = new THREE.MeshBasicMaterial({
      color: index === 1 ? 0xc9ff72 : 0x48ff91,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.NormalBlending,
      toneMapped: false,
    });
    halo.rotation.x = Math.PI / 2;
    halo.rotation.z = index === 1 ? 0.2 : -0.16;
    halo.position.set(0, 10 + index * 2.55, -0.18);
    halo.visible = false;
    skyHaloRings.push(halo);
    zenithFx.add(halo);
  }
  const shockwave = torus(1, 0.07, materials.emerald, 'ISLAND_18_ZENITH_SHOCKWAVE', 5, 7, 48);
  shockwave.material = new THREE.MeshBasicMaterial({
    color: 0xbaff5c,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
  shockwave.rotation.x = Math.PI / 2;
  shockwave.position.set(0, 9.16, -0.18);
  shockwave.visible = false;
  zenithFx.add(shockwave);

  const zenithVineGeometries: THREE.BufferGeometry[] = [];
  for (let vineIndex = 0; vineIndex < 3; vineIndex += 1) {
    const points: THREE.Vector3[] = [];
    for (let pointIndex = 0; pointIndex <= 28; pointIndex += 1) {
      const t = pointIndex / 28;
      const angle = t * Math.PI * (5.2 + vineIndex * 0.55) + vineIndex * Math.PI * 2 / 3;
      const radius = 2.35 - t * 1.28 + Math.sin(t * Math.PI) * 0.28;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius,
        0.58 + t * 9.15,
        Math.sin(angle) * radius - 0.18,
      ));
    }
    zenithVineGeometries.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 84, 0.088, 6, false));
  }
  const zenithVineGeometry = mergeGeometries(zenithVineGeometries, false);
  zenithVineGeometries.forEach((geometry) => geometry.dispose());
  const zenithVineMaterial = new THREE.MeshBasicMaterial({
    color: 0x96ff55,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const zenithVineHelix = new THREE.Mesh(zenithVineGeometry!, zenithVineMaterial);
  zenithVineHelix.name = 'ISLAND_18_ZENITH_LIVING_VINE_HELIX';
  zenithVineHelix.visible = false;
  zenithFx.add(zenithVineHelix);

  const routeGlyphCount = 18;
  const routeGlyphMaterial = new THREE.MeshBasicMaterial({
    color: 0xd9ff74,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const routeGlyphs = new THREE.InstancedMesh(new THREE.OctahedronGeometry(0.13, 0), routeGlyphMaterial, routeGlyphCount);
  routeGlyphs.name = 'ISLAND_18_ZENITH_ROUTE_GLYPH_WAVE';
  routeGlyphs.visible = false;
  routeGlyphs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  zenithFx.add(routeGlyphs);
  const routeGlyphMatrix = new THREE.Matrix4();
  const routeGlyphQuaternion = new THREE.Quaternion();
  const routeGlyphScale = new THREE.Vector3();
  const routeGlyphPosition = new THREE.Vector3();

  const waterCrownMaterial = new THREE.MeshBasicMaterial({
    color: 0x65fff1,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
  });
  const waterCrown = new THREE.Mesh(new THREE.TorusGeometry(2.42, 0.17, 8, 64), waterCrownMaterial);
  waterCrown.name = 'ISLAND_18_ZENITH_SUSPENDED_WATER_CROWN';
  waterCrown.rotation.x = Math.PI / 2;
  waterCrown.position.set(0, 9.42, -0.18);
  waterCrown.visible = false;
  zenithFx.add(waterCrown);

  const wayfinderCrownGeometries: THREE.BufferGeometry[] = [];
  const normalizeWayfinderGeometry = (geometry: THREE.BufferGeometry) => {
    if (!geometry.index) return geometry;
    const normalized = geometry.toNonIndexed();
    geometry.dispose();
    return normalized;
  };
  const wayfinderOuterRing = normalizeWayfinderGeometry(new THREE.TorusGeometry(1.62, 0.075, 8, 64));
  wayfinderCrownGeometries.push(wayfinderOuterRing);
  const wayfinderCrossRing = normalizeWayfinderGeometry(new THREE.TorusGeometry(1.24, 0.045, 7, 56));
  wayfinderCrossRing.applyMatrix4(new THREE.Matrix4().makeRotationX(Math.PI / 2));
  wayfinderCrownGeometries.push(wayfinderCrossRing);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const fin = normalizeWayfinderGeometry(new THREE.OctahedronGeometry(index % 2 === 0 ? 0.24 : 0.14, 0));
    fin.scale(index % 2 === 0 ? 0.62 : 0.54, index % 2 === 0 ? 1.7 : 1.1, 0.42);
    fin.applyMatrix4(new THREE.Matrix4().makeRotationZ(-angle));
    fin.applyMatrix4(new THREE.Matrix4().makeTranslation(Math.cos(angle) * 1.92, Math.sin(angle) * 1.92, 0));
    wayfinderCrownGeometries.push(fin);
  }
  const wayfinderCrownGeometry = mergeGeometries(wayfinderCrownGeometries, false);
  wayfinderCrownGeometries.forEach((geometry) => geometry.dispose());
  const wayfinderCrownMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd85e,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.NormalBlending,
    toneMapped: false,
    side: THREE.DoubleSide,
  });
  const wayfinderCrown = new THREE.Mesh(wayfinderCrownGeometry!, wayfinderCrownMaterial);
  wayfinderCrown.name = 'ISLAND_18_ZENITH_WAYFINDER_CONSTELLATION';
  wayfinderCrown.position.set(0, 10.34, -0.18);
  wayfinderCrown.visible = false;
  zenithFx.add(wayfinderCrown);

  const junglePulseRingMaterial = new THREE.MeshBasicMaterial({
    color: 0x8dff6a,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const junglePulseRings = new THREE.InstancedMesh(
    new THREE.TorusGeometry(1, 0.022, 4, 36),
    junglePulseRingMaterial,
    3,
  );
  junglePulseRings.name = 'ISLAND_18_ZENITH_JUNGLE_PULSE_RING_BATCH';
  junglePulseRings.position.set(0, 0.94, -0.18);
  junglePulseRings.rotation.x = Math.PI / 2;
  junglePulseRings.visible = false;
  junglePulseRings.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  zenithFx.add(junglePulseRings);
  const junglePulseMatrix = new THREE.Matrix4();
  const junglePulseQuaternion = new THREE.Quaternion();
  const junglePulsePosition = new THREE.Vector3();
  const junglePulseScale = new THREE.Vector3();

  const moteCount = profile.id === 'high' ? 180 : profile.id === 'medium' ? 112 : 58;
  const motePositions = new Float32Array(moteCount * 3);
  for (let index = 0; index < moteCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.2 + (index % 19) * 0.24;
    motePositions[index * 3] = Math.cos(angle) * radius;
    motePositions[index * 3 + 1] = 0.6 + (index % 23) * 0.22;
    motePositions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const moteGeometry = new THREE.BufferGeometry();
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteBasePositions = new Float32Array(motePositions);
  const moteMaterial = new THREE.PointsMaterial({ color: 0xb6ff72, size: profile.id === 'low' ? 0.08 : 0.095, transparent: true, opacity: 0.74, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.name = 'ISLAND_18_LUMINOUS_JUNGLE_MOTES';
  motes.position.y = 0.2;
  root.add(motes);
  registerIsland18RuntimePart('living-ambience', motes, 'ambience');

  const zenithLight = new THREE.PointLight(0x52ff9a, 0, 18, 1.45);
  zenithLight.position.set(0, 8.4, -0.18);
  zenithLight.name = 'ISLAND_18_ZENITH_LIGHT';
  root.add(zenithLight);
  const templeLanternLight = new THREE.PointLight(0xff9f3f, 1.35, 8.5, 1.72);
  templeLanternLight.position.set(0, 3.15, 1.4);
  templeLanternLight.name = 'ISLAND_18_TEMPLE_LANTERN_BOUNCE';
  const waterfallBounceLight = new THREE.PointLight(0x45e9d2, 0.92, 11, 1.85);
  waterfallBounceLight.position.set(0, -0.3, 2.1);
  waterfallBounceLight.name = 'ISLAND_18_WATERFALL_BOUNCE';
  const guardianCrownLight = new THREE.PointLight(0x62ef89, 0.42, 6.5, 1.9);
  guardianCrownLight.position.set(0, 7.75, 0.45);
  guardianCrownLight.name = 'ISLAND_18_GUARDIAN_CROWN_GLOW';
  root.add(templeLanternLight, waterfallBounceLight, guardianCrownLight);

  let missionStage = 0;
  let missionSequence = 0;
  let previousSequence = 0;
  let replayStartedAt: number | null = null;
  let lastElapsed = 0;
  let hasAppliedMissionPresentation = false;
  let waterfallFlowDirection = -1;
  const compassGlyphMatrix = new THREE.Matrix4();
  const compassGlyphQuaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const compassGlyphScale = new THREE.Vector3();
  const faunaMatrix = new THREE.Matrix4();
  const faunaPosition = new THREE.Vector3();
  const faunaScale = new THREE.Vector3();
  const faunaQuaternion = new THREE.Quaternion();
  const faunaEuler = new THREE.Euler();
  const clearSkyMultiplier = new THREE.Color(0xf4ffff);
  const stormSkyMultiplier = new THREE.Color(0x43515d);
  const clearCloudColor = new THREE.Color(0xf7ffff);
  const stormCloudColor = new THREE.Color(0x425560);
  const clearFogColor = new THREE.Color(0x75c9c5);
  const stormFogColor = new THREE.Color(0x24393a);
  const sunbreakFogColor = new THREE.Color(0xb9dcbc);
  const weatherFogColor = new THREE.Color();
  const rainColor = new THREE.Color(0xa8e8ed);
  const lightningColor = new THREE.Color(0xf2fbff);
  const sunrayColor = new THREE.Color(0xffefaa);
  const weatherColor = new THREE.Color();

  const applyMissionState = (stage: number, progress: number, reducedMotion: boolean) => {
    const zenithReplayActive = stage >= 5 && !reducedMotion && progress < 1;
    const zenithAfterglowActive = stage >= 5 && !reducedMotion && progress >= 1;
    const zenithLivingState = zenithReplayActive || zenithAfterglowActive;
    innerRuins.visible = !zenithReplayActive;
    hangingVines.visible = !zenithReplayActive;
    ropeBridges.forEach((bridge) => {
      bridge.visible = !zenithReplayActive;
    });
    compass.glyphs.visible = stage > 0;
    for (let index = 0; index < 5; index += 1) {
      const glyphVisible = stage > index;
      compass.glyphMarkers[index].visible = glyphVisible;
      const isNewGlyph = index === stage - 1;
      const glyphReveal = reducedMotion || !isNewGlyph
        ? 1
        : 1 - Math.pow(1 - THREE.MathUtils.clamp(progress / 0.32, 0, 1), 3);
      const glyphPulse = reducedMotion ? 1 : 1 + Math.sin(lastElapsed * 2 + index) * 0.08;
      const angle = index / 5 * Math.PI * 2 - Math.PI / 2;
      compassGlyphScale.setScalar(glyphVisible ? Math.max(0.001, glyphReveal * glyphPulse) : 0.001);
      compassGlyphMatrix.compose(
        new THREE.Vector3(Math.cos(angle) * 0.64, Math.sin(angle) * 0.64, 0.08),
        compassGlyphQuaternion,
        compassGlyphScale,
      );
      compass.glyphs.setMatrixAt(index, compassGlyphMatrix);
    }
    compass.glyphs.instanceMatrix.needsUpdate = true;
    const vineOpen = stage >= 2
      ? (reducedMotion || stage > 2 ? 1 : THREE.MathUtils.smoothstep(progress, 0.12, 0.72))
      : 0;
    vineGates.forEach((gate, index) => {
      gate.position.y = Number(gate.userData.closedY ?? 0.35) + vineOpen * (1.18 + index * 0.12);
      gate.rotation.z = (index === 0 ? -1 : 1) * vineOpen * 0.42;
      gate.scale.y = 1 - vineOpen * 0.34;
    });
    const bridgeTension = stage >= 3
      ? (reducedMotion || stage > 3 ? 1 : THREE.MathUtils.smoothstep(progress, 0.08, 0.7))
      : 0;
    ropeBridges.forEach((bridge, index) => {
      bridge.position.y = Number(bridge.userData.restY ?? 0.42) + bridgeTension * (0.1 + index * 0.012);
      bridge.scale.y = 0.82 + bridgeTension * 0.18;
      bridge.rotation.z = reducedMotion ? 0 : Math.sin(lastElapsed * 1.6 + index) * 0.006 * bridgeTension;
    });
    compass.rings.forEach((ring, index) => {
      ring.visible = stage >= 4 && (stage < 5 || progress < 1);
      const reveal = stage > 4 || reducedMotion
        ? (stage >= 4 ? 1 : 0)
        : THREE.MathUtils.smoothstep(progress, 0.12 + index * 0.06, 0.48 + index * 0.08);
      ring.scale.setScalar(Math.max(0.001, reveal));
      const direction = index % 2 === 0 ? 1 : -1;
      ring.rotation.z = index * 0.36 + (reducedMotion ? 0 : lastElapsed * 0.26 * direction);
      ring.rotation.y = (index === 2 ? Math.PI / 2 : index * 0.45) + (reducedMotion ? 0 : lastElapsed * 0.17 * -direction);
    });
    compass.core.visible = stage >= 4;
    const coreScale = stage > 4 || reducedMotion ? (stage >= 4 ? 1 : 0.001) : THREE.MathUtils.smoothstep(progress, 0.28, 0.62);
    compass.core.scale.setScalar(Math.max(0.001, coreScale) * (1 + Math.sin(lastElapsed * 3.2) * 0.08));
    floatingSlabMesh.visible = zenithReplayActive;
    floatingSlabs.forEach(({ rest, orbit, width }, index) => {
      const assemble = reducedMotion
        ? (stage >= 5 ? 1 : 0)
        : THREE.MathUtils.smoothstep(progress, 0.08 + (index % 4) * 0.025, 0.56 + (index % 4) * 0.035);
      floatingSlabPosition.copy(orbit).lerp(rest, assemble);
      floatingSlabQuaternion.setFromEuler(floatingSlabEuler.set(
        0,
        index / 12 * Math.PI * 2 + (1 - assemble) * Math.PI * 1.8,
        (1 - assemble) * 0.7 * Math.sin(index * 1.7),
      ));
      floatingSlabMatrix.compose(
        floatingSlabPosition,
        floatingSlabQuaternion,
        floatingSlabScale.set(width, 1, 1),
      );
      floatingSlabMesh.setMatrixAt(index, floatingSlabMatrix);
    });
    floatingSlabMesh.instanceMatrix.needsUpdate = true;
    const beamReveal = reducedMotion ? (stage >= 5 ? 0.56 : 0) : stage >= 5 ? Math.sin(Math.PI * THREE.MathUtils.smoothstep(progress, 0.58, 0.94)) : 0;
    beam.visible = stage >= 5;
    (beam.material as THREE.MeshBasicMaterial).opacity = stage >= 5 && progress >= 1 ? 0.34 : beamReveal * 0.78;
    skyHaloRings.forEach((halo, index) => {
      const haloProgress = reducedMotion
        ? (stage >= 5 ? 1 : 0)
        : THREE.MathUtils.smoothstep(progress, 0.48 + index * 0.08, 0.76 + index * 0.07);
      halo.visible = zenithLivingState && haloProgress > 0 && (index < 2 || zenithAfterglowActive);
      halo.scale.setScalar(0.34 + haloProgress * (1.78 + index * 0.4));
      halo.rotation.z = reducedMotion ? index * 0.22 : lastElapsed * (0.12 + index * 0.045) * (index % 2 === 0 ? 1 : -1);
      (halo.material as THREE.MeshBasicMaterial).opacity = stage >= 5 && progress >= 1
        ? 0.2 - index * 0.025
        : Math.sin(haloProgress * Math.PI) * (0.66 - index * 0.08);
    });
    const waveProgress = reducedMotion ? 1 : THREE.MathUtils.smoothstep(progress, 0.52, 0.88);
    shockwave.visible = stage >= 5 && !reducedMotion && progress > 0.5 && progress < 0.92;
    shockwave.scale.setScalar(0.5 + waveProgress * 5.2);
    (shockwave.material as THREE.MeshBasicMaterial).opacity = (1 - waveProgress) * 0.72;
    const vineReveal = reducedMotion
      ? (stage >= 5 ? 1 : 0)
      : THREE.MathUtils.smoothstep(progress, 0.12, 0.58);
    zenithVineHelix.visible = zenithLivingState && vineReveal > 0;
    zenithVineHelix.scale.set(1, Math.max(0.001, vineReveal), 1);
    zenithVineHelix.rotation.y = reducedMotion ? 0 : lastElapsed * 0.18;
    zenithVineMaterial.opacity = stage >= 5 && progress >= 1
      ? 0.3
      : 0.38 + vineReveal * 0.44;
    const routeWave = reducedMotion
      ? (stage >= 5 ? 1 : 0)
      : THREE.MathUtils.smoothstep(progress, 0.02, 0.48);
    routeGlyphs.visible = zenithLivingState && routeWave > 0;
    for (let index = 0; index < routeGlyphCount; index += 1) {
      const angle = index / routeGlyphCount * Math.PI * 2 - Math.PI / 2;
      const localWave = reducedMotion
        ? routeWave
        : THREE.MathUtils.smoothstep(routeWave, index / routeGlyphCount * 0.62, index / routeGlyphCount * 0.62 + 0.2);
      const pulse = localWave > 0 && localWave < 1
        ? 1 + Math.sin(localWave * Math.PI) * 1.25
        : 1;
      routeGlyphPosition.set(Math.cos(angle) * 4.0, 0.72 + localWave * 0.22, Math.sin(angle) * 4.0);
      routeGlyphQuaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 4, Math.PI / 4));
      routeGlyphScale.setScalar(Math.max(0.001, localWave * pulse));
      routeGlyphMatrix.compose(routeGlyphPosition, routeGlyphQuaternion, routeGlyphScale);
      routeGlyphs.setMatrixAt(index, routeGlyphMatrix);
    }
    routeGlyphs.instanceMatrix.needsUpdate = true;
    routeGlyphMaterial.opacity = stage >= 5 && progress >= 1 ? 0.38 : Math.min(1, routeWave);
    const waterCrownReveal = reducedMotion
      ? (stage >= 5 ? 1 : 0)
      : THREE.MathUtils.smoothstep(progress, 0.38, 0.73);
    waterCrown.visible = zenithLivingState && waterCrownReveal > 0;
    waterCrown.scale.setScalar(0.3 + waterCrownReveal);
    waterCrown.position.y = 8.28 + waterCrownReveal * 1.32;
    waterCrown.rotation.z = reducedMotion ? 0 : lastElapsed * -0.42;
    waterCrownMaterial.opacity = stage >= 5 && progress >= 1
      ? 0.34
      : 0.34 + waterCrownReveal * 0.5;
    const wayfinderReveal = reducedMotion
      ? (stage >= 5 ? 1 : 0)
      : THREE.MathUtils.smoothstep(progress, 0.5, 0.84);
    wayfinderCrown.visible = zenithLivingState && wayfinderReveal > 0;
    wayfinderCrown.scale.setScalar(0.2 + wayfinderReveal * 1.08);
    wayfinderCrown.rotation.y = reducedMotion ? 0.18 : Math.sin(lastElapsed * 0.36) * 0.24;
    wayfinderCrown.rotation.z = reducedMotion ? 0 : lastElapsed * 0.12;
    wayfinderCrownMaterial.opacity = stage >= 5 && progress >= 1
      ? 0.48
      : 0.3 + wayfinderReveal * 0.68;
    junglePulseRings.visible = zenithLivingState;
    let strongestJunglePulse = 0;
    for (let index = 0; index < junglePulseRings.count; index += 1) {
      const pulseProgress = zenithAfterglowActive
        ? 1
        : THREE.MathUtils.smoothstep(progress, 0.16 + index * 0.1, 0.58 + index * 0.1);
      const pulseStrength = zenithAfterglowActive ? 0.24 : Math.sin(pulseProgress * Math.PI);
      strongestJunglePulse = Math.max(strongestJunglePulse, pulseStrength);
      const radius = 2.2 + pulseProgress * (3.4 + index * 2.55);
      junglePulseMatrix.compose(
        junglePulsePosition,
        junglePulseQuaternion,
        junglePulseScale.setScalar(Math.max(0.001, radius)),
      );
      junglePulseRings.setMatrixAt(index, junglePulseMatrix);
    }
    junglePulseRings.instanceMatrix.needsUpdate = true;
    junglePulseRingMaterial.opacity = zenithAfterglowActive
      ? 0.14 + Math.sin(lastElapsed * 1.25) * 0.025
      : strongestJunglePulse * 0.58;
    const moteConvergence = reducedMotion || stage < 5
      ? 0
      : Math.sin(Math.PI * THREE.MathUtils.smoothstep(progress, 0.06, 0.68));
    const moteAttribute = moteGeometry.getAttribute('position') as THREE.BufferAttribute;
    for (let index = 0; index < moteCount; index += 1) {
      const baseOffset = index * 3;
      const targetAngle = index * 2.399963 + lastElapsed * 0.7;
      const targetRadius = 0.22 + (index % 13) * 0.045;
      const drift = reducedMotion ? 0 : 1 - moteConvergence;
      const driftX = Math.sin(lastElapsed * (0.34 + index % 5 * 0.04) + index * 1.73) * 0.07 * drift;
      const driftY = Math.sin(lastElapsed * (0.52 + index % 7 * 0.025) + index * 0.81) * 0.11 * drift;
      const driftZ = Math.cos(lastElapsed * (0.3 + index % 3 * 0.055) + index * 1.27) * 0.065 * drift;
      moteAttribute.setXYZ(
        index,
        THREE.MathUtils.lerp(moteBasePositions[baseOffset] + driftX, Math.cos(targetAngle) * targetRadius, moteConvergence),
        THREE.MathUtils.lerp(moteBasePositions[baseOffset + 1] + driftY, 5.35 + (index % 26) * 0.082, moteConvergence),
        THREE.MathUtils.lerp(moteBasePositions[baseOffset + 2] + driftZ, Math.sin(targetAngle) * targetRadius - 0.18, moteConvergence),
      );
    }
    moteAttribute.needsUpdate = true;
    materials.emerald.emissiveIntensity = stage >= 5
      ? 0.72 + Math.sin(lastElapsed * 5.4) * (progress < 1 ? 0.34 : 0.12)
      : stage >= 4
        ? 0.58 + Math.sin(lastElapsed * 2.6) * 0.12
        : 0.46;
    materials.amber.emissiveIntensity = stage >= 5
      ? 0.56 + Math.sin(lastElapsed * 4.1 + 0.8) * 0.2
      : 0.44;
    materials.water.emissiveIntensity = stage >= 5
      ? 0.28 + Math.sin(lastElapsed * 2.8) * (progress < 1 ? 0.12 : 0.045)
      : 0.16;
    materials.waterfall.emissiveIntensity = stage >= 5
      ? 0.36 + Math.sin(lastElapsed * 3.3 + 0.6) * (progress < 1 ? 0.16 : 0.055)
      : 0.2;
    zenithLight.intensity = stage >= 5 ? (progress >= 1 ? 2.1 + Math.sin(lastElapsed * 2.4) * 0.28 : progress * 4.2) : stage >= 4 ? 0.42 : 0;
    waterfallInstances.forEach((fall, index) => {
      const reversal = reducedMotion || stage < 5 ? 0 : Math.sin(Math.PI * THREE.MathUtils.smoothstep(progress, 0.34, 0.7));
      waterfallSheetPosition.copy(fall.position);
      waterfallSheetPosition.y += reversal * (0.72 + (index % 3) * 0.15);
      waterfallSheetMatrix.compose(
        waterfallSheetPosition,
        fall.quaternion,
        waterfallSheetScale.set(fall.width, fall.height * (1 - reversal * 0.24), 1),
      );
      waterfallSheets.setMatrixAt(index, waterfallSheetMatrix);
    });
    waterfallSheets.instanceMatrix.needsUpdate = true;
    waterfallFlowDirection = stage >= 5 && !reducedMotion && progress >= 0.32 && progress <= 0.72 ? 1 : -1;
  };

  const setLivingCompassStage = (presentation: Island18LivingCompassPresentation, replay = false) => {
    const nextStage = THREE.MathUtils.clamp(Math.floor(presentation.activatedStages), 0, ISLAND_18_LIVING_COMPASS_MAX_STAGE);
    const nextSequence = Math.max(0, Math.floor(presentation.constructionSequence ?? 0));
    const sequenceAdvanced = hasAppliedMissionPresentation && nextSequence > previousSequence;
    previousSequence = Math.max(previousSequence, nextSequence);
    missionStage = nextStage;
    missionSequence = nextSequence;
    if (replay || sequenceAdvanced) replayStartedAt = lastElapsed;
    if (replayStartedAt === null) applyMissionState(missionStage, 1, true);
    hasAppliedMissionPresentation = true;
    root.userData.livingCompassPresentation = { stage: missionStage, sequence: missionSequence };
  };

  const pulseAt = (value: number, center: number, width: number) => {
    const distance = Math.abs(value - center);
    if (distance >= width) return 0;
    return Math.pow(1 - distance / width, 3);
  };

  const updateAerialFauna = (elapsed: number, reducedMotion: boolean, stormDarkness: number) => {
    aerialFauna.specs.forEach((fauna, index) => {
      const angle = fauna.phase + (reducedMotion ? 0 : elapsed * fauna.speed);
      const radius = fauna.radius + (reducedMotion ? 0 : Math.sin(elapsed * 0.21 + fauna.phase) * 0.42);
      const groundY = fauna.streamSkimmer
        ? sampleJungleBasinHeight(radius, angle) + fauna.altitude
        : fauna.altitude;
      const shelterDrop = stormDarkness * (fauna.streamSkimmer ? 0.28 : 1.65);
      const flutter = reducedMotion ? 0 : Math.sin(elapsed * (4.6 + index % 4 * 0.72) + fauna.phase);
      faunaPosition.set(
        Math.cos(angle) * radius,
        groundY - shelterDrop + flutter * (fauna.streamSkimmer ? 0.12 : 0.24),
        Math.sin(angle) * radius,
      );
      faunaQuaternion.setFromEuler(faunaEuler.set(
        flutter * 0.08,
        -angle + Math.PI / 2,
        flutter * (fauna.streamSkimmer ? 0.2 : 0.13),
      ));
      const wingBeat = reducedMotion ? 0.86 : 0.68 + Math.abs(flutter) * 0.46;
      const visibleScale = fauna.scale * (1 - stormDarkness * 0.12);
      faunaScale.set(visibleScale, visibleScale * wingBeat, visibleScale);
      faunaMatrix.compose(faunaPosition, faunaQuaternion, faunaScale);
      aerialFauna.mesh.setMatrixAt(index, faunaMatrix);
    });
    aerialFauna.mesh.instanceMatrix.needsUpdate = true;
  };

  const updateWeather = (elapsed: number, reducedMotion: boolean) => {
    const stormCycleIndex = reducedMotion
      ? 0
      : Math.max(0, Math.floor(elapsed / ISLAND_18_WEATHER_CYCLE_SECONDS));
    const cycleTime = reducedMotion
      ? 0
      : ((elapsed % ISLAND_18_WEATHER_CYCLE_SECONDS) + ISLAND_18_WEATHER_CYCLE_SECONDS) % ISLAND_18_WEATHER_CYCLE_SECONDS;
    const gathering = reducedMotion ? 0 : THREE.MathUtils.smoothstep(cycleTime, 58, 88);
    const clearing = reducedMotion ? 1 : THREE.MathUtils.smoothstep(cycleTime, 126, 151);
    const cloudCover = gathering * (1 - clearing);
    const stormDarkness = cloudCover * (0.28 + THREE.MathUtils.smoothstep(cycleTime, 82, 106) * 0.72);
    const rainAmount = reducedMotion
      ? 0
      : THREE.MathUtils.smoothstep(cycleTime, 102, 109) * (1 - THREE.MathUtils.smoothstep(cycleTime, 122, 130));
    const sunBreak = reducedMotion
      ? 0
      : THREE.MathUtils.smoothstep(cycleTime, 123, 132) * (1 - THREE.MathUtils.smoothstep(cycleTime, 150, 160));
    const flashPlan = getIsland18StormFlashPlan(stormCycleIndex);
    let lightningFlash = 0;
    let activeFlashIndex = 0;
    flashPlan.centers.forEach((center, index) => {
      const mainPulse = pulseAt(cycleTime, center, 0.68 - Math.min(index, 3) * 0.045);
      const naturalRebound = pulseAt(cycleTime, center + 0.19, 0.24) * 0.36;
      const eventStrength = Math.max(mainPulse, naturalRebound);
      if (eventStrength > lightningFlash) {
        lightningFlash = eventStrength;
        activeFlashIndex = index;
      }
    });
    lightningFlash *= rainAmount;
    const daylightBlue = THREE.MathUtils.clamp(1 - stormDarkness * 1.04 + sunBreak * 0.12, 0, 1);
    const practicalLightExposure = THREE.MathUtils.clamp(
      THREE.MathUtils.smoothstep(stormDarkness, 0.12, 0.9) + cloudCover * 0.11,
      0,
      1,
    );
    const lightningBoltX = -7.2 + fractionalPart(stormCycleIndex * 0.732 + activeFlashIndex * 0.417 + 0.23) * 14.4;
    const lightningBoltZ = -6 + fractionalPart(stormCycleIndex * 0.391 + activeFlashIndex * 0.618 + 0.42) * 9;
    const phase = cycleTime < 58
      ? 'clear-rest'
      : cycleTime < 88
        ? 'cloud-gathering'
        : cycleTime < 102
          ? 'storm-darkening'
          : cycleTime < 126
            ? 'rain-and-lightning'
            : cycleTime < 155
              ? 'sunbreak'
              : 'clear-recovery';

    root.userData.weatherPhase = phase;
    root.userData.weatherMix = {
      cloudCover,
      stormDarkness,
      rainAmount,
      lightningFlash,
      sunBreak,
      daylightBlue,
      practicalLightExposure,
      stormCycleIndex,
      flashCount: flashPlan.flashCount,
      flashEventCenters: flashPlan.centers,
      activeFlashIndex,
    };
    skyDomeMaterial.color
      .copy(stormSkyMultiplier)
      .lerp(clearSkyMultiplier, daylightBlue)
      .lerp(lightningColor, lightningFlash * 0.42);
    materials.cloud.color
      .copy(clearCloudColor)
      .lerp(stormCloudColor, stormDarkness * 0.92)
      .lerp(lightningColor, lightningFlash * 0.34);
    materials.cloud.opacity = THREE.MathUtils.clamp(0.2 + cloudCover * 0.48 - sunBreak * 0.06, 0.16, 0.68);
    if (scene.fog instanceof THREE.FogExp2) {
      weatherFogColor
        .copy(clearFogColor)
        .lerp(stormFogColor, stormDarkness * 0.94)
        .lerp(sunbreakFogColor, sunBreak * 0.42);
      scene.fog.color.copy(weatherFogColor);
      scene.fog.density = THREE.MathUtils.clamp(
        THREE.MathUtils.lerp(0.003, 0.0085, stormDarkness) + rainAmount * 0.0008 - sunBreak * 0.001,
        0.0028,
        0.0093,
      );
    }
    materials.canopyVolume.uniforms.uWeatherDarkness.value = stormDarkness * 0.8;
    sunCoreMaterial.opacity = THREE.MathUtils.clamp(1 - cloudCover * 0.9 + sunBreak * 0.42, 0.08, 1);
    sunCore.scale.setScalar(1 + sunBreak * 0.24);
    weatherSkyLight.intensity = 0.42 - stormDarkness * 0.22 + sunBreak * 0.2 + lightningFlash * 1.1;
    weatherSunLight.intensity = 0.54 - stormDarkness * 0.48 + sunBreak * 0.92 + lightningFlash * 0.85;
    lightningLight.intensity = lightningFlash * 8.5;
    lightningLight.position.set(lightningBoltX, 14.5 + activeFlashIndex * 0.54, lightningBoltZ);
    materials.mist.opacity = 0.1 + rainAmount * 0.14 + sunBreak * 0.05;
    materials.foam.emissiveIntensity = 0.12 + rainAmount * 0.1 + sunBreak * 0.16;
    materials.water.roughness = 0.1 + rainAmount * 0.19;
    materials.water.clearcoatRoughness = 0.035 + rainAmount * 0.12;
    if (primarySkyLight) {
      primarySkyLight.intensity = primarySkyBaseIntensity
        * (1 - stormDarkness * 0.62 + sunBreak * 0.18)
        + lightningFlash * 1.15;
      primarySkyLight.color.copy(primarySkyBaseColor).lerp(stormSkyLightColor, stormDarkness * 0.88);
      primarySkyLight.groundColor.copy(primarySkyBaseGroundColor).lerp(stormGroundLightColor, stormDarkness * 0.92);
    }
    if (primarySunLight) {
      primarySunLight.intensity = primarySunBaseIntensity
        * (1 - stormDarkness * 0.74 + sunBreak * 0.26)
        + lightningFlash * 1.55;
      primarySunLight.color.copy(primarySunBaseColor).lerp(stormSunLightColor, stormDarkness * 0.82);
    }
    if (turquoiseBounceLight) {
      turquoiseBounceLight.intensity = turquoiseBounceBaseIntensity
        * (1 - stormDarkness * 0.68 + sunBreak * 0.24)
        + lightningFlash * 0.32;
    }
    root.userData.weatherLighting = {
      sky: primarySkyLight?.intensity ?? primarySkyBaseIntensity,
      sun: primarySunLight?.intensity ?? primarySunBaseIntensity,
      bounce: turquoiseBounceLight?.intensity ?? turquoiseBounceBaseIntensity,
    };

    cloudLayers.forEach((layer, index) => {
      const baseRotationY = Number(layer.userData.baseRotationY ?? 0);
      layer.rotation.y = baseRotationY + (reducedMotion ? 0 : elapsed * 0.0028 * (index % 2 === 0 ? 1 : -1));
      const gatherDirection = index % 2 === 0 ? -1 : 1;
      layer.position.x = (reducedMotion ? 0 : Math.sin(elapsed * 0.035 + index) * 0.48) + gatherDirection * cloudCover * 0.82;
      layer.position.y = Number(layer.userData.baseY ?? 0)
        + (reducedMotion ? 0 : Math.sin(elapsed * 0.052 + index * 0.7) * 0.16)
        - cloudCover * (0.45 + index * 0.08);
      layer.scale.set(1 + cloudCover * 0.13, 1 + cloudCover * 0.2, 1 + cloudCover * 0.16);
    });

    const showWeatherLines = rainAmount > 0.01 || sunBreak > 0.01 || lightningFlash > 0.01;
    weatherField.lines.visible = showWeatherLines;
    weatherField.material.opacity = THREE.MathUtils.clamp(Math.max(rainAmount * 0.7, sunBreak * 0.32, lightningFlash), 0, 0.86);
    if (showWeatherLines) {
      for (let index = 0; index < weatherField.segmentCount; index += 1) {
        const offset = index * 6;
        if (rainAmount > sunBreak) {
          const seedX = Math.sin(index * 17.31 + 4.7) * 0.5 + 0.5;
          const seedZ = Math.sin(index * 9.73 + 18.2) * 0.5 + 0.5;
          const fall = ((elapsed * (8.4 + index % 5 * 0.32) + index * 1.81) % 19 + 19) % 19;
          const x = (seedX - 0.5) * 35;
          const z = (seedZ - 0.5) * 30;
          const topY = 13.5 - fall;
          weatherField.positions.set([x, topY, z, x + 0.22, topY - (0.72 + rainAmount * 0.72), z + 0.08], offset);
          const isBolt = lightningFlash > 0.04 && index < 7;
          if (isBolt) {
            const boltY = 16 - index * 2.25;
            const boltX = lightningBoltX + Math.sin(index * 2.4 + activeFlashIndex) * 0.72;
            weatherField.positions.set([
              boltX, boltY, lightningBoltZ,
              boltX + Math.sin(index * 4.1) * 0.82, boltY - 2.35, lightningBoltZ + 0.2,
            ], offset);
          }
          weatherColor.copy(isBolt ? lightningColor : rainColor).multiplyScalar(0.72 + (index % 5) * 0.055);
        } else {
          if (index < 12) {
            const lane = index / 11 - 0.5;
            const startX = 5.2 + lane * 17;
            const startY = 14.2 - Math.abs(lane) * 2.2 + Math.sin(index * 1.7) * 0.32;
            const endX = startX - 6.8 + Math.sin(index * 2.3) * 0.62;
            const endZ = 3 + lane * 8.5;
            weatherField.positions.set([startX, startY, -24 + Math.abs(lane) * 2.4, endX, -3.2 + index % 3 * 0.38, endZ], offset);
            weatherColor.copy(sunrayColor).multiplyScalar(0.72 + (index % 4) * 0.08);
          } else {
            weatherField.positions.set([0, -20, 0, 0, -20, 0], offset);
            weatherColor.setRGB(0, 0, 0);
          }
        }
        weatherField.colors.set([
          weatherColor.r, weatherColor.g, weatherColor.b,
          weatherColor.r, weatherColor.g, weatherColor.b,
        ], offset);
      }
      (weatherField.lines.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
      (weatherField.lines.geometry.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
    }
    updateAerialFauna(elapsed, reducedMotion, stormDarkness);
    return { stormDarkness, practicalLightExposure, lightningFlash, daylightBlue };
  };

  const animate = (elapsed: number, reducedMotion = false) => {
    lastElapsed = elapsed;
    materials.canopyVolume.uniforms.uTime.value = reducedMotion ? 0 : elapsed;
    const residentWorkTime = materials.basinGround.userData.residentWorkTime as { value: number } | undefined;
    const residentWorkMotion = materials.basinGround.userData.residentWorkMotion as { value: number } | undefined;
    const faunaMotionTime = materials.basinGround.userData.faunaMotionTime as { value: number } | undefined;
    const faunaMotionAmount = materials.basinGround.userData.faunaMotionAmount as { value: number } | undefined;
    if (residentWorkTime) residentWorkTime.value = reducedMotion ? 0 : elapsed;
    if (residentWorkMotion) residentWorkMotion.value = reducedMotion ? 0 : 1;
    if (faunaMotionTime) faunaMotionTime.value = reducedMotion ? 0 : elapsed;
    if (faunaMotionAmount) faunaMotionAmount.value = reducedMotion ? 0 : 1;
    const weather = updateWeather(elapsed, reducedMotion);
    guardianCrownLight.intensity = missionStage >= 4
      ? 0.62 + (reducedMotion ? 0 : Math.sin(elapsed * 2.7) * 0.14)
      : 0.42 + (reducedMotion ? 0 : Math.sin(elapsed * 1.4) * 0.06);
    if (!reducedMotion) {
      depthIslands.position.y = Math.sin(elapsed * 0.12) * 0.1;
      depthIslands.rotation.y = Math.sin(elapsed * 0.075) * 0.004;
      animatedLeaves.forEach((cluster, index) => {
        const phase = Number(cluster.userData.windPhase ?? index * 0.37);
        cluster.rotation.z = Math.sin(elapsed * 0.52 + phase) * 0.035;
        cluster.rotation.x = Math.cos(elapsed * 0.41 + phase) * 0.018;
      });
      motes.rotation.y = elapsed * 0.085;
      motes.position.y = 0.2 + Math.sin(elapsed * 0.44) * 0.12;
      if (materials.waterfall.map) materials.waterfall.map.offset.y = waterfallFlowDirection * elapsed * 0.13;
      if (materials.water.map) {
        materials.water.map.offset.x = Math.sin(elapsed * 0.15) * 0.08;
        materials.water.map.offset.y = -elapsed * 0.072;
      }
    } else {
      depthIslands.position.y = 0;
      depthIslands.rotation.y = 0;
    }
    const replayProgress = replayStartedAt === null
      ? 1
      : THREE.MathUtils.clamp((elapsed - replayStartedAt) / (reducedMotion ? 0.45 : missionStage >= 5 ? 8.8 : 3.4), 0, 1);
    applyMissionState(missionStage, replayProgress, reducedMotion);
    const practicalFlicker = reducedMotion
      ? 0
      : Math.sin(elapsed * 3.17) * 0.54
        + Math.sin(elapsed * 7.73 + 0.8) * 0.29
        + Math.sin(elapsed * 13.1 + 1.7) * 0.17;
    materials.amber.emissiveIntensity += weather.practicalLightExposure * (1.08 + practicalFlicker * 0.09);
    practicalHaloMaterial.opacity = THREE.MathUtils.clamp(
      0.025
      + weather.practicalLightExposure * (0.19 + practicalFlicker * 0.024)
      + weather.lightningFlash * 0.018,
      0.02,
      0.28,
    );
    templeLanternLight.intensity = 0.74
      + weather.practicalLightExposure * 1.62
      + practicalFlicker * (0.045 + weather.practicalLightExposure * 0.14);
    waterfallBounceLight.intensity = 0.72
      + (1 - weather.daylightBlue) * 0.38
      + (reducedMotion ? 0 : Math.sin(elapsed * 0.74) * 0.08);
    practicalPoolLights.forEach((light, index) => {
      const localFlicker = reducedMotion ? 0 : Math.sin(elapsed * (2.78 + index * 0.29) + index * 1.47) * 0.09;
      light.intensity = 0.065
        + weather.practicalLightExposure * (0.94 + index * 0.075 + practicalFlicker * 0.1 + localFlicker);
    });
    root.userData.practicalLighting = {
      exposure: weather.practicalLightExposure,
      haloOpacity: practicalHaloMaterial.opacity,
      amberEmissiveIntensity: materials.amber.emissiveIntensity,
      templePoolIntensity: templeLanternLight.intensity,
      satellitePoolIntensities: practicalPoolLights.map((light) => light.intensity),
    };
    if (replayStartedAt !== null && replayProgress >= 1) replayStartedAt = null;
  };

  const updateView = (cameraPosition: THREE.Vector3, cameraTarget = new THREE.Vector3()) => {
    const viewX = cameraPosition.x - cameraTarget.x;
    const viewZ = cameraPosition.z - cameraTarget.z;
    const xDominant = Math.abs(viewX) > Math.abs(viewZ);
    const activeSector = xDominant
      ? viewX >= 0 ? 'east' : 'west'
      : viewZ < 0 ? 'rear' : 'front';
    frontDepthSector.visible = activeSector === 'front';
    rearDepthSector.visible = activeSector === 'rear';
    eastDepthSector.visible = activeSector === 'east';
    westDepthSector.visible = activeSector === 'west';
    cloudDepthField.visible = activeSector === 'front';
    rearCloudDepthField.visible = activeSector === 'rear';
    eastCloudDepthField.visible = activeSector === 'east';
    westCloudDepthField.visible = activeSector === 'west';
  };

  root.userData.sculptRuntime = {
    parts: collectIsland18RuntimePartManifest([root]).parts,
    sockets: {
      boardOrigin: [0, 0, 0],
      templeRoot: [0, 0, 0],
      zenithCore: [0, 9.18, -0.18],
      waterfallLips: waterfallInstances.map((fall) => fall.position.toArray()),
    },
    colliders: [
      { id: 'island-018-board-route', type: 'compound-ring', isTrigger: true },
      { id: 'island-018-temple', type: 'compound', isTrigger: true },
    ],
    destructionGroups: [
      { id: 'emerald-zenith-slabs', members: ['ISLAND_18_ZENITH_FLOATING_SLAB_BATCH'], presentationOnly: true },
    ],
  };
  scene.add(root);
  return { root, animate, setLivingCompassStage, updateView };
}
