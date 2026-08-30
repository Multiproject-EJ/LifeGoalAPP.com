import * as THREE from 'three';
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
import {
  createIsland22WaterDragonMission,
  ISLAND_22_DRAGON_TRIGGER_KG,
  type Island22WaterDragonCameraPose,
  type Island22WaterDragonPhase,
  type Island22WaterDragonPresentation,
} from './Island22WaterDragonMission';
import { createIsland22PremiumFishingActors } from './Island22PremiumFishingActors';
import { ISLAND_22_PREMIUM_LANDMARK_FACTORIES } from './Island22PremiumLandmarkFamilies';

export const ISLAND_22_FISHERMANS_VILLAGE_WORLD_NAME = "Fisherman's Village";
type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_22_FISHERMANS_VILLAGE_LANDMARK_LABELS = {
  boss: 'Fisherfolk Guild Hall',
  hatchery: 'Net House Hatchery',
  habit: 'Boatwright Habit Yard',
  wisdom: 'Lantern Lighthouse Library',
  event: 'Round Lantern Tavern',
} as const;

// The pond surface sits at y=0.66. The shared board centres default to y=0.34,
// which submerged the real Spark36 blocks beneath the pond/terrace and made
// Fisherman's Village appear to have no playable board. Keep one authored
// presentation offset so tiles, rewards and the token rise together without
// changing any canonical x/z anchor or gameplay index.
export const ISLAND_22_BOARD_PRESENTATION_Y_OFFSET = 0.44;

export const ISLAND_22_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS
  - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.28;
export const ISLAND_22_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS
  + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.28;

export function isIsland22RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_22_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_22_ROUTE_CLEARANCE_OUTER_RADIUS;
}

export interface Island22FishermansVillageMaterials {
  cliff: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  cobble: THREE.MeshStandardMaterial;
  terrace: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  timber: THREE.MeshStandardMaterial;
  timberDark: THREE.MeshStandardMaterial;
  roof: THREE.MeshStandardMaterial;
  roofWarm: THREE.MeshStandardMaterial;
  brass: THREE.MeshStandardMaterial;
  window: THREE.MeshStandardMaterial;
  pond: THREE.MeshPhysicalMaterial;
  ocean: THREE.MeshPhysicalMaterial;
  rope: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  grassBlade: THREE.MeshStandardMaterial;
  foam: THREE.MeshBasicMaterial;
}

export interface Island22FishermansVillageRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
  updateWaterDragonMission: (presentation: Island22WaterDragonPresentation) => void;
  updateFishingInteraction: (presentation: Island22FishingInteractionPresentation) => void;
  getFishingInteractionCameraPose: () => Island22WaterDragonCameraPose;
  getWaterDragonMissionCameraPose: () => Island22WaterDragonCameraPose;
  getWaterDragonMissionPhase: () => Island22WaterDragonPhase;
}

export type Island22HarborWeatherPhase = 'calm' | 'building' | 'windy' | 'easing';

export interface Island22HarborWeatherState {
  phase: Island22HarborWeatherPhase;
  cycleProgress: number;
  intensity: number;
  wind: number;
  waveStrength: number;
  gust: number;
}

export const ISLAND_22_HARBOR_WEATHER_CYCLE_SECONDS = 96;

function smoothWeatherStep(value: number) {
  const clamped = THREE.MathUtils.clamp(value, 0, 1);
  return clamped * clamped * (3 - 2 * clamped);
}

export function resolveIsland22HarborWeatherState(elapsedSeconds: number): Island22HarborWeatherState {
  const elapsed = Number.isFinite(elapsedSeconds) ? Math.max(0, elapsedSeconds) : 0;
  const cycleProgress = (elapsed % ISLAND_22_HARBOR_WEATHER_CYCLE_SECONDS)
    / ISLAND_22_HARBOR_WEATHER_CYCLE_SECONDS;
  const gust = 0.5 + Math.sin(elapsed * 0.43 + Math.sin(elapsed * 0.11) * 1.2) * 0.5;
  let phase: Island22HarborWeatherPhase = 'calm';
  let envelope = 0.07;
  if (cycleProgress >= 0.18 && cycleProgress < 0.46) {
    phase = 'building';
    envelope = THREE.MathUtils.lerp(
      0.07,
      0.94,
      smoothWeatherStep((cycleProgress - 0.18) / 0.28),
    );
  } else if (cycleProgress >= 0.46 && cycleProgress < 0.62) {
    phase = 'windy';
    envelope = 0.9 + gust * 0.1;
  } else if (cycleProgress >= 0.62 && cycleProgress < 0.88) {
    phase = 'easing';
    envelope = THREE.MathUtils.lerp(
      0.9,
      0.07,
      smoothWeatherStep((cycleProgress - 0.62) / 0.26),
    );
  }
  const intensity = THREE.MathUtils.clamp(envelope * (0.88 + gust * 0.12), 0.05, 1);
  return {
    phase,
    cycleProgress,
    intensity,
    wind: THREE.MathUtils.clamp(intensity * (0.72 + gust * 0.28), 0.04, 1),
    waveStrength: THREE.MathUtils.clamp(0.035 + Math.pow(intensity, 1.25) * 0.965, 0.035, 1),
    gust,
  };
}

export type Island22FishingInteractionPhase =
  | 'off'
  | 'approach'
  | 'casting'
  | 'waiting'
  | 'countdown'
  | 'bite'
  | 'reeling'
  | 'caught'
  | 'escaped';

export interface Island22FishingInteractionPresentation {
  active: boolean;
  phase: Island22FishingInteractionPhase;
  catchKind: 'nothing' | 'small' | 'medium' | 'large' | 'colossal';
  countdown: number | null;
  pullProgress: number;
  tension: number;
  reelPulse: number;
}

export const ISLAND_22_GUILD_HALL_FORM = {
  sourceAuthority: 'island-016-fishermans-village-guild-hall-swept-mansard-v001',
  frontAxis: '+z',
  footprint: { width: 4.92, depth: 3.37, heightL3: 4.92 },
  apron: { radiusTop: 2.12, radiusBottom: 2.22, depthScale: 0.76, height: 0.18 },
  occupiedShell: { width: 2.85, height: 1.62, depth: 1.94, centerY: 1.05 },
  mansard: {
    level1: [
      { y: 1.78, halfWidth: 1.62, halfDepth: 1.08 },
      { y: 2.04, halfWidth: 1.55, halfDepth: 1.03 },
      { y: 2.58, halfWidth: 1.08, halfDepth: 0.78 },
      { y: 2.92, halfWidth: 0.84, halfDepth: 0.62 },
    ],
    mature: [
      { y: 1.78, halfWidth: 1.86, halfDepth: 1.36 },
      { y: 1.98, halfWidth: 1.82, halfDepth: 1.33 },
      { y: 2.18, halfWidth: 1.71, halfDepth: 1.26 },
      { y: 2.43, halfWidth: 1.54, halfDepth: 1.15 },
      { y: 2.72, halfWidth: 1.35, halfDepth: 1.02 },
      { y: 3.03, halfWidth: 1.15, halfDepth: 0.87 },
      { y: 3.34, halfWidth: 0.95, halfDepth: 0.74 },
      { y: 3.64, halfWidth: 0.78, halfDepth: 0.62 },
      { y: 3.88, halfWidth: 0.67, halfDepth: 0.54 },
      { y: 4.02, halfWidth: 0.64, halfDepth: 0.5 },
    ],
  },
  frontGable: { width: 2.2, baseY: 1.18, peakRise: 1.74, depth: 0.28, frontZ: 1.12 },
  wing: { centerX: 1.62, width: 1.24, bodyHeight: 1.12, depth: 1.62 },
  crown: { deckY: 4.07, width: 1.42, depth: 1.08, finialTopY: 4.92 },
  cameraTarget: [0, 2.04, 0] as const,
  requiredViews: ['source-facing', 'orbit-left', 'orbit-right', 'rear', 'clay'] as const,
  approximation: 'Source-facing geometry is observed; rear/service continuity is secondary inference.',
} as const;

const qualitySegments = (quality: Island3DQuality) => quality === 'high' ? 20 : quality === 'medium' ? 16 : 12;
const qualityScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.7 : 0.45;

function resolvePondPlatformPose(index: number, count: number) {
  const cadence = index / count * Math.PI * 2 + 0.18;
  const angle = cadence + Math.sin(index * 2.31 + count) * 0.055;
  const radius = 2.7 + Math.sin(index * 1.73 + 0.4) * 0.09;
  const yaw = -angle + Math.PI / 2 + Math.sin(index * 1.17) * 0.07;
  return { angle, radius, yaw };
}

function cylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  segments = 14,
) {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), material);
}

function box(width: number, height: number, depth: number, material: THREE.Material) {
  return new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
}

type ProceduralSurfaceKind = 'cliff' | 'stone' | 'cobble' | 'grass' | 'wood' | 'dark-wood';

function hashSurfaceNoise(x: number, y: number, seed: number) {
  let value = Math.imul(x + seed * 1013, 374761393) ^ Math.imul(y + seed * 1999, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function createProceduralSurfaceMaps(
  kind: ProceduralSurfaceKind,
  base: readonly [number, number, number],
  seed: number,
) {
  const size = 64;
  const albedoData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const isWood = kind === 'wood' || kind === 'dark-wood';
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const v = y / size;
      const coarse = hashSurfaceNoise(Math.floor(x / 8), Math.floor(y / 8), seed);
      const medium = hashSurfaceNoise(Math.floor(x / 3), Math.floor(y / 3), seed + 17);
      const fine = hashSurfaceNoise(x, y, seed + 41);
      let value = (coarse - 0.5) * 0.2 + (medium - 0.5) * 0.12 + (fine - 0.5) * 0.055;
      let warmth = 0;
      let roughness = 0.82;

      if (isWood) {
        const grain = Math.sin((u * 13.5 + Math.sin(v * 11 + seed) * 0.3) * Math.PI * 2);
        const pore = Math.pow(Math.abs(grain), 9);
        const knotDistance = Math.hypot(u - 0.68, (v - 0.35) * 1.8);
        const knot = Math.max(0, 1 - knotDistance * 8) * Math.sin(knotDistance * 64);
        value += grain * 0.055 - pore * 0.12 + knot * 0.08;
        warmth = (coarse - 0.5) * 0.04;
        roughness = kind === 'dark-wood' ? 0.88 : 0.73 + pore * 0.16;
      } else if (kind === 'grass') {
        const bladeBands = Math.sin((u * 7.5 + v * 4.2 + coarse) * Math.PI * 2) * 0.035;
        value += bladeBands + (coarse > 0.72 ? 0.085 : 0);
        warmth = (medium - 0.5) * 0.06;
        roughness = 0.91 - coarse * 0.05;
      } else {
        const seam = Math.pow(Math.max(0, Math.sin((u * 5.2 + v * 3.7 + coarse * 0.7) * Math.PI)), 18);
        const mineral = Math.sin((u * 9.1 - v * 6.4 + medium) * Math.PI * 2) * 0.035;
        value += mineral - seam * (kind === 'cobble' ? 0.18 : 0.1);
        warmth = kind === 'cobble' ? (coarse - 0.5) * 0.075 : (medium - 0.5) * 0.025;
        roughness = kind === 'cliff' ? 0.94 : kind === 'stone' ? 0.9 : 0.86;
      }

      const pixelIndex = (y * size + x) * 4;
      const shade = THREE.MathUtils.clamp(1 + value, 0.64, 1.28);
      albedoData[pixelIndex] = Math.round(THREE.MathUtils.clamp(base[0] * (shade + warmth), 0, 255));
      albedoData[pixelIndex + 1] = Math.round(THREE.MathUtils.clamp(base[1] * shade, 0, 255));
      albedoData[pixelIndex + 2] = Math.round(THREE.MathUtils.clamp(base[2] * (shade - warmth * 0.35), 0, 255));
      albedoData[pixelIndex + 3] = 255;
      const roughnessByte = Math.round(THREE.MathUtils.clamp(roughness + (fine - 0.5) * 0.09, 0.45, 0.98) * 255);
      roughnessData[pixelIndex] = roughnessByte;
      roughnessData[pixelIndex + 1] = roughnessByte;
      roughnessData[pixelIndex + 2] = roughnessByte;
      roughnessData[pixelIndex + 3] = 255;
    }
  }

  const map = new THREE.DataTexture(albedoData, size, size, THREE.RGBAFormat);
  map.name = `ISLAND_22_${kind.toUpperCase()}_ALBEDO`;
  map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = THREE.RepeatWrapping;
  map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(isWood ? 2 : 3, isWood ? 6 : 3);
  map.minFilter = THREE.LinearMipmapLinearFilter;
  map.magFilter = THREE.LinearFilter;
  map.generateMipmaps = true;
  map.anisotropy = 4;
  map.needsUpdate = true;

  const roughnessMap = new THREE.DataTexture(roughnessData, size, size, THREE.RGBAFormat);
  roughnessMap.name = `ISLAND_22_${kind.toUpperCase()}_ROUGHNESS`;
  roughnessMap.wrapS = THREE.RepeatWrapping;
  roughnessMap.wrapT = THREE.RepeatWrapping;
  roughnessMap.repeat.copy(map.repeat);
  roughnessMap.minFilter = THREE.LinearMipmapLinearFilter;
  roughnessMap.magFilter = THREE.LinearFilter;
  roughnessMap.generateMipmaps = true;
  roughnessMap.anisotropy = 4;
  roughnessMap.needsUpdate = true;
  return { map, roughnessMap };
}

function createIrregularTerraceGeometry(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  segments: number,
  seed: number,
  zScale = 1,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const largeWave = Math.sin(angle * 3 + seed * 0.73) * 0.045;
    const smallWave = Math.sin(angle * 7 - seed * 0.41) * 0.022;
    const topRadius = radiusTop * (1 + largeWave + smallWave);
    const bottomRadius = radiusBottom * (1 + largeWave * 0.72 - smallWave * 0.55);
    positions.push(Math.cos(angle) * topRadius, height / 2, Math.sin(angle) * topRadius * zScale);
    positions.push(Math.cos(angle) * bottomRadius, -height / 2, Math.sin(angle) * bottomRadius * zScale);
    uvs.push(index / segments, 1, index / segments, 0);
  }
  const topCenterIndex = positions.length / 3;
  positions.push(0, height / 2, 0);
  uvs.push(0.5, 0.5);
  const bottomCenterIndex = positions.length / 3;
  positions.push(0, -height / 2, 0);
  uvs.push(0.5, 0.5);
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    const top = index * 2;
    const bottom = top + 1;
    const nextTop = next * 2;
    const nextBottom = nextTop + 1;
    indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
    indices.push(topCenterIndex, nextTop, top);
    indices.push(bottomCenterIndex, bottom, nextBottom);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createIrregularPatchGeometry(
  radius: number,
  segments: number,
  seed: number,
  zScale = 1,
) {
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const outlineNoise = Math.sin(angle * 3 + seed * 0.71) * 0.13
      + Math.sin(angle * 7 - seed * 0.37) * 0.055;
    const pointRadius = radius * (1 + outlineNoise);
    const x = Math.cos(angle) * pointRadius;
    const z = Math.sin(angle) * pointRadius * zScale;
    positions.push(x, Math.sin(angle * 4 + seed) * 0.008, z);
    uvs.push(0.5 + x / (radius * 2.5), 0.5 + z / (radius * zScale * 2.5));
  }
  for (let index = 0; index < segments; index += 1) {
    indices.push(0, index + 1, (index + 1) % segments + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createHarborOceanGeometry(radius: number, radialSegments: number, angularSegments: number) {
  const positions: number[] = [0, 0, 0];
  const uvs: number[] = [0.5, 0.5];
  const indices: number[] = [];
  for (let ring = 1; ring <= radialSegments; ring += 1) {
    const ringRadius = radius * ring / radialSegments;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const angle = segment / angularSegments * Math.PI * 2;
      const x = Math.cos(angle) * ringRadius;
      const y = Math.sin(angle) * ringRadius;
      positions.push(x, y, 0);
      uvs.push(0.5 + x / (radius * 2), 0.5 + y / (radius * 2));
    }
  }
  for (let segment = 0; segment < angularSegments; segment += 1) {
    indices.push(0, segment + 1, (segment + 1) % angularSegments + 1);
  }
  for (let ring = 1; ring < radialSegments; ring += 1) {
    const innerStart = 1 + (ring - 1) * angularSegments;
    const outerStart = 1 + ring * angularSegments;
    for (let segment = 0; segment < angularSegments; segment += 1) {
      const next = (segment + 1) % angularSegments;
      const inner = innerStart + segment;
      const innerNext = innerStart + next;
      const outer = outerStart + segment;
      const outerNext = outerStart + next;
      indices.push(inner, outer, innerNext, innerNext, outer, outerNext);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type HarborWeatherUniforms = {
  uHarborWeatherTime: { value: number };
  uHarborWeatherStrength: { value: number };
};

function attachHarborOceanWaveShader(material: THREE.MeshPhysicalMaterial) {
  const uniforms: HarborWeatherUniforms = {
    uHarborWeatherTime: { value: 0 },
    uHarborWeatherStrength: { value: 0.02 },
  };
  material.userData.harborWeatherUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uHarborWeatherTime;
uniform float uHarborWeatherStrength;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float harborWaveA = sin(position.x * 0.52 + uHarborWeatherTime * 1.28);
float harborWaveB = sin(position.y * 0.38 - uHarborWeatherTime * 0.92 + position.x * 0.11);
float harborWaveC = sin((position.x + position.y) * 0.24 + uHarborWeatherTime * 0.58);
transformed.z += (harborWaveA * 0.5 + harborWaveB * 0.32 + harborWaveC * 0.18)
  * uHarborWeatherStrength;`,
      );
  };
  material.customProgramCacheKey = () => 'island-016-dynamic-harbor-ocean-v1';
}

function attachHarborWindShader(material: THREE.MeshStandardMaterial, responseScale: number) {
  const uniforms: HarborWeatherUniforms = {
    uHarborWeatherTime: { value: 0 },
    uHarborWeatherStrength: { value: 0 },
  };
  material.userData.harborWeatherUniforms = uniforms;
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uHarborWeatherTime;
uniform float uHarborWeatherStrength;`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
float harborWindHeight = max(position.y + 0.45, 0.0);
float harborWindPulse = sin(uHarborWeatherTime * 1.9 + position.x * 2.1 + position.z * 1.7);
float harborWindCross = sin(uHarborWeatherTime * 1.27 + position.z * 2.7);
transformed.x += harborWindPulse * harborWindHeight * uHarborWeatherStrength * ${responseScale.toFixed(3)};
transformed.z += harborWindCross * harborWindHeight * uHarborWeatherStrength * ${(responseScale * 0.42).toFixed(3)};`,
      );
  };
  material.customProgramCacheKey = () => `island-016-harbor-wind-v1-${responseScale.toFixed(3)}`;
}

function updateHarborWeatherUniforms(
  material: THREE.Material,
  elapsed: number,
  strength: number,
) {
  const uniforms = material.userData.harborWeatherUniforms as HarborWeatherUniforms | undefined;
  if (!uniforms) return;
  uniforms.uHarborWeatherTime.value = elapsed;
  uniforms.uHarborWeatherStrength.value = strength;
}

function createGrassTuftGeometry() {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const bladeCount = 6;
  for (let blade = 0; blade < bladeCount; blade += 1) {
    const angle = blade / bladeCount * Math.PI * 2 + (blade % 2) * 0.22;
    const directionX = Math.cos(angle);
    const directionZ = Math.sin(angle);
    const sideX = -directionZ;
    const sideZ = directionX;
    const radialOffset = blade % 3 * 0.026;
    const width = 0.042 + blade % 2 * 0.014;
    const height = 0.34 + blade % 3 * 0.075;
    const bend = 0.1 + blade % 2 * 0.045;
    const start = positions.length / 3;
    positions.push(
      directionX * radialOffset + sideX * width, 0, directionZ * radialOffset + sideZ * width,
      directionX * radialOffset - sideX * width, 0, directionZ * radialOffset - sideZ * width,
      directionX * bend + sideX * width * 0.55, height * 0.56, directionZ * bend + sideZ * width * 0.55,
      directionX * bend - sideX * width * 0.55, height * 0.56, directionZ * bend - sideZ * width * 0.55,
      directionX * bend * 1.7, height, directionZ * bend * 1.7,
    );
    uvs.push(0, 0, 1, 0, 0.2, 0.55, 0.8, 0.55, 0.5, 1);
    indices.push(start, start + 1, start + 2, start + 1, start + 3, start + 2, start + 2, start + 3, start + 4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function setShadow(root: THREE.Object3D, cast = true) {
  root.traverse((node) => {
    if (!(node instanceof THREE.Mesh)) return;
    node.castShadow = cast;
    node.receiveShadow = true;
  });
}

function markPart(node: THREE.Object3D, partId: string, sockets: Record<string, string> = {}) {
  node.userData.partId = partId;
  node.userData.partKind = 'part';
  node.userData.sculptRuntime = {
    parts: [{ id: partId, name: partId, kind: 'part', nodeName: node.name, module: 'island-022-slice-01', triangles: 0 }],
    clickable: true,
    explodable: true,
    sockets,
    colliders: [{ id: `island-022-${partId}`, type: 'compound', isTrigger: true }],
    destructionGroups: [{ id: partId, breakable: false, partIds: [partId] }],
  };
}

export function createIsland22FishermansVillageMaterials(): Island22FishermansVillageMaterials {
  const oceanAlphaSize = 128;
  const oceanAlphaData = new Uint8Array(oceanAlphaSize * oceanAlphaSize);
  for (let y = 0; y < oceanAlphaSize; y += 1) {
    for (let x = 0; x < oceanAlphaSize; x += 1) {
      const nx = (x / (oceanAlphaSize - 1) - 0.5) * 2;
      const ny = (y / (oceanAlphaSize - 1) - 0.5) * 2;
      const radius = Math.sqrt(nx * nx + ny * ny);
      const fade = THREE.MathUtils.clamp((radius - 0.24) / (0.68 - 0.24), 0, 1);
      const smoothFade = fade * fade * (3 - 2 * fade);
      oceanAlphaData[y * oceanAlphaSize + x] = Math.round((1 - smoothFade) * 255);
    }
  }
  const oceanAlphaMap = new THREE.DataTexture(
    oceanAlphaData,
    oceanAlphaSize,
    oceanAlphaSize,
    THREE.RedFormat,
  );
  oceanAlphaMap.name = 'ISLAND_22_OCEAN_RADIAL_ALPHA';
  oceanAlphaMap.needsUpdate = true;

  const cliffSurface = createProceduralSurfaceMaps('cliff', [67, 83, 81], 22);
  const stoneSurface = createProceduralSurfaceMaps('stone', [132, 124, 105], 37);
  const cobbleSurface = createProceduralSurfaceMaps('cobble', [185, 164, 119], 53);
  const grassSurface = createProceduralSurfaceMaps('grass', [87, 119, 69], 71);
  const timberSurface = createProceduralSurfaceMaps('wood', [157, 101, 55], 89);
  const darkTimberSurface = createProceduralSurfaceMaps('dark-wood', [71, 47, 34], 107);

  const foliage = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    map: grassSurface.map,
    roughness: 0.92,
    roughnessMap: grassSurface.roughnessMap,
    flatShading: true,
  });
  attachHarborWindShader(foliage, 0.07);
  const ocean = new THREE.MeshPhysicalMaterial({
    color: 0x0d78a4,
    roughness: 0.12,
    metalness: 0.03,
    clearcoat: 0.82,
    clearcoatRoughness: 0.14,
    transparent: true,
    opacity: 0.56,
    alphaMap: oceanAlphaMap,
    depthWrite: false,
  });
  attachHarborOceanWaveShader(ocean);
  const grassBlade = new THREE.MeshStandardMaterial({
    color: 0xf4f7d2,
    map: grassSurface.map,
    roughness: 0.94,
    roughnessMap: grassSurface.roughnessMap,
    side: THREE.DoubleSide,
    flatShading: true,
  });
  attachHarborWindShader(grassBlade, 0.14);

  return {
    cliff: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cliffSurface.map,
      roughness: 0.94,
      roughnessMap: cliffSurface.roughnessMap,
      metalness: 0.012,
      flatShading: true,
    }),
    stone: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: stoneSurface.map,
      roughness: 0.9,
      roughnessMap: stoneSurface.roughnessMap,
      metalness: 0.012,
      flatShading: true,
    }),
    cobble: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: cobbleSurface.map,
      roughness: 0.88,
      roughnessMap: cobbleSurface.roughnessMap,
      metalness: 0,
      flatShading: true,
    }),
    terrace: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: grassSurface.map,
      roughness: 0.9,
      roughnessMap: grassSurface.roughnessMap,
      metalness: 0.004,
    }),
    plaster: new THREE.MeshStandardMaterial({ color: 0xe0aa70, roughness: 0.8, metalness: 0 }),
    timber: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: timberSurface.map,
      roughness: 0.74,
      roughnessMap: timberSurface.roughnessMap,
    }),
    timberDark: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      map: darkTimberSurface.map,
      roughness: 0.88,
      roughnessMap: darkTimberSurface.roughnessMap,
    }),
    roof: new THREE.MeshStandardMaterial({
      color: 0x405b66,
      roughness: 0.82,
      metalness: 0.025,
      emissive: 0x172b31,
      emissiveIntensity: 0.12,
      flatShading: true,
    }),
    roofWarm: new THREE.MeshStandardMaterial({
      color: 0x8d5036,
      roughness: 0.84,
      metalness: 0.015,
      emissive: 0x35170f,
      emissiveIntensity: 0.08,
      flatShading: true,
    }),
    brass: new THREE.MeshStandardMaterial({ color: 0xc27b38, roughness: 0.28, metalness: 0.68 }),
    window: new THREE.MeshStandardMaterial({
      color: 0xffb94f,
      roughness: 0.2,
      emissive: 0xff8426,
      emissiveIntensity: 1.25,
    }),
    pond: new THREE.MeshPhysicalMaterial({
      color: 0x087789,
      roughness: 0.16,
      metalness: 0.04,
      clearcoat: 0.72,
      clearcoatRoughness: 0.16,
      transparent: true,
      opacity: 0.92,
    }),
    ocean,
    rope: new THREE.MeshStandardMaterial({ color: 0xc09b64, roughness: 0.94 }),
    foliage,
    grassBlade,
    foam: new THREE.MeshBasicMaterial({ color: 0xd8f4ee, transparent: true, opacity: 0.42, depthWrite: false }),
  };
}

interface Island22HarborSkyRuntime {
  root: THREE.Group;
  update: (elapsed: number, weather: Island22HarborWeatherState) => void;
}

function addHarborSky(root: THREE.Group, quality: Island3DQuality): Island22HarborSkyRuntime {
  const skyMaterial = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(0x3f91bc) },
      horizonColor: { value: new THREE.Color(0xb7d8d2) },
      lowColor: { value: new THREE.Color(0x5d9eaa) },
    },
    vertexShader: `varying float vSkyHeight;
      void main() {
        vSkyHeight = normalize(position).y;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `uniform vec3 topColor;
      uniform vec3 horizonColor;
      uniform vec3 lowColor;
      varying float vSkyHeight;
      void main() {
        float above = smoothstep(-0.05, 0.72, vSkyHeight);
        float below = smoothstep(-0.45, -0.02, vSkyHeight);
        vec3 lowerSky = mix(lowColor, horizonColor, below);
        gl_FragColor = vec4(mix(lowerSky, topColor, above), 1.0);
      }`,
  });
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(48, quality === 'low' ? 16 : 24, quality === 'low' ? 9 : 14),
    skyMaterial,
  );
  sky.name = 'ISLAND_22_HARBOR_GRADIENT_SKY';
  sky.renderOrder = -20;
  sky.visible = true;
  root.add(sky);

  const sunMaterial = new THREE.MeshBasicMaterial({
    color: 0xffd27d,
    transparent: true,
    opacity: 0.94,
    depthWrite: false,
  });
  const harborSun = new THREE.Mesh(
    new THREE.SphereGeometry(1, quality === 'low' ? 10 : 16, quality === 'low' ? 6 : 10),
    sunMaterial,
  );
  harborSun.name = 'ISLAND_22_WARM_HARBOR_SUN';
  // Keep the sun inside the sky dome and well inside the camera-orbit radius.
  // This preserves its warm front-view read without turning it into a clipped,
  // near-camera disc when a landmark camera travels around the island.
  harborSun.position.set(-8, 9, -8);
  harborSun.renderOrder = -10;
  harborSun.visible = true;
  root.add(harborSun);

  const skyRuntimeRoot = new THREE.Group();
  skyRuntimeRoot.name = 'ISLAND_22_DYNAMIC_HARBOR_SKY_RUNTIME';
  const cloudRoot = new THREE.Group();
  cloudRoot.name = 'ISLAND_22_VOLUMETRIC_HORIZON_CLOUD_BANK';
  const cloudClusterCount = quality === 'low' ? 7 : quality === 'medium' ? 10 : 13;
  const puffsPerCluster = quality === 'low' ? 4 : quality === 'medium' ? 6 : 7;
  const cloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.78,
    depthWrite: false,
  });
  const clouds = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, quality === 'low' ? 8 : 12, quality === 'low' ? 5 : 8),
    cloudMaterial,
    cloudClusterCount * puffsPerCluster,
  );
  clouds.name = 'ISLAND_22_SHADED_LAYERED_CLOUD_PUFFS';
  const cloudBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xdce9e7,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.54,
    depthWrite: false,
  });
  const cloudBases = new THREE.InstancedMesh(
    new THREE.SphereGeometry(1, quality === 'low' ? 8 : 12, quality === 'low' ? 5 : 8),
    cloudBaseMaterial,
    cloudClusterCount,
  );
  cloudBases.name = 'ISLAND_22_COHESIVE_CLOUD_SHADOW_UNDERBELLIES';
  const puffOffsets = [
    [0, 0.52, 0],
    [-0.78, 0.2, 0.1],
    [0.78, 0.2, -0.05],
    [-1.38, -0.05, 0.05],
    [1.38, -0.04, 0.08],
    [-0.3, -0.18, 0.3],
    [0.48, -0.16, 0.26],
  ] as const;
  const puffScales = [
    [1.28, 0.9, 1.06],
    [1.08, 0.72, 0.92],
    [1.12, 0.75, 0.96],
    [0.94, 0.58, 0.82],
    [0.98, 0.6, 0.86],
    [0.9, 0.54, 1.02],
    [0.88, 0.52, 0.98],
  ] as const;
  const cloudPalette = [
    new THREE.Color(0xf7fbf7),
    new THREE.Color(0xe4eeea),
    new THREE.Color(0xfff8eb),
    new THREE.Color(0xd8e6e5),
  ];
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let clusterIndex = 0; clusterIndex < cloudClusterCount; clusterIndex += 1) {
    const angle = clusterIndex / cloudClusterCount * Math.PI * 2 + 0.17;
    const radius = 21 + clusterIndex % 4 * 1.15;
    const heroCloud = clusterIndex < 5;
    const cloudX = heroCloud ? -8.4 + clusterIndex * 4.1 : Math.cos(angle) * radius;
    const cloudY = heroCloud ? 5.05 + clusterIndex % 3 * 0.72 : 5.35 + clusterIndex % 4 * 0.8;
    const cloudZ = heroCloud ? -19.2 - clusterIndex % 2 * 1.45 : Math.sin(angle) * radius;
    const tangentX = heroCloud ? 1 : -Math.sin(angle);
    const tangentZ = heroCloud ? 0 : Math.cos(angle);
    const radialX = heroCloud ? 0 : Math.cos(angle);
    const radialZ = heroCloud ? 1 : Math.sin(angle);
    const clusterScale = 0.92 + clusterIndex % 4 * 0.1;
    matrix.compose(
      position.set(cloudX, cloudY - 0.02, cloudZ + 0.12),
      quaternion.setFromEuler(new THREE.Euler(0, -angle + clusterIndex * 0.07, 0)),
      scale.set(2.18 * clusterScale, 0.36 * clusterScale, 0.88 * clusterScale),
    );
    cloudBases.setMatrixAt(clusterIndex, matrix);
    for (let puffIndex = 0; puffIndex < puffsPerCluster; puffIndex += 1) {
      const index = clusterIndex * puffsPerCluster + puffIndex;
      const [lateral, vertical, depthOffset] = puffOffsets[puffIndex];
      const [width, height, depthScale] = puffScales[puffIndex];
      matrix.compose(
        position.set(
          cloudX + tangentX * lateral * clusterScale + radialX * depthOffset,
          cloudY + vertical * clusterScale,
          cloudZ + tangentZ * lateral * clusterScale + radialZ * depthOffset,
        ),
        quaternion.setFromEuler(new THREE.Euler(
          puffIndex % 2 * 0.05,
          -angle + puffIndex * 0.17,
          (puffIndex % 3 - 1) * 0.04,
        )),
        scale.set(width * clusterScale, height * clusterScale, depthScale * clusterScale),
      );
      clouds.setMatrixAt(index, matrix);
      clouds.setColorAt(index, cloudPalette[(clusterIndex + puffIndex) % cloudPalette.length]);
    }
  }
  clouds.instanceMatrix.needsUpdate = true;
  if (clouds.instanceColor) clouds.instanceColor.needsUpdate = true;
  clouds.frustumCulled = false;
  cloudBases.instanceMatrix.needsUpdate = true;
  cloudBases.frustumCulled = false;
  cloudRoot.add(cloudBases, clouds);

  // The hero bank above carries the readable weather beat. A second, smaller
  // cloud system sits outside every production camera so the horizon remains
  // meteorologically believable from the overview and every orbit instead of
  // exposing one isolated cloud collection in an otherwise empty sky.
  const distantCloudRoot = new THREE.Group();
  distantCloudRoot.name = 'ISLAND_22_FULL_360_DISTANT_HORIZON_CLOUD_BELT';
  const distantClusterCount = quality === 'low' ? 14 : quality === 'medium' ? 24 : 32;
  const distantPuffsPerCluster = 4;
  const distantCloudMaterial = new THREE.MeshStandardMaterial({
    color: 0xe5efed,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const distantCloudBaseMaterial = new THREE.MeshStandardMaterial({
    color: 0xcbdcdd,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const distantCloudGeometry = new THREE.SphereGeometry(
    1,
    quality === 'low' ? 7 : 10,
    quality === 'low' ? 5 : 6,
  );
  const distantCloudPuffs = new THREE.InstancedMesh(
    distantCloudGeometry,
    distantCloudMaterial,
    distantClusterCount * distantPuffsPerCluster,
  );
  distantCloudPuffs.name = 'ISLAND_22_DISTANT_HORIZON_CLOUD_PUFFS';
  const distantCloudBases = new THREE.InstancedMesh(
    distantCloudGeometry,
    distantCloudBaseMaterial,
    distantClusterCount,
  );
  distantCloudBases.name = 'ISLAND_22_DISTANT_HORIZON_CLOUD_UNDERBELLIES';
  for (let clusterIndex = 0; clusterIndex < distantClusterCount; clusterIndex += 1) {
    const angle = clusterIndex / distantClusterCount * Math.PI * 2
      + 0.11
      + Math.sin(clusterIndex * 2.17) * 0.075
      + Math.sin(clusterIndex * 0.73) * 0.028;
    const radius = 37.2
      + clusterIndex % 4 * 0.68
      + Math.sin(clusterIndex * 1.61) * 0.5;
    const clusterScale = 0.58
      + clusterIndex % 5 * 0.105
      + (clusterIndex % 7 === 0 ? 0.2 : 0);
    const cloudX = Math.cos(angle) * radius;
    const cloudY = 3.3
      + clusterIndex % 7 * 0.29
      + Math.sin(clusterIndex * 1.37) * 0.32;
    const cloudZ = Math.sin(angle) * radius;
    const tangentX = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const radialX = Math.cos(angle);
    const radialZ = Math.sin(angle);
    matrix.compose(
      position.set(cloudX, cloudY - 0.08, cloudZ),
      quaternion.setFromEuler(new THREE.Euler(0, -angle, 0)),
      scale.set(
        (2.25 + clusterIndex % 3 * 0.34) * clusterScale,
        (0.24 + clusterIndex % 2 * 0.055) * clusterScale,
        (0.74 + clusterIndex % 4 * 0.07) * clusterScale,
      ),
    );
    distantCloudBases.setMatrixAt(clusterIndex, matrix);
    const topologyPuffCount = 2 + (clusterIndex * 7) % 3;
    for (let puffIndex = 0; puffIndex < distantPuffsPerCluster; puffIndex += 1) {
      const visiblePuff = puffIndex < topologyPuffCount;
      const lateral = (puffIndex - (topologyPuffCount - 1) / 2)
        * (0.66 + clusterIndex % 4 * 0.065)
        * clusterScale;
      const radialOffset = (puffIndex === 1 ? -0.06 : 0.12) * clusterScale;
      const index = clusterIndex * distantPuffsPerCluster + puffIndex;
      const centrality = 1 - Math.abs(puffIndex - (topologyPuffCount - 1) / 2)
        / Math.max(1, topologyPuffCount);
      const puffVariance = 0.82
        + (clusterIndex + puffIndex * 3) % 5 * 0.075;
      matrix.compose(
        position.set(
          cloudX + tangentX * lateral + radialX * radialOffset,
          cloudY + (0.04 + centrality * 0.34 + Math.sin(clusterIndex + puffIndex) * 0.08) * clusterScale,
          cloudZ + tangentZ * lateral + radialZ * radialOffset,
        ),
        quaternion.setFromEuler(new THREE.Euler(
          (puffIndex - 1) * 0.035,
          -angle + puffIndex * 0.13,
          (puffIndex - 1) * 0.04,
        )),
        scale.set(
          visiblePuff ? (0.82 + centrality * 0.3) * clusterScale * puffVariance : 0,
          visiblePuff ? (0.42 + centrality * 0.2) * clusterScale / puffVariance : 0,
          visiblePuff ? (0.68 + centrality * 0.16) * clusterScale : 0,
        ),
      );
      distantCloudPuffs.setMatrixAt(index, matrix);
    }
  }
  distantCloudPuffs.instanceMatrix.needsUpdate = true;
  distantCloudBases.instanceMatrix.needsUpdate = true;
  distantCloudPuffs.frustumCulled = false;
  distantCloudBases.frustumCulled = false;
  distantCloudRoot.add(distantCloudBases, distantCloudPuffs);

  const gullRoot = new THREE.Group();
  gullRoot.name = 'ISLAND_22_HARBOR_GULL_FLOCK';
  const gullCount = quality === 'low' ? 4 : 7;
  const gullMaterial = new THREE.MeshBasicMaterial({
    color: 0xf7fbf1,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });
  const leftGullWings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.48, 0.035, 0.08),
    gullMaterial,
    gullCount,
  );
  const rightGullWings = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.48, 0.035, 0.08),
    gullMaterial,
    gullCount,
  );
  leftGullWings.name = 'ISLAND_22_HARBOR_GULL_LEFT_WINGS';
  rightGullWings.name = 'ISLAND_22_HARBOR_GULL_RIGHT_WINGS';
  for (let index = 0; index < gullCount; index += 1) {
    const angle = 0.42 + index * 0.51;
    const radius = 10.5 + index % 3 * 2.2;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius - 2.5;
    const y = 4.8 + index % 4 * 0.72;
    const yaw = -angle + Math.PI / 2;
    matrix.compose(
      position.set(x - Math.sin(yaw) * 0.2, y, z - Math.cos(yaw) * 0.2),
      quaternion.setFromEuler(new THREE.Euler(0.18, yaw, 0.32)),
      scale.setScalar(0.72 + index % 3 * 0.12),
    );
    leftGullWings.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x + Math.sin(yaw) * 0.2, y, z + Math.cos(yaw) * 0.2),
      quaternion.setFromEuler(new THREE.Euler(-0.18, yaw, -0.32)),
      scale.setScalar(0.72 + index % 3 * 0.12),
    );
    rightGullWings.setMatrixAt(index, matrix);
  }
  leftGullWings.instanceMatrix.needsUpdate = true;
  rightGullWings.instanceMatrix.needsUpdate = true;
  leftGullWings.frustumCulled = false;
  rightGullWings.frustumCulled = false;
  gullRoot.add(leftGullWings, rightGullWings);
  skyRuntimeRoot.add(distantCloudRoot, cloudRoot, gullRoot);
  root.add(skyRuntimeRoot);

  const calmTop = new THREE.Color(0x3f91bc);
  const windyTop = new THREE.Color(0x426d84);
  const calmHorizon = new THREE.Color(0xb7d8d2);
  const windyHorizon = new THREE.Color(0x839fa7);
  const calmLow = new THREE.Color(0x5d9eaa);
  const windyLow = new THREE.Color(0x426674);
  const calmCloud = new THREE.Color(0xffffff);
  const windyCloud = new THREE.Color(0xa9bec4);
  const calmCloudBase = new THREE.Color(0xdce9e7);
  const windyCloudBase = new THREE.Color(0x6f8791);
  const calmDistantCloud = new THREE.Color(0xe5efed);
  const windyDistantCloud = new THREE.Color(0x9fb5ba);
  const calmDistantCloudBase = new THREE.Color(0xcbdcdd);
  const windyDistantCloudBase = new THREE.Color(0x718a93);
  return {
    root: skyRuntimeRoot,
    update: (elapsed, weather) => {
      const isEasing = weather.phase === 'easing';
      const phaseClearing = isEasing
        ? smoothWeatherStep((weather.cycleProgress - 0.62) / 0.26)
        : 0;
      const cloudLift = Math.sin(elapsed * 0.08) * 0.08
        - weather.intensity * 0.18
        + phaseClearing * 0.28;
      cloudRoot.position.y = cloudLift;
      cloudRoot.rotation.y = elapsed * (0.0027 + weather.wind * 0.0018)
        + Math.sin(elapsed * 0.041) * 0.022
        + Math.sin(elapsed * 0.13) * 0.012 * weather.wind;
      cloudRoot.scale.set(
        1 + weather.intensity * 0.055,
        1 + weather.intensity * 0.19 - phaseClearing * 0.07,
        1 + weather.intensity * 0.075,
      );
      cloudMaterial.color.copy(calmCloud).lerp(windyCloud, weather.intensity * 0.58);
      cloudMaterial.opacity = THREE.MathUtils.lerp(0.72, 0.93, weather.intensity)
        - phaseClearing * 0.12;
      cloudBaseMaterial.color.copy(calmCloudBase).lerp(windyCloudBase, weather.intensity * 0.62);
      cloudBaseMaterial.opacity = THREE.MathUtils.lerp(0.48, 0.82, weather.intensity)
        - phaseClearing * 0.2;
      distantCloudRoot.rotation.y = -elapsed * (0.0009 + weather.wind * 0.0012)
        + Math.sin(elapsed * 0.027) * 0.009;
      distantCloudRoot.position.y = -weather.intensity * 0.1 + phaseClearing * 0.15;
      distantCloudRoot.scale.set(
        1 + weather.intensity * 0.012,
        1 + weather.intensity * 0.1 - phaseClearing * 0.04,
        1 + weather.intensity * 0.012,
      );
      distantCloudMaterial.color.copy(calmDistantCloud)
        .lerp(windyDistantCloud, weather.intensity * 0.62);
      distantCloudMaterial.opacity = THREE.MathUtils.lerp(0.34, 0.62, weather.intensity)
        - phaseClearing * 0.08;
      distantCloudBaseMaterial.color.copy(calmDistantCloudBase)
        .lerp(windyDistantCloudBase, weather.intensity * 0.65);
      distantCloudBaseMaterial.opacity = THREE.MathUtils.lerp(0.24, 0.55, weather.intensity)
        - phaseClearing * 0.1;
      gullRoot.rotation.y = elapsed * (0.004 + weather.wind * 0.006);
      gullRoot.position.y = Math.sin(elapsed * 0.18) * (0.04 + weather.wind * 0.08);
      sunMaterial.opacity = THREE.MathUtils.lerp(0.94, 0.4, weather.intensity)
        + phaseClearing * 0.16;
      skyMaterial.uniforms.topColor.value.copy(calmTop).lerp(windyTop, weather.intensity * 0.82);
      skyMaterial.uniforms.horizonColor.value.copy(calmHorizon).lerp(windyHorizon, weather.intensity * 0.75);
      skyMaterial.uniforms.lowColor.value.copy(calmLow).lerp(windyLow, weather.intensity * 0.72);
    },
  };
}

function addHarborHorizonIslets(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const islets = new THREE.Group();
  islets.name = 'ISLAND_22_HARBOR_HORIZON_ISLETS';
  const rockMaterial = materials.cliff.clone();
  rockMaterial.color.set(0xffffff);
  rockMaterial.roughness = 0.94;
  const sunlitRockMaterial = materials.stone.clone();
  sunlitRockMaterial.color.set(0xffffff);
  const wetRockMaterial = materials.cliff.clone();
  wetRockMaterial.color.set(0xdce8df);
  wetRockMaterial.roughness = 0.82;
  wetRockMaterial.emissive.set(0x173d3d);
  wetRockMaterial.emissiveIntensity = 0.16;
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xdffbf3,
    transparent: true,
    opacity: 0.42,
    depthWrite: false,
  });
  const placements = [
    [-15, -28, 1.18, 0.2],
    [-4, -31, 0.82, -0.35],
    [10, -29, 1.02, 0.65],
    [20, -26, 0.68, 0.42],
  ] as const;
  placements.slice(0, quality === 'low' ? 3 : placements.length).forEach(([x, z, size, yaw], index) => {
    const islet = new THREE.Group();
    islet.name = `ISLAND_22_HORIZON_ROCK_ISLET_${index + 1}`;
    // Seat the wet shelf below the shared ocean plane so the rocks rise out of
    // the sea instead of reading as dark floating saucers.
    islet.position.set(x, -0.72, z);
    islet.rotation.y = yaw;
    islet.scale.setScalar(size);

    const wetBase = new THREE.Mesh(
      createIrregularTerraceGeometry(1.08, 1.28, 0.46, 11, 131 + index * 7, 0.72),
      wetRockMaterial,
    );
    wetBase.position.y = -0.12;
    const foundation = new THREE.Mesh(
      createIrregularTerraceGeometry(0.88, 1.12, 0.78, 10, 97 + index * 11, 0.7),
      rockMaterial,
    );
    foundation.position.y = 0.18;
    const crown = new THREE.Mesh(new THREE.DodecahedronGeometry(0.66, 0), sunlitRockMaterial);
    crown.scale.set(0.96, 1.25, 0.8);
    crown.position.set(-0.18, 0.9, 0.04);
    crown.rotation.set(0.08, 0.4 + index * 0.23, -0.12);
    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.48, 0), sunlitRockMaterial);
    shoulder.scale.set(1.08, 0.72, 0.82);
    shoulder.position.set(0.68, 0.42, -0.1);
    shoulder.rotation.z = 0.18;
    islet.add(wetBase, foundation, crown, shoulder);

    if (quality !== 'low' && index % 3 !== 1) {
      const pine = new THREE.Group();
      const trunk = cylinder(0.075, 0.1, 0.86, materials.timberDark, 6);
      trunk.position.y = 1.2;
      const lower = new THREE.Mesh(new THREE.ConeGeometry(0.48, 0.92, 7), materials.foliage);
      lower.position.y = 1.72;
      const upper = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.76, 7), materials.foliage);
      upper.position.y = 2.2;
      pine.add(trunk, lower, upper);
      pine.position.x = -0.28;
      islet.add(pine);
    }

    [0.18, 3.62].forEach((startAngle, foamIndex) => {
      const foam = new THREE.Mesh(
        new THREE.TorusGeometry(1.62, 0.045, 4, 18, foamIndex === 0 ? 2.05 : 1.48),
        foamMaterial,
      );
      foam.rotation.set(Math.PI / 2, 0, startAngle);
      foam.scale.z = 0.68;
      foam.position.y = -0.1 + foamIndex * 0.012;
      foam.renderOrder = 2;
      islet.add(foam);
    });
    islets.add(islet);
  });
  root.add(islets);
  return islets;
}

interface Island22HarborOceanDetailRuntime {
  root: THREE.Group;
  update: (elapsed: number, weather: Island22HarborWeatherState) => void;
}

function addHarborOceanDetail(
  root: THREE.Group,
  quality: Island3DQuality,
): Island22HarborOceanDetailRuntime {
  const detail = new THREE.Group();
  detail.name = 'ISLAND_22_LIVING_HARBOR_OCEAN_DETAIL';
  const foamMaterial = new THREE.MeshBasicMaterial({
    color: 0xcdf8ef,
    transparent: true,
    opacity: 0.36,
    depthWrite: false,
  });
  const arcCount = quality === 'low' ? 4 : 7;
  const shorelineArcs: THREE.Mesh[] = [];
  for (let index = 0; index < arcCount; index += 1) {
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(
        9.05 + index % 3 * 0.12,
        0.045 + index % 2 * 0.012,
        4,
        quality === 'low' ? 16 : 24,
        0.52 + index % 3 * 0.17,
      ),
      foamMaterial,
    );
    arc.name = `ISLAND_22_BROKEN_SHORELINE_FOAM_ARC_${index + 1}`;
    arc.rotation.set(Math.PI / 2, 0, index / arcCount * Math.PI * 2 + 0.16);
    arc.scale.z = 1.08;
    arc.position.y = -0.72 + index % 2 * 0.018;
    arc.renderOrder = 2;
    arc.userData.baseArcAngle = arc.rotation.z;
    detail.add(arc);
    shorelineArcs.push(arc);
  }

  const crestCount = quality === 'low' ? 18 : quality === 'medium' ? 36 : 52;
  const crestMaterial = new THREE.MeshBasicMaterial({
    color: 0xe2fbf4,
    transparent: true,
    opacity: 0.08,
    depthWrite: false,
  });
  const waveCrests = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.68, 0.035, 4, quality === 'low' ? 9 : 12, 1.25),
    crestMaterial,
    crestCount,
  );
  waveCrests.name = 'ISLAND_22_DYNAMIC_OFFSHORE_WAVE_CRESTS';
  waveCrests.frustumCulled = false;
  waveCrests.renderOrder = 2;
  detail.add(waveCrests);

  const swellFrontMaterial = new THREE.MeshBasicMaterial({
    color: 0xdaf7f2,
    transparent: true,
    opacity: 0.02,
    depthWrite: false,
  });
  const swellFrontCount = quality === 'low' ? 4 : quality === 'medium' ? 7 : 9;
  const swellFronts: THREE.Mesh[] = [];
  for (let index = 0; index < swellFrontCount; index += 1) {
    const swellArcLength = 0.82 + index % 3 * 0.15;
    const swellFront = new THREE.Mesh(
      new THREE.TorusGeometry(
        12.2 + index * 2.75,
        0.032 + index % 2 * 0.012,
        4,
        quality === 'low' ? 22 : 34,
        swellArcLength,
      ),
      swellFrontMaterial,
    );
    swellFront.name = `ISLAND_22_CONNECTED_WIND_SWELL_FRONT_${index + 1}`;
    swellFront.rotation.set(
      Math.PI / 2,
      0,
      Math.PI / 2 - swellArcLength / 2 + (index % 3 - 1) * 0.18,
    );
    swellFront.position.y = -0.765 + index % 2 * 0.01;
    swellFront.renderOrder = 2;
    swellFront.userData.baseSwellAngle = swellFront.rotation.z;
    detail.add(swellFront);
    swellFronts.push(swellFront);
  }

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();
  root.add(detail);
  return {
    root: detail,
    update: (elapsed, weather) => {
      foamMaterial.opacity = 0.2 + weather.waveStrength * 0.36
        + Math.sin(elapsed * 0.61) * 0.025;
      shorelineArcs.forEach((arc, index) => {
        const pulse = Math.sin(elapsed * (0.52 + weather.wind * 0.48) + index * 1.27);
        arc.rotation.z = arc.userData.baseArcAngle + pulse * (0.008 + weather.wind * 0.025);
        arc.scale.z = 1.06 + weather.waveStrength * 0.08 + pulse * 0.012;
        arc.position.y = -0.72 + index % 2 * 0.018
          + pulse * (0.006 + weather.waveStrength * 0.018);
      });
      crestMaterial.opacity = 0.025 + Math.pow(weather.waveStrength, 1.55) * 0.34;
      swellFrontMaterial.opacity = 0.008 + Math.pow(weather.waveStrength, 2.05) * 0.32;
      swellFronts.forEach((swellFront, index) => {
        const swellPulse = Math.sin(elapsed * (0.26 + weather.wind * 0.42) + index * 0.78);
        swellFront.rotation.z = swellFront.userData.baseSwellAngle
          + swellPulse * (0.006 + weather.wind * 0.024);
        swellFront.scale.setScalar(0.985 + weather.waveStrength * 0.035 + swellPulse * 0.006);
        swellFront.position.y = -0.765 + index % 2 * 0.01
          + swellPulse * (0.004 + weather.waveStrength * 0.014);
      });
      for (let index = 0; index < crestCount; index += 1) {
        const baseAngle = index * 2.399963229728653 + 0.31;
        const baseRadius = 10.6 + index % 9 * 2.28 + Math.sin(index * 1.71) * 0.38;
        const phase = elapsed * (0.34 + weather.wind * 0.78) + index * 1.43;
        const driftAngle = baseAngle + Math.sin(phase * 0.33) * (0.008 + weather.wind * 0.02);
        const radialDrift = Math.sin(phase) * (0.05 + weather.waveStrength * 0.16);
        const radius = baseRadius + radialDrift;
        const lift = Math.sin(phase * 1.38) * (0.008 + weather.waveStrength * 0.052);
        const crestWidth = (0.62 + index % 4 * 0.18) * (0.88 + weather.waveStrength * 0.24);
        matrix.compose(
          position.set(Math.cos(driftAngle) * radius, -0.77 + lift, Math.sin(driftAngle) * radius),
          quaternion.setFromEuler(euler.set(Math.PI / 2, -driftAngle + Math.PI / 2, 0)),
          scale.set(crestWidth, 0.82 + weather.waveStrength * 0.42, 0.72 + weather.waveStrength * 0.34),
        );
        waveCrests.setMatrixAt(index, matrix);
      }
      waveCrests.instanceMatrix.needsUpdate = true;
    },
  };
}

function createRoof(width: number, depth: number, height: number, material: THREE.Material) {
  const roof = new THREE.Mesh(new THREE.ConeGeometry(Math.max(width, depth) * 0.72, height, 4), material);
  roof.rotation.y = Math.PI / 4;
  roof.scale.z = depth / Math.max(width, depth);
  return roof;
}

function createGabledRoof(
  width: number,
  depth: number,
  material: THREE.Material,
  ridgeMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  const pitch = 0.58;
  const panelWidth = width * 0.64;
  [-1, 1].forEach((side) => {
    const panel = box(panelWidth, 0.14, depth * 1.14, material);
    panel.position.set(side * width * 0.24, width * 0.17, 0);
    panel.rotation.z = side * pitch;
    root.add(panel);
  });
  const ridge = cylinder(0.065, 0.065, depth * 1.2, ridgeMaterial, 8);
  ridge.rotation.x = Math.PI / 2;
  ridge.position.y = width * 0.36;
  root.add(ridge);
  return root;
}

type LoftedRectLevel = Readonly<{
  y: number;
  halfWidth: number;
  halfDepth: number;
}>;

function createLoftedRectGeometry(levels: readonly LoftedRectLevel[]) {
  const positions: number[] = [];
  const indices: number[] = [];
  levels.forEach(({ y, halfWidth, halfDepth }) => {
    positions.push(
      -halfWidth, y, -halfDepth,
      halfWidth, y, -halfDepth,
      halfWidth, y, halfDepth,
      -halfWidth, y, halfDepth,
    );
  });
  for (let ring = 0; ring < levels.length - 1; ring += 1) {
    const lower = ring * 4;
    const upper = lower + 4;
    for (let side = 0; side < 4; side += 1) {
      const next = (side + 1) % 4;
      indices.push(lower + side, lower + next, upper + next, lower + side, upper + next, upper + side);
    }
  }
  const top = (levels.length - 1) * 4;
  indices.push(0, 2, 1, 0, 3, 2, top, top + 1, top + 2, top, top + 2, top + 3);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

type SweptMansardPanel = 'front' | 'back' | 'left' | 'right';

function smoothStep01(value: number) {
  const t = THREE.MathUtils.clamp(value, 0, 1);
  return t * t * (3 - 2 * t);
}

function resolveSweptMansardSection(
  bottom: LoftedRectLevel,
  top: LoftedRectLevel,
  tValue: number,
) {
  const t = THREE.MathUtils.clamp(tValue, 0, 1);
  const sweep = smoothStep01(t);
  const height = Math.max(0.001, top.y - bottom.y);
  const sweepDerivative = 6 * t * (1 - t) / height;
  return {
    t,
    y: THREE.MathUtils.lerp(bottom.y, top.y, t),
    halfWidth: THREE.MathUtils.lerp(bottom.halfWidth, top.halfWidth, sweep),
    halfDepth: THREE.MathUtils.lerp(bottom.halfDepth, top.halfDepth, sweep),
    halfWidthDerivative: (top.halfWidth - bottom.halfWidth) * sweepDerivative,
    halfDepthDerivative: (top.halfDepth - bottom.halfDepth) * sweepDerivative,
  };
}

function createSweptMansardPanelGeometry(
  panel: SweptMansardPanel,
  bottom: LoftedRectLevel,
  top: LoftedRectLevel,
  verticalSegments: number,
  spanSegments: number,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const frontBack = panel === 'front' || panel === 'back';
  const outwardSign = panel === 'front' || panel === 'right' ? 1 : -1;

  for (let row = 0; row <= verticalSegments; row += 1) {
    const t = row / verticalSegments;
    const { y, halfWidth, halfDepth } = resolveSweptMansardSection(bottom, top, t);
    for (let column = 0; column <= spanSegments; column += 1) {
      const u = column / spanSegments;
      // A shallow centre camber keeps the large panels alive under moving light while
      // returning exactly to the shared corner seams at u=0/1.
      const camber = Math.sin(Math.PI * u) * Math.sin(Math.PI * t);
      if (frontBack) {
        positions.push(
          THREE.MathUtils.lerp(-halfWidth, halfWidth, u),
          y,
          outwardSign * (halfDepth + camber * 0.052),
        );
      } else {
        positions.push(
          outwardSign * (halfWidth + camber * 0.042),
          y,
          THREE.MathUtils.lerp(-halfDepth, halfDepth, u),
        );
      }
      uvs.push(u, t);
    }
  }

  const rowStride = spanSegments + 1;
  const defaultWinding = panel === 'front' || panel === 'left';
  for (let row = 0; row < verticalSegments; row += 1) {
    for (let column = 0; column < spanSegments; column += 1) {
      const a = row * rowStride + column;
      const b = a + 1;
      const d = (row + 1) * rowStride + column;
      const c = d + 1;
      if (defaultWinding) indices.push(a, b, c, a, c, d);
      else indices.push(a, c, b, a, d, c);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createSweptMansardShell(
  levels: readonly LoftedRectLevel[],
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const shell = new THREE.Group();
  shell.name = 'ISLAND_22_GUILD_HALL_SWEPT_MANSARD_SHELL';
  const bottom = levels[0];
  const top = levels[levels.length - 1];
  const verticalSegments = quality === 'high' ? 28 : quality === 'medium' ? 22 : 16;
  const spanSegments = quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
  (['front', 'right', 'back', 'left'] as const).forEach((panel) => {
    const mesh = new THREE.Mesh(
      createSweptMansardPanelGeometry(panel, bottom, top, verticalSegments, spanSegments),
      material,
    );
    mesh.name = `ISLAND_22_GUILD_HALL_SWEPT_MANSARD_${panel.toUpperCase()}_PANEL`;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    shell.add(mesh);
  });
  return shell;
}

function addSweptMansardCornerRibs(
  root: THREE.Group,
  levels: readonly LoftedRectLevel[],
  material: THREE.Material,
  quality: Island3DQuality,
) {
  const bottom = levels[0];
  const top = levels[levels.length - 1];
  const curveSteps = quality === 'high' ? 15 : quality === 'medium' ? 12 : 9;
  ([-1, 1] as const).forEach((xSign) => {
    ([-1, 1] as const).forEach((zSign) => {
      const points: THREE.Vector3[] = [];
      for (let step = 0; step <= curveSteps; step += 1) {
        const section = resolveSweptMansardSection(bottom, top, step / curveSteps);
        points.push(new THREE.Vector3(
          xSign * (section.halfWidth + 0.042),
          section.y,
          zSign * (section.halfDepth + 0.042),
        ));
      }
      const rib = new THREE.Mesh(
        new THREE.TubeGeometry(
          new THREE.CatmullRomCurve3(points, false, 'centripetal'),
          curveSteps * 2,
          quality === 'low' ? 0.038 : 0.046,
          quality === 'high' ? 7 : 6,
          false,
        ),
        material,
      );
      rib.name = `ISLAND_22_GUILD_HALL_SWEPT_RIB_${xSign > 0 ? 'RIGHT' : 'LEFT'}_${zSign > 0 ? 'FRONT' : 'REAR'}`;
      rib.castShadow = true;
      root.add(rib);
    });
  });
}

function addSweptMansardSlateCourses(
  root: THREE.Group,
  levels: readonly LoftedRectLevel[],
  quality: Island3DQuality,
  slateMaterial: THREE.Material,
  accentMaterial: THREE.Material,
) {
  const bottom = levels[0];
  const top = levels[levels.length - 1];
  const rowCount = quality === 'high' ? 10 : quality === 'medium' ? 8 : 6;
  const slateTransforms: THREE.Matrix4[] = [];
  const accentTransforms: THREE.Matrix4[] = [];
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const euler = new THREE.Euler();

  const addTransform = (cadence: number) => {
    const matrix = new THREE.Matrix4();
    matrix.compose(position, quaternion, scale);
    (cadence % 19 === 0 ? accentTransforms : slateTransforms).push(matrix);
  };

  for (let row = 0; row < rowCount; row += 1) {
    const t = 0.07 + row / Math.max(1, rowCount - 1) * 0.82;
    const section = resolveSweptMansardSection(bottom, top, t);
    const frontTileCount = quality === 'high' ? 19 - row : quality === 'medium' ? 15 - row : 11 - row;
    const frontTileWidth = section.halfWidth * 2 / frontTileCount;
    const frontSlope = Math.atan(section.halfDepthDerivative);
    for (let tile = 0; tile < frontTileCount; tile += 1) {
      const u = (tile + 0.5) / frontTileCount;
      const x = THREE.MathUtils.lerp(-section.halfWidth, section.halfWidth, u);
      const camber = Math.sin(Math.PI * u) * Math.sin(Math.PI * t) * 0.052;
      const cadence = row * 31 + tile * 7;
      const clearsFrontGable = section.y < 3.56 && Math.abs(x) < Math.max(0.38, 1.02 - t * 0.38);
      if (!clearsFrontGable) {
        position.set(x, section.y + (cadence % 3 - 1) * 0.009, section.halfDepth + camber + 0.032);
        quaternion.setFromEuler(euler.set(frontSlope, 0, (cadence % 5 - 2) * 0.008));
        scale.set(frontTileWidth * 0.92, cadence % 13 === 0 ? 0.145 : 0.17, 0.038);
        addTransform(cadence);
      }
      position.set(x, section.y + (cadence % 3 - 1) * 0.009, -section.halfDepth - camber - 0.032);
      quaternion.setFromEuler(euler.set(-frontSlope, 0, -(cadence % 5 - 2) * 0.008));
      scale.set(frontTileWidth * 0.92, cadence % 13 === 0 ? 0.145 : 0.17, 0.038);
      addTransform(cadence + 5);
    }

    const sideTileCount = quality === 'high' ? 13 - Math.floor(row / 2) : quality === 'medium' ? 10 - Math.floor(row / 2) : 7 - Math.floor(row / 2);
    const sideTileDepth = section.halfDepth * 2 / sideTileCount;
    const sideSlope = Math.atan(-section.halfWidthDerivative);
    for (const side of [-1, 1] as const) {
      for (let tile = 0; tile < sideTileCount; tile += 1) {
        const u = (tile + 0.5) / sideTileCount;
        const z = THREE.MathUtils.lerp(-section.halfDepth, section.halfDepth, u);
        const camber = Math.sin(Math.PI * u) * Math.sin(Math.PI * t) * 0.042;
        const cadence = row * 37 + tile * 11 + (side > 0 ? 3 : 9);
        position.set(side * (section.halfWidth + camber + 0.032), section.y + (cadence % 3 - 1) * 0.009, z);
        quaternion.setFromEuler(euler.set(0, 0, side * sideSlope + (cadence % 5 - 2) * 0.007));
        scale.set(0.038, cadence % 17 === 0 ? 0.145 : 0.17, sideTileDepth * 0.92);
        addTransform(cadence);
      }
    }
  }

  const geometry = new THREE.BoxGeometry(1, 1, 1);
  const addInstances = (name: string, material: THREE.Material, transforms: THREE.Matrix4[]) => {
    if (transforms.length === 0) return;
    const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
    mesh.name = name;
    transforms.forEach((transform, index) => mesh.setMatrixAt(index, transform));
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  };
  addInstances('ISLAND_22_GUILD_HALL_SWEPT_SLATE_COURSES', slateMaterial, slateTransforms);
  addInstances('ISLAND_22_GUILD_HALL_SWEPT_SLATE_ACCENTS', accentMaterial, accentTransforms);
}

function createProfileExtrusion(
  profile: readonly (readonly [number, number])[],
  depth: number,
  material: THREE.Material,
  bevelSize = 0,
) {
  const shape = new THREE.Shape();
  profile.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: bevelSize > 0,
    bevelSegments: bevelSize > 0 ? 2 : 0,
    bevelSize,
    bevelThickness: bevelSize * 0.65,
    curveSegments: 3,
  });
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

function createBeamBetween(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
  segments = 7,
) {
  const direction = end.clone().sub(start);
  const beam = cylinder(radius, radius, direction.length(), material, segments);
  beam.position.copy(start).add(end).multiplyScalar(0.5);
  beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return beam;
}

function createArchedPanel(
  width: number,
  height: number,
  depth: number,
  panelMaterial: THREE.Material,
  frameMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  const radius = width / 2;
  const springY = height - radius;
  const profile: Array<readonly [number, number]> = [[-radius, 0], [radius, 0], [radius, springY]];
  for (let step = 0; step <= 8; step += 1) {
    const angle = step * Math.PI / 8;
    profile.push([Math.cos(angle) * radius, springY + Math.sin(angle) * radius]);
  }
  profile.push([-radius, springY]);
  root.add(createProfileExtrusion(profile, depth, panelMaterial, 0.012));

  const left = box(0.07, springY, depth + 0.045, frameMaterial);
  left.position.set(-radius, springY / 2, 0);
  const right = left.clone();
  right.position.x = radius;
  const sill = box(width + 0.1, 0.07, depth + 0.045, frameMaterial);
  sill.position.y = 0;
  root.add(left, right, sill);
  for (let step = 0; step < 8; step += 1) {
    const a = Math.PI - step * Math.PI / 8;
    const b = Math.PI - (step + 1) * Math.PI / 8;
    const start = new THREE.Vector3(Math.cos(a) * radius, springY + Math.sin(a) * radius, 0);
    const end = new THREE.Vector3(Math.cos(b) * radius, springY + Math.sin(b) * radius, 0);
    root.add(createBeamBetween(start, end, 0.045, frameMaterial, 6));
  }
  return root;
}

function addSlateCourseRows(
  root: THREE.Group,
  quality: Island3DQuality,
  material: THREE.Material,
  accentMaterial: THREE.Material,
) {
  const rowCount = quality === 'high' ? 7 : quality === 'medium' ? 6 : 4;
  const tileCount = quality === 'high' ? 21 : quality === 'medium' ? 15 : 9;
  const rows = [
    { y: 2.08, halfWidth: 1.52, z: 1.14 },
    { y: 2.34, halfWidth: 1.43, z: 1.06 },
    { y: 2.62, halfWidth: 1.32, z: 0.98 },
    { y: 2.91, halfWidth: 1.18, z: 0.86 },
    { y: 3.2, halfWidth: 1, z: 0.72 },
    { y: 3.48, halfWidth: 0.83, z: 0.63 },
    { y: 3.73, halfWidth: 0.7, z: 0.55 },
  ].slice(0, rowCount);
  rows.forEach((row, rowIndex) => {
    const usableWidth = row.halfWidth * 2;
    const tileWidth = usableWidth / tileCount;
    for (let tileIndex = 0; tileIndex < tileCount; tileIndex += 1) {
      const offset = rowIndex % 2 === 0 ? 0 : tileWidth * 0.5;
      const x = -row.halfWidth + tileWidth * (tileIndex + 0.5) + offset;
      if (x > row.halfWidth - tileWidth * 0.18) continue;
      const cadence = (tileIndex * 7 + rowIndex * 5) % 5;
      const clearsFrontDormer = row.y >= 2.34 && row.y <= 3.48 && Math.abs(x) < 0.5;
      const tile = box(
        tileWidth * (cadence === 0 ? 0.82 : 0.94),
        cadence === 3 ? 0.105 : 0.082,
        0.028,
        (tileIndex + rowIndex * 3) % 19 === 0 ? accentMaterial : material,
      );
      tile.position.set(
        x,
        row.y + (cadence - 2) * 0.012,
        row.z + 0.03 + (cadence % 2) * 0.009,
      );
      tile.rotation.x = -0.1;
      tile.rotation.z = (cadence - 2) * 0.011;
      if (!clearsFrontDormer) root.add(tile);

      const rearTile = tile.clone();
      rearTile.position.z = -row.z - 0.03 - (cadence % 2) * 0.009;
      rearTile.rotation.x = 0.1;
      rearTile.rotation.z *= -1;
      root.add(rearTile);
    }
  });
}

function addGuildHallSideSlateCourses(
  root: THREE.Group,
  quality: Island3DQuality,
  slateMaterial: THREE.Material,
  accentMaterial: THREE.Material,
) {
  const rowCount = quality === 'high' ? 7 : quality === 'medium' ? 6 : 4;
  const depthCount = quality === 'high' ? 9 : quality === 'medium' ? 7 : 5;
  const slateTransforms: THREE.Matrix4[] = [];
  const accentTransforms: THREE.Matrix4[] = [];
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (const side of [-1, 1]) {
    for (let row = 0; row < rowCount; row += 1) {
      const y = 2.08 + row * 0.285;
      const x = 1.55 - row * 0.145;
      for (let tile = 0; tile < depthCount; tile += 1) {
        const stagger = row % 2 ? 0.11 : 0;
        const z = -0.88 + tile * (1.76 / Math.max(1, depthCount - 1)) + stagger;
        if (z > 0.94) continue;
        const cadence = (row * 5 + tile * 3 + (side > 0 ? 1 : 0)) % 13;
        const matrix = new THREE.Matrix4();
        matrix.compose(
          position.set(side * (x + 0.035), y + (cadence % 3 - 1) * 0.012, z),
          quaternion.setFromEuler(new THREE.Euler(0, 0, side * -0.17)),
          scale.set(1, cadence === 4 ? 0.82 : 1, cadence === 8 ? 0.82 : 1),
        );
        (cadence === 0 ? accentTransforms : slateTransforms).push(matrix);
      }
    }
  }
  const geometry = new THREE.BoxGeometry(0.052, 0.11, 0.22);
  const addInstances = (name: string, material: THREE.Material, transforms: THREE.Matrix4[]) => {
    if (transforms.length === 0) return;
    const instances = new THREE.InstancedMesh(geometry, material, transforms.length);
    instances.name = name;
    transforms.forEach((transform, index) => instances.setMatrixAt(index, transform));
    instances.instanceMatrix.needsUpdate = true;
    instances.castShadow = true;
    instances.receiveShadow = true;
    root.add(instances);
  };
  addInstances('ISLAND_22_GUILD_HALL_SIDE_SLATE_COURSES', slateMaterial, slateTransforms);
  addInstances('ISLAND_22_GUILD_HALL_SIDE_SLATE_ACCENTS', accentMaterial, accentTransforms);
}

function createRopeCoil(material: THREE.Material, quality: Island3DQuality) {
  const coil = new THREE.Group();
  const segments = Math.max(8, qualitySegments(quality));
  [0.16, 0.12, 0.08].forEach((radius, index) => {
    const loop = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.018, 5, segments), material);
    loop.position.z = index * 0.012;
    coil.add(loop);
  });
  return coil;
}

function createSlattedFishCrate(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
) {
  const crate = new THREE.Group();
  const rail = 0.055;
  [-1, 1].forEach((xSide) => [-1, 1].forEach((zSide) => {
    const upright = box(rail, height, rail, material);
    upright.position.set(xSide * width * 0.43, height / 2, zSide * depth * 0.43);
    crate.add(upright);
  }));
  [0.12, 0.26].forEach((y) => {
    const front = box(width, rail, rail, material);
    front.position.set(0, y, depth / 2);
    const rear = front.clone();
    rear.position.z = -depth / 2;
    const left = box(rail, rail, depth, material);
    left.position.set(-width / 2, y, 0);
    const right = left.clone();
    right.position.x = width / 2;
    crate.add(front, rear, left, right);
  });
  const base = box(width * 0.9, rail, depth * 0.9, material);
  base.position.y = rail / 2;
  crate.add(base);
  return crate;
}

function createNetRack(
  material: THREE.Material,
  ropeMaterial: THREE.Material,
) {
  const rack = new THREE.Group();
  [-0.34, 0.34].forEach((x) => {
    const post = box(0.055, 0.72, 0.055, material);
    post.position.set(x, 0.36, 0);
    rack.add(post);
  });
  const crossbar = box(0.78, 0.055, 0.055, material);
  crossbar.position.y = 0.7;
  rack.add(crossbar);
  [-0.22, 0, 0.22].forEach((x) => {
    rack.add(createBeamBetween(
      new THREE.Vector3(x - 0.16, 0.08, 0.025),
      new THREE.Vector3(x + 0.16, 0.66, 0.025),
      0.011,
      ropeMaterial,
      5,
    ));
    rack.add(createBeamBetween(
      new THREE.Vector3(x + 0.16, 0.08, 0.035),
      new THREE.Vector3(x - 0.16, 0.66, 0.035),
      0.011,
      ropeMaterial,
      5,
    ));
  });
  return rack;
}

function createGuildHallPart(partId: string) {
  const part = new THREE.Group();
  part.name = `ISLAND_22_GUILD_HALL_${partId.split('-').join('_').toUpperCase()}`;
  markPart(part, `guild-hall-${partId}`);
  return part;
}

function addFacadeBeam(
  root: THREE.Group,
  start: readonly [number, number],
  end: readonly [number, number],
  z: number,
  material: THREE.Material,
  radius = 0.055,
) {
  root.add(createBeamBetween(
    new THREE.Vector3(start[0], start[1], z),
    new THREE.Vector3(end[0], end[1], z),
    radius,
    material,
  ));
}

function createAuthoredHarborHouse(
  name: string,
  width: number,
  depth: number,
  stories: 1 | 2,
  roofVariant: 'slate' | 'warm',
  materials: Island22FishermansVillageMaterials,
) {
  const root = new THREE.Group();
  root.name = name;
  const bodyHeight = stories === 2 ? 1.72 : 1.18;
  const body = box(width, bodyHeight, depth, materials.plaster);
  body.position.y = bodyHeight / 2;
  root.add(body);

  // Give the cottage a grounded base and a slight upper-storey jetty. The old
  // single cuboid had no readable construction hierarchy at the phone camera.
  const stoneFooting = box(width * 1.045, 0.24, depth * 1.045, materials.stone);
  stoneFooting.position.y = 0.12;
  root.add(stoneFooting);
  if (stories === 2) {
    const upperStorey = box(width * 1.075, 0.76, depth * 1.075, materials.plaster);
    upperStorey.position.y = 1.31;
    root.add(upperStorey);
    const jettyBeam = box(width * 1.12, 0.13, depth * 1.12, materials.timberDark);
    jettyBeam.position.y = 0.93;
    root.add(jettyBeam);
    [-0.38, 0.38].forEach((xFactor) => {
      const corbel = createBeamBetween(
        new THREE.Vector3(xFactor * width, 0.74, depth * 0.49),
        new THREE.Vector3(xFactor * width, 0.98, depth * 0.61),
        0.045,
        materials.timberDark,
        6,
      );
      root.add(corbel);
    });
  }

  const roof = createGabledRoof(
    width * 1.12,
    depth,
    roofVariant === 'warm' ? materials.roofWarm : materials.roof,
    materials.brass,
  );
  roof.position.y = bodyHeight + 0.08;
  const roofWidth = width * 1.12;
  const roofMaterial = roofVariant === 'warm' ? materials.roofWarm : materials.roof;
  [-1, 1].forEach((side) => {
    for (let course = 0; course < 4; course += 1) {
      const strip = box(
        roofWidth * 0.145,
        0.018 + (course % 2) * 0.004,
        depth * 1.08,
        course === 3
          ? materials.brass
          : course === 1
            ? roofVariant === 'warm' ? materials.timberDark : materials.roofWarm
            : roofMaterial,
      );
      strip.position.set(
        side * roofWidth * (0.095 + course * 0.12),
        roofWidth * (0.335 - course * 0.068) + 0.012,
        0,
      );
      strip.rotation.z = side * 0.58;
      roof.add(strip);
    }
  });
  root.add(roof);

  if (stories === 2) {
    const dormerX = width * 0.2;
    const dormerBody = box(width * 0.32, 0.34, 0.28, materials.plaster);
    dormerBody.name = `${name}_PHONE_DORMER_BODY`;
    dormerBody.position.set(dormerX, bodyHeight + roofWidth * 0.19, depth * 0.44);
    const dormerRoof = createGabledRoof(
      width * 0.4,
      0.36,
      roofVariant === 'warm' ? materials.roof : materials.roofWarm,
      materials.brass,
    );
    dormerRoof.name = `${name}_PHONE_DORMER_ROOF`;
    dormerRoof.position.set(dormerX, bodyHeight + roofWidth * 0.34, depth * 0.44);
    const dormerWindow = box(0.18, 0.2, 0.045, materials.window);
    dormerWindow.name = `${name}_PHONE_DORMER_WINDOW`;
    dormerWindow.position.set(dormerX, bodyHeight + roofWidth * 0.22, depth * 0.6);
    root.add(dormerBody, dormerRoof, dormerWindow);
  }

  // The previous roof exposed empty triangular ends, which made several
  // rotated cottages resemble collapsed timber frames. Close both gables with
  // proper wall mass, then layer one phone-readable window and framing system.
  [-1, 1].forEach((zSide) => {
    const gable = createProfileExtrusion(
      [[-roofWidth * 0.5, 0], [roofWidth * 0.5, 0], [0, roofWidth * 0.36]],
      0.09,
      materials.plaster,
      0.006,
    );
    gable.position.set(0, bodyHeight + 0.08, zSide * depth * 0.515);
    root.add(gable);
    const gableWindow = new THREE.Mesh(new THREE.CircleGeometry(0.14, 10), materials.window);
    gableWindow.position.set(0, bodyHeight + roofWidth * 0.17, zSide * (depth * 0.515 + 0.052));
    gableWindow.rotation.y = zSide > 0 ? 0 : Math.PI;
    root.add(gableWindow);
    const gableWindowRim = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.022, 5, 12), materials.timberDark);
    gableWindowRim.position.copy(gableWindow.position);
    gableWindowRim.rotation.y = gableWindow.rotation.y;
    root.add(gableWindowRim);
    const kingPost = box(0.055, roofWidth * 0.31, 0.055, materials.timberDark);
    kingPost.position.set(0, bodyHeight + roofWidth * 0.18, zSide * (depth * 0.515 + 0.058));
    root.add(kingPost);
  });

  // Layer real fascia over the gable silhouette. The former flat roof panels
  // had no readable edge hierarchy at phone scale and looked unfinished.
  [-1, 1].forEach((zSide) => {
    const z = zSide * depth * 0.59;
    const peakY = bodyHeight + roofWidth * 0.36 + 0.08;
    const eaveY = bodyHeight + 0.13;
    root.add(
      createBeamBetween(
        new THREE.Vector3(-roofWidth * 0.54, eaveY, z),
        new THREE.Vector3(0, peakY, z),
        0.045,
        materials.timberDark,
        6,
      ),
      createBeamBetween(
        new THREE.Vector3(0, peakY, z),
        new THREE.Vector3(roofWidth * 0.54, eaveY, z),
        0.045,
        materials.timberDark,
        6,
      ),
    );
  });

  const beamThickness = 0.1;
  [-0.42, 0.42].forEach((side) => {
    const upright = box(beamThickness, bodyHeight * 0.92, depth + 0.08, materials.timberDark);
    upright.position.set(side * width, bodyHeight * 0.5, 0);
    root.add(upright);
  });
  for (let floor = 0; floor < stories; floor += 1) {
    const beam = box(width * 1.04, beamThickness, depth + 0.09, materials.timberDark);
    beam.position.y = 0.18 + floor * 0.78;
    root.add(beam);
    [-0.28, 0.28].forEach((xFactor) => {
      const window = box(0.34, 0.38, 0.065, materials.window);
      const windowX = xFactor * width;
      const windowY = 0.58 + floor * 0.76;
      const windowZ = depth / 2 + 0.04;
      window.position.set(windowX, windowY, windowZ);
      root.add(window);
      const mullion = box(0.035, 0.42, 0.028, materials.timberDark);
      mullion.position.set(windowX, windowY, windowZ + 0.05);
      const transom = box(0.38, 0.035, 0.028, materials.timberDark);
      transom.position.set(windowX, windowY, windowZ + 0.052);
      root.add(mullion, transom);
      if (floor === 0) {
        const planter = box(0.4, 0.09, 0.13, materials.timber);
        planter.position.set(windowX, windowY - 0.25, windowZ + 0.1);
        root.add(planter);
        [-0.11, 0, 0.11].forEach((offset, plantIndex) => {
          const plant = new THREE.Mesh(
            new THREE.SphereGeometry(0.07 + plantIndex % 2 * 0.018, 7, 5),
            plantIndex === 1 ? materials.brass : materials.foliage,
          );
          plant.position.set(windowX + offset, windowY - 0.17, windowZ + 0.11);
          root.add(plant);
        });
      }
    });
    [-0.28, 0.28].forEach((xFactor) => {
      const rearWindow = box(0.3, 0.34, 0.055, materials.window);
      rearWindow.position.set(xFactor * width, 0.58 + floor * 0.76, -depth / 2 - 0.04);
      const rearMullion = box(0.03, 0.38, 0.025, materials.timberDark);
      rearMullion.position.set(rearWindow.position.x, rearWindow.position.y, rearWindow.position.z - 0.045);
      root.add(rearWindow, rearMullion);
    });
    [-1, 1].forEach((side) => {
      [-0.23, 0.23].forEach((zFactor) => {
        const sideFrame = box(0.075, 0.42, 0.38, materials.timberDark);
        sideFrame.position.set(side * (width / 2 + 0.035), 0.58 + floor * 0.76, zFactor * depth);
        const sideWindow = box(0.085, 0.3, 0.26, materials.window);
        sideWindow.position.set(side * (width / 2 + 0.06), 0.58 + floor * 0.76, zFactor * depth);
        root.add(sideFrame, sideWindow);
      });
    });
  }
  root.add(
    createBeamBetween(
      new THREE.Vector3(-width * 0.48, 0.22, depth / 2 + 0.075),
      new THREE.Vector3(-width * 0.08, bodyHeight * 0.88, depth / 2 + 0.075),
      0.035,
      materials.timberDark,
      5,
    ),
    createBeamBetween(
      new THREE.Vector3(width * 0.48, 0.22, depth / 2 + 0.075),
      new THREE.Vector3(width * 0.08, bodyHeight * 0.88, depth / 2 + 0.075),
      0.035,
      materials.timberDark,
      5,
    ),
  );
  const door = createArchedPanel(0.48, 0.84, 0.095, materials.timberDark, materials.brass);
  door.position.set(0, 0.02, depth / 2 + 0.065);
  root.add(door);
  const handle = new THREE.Mesh(new THREE.SphereGeometry(0.035, 6, 5), materials.brass);
  handle.position.set(0.13, 0.4, depth / 2 + 0.13);
  root.add(handle);
  for (let step = 0; step < 2; step += 1) {
    const doorstep = box(0.68 + step * 0.18, 0.1, 0.22, step === 0 ? materials.cobble : materials.stone);
    doorstep.position.set(0, 0.05 + step * 0.08, depth / 2 + 0.2 + step * 0.13);
    root.add(doorstep);
  }
  const chimney = box(0.2, 0.82, 0.2, materials.stone);
  chimney.position.set(width * 0.28, bodyHeight + width * 0.44, -depth * 0.15);
  const chimneyCollar = box(0.29, 0.09, 0.29, materials.brass);
  chimneyCollar.position.set(chimney.position.x, chimney.position.y + 0.32, chimney.position.z);
  const chimneyCap = createRoof(0.34, 0.34, 0.16, materials.roofWarm);
  chimneyCap.position.set(chimney.position.x, chimney.position.y + 0.46, chimney.position.z);
  root.add(chimney, chimneyCollar, chimneyCap);
  [-1, 1].forEach((side) => {
    const gutter = cylinder(0.032, 0.032, depth * 1.18, materials.brass, 6);
    gutter.rotation.x = Math.PI / 2;
    gutter.position.set(side * roofWidth * 0.55, bodyHeight + 0.1, 0);
    root.add(gutter);
  });
  if (stories === 2) {
    const dormerOffset = roofVariant === 'warm' ? -width * 0.16 : width * 0.16;
    const dormerBody = box(0.48, 0.4, 0.38, materials.plaster);
    dormerBody.position.set(dormerOffset, bodyHeight + 0.31, depth * 0.43);
    const dormerRoof = createGabledRoof(0.66, 0.48, roofMaterial, materials.brass);
    dormerRoof.position.set(dormerOffset, bodyHeight + 0.49, depth * 0.43);
    const dormerWindow = box(0.25, 0.23, 0.045, materials.window);
    dormerWindow.position.set(dormerOffset, bodyHeight + 0.34, depth * 0.64);
    root.add(dormerBody, dormerRoof, dormerWindow);
  }

  const serviceCanopy = createGabledRoof(width * 0.54, 0.34, roofMaterial, materials.brass);
  serviceCanopy.position.set(width * 0.22, bodyHeight * 0.52, -depth * 0.58);
  serviceCanopy.scale.set(1, 0.72, 1);
  root.add(serviceCanopy);

  const signBracket = box(0.46, 0.045, 0.045, materials.timberDark);
  signBracket.position.set(-width * 0.28, bodyHeight * 0.77, depth / 2 + 0.23);
  const signPost = box(0.04, 0.3, 0.04, materials.timberDark);
  signPost.position.set(-width * 0.47, bodyHeight * 0.64, depth / 2 + 0.23);
  const fishSign = new THREE.Mesh(new THREE.SphereGeometry(0.15, 8, 5), materials.brass);
  fishSign.name = `${name}_HANGING_FISH_SIGN`;
  fishSign.scale.set(1.45, 0.62, 0.24);
  fishSign.position.set(-width * 0.47, bodyHeight * 0.48, depth / 2 + 0.23);
  const fishTail = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.18, 3), materials.brass);
  fishTail.rotation.z = -Math.PI / 2;
  fishTail.position.set(fishSign.position.x - 0.2, fishSign.position.y, fishSign.position.z);
  root.add(signBracket, signPost, fishSign, fishTail);
  setShadow(root);
  return root;
}

function addWindows(root: THREE.Group, material: THREE.Material, width: number, y: number, depth: number) {
  const front = box(width, 0.42, 0.06, material);
  front.position.set(0, y, depth / 2 + 0.031);
  front.name = `${root.name}_FRONT_WINDOW`;
  const rear = front.clone();
  rear.position.z = -depth / 2 - 0.031;
  rear.name = `${root.name}_REAR_WINDOW`;
  const left = box(0.06, 0.42, width, material);
  left.position.set(-depth / 2 - 0.031, y, 0);
  left.name = `${root.name}_LEFT_WINDOW`;
  const right = left.clone();
  right.position.x = depth / 2 + 0.031;
  right.name = `${root.name}_RIGHT_WINDOW`;
  root.add(front, rear, left, right);
}

function createLighthouse(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_LIGHTHOUSE_LIBRARY';
  const towerHeight = 1.45 + level * 0.58;
  const tower = cylinder(0.5, 0.66, towerHeight, materials.cliff, qualitySegments(quality));
  tower.position.y = towerHeight / 2;
  root.add(tower);
  const masonryBands = level + 2;
  for (let index = 0; index < masonryBands; index += 1) {
    const band = new THREE.Mesh(
      new THREE.TorusGeometry(0.57 - index * 0.018, 0.035, 5, qualitySegments(quality)),
      index % 2 === 0 ? materials.cobble : materials.stone,
    );
    band.rotation.x = Math.PI / 2;
    band.position.y = 0.36 + index * (towerHeight - 0.55) / Math.max(1, masonryBands - 1);
    root.add(band);
  }
  const annexHeight = 0.72 + level * 0.16;
  const annex = box(1.35, annexHeight, 1.1, materials.timber);
  annex.position.set(0.78, annexHeight / 2, 0.18);
  const annexRoof = createRoof(1.6, 1.25, 0.58, materials.roof);
  annexRoof.position.set(0.78, annexHeight + 0.18, 0.18);
  root.add(annex, annexRoof);
  const towerDoor = createArchedPanel(0.42, 0.78, 0.09, materials.timberDark, materials.brass);
  towerDoor.position.set(0, 0.03, 0.61);
  root.add(towerDoor);
  const annexDoor = createArchedPanel(0.34, 0.62, 0.07, materials.timberDark, materials.brass);
  annexDoor.position.set(0.8, 0.02, 0.76);
  root.add(annexDoor);
  if (level >= 2) {
    const gallery = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.07, 6, qualitySegments(quality)), materials.brass);
    gallery.rotation.x = Math.PI / 2;
    gallery.position.y = towerHeight - 0.2;
    const lamp = cylinder(0.42, 0.42, 0.62, materials.window, qualitySegments(quality));
    lamp.position.y = towerHeight + 0.16;
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.5, qualitySegments(quality)), materials.roof);
    cap.position.y = towerHeight + 0.72;
    root.add(gallery, lamp, cap);
    const railCount = quality === 'low' ? 8 : 12;
    for (let index = 0; index < railCount; index += 1) {
      const angle = index / railCount * Math.PI * 2;
      const rail = cylinder(0.022, 0.027, 0.38, materials.brass, 5);
      rail.position.set(Math.cos(angle) * 0.63, towerHeight, Math.sin(angle) * 0.63);
      root.add(rail);
    }
  }
  if (level >= 3) {
    const beacon = new THREE.PointLight(0xffbf68, 2.2, 8, 2);
    beacon.position.y = towerHeight + 0.22;
    root.add(beacon);
  }
  addWindows(root, materials.window, 0.34, 0.8, 1.08);
  return root;
}

export function createIsland22FisherfolkGuildHall(
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  sharedMaterials: Island22FishermansVillageMaterials,
) {
  const guildTimberDark = sharedMaterials.timberDark.clone();
  guildTimberDark.color.set(0x30211c);
  guildTimberDark.roughness = 0.58;
  const guildRoof = sharedMaterials.roof.clone();
  guildRoof.color.set(0x2f444e);
  guildRoof.roughness = 0.64;
  guildRoof.emissiveIntensity = 0.06;
  const guildPlaster = sharedMaterials.plaster.clone();
  guildPlaster.color.set(0x9b744f);
  guildPlaster.roughness = 0.8;
  const guildRoofWarm = sharedMaterials.roofWarm.clone();
  guildRoofWarm.color.set(0x8f4f32);
  guildRoofWarm.emissiveIntensity = 0.05;
  const guildBrass = sharedMaterials.brass.clone();
  guildBrass.color.set(0xd69542);
  guildBrass.roughness = 0.34;
  const materials: Island22FishermansVillageMaterials = {
    ...sharedMaterials,
    timberDark: guildTimberDark,
    roof: guildRoof,
    plaster: guildPlaster,
    roofWarm: guildRoofWarm,
    brass: guildBrass,
  };
  const form = ISLAND_22_GUILD_HALL_FORM;
  const root = new THREE.Group();
  root.name = 'ISLAND_22_FISHERFOLK_GUILD_HALL';

  const apron = createGuildHallPart('coastal-apron');
  const apronMesh = cylinder(form.apron.radiusTop, form.apron.radiusBottom, form.apron.height, materials.stone, qualitySegments(quality));
  apronMesh.scale.z = form.apron.depthScale;
  apronMesh.position.set(0, form.apron.height / 2, 0.12);
  apron.add(apronMesh);
  for (let step = 0; step < 3; step += 1) {
    const stair = box(1.05 + step * 0.28, 0.1, 0.3, materials.cobble);
    stair.position.set(0, 0.16 + step * 0.08, 1.42 - step * 0.22);
    apron.add(stair);
  }
  root.add(apron);

  const shell = createGuildHallPart('occupied-shell');
  const centralBody = box(form.occupiedShell.width, form.occupiedShell.height, form.occupiedShell.depth, materials.plaster);
  centralBody.position.y = form.occupiedShell.centerY;
  const lowerBand = box(3.04, 0.24, 2.08, materials.stone);
  lowerBand.position.y = 0.34;
  shell.add(centralBody, lowerBand);
  root.add(shell);

  const mansard = createGuildHallPart('central-mansard');
  const mansardLevels: LoftedRectLevel[] = level === 1
    ? form.mansard.level1.map((ring) => ({ ...ring }))
    : form.mansard.mature.map((ring) => ({ ...ring }));
  if (level === 1) {
    mansard.add(new THREE.Mesh(createLoftedRectGeometry(mansardLevels), materials.roof));
  } else {
    mansard.add(createSweptMansardShell(mansardLevels, materials.roof, quality));
  }
  const lowerRoofBand = box(3.92, 0.12, 2.82, materials.brass);
  lowerRoofBand.position.y = 1.82;
  mansard.add(lowerRoofBand);
  if (level >= 2) {
    const roofSurfaceDetail = new THREE.Group();
    roofSurfaceDetail.name = 'ISLAND_22_GUILD_HALL_ROOF_SURFACE_DETAIL';
    addSweptMansardCornerRibs(roofSurfaceDetail, mansardLevels, materials.brass, quality);
    addSweptMansardSlateCourses(
      roofSurfaceDetail,
      mansardLevels,
      quality,
      materials.roof,
      materials.roofWarm,
    );
    mansard.add(roofSurfaceDetail);
  }
  root.add(mansard);

  const frontGable = createGuildHallPart('front-gable');
  const frontGableBacking = createProfileExtrusion(
    [[-1.28, 0], [1.28, 0], [0.96, 0.68], [0, 1.96], [-0.96, 0.68]],
    0.22,
    materials.roofWarm,
    0.025,
  );
  frontGableBacking.position.set(0, 1.12, 1.04);
  frontGable.add(frontGableBacking);
  const frontGableMesh = createProfileExtrusion(
    [[-1.1, 0], [1.1, 0], [0.82, 0.58], [0, 1.74], [-0.82, 0.58]],
    0.28,
    materials.plaster,
    0.025,
  );
  frontGableMesh.position.set(0, form.frontGable.baseY, form.frontGable.frontZ);
  frontGable.add(frontGableMesh);
  addFacadeBeam(frontGable, [-1.08, 1.22], [0, 2.9], 1.285, materials.timberDark, 0.07);
  addFacadeBeam(frontGable, [1.08, 1.22], [0, 2.9], 1.285, materials.timberDark, 0.07);
  addFacadeBeam(frontGable, [-1.04, 1.24], [1.04, 1.24], 1.285, materials.timberDark, 0.065);
  root.add(frontGable);

  const entry = createGuildHallPart('entry-depth');
  const pointedEntryBacking = createProfileExtrusion(
    [[-1.08, 0], [1.08, 0], [0.93, 1.2], [0, 2.58], [-0.93, 1.2]],
    0.16,
    materials.stone,
    0.018,
  );
  pointedEntryBacking.position.set(0, 0.23, 1.31);
  entry.add(pointedEntryBacking);
  const portalSurround = createArchedPanel(1.05, 1.42, 0.16, materials.stone, materials.timberDark);
  portalSurround.position.set(0, 0.31, 1.365);
  entry.add(portalSurround);
  const door = createArchedPanel(0.72, 1.16, 0.18, materials.timber, materials.timberDark);
  door.position.set(0, 0.34, 1.46);
  entry.add(door);
  const doorWindow = createArchedPanel(0.42, 0.44, 0.08, materials.window, materials.timberDark);
  doorWindow.position.set(0, 0.88, 1.585);
  const doorWindowMullion = box(0.035, 0.31, 0.035, materials.brass);
  doorWindowMullion.position.set(0, 1.08, 1.635);
  const doorWindowRail = box(0.32, 0.035, 0.035, materials.brass);
  doorWindowRail.position.set(0, 1.05, 1.635);
  entry.add(doorWindow, doorWindowMullion, doorWindowRail);
  const doorKick = box(0.65, 0.48, 0.075, materials.timberDark);
  doorKick.position.set(0, 0.59, 1.565);
  entry.add(doorKick);
  [-0.94, 0.94].forEach((x) => {
    const carvedPier = box(0.18, 1.46, 0.19, materials.stone);
    carvedPier.position.set(x, 0.96, 1.41);
    const pierCap = box(0.25, 0.12, 0.23, materials.brass);
    pierCap.position.set(x, 1.72, 1.42);
    entry.add(carvedPier, pierCap);
  });
  const portalUpperWindow = createArchedPanel(0.62, 0.7, 0.16, materials.window, materials.timberDark);
  portalUpperWindow.position.set(0, 1.5, 1.555);
  const portalUpperMullion = box(0.04, 0.5, 0.04, materials.brass);
  portalUpperMullion.position.set(0, 1.86, 1.67);
  const portalUpperRail = box(0.46, 0.04, 0.04, materials.brass);
  portalUpperRail.position.set(0, 1.8, 1.67);
  entry.add(portalUpperWindow, portalUpperMullion, portalUpperRail);
  const canopy = createProfileExtrusion([[-0.52, 0], [0.52, 0], [0, 0.34]], 0.52, materials.roofWarm, 0.018);
  canopy.position.set(0, 2.16, 1.55);
  entry.add(canopy);
  addFacadeBeam(entry, [-1.04, 0.3], [0, 2.78], 1.51, materials.timber, 0.075);
  addFacadeBeam(entry, [1.04, 0.3], [0, 2.78], 1.51, materials.timber, 0.075);
  addFacadeBeam(entry, [-0.8, 0.48], [0, 2.35], 1.575, materials.brass, 0.045);
  addFacadeBeam(entry, [0.8, 0.48], [0, 2.35], 1.575, materials.brass, 0.045);
  const guildNamePlaque = box(0.88, 0.18, 0.09, materials.timberDark);
  guildNamePlaque.position.set(0, 1.34, 1.61);
  const guildNameMedallion = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.026, 6, 14), materials.brass);
  guildNameMedallion.position.set(0, 1.35, 1.665);
  entry.add(guildNamePlaque, guildNameMedallion);
  root.add(entry);

  const windows = createGuildHallPart('window-apertures');
  [-0.83, 0.83].forEach((x) => {
    const window = createArchedPanel(0.38, 0.58, 0.1, materials.window, materials.timberDark);
    window.position.set(x, 0.88, 1.03);
    windows.add(window);
  });
  if (level >= 2) {
    const dormerSurround = createArchedPanel(0.88, 0.96, 0.12, materials.timberDark, materials.stone);
    dormerSurround.position.set(0, 2.48, 0.92);
    windows.add(dormerSurround);
    const dormerWindow = createArchedPanel(0.62, 0.74, 0.16, materials.window, materials.timberDark);
    dormerWindow.position.set(0, 2.59, 1.015);
    windows.add(dormerWindow);
    const dormerCanopy = createProfileExtrusion([[-0.48, 0], [0.48, 0], [0.14, 0.28], [0, 0.43], [-0.14, 0.28]], 0.34, materials.roofWarm, 0.012);
    dormerCanopy.position.set(0, 3.43, 0.96);
    windows.add(dormerCanopy);
    [-0.13, 0.13].forEach((x) => {
      const mullion = box(0.036, 0.5, 0.07, materials.timberDark);
      mullion.position.set(x, 2.87, 1.11);
      windows.add(mullion);
    });
    const dormerTransom = box(0.58, 0.038, 0.07, materials.timberDark);
    dormerTransom.position.set(0, 2.93, 1.11);
    windows.add(dormerTransom);
    [-0.23, 0, 0.23].forEach((x) => {
      windows.add(createBeamBetween(
        new THREE.Vector3(0, 3.05, 1.115),
        new THREE.Vector3(x, 3.3 - Math.abs(x) * 0.35, 1.115),
        0.018,
        materials.timberDark,
        5,
      ));
    });
  }

  const frontGableWindow = createArchedPanel(0.52, 0.68, 0.12, materials.window, materials.timberDark);
  frontGableWindow.position.set(0, 1.7, 1.43);
  windows.add(frontGableWindow);
  const frontGableCanopy = createProfileExtrusion([[-0.44, 0], [0.44, 0], [0, 0.32]], 0.3, materials.roofWarm, 0.01);
  frontGableCanopy.position.set(0, 2.38, 1.42);
  windows.add(frontGableCanopy);
  const frontGableMullion = box(0.034, 0.46, 0.06, materials.timberDark);
  frontGableMullion.position.set(0, 1.96, 1.52);
  windows.add(frontGableMullion);

  if (level >= 2) {
    const rearRoofDormer = createArchedPanel(0.5, 0.66, 0.12, materials.window, materials.timberDark);
    rearRoofDormer.rotation.y = Math.PI;
    rearRoofDormer.position.set(0.4, 2.63, -0.96);
    windows.add(rearRoofDormer);
    const rearDormerCanopy = createProfileExtrusion([[-0.42, 0], [0.42, 0], [0, 0.34]], 0.32, materials.roofWarm, 0.01);
    rearDormerCanopy.rotation.y = Math.PI;
    rearDormerCanopy.position.set(0.4, 3.27, -0.98);
    windows.add(rearDormerCanopy);
  }
  [-0.9, 0, 0.9].forEach((x) => {
    const rearWindow = createArchedPanel(0.34, 0.5, 0.08, materials.window, materials.timberDark);
    rearWindow.rotation.y = Math.PI;
    rearWindow.position.set(x, 0.88, -1.03);
    windows.add(rearWindow);
  });
  root.add(windows);

  if (level >= 2) {
    const wingRoofs = createGuildHallPart('swept-wing-roofs');
    [-1, 1].forEach((side) => {
      const wingBody = box(form.wing.width, form.wing.bodyHeight, form.wing.depth, materials.timber);
      wingBody.position.set(side * form.wing.centerX, 0.8, 0.03);
      shell.add(wingBody);
      const peakX = side < 0 ? 0.38 : -0.38;
      const wingProfile = [
        [-1.04, 0] as const,
        [-0.94, 0.18] as const,
        [peakX - 0.34, 0.92] as const,
        [peakX, 1.38] as const,
        [peakX + 0.3, 0.9] as const,
        [0.94, 0.18] as const,
        [1.04, 0] as const,
      ];
      const wingRoof = createProfileExtrusion(
        wingProfile,
        2.04,
        materials.roof,
        0.02,
      );
      wingRoof.position.set(side * form.wing.centerX, 1.25, 0.03);
      wingRoofs.add(wingRoof);

      [-1, 1].forEach((frontBack) => {
        const z = 0.03 + frontBack * 1.045;
        for (let pointIndex = 0; pointIndex < wingProfile.length - 1; pointIndex += 1) {
          const start = wingProfile[pointIndex];
          const end = wingProfile[pointIndex + 1];
          wingRoofs.add(createBeamBetween(
            new THREE.Vector3(side * form.wing.centerX + start[0], 1.25 + start[1], z),
            new THREE.Vector3(side * form.wing.centerX + end[0], 1.25 + end[1], z),
            0.032,
            materials.brass,
            6,
          ));
        }
        const outerX = side * (form.wing.centerX + 1.04);
        const curlMid = new THREE.Vector3(outerX + side * 0.18, 1.39, z);
        wingRoofs.add(
          createBeamBetween(new THREE.Vector3(outerX, 1.26, z), curlMid, 0.045, materials.roofWarm, 7),
          createBeamBetween(curlMid, new THREE.Vector3(outerX + side * 0.1, 1.64, z), 0.04, materials.brass, 7),
        );
      });
      const outerEave = box(0.12, 0.13, 2.2, materials.roofWarm);
      outerEave.position.set(side * (form.wing.centerX + 1.02), 1.27, 0.03);
      outerEave.rotation.z = side * -0.15;
      wingRoofs.add(outerEave);

      const ridgeX = side * form.wing.centerX + peakX;
      const ridge = cylinder(0.055, 0.055, 2.18, materials.brass, 8);
      ridge.rotation.x = Math.PI / 2;
      ridge.position.set(ridgeX, 2.63, 0.03);
      wingRoofs.add(ridge);

      [-1.05, 1.05].forEach((z) => {
        const finialStem = cylinder(0.035, 0.045, 0.32, materials.brass, 7);
        finialStem.position.set(ridgeX, 2.76, z);
        const finialTip = new THREE.Mesh(new THREE.ConeGeometry(0.075, 0.18, 7), materials.brass);
        finialTip.position.set(ridgeX, 3, z);
        wingRoofs.add(finialStem, finialTip);
      });
    });
    root.add(wingRoofs);

    const sideGables = createGuildHallPart('side-gables');
    [-1, 1].forEach((side) => {
      const gable = createProfileExtrusion([[-0.64, 0], [0.64, 0], [0, 0.9]], 0.2, materials.plaster, 0.02);
      gable.rotation.y = side * Math.PI / 2;
      gable.position.set(side * 2.18, 1.05, 0.03);
      sideGables.add(gable);
      const sideWindow = createArchedPanel(0.34, 0.52, 0.1, materials.window, materials.timberDark);
      sideWindow.rotation.y = side * Math.PI / 2;
      sideWindow.position.set(side * 2.29, 1.32, 0.03);
      sideGables.add(sideWindow);
    });
    root.add(sideGables);

    const facade = createGuildHallPart('facade-structure');
    [-1.44, -0.49, 0.49, 1.44].forEach((x) => {
      const beam = box(0.09, 1.28, 0.09, materials.timberDark);
      beam.position.set(x, 0.98, 1.02);
      facade.add(beam);
    });
    [0.45, 1.18, 1.58].forEach((y) => {
      const beam = box(3.02, 0.09, 0.09, materials.timberDark);
      beam.position.set(0, y, 1.02);
      facade.add(beam);
    });
    addFacadeBeam(facade, [-1.42, 0.48], [-0.52, 1.14], 1.075, materials.timberDark);
    addFacadeBeam(facade, [1.42, 0.48], [0.52, 1.14], 1.075, materials.timberDark);
    root.add(facade);

    const rear = createGuildHallPart('rear-service-elevation');
    const rearDeck = box(1.76, 0.12, 0.62, materials.timber);
    rearDeck.position.set(-0.28, 0.24, -1.28);
    rear.add(rearDeck);
    for (let step = 0; step < 2; step += 1) {
      const rearStep = box(0.8 + step * 0.22, 0.09, 0.24, materials.cobble);
      rearStep.position.set(-0.32, 0.1 + step * 0.07, -1.58 + step * 0.16);
      rear.add(rearStep);
    }
    const loadingBay = box(1.08, 0.88, 0.12, materials.timberDark);
    loadingBay.position.set(-0.55, 0.68, -1.08);
    rear.add(loadingBay);
    const loadingDoor = box(0.84, 0.68, 0.07, materials.timber);
    loadingDoor.position.set(-0.55, 0.68, -1.16);
    rear.add(loadingDoor);
    addFacadeBeam(rear, [-0.94, 0.37], [-0.17, 0.99], -1.22, materials.timberDark, 0.04);
    addFacadeBeam(rear, [-0.17, 0.37], [-0.94, 0.99], -1.22, materials.timberDark, 0.04);
    const rearAwning = createProfileExtrusion([[-0.72, 0], [0.72, 0], [0, 0.38]], 0.52, materials.roofWarm, 0.015);
    rearAwning.rotation.x = Math.PI;
    rearAwning.position.set(-0.55, 1.2, -1.18);
    rear.add(rearAwning);
    const serviceGable = createProfileExtrusion([[-0.66, 0], [0.66, 0], [0, 0.72]], 0.18, materials.plaster, 0.015);
    serviceGable.position.set(0.68, 1.18, -1.12);
    rear.add(serviceGable);
    addFacadeBeam(rear, [0.03, 1.2], [0.68, 1.88], -1.22, materials.timberDark, 0.05);
    addFacadeBeam(rear, [1.33, 1.2], [0.68, 1.88], -1.22, materials.timberDark, 0.05);
    const serviceWindow = createArchedPanel(0.4, 0.58, 0.1, materials.window, materials.timberDark);
    serviceWindow.rotation.y = Math.PI;
    serviceWindow.position.set(0.68, 1.3, -1.24);
    rear.add(serviceWindow);
    [-1.05, 1.3].forEach((x) => {
      const servicePost = cylinder(0.055, 0.065, 0.72, materials.timberDark, 7);
      servicePost.position.set(x, 0.62, -1.47);
      const serviceLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.window);
      serviceLantern.position.set(x, 1.03, -1.47);
      rear.add(servicePost, serviceLantern);
    });
    root.add(rear);

    const sideOccupation = createGuildHallPart('side-occupation');
    [-1, 1].forEach((side) => {
      const wingOuterX = side * (form.wing.centerX + form.wing.width / 2 + 0.025);
      [-0.5, 0.5].forEach((z) => {
        const wingWindow = createArchedPanel(0.3, 0.48, 0.1, materials.window, materials.timberDark);
        wingWindow.rotation.y = side * Math.PI / 2;
        wingWindow.position.set(wingOuterX, 0.46, z);
        sideOccupation.add(wingWindow);
      });
      [-0.7, 0, 0.7].forEach((z) => {
        const wingPost = box(0.085, 1.04, 0.085, materials.timberDark);
        wingPost.position.set(wingOuterX, 0.66, z);
        sideOccupation.add(wingPost);
      });
      [0.25, 1.12].forEach((y) => {
        const wingRail = box(0.085, 0.09, 1.62, materials.timberDark);
        wingRail.position.set(wingOuterX, y, 0);
        sideOccupation.add(wingRail);
      });
      sideOccupation.add(
        createBeamBetween(
          new THREE.Vector3(wingOuterX, 0.28, -0.65),
          new THREE.Vector3(wingOuterX, 1.06, -0.08),
          0.035,
          materials.timberDark,
          6,
        ),
        createBeamBetween(
          new THREE.Vector3(wingOuterX, 0.28, 0.65),
          new THREE.Vector3(wingOuterX, 1.06, 0.08),
          0.035,
          materials.timberDark,
          6,
        ),
      );
      [-0.48, 0.48].forEach((z) => {
        const sideWindow = createArchedPanel(0.34, 0.54, 0.11, materials.window, materials.timberDark);
        sideWindow.rotation.y = side * Math.PI / 2;
        sideWindow.position.set(side * 1.57, 0.86, z);
        sideOccupation.add(sideWindow);
        const sideMullion = box(0.04, 0.38, 0.035, materials.brass);
        sideMullion.rotation.y = side * Math.PI / 2;
        sideMullion.position.set(side * 1.635, 1.12, z);
        sideOccupation.add(sideMullion);
      });
      sideOccupation.add(
        createBeamBetween(
          new THREE.Vector3(side * 1.64, 0.42, -0.86),
          new THREE.Vector3(side * 1.64, 1.48, 0.86),
          0.045,
          materials.timberDark,
          6,
        ),
        createBeamBetween(
          new THREE.Vector3(side * 1.64, 0.42, 0.86),
          new THREE.Vector3(side * 1.64, 1.48, -0.86),
          0.045,
          materials.timberDark,
          6,
        ),
      );
      const sideGutter = cylinder(0.045, 0.045, 2.28, materials.brass, 8);
      sideGutter.rotation.x = Math.PI / 2;
      sideGutter.position.set(side * 1.68, 1.87, 0);
      sideOccupation.add(sideGutter);
      const downpipe = cylinder(0.035, 0.035, 1.44, materials.brass, 7);
      downpipe.position.set(side * 1.68, 1.13, -1.03);
      sideOccupation.add(downpipe);
    });
    root.add(sideOccupation);
  }

  if (level >= 3) {
    const crown = createGuildHallPart('roof-crown');
    const crownDeck = box(form.crown.width, 0.16, form.crown.depth, materials.timberDark);
    crownDeck.position.y = form.crown.deckY;
    crown.add(crownDeck);
    const crownDrum = box(1.12, 0.3, 0.78, materials.roofWarm);
    crownDrum.position.y = 4.24;
    const crownCap = box(1.38, 0.11, 1, materials.brass);
    crownCap.position.y = 4.44;
    crown.add(crownDrum, crownCap);
    [-0.58, 0.58].forEach((x) => [-0.42, 0.42].forEach((z) => {
      const finial = cylinder(0.035, 0.055, 0.28, materials.brass, 8);
      finial.position.set(x, 4.58, z);
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.2, 8), materials.brass);
      point.position.set(x, 4.81, z);
      crown.add(finial, point);
    }));
    root.add(crown);

    const chimney = createGuildHallPart('chimney');
    const stack = box(0.32, 1.08, 0.38, materials.stone);
    stack.position.set(-1.02, 3.53, -0.22);
    stack.rotation.z = -0.05;
    const cap = box(0.46, 0.14, 0.5, materials.brass);
    cap.position.set(-1.02, 4.1, -0.22);
    chimney.add(stack, cap);
    root.add(chimney);

    const terrace = createGuildHallPart('terrace-silhouette');
    [-1.7, 1.7].forEach((x) => {
      const post = cylinder(0.08, 0.1, 0.82, materials.timberDark, 8);
      post.position.set(x, 0.57, 1.22);
      const lantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.14, 0), materials.window);
      lantern.position.set(x, 1.08, 1.22);
      terrace.add(post, lantern);
    });
    [-1.45, 1.28].forEach((x, index) => {
      const barrel = cylinder(0.2, 0.22, 0.48, materials.timber, 10);
      barrel.position.set(x, 0.44, index === 0 ? 1.18 : 1.28);
      terrace.add(barrel);
    });
    const crate = box(0.42, 0.38, 0.42, materials.timberDark);
    crate.position.set(1.68, 0.37, -0.72);
    crate.rotation.y = 0.24;
    terrace.add(crate);
    [-0.56, 0.56].forEach((x) => {
      const entryLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.window);
      entryLantern.position.set(x, 1.34, 1.5);
      const bracket = createBeamBetween(
        new THREE.Vector3(x, 1.34, 1.35),
        new THREE.Vector3(x, 1.34, 1.5),
        0.025,
        materials.brass,
        6,
      );
      terrace.add(entryLantern, bracket);
    });
    const ropeCoil = createRopeCoil(materials.rope, quality);
    ropeCoil.position.set(1.18, 0.84, 1.51);
    ropeCoil.rotation.z = -0.16;
    terrace.add(ropeCoil);

    const netRack = createNetRack(materials.timberDark, materials.rope);
    netRack.position.set(-1.02, 0.22, 1.49);
    netRack.rotation.y = -0.08;
    terrace.add(netRack);

    const fishCrate = createSlattedFishCrate(0.58, 0.34, 0.42, materials.timberDark);
    fishCrate.position.set(1.2, 0.2, 1.44);
    fishCrate.rotation.y = -0.14;
    terrace.add(fishCrate);
    const stackedCrate = createSlattedFishCrate(0.45, 0.29, 0.36, materials.timber);
    stackedCrate.position.set(1.56, 0.2, 1.12);
    stackedCrate.rotation.y = 0.32;
    terrace.add(stackedCrate);

    [-1, 1].forEach((side) => {
      const basket = cylinder(0.18, 0.14, 0.22, materials.rope, 10);
      basket.position.set(side * 1.48, 0.3, 0.92);
      const basketRim = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 5, 10), materials.timberDark);
      basketRim.rotation.x = Math.PI / 2;
      basketRim.position.set(side * 1.48, 0.42, 0.92);
      terrace.add(basket, basketRim);
    });

    const hangingSign = box(0.48, 0.28, 0.065, materials.timber);
    hangingSign.position.set(-1.34, 1.45, 1.48);
    hangingSign.rotation.z = -0.05;
    const signBracket = createBeamBetween(
      new THREE.Vector3(-1.34, 1.78, 1.35),
      new THREE.Vector3(-1.34, 1.56, 1.48),
      0.025,
      materials.brass,
      6,
    );
    terrace.add(hangingSign, signBracket);

    const guildCrest = new THREE.Group();
    guildCrest.name = 'ISLAND_22_GUILD_HALL_FISH_CREST';
    const crestPlaque = box(0.58, 0.34, 0.07, materials.timberDark);
    crestPlaque.rotation.z = Math.PI / 4;
    crestPlaque.position.z = -0.045;
    const crestBody = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 6), materials.brass);
    crestBody.scale.set(1.35, 0.68, 0.32);
    crestBody.position.z = 0.035;
    const crestTail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.24, 3), materials.brass);
    crestTail.rotation.z = Math.PI / 2;
    crestTail.position.x = -0.26;
    crestTail.position.z = 0.035;
    const crestEye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 7, 5), materials.timberDark);
    crestEye.position.set(0.12, 0.025, 0.095);
    const crestFin = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.14, 3), materials.brass);
    crestFin.position.set(-0.01, 0.11, 0.035);
    crestFin.rotation.z = Math.PI;
    guildCrest.position.set(0, 2.18, 1.58);
    guildCrest.scale.setScalar(1.3);
    guildCrest.add(crestPlaque, crestBody, crestTail, crestEye, crestFin);
    terrace.add(guildCrest);
    const awningStripeCount = quality === 'low' ? 4 : 6;
    [-1, 1].forEach((side) => {
      for (let stripe = 0; stripe < awningStripeCount; stripe += 1) {
        const awningStripe = box(
          0.78 / awningStripeCount,
          0.055,
          0.42,
          stripe % 2 ? materials.plaster : materials.roofWarm,
        );
        awningStripe.position.set(
          side * 1.28 + (stripe - (awningStripeCount - 1) / 2) * 0.78 / awningStripeCount,
          1.28,
          1.47,
        );
        awningStripe.rotation.x = 0.18;
        terrace.add(awningStripe);
      }
    });
    root.add(terrace);

    const rearBalcony = createGuildHallPart('rear-balcony');
    const rearBalconyDeck = box(2.46, 0.12, 0.58, materials.timber);
    rearBalconyDeck.position.set(0, 0.62, -1.48);
    rearBalcony.add(rearBalconyDeck);
    [-1.08, -0.54, 0, 0.54, 1.08].forEach((x) => {
      const post = cylinder(0.032, 0.038, 0.62, materials.brass, 7);
      post.position.set(x, 0.96, -1.7);
      rearBalcony.add(post);
    });
    const rearRail = box(2.32, 0.055, 0.055, materials.brass);
    rearRail.position.set(0, 1.25, -1.7);
    rearBalcony.add(rearRail);
    [-0.82, 0.82].forEach((x) => {
      const rearLanternPost = cylinder(0.045, 0.055, 0.74, materials.timberDark, 7);
      rearLanternPost.position.set(x, 0.98, -1.72);
      const rearLantern = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), materials.window);
      rearLantern.position.set(x, 1.42, -1.72);
      rearBalcony.add(rearLanternPost, rearLantern);
    });
    const rearCrate = createSlattedFishCrate(0.52, 0.32, 0.4, materials.timberDark);
    rearCrate.position.set(-0.64, 0.68, -1.55);
    rearCrate.rotation.y = 0.18;
    const rearBarrel = cylinder(0.18, 0.2, 0.46, materials.timber, 10);
    rearBarrel.position.set(0.72, 0.84, -1.54);
    rearBalcony.add(rearCrate, rearBarrel);
    root.add(rearBalcony);
  }

  const sockets = createGuildHallPart('runtime-sockets');
  sockets.userData.sockets = {
    focus: [0, 1.75, 0],
    entry: [0, 0.25, 1.58],
    build: [0.92, 0.15, 1.36],
  };
  root.add(sockets);
  setShadow(root);
  return root;
}

function createTavern(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_ROUND_LANTERN_TAVERN';
  const height = 1 + level * 0.42;
  const body = cylinder(0.95 + level * 0.08, 1.08 + level * 0.08, height, materials.timber, qualitySegments(quality));
  body.position.y = height / 2;
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1.36 + level * 0.1, 0.85 + level * 0.12, qualitySegments(quality)), materials.roof);
  roof.position.y = height + 0.38;
  root.add(body, roof);
  const ribCount = quality === 'low' ? 8 : 12;
  for (let index = 0; index < ribCount; index += 1) {
    const angle = index / ribCount * Math.PI * 2;
    const radius = 1.02 + level * 0.08;
    const rib = box(0.075, height * 0.9, 0.075, materials.timberDark);
    rib.position.set(Math.cos(angle) * radius, height * 0.48, Math.sin(angle) * radius);
    rib.rotation.y = -angle;
    root.add(rib);
    if (index % 2 === 0) {
      const window = box(0.24, 0.34, 0.055, materials.window);
      window.position.set(Math.cos(angle) * (radius + 0.035), height * 0.58, Math.sin(angle) * (radius + 0.035));
      window.rotation.y = Math.PI / 2 - angle;
      root.add(window);
    }
  }
  const door = createArchedPanel(0.5, 0.86, 0.09, materials.timberDark, materials.brass);
  door.position.set(0, 0.03, 1.08 + level * 0.08);
  root.add(door);
  if (level >= 2) {
    const deck = new THREE.Mesh(new THREE.TorusGeometry(1.1, 0.08, 6, qualitySegments(quality)), materials.brass);
    deck.rotation.x = Math.PI / 2;
    deck.position.y = 0.78;
    root.add(deck);
    const railCount = quality === 'low' ? 8 : 14;
    for (let index = 0; index < railCount; index += 1) {
      const angle = index / railCount * Math.PI * 2;
      const rail = cylinder(0.025, 0.03, 0.38, materials.brass, 5);
      rail.position.set(Math.cos(angle) * 1.12, 0.96, Math.sin(angle) * 1.12);
      root.add(rail);
    }
  }
  const chimney = box(0.26, 0.84 + level * 0.1, 0.26, materials.stone);
  chimney.position.set(-0.48, height + 0.56, -0.2);
  const chimneyCap = box(0.36, 0.1, 0.36, materials.brass);
  chimneyCap.position.set(chimney.position.x, chimney.position.y + 0.45, chimney.position.z);
  root.add(chimney, chimneyCap);
  if (level >= 3) {
    [-0.66, 0.64].forEach((x) => {
      const barrel = cylinder(0.16, 0.19, 0.46, materials.timber, 9);
      barrel.position.set(x, 0.24, 1.05);
      const hoop = new THREE.Mesh(new THREE.TorusGeometry(0.17, 0.018, 5, 10), materials.brass);
      hoop.rotation.x = Math.PI / 2;
      hoop.position.set(x, 0.31, 1.05);
      root.add(barrel, hoop);
    });
  }
  setShadow(root);
  return root;
}

function createShipyard(level: 1 | 2 | 3, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_BOATWRIGHT_HABIT_YARD';
  const shedHeight = 0.7 + level * 0.22;
  const shed = box(1.5 + level * 0.22, shedHeight, 1.25, materials.timberDark);
  shed.position.set(-0.85, shedHeight / 2, 0.35);
  const roof = createRoof(1.9 + level * 0.24, 1.55, 0.68, materials.roof);
  roof.position.set(-0.85, shedHeight + 0.22, 0.35);
  root.add(shed, roof);
  const shedOpening = createArchedPanel(0.84, shedHeight * 0.82, 0.08, materials.timberDark, materials.brass);
  shedOpening.position.set(-0.85, 0.02, 0.99);
  root.add(shedOpening);
  [-1.52, -0.18].forEach((x) => {
    const post = box(0.11, shedHeight + 0.18, 0.12, materials.timber);
    post.position.set(x, (shedHeight + 0.18) / 2, 0.98);
    root.add(post);
  });
  const ribs = 5 + level * 2;
  for (let index = 0; index < ribs; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.055, 5, 10, Math.PI), materials.timber);
    rib.rotation.z = Math.PI;
    rib.rotation.y = Math.PI / 2;
    rib.position.set(0.1 + index * 0.18, 0.72, -0.35);
    root.add(rib);
  }
  const boatKeel = box(0.18, 0.16, 2.15 + level * 0.18, materials.timberDark);
  boatKeel.position.set(0.62, 0.25, -0.34);
  boatKeel.rotation.y = Math.PI / 2;
  root.add(boatKeel);
  const hoist = new THREE.Group();
  const hoistPost = cylinder(0.065, 0.08, 2.25, materials.timberDark, 7);
  hoistPost.position.y = 1.13;
  const hoistArm = box(1.5, 0.12, 0.12, materials.timberDark);
  hoistArm.position.set(0.58, 2.17, 0);
  const pulley = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12), materials.brass);
  pulley.position.set(1.18, 1.98, 0);
  const hoistRope = cylinder(0.018, 0.018, 1.2, materials.rope, 5);
  hoistRope.position.set(1.18, 1.35, 0);
  hoist.add(hoistPost, hoistArm, pulley, hoistRope);
  hoist.position.set(0.15, 0, -0.8);
  root.add(hoist);
  setShadow(root);
  return root;
}

function createNetHouse(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_NET_HOUSE_HATCHERY';
  const houseHeight = 0.72 + level * 0.18;
  const house = box(1.35 + level * 0.15, houseHeight, 1.2, materials.timber);
  house.position.set(0.9, houseHeight / 2, 0.25);
  const roof = createGabledRoof(1.7 + level * 0.15, 1.45, materials.roof, materials.brass);
  roof.position.set(0.9, houseHeight + 0.08, 0.25);
  root.add(house, roof);
  const door = createArchedPanel(0.42, 0.7, 0.08, materials.timberDark, materials.brass);
  door.position.set(0.9, 0.02, 0.89);
  const window = box(0.34, 0.34, 0.06, materials.window);
  window.position.set(1.35, houseHeight * 0.58, 0.88);
  const windowCrossA = box(0.035, 0.39, 0.025, materials.timberDark);
  const windowCrossB = box(0.39, 0.035, 0.025, materials.timberDark);
  windowCrossA.position.set(1.35, houseHeight * 0.58, 0.93);
  windowCrossB.position.copy(windowCrossA.position);
  root.add(door, window, windowCrossA, windowCrossB);
  const netRibs = 4 + Math.round(level * qualityScale(quality) * 2);
  for (let index = 0; index < netRibs; index += 1) {
    const rib = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.035, 5, 12, Math.PI), materials.rope);
    rib.rotation.z = Math.PI;
    rib.rotation.y = Math.PI / 2;
    rib.position.set(-1 + index * (1.4 / Math.max(1, netRibs - 1)), 0.58, -0.15);
    root.add(rib);
  }
  const netLines = level * 3 + (quality === 'high' ? 3 : 0);
  for (let index = 0; index < netLines; index += 1) {
    const line = createBeamBetween(
      new THREE.Vector3(-1.02 + index * 1.9 / Math.max(1, netLines - 1), 0.18, -0.15),
      new THREE.Vector3(-1.02 + index * 1.9 / Math.max(1, netLines - 1), 1.15, -0.15),
      0.012,
      materials.rope,
      5,
    );
    root.add(line);
    if (index % 2 === 0) {
      const float = new THREE.Mesh(new THREE.SphereGeometry(0.065, 7, 5), index % 4 === 0 ? materials.brass : materials.window);
      float.position.set(-1.02 + index * 1.9 / Math.max(1, netLines - 1), 0.95, -0.15);
      root.add(float);
    }
  }
  setShadow(root);
  return root;
}

const ISLAND_22_LANDMARK_POSITIONS: Record<Island5LandmarkDefinition['id'], readonly [number, number, number]> = {
  wisdom: [-6.35, 0.38, -5.75],
  boss: [6.25, 1.3, -6.25],
  event: [7.45, 0.38, 2.15],
  hatchery: [5.75, 0.35, 6.2],
  habit: [-5.95, 0.35, 6.1],
};

export function buildIsland22FishermansVillageLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const root = new THREE.Group();
  root.name = `ISLAND_22_${definition.id.toUpperCase()}_LANDMARK_ROOT`;
  const foundation = cylinder(definition.id === 'boss' ? 2.35 : 1.72, definition.id === 'boss' ? 2.55 : 1.9, 0.34, materials.terrace, qualitySegments(quality));
  foundation.position.y = 0.17;
  if (definition.id === 'boss') {
    // The approved source stages the Guild Hall as a monumental northern
    // precinct above the smaller harbor venues. Raise the complete locked
    // assembly on real support terrain so its portal and roof remain separate
    // from the round tavern in the canonical phone overview.
    const guildMesa = cylinder(2.58, 2.92, 1.16, materials.stone, qualitySegments(quality));
    guildMesa.name = 'ISLAND_22_GUILD_HALL_RAISED_STONE_PRECINCT';
    guildMesa.position.y = -0.58;
    const guildMesaLip = new THREE.Mesh(
      new THREE.TorusGeometry(2.48, 0.11, 6, qualitySegments(quality)),
      materials.cobble,
    );
    guildMesaLip.name = 'ISLAND_22_GUILD_HALL_PRECINCT_COBBLE_LIP';
    guildMesaLip.rotation.x = Math.PI / 2;
    guildMesaLip.position.y = 0.02;
    root.add(guildMesa, guildMesaLip);
    for (let step = 0; step < 5; step += 1) {
      const guildStep = box(1.28 + step * 0.16, 0.16, 0.48, materials.cobble);
      guildStep.name = `ISLAND_22_GUILD_HALL_PRECINCT_STEP_${step + 1}`;
      guildStep.position.set(0, -0.32 + step * 0.13, 2.35 + step * 0.28);
      root.add(guildStep);
    }
  }
  root.add(foundation);
  if (level > 0) {
    const builtLevel = Math.max(1, level) as 1 | 2 | 3;
    const premiumFactory = definition.id === 'boss'
      ? null
      : ISLAND_22_PREMIUM_LANDMARK_FACTORIES[definition.id];
    const architecture = premiumFactory
      ? premiumFactory({ level: builtLevel, quality, materials })
      : createIsland22FisherfolkGuildHall(builtLevel, quality, materials);
    architecture.position.y = 0.3;
    if (definition.id === 'event') architecture.scale.setScalar(0.72);
    root.add(architecture);
  }
  root.position.set(...ISLAND_22_LANDMARK_POSITIONS[definition.id]);
  root.rotation.y = Math.atan2(-root.position.x, -root.position.z);
  root.userData.landmarkId = definition.id;
  root.userData.buildLevel = level;
  root.userData.slice = 'slice-01-macro-composition';
  markPart(root, `${definition.id}-landmark`, { focus: `ISLAND_22_${definition.id.toUpperCase()}_FOCUS_SOCKET` });
  setShadow(root);
  return root;
}

function createDock(name: string, x: number, z: number, rotation: number, length: number, materials: Island22FishermansVillageMaterials) {
  const root = new THREE.Group();
  root.name = name;
  root.position.set(x, -0.15, z);
  root.rotation.y = rotation;
  const underDeck = box(0.92, 0.1, length, materials.timberDark);
  underDeck.name = `${name}_DARK_WET_UNDERFRAME`;
  underDeck.position.y = 0.35;
  root.add(underDeck);

  const plankCount = Math.max(7, Math.round(length / 0.36));
  const plankStep = length / plankCount;
  const planks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.12, 0.14, plankStep * 0.84),
    materials.timber,
    plankCount,
  );
  planks.name = `${name}_INDIVIDUAL_WEATHERED_PLANKS`;
  const pegs = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.022, 0.026, 0.035, 6),
    materials.timberDark,
    plankCount * 2,
  );
  pegs.name = `${name}_HAND_DRIVEN_DARK_PEGS`;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const plankPalette = [
    new THREE.Color(0xfff1d4),
    new THREE.Color(0xe8cfaa),
    new THREE.Color(0xd7b487),
    new THREE.Color(0xf4ddba),
  ];
  for (let index = 0; index < plankCount; index += 1) {
    const zPosition = -length / 2 + plankStep * (index + 0.5);
    matrix.compose(
      position.set((index % 3 - 1) * 0.018, 0.45 + index % 2 * 0.012, zPosition),
      quaternion.setFromEuler(new THREE.Euler(0, (index % 5 - 2) * 0.008, (index % 3 - 1) * 0.006)),
      scale.set(1 - index % 4 * 0.018, 1, 1),
    );
    planks.setMatrixAt(index, matrix);
    planks.setColorAt(index, plankPalette[index % plankPalette.length]);
    [-0.42, 0.42].forEach((pegX, pegIndex) => {
      matrix.compose(
        position.set(pegX, 0.538 + index % 2 * 0.012, zPosition),
        quaternion.identity(),
        scale.setScalar(1),
      );
      pegs.setMatrixAt(index * 2 + pegIndex, matrix);
    });
  }
  planks.instanceMatrix.needsUpdate = true;
  if (planks.instanceColor) planks.instanceColor.needsUpdate = true;
  pegs.instanceMatrix.needsUpdate = true;
  root.add(planks, pegs);
  [-0.45, 0.45].forEach((side) => {
    for (let index = 0; index < 4; index += 1) {
      const pile = cylinder(0.075, 0.095, 1.3, materials.timberDark, 8);
      pile.name = `${name}_DARK_WET_LOAD_PILE_${side > 0 ? 'R' : 'L'}_${index + 1}`;
      pile.position.set(side, -0.05, -length / 2 + 0.45 + index * ((length - 0.9) / 3));
      root.add(pile);
    }
  });
  setShadow(root, false);
  return root;
}

function createBoat(materials: Island22FishermansVillageMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  const hull = new THREE.Mesh(new THREE.SphereGeometry(0.62, qualitySegments(quality), 7, 0, Math.PI * 2, 0, Math.PI / 2), materials.timberDark);
  hull.scale.set(0.75, 0.42, 1.45);
  hull.rotation.x = Math.PI;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.58, 0.055, 5, qualitySegments(quality)), materials.timber);
  rim.rotation.x = Math.PI / 2;
  rim.scale.z = 1.45;
  const keelFloor = box(0.48, 0.06, 1.08, materials.timber);
  keelFloor.position.y = 0.04;
  root.add(hull, rim, keelFloor);
  [-0.34, 0, 0.34].forEach((z, index) => {
    const seat = box(0.82, 0.07, 0.16, index === 1 ? materials.timberDark : materials.timber);
    seat.position.set(0, 0.2, z);
    root.add(seat);
  });
  const bowPost = cylinder(0.035, 0.045, 0.62, materials.brass, 6);
  bowPost.position.set(0, 0.3, -0.78);
  const sternPost = bowPost.clone();
  sternPost.position.z = 0.78;
  root.add(bowPost, sternPost);
  const portOar = createBeamBetween(
    new THREE.Vector3(-0.1, 0.26, -0.1),
    new THREE.Vector3(-0.92, 0.12, 0.42),
    0.025,
    materials.rope,
    6,
  );
  const starboardOar = createBeamBetween(
    new THREE.Vector3(0.1, 0.26, 0.06),
    new THREE.Vector3(0.92, 0.12, -0.46),
    0.025,
    materials.rope,
    6,
  );
  const portBlade = box(0.16, 0.035, 0.34, materials.timber);
  portBlade.position.set(-0.96, 0.1, 0.46);
  portBlade.rotation.y = 0.4;
  const starboardBlade = portBlade.clone();
  starboardBlade.position.set(0.96, 0.1, -0.5);
  root.add(portOar, starboardOar, portBlade, starboardBlade);
  return root;
}

const ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS = [
  [-3.75, -7.05, 0.12, 1.02, 2], [-1.35, -7.35, -0.06, 0.88, 1], [1.35, -7.3, -0.08, 0.9, 2],
  [4.0, -6.72, -0.32, 0.88, 1], [7.0, -3.3, -1.22, 0.92, 2], [7.18, 2.7, -1.82, 0.88, 1],
  [4.05, 6.8, -2.78, 0.9, 2], [1.35, 7.2, -3.02, 0.82, 1], [-1.65, 7.18, 3.02, 0.86, 2],
  [-4.2, 6.6, 2.66, 0.9, 1], [-7.05, 3.35, 1.88, 0.86, 2], [-7.2, -1.9, 1.32, 0.88, 1],
] as const;

function addOccupiedVillageSideWindows(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const placements: ReadonlyArray<readonly [number, number, number, number, 1 | 2]> = quality === 'low'
    ? ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS.slice(0, 8)
    : ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS;
  const windowCount = placements.reduce((total, placement) => total + placement[4] * 2, 0);
  const frames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.075, 0.45, 0.4),
    materials.timberDark,
    windowCount,
  );
  frames.name = 'ISLAND_22_OCCUPIED_VILLAGE_SIDE_WINDOW_FRAMES';
  const panes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.085, 0.31, 0.27),
    materials.window,
    windowCount,
  );
  panes.name = 'ISLAND_22_OCCUPIED_VILLAGE_SIDE_WINDOW_PANES';
  const elevationFrames = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.4, 0.45, 0.075),
    materials.timberDark,
    windowCount,
  );
  elevationFrames.name = 'ISLAND_22_OCCUPIED_VILLAGE_ELEVATION_WINDOW_FRAMES';
  const elevationPanes = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.27, 0.31, 0.085),
    materials.window,
    windowCount,
  );
  elevationPanes.name = 'ISLAND_22_OCCUPIED_VILLAGE_ELEVATION_WINDOW_PANES';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  let instance = 0;
  let elevationInstance = 0;
  placements.forEach(([x, z, yaw, size, stories]) => {
    const width = (stories === 2 ? 1.55 : 1.42) * size;
    const depth = 1.22 * size;
    for (let floor = 0; floor < stories; floor += 1) {
      const y = 0.57 + (instance % 3) * 0.012 + (0.58 + floor * 0.76) * size;
      [-1, 1].forEach((side) => {
        const localX = side * (width / 2 + 0.045 * size);
        const worldX = x + Math.cos(yaw) * localX;
        const worldZ = z - Math.sin(yaw) * localX;
        matrix.compose(
          position.set(worldX, y, worldZ),
          quaternion.setFromEuler(new THREE.Euler(0, yaw, 0)),
          scale.setScalar(size),
        );
        frames.setMatrixAt(instance, matrix);
        matrix.compose(
          position.set(
            worldX + Math.cos(yaw) * side * 0.018,
            y,
            worldZ - Math.sin(yaw) * side * 0.018,
          ),
          quaternion.setFromEuler(new THREE.Euler(0, yaw, 0)),
          scale.setScalar(size),
        );
        panes.setMatrixAt(instance, matrix);
        instance += 1;
      });
      [-1, 1].forEach((side) => {
        const localX = (floor % 2 === 0 ? 0.22 : -0.22) * width;
        const localZ = side * (depth / 2 + 0.045 * size);
        const worldX = x + Math.cos(yaw) * localX + Math.sin(yaw) * localZ;
        const worldZ = z - Math.sin(yaw) * localX + Math.cos(yaw) * localZ;
        matrix.compose(
          position.set(worldX, y, worldZ),
          quaternion.setFromEuler(new THREE.Euler(0, yaw, 0)),
          scale.setScalar(size),
        );
        elevationFrames.setMatrixAt(elevationInstance, matrix);
        matrix.compose(
          position.set(
            worldX + Math.sin(yaw) * side * 0.018,
            y,
            worldZ + Math.cos(yaw) * side * 0.018,
          ),
          quaternion.setFromEuler(new THREE.Euler(0, yaw, 0)),
          scale.setScalar(size),
        );
        elevationPanes.setMatrixAt(elevationInstance, matrix);
        elevationInstance += 1;
      });
    }
  });
  [frames, panes, elevationFrames, elevationPanes].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
  });
  frames.castShadow = true;
  panes.castShadow = false;
  elevationFrames.castShadow = true;
  elevationPanes.castShadow = false;
  root.add(frames, panes, elevationFrames, elevationPanes);
}

function addAuthoredVillageClusters(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const villageRoot = new THREE.Group();
  villageRoot.name = 'ISLAND_22_AUTHORED_HARBOR_VILLAGE';
  const count = quality === 'low' ? 8 : ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS.length;
  ISLAND_22_AUTHORED_CLUSTER_PLACEMENTS.slice(0, count).forEach(([x, z, yaw, size, stories], index) => {
    const cluster = new THREE.Group();
    cluster.name = `ISLAND_22_AUTHORED_HARBOR_CLUSTER_${index + 1}`;
    cluster.position.set(x, 0.57 + (index % 3) * 0.08, z);
    cluster.rotation.y = yaw;
    cluster.scale.setScalar(size);

    const plinth = cylinder(1.12, 1.28, 0.32, materials.stone, 10);
    plinth.position.y = -0.13;
    plinth.scale.z = 0.76;
    cluster.add(plinth);

    const mainHouse = createAuthoredHarborHouse(
      `${cluster.name}_MAIN_HOUSE`,
      stories === 2 ? 1.55 : 1.42,
      1.22,
      stories as 1 | 2,
      index % 3 === 0 ? 'warm' : 'slate',
      materials,
    );
    cluster.add(mainHouse);

    if (quality !== 'low' && index % 2 === 0) {
      const annex = createAuthoredHarborHouse(
        `${cluster.name}_ANNEX`,
        0.92,
        0.82,
        1,
        index % 4 === 0 ? 'slate' : 'warm',
        materials,
      );
      annex.position.set(index % 4 === 0 ? 1.05 : -1.02, 0.03, 0.18);
      annex.rotation.y = index % 4 === 0 ? -0.2 : 0.18;
      cluster.add(annex);
    }
    if (index % 2 === 0) {
      const barrel = cylinder(0.13, 0.15, 0.34, materials.timber, 8);
      barrel.name = `${cluster.name}_OCCUPIED_BARREL`;
      barrel.position.set(-0.9, 0.18, 0.76);
      const barrelBand = new THREE.Mesh(new THREE.TorusGeometry(0.145, 0.018, 4, 8), materials.brass);
      barrelBand.name = `${cluster.name}_OCCUPIED_BARREL_BAND`;
      barrelBand.rotation.x = Math.PI / 2;
      barrelBand.position.set(-0.9, 0.22, 0.76);
      cluster.add(barrel, barrelBand);
    } else {
      const crate = box(0.34, 0.28, 0.3, materials.timber);
      crate.name = `${cluster.name}_OCCUPIED_CRATE`;
      crate.position.set(0.92, 0.14, 0.72);
      const crateBrace = box(0.035, 0.32, 0.32, materials.timberDark);
      crateBrace.name = `${cluster.name}_OCCUPIED_CRATE_BRACE`;
      crateBrace.position.copy(crate.position);
      crateBrace.rotation.z = 0.66;
      cluster.add(crate, crateBrace);
    }
    villageRoot.add(cluster);
  });
  compactStaticGeometry(villageRoot, 'ISLAND_22_AUTHORED_HARBOR_VILLAGE');
  root.add(villageRoot);
  addOccupiedVillageSideWindows(root, quality, materials);
}

function addCozyHarborGroundDressing(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const dressingCount = quality === 'low' ? 18 : 30;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const cobbles = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.2, 0),
    materials.cobble,
    dressingCount,
  );
  cobbles.name = 'ISLAND_22_IRREGULAR_HARBOR_COBBLE_CLUSTERS';
  const shrubMaterial = materials.foliage.clone();
  shrubMaterial.name = 'ISLAND_22_HARBOR_SHRUB_INSTANCE_PALETTE_BASE';
  shrubMaterial.color.set(0xffffff);
  const shrubs = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.19, 0),
    shrubMaterial,
    dressingCount,
  );
  shrubs.name = 'ISLAND_22_COZY_HARBOR_SHRUBS';
  const foliagePalette = [
    new THREE.Color(0x2f5d45),
    new THREE.Color(0x4e744f),
    new THREE.Color(0x718a58),
  ];
  const flowers = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.055, 0),
    materials.brass,
    dressingCount * 2,
  );
  flowers.name = 'ISLAND_22_HARBOR_WINDOW_GARDEN_FLOWERS';
  for (let index = 0; index < dressingCount; index += 1) {
    const angle = index / dressingCount * Math.PI * 2 + 0.08 + (index % 3 - 1) * 0.035;
    const radius = 6.25 + index % 4 * 0.31;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 1.035;
    matrix.compose(
      position.set(x, 0.72 + (index % 2) * 0.025, z),
      quaternion.setFromEuler(new THREE.Euler(
        (index % 3 - 1) * 0.16,
        -angle + index % 4 * 0.18,
        (index % 5 - 2) * 0.08,
      )),
      scale.set(1.1 + index % 3 * 0.16, 0.34 + index % 2 * 0.08, 0.75 + index % 4 * 0.1),
    );
    cobbles.setMatrixAt(index, matrix);
    const shrubRadius = radius + (index % 2 ? 0.34 : -0.28);
    const shrubX = Math.cos(angle + 0.045) * shrubRadius;
    const shrubZ = Math.sin(angle + 0.045) * shrubRadius * 1.035;
    matrix.compose(
      position.set(shrubX, 0.88, shrubZ),
      quaternion.setFromEuler(new THREE.Euler(0, angle, 0)),
      scale.set(0.72 + index % 4 * 0.11, 0.58 + index % 3 * 0.12, 0.72 + index % 2 * 0.12),
    );
    shrubs.setMatrixAt(index, matrix);
    shrubs.setColorAt(index, foliagePalette[index % foliagePalette.length]);
    [-1, 1].forEach((side, flowerIndex) => {
      matrix.compose(
        position.set(
          shrubX + Math.cos(angle + Math.PI / 2) * side * 0.09,
          1.02 + flowerIndex * 0.06,
          shrubZ + Math.sin(angle + Math.PI / 2) * side * 0.09,
        ),
        quaternion.identity(),
        scale.setScalar(0.85 + index % 3 * 0.12),
      );
      flowers.setMatrixAt(index * 2 + flowerIndex, matrix);
    });
  }
  [cobbles, shrubs, flowers].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
  if (shrubs.instanceColor) shrubs.instanceColor.needsUpdate = true;

  // A few individually readable racks create fishing-village ground stories
  // without forming another repeated ring or entering the board corridor.
  const rackPlacements = [
    [-6.75, 5.0, 0.55],
    [5.45, 5.85, -0.35],
    [-5.8, -5.8, 2.55],
  ] as const;
  rackPlacements.slice(0, quality === 'low' ? 2 : 3).forEach(([x, z, yaw], index) => {
    const rack = createNetRack(materials.timberDark, materials.rope);
    rack.name = `ISLAND_22_HARBOR_DRYING_RACK_${index + 1}`;
    rack.position.set(x, 0.72, z);
    rack.rotation.y = yaw;
    rack.scale.setScalar(0.72);
    root.add(rack);
  });
}

function addSteppedHarborTerraces(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  const segmentCount = quality === 'low' ? 18 : 30;
  const retaining = new THREE.InstancedMesh(
    new THREE.BoxGeometry(1.18, 0.5, 0.62),
    materials.stone,
    segmentCount,
  );
  retaining.name = 'ISLAND_22_STEPPED_STONE_RETAINING_RING';
  const upperWalk = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.92, 0.12, 0.58),
    materials.cobble,
    segmentCount,
  );
  upperWalk.name = 'ISLAND_22_INTERLOCKING_COBBLE_BOARDWALK';
  for (let index = 0; index < segmentCount; index += 1) {
    const angle = index / segmentCount * Math.PI * 2 + 0.05;
    const radius = 5.18 + (index % 5 === 0 ? 0.12 : 0);
    quaternion.setFromEuler(new THREE.Euler(0, -angle, 0));
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.64 + (index % 3) * 0.035, Math.sin(angle) * radius * 1.03),
      quaternion,
      scale,
    );
    retaining.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(Math.cos(angle) * 4.7, 0.91, Math.sin(angle) * 4.7),
      quaternion,
      scale,
    );
    upperWalk.setMatrixAt(index, matrix);
  }
  retaining.instanceMatrix.needsUpdate = true;
  upperWalk.instanceMatrix.needsUpdate = true;
  retaining.receiveShadow = true;
  upperWalk.receiveShadow = true;
  root.add(retaining, upperWalk);

  const stairAngles = [-2.7, -1.98, -0.92, 0.22, 1.02, 2.2];
  const stepsPerStair = quality === 'low' ? 3 : 5;
  const stairSteps = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.88, 0.14, 0.42),
    materials.cobble,
    stairAngles.length * stepsPerStair,
  );
  stairSteps.name = 'ISLAND_22_RADIAL_STONE_STAIRS';
  let stairIndex = 0;
  stairAngles.forEach((angle) => {
    for (let step = 0; step < stepsPerStair; step += 1) {
      const radius = 4.55 + step * 0.3;
      matrix.compose(
        position.set(Math.cos(angle) * radius, 0.86 + step * 0.055, Math.sin(angle) * radius),
        quaternion.setFromEuler(new THREE.Euler(0, -angle + Math.PI / 2, 0)),
        scale,
      );
      stairSteps.setMatrixAt(stairIndex, matrix);
      stairIndex += 1;
    }
  });
  stairSteps.instanceMatrix.needsUpdate = true;
  stairSteps.receiveShadow = true;
  root.add(stairSteps);

  // An irregular outer masonry face breaks the formerly smooth stacked-disc
  // silhouette without touching the canonical route or collision surface.
  const faceCount = quality === 'low' ? 26 : 42;
  const faceBlocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.36, 0),
    materials.stone,
    faceCount,
  );
  faceBlocks.name = 'ISLAND_22_HAND_LAID_TERRACE_FACE';
  for (let index = 0; index < faceCount; index += 1) {
    const angle = index / faceCount * Math.PI * 2 + 0.025;
    const radius = 7.72 + (index % 4) * 0.055;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.29 + (index % 2) * 0.08, Math.sin(angle) * radius * 1.06),
      quaternion.setFromEuler(new THREE.Euler(
        (index % 3 - 1) * 0.09,
        -angle,
        (index % 5 - 2) * 0.035,
      )),
      scale.set(1.3 + index % 3 * 0.16, 0.68 + index % 4 * 0.08, 0.58),
    );
    faceBlocks.setMatrixAt(index, matrix);
  }
  faceBlocks.instanceMatrix.needsUpdate = true;
  faceBlocks.castShadow = true;
  faceBlocks.receiveShadow = true;
  root.add(faceBlocks);
}

function addVillageLanternRing(root: THREE.Group, materials: Island22FishermansVillageMaterials) {
  const lanternCount = 14;
  const posts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.032, 0.055, 1, 7), materials.timberDark, lanternCount);
  posts.name = 'ISLAND_22_VILLAGE_LANTERN_POSTS';
  const brackets = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.025, 0.025, 0.42, 6), materials.brass, lanternCount);
  brackets.name = 'ISLAND_22_VILLAGE_LANTERN_BRACKETS';
  const lamps = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.095, 0.13, 0.24, 6), materials.window, lanternCount);
  lamps.name = 'ISLAND_22_WARM_CAGED_VILLAGE_LANTERNS';
  const lampCaps = new THREE.InstancedMesh(new THREE.ConeGeometry(0.145, 0.1, 6), materials.brass, lanternCount * 2);
  lampCaps.name = 'ISLAND_22_VILLAGE_LANTERN_CAPS';
  const lampCages = new THREE.InstancedMesh(new THREE.TorusGeometry(0.118, 0.014, 4, 8), materials.brass, lanternCount * 2);
  lampCages.name = 'ISLAND_22_VILLAGE_LANTERN_CAGES';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  for (let index = 0; index < lanternCount; index += 1) {
    const angle = index / lanternCount * Math.PI * 2 + 0.11;
    const radius = 5.15;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = 0.88 + index % 4 * 0.045;
    const inwardX = -Math.cos(angle);
    const inwardZ = -Math.sin(angle);
    matrix.compose(position.set(x, 0.78 + height / 2, z), quaternion.identity(), scale.set(1, height, 1));
    posts.setMatrixAt(index, matrix);

    matrix.compose(
      position.set(x + inwardX * 0.18, 0.79 + height, z + inwardZ * 0.18),
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, angle)),
      scale.set(1, 1, 1),
    );
    brackets.setMatrixAt(index, matrix);

    const lampX = x + inwardX * 0.38;
    const lampZ = z + inwardZ * 0.38;
    const lampY = 0.68 + height;
    matrix.compose(position.set(lampX, lampY, lampZ), quaternion.identity(), scale.setScalar(1));
    lamps.setMatrixAt(index, matrix);

    matrix.compose(position.set(lampX, lampY + 0.17, lampZ), quaternion.identity(), scale.setScalar(1));
    lampCaps.setMatrixAt(index * 2, matrix);
    matrix.compose(
      position.set(lampX, lampY - 0.17, lampZ),
      quaternion.setFromEuler(new THREE.Euler(0, 0, Math.PI)),
      scale.setScalar(0.86),
    );
    lampCaps.setMatrixAt(index * 2 + 1, matrix);

    matrix.compose(
      position.set(lampX, lampY + 0.105, lampZ),
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      scale.setScalar(1),
    );
    lampCages.setMatrixAt(index * 2, matrix);
    matrix.compose(
      position.set(lampX, lampY - 0.105, lampZ),
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      scale.setScalar(0.86),
    );
    lampCages.setMatrixAt(index * 2 + 1, matrix);
  }
  [posts, brackets, lamps, lampCaps, lampCages].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    root.add(mesh);
  });
}

function addFisherCrowd(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const fisherCount = quality === 'low' ? 7 : quality === 'medium' ? 11 : 15;
  const crowdCoatMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.78 });
  const crowdSkinMaterial = new THREE.MeshStandardMaterial({ color: 0xe3a271, roughness: 0.82 });
  const crowdHatMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.74 });
  const bodies = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.115, 0.17, 0.46, 8), crowdCoatMaterial, fisherCount);
  bodies.name = 'ISLAND_22_FISHER_CROWD_BODIES';
  const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.125, 9, 7), crowdSkinMaterial, fisherCount);
  heads.name = 'ISLAND_22_FISHER_CROWD_HEADS';
  const hatBrims = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.205, 0.205, 0.045, 10), crowdHatMaterial, fisherCount);
  hatBrims.name = 'ISLAND_22_FISHER_CROWD_HAT_BRIMS';
  const hatCrowns = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.15, 0.15, 9), crowdHatMaterial, fisherCount);
  hatCrowns.name = 'ISLAND_22_FISHER_CROWD_HAT_CROWNS';
  const arms = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.052, 0.36, 6), crowdCoatMaterial, fisherCount * 2);
  arms.name = 'ISLAND_22_FISHER_CROWD_ARMS';
  const boots = new THREE.InstancedMesh(new THREE.BoxGeometry(0.11, 0.17, 0.16), materials.timberDark, fisherCount * 2);
  boots.name = 'ISLAND_22_FISHER_CROWD_BOOTS';
  const eyes = new THREE.InstancedMesh(new THREE.SphereGeometry(0.024, 6, 4), materials.timberDark, fisherCount * 2);
  eyes.name = 'ISLAND_22_FISHER_CROWD_EYES';
  const noses = new THREE.InstancedMesh(new THREE.SphereGeometry(0.036, 7, 5), crowdSkinMaterial, fisherCount);
  noses.name = 'ISLAND_22_FISHER_CROWD_NOSES';
  const scarves = new THREE.InstancedMesh(new THREE.TorusGeometry(0.13, 0.025, 4, 9), materials.brass, fisherCount);
  scarves.name = 'ISLAND_22_FISHER_CROWD_SCARVES';
  const aprons = new THREE.InstancedMesh(new THREE.BoxGeometry(0.2, 0.28, 0.025), materials.rope, fisherCount);
  aprons.name = 'ISLAND_22_FISHER_CROWD_APRONS';
  const rods = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.018, 0.024, 1.28, 5), materials.rope, fisherCount);
  rods.name = 'ISLAND_22_FISHING_RODS';
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3(1, 1, 1);
  const quaternion = new THREE.Quaternion();
  for (let index = 0; index < fisherCount; index += 1) {
    const { angle, radius: platformRadius, yaw } = resolvePondPlatformPose(index, fisherCount);
    const radius = platformRadius;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const tangentX = -Math.sin(angle);
    const tangentZ = Math.cos(angle);
    const inwardX = -Math.cos(angle);
    const inwardZ = -Math.sin(angle);
    const coatColor = [0x2f7c82, 0xb4593c, 0x536b91, 0x5b7d4f][index % 4];
    const hatColor = [0xb8733e, 0x8b6548, 0xc49355, 0x6d5d4b, 0xa45b43][index % 5];
    bodies.setColorAt(index, new THREE.Color(coatColor));
    hatBrims.setColorAt(index, new THREE.Color(hatColor));
    hatCrowns.setColorAt(index, new THREE.Color(hatColor).multiplyScalar(0.88));
    matrix.compose(
      position.set(x, 1.04 + (index % 3) * 0.015, z),
      quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, (index % 3 - 1) * 0.035)),
      scale.set(0.92 + index % 4 * 0.035, 0.94 + index % 3 * 0.045, 0.92 + index % 4 * 0.035),
    );
    bodies.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 1.36 + (index % 3) * 0.015, z), quaternion, scale.setScalar(0.94 + index % 3 * 0.035));
    heads.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 1.48 + (index % 3) * 0.015, z), quaternion, scale.set(1.04, 1, 1));
    hatBrims.setMatrixAt(index, matrix);
    matrix.compose(position.set(x, 1.57 + (index % 3) * 0.015, z), quaternion, scale.set(0.94 + index % 2 * 0.09, 1, 0.94 + index % 2 * 0.09));
    hatCrowns.setMatrixAt(index, matrix);
    [-1, 1].forEach((side, sideIndex) => {
      matrix.compose(
        position.set(
          x + inwardX * 0.116 + tangentX * side * 0.046,
          1.39 + (index % 3) * 0.015,
          z + inwardZ * 0.116 + tangentZ * side * 0.046,
        ),
        quaternion.identity(),
        scale.setScalar(1),
      );
      eyes.setMatrixAt(index * 2 + sideIndex, matrix);
    });
    matrix.compose(
      position.set(x + inwardX * 0.142, 1.35 + (index % 3) * 0.015, z + inwardZ * 0.142),
      quaternion.identity(),
      scale.set(0.8, 1, 0.8),
    );
    noses.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x, 1.25 + (index % 3) * 0.015, z),
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      scale.setScalar(1),
    );
    scarves.setMatrixAt(index, matrix);
    matrix.compose(
      position.set(x + inwardX * 0.165, 1.06, z + inwardZ * 0.165),
      quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, 0)),
      scale.set(0.9 + index % 3 * 0.06, 1, 1),
    );
    aprons.setMatrixAt(index, matrix);
    [-1, 1].forEach((side, sideIndex) => {
      matrix.compose(
        position.set(x + tangentX * side * 0.14, 1.08, z + tangentZ * side * 0.14),
        quaternion.setFromEuler(new THREE.Euler(side * (0.08 + index % 3 * 0.1), yaw + Math.PI, side * (0.28 + index % 4 * 0.11))),
        scale.set(1, 1, 1),
      );
      arms.setMatrixAt(index * 2 + sideIndex, matrix);
      matrix.compose(
        position.set(x + tangentX * side * 0.075, 0.82, z + tangentZ * side * 0.075),
        quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, 0)),
        scale.set(1, 1, 1),
      );
      boots.setMatrixAt(index * 2 + sideIndex, matrix);
    });
    quaternion.setFromEuler(new THREE.Euler(Math.sin(angle) * 0.36, yaw, Math.cos(angle) * 0.36));
    matrix.compose(position.set(x * 0.92, 1.27 + (index % 2) * 0.04, z * 0.92), quaternion, scale.set(0.92, 0.9 + index % 3 * 0.07, 0.92));
    rods.setMatrixAt(index, matrix);
  }
  [bodies, heads, hatBrims, hatCrowns, arms, boots, eyes, noses, scarves, aprons, rods].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    root.add(mesh);
  });
  [bodies, hatBrims, hatCrowns].forEach((mesh) => {
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  });
  return (progress: number, panic: number) => {
    for (let index = 0; index < fisherCount; index += 1) {
      const { angle, radius: baseRadius, yaw } = resolvePondPlatformPose(index, fisherCount);
      const route = index === 0 ? -1.7 : index === 1 ? 7.8 : 3.8 + (index % 4) * 0.8;
      const radius = baseRadius + route * progress;
      const wobble = Math.sin(progress * Math.PI * 10 + index) * panic * 0.12;
      const x = Math.cos(angle + wobble) * radius;
      const z = Math.sin(angle + wobble) * radius;
      const tangentX = -Math.sin(angle + wobble);
      const tangentZ = Math.cos(angle + wobble);
      const inwardX = -Math.cos(angle + wobble);
      const inwardZ = -Math.sin(angle + wobble);
      const jump = Math.abs(Math.sin(progress * Math.PI * (4 + index % 3))) * panic * 0.22;
      quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, wobble));
      matrix.compose(position.set(x, 1.04 + jump, z), quaternion, scale.setScalar(1));
      bodies.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.36 + jump, z), quaternion, scale);
      heads.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.48 + jump, z), quaternion, scale);
      hatBrims.setMatrixAt(index, matrix);
      matrix.compose(position.set(x, 1.57 + jump, z), quaternion, scale);
      hatCrowns.setMatrixAt(index, matrix);
      [-1, 1].forEach((side, sideIndex) => {
        matrix.compose(
          position.set(
            x + inwardX * 0.116 + tangentX * side * 0.046,
            1.39 + jump,
            z + inwardZ * 0.116 + tangentZ * side * 0.046,
          ),
          quaternion.identity(),
          scale.setScalar(1),
        );
        eyes.setMatrixAt(index * 2 + sideIndex, matrix);
      });
      matrix.compose(
        position.set(x + inwardX * 0.142, 1.35 + jump, z + inwardZ * 0.142),
        quaternion.identity(),
        scale.set(0.8, 1, 0.8),
      );
      noses.setMatrixAt(index, matrix);
      matrix.compose(
        position.set(x, 1.25 + jump, z),
        quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
        scale.setScalar(1),
      );
      scarves.setMatrixAt(index, matrix);
      matrix.compose(
        position.set(x + inwardX * 0.165, 1.06 + jump, z + inwardZ * 0.165),
        quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, wobble)),
        scale.setScalar(1),
      );
      aprons.setMatrixAt(index, matrix);
      [-1, 1].forEach((side, sideIndex) => {
        matrix.compose(
          position.set(x + tangentX * side * 0.14, 1.08 + jump, z + tangentZ * side * 0.14),
          quaternion.setFromEuler(new THREE.Euler(
            side * 0.18 + panic * Math.sin(progress * 18 + index + sideIndex) * 0.35,
            yaw + Math.PI,
            side * 0.5 + wobble,
          )),
          scale.setScalar(1),
        );
        arms.setMatrixAt(index * 2 + sideIndex, matrix);
        matrix.compose(
          position.set(x + tangentX * side * 0.075, 0.82 + jump, z + tangentZ * side * 0.075),
          quaternion.setFromEuler(new THREE.Euler(0, yaw + Math.PI, wobble)),
          scale.setScalar(1),
        );
        boots.setMatrixAt(index * 2 + sideIndex, matrix);
      });
      matrix.compose(position.set(x * 0.98, 1.22 + jump, z * 0.98), quaternion, scale.setScalar(1 - panic * 0.7));
      rods.setMatrixAt(index, matrix);
    }
    [bodies, heads, hatBrims, hatCrowns, arms, boots, eyes, noses, scarves, aprons, rods].forEach((mesh) => { mesh.instanceMatrix.needsUpdate = true; });
  };
}

function addFishingProps(root: THREE.Group, materials: Island22FishermansVillageMaterials) {
  const propPlacements = [
    [-7.45, -5.0], [-6.85, -5.35], [-5.75, -6.6], [-4.65, -5.95], [-2.0, -6.25],
    [1.25, -6.35], [3.0, -6.1], [5.0, -5.55], [6.45, -4.6], [6.35, 3.65],
    [5.0, 5.6], [2.8, 6.2], [0.3, 6.5], [-2.2, 6.25], [-4.65, 5.55], [-6.25, 4.25],
  ] as const;
  const crates = new THREE.InstancedMesh(new THREE.BoxGeometry(0.38, 0.32, 0.38), materials.timber, propPlacements.length);
  crates.name = 'ISLAND_22_FISHING_CARGO_CRATES';
  const barrels = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.18, 0.2, 0.46, 8), materials.brass, propPlacements.length);
  barrels.name = 'ISLAND_22_FISHING_BARRELS';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3(1, 1, 1);
  propPlacements.forEach(([x, z], index) => {
    matrix.compose(new THREE.Vector3(x, 0.72, z), quaternion.identity(), scale);
    crates.setMatrixAt(index, matrix);
    matrix.compose(new THREE.Vector3(x + 0.38, 0.78, z + (index % 2 ? 0.28 : -0.28)), quaternion.identity(), scale);
    barrels.setMatrixAt(index, matrix);
  });
  crates.instanceMatrix.needsUpdate = true;
  barrels.instanceMatrix.needsUpdate = true;
  root.add(crates, barrels);
}

function addPondFishingPlatforms(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const platformCount = quality === 'low' ? 7 : quality === 'medium' ? 11 : 15;
  const planksPerPlatform = 4;
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();

  const raftBases = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.55, 0.59, 0.13, 8),
    materials.timberDark,
    platformCount,
  );
  raftBases.name = 'ISLAND_22_OCTAGONAL_POND_RAFT_BASES';
  const raftPlanks = new THREE.InstancedMesh(
    new THREE.BoxGeometry(0.23, 0.055, 0.72),
    materials.timber,
    platformCount * planksPerPlatform,
  );
  // Preserve the canonical address used by mission/test integrations while
  // upgrading the construction from one box to four visible deck slats.
  raftPlanks.name = 'ISLAND_22_POND_FISHING_PLATFORMS';
  raftPlanks.userData.constructionFamily = 'slatted-octagonal-rope-edged-rafts';
  const ropeEdges = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.54, 0.024, 5, 18),
    materials.rope,
    platformCount,
  );
  ropeEdges.name = 'ISLAND_22_POND_RAFT_ROPE_EDGES';
  const mooringPosts = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.035, 0.045, 0.34, 6),
    materials.timberDark,
    platformCount * 2,
  );
  mooringPosts.name = 'ISLAND_22_POND_RAFT_MOORING_POSTS';
  const ropeCoils = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.075, 0.018, 5, 14),
    materials.rope,
    platformCount,
  );
  ropeCoils.name = 'ISLAND_22_POND_RAFT_ROPE_COILS';

  const basketCount = Math.ceil(platformCount / 2);
  const fishBaskets = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.11, 0.15, 0.16, 8, 1, true),
    materials.rope,
    basketCount,
  );
  fishBaskets.name = 'ISLAND_22_POND_RAFT_FISH_BASKETS';
  const foldedNets = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.12, 0),
    new THREE.MeshStandardMaterial({ color: 0x668d7b, roughness: 0.96, flatShading: true }),
    Math.floor(platformCount / 2),
  );
  foldedNets.name = 'ISLAND_22_POND_RAFT_FOLDED_NETS';

  Array.from({ length: platformCount }).forEach((_, platformIndex) => {
    const { angle, radius, yaw } = resolvePondPlatformPose(platformIndex, platformCount);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    matrix.compose(
      position.set(x, 0.735, z),
      quaternion.setFromEuler(new THREE.Euler(0, yaw, 0)),
      scale.set(1.05, 1, 0.72),
    );
    raftBases.setMatrixAt(platformIndex, matrix);

    for (let plankIndex = 0; plankIndex < planksPerPlatform; plankIndex += 1) {
      const tangentOffset = (plankIndex - (planksPerPlatform - 1) / 2) * 0.235;
      matrix.compose(
        position.set(
          x + Math.cos(yaw) * tangentOffset,
          0.824 + (plankIndex % 2) * 0.008,
          z - Math.sin(yaw) * tangentOffset,
        ),
        quaternion.setFromEuler(new THREE.Euler(0, yaw, (plankIndex % 2 ? 1 : -1) * 0.012)),
        scale.set(1, 1, 0.94 + plankIndex % 2 * 0.06),
      );
      raftPlanks.setMatrixAt(platformIndex * planksPerPlatform + plankIndex, matrix);
    }

    matrix.compose(
      position.set(x, 0.858, z),
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, yaw)),
      scale.set(1.02, 1.36, 1),
    );
    ropeEdges.setMatrixAt(platformIndex, matrix);

    [-1, 1].forEach((side, sideIndex) => {
      matrix.compose(
        position.set(
          x + Math.cos(yaw) * side * 0.39,
          0.99,
          z - Math.sin(yaw) * side * 0.39,
        ),
        quaternion.identity(),
        scale.setScalar(1),
      );
      mooringPosts.setMatrixAt(platformIndex * 2 + sideIndex, matrix);
    });

    matrix.compose(
      position.set(
        x - Math.sin(angle) * 0.22,
        0.858,
        z + Math.cos(angle) * 0.22,
      ),
      quaternion.setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0)),
      scale.set(1, 1, 0.72),
    );
    ropeCoils.setMatrixAt(platformIndex, matrix);

    if (platformIndex % 2 === 0) {
      const basketIndex = Math.floor(platformIndex / 2);
      matrix.compose(
        position.set(x + Math.cos(yaw) * 0.22, 0.965, z - Math.sin(yaw) * 0.22),
        quaternion.setFromEuler(new THREE.Euler(0, yaw + platformIndex * 0.16, 0)),
        scale.set(1, 0.82 + platformIndex % 3 * 0.12, 1),
      );
      fishBaskets.setMatrixAt(basketIndex, matrix);
    } else {
      const netIndex = Math.floor(platformIndex / 2);
      matrix.compose(
        position.set(x - Math.cos(yaw) * 0.23, 0.95, z + Math.sin(yaw) * 0.23),
        quaternion.setFromEuler(new THREE.Euler(0, yaw, platformIndex * 0.11)),
        scale.set(1.25, 0.62, 0.88),
      );
      foldedNets.setMatrixAt(netIndex, matrix);
    }
  });

  [raftBases, raftPlanks, ropeEdges, mooringPosts, ropeCoils, fishBaskets, foldedNets].forEach((mesh) => {
    mesh.instanceMatrix.needsUpdate = true;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
  });
}

function addLivingPondSurface(
  root: THREE.Group,
  quality: Island3DQuality,
  materials: Island22FishermansVillageMaterials,
) {
  const waterLife = new THREE.Group();
  waterLife.name = 'ISLAND_22_LIVING_POND_SURFACE_DETAILS';
  root.add(waterLife);

  const shaftWallMaterial = new THREE.MeshStandardMaterial({
    color: 0x27474a,
    roughness: 0.92,
    side: THREE.BackSide,
    flatShading: true,
  });
  const shaftWall = new THREE.Mesh(
    new THREE.CylinderGeometry(0.72, 0.64, 0.7, quality === 'low' ? 18 : 28, 4, true),
    shaftWallMaterial,
  );
  shaftWall.name = 'ISLAND_22_VISIBLE_POND_WELL_WALL';
  shaftWall.position.y = 0.31;
  waterLife.add(shaftWall);

  const wellRim = new THREE.Mesh(
    new THREE.TorusGeometry(0.75, 0.075, 6, quality === 'low' ? 20 : 32),
    materials.stone,
  );
  wellRim.name = 'ISLAND_22_POND_WELL_RIM';
  wellRim.rotation.x = Math.PI / 2;
  wellRim.position.y = 0.686;
  wellRim.castShadow = true;
  waterLife.add(wellRim);

  const shaftCourseCount = quality === 'low' ? 3 : 5;
  const shaftCourses = new THREE.InstancedMesh(
    new THREE.TorusGeometry(0.675, 0.018, 4, quality === 'low' ? 18 : 26),
    materials.cobble,
    shaftCourseCount,
  );
  shaftCourses.name = 'ISLAND_22_VISIBLE_POND_WELL_COURSES';
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion().setFromEuler(new THREE.Euler(Math.PI / 2, 0, 0));
  const unitScale = new THREE.Vector3(1, 1, 1);
  for (let index = 0; index < shaftCourseCount; index += 1) {
    matrix.compose(new THREE.Vector3(0, 0.58 - index * 0.12, 0), quaternion, unitScale);
    shaftCourses.setMatrixAt(index, matrix);
  }
  shaftCourses.instanceMatrix.needsUpdate = true;
  waterLife.add(shaftCourses);

  const currentMaterial = new THREE.MeshBasicMaterial({
    color: 0xbff9ef,
    transparent: true,
    opacity: 0.24,
    depthWrite: false,
  });
  const currentPlacements = [
    [-1.52, -0.62, 0.46, 0.76],
    [1.42, -0.78, -0.54, 0.68],
    [-1.3, 1.12, 2.34, 0.58],
    [1.48, 0.86, -2.42, 0.48],
    [0.05, -1.86, 0.18, 0.5],
  ] as const;
  const currents = currentPlacements.map(([x, z, rotation, scale], index) => {
    const current = new THREE.Mesh(
      new THREE.TorusGeometry(0.46, 0.018, 4, 24, Math.PI * (0.54 + index % 2 * 0.14)),
      currentMaterial.clone(),
    );
    current.name = `ISLAND_22_POND_CURRENT_${index + 1}`;
    current.rotation.set(Math.PI / 2, 0, rotation);
    current.position.set(x, 0.688 + index * 0.0015, z);
    current.scale.setScalar(scale);
    current.renderOrder = 3;
    waterLife.add(current);
    return current;
  });

  const glintCount = quality === 'low' ? 8 : 14;
  const glints = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.035, 0),
    new THREE.MeshBasicMaterial({ color: 0xe9fff5, transparent: true, opacity: 0.68, depthWrite: false }),
    glintCount,
  );
  glints.name = 'ISLAND_22_POND_SUN_GLINTS';
  for (let index = 0; index < glintCount; index += 1) {
    const angle = index * 2.399 + 0.3;
    const radius = 0.95 + index % 5 * 0.38;
    matrix.compose(
      new THREE.Vector3(Math.cos(angle) * radius, 0.7 + index % 3 * 0.002, Math.sin(angle) * radius),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(0, angle, Math.PI / 4)),
      new THREE.Vector3(1.6 + index % 2 * 0.55, 0.2, 0.65),
    );
    glints.setMatrixAt(index, matrix);
  }
  glints.instanceMatrix.needsUpdate = true;
  glints.renderOrder = 3;
  waterLife.add(glints);

  return {
    group: waterLife,
    update: (elapsed: number, waterY: number, missionActive: boolean) => {
      waterLife.visible = !missionActive;
      waterLife.position.y = waterY - 0.66;
      currents.forEach((current, index) => {
        current.rotation.z += 0.0015 + index * 0.00022;
        const pulse = 0.92 + Math.sin(elapsed * (0.68 + index * 0.06) + index) * 0.12;
        current.scale.setScalar(currentPlacements[index][3] * pulse);
        (current.material as THREE.MeshBasicMaterial).opacity = 0.16 + (Math.sin(elapsed * 0.9 + index) + 1) * 0.07;
      });
      glints.rotation.y = elapsed * 0.035;
      glints.scale.setScalar(0.88 + Math.sin(elapsed * 1.2) * 0.12);
    },
  };
}

function createHeroFishingInteraction(
  root: THREE.Group,
  materials: Island22FishermansVillageMaterials,
  quality: Island3DQuality,
) {
  const interaction = new THREE.Group();
  interaction.name = 'ISLAND_22_HERO_FISHING_INTERACTION';
  interaction.visible = false;
  root.add(interaction);

  const fisher = new THREE.Group();
  fisher.name = 'ISLAND_22_HERO_FISHERMAN';
  fisher.position.set(-1.35, 0.78, 2.74);
  fisher.rotation.y = Math.PI - 0.18;
  interaction.add(fisher);

  const coatMaterial = new THREE.MeshStandardMaterial({ color: 0x246a74, roughness: 0.76 });
  const coatLightMaterial = new THREE.MeshStandardMaterial({ color: 0x3b8990, roughness: 0.7 });
  const shirtMaterial = new THREE.MeshStandardMaterial({ color: 0xe8ddc2, roughness: 0.82 });
  const scarfMaterial = new THREE.MeshStandardMaterial({ color: 0xc94737, roughness: 0.74 });
  const cheekMaterial = new THREE.MeshStandardMaterial({ color: 0xe88270, roughness: 0.8 });
  const trouserMaterial = new THREE.MeshStandardMaterial({ color: 0x374454, roughness: 0.84 });
  const bootMaterial = new THREE.MeshStandardMaterial({ color: 0x2c201b, roughness: 0.88 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color: 0xe0a36d, roughness: 0.82 });
  const fishMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x43cfc0,
    roughness: 0.28,
    metalness: 0.04,
    clearcoat: 0.72,
    clearcoatRoughness: 0.2,
  });
  const fishStripeMaterial = new THREE.MeshStandardMaterial({ color: 0x197f87, roughness: 0.42, metalness: 0.05 });
  const fishBellyMaterial = new THREE.MeshPhysicalMaterial({
    color: 0xbcebd7,
    roughness: 0.36,
    clearcoat: 0.45,
    clearcoatRoughness: 0.25,
  });
  const fishScaleMaterial = new THREE.MeshStandardMaterial({
    color: 0x208e93,
    roughness: 0.38,
    metalness: 0.04,
    transparent: true,
    opacity: 0.48,
    side: THREE.DoubleSide,
  });
  const wetHighlightMaterial = new THREE.MeshBasicMaterial({
    color: 0xf1fff4,
    transparent: true,
    opacity: 0.48,
    depthWrite: false,
  });
  const fishFinMaterial = new THREE.MeshStandardMaterial({
    color: 0xf0ba55,
    roughness: 0.52,
    transparent: true,
    opacity: 0.92,
    side: THREE.DoubleSide,
  });
  const eyeWhiteMaterial = new THREE.MeshStandardMaterial({ color: 0xfff8df, roughness: 0.58 });
  const lineMaterial = new THREE.LineBasicMaterial({ color: 0xf6fff2, transparent: true, opacity: 0.9 });
  const lineCableMaterial = new THREE.MeshBasicMaterial({
    color: 0xe7fff8,
    transparent: true,
    opacity: 0.92,
    depthWrite: false,
  });
  const sparkleMaterial = new THREE.MeshBasicMaterial({ color: 0xfff0a1, transparent: true, opacity: 0.95 });

  const body = cylinder(0.24, 0.31, 0.83, coatMaterial, 10);
  body.position.y = 0.56;
  fisher.add(body);
  const shirtFront = box(0.22, 0.48, 0.035, shirtMaterial);
  shirtFront.position.set(0, 0.63, -0.29);
  fisher.add(shirtFront);
  const vestLeft = box(0.13, 0.54, 0.05, coatLightMaterial);
  const vestRight = vestLeft.clone();
  vestLeft.position.set(-0.14, 0.62, -0.305);
  vestRight.position.set(0.14, 0.62, -0.305);
  vestLeft.rotation.z = -0.08;
  vestRight.rotation.z = 0.08;
  fisher.add(vestLeft, vestRight);
  const belt = cylinder(0.315, 0.315, 0.085, materials.timberDark, 12);
  belt.position.y = 0.22;
  const buckle = box(0.13, 0.11, 0.045, materials.brass);
  buckle.position.set(0, 0.22, -0.32);
  const scarf = cylinder(0.275, 0.275, 0.085, scarfMaterial, 10);
  scarf.position.y = 0.94;
  const scarfKnot = new THREE.Mesh(new THREE.ConeGeometry(0.105, 0.24, 3), scarfMaterial);
  scarfKnot.position.set(0.08, 0.82, -0.31);
  scarfKnot.rotation.z = -0.18;
  scarfKnot.scale.z = 0.5;
  fisher.add(belt, buckle, scarf, scarfKnot);

  const leftLeg = new THREE.Group();
  const rightLeg = new THREE.Group();
  leftLeg.position.set(-0.13, 0.19, 0);
  rightLeg.position.set(0.13, 0.19, 0);
  fisher.add(leftLeg, rightLeg);
  for (const [leg, side] of [[leftLeg, -1], [rightLeg, 1]] as const) {
    const trouser = cylinder(0.105, 0.12, 0.42, trouserMaterial, 8);
    trouser.position.y = -0.2;
    const boot = box(0.22, 0.2, 0.34, bootMaterial);
    boot.position.set(side * 0.012, -0.46, -0.07);
    leg.add(trouser, boot);
  }

  const headRig = new THREE.Group();
  headRig.position.y = 1.16;
  fisher.add(headRig);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 14, 10), skinMaterial);
  head.scale.set(0.96, 1.05, 0.93);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.14, 7), skinMaterial);
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0, -0.245);
  const leftEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.047, 8, 6), eyeWhiteMaterial);
  const rightEyeWhite = leftEyeWhite.clone();
  leftEyeWhite.position.set(-0.082, 0.075, -0.22);
  rightEyeWhite.position.set(0.082, 0.075, -0.22);
  const leftPupil = new THREE.Mesh(new THREE.SphereGeometry(0.021, 7, 5), materials.timberDark);
  const rightPupil = leftPupil.clone();
  leftPupil.position.set(-0.082, 0.073, -0.258);
  rightPupil.position.set(0.082, 0.073, -0.258);
  const moustacheLeft = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 5), materials.timberDark);
  const moustacheRight = moustacheLeft.clone();
  moustacheLeft.scale.set(1.25, 0.42, 0.42);
  moustacheRight.scale.copy(moustacheLeft.scale);
  moustacheLeft.position.set(-0.064, -0.075, -0.236);
  moustacheRight.position.set(0.064, -0.075, -0.236);
  moustacheLeft.rotation.z = -0.22;
  moustacheRight.rotation.z = 0.22;
  const leftBrow = box(0.12, 0.025, 0.025, materials.timberDark);
  const rightBrow = leftBrow.clone();
  leftBrow.position.set(-0.08, 0.145, -0.245);
  rightBrow.position.set(0.08, 0.145, -0.245);
  leftBrow.rotation.z = -0.12;
  rightBrow.rotation.z = 0.12;
  const leftCheek = new THREE.Mesh(new THREE.SphereGeometry(0.055, 7, 5), cheekMaterial);
  const rightCheek = leftCheek.clone();
  leftCheek.scale.z = 0.34;
  rightCheek.scale.copy(leftCheek.scale);
  leftCheek.position.set(-0.15, -0.015, -0.225);
  rightCheek.position.set(0.15, -0.015, -0.225);
  const smile = new THREE.Mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 12, Math.PI), materials.timberDark);
  smile.position.set(0, -0.115, -0.244);
  smile.rotation.z = Math.PI;
  const leftEar = new THREE.Mesh(new THREE.SphereGeometry(0.065, 8, 5), skinMaterial);
  const rightEar = leftEar.clone();
  leftEar.position.x = -0.235;
  rightEar.position.x = 0.235;
  headRig.add(
    head,
    nose,
    leftEyeWhite,
    rightEyeWhite,
    leftPupil,
    rightPupil,
    moustacheLeft,
    moustacheRight,
    leftBrow,
    rightBrow,
    leftCheek,
    rightCheek,
    smile,
    leftEar,
    rightEar,
  );
  const hatBrim = cylinder(0.42, 0.42, 0.07, materials.brass, 14);
  hatBrim.position.y = 0.23;
  headRig.add(hatBrim);
  const hatCrown = cylinder(0.24, 0.31, 0.27, materials.brass, 12);
  hatCrown.position.y = 0.36;
  headRig.add(hatCrown);
  const hatBand = cylinder(0.315, 0.315, 0.065, materials.timberDark, 12);
  hatBand.position.y = 0.27;
  const hatFeather = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.38, 6), scarfMaterial);
  hatFeather.position.set(0.18, 0.51, 0);
  hatFeather.rotation.z = -0.46;
  hatFeather.scale.z = 0.45;
  headRig.add(hatBand, hatFeather);

  const leftArm = new THREE.Group();
  const rightArm = new THREE.Group();
  leftArm.position.set(-0.22, 0.94, -0.04);
  rightArm.position.set(0.22, 0.94, -0.04);
  fisher.add(leftArm, rightArm);
  const armGeometry = new THREE.CylinderGeometry(0.075, 0.09, 0.38, 7);
  const leftArmMesh = new THREE.Mesh(armGeometry, coatMaterial);
  const rightArmMesh = new THREE.Mesh(armGeometry, coatMaterial);
  leftArmMesh.position.y = -0.18;
  rightArmMesh.position.y = -0.18;
  leftArm.add(leftArmMesh);
  rightArm.add(rightArmMesh);
  const leftForearm = new THREE.Group();
  const rightForearm = new THREE.Group();
  leftForearm.position.y = -0.36;
  rightForearm.position.y = -0.36;
  leftArm.add(leftForearm);
  rightArm.add(rightForearm);
  const forearmGeometry = new THREE.CylinderGeometry(0.065, 0.075, 0.34, 7);
  const leftForearmMesh = new THREE.Mesh(forearmGeometry, coatLightMaterial);
  const rightForearmMesh = new THREE.Mesh(forearmGeometry, coatLightMaterial);
  leftForearmMesh.position.y = -0.16;
  rightForearmMesh.position.y = -0.16;
  leftForearm.add(leftForearmMesh);
  rightForearm.add(rightForearmMesh);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.095, 9, 6), skinMaterial);
  const rightHand = leftHand.clone();
  leftHand.position.y = -0.35;
  rightHand.position.y = -0.35;
  leftForearm.add(leftHand);
  rightForearm.add(rightHand);

  const rod = cylinder(0.025, 0.04, 1, materials.rope, 7);
  rod.name = 'ISLAND_22_HERO_FISHING_ROD';
  interaction.add(rod);
  const reel = new THREE.Group();
  reel.name = 'ISLAND_22_HERO_FISHING_REEL';
  interaction.add(reel);
  const reelBody = cylinder(0.12, 0.12, 0.13, materials.brass, 10);
  reelBody.rotation.z = Math.PI / 2;
  const reelHub = cylinder(0.045, 0.045, 0.2, materials.timberDark, 8);
  reelHub.rotation.z = Math.PI / 2;
  const reelCrank = box(0.05, 0.18, 0.045, materials.timberDark);
  reelCrank.position.set(0.1, -0.08, 0);
  reel.add(reelBody, reelHub, reelCrank);

  const bobber = new THREE.Group();
  bobber.name = 'ISLAND_22_HERO_BOBBER';
  const bobberTop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 7, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf04c3e }));
  const bobberBottom = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf8f4d8 }));
  bobber.add(bobberTop, bobberBottom);
  interaction.add(bobber);

  const fishShadow = new THREE.Group();
  fishShadow.name = 'ISLAND_22_POND_FISH_SHADOW';
  const fishShadowMaterial = new THREE.MeshBasicMaterial({
    color: 0x053f55,
    transparent: true,
    opacity: 0.28,
    depthWrite: false,
  });
  const fishShadowBody = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 6), fishShadowMaterial);
  fishShadowBody.scale.set(1.65, 0.09, 0.62);
  const fishShadowTail = new THREE.Mesh(new THREE.ConeGeometry(0.23, 0.42, 3), fishShadowMaterial);
  fishShadowTail.rotation.z = -Math.PI / 2;
  fishShadowTail.position.x = -0.67;
  fishShadow.add(fishShadowBody, fishShadowTail);
  fishShadow.visible = false;
  fishShadow.renderOrder = 2;
  interaction.add(fishShadow);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3(),
  ]);
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.name = 'ISLAND_22_HERO_FISHING_LINE';
  line.frustumCulled = false;
  interaction.add(line);
  const lineCableGeometry = new THREE.CylinderGeometry(0.012, 0.012, 1, 5);
  const lineCableSegments = [0, 1].map((index) => {
    const segment = new THREE.Mesh(lineCableGeometry, lineCableMaterial);
    segment.name = `ISLAND_22_HERO_FISHING_LINE_CABLE_${index + 1}`;
    segment.frustumCulled = false;
    interaction.add(segment);
    return segment;
  });
  const hookLeader = new THREE.Mesh(lineCableGeometry, lineCableMaterial);
  hookLeader.name = 'ISLAND_22_HERO_FISH_HOOK_LEADER';
  hookLeader.frustumCulled = false;
  hookLeader.visible = false;
  interaction.add(hookLeader);
  const fishHook = new THREE.Mesh(
    new THREE.TorusGeometry(0.05, 0.01, 4, 12, Math.PI * 1.42),
    materials.brass,
  );
  fishHook.name = 'ISLAND_22_HERO_FISH_HOOK';
  fishHook.visible = false;
  interaction.add(fishHook);

  const fish = new THREE.Group();
  fish.name = 'ISLAND_22_HERO_CAUGHT_FISH';
  const fishBody = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 9), fishMaterial);
  fishBody.scale.set(1.48, 0.76, 0.66);
  const fishBelly = new THREE.Mesh(
    new THREE.SphereGeometry(0.345, 14, 7, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2),
    fishBellyMaterial,
  );
  fishBelly.scale.set(1.37, 0.76, 0.65);
  fishBelly.position.y = -0.008;
  const caudalPeduncle = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 7), fishMaterial);
  caudalPeduncle.name = 'ISLAND_22_HERO_FISH_CAUDAL_PEDUNCLE';
  caudalPeduncle.position.x = -0.54;
  caudalPeduncle.scale.set(0.92, 0.58, 0.62);
  const tailRig = new THREE.Group();
  tailRig.position.x = -0.62;
  const upperTailShape = new THREE.Shape();
  upperTailShape.moveTo(0, 0);
  upperTailShape.bezierCurveTo(-0.14, 0.04, -0.38, 0.18, -0.52, 0.42);
  upperTailShape.bezierCurveTo(-0.25, 0.4, -0.09, 0.2, 0, 0);
  const lowerTailShape = new THREE.Shape();
  lowerTailShape.moveTo(0, 0);
  lowerTailShape.bezierCurveTo(-0.14, -0.04, -0.38, -0.18, -0.52, -0.42);
  lowerTailShape.bezierCurveTo(-0.25, -0.4, -0.09, -0.2, 0, 0);
  const tailExtrudeSettings = {
    depth: 0.055,
    bevelEnabled: true,
    bevelSize: 0.012,
    bevelThickness: 0.012,
    bevelSegments: 1,
    curveSegments: 10,
  } as const;
  const upperTail = new THREE.Mesh(new THREE.ExtrudeGeometry(upperTailShape, tailExtrudeSettings), fishFinMaterial);
  const lowerTail = new THREE.Mesh(new THREE.ExtrudeGeometry(lowerTailShape, tailExtrudeSettings), fishFinMaterial);
  upperTail.position.z = -0.0275;
  lowerTail.position.z = -0.0275;
  tailRig.add(upperTail, lowerTail);
  const dorsalShape = new THREE.Shape();
  dorsalShape.moveTo(-0.22, 0);
  dorsalShape.bezierCurveTo(-0.12, 0.22, 0.03, 0.36, 0.18, 0.42);
  dorsalShape.bezierCurveTo(0.16, 0.19, 0.1, 0.07, -0.22, 0);
  const dorsalFin = new THREE.Mesh(new THREE.ExtrudeGeometry(dorsalShape, {
    depth: 0.045,
    bevelEnabled: true,
    bevelSize: 0.008,
    bevelThickness: 0.008,
    bevelSegments: 1,
    curveSegments: 8,
  }), fishFinMaterial);
  dorsalFin.position.set(-0.08, 0.22, -0.0225);
  const pectoralShape = new THREE.Shape();
  pectoralShape.moveTo(-0.08, 0);
  pectoralShape.bezierCurveTo(0.08, 0.03, 0.28, 0.14, 0.36, 0.3);
  pectoralShape.bezierCurveTo(0.16, 0.28, 0.02, 0.16, -0.08, 0);
  const pectoralGeometry = new THREE.ExtrudeGeometry(pectoralShape, {
    depth: 0.035,
    bevelEnabled: true,
    bevelSize: 0.006,
    bevelThickness: 0.006,
    bevelSegments: 1,
    curveSegments: 7,
  });
  const leftFin = new THREE.Mesh(pectoralGeometry, fishFinMaterial);
  const rightFin = leftFin.clone();
  leftFin.position.set(0.02, -0.02, 0.205);
  rightFin.position.set(0.02, -0.02, -0.24);
  leftFin.rotation.set(0.34, 0.12, -0.5);
  rightFin.rotation.set(-0.34, -0.12, -0.5);
  const fishEyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), eyeWhiteMaterial);
  fishEyeWhite.position.set(0.38, 0.1, 0.2);
  const fishEye = new THREE.Mesh(new THREE.SphereGeometry(0.027, 7, 5), materials.timberDark);
  fishEye.position.set(0.39, 0.1, 0.248);
  const farFishEye = fishEye.clone();
  farFishEye.position.z = -0.248;
  const fishMouth = new THREE.Mesh(new THREE.TorusGeometry(0.055, 0.014, 5, 12, Math.PI), fishStripeMaterial);
  fishMouth.position.set(0.51, -0.035, 0);
  fishMouth.rotation.y = Math.PI / 2;
  fishMouth.rotation.z = Math.PI / 2;
  const gill = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 5, 14, Math.PI * 1.25), fishStripeMaterial);
  gill.position.set(0.25, 0, 0.205);
  gill.rotation.x = Math.PI / 2;
  const farGill = gill.clone();
  farGill.position.z = -0.205;
  farGill.rotation.x = -Math.PI / 2;
  [0.02, -0.17, -0.34].forEach((x, index) => {
    const stripe = new THREE.Mesh(new THREE.TorusGeometry(0.19 - index * 0.012, 0.018, 5, 14, Math.PI * 1.25), fishStripeMaterial);
    stripe.position.x = x;
    stripe.rotation.y = Math.PI / 2;
    stripe.rotation.z = -0.62;
    fish.add(stripe);
  });
  const nearScales = new THREE.InstancedMesh(new THREE.CircleGeometry(0.028, 8), fishScaleMaterial, 18);
  const farScales = new THREE.InstancedMesh(new THREE.CircleGeometry(0.028, 8), fishScaleMaterial, 18);
  nearScales.name = 'ISLAND_22_HERO_FISH_NEAR_SCALES';
  farScales.name = 'ISLAND_22_HERO_FISH_FAR_SCALES';
  const scaleMatrix = new THREE.Matrix4();
  let scaleIndex = 0;
  [-0.12, 0.02, 0.16].forEach((y, row) => {
    [-0.34, -0.19, -0.04, 0.11, 0.26, 0.38].forEach((x, column) => {
      const taper = 1 - Math.abs(x + 0.02) * 0.46;
      const staggeredX = x + (row % 2) * 0.055;
      scaleMatrix.compose(
        new THREE.Vector3(staggeredX, y, 0.218 * taper),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, (column % 2 ? 1 : -1) * 0.1)),
        new THREE.Vector3(1, 0.72, 1),
      );
      nearScales.setMatrixAt(scaleIndex, scaleMatrix);
      scaleMatrix.compose(
        new THREE.Vector3(staggeredX, y, -0.218 * taper),
        new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI, (column % 2 ? 1 : -1) * 0.1)),
        new THREE.Vector3(1, 0.72, 1),
      );
      farScales.setMatrixAt(scaleIndex, scaleMatrix);
      scaleIndex += 1;
    });
  });
  nearScales.instanceMatrix.needsUpdate = true;
  farScales.instanceMatrix.needsUpdate = true;
  const wetHighlights = [-0.18, 0.14].map((x, index) => {
    const highlight = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 5), wetHighlightMaterial.clone());
    highlight.position.set(x, 0.19 + index * 0.01, 0.19);
    highlight.scale.set(2.15 - index * 0.3, 0.24, 0.16);
    return highlight;
  });
  fish.add(
    fishBody,
    fishBelly,
    caudalPeduncle,
    tailRig,
    dorsalFin,
    leftFin,
    rightFin,
    fishEyeWhite,
    fishEye,
    farFishEye,
    fishMouth,
    gill,
    farGill,
    nearScales,
    farScales,
    ...wetHighlights,
  );
  fish.visible = false;
  interaction.add(fish);

  // Premium geometry owns only the visible fisherman, rig and catch family.
  // The established interaction below remains the authority for mission state,
  // camera choreography, pond effects and timing.
  const premiumActors = createIsland22PremiumFishingActors(quality);
  premiumActors.fisherman.root.position.set(-1.35, 0.75, 2.74);
  premiumActors.fisherman.root.rotation.y = Math.PI - 0.18;
  premiumActors.fisherman.root.scale.setScalar(0.78);
  interaction.add(premiumActors.root);

  const rippleMaterial = new THREE.MeshBasicMaterial({ color: 0xb9fff0, transparent: true, opacity: 0.72, depthWrite: false });
  const ripples = [0, 1, 2].map((index) => {
    const ripple = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.018, 5, 30), rippleMaterial.clone());
    ripple.rotation.x = Math.PI / 2;
    ripple.position.y = 0.69 + index * 0.002;
    interaction.add(ripple);
    return ripple;
  });
  const sparkles = Array.from({ length: 12 }, (_, index) => {
    const sparkle = new THREE.Mesh(new THREE.OctahedronGeometry(0.075 + index % 3 * 0.018, 0), sparkleMaterial.clone());
    sparkle.visible = false;
    interaction.add(sparkle);
    return sparkle;
  });
  const reelDroplets = Array.from({ length: 10 }, (_, index) => {
    const droplet = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.035 + index % 3 * 0.012, 0),
      new THREE.MeshBasicMaterial({ color: 0xa7fff0, transparent: true, opacity: 0.82, depthWrite: false }),
    );
    droplet.visible = false;
    interaction.add(droplet);
    return droplet;
  });
  const emptyCatchBurst = new THREE.Group();
  emptyCatchBurst.name = 'ISLAND_22_EMPTY_HOOK_PHONE_BUBBLE_BURST';
  emptyCatchBurst.visible = false;
  interaction.add(emptyCatchBurst);
  const emptyCatchRingMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0fff8,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  emptyCatchRingMaterial.fog = false;
  const emptyCatchRing = new THREE.Mesh(
    new THREE.TorusGeometry(0.28, 0.045, 6, 32),
    emptyCatchRingMaterial,
  );
  emptyCatchRing.rotation.x = Math.PI / 2;
  emptyCatchBurst.add(emptyCatchRing);
  const emptyCatchFoamMaterial = new THREE.MeshBasicMaterial({
    color: 0xf5fff9,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  emptyCatchFoamMaterial.fog = false;
  const emptyCatchFoamCount = 13;
  const emptyCatchFoamPuffs = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.082, 7, 5),
    emptyCatchFoamMaterial,
    emptyCatchFoamCount,
  );
  emptyCatchFoamPuffs.name = 'ISLAND_22_EMPTY_HOOK_POND_FOAM';
  emptyCatchFoamPuffs.renderOrder = 41;
  emptyCatchFoamPuffs.frustumCulled = false;
  emptyCatchBurst.add(emptyCatchFoamPuffs);
  const emptyCatchFoamTransform = new THREE.Object3D();
  const emptyCatchColumnMaterial = new THREE.MeshBasicMaterial({
    color: 0x9ff6ef,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    depthTest: false,
  });
  emptyCatchColumnMaterial.fog = false;
  const emptyCatchColumn = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.34, 1.1, 10, 1, true),
    emptyCatchColumnMaterial,
  );
  emptyCatchColumn.position.y = 0.48;
  emptyCatchBurst.add(emptyCatchColumn);
  const emptyCatchBubbles = Array.from({ length: 12 }, (_, index) => {
    const bubbleMaterial = new THREE.MeshBasicMaterial({
      color: index % 3 === 0 ? 0xffffff : 0xb7fff5,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      depthTest: false,
    });
    bubbleMaterial.fog = false;
    const bubble = new THREE.Mesh(
      new THREE.SphereGeometry(0.075 + index % 4 * 0.018, 8, 6),
      bubbleMaterial,
    );
    emptyCatchBurst.add(bubble);
    return bubble;
  });

  const rodTip = new THREE.Vector3();
  const rodStart = new THREE.Vector3();
  const rodDirection = new THREE.Vector3();
  const rodTipReady = new THREE.Vector3(-0.92, 3.32, 2.22);
  const rodTipCast = new THREE.Vector3(0.18, 2.48, 0.92);
  const bobberPosition = new THREE.Vector3();
  const fishHookPoint = new THREE.Vector3();
  const lineMid = new THREE.Vector3();
  const lineDirection = new THREE.Vector3();
  const rodControl = new THREE.Vector3();
  const lineUp = new THREE.Vector3(0, 1, 0);
  const cameraPositionWide = new THREE.Vector3(6.65, 4.95, -7.9);
  const cameraPositionCast = new THREE.Vector3(6.42, 4.72, -7.55);
  const cameraPositionCatch = new THREE.Vector3(6.78, 5.12, -7.72);
  const cameraTarget = new THREE.Vector3(-0.58, 1.2, 1.34);
  const cameraTargetCatch = new THREE.Vector3(-0.56, 1.46, 1.94);
  let presentation: Island22FishingInteractionPresentation = {
    active: false,
    phase: 'off',
    catchKind: 'nothing',
    countdown: null,
    pullProgress: 0,
    tension: 0,
    reelPulse: 0,
  };
  let previousPhase: Island22FishingInteractionPhase = 'off';
  let phaseStartedAt = 0;
  let previousReelPulse = 0;
  let reelPulseStartedAt = -10;

  const orientLineSegment = (segment: THREE.Mesh, start: THREE.Vector3, end: THREE.Vector3) => {
    lineDirection.subVectors(end, start);
    const length = Math.max(0.001, lineDirection.length());
    segment.position.copy(start).add(end).multiplyScalar(0.5);
    segment.quaternion.setFromUnitVectors(lineUp, lineDirection.normalize());
    segment.scale.set(1, length, 1);
  };

  const update = (elapsed: number) => {
    interaction.visible = presentation.active;
    if (!presentation.active) return;
    if (presentation.phase !== previousPhase) {
      previousPhase = presentation.phase;
      phaseStartedAt = elapsed;
    }
    if (presentation.reelPulse !== previousReelPulse) {
      previousReelPulse = presentation.reelPulse;
      reelPulseStartedAt = elapsed;
    }
    const phaseElapsed = Math.max(0, elapsed - phaseStartedAt);
    const castProgress = presentation.phase === 'casting'
      ? THREE.MathUtils.smoothstep(Math.min(1, phaseElapsed / 1.05), 0, 1)
      : presentation.phase === 'approach' ? 0 : 1;
    const reelPulseElapsed = Math.max(0, elapsed - reelPulseStartedAt);
    const pullKick = presentation.phase === 'reeling' && reelPulseElapsed < 0.46
      ? Math.sin(reelPulseElapsed / 0.46 * Math.PI) * 0.34
      : 0;
    const struggle = presentation.phase === 'reeling'
      ? Math.sin(elapsed * (5.2 + presentation.tension * 4.8)) * presentation.tension
      : 0;
    fisher.rotation.z = presentation.phase === 'reeling' ? -pullKick * 0.38 - struggle * 0.025 : 0;
    fisher.position.y = 0.78 - pullKick * 0.09;
    body.rotation.x = presentation.phase === 'casting'
      ? -Math.sin(castProgress * Math.PI) * 0.13
      : pullKick * 0.22;
    headRig.rotation.y = presentation.phase === 'reeling'
      ? -0.16 - struggle * 0.06
      : -0.06 + Math.sin(elapsed * 1.2) * 0.025;
    headRig.rotation.x = presentation.phase === 'caught' ? -0.12 : pullKick * 0.12;
    const blinkWindow = elapsed % 4.6;
    const blinkScale = blinkWindow < 0.13 ? 0.12 : 1;
    leftEyeWhite.scale.y = blinkScale;
    rightEyeWhite.scale.y = blinkScale;
    leftPupil.scale.y = blinkScale;
    rightPupil.scale.y = blinkScale;
    moustacheLeft.rotation.z = -0.22 - pullKick * 0.18;
    moustacheRight.rotation.z = 0.22 + pullKick * 0.18;
    smile.scale.setScalar(presentation.phase === 'caught' ? 1.28 : 1);
    scarfKnot.rotation.z = -0.18 + Math.sin(elapsed * 3.2) * 0.06 + pullKick * 0.12;
    leftLeg.rotation.x = pullKick * 0.18;
    rightLeg.rotation.x = -pullKick * 0.12;
    leftArm.rotation.x = -0.72 - castProgress * 0.46 - pullKick;
    rightArm.rotation.x = -0.58 - castProgress * 0.54 - pullKick * 1.2;
    leftArm.rotation.z = -0.1 - pullKick * 0.12;
    rightArm.rotation.z = 0.12 + pullKick * 0.16;
    leftForearm.rotation.x = 0.48 - castProgress * 0.28 + pullKick * 0.62;
    rightForearm.rotation.x = 0.36 - castProgress * 0.2 + pullKick * 0.74;
    leftForearm.rotation.z = 0.16;
    rightForearm.rotation.z = -0.16;
    premiumActors.fisherman.update(elapsed, {
      cast: castProgress,
      pull: THREE.MathUtils.clamp(presentation.pullProgress + pullKick * 1.4, 0, 1),
      tension: presentation.tension,
      celebrate: presentation.phase === 'caught' ? THREE.MathUtils.smoothstep(Math.min(1, phaseElapsed / 0.6), 0, 1) : 0,
      panic: presentation.phase === 'escaped' ? Math.min(1, phaseElapsed / 0.24) : 0,
      reelTurns: presentation.phase === 'reeling'
        ? presentation.reelPulse + reelPulseElapsed * 1.8
        : 0,
    });
    interaction.updateMatrixWorld(true);
    premiumActors.fisherman.rodHandSocket.localToWorld(rodStart.set(0, 0, 0));
    interaction.worldToLocal(rodStart);
    rodTip.lerpVectors(rodTipReady, rodTipCast, castProgress);
    if (presentation.phase === 'casting') rodTip.y += Math.sin(castProgress * Math.PI) * 0.72;
    if (presentation.phase === 'reeling') {
      rodTip.set(-0.12, 2.44 + pullKick * 0.74, 1.08 + pullKick * 0.24);
    } else if (presentation.phase === 'caught') {
      rodTip.set(-0.28, 2.92, 1.72);
    }
    rodDirection.subVectors(rodTip, rodStart).normalize();
    rodTip.copy(rodStart).addScaledVector(rodDirection, 2.72);
    rod.position.copy(rodStart).add(rodTip).multiplyScalar(0.5);
    rod.quaternion.setFromUnitVectors(lineUp, rodDirection);
    rod.scale.set(1, 2.72, 1);
    reel.position.copy(rodStart).lerp(rodTip, 0.1);
    reel.quaternion.copy(rod.quaternion);
    reel.rotateY(presentation.phase === 'reeling'
      ? presentation.reelPulse * Math.PI * 0.78 + reelPulseElapsed * 6.4
      : 0);

    const waterX = 0.42;
    const waterZ = 0.28;
    const castArc = presentation.phase === 'casting' ? Math.sin(castProgress * Math.PI) * 2.0 : 0;
    const bob = (presentation.phase === 'waiting' || presentation.phase === 'countdown' || presentation.phase === 'bite')
      ? Math.sin(elapsed * 9.5) * 0.055 - (presentation.phase === 'bite' ? 0.08 : 0)
      : Math.sin(elapsed * 2.8) * 0.018;
    bobberPosition.set(
      THREE.MathUtils.lerp(-1.0, waterX, castProgress),
      THREE.MathUtils.lerp(2.08, 0.72, castProgress) + castArc + bob,
      THREE.MathUtils.lerp(1.8, waterZ, castProgress),
    );
    if (presentation.phase === 'reeling' || presentation.phase === 'caught') {
      const pull = presentation.phase === 'caught'
        ? Math.min(1, phaseElapsed / 0.72)
        : THREE.MathUtils.clamp(presentation.pullProgress, 0, 0.94);
      bobberPosition.lerp(new THREE.Vector3(-0.64, 2.08, 2.14), pull);
    }
    bobber.position.copy(bobberPosition);
    bobber.visible = presentation.phase !== 'caught';
    fishShadow.visible = presentation.phase === 'waiting'
      || presentation.phase === 'countdown'
      || presentation.phase === 'bite';
    if (fishShadow.visible) {
      const shadowAngle = elapsed * (presentation.phase === 'bite' ? 2.2 : 0.92);
      const shadowRadius = presentation.phase === 'bite' ? 0.38 : 0.78;
      fishShadow.position.set(
        waterX + Math.cos(shadowAngle) * shadowRadius,
        0.675,
        waterZ + Math.sin(shadowAngle) * shadowRadius,
      );
      fishShadow.rotation.y = -shadowAngle + Math.PI / 2;
      fishShadow.scale.setScalar(presentation.phase === 'bite' ? 1.18 : 0.92 + Math.sin(elapsed * 1.7) * 0.08);
    }
    lineMid.lerpVectors(rodTip, bobberPosition, 0.55);
    lineMid.y -= 0.34 * (1 - presentation.tension);
    const positions = lineGeometry.getAttribute('position') as THREE.BufferAttribute;
    positions.setXYZ(0, rodTip.x, rodTip.y, rodTip.z);
    positions.setXYZ(1, lineMid.x, lineMid.y, lineMid.z);
    positions.setXYZ(2, bobberPosition.x, bobberPosition.y, bobberPosition.z);
    positions.needsUpdate = true;
    orientLineSegment(lineCableSegments[0], rodTip, lineMid);
    orientLineSegment(lineCableSegments[1], lineMid, bobberPosition);

    const fishScale = presentation.catchKind === 'colossal' ? 1.72
      : presentation.catchKind === 'large' ? 1.28
        : presentation.catchKind === 'medium' ? 1.15 : 0.82;
    const presentationFishScale = presentation.phase === 'caught' ? fishScale * 0.88 : fishScale;
    fish.visible = presentation.phase === 'reeling' || presentation.phase === 'caught';
    const extraction = presentation.phase === 'caught'
      ? 1
      : THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(presentation.pullProgress, 0, 1), 0.08, 0.9);
    fish.scale.setScalar(presentationFishScale * (0.92 + extraction * 0.08));
    fish.position.set(
      bobberPosition.x,
      bobberPosition.y - 0.26 * presentationFishScale - (1 - extraction) * (0.52 + presentationFishScale * 0.16),
      bobberPosition.z,
    );
    if (presentation.phase === 'caught') {
      fish.position.x += 0.42;
      fish.position.y += 0.16;
      fish.position.z -= 0.2;
    }
    const fishStruggle = presentation.phase === 'reeling'
      ? 0.55 + presentation.tension * 0.7
      : 0.28;
    fish.rotation.z = Math.sin(elapsed * (presentation.phase === 'caught' ? 4.1 : 7.8)) * 0.2 * fishStruggle;
    fish.rotation.y = 0.7 + Math.sin(elapsed * (presentation.phase === 'caught' ? 2.3 : 5.6)) * 0.11 * fishStruggle;
    fish.rotation.x = Math.cos(elapsed * 4.8) * 0.08 * fishStruggle;
    tailRig.rotation.y = Math.sin(elapsed * (presentation.phase === 'caught' ? 7.2 : 13.5)) * 0.55 * fishStruggle;
    dorsalFin.rotation.z = Math.sin(elapsed * 7.5) * 0.08;
    hookLeader.visible = fish.visible && presentation.phase !== 'caught';
    fishHook.visible = fish.visible;
    if (fish.visible) {
      interaction.updateMatrixWorld(true);
      fishHookPoint.set(0.5, -0.025, 0);
      fish.localToWorld(fishHookPoint);
      interaction.worldToLocal(fishHookPoint);
      if (presentation.phase === 'caught') {
        bobber.visible = false;
        lineMid.lerpVectors(rodTip, fishHookPoint, 0.58);
        lineMid.y -= 0.08;
        positions.setXYZ(1, lineMid.x, lineMid.y, lineMid.z);
        positions.setXYZ(2, fishHookPoint.x, fishHookPoint.y, fishHookPoint.z);
        positions.needsUpdate = true;
        orientLineSegment(lineCableSegments[0], rodTip, lineMid);
        orientLineSegment(lineCableSegments[1], lineMid, fishHookPoint);
      } else {
        bobber.visible = true;
        orientLineSegment(hookLeader, bobberPosition, fishHookPoint);
      }
      fishHook.position.copy(fishHookPoint);
      fishHook.rotation.set(Math.PI / 2 + fish.rotation.x, fish.rotation.y, -0.42 + fish.rotation.z);
      fishHook.scale.setScalar(Math.max(0.72, presentationFishScale * 0.55));
    }

    const activeCatchKind = presentation.catchKind === 'nothing'
      || (presentation.phase !== 'reeling' && presentation.phase !== 'caught')
      ? null
      : presentation.catchKind;
    premiumActors.setCatchKind(activeCatchKind);
    const activeCatch = activeCatchKind ? premiumActors.catches[activeCatchKind] : null;
    if (activeCatch) {
      activeCatch.root.position.copy(fish.position);
      if (presentation.phase === 'caught') {
        const trophyStaging = presentation.catchKind === 'colossal'
          ? { position: new THREE.Vector3(-0.92, 3.15, 0.9), scale: 0.44 }
          : presentation.catchKind === 'large'
            ? { position: new THREE.Vector3(-0.85, 2.38, 0.95), scale: 0.68 }
            : presentation.catchKind === 'medium'
              ? { position: new THREE.Vector3(-0.72, 2.32, 1.05), scale: 0.78 }
              // Keep the small catch clearly below the medium silhouette while
              // giving its fins, eye, and broadside body enough phone pixels.
              : { position: new THREE.Vector3(-0.72, 2.4, 1.02), scale: 0.98 };
        activeCatch.root.rotation.set(
          -0.06,
          -0.64,
          -0.08 + Math.sin(elapsed * 3.2) * 0.035,
        );
        activeCatch.root.position.copy(trophyStaging.position);
        activeCatch.root.scale.setScalar(trophyStaging.scale);
        // The invisible legacy fish remains the deterministic centre used by
        // celebration sparkles. Keep it on the premium trophy so effects never
        // burst over the fisherman's face after kind-aware staging.
        fish.position.copy(trophyStaging.position);
      } else {
        activeCatch.root.rotation.copy(fish.rotation);
        activeCatch.root.scale.setScalar(0.84 + extraction * 0.08);
      }
      activeCatch.animate(elapsed, {
        struggle: fishStruggle,
        lift: extraction,
        celebrate: presentation.phase === 'caught' ? Math.min(1, phaseElapsed / 0.7) : 0,
      });
      interaction.updateMatrixWorld(true);
      activeCatch.hookSocket.localToWorld(fishHookPoint.set(0, 0, 0));
      interaction.worldToLocal(fishHookPoint);
    }
    rodControl.lerpVectors(rodStart, rodTip, 0.52);
    rodControl.y += presentation.phase === 'casting'
      ? 0.34 + Math.sin(castProgress * Math.PI) * 0.42
      : 0.24 - presentation.tension * 0.18;
    premiumActors.rig.update({
      base: rodStart,
      control: rodControl,
      tip: rodTip,
      bobber: bobberPosition,
      hook: activeCatch ? fishHookPoint : undefined,
      tension: presentation.tension,
      reelTurns: presentation.phase === 'reeling'
        ? presentation.reelPulse + reelPulseElapsed * 1.8
        : 0,
      elapsed,
    });
    premiumActors.rig.bobberRoot.visible = presentation.phase !== 'caught';

    // Keep the prior geometry as a deterministic state driver until this slice
    // passes visual QC, but never render both actor families at once.
    fisher.visible = false;
    rod.visible = false;
    reel.visible = false;
    bobber.visible = false;
    fish.visible = false;
    line.visible = false;
    lineCableSegments.forEach((segment) => { segment.visible = false; });
    hookLeader.visible = false;
    fishHook.visible = false;
    reelDroplets.forEach((droplet, index) => {
      const emptyHookBubbles = presentation.phase === 'escaped'
        && presentation.catchKind === 'nothing'
        && phaseElapsed < 1.8;
      const activeDroplet = (presentation.phase === 'reeling'
        && reelPulseElapsed < 0.52
        && presentation.pullProgress > 0.08) || emptyHookBubbles;
      droplet.visible = activeDroplet;
      if (!activeDroplet) return;
      const progress = emptyHookBubbles
        ? THREE.MathUtils.clamp(phaseElapsed / 1.8, 0, 1)
        : THREE.MathUtils.clamp(reelPulseElapsed / 0.52, 0, 1);
      const angle = index / reelDroplets.length * Math.PI * 2 + presentation.reelPulse * 0.7;
      const radius = emptyHookBubbles
        ? 0.12 + index % 4 * 0.07 + progress * 0.24
        : 0.16 + progress * (0.45 + index % 3 * 0.08);
      droplet.position.set(
        bobberPosition.x + Math.cos(angle) * radius,
        emptyHookBubbles
          ? 0.72 + progress * (0.55 + index % 3 * 0.11)
          : 0.72 + Math.sin(progress * Math.PI) * (0.42 + index % 2 * 0.16),
        bobberPosition.z + Math.sin(angle) * radius,
      );
      droplet.scale.setScalar(emptyHookBubbles ? 0.65 + (1 - progress) * 0.45 : 1 - progress * 0.45);
    });

    const emptyBurstActive = presentation.phase === 'escaped'
      && presentation.catchKind === 'nothing';
    emptyCatchBurst.visible = emptyBurstActive;
    if (emptyBurstActive) {
      // Keep a calm repeating bubble tell alive for as long as the empty-hook
      // result remains on screen. A one-shot burst could finish before a phone
      // player had time to read the result or before a deterministic capture.
      const burstCycle = (phaseElapsed % 2.6) / 2.6;
      const burstProgress = 1 - Math.abs(burstCycle * 2 - 1);
      emptyCatchBurst.position.set(bobberPosition.x, 0.92, bobberPosition.z);
      emptyCatchBurst.renderOrder = 40;
      // The torus is only a soft pond ripple beneath an irregular family of
      // foam beads, so the empty result reads as water rather than a UI glyph.
      emptyCatchRing.scale.setScalar(0.72 + burstProgress * 1.08);
      emptyCatchRingMaterial.opacity = 0.05 + burstProgress * 0.1;
      emptyCatchFoamMaterial.opacity = 0.48 + burstProgress * 0.34;
      for (let index = 0; index < emptyCatchFoamCount; index += 1) {
        const angle = index / emptyCatchFoamCount * Math.PI * 2
          + Math.sin(index * 2.37) * 0.13
          + burstCycle * 0.2;
        const foamPulse = 0.78 + Math.sin(burstCycle * Math.PI * 2 + index * 1.73) * 0.22;
        const radius = 0.24 + burstProgress * 0.17 + (index % 3) * 0.018;
        emptyCatchFoamTransform.position.set(
          Math.cos(angle) * radius,
          0.012 + Math.sin(angle * 2.4 + index) * 0.012,
          Math.sin(angle) * radius,
        );
        emptyCatchFoamTransform.rotation.set(0, -angle, 0);
        emptyCatchFoamTransform.scale.set(
          foamPulse * (0.82 + index % 4 * 0.1),
          foamPulse * 0.34,
          foamPulse * (0.72 + (index + 2) % 3 * 0.12),
        );
        emptyCatchFoamTransform.updateMatrix();
        emptyCatchFoamPuffs.setMatrixAt(index, emptyCatchFoamTransform.matrix);
      }
      emptyCatchFoamPuffs.instanceMatrix.needsUpdate = true;
      emptyCatchColumn.position.y = 0.42 + burstProgress * 0.28;
      emptyCatchColumn.scale.set(0.86 + burstProgress * 0.32, 0.38 + burstProgress * 0.52, 0.86 + burstProgress * 0.32);
      emptyCatchColumnMaterial.opacity = 0.03 + burstProgress * 0.06;
      emptyCatchBubbles.forEach((bubble, index) => {
        const bubblePhase = (burstCycle + index / emptyCatchBubbles.length) % 1;
        const bubbleLift = 1 - Math.abs(bubblePhase * 2 - 1);
        const angle = index / emptyCatchBubbles.length * Math.PI * 2 + index * 0.47;
        const radius = 0.12 + index % 4 * 0.062 + bubbleLift * (0.09 + index % 3 * 0.045);
        bubble.position.set(
          Math.cos(angle) * radius,
          0.16 + bubblePhase * (0.72 + index % 4 * 0.1),
          Math.sin(angle) * radius,
        );
        bubble.scale.setScalar(0.72 + bubbleLift * 0.52);
        (bubble.material as THREE.MeshBasicMaterial).opacity = 0.36 + bubbleLift * 0.44;
      });
    }

    ripples.forEach((ripple, index) => {
      const rippleCycle = (elapsed * 0.72 + index / ripples.length) % 1;
      ripple.position.x = presentation.phase === 'reeling' ? bobberPosition.x : waterX;
      ripple.position.z = presentation.phase === 'reeling' ? bobberPosition.z : waterZ;
      ripple.scale.setScalar(0.55 + rippleCycle * (presentation.phase === 'bite' ? 4.6 : 2.6));
      (ripple.material as THREE.MeshBasicMaterial).opacity = (1 - rippleCycle) * (presentation.phase === 'bite' ? 0.95 : 0.48);
    });
    sparkles.forEach((sparkle, index) => {
      sparkle.visible = presentation.phase === 'caught';
      if (!sparkle.visible) return;
      const angle = index / sparkles.length * Math.PI * 2 + elapsed * 1.6;
      const radius = 0.7 + (index % 3) * 0.22 + Math.sin(phaseElapsed * 3 + index) * 0.08;
      sparkle.position.set(
        fish.position.x + Math.cos(angle) * radius,
        fish.position.y + 0.5 + Math.sin(angle * 2 + elapsed * 3) * 0.52,
        fish.position.z + Math.sin(angle) * radius,
      );
      sparkle.rotation.set(elapsed * 2 + index, elapsed * 1.4, 0);
    });
  };

  return {
    update,
    setPresentation: (next: Island22FishingInteractionPresentation) => { presentation = next; },
    getCameraPose: () => ({
      position: presentation.phase === 'caught'
        ? cameraPositionCatch
        : presentation.phase === 'casting' || presentation.phase === 'waiting' || presentation.phase === 'countdown' || presentation.phase === 'bite' || presentation.phase === 'reeling'
          ? cameraPositionCast
          : cameraPositionWide,
      target: presentation.phase === 'caught'
        ? cameraTargetCatch
        : cameraTarget,
      shake: presentation.phase === 'bite' ? 0.012 : 0,
      fov: 42,
    }),
  };
}

export function createIsland22FishermansVillageLivingAmbience(
  scene: THREE.Scene,
  qualityProfile: Island3DQualityProfile,
  materials: Island22FishermansVillageMaterials,
  sharedOcean: THREE.Mesh,
): Island22FishermansVillageRuntime {
  const root = new THREE.Group();
  root.name = 'ISLAND_22_FISHERMANS_VILLAGE_WORLD_ROOT';
  scene.add(root);
  const harborSky = addHarborSky(root, qualityProfile.id);

  sharedOcean.geometry.dispose();
  sharedOcean.geometry = createHarborOceanGeometry(
    42,
    qualityProfile.id === 'low' ? 10 : qualityProfile.id === 'medium' ? 16 : 22,
    qualityProfile.id === 'low' ? 40 : qualityProfile.id === 'medium' ? 56 : 72,
  );
  sharedOcean.geometry.name = 'ISLAND_22_RADIAL_SUBDIVIDED_DYNAMIC_OCEAN_GEOMETRY';
  sharedOcean.material = materials.ocean;
  sharedOcean.position.y = -0.82;
  sharedOcean.name = 'ISLAND_22_OCEAN_SURFACE';
  root.add(sharedOcean);
  const harborOceanDetail = addHarborOceanDetail(root, qualityProfile.id);
  addHarborHorizonIslets(root, qualityProfile.id, materials);

  const terrain = new THREE.Mesh(
    createIrregularTerraceGeometry(
      8.35,
      9.2,
      1.65,
      qualitySegments(qualityProfile.id) + 6,
      22,
      1.08,
    ),
    materials.cliff,
  );
  terrain.name = 'ISLAND_22_TERRAIN_SHELL';
  terrain.position.y = -0.44;
  root.add(terrain);
  markPart(terrain, 'terrain-shell', {
    pond: 'ISLAND_22_POND_AXIS',
    marketDock: 'ISLAND_22_FISH_MARKET_DOCK_SOCKET',
  });

  const wetFoundationMaterial = materials.cliff.clone();
  wetFoundationMaterial.name = 'ISLAND_22_WET_FOUNDATION_MATERIAL';
  wetFoundationMaterial.color.set(0xdce9e3);
  wetFoundationMaterial.emissive.set(0x173b3a);
  wetFoundationMaterial.emissiveIntensity = 0.11;
  wetFoundationMaterial.roughness = 0.96;
  const wetFoundation = new THREE.Mesh(
    createIrregularTerraceGeometry(
      8.54,
      9.12,
      1,
      qualitySegments(qualityProfile.id) + 10,
      73,
      1.08,
    ),
    wetFoundationMaterial,
  );
  wetFoundation.name = 'ISLAND_22_CONTINUOUS_WET_ROCK_FOUNDATION';
  wetFoundation.position.y = -0.45;
  wetFoundation.castShadow = true;
  wetFoundation.receiveShadow = true;
  root.add(wetFoundation);

  const topTerrace = new THREE.Mesh(
    createIrregularTerraceGeometry(
      7.9,
      8.25,
      0.5,
      qualitySegments(qualityProfile.id) + 4,
      41,
      1.08,
    ),
    materials.stone,
  );
  topTerrace.name = 'ISLAND_22_TOP_TERRACE';
  topTerrace.position.y = 0.33;
  root.add(topTerrace);
  const middleStoneTerrace = new THREE.Mesh(
    createIrregularTerraceGeometry(
      7.15,
      7.62,
      0.34,
      qualitySegments(qualityProfile.id) + 4,
      59,
      1.055,
    ),
    materials.stone,
  );
  middleStoneTerrace.name = 'ISLAND_22_MIDDLE_STONE_TERRACE';
  // Keep the terrace cap below the canonical pond and Spark36 surfaces. The
  // earlier 0.57 centre buried both under a flat stone disc in the review shot.
  middleStoneTerrace.position.y = 0.42;
  root.add(middleStoneTerrace);
  addSteppedHarborTerraces(root, qualityProfile.id, materials);
  addAuthoredVillageClusters(root, qualityProfile.id, materials);
  addCozyHarborGroundDressing(root, qualityProfile.id, materials);
  addVillageLanternRing(root, materials);

  const pondShadow = cylinder(3.42, 3.56, 0.24, materials.timberDark, qualitySegments(qualityProfile.id));
  pondShadow.name = 'ISLAND_22_POND_BOWL';
  pondShadow.position.y = 0.52;
  const pond = new THREE.Mesh(new THREE.CircleGeometry(3.34, qualitySegments(qualityProfile.id) * 2), materials.pond);
  pond.name = 'ISLAND_22_CENTRAL_POND_SURFACE';
  pond.rotation.x = -Math.PI / 2;
  pond.position.y = 0.66;
  pond.renderOrder = 1;
  const depth = new THREE.Mesh(new THREE.CircleGeometry(0.72, 24), materials.pond.clone());
  (depth.material as THREE.MeshPhysicalMaterial).color.setHex(0x043b50);
  (depth.material as THREE.MeshPhysicalMaterial).opacity = 0.74;
  depth.name = 'ISLAND_22_POND_CENTRAL_DEPTH';
  depth.rotation.x = -Math.PI / 2;
  depth.position.y = 0.672;
  depth.renderOrder = 2;
  root.add(pondShadow, pond, depth);
  const livingPondSurface = addLivingPondSurface(root, qualityProfile.id, materials);
  markPart(pondShadow, 'central-pond-bowl', { vortex: 'ISLAND_22_POND_VORTEX_AXIS' });

  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();

  // Embedded stones break the old smooth cylinder silhouette without adding
  // detached lower chunks; the irregular shell remains the continuous cliff.
  // Keep it instanced: this reads as hand-stacked coastal strata at phone scale
  // while adding one draw call instead of dozens of individual meshes.
  const accentRockCount = qualityProfile.id === 'low' ? 12 : 20;
  const accentRocks = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(0.36, 0),
    materials.stone,
    accentRockCount,
  );
  accentRocks.name = 'ISLAND_22_SHORELINE_ACCENT_ROCKS';
  for (let index = 0; index < accentRockCount; index += 1) {
    const angle = index / accentRockCount * Math.PI * 2 + 0.04;
    const radius = 7.9 + (index % 4) * 0.09 + Math.sin(index * 1.19) * 0.06;
    matrix.compose(
      position.set(
        Math.cos(angle) * radius,
        0.48 + (index % 3) * 0.018,
        Math.sin(angle) * radius * 1.08,
      ),
      quaternion.setFromEuler(new THREE.Euler(
        (index % 3 - 1) * 0.16,
        -angle + (index % 5) * 0.18,
        (index % 4 - 1.5) * 0.1,
      )),
      scale.set(
        0.62 + (index % 5) * 0.08,
        0.5 + (index % 4) * 0.07,
        0.55 + (index % 3) * 0.09,
      ),
    );
    accentRocks.setMatrixAt(index, matrix);
  }
  accentRocks.instanceMatrix.needsUpdate = true;
  accentRocks.castShadow = true;
  accentRocks.receiveShadow = true;
  root.add(accentRocks);

  // Broken turf shelves give the cliff a readable wet-rock → dry-stone →
  // grass value stack instead of one uninterrupted green terrace disc.
  const turfShelfCount = qualityProfile.id === 'low' ? 16 : qualityProfile.id === 'medium' ? 24 : 32;
  const turfShelves = new THREE.Group();
  turfShelves.name = 'ISLAND_22_BROKEN_GRASS_TURF_SHELVES';
  const turfSoil = new THREE.InstancedMesh(
    createIrregularTerraceGeometry(0.48, 0.54, 0.09, 12, 83, 0.72),
    materials.cliff,
    turfShelfCount,
  );
  turfSoil.name = 'ISLAND_22_EMBEDDED_TURF_SOIL_POCKETS';
  const turfCaps = new THREE.InstancedMesh(
    createIrregularPatchGeometry(0.5, 13, 101, 0.72),
    materials.terrace,
    turfShelfCount,
  );
  turfCaps.name = 'ISLAND_22_IRREGULAR_MOSS_GRASS_CAPS';
  const turfPalette = [
    new THREE.Color(0xc4d39b),
    new THREE.Color(0x9db879),
    new THREE.Color(0xb2c48a),
    new THREE.Color(0x7f9f67),
  ];
  const turfClusterAngles = [0.22, 0.92, 1.72, 2.52, 3.28, 4.08, 4.86, 5.62];
  for (let index = 0; index < turfShelfCount; index += 1) {
    const clusterIndex = index % turfClusterAngles.length;
    const clusterLayer = Math.floor(index / turfClusterAngles.length);
    const angle = turfClusterAngles[clusterIndex] + (clusterLayer - 1.5) * 0.055 + Math.sin(index * 1.71) * 0.018;
    const radius = 7.16 + clusterLayer * 0.19 + (index % 2) * 0.07;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.56 + index % 3 * 0.012, Math.sin(angle) * radius * 1.065),
      quaternion.setFromEuler(new THREE.Euler(
        (index % 3 - 1) * 0.08,
        -angle + index % 4 * 0.13,
        (index % 5 - 2) * 0.04,
      )),
      scale.set(0.88 + index % 4 * 0.13, 0.82 + index % 3 * 0.05, 0.76 + index % 5 * 0.07),
    );
    turfSoil.setMatrixAt(index, matrix);
    matrix.setPosition(
      Math.cos(angle) * radius,
      0.615 + index % 3 * 0.012,
      Math.sin(angle) * radius * 1.065,
    );
    turfCaps.setMatrixAt(index, matrix);
    turfCaps.setColorAt(index, turfPalette[index % turfPalette.length]);
  }
  turfSoil.instanceMatrix.needsUpdate = true;
  turfCaps.instanceMatrix.needsUpdate = true;
  if (turfCaps.instanceColor) turfCaps.instanceColor.needsUpdate = true;
  turfSoil.castShadow = true;
  turfSoil.receiveShadow = true;
  turfCaps.receiveShadow = true;
  turfShelves.add(turfSoil, turfCaps);
  root.add(turfShelves);

  const marketDock = createDock('ISLAND_22_FISH_MARKET_OFFLOAD_DOCK', -8.15, -5.55, -0.78, 5.2, materials);
  const marketApron = box(2.6, 0.2, 2.35, materials.timber);
  marketApron.name = 'ISLAND_22_FISH_MARKET_LOADING_APRON';
  marketApron.position.set(0, 0.48, -1.05);
  marketDock.add(marketApron);
  const marketHall = createAuthoredHarborHouse(
    'ISLAND_22_FISH_MARKET_HALL',
    2.2,
    1.55,
    2,
    'warm',
    materials,
  );
  marketHall.position.set(0, 0.58, -1.22);
  const marketGallery = new THREE.Group();
  marketGallery.name = 'ISLAND_22_FISH_MARKET_OCCUPIED_LOADING_GALLERY';
  const galleryDeck = box(1.9, 0.11, 0.52, materials.timberDark);
  galleryDeck.position.set(0, 1.16, 0.86);
  marketGallery.add(galleryDeck);
  [-0.78, -0.26, 0.26, 0.78].forEach((x) => {
    const railPost = cylinder(0.027, 0.032, 0.44, materials.brass, 6);
    railPost.position.set(x, 1.39, 1.05);
    marketGallery.add(railPost);
  });
  const galleryRail = box(1.72, 0.045, 0.045, materials.brass);
  galleryRail.position.set(0, 1.58, 1.05);
  marketGallery.add(galleryRail);
  [-0.52, 0.52].forEach((x) => {
    const galleryWindowFrame = box(0.42, 0.5, 0.075, materials.timberDark);
    galleryWindowFrame.position.set(x, 1.42, 0.82);
    const galleryWindow = box(0.3, 0.37, 0.085, materials.window);
    galleryWindow.position.set(x, 1.42, 0.86);
    const windowCross = box(0.04, 0.4, 0.025, materials.brass);
    windowCross.position.set(x, 1.42, 0.91);
    marketGallery.add(galleryWindowFrame, galleryWindow, windowCross);
  });
  const loadingBeam = box(1.7, 0.12, 0.12, materials.timberDark);
  loadingBeam.position.set(0, 0.96, 1.02);
  marketGallery.add(loadingBeam);
  [-0.62, 0.62].forEach((x) => {
    const support = createBeamBetween(
      new THREE.Vector3(x, 0.65, 0.86),
      new THREE.Vector3(x, 1.03, 1.09),
      0.045,
      materials.timberDark,
      6,
    );
    marketGallery.add(support);
  });
  const marketFishSign = new THREE.Group();
  marketFishSign.name = 'ISLAND_22_FISH_MARKET_GALLERY_SIGN';
  const marketFishBody = new THREE.Mesh(new THREE.SphereGeometry(0.18, 10, 6), materials.brass);
  marketFishBody.scale.set(1.55, 0.65, 0.22);
  const marketFishTail = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.22, 3), materials.brass);
  marketFishTail.rotation.z = -Math.PI / 2;
  marketFishTail.position.x = -0.31;
  marketFishSign.add(marketFishBody, marketFishTail);
  marketFishSign.position.set(0, 1.82, 0.9);
  marketGallery.add(marketFishSign);
  marketHall.add(marketGallery);
  marketDock.add(marketHall);
  const marketAwning = box(2.45, 0.16, 1.52, materials.roof);
  marketAwning.name = 'ISLAND_22_FISH_MARKET_AWNING';
  marketAwning.position.set(0, 1.26, 0.55);
  marketAwning.rotation.x = -0.12;
  marketDock.add(marketAwning);
  const marketPosts = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.055, 0.07, 0.9, 6), materials.timberDark, 4);
  marketPosts.name = 'ISLAND_22_FISH_MARKET_AWNING_POSTS';
  const postMatrix = new THREE.Matrix4();
  [[-0.92, 0.05], [0.92, 0.05], [-0.92, 1.0], [0.92, 1.0]].forEach(([x, z], index) => {
    postMatrix.makeTranslation(x, 0.8, z);
    marketPosts.setMatrixAt(index, postMatrix);
  });
  marketPosts.instanceMatrix.needsUpdate = true;
  marketDock.add(marketPosts);
  const marketCrates = new THREE.Group();
  marketCrates.name = 'ISLAND_22_FISH_MARKET_CARGO';
  [[-0.72, 0.62, 0.2], [-0.18, 0.62, 0.38], [0.4, 0.62, 0.18], [0.76, 0.62, 0.68], [-0.55, 0.62, 0.86]].forEach(([x, y, z], index) => {
    const crate = box(0.38, 0.32, 0.38, index % 2 ? materials.timberDark : materials.timber);
    crate.position.set(x, y, z);
    marketCrates.add(crate);
  });
  marketDock.add(marketCrates);
  const marketSign = box(1.2, 0.42, 0.09, materials.brass);
  marketSign.name = 'ISLAND_22_FISH_MARKET_SIGN';
  marketSign.position.set(0, 1.54, 0.52);
  marketDock.add(marketSign);
  const crane = new THREE.Group();
  crane.name = 'ISLAND_22_FISH_MARKET_OFFLOAD_CRANE';
  const craneMast = cylinder(0.09, 0.12, 2.7, materials.timberDark, 8);
  craneMast.position.y = 1.65;
  const craneArm = box(0.14, 0.14, 2.1, materials.timberDark);
  craneArm.position.set(0, 2.82, 0.65);
  craneArm.rotation.x = -0.18;
  const craneHook = cylinder(0.025, 0.025, 1.2, materials.rope, 6);
  craneHook.position.set(0, 2.12, 1.55);
  crane.add(craneMast, craneArm, craneHook);
  crane.position.set(-1.05, 0, 0.7);
  marketDock.add(crane);
  marketApron.visible = false;
  marketHall.visible = false;
  marketHall.name = 'ISLAND_22_LEGACY_FISH_MARKET_HALL';
  marketAwning.visible = false;
  marketPosts.visible = false;
  marketCrates.visible = false;
  marketSign.visible = false;
  crane.visible = false;
  const premiumMarketHall = ISLAND_22_PREMIUM_LANDMARK_FACTORIES.fishMarket({
    level: 3,
    quality: qualityProfile.id,
    materials,
  });
  premiumMarketHall.name = 'ISLAND_22_FISH_MARKET_HALL';
  premiumMarketHall.position.set(0, 0.28, -0.5);
  marketDock.add(premiumMarketHall);

  root.add(marketDock);
  markPart(marketDock, 'fish-market-offload-dock', {
    offload: 'ISLAND_22_FISH_MARKET_OFFLOAD_SOCKET',
    onload: 'ISLAND_22_FISH_MARKET_ONLOAD_SOCKET',
  });

  const frontDock = createDock('ISLAND_22_FRONT_DOCK', -1.8, 8.9, 0, 3.8, materials);
  const eastDock = createDock('ISLAND_22_EAST_DOCK', 8.2, 3.8, Math.PI / 2, 3.1, materials);
  const westDock = createDock('ISLAND_22_WEST_DOCK', -8.25, 2.85, -Math.PI / 2, 3.0, materials);
  root.add(frontDock, eastDock, westDock);

  const boats: THREE.Group[] = [];
  const boatPlacements = [
    [-9.1, -0.55, -5.8, -0.6], [-7.35, -0.55, -7.25, 0.5],
    [-3.6, -0.62, 10.0, 0.1], [0.4, -0.62, 10.45, -0.18],
    [8.9, -0.6, 5.7, 1.15], [9.4, -0.62, -1.8, 1.42],
  ] as const;
  boatPlacements.slice(0, Math.max(3, Math.round(boatPlacements.length * qualityScale(qualityProfile.id)))).forEach(([x, y, z, yaw], index) => {
    const boat = createBoat(materials, qualityProfile.id);
    boat.name = `ISLAND_22_FISHING_BOAT_${index + 1}`;
    boat.position.set(x, y, z);
    boat.rotation.y = yaw;
    root.add(boat);
    boats.push(boat);
  });

  addPondFishingPlatforms(root, qualityProfile.id, materials);
  const updateFishers = addFisherCrowd(root, qualityProfile.id, materials);
  addFishingProps(root, materials);

  const pondSkiffs: THREE.Group[] = [];
  [[-1.35, -0.6, 0.18], [1.25, -0.85, -0.22], [-0.35, 1.35, 0.5]].forEach(([x, z, yaw], index) => {
    const skiff = createBoat(materials, qualityProfile.id);
    skiff.name = `ISLAND_22_POND_SKIFF_${index + 1}`;
    skiff.scale.setScalar(0.48);
    skiff.position.set(x, 0.76, z);
    skiff.rotation.y = yaw;
    root.add(skiff);
    pondSkiffs.push(skiff);
  });

  const treeCount = Math.max(10, Math.round(28 * qualityScale(qualityProfile.id)));
  const treeLayerCount = treeCount * 3;
  const coniferMaterial = materials.foliage.clone();
  coniferMaterial.name = 'ISLAND_22_CONIFER_INSTANCE_PALETTE_BASE';
  coniferMaterial.color.set(0xffffff);
  attachHarborWindShader(coniferMaterial, 0.075);
  const treeCrowns = new THREE.InstancedMesh(
    new THREE.ConeGeometry(0.46, 0.82, 7),
    coniferMaterial,
    treeLayerCount,
  );
  treeCrowns.name = 'ISLAND_22_LAYERED_CONIFER_CROWNS';
  const coniferPalette = [
    new THREE.Color(0x294f3d),
    new THREE.Color(0x3f6949),
    new THREE.Color(0x638052),
  ];
  const treeTrunks = new THREE.InstancedMesh(
    new THREE.CylinderGeometry(0.07, 0.1, 0.72, 6),
    materials.timberDark,
    treeCount,
  );
  treeTrunks.name = 'ISLAND_22_HARDY_CONIFER_TRUNKS';
  const hatcheryAngle = Math.atan2(6.2 / 1.05, 5.75);
  for (let index = 0; index < treeCount; index += 1) {
    const angle = index / treeCount * Math.PI * 2 + 0.26;
    const hatcheryOccluder = Math.abs(Math.atan2(Math.sin(angle - hatcheryAngle), Math.cos(angle - hatcheryAngle))) < 0.12;
    const radius = (index % 3 === 0 ? 7.42 : index % 2 ? 6.74 : 7.05) + (hatcheryOccluder ? 0.45 : 0);
    const treeScale = (0.72 + (index % 5) * 0.08) * (hatcheryOccluder ? 0.75 : 1);
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius * 1.05;
    matrix.compose(
      position.set(x, 1.12, z),
      quaternion.setFromEuler(new THREE.Euler(0, angle, 0)),
      scale.setScalar(treeScale),
    );
    treeTrunks.setMatrixAt(index, matrix);
    for (let layer = 0; layer < 3; layer += 1) {
      const layerScale = treeScale * (1 - layer * 0.19);
      matrix.compose(
        position.set(x, 1.34 + layer * 0.46 * treeScale, z),
        quaternion.setFromEuler(new THREE.Euler(0, angle + layer * 0.22, 0)),
        scale.set(layerScale * (1.08 - layer * 0.09), layerScale, layerScale),
      );
      treeCrowns.setMatrixAt(index * 3 + layer, matrix);
      treeCrowns.setColorAt(
        index * 3 + layer,
        coniferPalette[(index + layer) % coniferPalette.length],
      );
    }
  }
  treeCrowns.instanceMatrix.needsUpdate = true;
  if (treeCrowns.instanceColor) treeCrowns.instanceColor.needsUpdate = true;
  treeTrunks.instanceMatrix.needsUpdate = true;
  treeCrowns.castShadow = true;
  treeTrunks.castShadow = true;
  root.add(treeTrunks, treeCrowns);

  const grassCount = qualityProfile.id === 'low' ? 38 : qualityProfile.id === 'medium' ? 72 : 108;
  const grassTufts = new THREE.InstancedMesh(
    createGrassTuftGeometry(),
    materials.grassBlade,
    grassCount,
  );
  grassTufts.name = 'ISLAND_22_LAYERED_GRASS_BLADE_TUFTS';
  const grassPalette = [
    new THREE.Color(0x5f7e50),
    new THREE.Color(0x7f985c),
    new THREE.Color(0xa3ad69),
    new THREE.Color(0x486c47),
  ];
  for (let index = 0; index < grassCount; index += 1) {
    const clusterIndex = index % turfClusterAngles.length;
    const clusterLayer = Math.floor(index / turfClusterAngles.length);
    const angle = turfClusterAngles[clusterIndex]
      + ((clusterLayer % 9) - 4) * 0.027
      + Math.sin(index * 1.31) * 0.012;
    const radius = 6.72 + (clusterLayer % 6) * 0.14 + Math.sin(index * 0.73) * 0.07;
    const tuftScale = 0.66 + (index % 5) * 0.11;
    matrix.compose(
      position.set(Math.cos(angle) * radius, 0.61 + index % 3 * 0.025, Math.sin(angle) * radius * 1.045),
      quaternion.setFromEuler(new THREE.Euler(0, angle * 1.37, (index % 3 - 1) * 0.07)),
      scale.set(tuftScale * (1 + index % 3 * 0.08), tuftScale, tuftScale),
    );
    grassTufts.setMatrixAt(index, matrix);
    grassTufts.setColorAt(index, grassPalette[index % grassPalette.length]);
  }
  grassTufts.instanceMatrix.needsUpdate = true;
  if (grassTufts.instanceColor) grassTufts.instanceColor.needsUpdate = true;
  grassTufts.castShadow = true;
  grassTufts.receiveShadow = true;
  root.add(grassTufts);

  const foamRoot = new THREE.Group();
  foamRoot.name = 'ISLAND_22_SHORE_FOAM_BROKEN_ARCS';
  const foamArcs: THREE.Mesh[] = [];
  const foamArcCount = qualityProfile.id === 'low' ? 4 : 7;
  for (let index = 0; index < foamArcCount; index += 1) {
    const foamArc = new THREE.Mesh(
      new THREE.TorusGeometry(8.86 + index % 3 * 0.12, 0.075 + index % 2 * 0.025, 5, 22, 0.55 + index % 3 * 0.18),
      materials.foam,
    );
    foamArc.name = `ISLAND_22_SHORE_FOAM_ARC_${index + 1}`;
    foamArc.rotation.set(Math.PI / 2, 0, index / foamArcCount * Math.PI * 2 + 0.22);
    foamArc.scale.z = 1.08;
    foamArc.position.y = -0.7 + index % 2 * 0.016;
    foamRoot.add(foamArc);
    foamArcs.push(foamArc);
  }
  root.add(foamRoot);

  setShadow(root, false);
  root.userData.slice = 'slice-01-macro-composition';
  root.userData.sourceSha256 = 'a631297b2d2c11fcb3939de8ccc5bcdd69c52ab3bd12d40597859fbb6019ae65';
  root.userData.sculptRuntime = {
    parts: [
      { id: 'terrain-shell', name: 'terrain-shell', kind: 'part', nodeName: terrain.name, module: 'island-022-slice-01', triangles: 0 },
      { id: 'central-pond-bowl', name: 'central-pond-bowl', kind: 'part', nodeName: pondShadow.name, module: 'island-022-slice-01', triangles: 0 },
      { id: 'outer-docks-and-piers', name: 'outer-docks-and-piers', kind: 'part', nodeName: frontDock.name, module: 'island-022-slice-01', triangles: 0 },
      { id: 'fishing-boat-flotilla', name: 'fishing-boat-flotilla', kind: 'part', nodeName: boats[0]?.name ?? 'none', module: 'island-022-slice-01', triangles: 0 },
    ],
    clickable: true,
    explodable: true,
    sockets: {
      pondVortex: 'ISLAND_22_POND_VORTEX_AXIS',
      fishMarketOffload: 'ISLAND_22_FISH_MARKET_OFFLOAD_SOCKET',
      fishMarketOnload: 'ISLAND_22_FISH_MARKET_ONLOAD_SOCKET',
      dragonStudyDeferred: 'ISLAND_22_DRAGON_STUDY_NOT_BUILT',
    },
  };

  const waterDragonMission = createIsland22WaterDragonMission({
    parent: root,
    pond,
    depth,
    pondShadow,
    boats,
    pondSkiffs,
    updateFishers,
  });
  const fishingInteraction = createHeroFishingInteraction(root, materials, qualityProfile.id);
  let waterDragonPresentation: Island22WaterDragonPresentation = { fishCaughtKg: 0 };
  const calmOceanColor = new THREE.Color(0x0d78a4);
  const windyOceanColor = new THREE.Color(0x0a607b);

  return {
    root,
    animate: (elapsed) => {
      const motion = Math.sin(elapsed * 0.75);
      const weather = resolveIsland22HarborWeatherState(elapsed);
      const missionActive = waterDragonPresentation.fishCaughtKg >= ISLAND_22_DRAGON_TRIGGER_KG
        && (waterDragonPresentation.impactRepairProgress ?? 0) < 1;
      root.userData.harborWeatherPhase = weather.phase;
      root.userData.harborWeatherIntensity = weather.intensity;
      harborSky.update(elapsed, weather);
      harborOceanDetail.update(elapsed, weather);
      updateHarborWeatherUniforms(materials.ocean, elapsed, 0.018 + weather.waveStrength * 0.22);
      updateHarborWeatherUniforms(materials.foliage, elapsed, weather.wind);
      updateHarborWeatherUniforms(materials.grassBlade, elapsed, weather.wind);
      updateHarborWeatherUniforms(coniferMaterial, elapsed, weather.wind);
      materials.ocean.color.copy(calmOceanColor).lerp(windyOceanColor, weather.intensity * 0.72);
      materials.ocean.roughness = THREE.MathUtils.lerp(0.12, 0.28, weather.waveStrength);
      materials.ocean.clearcoatRoughness = THREE.MathUtils.lerp(0.14, 0.31, weather.waveStrength);
      materials.ocean.opacity = THREE.MathUtils.lerp(0.54, 0.69, weather.waveStrength);
      sharedOcean.position.y = -0.82
        + Math.sin(elapsed * (0.34 + weather.wind * 0.32)) * (0.003 + weather.waveStrength * 0.012);
      pond.position.y = 0.66 + motion * (0.011 + weather.waveStrength * 0.005);
      (depth.material as THREE.MeshPhysicalMaterial).opacity = 0.71 + Math.sin(elapsed * 0.42) * 0.04;
      livingPondSurface.update(elapsed, pond.position.y, missionActive);
      boats.forEach((boat, index) => {
        boat.rotation.z = Math.sin(elapsed * (0.62 + weather.wind * 0.32) + index)
          * (0.022 + weather.waveStrength * 0.055);
        boat.position.y = boatPlacements[index][1]
          + Math.sin(elapsed * (0.68 + weather.wind * 0.38) + index * 0.8)
          * (0.03 + weather.waveStrength * 0.055);
      });
      pondSkiffs.forEach((skiff, index) => {
        skiff.position.y = 0.76 + Math.sin(elapsed * 0.86 + index * 1.7)
          * (0.016 + weather.waveStrength * 0.012);
        skiff.rotation.z = Math.sin(elapsed * 0.72 + index)
          * (0.016 + weather.wind * 0.018);
      });
      materials.foam.opacity = 0.3 + weather.waveStrength * 0.28 + Math.sin(elapsed * 0.52) * 0.04;
      foamRoot.rotation.y = Math.sin(elapsed * 0.31) * weather.wind * 0.016;
      foamArcs.forEach((foamArc, index) => {
        const shorePulse = Math.sin(elapsed * (0.48 + weather.wind * 0.48) + index * 1.1);
        foamArc.scale.z = 1.06 + weather.waveStrength * 0.09 + shorePulse * 0.018;
        foamArc.position.y = -0.7 + index % 2 * 0.016
          + shorePulse * (0.006 + weather.waveStrength * 0.016);
      });
      fishingInteraction.update(elapsed);
      waterDragonMission.update(elapsed, waterDragonPresentation);
    },
    updateWaterDragonMission: (presentation) => {
      waterDragonPresentation = presentation;
      waterDragonMission.update(presentation.previewElapsedSeconds ?? 0, presentation);
    },
    updateFishingInteraction: fishingInteraction.setPresentation,
    getFishingInteractionCameraPose: fishingInteraction.getCameraPose,
    getWaterDragonMissionCameraPose: waterDragonMission.getCameraPose,
    getWaterDragonMissionPhase: waterDragonMission.getPhase,
  };
}
