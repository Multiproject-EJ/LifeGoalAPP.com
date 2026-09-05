import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type {
  Island3DQuality,
  Island3DQualityProfile,
  Island5LandmarkDefinition,
} from './island5ThreePilotContract';
import {
  ISLAND_3D_ROUTE_RADIUS,
  ISLAND_3D_TILE_RADIAL_DEPTH,
  ISLAND_5_LANDMARKS,
} from './island5ThreePilotContract';
import {
  applyIslandConstructionAuthoring,
  type IslandConstructionFactoryOptions,
} from './IslandConstructionAuthoring';

type BuildLevel = 0 | 1 | 2 | 3;

export const ISLAND_20_LAVA_LABYRINTH_WORLD_NAME = 'Lava Labyrinth';
export const ISLAND_20_IRON_SKIFF_MISSION_ID = 'escape-lava-labyrinth';
export const ISLAND_20_IRON_SKIFF_MAX_STAGE = 4;
export const ISLAND_20_HYBRID_ENVIRONMENT_PLATE = '/assets/islands/island-020/background/lava-labyrinth-environment-plate-v001.webp';
export const ISLAND_20_AUTHORED_CITY_GLB = '/assets/islands/island-020/models/lava-labyrinth-v10-rectilinear-city.glb';
export const ISLAND_20_AUTHORED_CITY_SCALE = 0.42;
export const ISLAND_20_AUTHORED_CITY_FAMILY = 'rectilinear-terraced-lava-city-glb-v10';

export const ISLAND_20_LAVA_LABYRINTH_LANDMARK_LABELS = {
  boss: 'Crucible Citadel',
  hatchery: 'Magma Crucible Hatchery',
  habit: 'Fire Path Sanctum',
  wisdom: 'Obsidian Archive',
  event: 'Ashen Trialworks',
} as const;

export const ISLAND_20_RUNTIME_PART_IDS = [
  'p01','p02','p03','p04','p05','p06','p07','p08',
  'p09','p10','p11','p12','p13','p14','p15','p16',
  'p17','p18','p19','p20','p21','p22','p23','p24',
  'p25','p26','p27','p28','p29','p30','p31','p32',
] as const;

export type Island20RuntimePartId = typeof ISLAND_20_RUNTIME_PART_IDS[number];

export interface Island20RuntimePart {
  id: Island20RuntimePartId;
  name: Island20RuntimePartId;
  kind: 'part';
  nodeName: string;
  module: string;
  triangles: number;
}

export interface Island20LavaLabyrinthMaterials {
  obsidian: THREE.MeshStandardMaterial;
  deepObsidian: THREE.MeshStandardMaterial;
  cutBasalt: THREE.MeshStandardMaterial;
  blackIron: THREE.MeshStandardMaterial;
  agedBrass: THREE.MeshStandardMaterial;
  magma: THREE.MeshPhysicalMaterial;
  magmaCore: THREE.MeshStandardMaterial;
  emberGlass: THREE.MeshPhysicalMaterial;
  ash: THREE.MeshStandardMaterial;
  soot: THREE.MeshBasicMaterial;
}

export interface Island20IronSkiffPresentation {
  activatedStages: 0 | 1 | 2 | 3 | 4;
  constructionSequence?: number;
  claimedPickupTileIndices?: readonly number[];
}

export interface Island20SkiffNavigationPresentation {
  active: boolean;
  steering: -1 | 0 | 1;
  throttle: 0 | 1;
  sequence: number;
}

export interface Island20LavaLabyrinthAmbienceRuntime {
  root: THREE.Group;
  animate: (elapsed: number) => void;
  setIronSkiffStage: (stage: number, replay?: boolean) => void;
  updateIronSkiffNavigation: (presentation: Island20SkiffNavigationPresentation) => void;
  consumeIronSkiffCompletion: () => boolean;
  updateView?: (cameraPosition: THREE.Vector3, cameraTarget?: THREE.Vector3) => void;
  dispose?: () => void;
}

export interface Island20LavaFlowOverlayRuntime {
  root: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  animate: (elapsed: number, reducedMotion?: boolean) => void;
}

export const ISLAND_20_LAVA_FLOW_ADDITIONAL_DRAW_CALLS = 1;
export const ISLAND_20_LAVA_FLOW_ADDITIONAL_TRIANGLES = 2;
export const ISLAND_20_LAVA_VOLUME_ADDITIONAL_DRAW_CALLS_MAX = 0;
export const ISLAND_20_LAVA_VOLUME_ADDITIONAL_TRIANGLES_MAX = 0;

function countVisibleTriangles(node: THREE.Object3D): number {
  let triangles = 0;
  node.traverseVisible((child) => {
    if (!(child instanceof THREE.Mesh) && !(child instanceof THREE.InstancedMesh)) return;
    const geometry = child.geometry;
    const perInstance = geometry.index
      ? geometry.index.count / 3
      : (geometry.getAttribute('position')?.count ?? 0) / 3;
    triangles += perInstance * (child instanceof THREE.InstancedMesh ? child.count : 1);
  });
  return Math.round(triangles);
}

export function registerIsland20RuntimePart(
  id: Island20RuntimePartId,
  node: THREE.Object3D,
  module: string,
  triangles = 0,
): Island20RuntimePart {
  node.userData.partId = id;
  node.userData.partKind = 'part';
  node.userData.partModule = module;
  return {
    id,
    name: id,
    kind: 'part',
    nodeName: node.name,
    module,
    triangles: triangles > 0 ? triangles : countVisibleTriangles(node),
  };
}

export function collectIsland20RuntimePartManifest(roots: THREE.Object3D[]) {
  const parts: Island20RuntimePart[] = [];
  const seen = new Set<string>();
  let integralMeshes = 0;
  roots.forEach((root) => {
    root.traverse((node) => {
      if (node instanceof THREE.Mesh || node instanceof THREE.InstancedMesh || node instanceof THREE.Points) integralMeshes += 1;
      const runtimeParts = node.userData.sculptRuntime?.parts;
      if (!Array.isArray(runtimeParts)) return;
      runtimeParts.forEach((candidate: Island20RuntimePart) => {
        if (!candidate?.name || !ISLAND_20_RUNTIME_PART_IDS.includes(candidate.name)) return;
        if (seen.has(candidate.name)) return;
        seen.add(candidate.name);
        parts.push({ ...candidate });
      });
    });
  });
  return { model: 'island-020-lava-labyrinth', parts, unnamedMeshes: 0, integralMeshes };
}

const qualitySegments = (quality: Island3DQuality) => quality === 'high' ? 16 : quality === 'medium' ? 12 : 8;
const qualityScale = (quality: Island3DQuality) => quality === 'high' ? 1 : quality === 'medium' ? 0.7 : 0.44;
const lavaNoiseOctaves = (quality: Island3DQuality) => quality === 'high' ? 4 : quality === 'medium' ? 3 : 2;

function batchStaticMeshes(root: THREE.Object3D, batchName: string, exclude: (mesh: THREE.Mesh) => boolean = () => false) {
  root.updateMatrixWorld(true);
  const inverseRootMatrix = root.matrixWorld.clone().invert();
  type StaticBatch = {
    material: THREE.Material;
    geometries: THREE.BufferGeometry[];
    sources: THREE.Mesh[];
    castShadow: boolean;
    receiveShadow: boolean;
  };
  const batches = new Map<string, StaticBatch>();
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh) || !object.visible || exclude(object)) return;
    const material = Array.isArray(object.material) ? null : object.material;
    if (!material) return;
    const geometry = object.geometry.clone();
    geometry.applyMatrix4(inverseRootMatrix.clone().multiply(object.matrixWorld));
    const attributeSignature = Object.keys(geometry.attributes).sort().join(',');
    const batchKey = `${material.uuid}:${geometry.index ? 'indexed' : 'plain'}:${attributeSignature}`;
    const batch: StaticBatch = batches.get(batchKey) ?? {
      material,
      geometries: [] as THREE.BufferGeometry[],
      sources: [],
      castShadow: false,
      receiveShadow: false,
    };
    batch.geometries.push(geometry);
    batch.sources.push(object);
    batch.castShadow ||= object.castShadow;
    batch.receiveShadow ||= object.receiveShadow;
    batches.set(batchKey, batch);
  });
  let batchIndex = 0;
  batches.forEach((batch) => {
    const merged = mergeGeometries(batch.geometries, false);
    batch.geometries.forEach((geometry) => geometry.dispose());
    if (!merged) return;
    // Keep the named source nodes and authored metadata available to sockets,
    // tests and future interactions without paying their original draw calls.
    batch.sources.forEach((source) => { source.visible = false; });
    const mesh = new THREE.Mesh(merged, batch.material);
    mesh.name = `${batchName}_${++batchIndex}`;
    mesh.castShadow = batch.castShadow;
    mesh.receiveShadow = batch.receiveShadow;
    root.add(mesh);
  });
}

export const ISLAND_20_ROUTE_CLEARANCE_INNER_RADIUS = ISLAND_3D_ROUTE_RADIUS - ISLAND_3D_TILE_RADIAL_DEPTH / 2 - 0.22;
export const ISLAND_20_ROUTE_CLEARANCE_OUTER_RADIUS = ISLAND_3D_ROUTE_RADIUS + ISLAND_3D_TILE_RADIAL_DEPTH / 2 + 0.22;

export function isIsland20RouteCorridorClear(x: number, z: number, footprintRadius = 0): boolean {
  const distance = Math.hypot(x, z);
  const footprint = Math.max(0, footprintRadius);
  return distance + footprint <= ISLAND_20_ROUTE_CLEARANCE_INNER_RADIUS
    || distance - footprint >= ISLAND_20_ROUTE_CLEARANCE_OUTER_RADIUS;
}

function makeTexture(size: number, kind: 'stone' | 'metal' | 'magma' | 'ash', channel: 'albedo' | 'roughness' | 'height' | 'ao') {
  const data = new Uint8Array(size * size * 4);
  const color = new THREE.Color();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const offset = (y * size + x) * 4;
      const coarse = Math.sin(x * 0.105) * Math.cos(y * 0.087);
      const ridge = Math.sin((x + y * 1.7) * 0.31);
      const grit = (((x * 47 + y * 71 + x * y * 13) % 41) - 20) / 20;
      const crack = ((x * 3 + y * 5 + Math.floor(coarse * 7)) % 43) < 2 ? -1 : 0;
      if (channel === 'albedo') {
        if (kind === 'stone') color.setRGB(0.29 + coarse * 0.045 + grit * 0.02, 0.225 + coarse * 0.032, 0.22 + ridge * 0.025);
        if (kind === 'metal') color.setRGB(0.36 + ridge * 0.055, 0.27 + coarse * 0.04, 0.19 + grit * 0.025);
        if (kind === 'magma') {
          const broadFlow = 0.5 + 0.5 * Math.sin(y * 0.071 + Math.sin(x * 0.047) * 2.2);
          const coolingRaft = THREE.MathUtils.smoothstep(coarse * 0.62 + ridge * 0.38, 0.08, 0.58);
          const fissure = 1 - THREE.MathUtils.smoothstep(Math.abs(ridge * 0.72 + coarse * 0.28), 0.02, 0.24);
          color.setRGB(
            0.16 + broadFlow * 0.5 + fissure * 0.28,
            0.012 + broadFlow * 0.055 + fissure * 0.24,
            0.001 + fissure * 0.015,
          );
          color.lerp(new THREE.Color(0.018, 0.009, 0.006), coolingRaft * 0.72);
        }
        if (kind === 'ash') color.setRGB(0.22 + coarse * 0.045, 0.17 + grit * 0.026, 0.18 + ridge * 0.03);
        if (crack < 0 && kind === 'stone') color.multiplyScalar(0.42);
        data[offset] = Math.round(THREE.MathUtils.clamp(color.r, 0, 1) * 255);
        data[offset + 1] = Math.round(THREE.MathUtils.clamp(color.g, 0, 1) * 255);
        data[offset + 2] = Math.round(THREE.MathUtils.clamp(color.b, 0, 1) * 255);
      } else {
        let value = 128;
        if (channel === 'roughness') value = kind === 'metal' ? 105 + grit * 24 : kind === 'magma' ? 92 + coarse * 54 + ridge * 18 : 210 + grit * 25;
        if (channel === 'height') value = kind === 'magma' ? 118 + coarse * 34 + ridge * 24 : 128 + coarse * 28 + ridge * 12 + crack * 38;
        if (channel === 'ao') value = 225 + crack * 88 - Math.max(0, -coarse) * 22;
        const clamped = Math.round(THREE.MathUtils.clamp(value, 0, 255));
        data[offset] = clamped;
        data[offset + 1] = clamped;
        data[offset + 2] = clamped;
      }
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.name = `ISLAND_20_${kind.toUpperCase()}_${channel.toUpperCase()}`;
  texture.colorSpace = channel === 'albedo' ? THREE.SRGBColorSpace : THREE.NoColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(kind === 'stone' ? 3.5 : 2.5, kind === 'stone' ? 3.5 : 2.5);
  texture.needsUpdate = true;
  return texture;
}

export function createIsland20LavaLabyrinthMaterials(quality: Island3DQuality = 'high'): Island20LavaLabyrinthMaterials {
  const textureSize = quality === 'high' ? 256 : quality === 'medium' ? 128 : 64;
  const stoneAlbedo = makeTexture(textureSize, 'stone', 'albedo');
  const stoneRoughness = makeTexture(textureSize, 'stone', 'roughness');
  const stoneHeight = makeTexture(textureSize, 'stone', 'height');
  const stoneAo = makeTexture(textureSize, 'stone', 'ao');
  const metalAlbedo = makeTexture(textureSize, 'metal', 'albedo');
  const metalRoughness = makeTexture(textureSize, 'metal', 'roughness');
  const metalHeight = makeTexture(textureSize, 'metal', 'height');
  const magmaAlbedo = makeTexture(textureSize, 'magma', 'albedo');
  const magmaRoughness = makeTexture(textureSize, 'magma', 'roughness');
  const magmaHeight = makeTexture(textureSize, 'magma', 'height');
  const ashAlbedo = makeTexture(textureSize, 'ash', 'albedo');
  const ashRoughness = makeTexture(textureSize, 'ash', 'roughness');
  return {
    obsidian: new THREE.MeshStandardMaterial({ color: 0x2a3037, map: stoneAlbedo, roughnessMap: stoneRoughness, bumpMap: stoneHeight, aoMap: stoneAo, bumpScale: 0.085, roughness: 0.9, metalness: 0.035, emissive: 0x090101, emissiveIntensity: 0.05, flatShading: true }),
    deepObsidian: new THREE.MeshStandardMaterial({ color: 0x14191f, map: stoneAlbedo, roughnessMap: stoneRoughness, bumpMap: stoneHeight, bumpScale: 0.12, roughness: 0.96, metalness: 0.03, emissive: 0x070101, emissiveIntensity: 0.035, flatShading: true }),
    cutBasalt: new THREE.MeshStandardMaterial({ color: 0x5e5654, map: stoneAlbedo, roughnessMap: stoneRoughness, bumpMap: stoneHeight, aoMap: stoneAo, bumpScale: 0.055, roughness: 0.8, metalness: 0.035, emissive: 0x160301, emissiveIntensity: 0.11 }),
    blackIron: new THREE.MeshStandardMaterial({ color: 0x202830, map: metalAlbedo, roughnessMap: metalRoughness, bumpMap: metalHeight, bumpScale: 0.024, roughness: 0.4, metalness: 0.88, emissive: 0x040101, emissiveIntensity: 0.025 }),
    agedBrass: new THREE.MeshStandardMaterial({ color: 0xb66f32, map: metalAlbedo, roughnessMap: metalRoughness, bumpMap: metalHeight, bumpScale: 0.018, roughness: 0.32, metalness: 0.78, emissive: 0x351001, emissiveIntensity: 0.16 }),
    magma: new THREE.MeshPhysicalMaterial({ color: 0xd83a06, map: magmaAlbedo, roughnessMap: magmaRoughness, bumpMap: magmaHeight, bumpScale: 0.055, roughness: 0.3, clearcoat: 0.28, clearcoatRoughness: 0.2, emissive: 0xb52300, emissiveIntensity: 0.82 }),
    magmaCore: new THREE.MeshStandardMaterial({ color: 0xff8a14, map: magmaAlbedo, roughnessMap: magmaRoughness, bumpMap: magmaHeight, bumpScale: 0.03, roughness: 0.26, metalness: 0, emissive: 0xff3d02, emissiveIntensity: 1.55 }),
    emberGlass: new THREE.MeshPhysicalMaterial({ color: 0xff5a18, roughness: 0.12, clearcoat: 1, clearcoatRoughness: 0.04, transmission: 0.08, transparent: true, opacity: 0.92, emissive: 0xff2c06, emissiveIntensity: 1.45 }),
    ash: new THREE.MeshStandardMaterial({ color: 0x2b2225, map: ashAlbedo, roughnessMap: ashRoughness, roughness: 0.95, transparent: true, opacity: 0.76, depthWrite: false }),
    soot: new THREE.MeshBasicMaterial({ color: 0x07080a, transparent: true, opacity: 0.7, depthWrite: false }),
  };
}

export function createIsland20LavaLabyrinthBackdrop() {
  const texture = new THREE.TextureLoader().load(ISLAND_20_HYBRID_ENVIRONMENT_PLATE);
  texture.name = 'ISLAND_20_EMBER_SKY_BACKDROP';
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.needsUpdate = true;
  return texture;
}

const ISLAND_20_LAVA_NOISE_GLSL = `
  float lavaHash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float lavaNoise(vec2 p) {
    vec2 cell = floor(p);
    vec2 local = fract(p);
    vec2 eased = local * local * (3.0 - 2.0 * local);
    float a = lavaHash(cell);
    float b = lavaHash(cell + vec2(1.0, 0.0));
    float c = lavaHash(cell + vec2(0.0, 1.0));
    float d = lavaHash(cell + vec2(1.0, 1.0));
    return mix(mix(a, b, eased.x), mix(c, d, eased.x), eased.y);
  }

  float lavaFbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rotation = mat2(0.82, -0.57, 0.57, 0.82);
    for (int octave = 0; octave < ISLAND20_LAVA_OCTAVES; octave++) {
      value += lavaNoise(p) * amplitude;
      p = rotation * p * 2.03 + vec2(3.7, 1.9);
      amplitude *= 0.5;
    }
    return value;
  }
`;

function createIsland20AuthoredLavaMaterial(quality: Island3DQuality) {
  return new THREE.ShaderMaterial({
    name: 'ISLAND_20_AUTHORED_DIRECTIONAL_LAVA_SHADER',
    defines: {
      ISLAND20_LAVA_OCTAVES: lavaNoiseOctaves(quality),
    },
    uniforms: {
      uElapsed: { value: 0 },
      uThermalPulse: { value: 0.5 },
    },
    vertexShader: `
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        float horizontalSurface = smoothstep(0.24, 0.82, abs(normal.y));
        float horizontalWave = sin(dot(position.xz, vec2(0.86, 0.47)) * 3.1 - uElapsed * 0.92) * 0.034
          + sin(dot(position.xz, vec2(-0.38, 1.12)) * 5.4 + uElapsed * 0.57) * 0.014;
        float fallingWave = sin(position.x * 4.2 - position.y * 3.4 + uElapsed * 1.46) * 0.024
          + sin(position.z * 5.1 - position.y * 5.8 + uElapsed * 2.08) * 0.011;
        float thermalLift = mix(0.76, 1.0, uThermalPulse);
        vec3 displacedPosition = position + normal * mix(fallingWave, horizontalWave, horizontalSurface) * thermalLift;
        vLocalPosition = displacedPosition;
        vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * normal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uElapsed;
      uniform float uThermalPulse;
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      ${ISLAND_20_LAVA_NOISE_GLSL}

      void main() {
        vec3 normal = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float wallness = smoothstep(0.18, 0.78, 1.0 - abs(normal.y));

        // Horizontal canals crawl through the city; vertical faces advect
        // downward under gravity. Domain warping prevents straight candy-stripes.
        vec2 horizontalUv = vWorldPosition.xz * 1.16 + vec2(uElapsed * 0.075, -uElapsed * 0.19);
        vec2 verticalUv = vec2(vWorldPosition.x, vWorldPosition.y) * vec2(1.28, 1.02)
          + vec2(uElapsed * 0.045, uElapsed * 0.42);
        vec2 flowUv = mix(horizontalUv, verticalUv, wallness);
        float warpA = lavaFbm(flowUv * 0.72 + vec2(1.7, -2.4));
        float warpB = lavaFbm(flowUv * 1.45 + vec2(-3.1, 4.8));
        vec2 warpedUv = flowUv + vec2(warpA - 0.5, warpB - 0.5) * 0.72;

        float macroFlow = lavaFbm(warpedUv * 0.78);
        float mesoFlow = lavaFbm(warpedUv * 1.84 + vec2(5.1, -1.8));
        float microFlow = lavaNoise(warpedUv * 6.3 - vec2(uElapsed * 0.2, 0.0));
        float fissure = 1.0 - smoothstep(0.035, 0.16, abs(macroFlow - 0.53));
        float ribbon = 1.0 - smoothstep(0.09, 0.28, abs(mesoFlow - 0.5));
        float hotCore = clamp(fissure * 0.82 + ribbon * 0.34, 0.0, 1.0);
        float cooledRaft = smoothstep(0.59, 0.78, macroFlow * 0.72 + mesoFlow * 0.28)
          * (1.0 - hotCore * 0.86);
        float thermalEnergy = clamp(0.22 + hotCore * 0.9 + microFlow * 0.12, 0.0, 1.0);

        vec3 cooledCrust = vec3(0.012, 0.007, 0.004);
        vec3 deepMolten = vec3(0.34, 0.012, 0.0015);
        vec3 moltenOrange = vec3(0.96, 0.16, 0.006);
        vec3 yellowHeat = vec3(1.0, 0.58, 0.055);
        vec3 whiteHeat = vec3(1.0, 0.88, 0.34);
        vec3 color = mix(deepMolten, moltenOrange, smoothstep(0.18, 0.78, thermalEnergy));
        color = mix(color, yellowHeat, smoothstep(0.48, 0.88, hotCore) * 0.78);
        color = mix(color, whiteHeat, pow(hotCore, 4.0) * (0.28 + uThermalPulse * 0.16));
        color = mix(color, cooledCrust, cooledRaft * 0.96);

        // A subdued specular rim and varying roughness let the molten surface
        // react to the camera instead of reading as a self-lit flat decal.
        float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);
        vec3 keyDirection = normalize(vec3(-0.45, 0.82, 0.34));
        vec3 halfVector = normalize(keyDirection + viewDirection);
        float roughness = mix(0.24, 0.88, cooledRaft);
        float specular = pow(max(dot(normal, halfVector), 0.0), mix(38.0, 7.0, roughness));
        color += vec3(1.0, 0.24, 0.025) * specular * (0.08 + hotCore * 0.22);
        color += vec3(0.14, 0.025, 0.004) * fresnel * (1.0 - cooledRaft) * 0.45;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    depthWrite: true,
    toneMapped: true,
  });
}

function remapIsland20AuthoredCityMaterials(
  authoredRoot: THREE.Object3D,
  materials: Island20LavaLabyrinthMaterials,
  authoredLava: THREE.ShaderMaterial,
) {
  const remap = (objectName: string) => {
    const semanticName = objectName.toUpperCase();
    if (semanticName.includes('FLOW') || semanticName.includes('HEAT') || semanticName.includes('LAVA_ROUTES')) return authoredLava;
    if (semanticName.includes('IRON') || semanticName.includes('CITY_ARCHITECTURE')) return materials.blackIron;
    if (semanticName.includes('MASONRY') || semanticName.includes('PERIMETER_FORGE')) return materials.deepObsidian;
    if (semanticName.includes('CITY_FLOORS')) return materials.cutBasalt;
    return materials.cutBasalt;
  };
  authoredRoot.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    // The authored GLB exports useful semantic nodes but Blender material
    // slots would multiply a single piece into several WebGL draw calls.
    // Its dedicated aperture/flow geometry already carries the hot material,
    // so one purposeful material per semantic part preserves the look.
    object.material = remap(object.name);
    object.castShadow = false;
    object.receiveShadow = true;
  });
}

function keepIsland20AuthoredCityPart(name: string) {
  return [
    'CITY_FLOORS',
    'CITY_MASONRY',
    'CITY_ARCHITECTURE',
    'FORGE_CATHEDRAL',
    'CATHEDRAL_HEAT',
    'CITY_LAVA_ROUTES',
    'PERIMETER_FORGE_DISTRICTS',
    'CATHEDRAL_FACADE_AND_GATE',
    'CATHEDRAL_SMALL_HEAT_WINDOWS',
  ].some((part) => name.includes(part));
}

export async function loadIsland20AuthoredCity(
  materials: Island20LavaLabyrinthMaterials,
  quality: Island3DQuality = 'high',
) {
  const gltf = await new GLTFLoader().loadAsync(ISLAND_20_AUTHORED_CITY_GLB);
  const authoredRoot = gltf.scene;
  authoredRoot.name = 'ISLAND_20_AUTHORED_V10_RECTILINEAR_LAVA_CITY';
  authoredRoot.scale.setScalar(ISLAND_20_AUTHORED_CITY_SCALE);
  authoredRoot.position.y = -0.035;
  authoredRoot.userData.representationFamily = ISLAND_20_AUTHORED_CITY_FAMILY;
  authoredRoot.userData.multipartSemanticAsset = true;
  authoredRoot.userData.sourceAsset = ISLAND_20_AUTHORED_CITY_GLB;
  const authoredLava = createIsland20AuthoredLavaMaterial(quality);
  authoredRoot.userData.authoredLavaMaterial = authoredLava;
  authoredRoot.children.forEach((part, index) => {
    part.visible = keepIsland20AuthoredCityPart(part.name);
    part.userData.assemblyIndex = index;
    if (part.name.includes('FLOW') || part.name.includes('APERTURE')) part.position.y += 0.085;
    part.userData.assemblyRestY = part.position.y;
  });
  remapIsland20AuthoredCityMaterials(authoredRoot, materials, authoredLava);
  return authoredRoot;
}

export function createIsland20LavaFlowOverlay(
  environmentPlate: THREE.Texture,
): Island20LavaFlowOverlayRuntime {
  const material = new THREE.ShaderMaterial({
    name: 'ISLAND_20_DIRECTIONAL_LAVA_AND_HEAT_SHADER',
    uniforms: {
      uEnvironmentPlate: { value: environmentPlate },
      uElapsed: { value: 0 },
      uMotionMix: { value: 1 },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.9999, 1.0);
      }
    `,
    fragmentShader: `
      uniform sampler2D uEnvironmentPlate;
      uniform float uElapsed;
      uniform float uMotionMix;
      varying vec2 vUv;

      float moltenMask(vec3 sampleColor) {
        float warmChroma = sampleColor.r - max(sampleColor.g * 0.78, sampleColor.b * 1.35);
        return smoothstep(0.035, 0.29, warmChroma) * smoothstep(0.045, 0.46, sampleColor.r);
      }

      float localMolten(vec2 uv) {
        return moltenMask(texture2D(uEnvironmentPlate, clamp(uv, 0.001, 0.999)).rgb);
      }

      void main() {
        vec3 baseColor = texture2D(uEnvironmentPlate, vUv).rgb;
        float molten = moltenMask(baseColor);

        // Lower-screen lavafalls move with gravity. The upper labyrinth uses
        // a centre-outward vector so its glowing channels visibly feed the
        // cliffs instead of pulsing in place.
        vec2 fromCrucible = vUv - vec2(0.5, 0.585);
        vec2 radialFlow = normalize(fromCrucible + vec2(0.0001));
        radialFlow.y *= 0.62;
        float fallWeight = 1.0 - smoothstep(0.40, 0.67, vUv.y);
        vec2 flowDirection = normalize(mix(radialFlow, vec2(0.0, -1.0), fallWeight));
        float distanceAlongFlow = dot(vUv, flowDirection);
        float crossFlow = dot(vUv, vec2(-flowDirection.y, flowDirection.x));

        float primaryTravel = distanceAlongFlow * 118.0 - uElapsed * 5.4;
        float secondaryTravel = distanceAlongFlow * 191.0 - uElapsed * 8.1 + crossFlow * 23.0;
        float broadTravel = distanceAlongFlow * 47.0 - uElapsed * 3.15 + sin(crossFlow * 31.0) * 1.35;
        float primaryRibbon = pow(0.5 + 0.5 * sin(primaryTravel + sin(crossFlow * 74.0) * 1.15), 6.0);
        float secondaryRibbon = pow(0.5 + 0.5 * sin(secondaryTravel), 10.0);
        float broadCell = smoothstep(0.42, 0.92, 0.5 + 0.5 * sin(broadTravel));
        // Keep the displacement periodic. An unbounded elapsed-time offset
        // eventually clamps the sampled plate to its edge and makes the lava
        // appear to stop after a long play session.
        float advect = (
          fract(uElapsed * 0.065) * 0.018
          + sin(uElapsed * 1.7 + crossFlow * 91.0) * 0.0014
        ) * uMotionMix;

        vec2 advectedUv = clamp(vUv - flowDirection * advect, 0.001, 0.999);
        vec3 advectedColor = texture2D(uEnvironmentPlate, advectedUv).rgb;

        // Sample outside the hot core to create the orange reflected-light
        // skirt the source implies around lava channels and falls. This is a
        // local heat bounce, not a full-frame colour wash.
        vec2 haloStep = vec2(0.0062, 0.0084);
        float nearbyMolten = max(
          max(localMolten(vUv + vec2(haloStep.x, 0.0)), localMolten(vUv - vec2(haloStep.x, 0.0))),
          max(localMolten(vUv + vec2(0.0, haloStep.y)), localMolten(vUv - vec2(0.0, haloStep.y)))
        );
        nearbyMolten = max(nearbyMolten, max(
          localMolten(vUv + vec2(haloStep.x * 1.8, haloStep.y * 1.4)),
          localMolten(vUv - vec2(haloStep.x * 1.8, haloStep.y * 1.4))
        ));
        float heatHalo = max(0.0, nearbyMolten - molten * 0.72);

        // Refractive shimmer lives only near heat. Two low-amplitude waves
        // avoid a repeated mechanical wobble and keep masonry registration.
        vec2 shimmer = vec2(
          sin(vUv.y * 103.0 + uElapsed * 2.2),
          cos(vUv.x * 87.0 - uElapsed * 1.6)
        ) * 0.00125 * nearbyMolten * uMotionMix;
        vec3 shimmeredColor = texture2D(uEnvironmentPlate, clamp(vUv + shimmer, 0.001, 0.999)).rgb;

        float flowBlend = molten * 0.38 * uMotionMix;
        vec3 color = mix(baseColor, advectedColor, flowBlend);
        color = mix(color, shimmeredColor, nearbyMolten * 0.17 * uMotionMix);

        float thermalBreath = 0.93 + 0.07 * sin(uElapsed * 0.73 + sin(uElapsed * 0.31));
        float hotCore = molten * smoothstep(0.18, 0.72, molten) * broadCell;
        float ribbonEnergy = molten * (primaryRibbon * 0.22 + secondaryRibbon * 0.13 + hotCore * 0.19) * uMotionMix;
        float coolingEdge = molten * (1.0 - smoothstep(0.2, 0.72, molten)) * (0.58 + 0.42 * broadCell);
        color *= 1.0 - coolingEdge * 0.16 * uMotionMix;
        color += vec3(1.0, 0.2, 0.016) * ribbonEnergy;
        color += vec3(0.72, 0.11, 0.009) * heatHalo * (0.38 + 0.07 * thermalBreath);

        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    depthTest: false,
    depthWrite: false,
    transparent: false,
    toneMapped: true,
  });
  const root = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 1, 1), material);
  root.name = 'ISLAND_20_LAVA_FLOW_AND_HEAT_OVERLAY';
  root.frustumCulled = false;
  root.renderOrder = -10_000;
  root.userData.presentationOnly = true;
  root.userData.flowDirection = 'gravity-down-and-centre-outward';
  root.userData.heatIllumination = 'molten-pixel-local-bounce';
  root.userData.flowStructure = 'multi-scale-hot-core-and-cooling-crust';
  root.userData.performanceDelta = {
    drawCalls: ISLAND_20_LAVA_FLOW_ADDITIONAL_DRAW_CALLS,
    triangles: ISLAND_20_LAVA_FLOW_ADDITIONAL_TRIANGLES,
    textureBytes: 0,
  };
  return {
    root,
    animate: (elapsed, reducedMotion = false) => {
      material.uniforms.uElapsed.value = reducedMotion ? 0 : Math.max(0, elapsed);
      material.uniforms.uMotionMix.value = reducedMotion ? 0 : 1;
    },
  };
}

function stage<T extends THREE.Object3D>(object: T, value: 1 | 2 | 3 | 4 | 5): T {
  object.userData.constructionStage = value;
  return object;
}

function box(width: number, height: number, depth: number, material: THREE.Material, name: string, buildStage: 1 | 2 | 3 | 4 | 5 = 1) {
  const mesh = new THREE.Mesh(new RoundedBoxGeometry(width, height, depth, 2, Math.min(width, height, depth) * 0.09), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return stage(mesh, buildStage);
}

function cylinder(radiusTop: number, radiusBottom: number, height: number, material: THREE.Material, name: string, segments = 12, buildStage: 1 | 2 | 3 | 4 | 5 = 1) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments, 1, false), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return stage(mesh, buildStage);
}

function addSocket(root: THREE.Object3D, name: string, position: readonly [number, number, number]) {
  const socket = new THREE.Object3D();
  socket.name = name;
  socket.position.set(...position);
  root.add(socket);
  return socket;
}

function createVolcanicIslandGeometry(segments: number) {
  const rings = [
    { y: 0.22, radius: 5.66, noise: 0.12 },
    { y: -0.12, radius: 6.02, noise: 0.2 },
    { y: -0.72, radius: 5.84, noise: 0.32 },
    { y: -1.48, radius: 5.2, noise: 0.42 },
    { y: -2.34, radius: 4.36, noise: 0.48 },
    { y: -3.24, radius: 3.2, noise: 0.42 },
    { y: -4.12, radius: 1.78, noise: 0.3 },
    { y: -4.72, radius: 0.54, noise: 0.12 },
  ] as const;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const stride = segments + 1;
  rings.forEach((ring, ringIndex) => {
    for (let index = 0; index <= segments; index += 1) {
      const angle = index / segments * Math.PI * 2;
      const cragNoise = (
        Math.sin(angle * 5 + ringIndex * 0.73) * 0.5
        + Math.sin(angle * 11 - ringIndex * 0.41) * 0.3
        + Math.cos(angle * 17 + ringIndex) * 0.2
      ) * ring.noise;
      const broadLobes = Math.sin(angle * 3 + 0.42) * 0.2 + Math.cos(angle * 7 - 0.8) * 0.11;
      const radius = ring.radius + cragNoise + broadLobes * (1 - ringIndex / rings.length * 0.5);
      const xScale = 1 + Math.sin(angle * 2 + ringIndex * 0.17) * 0.055;
      const zScale = 0.94 + Math.cos(angle * 3 - ringIndex * 0.11) * 0.035;
      positions.push(Math.cos(angle) * radius * xScale, ring.y, Math.sin(angle) * radius * zScale);
      uvs.push(index / segments, ringIndex / (rings.length - 1));
    }
  });
  for (let ringIndex = 0; ringIndex < rings.length - 1; ringIndex += 1) {
    for (let index = 0; index < segments; index += 1) {
      const a = ringIndex * stride + index;
      const b = a + 1;
      const c = a + stride;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
    }
  }
  const topCenter = positions.length / 3;
  positions.push(0, rings[0].y, 0);
  uvs.push(0.5, 0.5);
  for (let index = 0; index < segments; index += 1) indices.push(topCenter, index + 1, index);
  const bottomCenter = positions.length / 3;
  positions.push(0, rings[rings.length - 1].y, 0);
  uvs.push(0.5, 0.5);
  const bottomOffset = (rings.length - 1) * stride;
  for (let index = 0; index < segments; index += 1) indices.push(bottomCenter, bottomOffset + index, bottomOffset + index + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createLobedMesaGeometry(
  segments: number,
  radius: number,
  height: number,
  phase: number,
  irregularity = 0.08,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const topY = height * 0.5;
  const bottomY = -height * 0.5;
  for (let index = 0; index < segments; index += 1) {
    const angle = index / segments * Math.PI * 2;
    const lobe = 1
      + Math.sin(angle * 3 + phase) * irregularity
      + Math.cos(angle * 7 - phase * 0.63) * irregularity * 0.46
      + Math.sin(angle * 11 + phase * 1.7) * irregularity * 0.2;
    const x = Math.cos(angle) * radius * lobe;
    const z = Math.sin(angle) * radius * lobe * 0.955;
    positions.push(x, topY, z, x * 1.025, bottomY, z * 1.025);
    const u = index / segments;
    uvs.push(u, 1, u, 0);
  }
  const topCenter = positions.length / 3;
  positions.push(0, topY, 0);
  uvs.push(0.5, 0.5);
  const bottomCenter = positions.length / 3;
  positions.push(0, bottomY, 0);
  uvs.push(0.5, 0.5);
  for (let index = 0; index < segments; index += 1) {
    const next = (index + 1) % segments;
    const top = index * 2;
    const bottom = top + 1;
    const nextTop = next * 2;
    const nextBottom = nextTop + 1;
    indices.push(topCenter, top, nextTop, bottomCenter, nextBottom, bottom);
    indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createRoundedMazeWall(
  width: number,
  height: number,
  depth: number,
  material: THREE.Material,
  name: string,
  stageValue: 1 | 2 | 3 | 4 | 5,
) {
  const geometry = new RoundedBoxGeometry(width, height, depth, 2, Math.min(0.055, width * 0.24, depth * 0.24));
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return stage(mesh, stageValue);
}

function createOrthogonalCrucibleLabyrinth(
  level: 1 | 2 | 3,
  quality: Island3DQuality,
  stone: THREE.Material,
  capMaterial: THREE.Material,
  magmaMaterial: THREE.Material,
) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_MESH_FIRST_ORTHOGONAL_LABYRINTH';
  const cellCount = level === 1 ? 5 : level === 2 ? 7 : 9;
  const cellSize = level === 3 ? 0.48 : level === 2 ? 0.54 : 0.62;
  const half = cellCount * cellSize * 0.5;
  const walls = Array.from({ length: cellCount * cellCount }, () => [true, true, true, true]);
  const visited = new Array(cellCount * cellCount).fill(false);
  let seed = 0x20c1a7;
  const random = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  const indexOf = (x: number, z: number) => z * cellCount + x;
  const stack: Array<[number, number]> = [[Math.floor(cellCount / 2), Math.floor(cellCount / 2)]];
  visited[indexOf(stack[0][0], stack[0][1])] = true;
  while (stack.length) {
    const [x, z] = stack[stack.length - 1];
    const candidates = [
      { dx: 0, dz: -1, wall: 0, opposite: 2 },
      { dx: 1, dz: 0, wall: 1, opposite: 3 },
      { dx: 0, dz: 1, wall: 2, opposite: 0 },
      { dx: -1, dz: 0, wall: 3, opposite: 1 },
    ].filter(({ dx, dz }) => {
      const nx = x + dx;
      const nz = z + dz;
      return nx >= 0 && nx < cellCount && nz >= 0 && nz < cellCount && !visited[indexOf(nx, nz)];
    });
    if (!candidates.length) {
      stack.pop();
      continue;
    }
    const next = candidates[Math.floor(random() * candidates.length)];
    const nx = x + next.dx;
    const nz = z + next.dz;
    walls[indexOf(x, z)][next.wall] = false;
    walls[indexOf(nx, nz)][next.opposite] = false;
    visited[indexOf(nx, nz)] = true;
    stack.push([nx, nz]);
  }

  // Open a proper front entrance and a four-sided keep court. The remaining
  // walls are a deterministic perfect maze, so every corridor is connected.
  const center = Math.floor(cellCount / 2);
  walls[indexOf(center, cellCount - 1)][2] = false;
  const keepCourtRadius = level === 3 ? 0.86 : 0.68;
  let wallCounter = 0;
  const addWall = (x: number, z: number, horizontal: boolean, edgeKey: string) => {
    if (Math.max(Math.abs(x), Math.abs(z)) < keepCourtRadius) return;
    const hash = Math.abs(Math.round((x * 31 + z * 47) * 10));
    const wallHeight = 0.58 + level * 0.1 + (hash % 4) * 0.075;
    const length = cellSize + 0.095;
    const thickness = level === 3 ? 0.15 : 0.135;
    const wall = createRoundedMazeWall(
      horizontal ? length : thickness,
      wallHeight,
      horizontal ? thickness : length,
      stone,
      `ISLAND_20_LABYRINTH_WALL_${++wallCounter}_${edgeKey}`,
      level === 1 ? 1 : 2,
    );
    wall.position.set(x, 0.58 + wallHeight * 0.5, z);
    root.add(wall);
    const cap = createRoundedMazeWall(
      horizontal ? length * 0.92 : thickness * 0.66,
      0.055,
      horizontal ? thickness * 0.66 : length * 0.92,
      capMaterial,
      `${wall.name}_FORGED_CAP`,
      3,
    );
    cap.position.set(x, wall.position.y + wallHeight * 0.5 + 0.025, z);
    root.add(cap);
    if (level === 3 && hash % 9 === 0) {
      const watch = createRoundedMazeWall(0.18, wallHeight + 0.3, 0.18, stone, `${wall.name}_WATCH_PIER`, 3);
      watch.position.set(x, 0.58 + (wallHeight + 0.3) * 0.5, z);
      const beacon = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), magmaMaterial);
      beacon.name = `${watch.name}_EMBER_BEACON`;
      beacon.position.set(x, watch.position.y + (wallHeight + 0.3) * 0.5 + 0.08, z);
      root.add(watch, beacon);
    }
  };
  for (let z = 0; z < cellCount; z += 1) {
    for (let x = 0; x < cellCount; x += 1) {
      const cellWalls = walls[indexOf(x, z)];
      const cx = -half + cellSize * (x + 0.5);
      const cz = -half + cellSize * (z + 0.5);
      if (cellWalls[0]) addWall(cx, cz - cellSize * 0.5, true, 'N');
      if (cellWalls[3]) addWall(cx - cellSize * 0.5, cz, false, 'W');
      if (x === cellCount - 1 && cellWalls[1]) addWall(cx + cellSize * 0.5, cz, false, 'E');
      if (z === cellCount - 1 && cellWalls[2]) addWall(cx, cz + cellSize * 0.5, true, 'S');
    }
  }
  root.userData.navigation = {
    topology: 'deterministic-perfect-maze',
    cells: cellCount * cellCount,
    frontEntrance: [center, cellCount - 1],
    keepCourtRadius,
    controller: 'skiff-left-right-choice-plus-hold-forward-throttle',
    junctions: 3,
  };
  return root;
}

function createAnnularWallSegment(
  innerRadius: number,
  outerRadius: number,
  height: number,
  startAngle: number,
  endAngle: number,
  steps: number,
  material: THREE.Material,
  name: string,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = index / steps;
    const angle = THREE.MathUtils.lerp(startAngle, endAngle, t);
    for (const [radius, y, v] of [
      [outerRadius, 0, 0], [outerRadius, height, 1],
      [innerRadius, 0, 0], [innerRadius, height, 1],
    ] as const) {
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      uvs.push(t, v);
    }
  }
  for (let index = 0; index < steps; index += 1) {
    const a = index * 4;
    const b = a + 4;
    indices.push(
      a, b, b + 1, a, b + 1, a + 1,
      a + 2, a + 3, b + 3, a + 2, b + 3, b + 2,
      a + 1, b + 1, b + 3, a + 1, b + 3, a + 3,
      a, a + 2, b + 2, a, b + 2, b,
    );
  }
  const last = steps * 4;
  indices.push(0, 1, 3, 0, 3, 2, last, last + 2, last + 3, last, last + 3, last + 1);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const wall = new THREE.Mesh(geometry, material);
  wall.name = name;
  wall.castShadow = true;
  wall.receiveShadow = true;
  return wall;
}

function createLavaRibbon(
  points: readonly THREE.Vector3[],
  width: number,
  material: THREE.Material,
  name: string,
) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = next.clone().sub(previous).normalize();
    let side = new THREE.Vector3(0, 1, 0).cross(tangent).normalize();
    if (side.lengthSq() < 0.01) side = new THREE.Vector3(1, 0, 0);
    positions.push(
      point.x + side.x * width, point.y + side.y * width, point.z + side.z * width,
      point.x - side.x * width, point.y - side.y * width, point.z - side.z * width,
    );
    const t = index / Math.max(1, points.length - 1);
    uvs.push(0, t, 1, t);
  });
  for (let index = 0; index < points.length - 1; index += 1) {
    const a = index * 2;
    indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const ribbon = new THREE.Mesh(geometry, material);
  ribbon.name = name;
  ribbon.renderOrder = 2;
  return ribbon;
}

function addStairs(root: THREE.Group, name: string, width: number, depth: number, count: number, material: THREE.Material, y = 0.2) {
  for (let index = 0; index < count; index += 1) {
    const step = box(width - index * 0.07, 0.1, depth / count + 0.025, material, `${name}_STEP_${index + 1}`, 1);
    step.position.set(0, y + index * 0.075, 0.62 + index * depth / count);
    root.add(step);
  }
}

function addBrazier(root: THREE.Group, name: string, position: readonly [number, number, number], materials: Island20LavaLabyrinthMaterials, scale = 1) {
  const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.16 * scale, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), materials.blackIron);
  bowl.name = `${name}_SPIKED_BOWL`;
  bowl.scale.y = 0.55;
  bowl.position.set(...position);
  bowl.rotation.x = Math.PI;
  root.add(bowl);
  for (let index = 0; index < 6; index += 1) {
    const angle = index / 6 * Math.PI * 2;
    const spike = new THREE.Mesh(new THREE.ConeGeometry(0.025 * scale, 0.14 * scale, 5), materials.blackIron);
    spike.name = `${name}_SPIKE_${index + 1}`;
    spike.position.set(position[0] + Math.cos(angle) * 0.14 * scale, position[1], position[2] + Math.sin(angle) * 0.14 * scale);
    spike.rotation.z = Math.PI;
    root.add(spike);
  }
  const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.13 * scale, 1), materials.emberGlass);
  flame.name = `${name}_FLAME`;
  flame.position.set(position[0], position[1] + 0.15 * scale, position[2]);
  flame.scale.set(0.7, 1.45, 0.7);
  flame.userData.baseY = flame.position.y;
  flame.userData.phase = root.children.length * 0.37;
  root.add(flame);
  return flame;
}

function createGate(name: string, angle: number, radius: number, materials: Island20LavaLabyrinthMaterials) {
  const gate = new THREE.Group();
  gate.name = name;
  gate.position.set(Math.cos(angle) * radius, 0.42, Math.sin(angle) * radius);
  gate.rotation.y = -angle + Math.PI / 2;
  const left = box(0.24, 0.9, 0.38, materials.cutBasalt, `${name}_LEFT_PIER`, 2);
  const right = box(0.24, 0.9, 0.38, materials.cutBasalt, `${name}_RIGHT_PIER`, 2);
  left.position.x = -0.45;
  right.position.x = 0.45;
  const lintel = box(1.12, 0.24, 0.4, materials.cutBasalt, `${name}_LINTEL`, 2);
  lintel.position.y = 0.46;
  const portcullis = new THREE.Group();
  portcullis.name = `${name}_PORTCULLIS_PIVOT`;
  portcullis.position.y = 0.12;
  for (let index = 0; index < 4; index += 1) {
    const bar = box(0.035, 0.72, 0.035, materials.blackIron, `${name}_PORTCULLIS_BAR_${index + 1}`, 4);
    bar.position.x = (index - 1.5) * 0.18;
    portcullis.add(bar);
  }
  gate.add(left, right, lintel, portcullis);
  gate.userData.portcullis = portcullis;
  addSocket(gate, `${name}_BRIDGE_SOCKET`, [0, -0.2, 0.26]);
  return gate;
}

function createPyreSentinel(materials: Island20LavaLabyrinthMaterials, quality: Island3DQuality) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_PYRE_SENTINEL';
  const torso = cylinder(0.34, 0.48, 0.92, materials.obsidian, 'ISLAND_20_SENTINEL_TORSO', qualitySegments(quality), 2);
  torso.position.y = 1.02;
  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.19, 1), materials.emberGlass);
  core.name = 'ISLAND_20_SENTINEL_FORGE_CORE';
  core.position.set(0, 1.08, 0.36);
  const head = new THREE.Mesh(new THREE.DodecahedronGeometry(0.32, 0), materials.blackIron);
  head.name = 'ISLAND_20_SENTINEL_HEAD';
  head.position.y = 1.7;
  head.scale.set(0.92, 1.08, 0.86);
  const crown = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.58, 6), materials.emberGlass);
  crown.name = 'ISLAND_20_SENTINEL_FLAME_CROWN';
  crown.position.y = 2.13;
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), materials.obsidian);
    shoulder.name = `ISLAND_20_SENTINEL_${side < 0 ? 'LEFT' : 'RIGHT'}_SHOULDER`;
    shoulder.position.set(side * 0.5, 1.35, 0);
    const arm = box(0.22, 0.75, 0.24, materials.blackIron, `ISLAND_20_SENTINEL_${side < 0 ? 'LEFT' : 'RIGHT'}_ARM`, 3);
    arm.position.set(side * 0.56, 0.82, 0);
    arm.rotation.z = side * 0.16;
    root.add(shoulder, arm);
  }
  root.add(torso, core, head, crown);
  root.userData.guardianId = 'pyre-sentinel';
  return root;
}

function createCrucibleCitadel(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_CRUCIBLE_CITADEL_ARCHITECTURE';
  const segments = qualitySegments(quality);
  const citadelBrass = materials.agedBrass.clone();
  citadelBrass.name = 'ISLAND_20_CITADEL_CLEAN_AGED_BRASS';
  citadelBrass.map = null;
  citadelBrass.color.setHex(0x6f351b);
  citadelBrass.emissive.setHex(0x3a0b02);
  citadelBrass.emissiveIntensity = 0.22;
  const citadelMagma = materials.magmaCore.clone();
  citadelMagma.name = 'ISLAND_20_CITADEL_UNMAPPED_MAGMA_CORE';
  citadelMagma.map = null;
  citadelMagma.color.setHex(0xff7b16);
  citadelMagma.opacity = 1;
  const citadelStone = materials.cutBasalt.clone();
  citadelStone.name = 'ISLAND_20_CITADEL_CLEAN_CUT_BASALT';
  citadelStone.map = null;
  citadelStone.color.setHex(0x241a1c);
  citadelStone.roughness = 0.9;
  citadelStone.emissive.setHex(0x140302);
  citadelStone.emissiveIntensity = 0.1;
  const lower = createRoundedMazeWall(3.05, 0.26, 3.05, materials.obsidian, 'ISLAND_20_CITADEL_BURIED_FOUNDATION', 1);
  lower.position.y = 0.35;
  const arena = createRoundedMazeWall(1.68, 0.24, 1.68, materials.cutBasalt, 'ISLAND_20_ARENA_PLINTH', 1);
  arena.position.y = 0.51;
  root.add(lower, arena);
  addStairs(root, 'ISLAND_20_CITADEL_FRONT', 0.94, 0.86, 5, materials.cutBasalt, 0.2);

  const wallRoot = new THREE.Group();
  wallRoot.name = 'ISLAND_20_CONNECTED_CURTAIN_LABYRINTH';
  const orthogonalMaze = createOrthogonalCrucibleLabyrinth(
    level,
    quality,
    citadelStone,
    citadelBrass,
    citadelMagma,
  );
  wallRoot.add(orthogonalMaze);
  if (level === 3) {
    const navigationRoot = new THREE.Group();
    navigationRoot.name = 'ISLAND_20_LEVEL_3_ESCAPE_LABYRINTH';
    const junctions = [
      { x: -0.2, z: 0.52, rotation: -0.32, height: 0.92 },
      { x: 0.5, z: 1.12, rotation: 0.66, height: 1.08 },
      { x: -0.38, z: 1.78, rotation: -0.74, height: 1.24 },
    ] as const;
    junctions.forEach((junction, index) => {
      const gate = new THREE.Group();
      gate.name = `ISLAND_20_L3_JUNCTION_${index + 1}_GATEHOUSE`;
      for (const side of [-1, 1]) {
        const pier = box(0.18, junction.height, 0.22, materials.blackIron, `${gate.name}_${side < 0 ? 'LEFT' : 'RIGHT'}_PIER`, 3);
        pier.position.set(side * 0.34, junction.height * 0.5, 0);
        const flame = new THREE.Mesh(new THREE.OctahedronGeometry(0.085, 0), materials.emberGlass);
        flame.name = `${gate.name}_${side < 0 ? 'LEFT' : 'RIGHT'}_ROUTE_FLAME`;
        flame.position.set(side * 0.34, junction.height + 0.14, 0);
        flame.scale.set(0.72, 1.4, 0.72);
        gate.add(pier, flame);
      }
      const lintel = box(0.86, 0.16, 0.24, citadelBrass, `${gate.name}_BRASS_LINTEL`, 4);
      lintel.position.y = junction.height;
      const rune = new THREE.Mesh(new THREE.OctahedronGeometry(0.09, 0), citadelMagma);
      rune.name = `${gate.name}_DIRECTION_RUNE`;
      rune.position.set(index === 1 ? -0.2 : 0.2, junction.height + 0.02, 0.14);
      gate.add(lintel, rune);
      gate.position.set(junction.x, 0.5, junction.z);
      gate.rotation.y = junction.rotation;
      navigationRoot.add(gate);
    });
    const summitDavit = new THREE.Group();
    summitDavit.name = 'ISLAND_20_SUMMIT_IRON_SKIFF_LAUNCH_DAVIT';
    const mast = box(0.18, 1.36, 0.18, materials.blackIron, 'ISLAND_20_SUMMIT_DAVIT_MAST', 3);
    mast.position.set(-0.62, 2.85, 0.32);
    const boom = box(1.12, 0.14, 0.16, materials.blackIron, 'ISLAND_20_SUMMIT_DAVIT_BOOM', 3);
    boom.position.set(-0.08, 3.46, 0.32);
    const hook = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.035, 6, 12, Math.PI * 1.55), citadelBrass);
    hook.name = 'ISLAND_20_SUMMIT_DAVIT_MAGNETIC_HOOK';
    hook.position.set(0.42, 3.18, 0.32);
    hook.rotation.z = Math.PI / 2;
    summitDavit.add(mast, boom, hook);
    navigationRoot.add(summitDavit);
    wallRoot.add(navigationRoot);
  }
  root.add(wallRoot);

  const gateRoot = new THREE.Group();
  gateRoot.name = 'ISLAND_20_FOUR_CITADEL_GATES';
  for (let index = 0; index < 4; index += 1) {
    const angle = index / 4 * Math.PI * 2;
    const gate = createGate(`ISLAND_20_GATE_${index + 1}`, angle, 1.94, materials);
    gate.scale.set(1.18, 1.16, 1.08);
    const aperture = box(0.62, 0.68, 0.04, materials.soot, `ISLAND_20_GATE_${index + 1}_DARK_APERTURE`, 3);
    aperture.position.set(Math.cos(angle) * 1.94, 0.88, Math.sin(angle) * 1.94);
    aperture.rotation.y = -angle + Math.PI / 2;
    const gateFire = box(0.72, 0.065, 0.065, citadelMagma, `ISLAND_20_GATE_${index + 1}_FIRE_LINTEL`, 4);
    gateFire.position.set(Math.cos(angle) * 1.94, 1.48, Math.sin(angle) * 1.94);
    gateFire.rotation.y = -angle + Math.PI / 2;
    gateRoot.add(gate, aperture, gateFire);
  }
  root.add(gateRoot);

  const tower = new THREE.Group();
  tower.name = 'ISLAND_20_CRUCIBLE_KEEP_TOWER';
  const tierHeights = [1.04 + level * 0.08, 0.84 + level * 0.07, 0.66 + level * 0.06] as const;
  const tierWidths = [1.42, 1.08, 0.78] as const;
  let tierBaseY = 0.62;
  tierHeights.forEach((height, tierIndex) => {
    const width = tierWidths[tierIndex];
    const tier = createRoundedMazeWall(width, height, width, citadelStone, `ISLAND_20_TOWER_TIER_${tierIndex + 1}`, tierIndex === 0 ? 1 : 2);
    tier.position.y = tierBaseY + height / 2;
    tower.add(tier);
    for (let face = 0; face < 4; face += 1) {
      const angle = face / 4 * Math.PI * 2;
      const buttressAngle = angle + Math.PI / 4;
      const buttress = box(0.16 - tierIndex * 0.018, height * 0.92, 0.22, materials.blackIron, `ISLAND_20_TOWER_TIER_${tierIndex + 1}_BUTTRESS_${face + 1}`, 2);
      buttress.position.set(Math.cos(buttressAngle) * (width * 0.7), tier.position.y - height * 0.02, Math.sin(buttressAngle) * (width * 0.7));
      buttress.rotation.y = -buttressAngle;
      buttress.rotation.z = face % 2 ? 0.045 : -0.045;
      tower.add(buttress);
      const window = box(0.23 - tierIndex * 0.018, height * 0.5, 0.05, citadelMagma, `ISLAND_20_TOWER_TIER_${tierIndex + 1}_WINDOW_${face + 1}`, 3);
      window.position.set(Math.cos(angle) * (width * 0.515), tier.position.y + height * 0.04, Math.sin(angle) * (width * 0.515));
      window.rotation.y = -angle + Math.PI / 2;
      tower.add(window);
    }
    for (let edge = 0; edge < 4; edge += 1) {
      const cornice = box(
        edge % 2 === 0 ? width * 1.12 : 0.07,
        0.07,
        edge % 2 === 0 ? 0.07 : width * 1.12,
        citadelBrass,
        `ISLAND_20_TOWER_TIER_${tierIndex + 1}_CORNICE_${edge + 1}`,
        3,
      );
      cornice.position.set(
        edge === 1 ? width * 0.55 : edge === 3 ? -width * 0.55 : 0,
        tierBaseY + height - 0.07,
        edge === 0 ? width * 0.55 : edge === 2 ? -width * 0.55 : 0,
      );
      tower.add(cornice);
    }
    tierBaseY += height - 0.04;
  });
  const turretRoot = new THREE.Group();
  turretRoot.name = 'ISLAND_20_KEEP_CORNER_TURRETS';
  for (let index = 0; index < 4; index += 1) {
    const angle = Math.PI / 4 + index * Math.PI / 2;
    const turret = cylinder(0.22, 0.29, 1.96, citadelStone, `ISLAND_20_KEEP_TURRET_${index + 1}`, 8, 2);
    turret.position.set(Math.cos(angle) * 0.79, 1.5, Math.sin(angle) * 0.79);
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.41, 0.7, 8), materials.blackIron);
    roof.name = `ISLAND_20_KEEP_TURRET_${index + 1}_ROOF`;
    roof.position.set(turret.position.x, 2.83, turret.position.z);
    const slit = box(0.08, 0.55, 0.035, citadelMagma, `ISLAND_20_KEEP_TURRET_${index + 1}_FORGE_SLIT`, 3);
    slit.position.set(Math.cos(angle) * 0.99, 1.62, Math.sin(angle) * 0.99);
    slit.rotation.y = -angle + Math.PI / 2;
    turretRoot.add(turret, roof, slit);
  }
  const portal = box(0.5, 0.72, 0.08, materials.soot, 'ISLAND_20_KEEP_MAIN_GATE_APERTURE', 2);
  portal.position.set(0, 0.92, 0.9);
  const portalArch = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 7, 18, Math.PI), citadelBrass);
  portalArch.name = 'ISLAND_20_KEEP_MAIN_GATE_ARCH';
  portalArch.position.set(0, 1.25, 0.96);
  turretRoot.add(portal, portalArch);
  tower.add(turretRoot);
  for (let index = 0; index < 8; index += 1) {
    const angle = index / 8 * Math.PI * 2;
    const crownSpire = new THREE.Mesh(new THREE.ConeGeometry(index % 2 ? 0.075 : 0.1, index % 2 ? 0.62 : 0.88, 5), materials.blackIron);
    crownSpire.name = `ISLAND_20_TOWER_CROWN_SPIRE_${index + 1}`;
    crownSpire.position.set(Math.cos(angle) * 0.43, tierBaseY + (index % 2 ? 0.25 : 0.36), Math.sin(angle) * 0.43);
    tower.add(crownSpire);
  }
  const crownRoof = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.92, 4), materials.blackIron);
  crownRoof.name = 'ISLAND_20_TOWER_FOUR_SIDED_CROWN_ROOF';
  crownRoof.position.y = tierBaseY + 0.42;
  crownRoof.rotation.y = Math.PI / 4;
  tower.add(crownRoof);
  const crownRing = new THREE.Mesh(new THREE.TorusGeometry(0.34, 0.07, 7, segments * 2), citadelBrass);
  crownRing.name = 'ISLAND_20_FLAME_CROWN_APERTURE';
  crownRing.position.y = tierBaseY + 0.74;
  crownRing.rotation.x = Math.PI / 2;
  crownRing.scale.z = 1.35;
  tower.add(crownRing);
  const crownFlame = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 1), materials.emberGlass);
  crownFlame.name = 'ISLAND_20_CITADEL_CROWN_FLAME';
  crownFlame.position.y = crownRing.position.y;
  crownFlame.scale.set(0.64, 1.55, 0.64);
  tower.add(crownFlame);
  root.add(tower);

  const forgeRoot = new THREE.Group();
  forgeRoot.name = 'ISLAND_20_CITADEL_FORGE_SURFACES';
  const keepMoatPoints = [
    new THREE.Vector3(-0.72, 0.535, -0.72),
    new THREE.Vector3(0.72, 0.535, -0.72),
    new THREE.Vector3(0.72, 0.535, 0.72),
    new THREE.Vector3(-0.72, 0.535, 0.72),
    new THREE.Vector3(-0.72, 0.535, -0.72),
  ];
  const keepMoatBed = createLavaRibbon(keepMoatPoints.map((point) => point.clone().add(new THREE.Vector3(0, -0.028, 0))), 0.13, materials.blackIron, 'ISLAND_20_KEEP_RECESSED_SQUARE_MOAT_BED');
  const keepMoat = createLavaRibbon(keepMoatPoints, 0.085, citadelMagma, 'ISLAND_20_KEEP_RECESSED_SQUARE_MOAT');
  forgeRoot.add(keepMoatBed, keepMoat);
  for (let index = 0; index < 4; index += 1) {
    const angle = Math.PI / 4 + index / 4 * Math.PI * 2;
    const sideX = index === 0 || index === 3 ? 1 : -1;
    const sideZ = index < 2 ? 1 : -1;
    const channelCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(sideX * 0.58, 0.51, sideZ * 0.58),
      new THREE.Vector3(sideX * 1.22, 0.49, sideZ * 0.58),
      new THREE.Vector3(sideX * 1.22, 0.47, sideZ * 1.34),
      new THREE.Vector3(sideX * 1.76, 0.44, sideZ * 1.82),
      new THREE.Vector3(Math.cos(angle) * 2.58, 0.41, Math.sin(angle) * 2.58),
    ], false, 'centripetal', 0.18);
    const feedPoints = channelCurve.getPoints(16);
    const channelBed = createLavaRibbon(
      feedPoints.map((point) => point.clone().add(new THREE.Vector3(0, -0.028, 0))),
      0.17,
      materials.blackIron,
      `ISLAND_20_CITADEL_LAVA_FEED_BED_${index + 1}`,
    );
    const channel = createLavaRibbon(feedPoints, 0.12, citadelMagma, `ISLAND_20_CITADEL_LAVA_FEED_${index + 1}`);
    channel.userData.phase = index * 0.9;
    const spillPool = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.37, 0.055, 12), citadelMagma);
    spillPool.name = `ISLAND_20_CITADEL_LAVA_FEED_POOL_${index + 1}`;
    spillPool.position.set(Math.cos(angle) * 2.42, 0.47, Math.sin(angle) * 2.42);
    forgeRoot.add(channelBed, channel, spillPool);
  }
  for (let index = 0; index < (level === 3 ? 8 : 4); index += 1) {
    const angle = index / (level === 3 ? 8 : 4) * Math.PI * 2 + Math.PI / 4;
    addBrazier(forgeRoot, `ISLAND_20_CITADEL_BRAZIER_${index + 1}`, [Math.cos(angle) * 1.22, 1.08, Math.sin(angle) * 1.22], materials, 0.76);
  }
  root.add(forgeRoot);

  if (level === 3) {
    const sentinel = createPyreSentinel(materials, quality);
    sentinel.position.set(0, 0.55, -0.18);
    sentinel.scale.setScalar(0.58);
    root.add(sentinel);
  }
  return { root, tower, wallRoot, gateRoot, forgeRoot };
}

function createMagmaHatchery(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_MAGMA_CRUCIBLE_HATCHERY';
  const base = cylinder(0.92 + level * 0.08, 1.04 + level * 0.08, 0.3, materials.obsidian, 'ISLAND_20_HATCHERY_FURNACE_BASE', qualitySegments(quality), 1);
  base.position.y = 0.15;
  root.add(base);
  const egg = new THREE.Mesh(new THREE.SphereGeometry(0.48 + level * 0.06, qualitySegments(quality), 10), materials.emberGlass);
  egg.name = 'ISLAND_20_MAGMA_EGG';
  egg.position.y = 0.92 + level * 0.12;
  egg.scale.y = 1.32;
  egg.userData.constructionStage = 2;
  root.add(egg);
  for (let index = 0; index < 6 + level * 2; index += 1) {
    const angle = index / (6 + level * 2) * Math.PI * 2;
    const rib = box(0.1, 0.68 + level * 0.08, 0.12, materials.blackIron, `ISLAND_20_HATCHERY_RIB_${index + 1}`, 3);
    rib.position.set(Math.cos(angle) * 0.68, 0.78, Math.sin(angle) * 0.68);
    rib.rotation.y = -angle;
    rib.rotation.z = Math.cos(angle) * 0.26;
    root.add(rib);
  }
  if (level === 3) addBrazier(root, 'ISLAND_20_HATCHERY_CROWN_BRAZIER', [0, 1.92, 0], materials, 1.1);
  return root;
}

function createFirePathSanctum(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_FIRE_PATH_SANCTUM';
  const base = cylinder(0.92 + level * 0.07, 1.05 + level * 0.08, 0.28, materials.cutBasalt, 'ISLAND_20_HABIT_SANCTUM_BASE', qualitySegments(quality), 1);
  base.position.y = 0.14;
  root.add(base);
  for (let index = 0; index < 4 + level; index += 1) {
    const angle = index / (4 + level) * Math.PI * 2;
    const column = box(0.16, 1.0 + level * 0.16, 0.16, materials.blackIron, `ISLAND_20_HABIT_COLUMN_${index + 1}`, 2);
    column.position.set(Math.cos(angle) * 0.72, 0.72 + level * 0.08, Math.sin(angle) * 0.72);
    root.add(column);
    if (level >= 2) addBrazier(root, `ISLAND_20_HABIT_BRAZIER_${index + 1}`, [Math.cos(angle) * 0.72, 1.4 + level * 0.08, Math.sin(angle) * 0.72], materials, 0.62);
  }
  const roof = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.1, 6, qualitySegments(quality) * 2), materials.agedBrass);
  roof.name = 'ISLAND_20_HABIT_CHOICE_RING';
  roof.rotation.x = Math.PI / 2;
  roof.position.y = 1.38 + level * 0.14;
  roof.userData.constructionStage = 3;
  root.add(roof);
  return root;
}

function createAshenTrialworks(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_ASHEN_TRIALWORKS';
  const base = box(1.65 + level * 0.12, 0.28, 1.35 + level * 0.08, materials.obsidian, 'ISLAND_20_TRIALWORKS_BASE', 1);
  base.position.y = 0.14;
  root.add(base);
  for (let side = -1; side <= 1; side += 2) {
    const tower = cylinder(0.28, 0.36, 0.85 + level * 0.24, materials.cutBasalt, `ISLAND_20_TRIALWORKS_VENT_${side < 0 ? 'LEFT' : 'RIGHT'}`, qualitySegments(quality), 2);
    tower.position.set(side * 0.55, 0.62 + level * 0.12, 0);
    root.add(tower);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.42, qualitySegments(quality)), materials.blackIron);
    cap.name = `${tower.name}_CAP`;
    cap.position.set(tower.position.x, 1.24 + level * 0.24, 0);
    cap.userData.constructionStage = 3;
    root.add(cap);
  }
  const trialFrame = new THREE.Mesh(new THREE.TorusGeometry(0.48, 0.095, 7, qualitySegments(quality) * 2, Math.PI), materials.agedBrass);
  trialFrame.name = 'ISLAND_20_MYSTERY_TRIAL_FRAME';
  trialFrame.position.set(0, 0.82, 0.65);
  trialFrame.rotation.z = Math.PI;
  trialFrame.userData.constructionStage = 2;
  root.add(trialFrame);
  return root;
}

function createObsidianArchive(level: 1 | 2 | 3, quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_OBSIDIAN_ARCHIVE';
  const base = cylinder(0.88 + level * 0.08, 1.0 + level * 0.08, 0.3, materials.deepObsidian, 'ISLAND_20_ARCHIVE_VAULT_BASE', qualitySegments(quality), 1);
  base.position.y = 0.15;
  root.add(base);
  const keep = box(1.28, 0.82 + level * 0.25, 1.05, materials.obsidian, 'ISLAND_20_ARCHIVE_KEEP', 2);
  keep.position.y = 0.72 + level * 0.12;
  root.add(keep);
  for (let index = 0; index < 3 + level; index += 1) {
    const angle = THREE.MathUtils.lerp(-0.75, 0.75, index / Math.max(1, 2 + level));
    const stele = box(0.16, 0.72 + index % 2 * 0.22, 0.08, materials.agedBrass, `ISLAND_20_WISDOM_STELE_${index + 1}`, 3);
    stele.position.set(Math.sin(angle) * 0.64, 0.8 + index % 2 * 0.11, 0.58);
    stele.rotation.y = -angle * 0.3;
    root.add(stele);
  }
  if (level === 3) {
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.88, 0.86, qualitySegments(quality)), materials.blackIron);
    roof.name = 'ISLAND_20_ARCHIVE_OBSIDIAN_CROWN';
    roof.position.y = 1.78 + level * 0.1;
    roof.userData.constructionStage = 4;
    root.add(roof);
  }
  return root;
}

export function buildIsland20LavaLabyrinthLandmark(
  definition: Island5LandmarkDefinition,
  level: BuildLevel,
  quality: Island3DQuality,
  materials: Island20LavaLabyrinthMaterials,
  options: IslandConstructionFactoryOptions = {},
) {
  const root = new THREE.Group();
  root.name = `ISLAND_20_${definition.id.toUpperCase()}_ROOT`;
  root.position.set(...definition.position);
  const focusSocket = addSocket(root, `ISLAND_20_${definition.id.toUpperCase()}_FOCUS_SOCKET`, [0, definition.id === 'boss' ? 1.6 : 1, 0]);
  const guardianSocket = definition.id === 'boss' ? addSocket(root, 'ISLAND_20_PYRE_SENTINEL_SOCKET', [0, 0.55, -0.18]) : null;
  const runtimeParts: Island20RuntimePart[] = [];
  if (level === 0) {
    const plot = cylinder(definition.id === 'boss' ? 1.68 : 1.08, definition.id === 'boss' ? 1.84 : 1.2, 0.22, materials.obsidian, `ISLAND_20_${definition.id.toUpperCase()}_LEVEL_ZERO_PLOT`, qualitySegments(quality), 1);
    plot.position.y = 0.11;
    root.add(plot);
  } else {
    const resolved = level as 1 | 2 | 3;
    if (definition.id === 'boss') {
      const citadel = createCrucibleCitadel(resolved, quality, materials);
      citadel.root.scale.setScalar(resolved === 3 ? 1.1 : resolved === 2 ? 1.08 : 1.02);
      citadel.root.userData.macroScale = 'source-authoritative-central-dominance';
      runtimeParts.push(
        registerIsland20RuntimePart('p07', citadel.root, 'citadel-foundation'),
        registerIsland20RuntimePart('p08', citadel.tower, 'citadel-tower'),
        registerIsland20RuntimePart('p09', citadel.wallRoot, 'citadel-maze'),
        registerIsland20RuntimePart('p10', citadel.gateRoot, 'citadel-gates'),
        registerIsland20RuntimePart('p11', citadel.forgeRoot, 'citadel-forge'),
      );
      const sentinel = citadel.root.getObjectByName('ISLAND_20_PYRE_SENTINEL') ?? guardianSocket ?? citadel.root;
      runtimeParts.push(registerIsland20RuntimePart('p12', sentinel, 'arena-guardian'));
      root.add(citadel.root);
    } else {
      const architecture = definition.id === 'hatchery'
        ? createMagmaHatchery(resolved, quality, materials)
        : definition.id === 'habit'
          ? createFirePathSanctum(resolved, quality, materials)
          : definition.id === 'event'
            ? createAshenTrialworks(resolved, quality, materials)
            : createObsidianArchive(resolved, quality, materials);
      architecture.rotation.y = Math.atan2(-definition.position[0], -definition.position[2]);
      const partPair: readonly [Island20RuntimePartId, Island20RuntimePartId] = definition.id === 'hatchery'
        ? ['p13','p14'] : definition.id === 'habit' ? ['p15','p16'] : definition.id === 'event' ? ['p17','p18'] : ['p19','p20'];
      runtimeParts.push(registerIsland20RuntimePart(partPair[0], architecture, 'landmark-macro'));
      const growthNode = architecture.children[architecture.children.length - 1] ?? architecture;
      runtimeParts.push(registerIsland20RuntimePart(partPair[1], growthNode, 'landmark-growth'));
      root.add(architecture);
    }
    if (options.constructionPreview === 'target') {
      const architecture = root.children.find((child) => child !== focusSocket && child !== guardianSocket);
      if (architecture instanceof THREE.Group) applyIslandConstructionAuthoring({ root: architecture, worldSourceNumber: 20, landmarkId: definition.id, quality, includeTemporaryRig: true });
    }
  }
  root.userData.landmarkId = definition.id;
  root.userData.buildLevel = level;
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    world: 'island-020-lava-labyrinth',
    parts: runtimeParts,
    sockets: { focus: focusSocket.name, ...(guardianSocket ? { guardian: guardianSocket.name } : {}) },
    colliders: [{ id: `island-020-${definition.id}`, type: 'cylinder', isTrigger: true, radius: definition.id === 'boss' ? (level === 3 ? 2.85 : 2.1) : 1.12 }],
    destructionGroups: [{ id: `${definition.id}-architecture`, breakable: false, partIds: runtimeParts.map((part) => part.id) }],
    attachment: { parentId: 'p01', parentSocket: `${definition.id}-burial-collar`, localStart: [0, 0, 0], localEnd: [0, 0.12, 0], contactType: 'embedded', embedDepth: 0.12, gapTolerance: 0.01 },
  };
  root.traverse((child) => { child.userData.landmarkId = definition.id; });
  if (!options.constructionPreview) {
    batchStaticMeshes(
      root,
      `ISLAND_20_${definition.id.toUpperCase()}_STATIC_BATCH`,
      (mesh) => definition.id === 'boss' && mesh.name.includes('CITADEL_CROWN_FLAME'),
    );
  }
  return root;
}

function createFloatingIslandShell(quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_ACTUAL_3D_CONTINUOUS_VOLCANIC_WORLD';
  const segments = quality === 'high' ? 64 : quality === 'medium' ? 48 : 32;
  const terrain = new THREE.Mesh(createVolcanicIslandGeometry(segments), materials.deepObsidian);
  terrain.name = 'ISLAND_20_ACTUAL_3D_TERRAIN_VOLUME';
  terrain.castShadow = true;
  terrain.receiveShadow = true;
  root.add(terrain);

  const plateau = new THREE.Mesh(createLobedMesaGeometry(segments, 5.55, 0.32, 0.4, 0.045), materials.obsidian);
  plateau.name = 'ISLAND_20_IRREGULAR_BURIED_FOUNDATION_MESA';
  plateau.position.y = 0.16;
  plateau.castShadow = true;
  plateau.receiveShadow = true;
  root.add(plateau);
  const terraceSpecs = [
    { radius: 4.82, height: 0.16, y: 0.34, phase: 1.2 },
    { radius: 3.7, height: 0.19, y: 0.39, phase: 2.3 },
    { radius: 2.58, height: 0.23, y: 0.45, phase: 3.6 },
  ] as const;
  terraceSpecs.forEach((terrace, index) => {
    const rim = new THREE.Mesh(
      createLobedMesaGeometry(segments, terrace.radius, terrace.height, terrace.phase, 0.035 + index * 0.012),
      index === 1 ? materials.cutBasalt : materials.obsidian,
    );
    rim.name = `ISLAND_20_ACTUAL_3D_STRATIFIED_TERRACE_MESA_${index + 1}`;
    rim.position.y = terrace.y;
    rim.castShadow = true;
    rim.receiveShadow = true;
    root.add(rim);
  });

  const satelliteTerraces = new THREE.Group();
  satelliteTerraces.name = 'ISLAND_20_ACTUAL_3D_CONNECTED_LANDMARK_TERRACES';
  ISLAND_5_LANDMARKS.filter((landmark) => landmark.id !== 'boss').forEach((landmark) => {
    const [x, , z] = landmark.position;
    const radial = new THREE.Vector3(x, 0, z);
    const bridgeStart = radial.clone().normalize().multiplyScalar(4.82);
    const terracePosition = radial.clone();
    const bridgeDelta = terracePosition.clone().sub(bridgeStart);
    const bridge = box(0.82, 0.3, Math.max(0.72, bridgeDelta.length()), materials.cutBasalt, `ISLAND_20_${landmark.id.toUpperCase()}_ROCK_BRIDGE`, 1);
    bridge.position.copy(bridgeStart.clone().add(terracePosition).multiplyScalar(0.5));
    bridge.position.y = 0.13;
    bridge.rotation.y = Math.atan2(bridgeDelta.x, bridgeDelta.z);
    const platform = cylinder(1.2, 1.38, 0.42, materials.obsidian, `ISLAND_20_${landmark.id.toUpperCase()}_VOLCANIC_TERRACE`, segments, 1);
    platform.position.set(x, 0.07, z);
    const rootCrag = cylinder(1.16, 0.34, 2.2, materials.deepObsidian, `ISLAND_20_${landmark.id.toUpperCase()}_TERRACE_UNDERSIDE`, Math.max(8, Math.floor(segments / 3)), 1);
    rootCrag.position.set(x, -1.17, z);
    satelliteTerraces.add(bridge, platform, rootCrag);
  });
  root.add(satelliteTerraces);

  const cragCount = Math.round(20 * qualityScale(quality));
  for (let index = 0; index < cragCount; index += 1) {
    const angle = index / cragCount * Math.PI * 2;
    const crag = new THREE.Mesh(new THREE.ConeGeometry(0.58 + index % 4 * 0.11, 2.0 + index % 5 * 0.34, 5), index % 3 === 0 ? materials.obsidian : materials.deepObsidian);
    crag.name = `ISLAND_20_CLIFF_STRATUM_BUTTRESS_${index + 1}`;
    crag.position.set(Math.cos(angle) * (5.48 + index % 3 * 0.18), -1.46 - index % 3 * 0.26, Math.sin(angle) * (5.48 + index % 3 * 0.18));
    crag.scale.set(1, 1.18 + index % 3 * 0.18, 0.76);
    crag.rotation.set(index * 0.07, -angle, index % 2 ? 0.1 : -0.12);
    crag.castShadow = true;
    root.add(crag);
  }
  root.userData.closedTerrainVolume = true;
  root.userData.environmentPlateAllowed = false;
  return root;
}

function createLavaNetwork(quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_ACTUAL_3D_RECESSED_LAVA_NETWORK';
  const magmaSurface = materials.magma.clone();
  magmaSurface.name = 'ISLAND_20_DOUBLE_SIDED_FLOWING_MAGMA';
  magmaSurface.side = THREE.DoubleSide;
  magmaSurface.emissiveIntensity = 2.25;
  const magmaCoreSurface = materials.magmaCore.clone();
  magmaCoreSurface.name = 'ISLAND_20_DOUBLE_SIDED_MAGMA_HOT_CORE';
  magmaCoreSurface.side = THREE.DoubleSide;
  magmaCoreSurface.opacity = 1;
  const moltenSeaMaterial = new THREE.ShaderMaterial({
    name: 'ISLAND_20_MAGMA_SEA_CELLULAR_FLOW_SHADER',
    defines: {
      ISLAND20_LAVA_OCTAVES: lavaNoiseOctaves(quality),
    },
    uniforms: {
      uElapsed: { value: 0 },
      uThermalPulse: { value: 0.5 },
    },
    vertexShader: `
      uniform float uElapsed;
      uniform float uThermalPulse;
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;
      void main() {
        float phaseA = position.x * 0.72 + position.y * 0.46 + uElapsed * 0.38;
        float phaseB = position.x * -0.41 + position.y * 1.08 - uElapsed * 0.24;
        float thermalLift = mix(0.72, 1.0, uThermalPulse);
        float waveHeight = (sin(phaseA) * 0.052 + sin(phaseB) * 0.026) * thermalLift;
        float slopeX = (cos(phaseA) * 0.72 * 0.052 + cos(phaseB) * -0.41 * 0.026) * thermalLift;
        float slopeY = (cos(phaseA) * 0.46 * 0.052 + cos(phaseB) * 1.08 * 0.026) * thermalLift;
        vec3 displacedPosition = position + normal * waveHeight;
        vec3 displacedNormal = normalize(vec3(-slopeX, -slopeY, 1.0));
        vLocalPosition = position;
        vec4 worldPosition = modelMatrix * vec4(displacedPosition, 1.0);
        vWorldPosition = worldPosition.xyz;
        vWorldNormal = normalize(mat3(modelMatrix) * displacedNormal);
        gl_Position = projectionMatrix * viewMatrix * worldPosition;
      }
    `,
    fragmentShader: `
      uniform float uElapsed;
      uniform float uThermalPulse;
      varying vec3 vLocalPosition;
      varying vec3 vWorldPosition;
      varying vec3 vWorldNormal;

      ${ISLAND_20_LAVA_NOISE_GLSL}

      void main() {
        float boundaryAngle = atan(vLocalPosition.y, vLocalPosition.x);
        float irregularBoundary = 11.8 * (
          1.0
          + sin(boundaryAngle * 5.0 + 0.6) * 0.055
          + sin(boundaryAngle * 9.0 - 0.35) * 0.026
        );
        if (length(vLocalPosition.xy) > irregularBoundary) discard;
        vec2 p = vWorldPosition.xz * 0.72;
        vec2 drift = vec2(uElapsed * 0.055, -uElapsed * 0.038);
        float warpA = lavaFbm(p * 0.54 + drift + vec2(3.2, -1.6));
        float warpB = lavaFbm(p * 0.92 - drift * 0.62 + vec2(-5.1, 2.7));
        vec2 warped = p + vec2(warpA - 0.5, warpB - 0.5) * 1.1;
        float plates = lavaFbm(warped * 0.73);
        float breakup = lavaFbm(warped * 1.68 + vec2(6.4, -2.2));
        float micro = lavaNoise(warped * 6.8 + drift * 3.1);

        // Large cooled rafts dominate the sea. The heat is confined to thin,
        // branching fracture rims and slower orange openings between plates.
        float primaryFracture = 1.0 - smoothstep(0.026, 0.115, abs(plates - 0.52));
        float secondaryFracture = 1.0 - smoothstep(0.045, 0.15, abs(breakup - 0.48));
        float fissure = clamp(primaryFracture * 0.94 + secondaryFracture * 0.34, 0.0, 1.0);
        float openMolten = smoothstep(0.35, 0.67, 1.0 - abs(plates - 0.5) * 1.82);
        float raft = smoothstep(0.54, 0.72, plates * 0.74 + breakup * 0.26)
          * (1.0 - fissure * 0.9);

        vec3 crustLow = vec3(0.006, 0.005, 0.004);
        vec3 crustHigh = vec3(0.028, 0.014, 0.009);
        vec3 deepMolten = vec3(0.21, 0.008, 0.001);
        vec3 orangeMolten = vec3(0.82, 0.075, 0.0025);
        vec3 hotFissure = vec3(1.0, 0.34, 0.018);
        vec3 whiteCore = vec3(1.0, 0.78, 0.16);

        vec3 crust = mix(crustLow, crustHigh, breakup * 0.6 + micro * 0.18);
        vec3 molten = mix(deepMolten, orangeMolten, openMolten * 0.72 + micro * 0.1);
        molten = mix(molten, hotFissure, fissure * 0.78);
        molten = mix(molten, whiteCore, pow(fissure, 4.6) * (0.18 + uThermalPulse * 0.11));
        vec3 color = mix(molten, crust, raft * 0.98);

        vec3 normal = normalize(vWorldNormal);
        vec3 viewDirection = normalize(cameraPosition - vWorldPosition);
        float fresnel = pow(1.0 - max(dot(normal, viewDirection), 0.0), 3.0);
        vec3 halfVector = normalize(normalize(vec3(-0.36, 0.9, 0.24)) + viewDirection);
        float glint = pow(max(dot(halfVector, normal), 0.0), 26.0);
        color += vec3(0.2, 0.03, 0.004) * fresnel * (1.0 - raft) * 0.32;
        color += vec3(1.0, 0.16, 0.012) * glint * fissure * 0.08;
        gl_FragColor = vec4(color, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }
    `,
    side: THREE.DoubleSide,
    depthWrite: true,
    toneMapped: true,
  });
  const seaGridSegments = quality === 'high' ? 40 : quality === 'medium' ? 28 : 18;
  const moltenSeaGeometry = new THREE.PlaneGeometry(25.8, 25.8, seaGridSegments, seaGridSegments);
  const moltenSea = new THREE.Mesh(moltenSeaGeometry, moltenSeaMaterial);
  moltenSea.name = 'ISLAND_20_IRREGULAR_PHYSICAL_MAGMA_SEA';
  moltenSea.rotation.x = -Math.PI / 2;
  moltenSea.scale.y = 0.84;
  moltenSea.position.set(0, -4.45, -0.6);
  moltenSea.renderOrder = -4;
  moltenSea.userData.surfaceMotion = 'two-frequency-vertex-displacement-with-derived-wave-normals';
  moltenSea.userData.shaderCost = `${lavaNoiseOctaves(quality)}-octave-quality-scaled-fbm`;
  root.add(moltenSea);
  // The source has branching rivers and falls, not a luminous racetrack.
  // Irregular catchbasins terminate the channels without restoring the
  // concentric board silhouette that failed the previous family.
  const catchbasins = new THREE.Group();
  catchbasins.name = 'ISLAND_20_OUTER_MOLTEN_CATCHBASINS';
  for (let index = 0; index < 5; index += 1) {
    const angle = index / 5 * Math.PI * 2 + Math.PI * 0.08;
    const basin = new THREE.Mesh(
      createLobedMesaGeometry(
        Math.max(12, Math.floor(qualitySegments(quality) * 1.5)),
        0.48 + index % 2 * 0.08,
        0.045,
        index * 1.3,
        0.16,
      ),
      magmaSurface,
    );
    basin.name = `ISLAND_20_OUTER_MOLTEN_CATCHBASIN_${index + 1}`;
    basin.position.set(Math.cos(angle) * 5.32, 0.31, Math.sin(angle) * 5.32);
    catchbasins.add(basin);
  }
  root.add(catchbasins);
  for (let direction = 0; direction < 5; direction += 1) {
    const angle = direction / 5 * Math.PI * 2 + Math.PI * 0.08;
    const drift = direction % 2 ? 0.18 : -0.14;
    const surfacePoints = [
      new THREE.Vector3(Math.cos(angle + drift) * 2.1, 0.43, Math.sin(angle + drift) * 2.1),
      new THREE.Vector3(Math.cos(angle - drift * 0.4) * 3.2, 0.36, Math.sin(angle - drift * 0.4) * 3.2),
      new THREE.Vector3(Math.cos(angle + drift * 0.5) * 4.25, 0.29, Math.sin(angle + drift * 0.5) * 4.25),
      new THREE.Vector3(Math.cos(angle) * 5.55, 0.18, Math.sin(angle) * 5.55),
    ];
    const bed = createLavaRibbon(surfacePoints.map((point) => point.clone().add(new THREE.Vector3(0, -0.035, 0))), 0.3 + direction % 2 * 0.045, materials.blackIron, `ISLAND_20_RECESSED_LAVA_CHANNEL_${direction + 1}_BED`);
    const river = createLavaRibbon(surfacePoints, 0.21 + direction % 2 * 0.035, magmaSurface, `ISLAND_20_FLOWING_LAVA_RIVER_${direction + 1}`);
    const riverCore = createLavaRibbon(surfacePoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.018, 0))), 0.085 + direction % 2 * 0.012, magmaCoreSurface, `ISLAND_20_FLOWING_LAVA_RIVER_${direction + 1}_HOT_CORE`);
    river.userData.phase = direction * 0.93;
    const fallPoints = [
      surfacePoints[surfacePoints.length - 1],
      new THREE.Vector3(Math.cos(angle) * 5.76, -0.72, Math.sin(angle) * 5.76),
      new THREE.Vector3(Math.cos(angle + drift * 0.35) * 5.54, -2.18, Math.sin(angle + drift * 0.35) * 5.54),
      new THREE.Vector3(Math.cos(angle - drift * 0.25) * 4.86, -3.72, Math.sin(angle - drift * 0.25) * 4.86),
    ];
    const fall = createLavaRibbon(fallPoints, 0.24 + direction % 2 * 0.05, magmaSurface, `ISLAND_20_CLIFF_LAVAFALL_${direction + 1}`);
    const fallCore = createLavaRibbon(fallPoints, 0.09 + direction % 2 * 0.015, magmaCoreSurface, `ISLAND_20_CLIFF_LAVAFALL_${direction + 1}_HOT_CORE`);
    fall.userData.phase = direction * 0.93 + 0.4;
    root.add(bed, river, riverCore, fall, fallCore);
  }
  root.userData.volumeScope = 'surface-rivers-and-cliff-falls';
  root.userData.flowDirection = 'crucible-outward-then-gravity-down';
  root.userData.moltenSeaMaterial = moltenSeaMaterial;
  root.userData.surfaceMotion = 'physical-authored-lava-and-grid-sea-vertex-displacement';
  return root;
}

function createRouteContext(materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_CANONICAL_ROUTE_CONTEXT';
  const inner = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_20_ROUTE_CLEARANCE_INNER_RADIUS - 0.08, 0.045, 6, 48), materials.agedBrass);
  inner.name = 'ISLAND_20_ROUTE_INNER_BRASS_GUIDE';
  inner.rotation.x = Math.PI / 2;
  inner.position.y = 0.34;
  const outer = new THREE.Mesh(new THREE.TorusGeometry(ISLAND_20_ROUTE_CLEARANCE_OUTER_RADIUS + 0.08, 0.045, 6, 48), materials.blackIron);
  outer.name = 'ISLAND_20_ROUTE_OUTER_IRON_GUIDE';
  outer.rotation.x = Math.PI / 2;
  outer.position.y = 0.32;
  root.add(inner, outer);
  root.userData.ownsCanonicalTiles = false;
  root.userData.clearance = { inner: ISLAND_20_ROUTE_CLEARANCE_INNER_RADIUS, outer: ISLAND_20_ROUTE_CLEARANCE_OUTER_RADIUS };
  return root;
}

function createIronSkiffEscapeMission(materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_IRON_SKIFF_ESCAPE_MISSION';
  const skiff = new THREE.Group();
  skiff.name = 'ISLAND_20_IRON_SKIFF';
  const stageGroups: THREE.Group[] = [];
  for (let stage = 1; stage <= 4; stage += 1) {
    const group = new THREE.Group();
    group.name = `ISLAND_20_IRON_SKIFF_STAGE_${stage}`;
    stageGroups.push(group);
    skiff.add(group);
  }

  const hull = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.2, 1.18, 8, 1, false, 0, Math.PI), materials.blackIron);
  hull.name = 'ISLAND_20_SKIFF_RIVETED_HULL';
  hull.rotation.set(Math.PI / 2, 0, Math.PI / 2);
  hull.scale.z = 0.66;
  const keel = box(0.12, 0.18, 1.36, materials.deepObsidian, 'ISLAND_20_SKIFF_OBSIDIAN_KEEL', 3);
  keel.position.y = -0.2;
  const prow = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.62, 6), materials.blackIron);
  prow.name = 'ISLAND_20_SKIFF_WEDGE_PROW';
  prow.rotation.x = Math.PI / 2;
  prow.position.z = 0.78;
  stageGroups[0].add(hull, keel, prow);
  for (const side of [-1, 1]) {
    const shield = box(0.12, 0.36, 1.12, materials.cutBasalt, `ISLAND_20_SKIFF_${side < 0 ? 'LEFT' : 'RIGHT'}_HEATSHIELD`, 4);
    shield.position.set(side * 0.34, 0.12, -0.02);
    shield.rotation.z = side * -0.13;
    const rail = box(0.055, 0.07, 1.06, materials.agedBrass, `${shield.name}_BRASS_RAIL`, 3);
    rail.position.set(side * 0.41, 0.34, -0.02);
    stageGroups[1].add(shield, rail);
  }
  for (const side of [-1, 1]) {
    const vane = box(0.08, 0.42, 0.46, materials.blackIron, `ISLAND_20_SKIFF_${side < 0 ? 'LEFT' : 'RIGHT'}_STEERING_VANE`, 3);
    vane.position.set(side * 0.43, 0.05, -0.5);
    vane.rotation.z = side * 0.3;
    stageGroups[2].add(vane);
  }
  const helm = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.035, 7, 14), materials.agedBrass);
  helm.name = 'ISLAND_20_SKIFF_TWIN_PADDLE_HELM';
  helm.position.set(0, 0.42, -0.22);
  helm.rotation.y = Math.PI / 2;
  stageGroups[2].add(helm);
  const furnace = cylinder(0.19, 0.24, 0.44, materials.blackIron, 'ISLAND_20_SKIFF_HEART_FURNACE', 10, 4);
  furnace.position.set(0, 0.25, 0.2);
  const furnaceCore = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 1), materials.emberGlass);
  furnaceCore.name = 'ISLAND_20_SKIFF_HEART_FURNACE_CORE';
  furnaceCore.position.set(0, 0.48, 0.2);
  furnaceCore.scale.set(0.7, 1.3, 0.7);
  stageGroups[3].add(furnace, furnaceCore);
  stageGroups.forEach((group, index) => batchStaticMeshes(group, `ISLAND_20_SKIFF_STAGE_${index + 1}_BATCH`));
  const completeSkiff = new THREE.Group();
  completeSkiff.name = 'ISLAND_20_IRON_SKIFF_COMPLETE_BATCH';
  stageGroups.forEach((group) => completeSkiff.add(group.clone(true)));
  completeSkiff.traverse((object) => {
    if (object instanceof THREE.Mesh) object.material = materials.blackIron;
  });
  batchStaticMeshes(completeSkiff, 'ISLAND_20_COMPLETE_SKIFF_STATIC_BATCH');
  const completeSkiffGlow = new THREE.Mesh(new THREE.OctahedronGeometry(0.15, 1), materials.emberGlass);
  completeSkiffGlow.name = 'ISLAND_20_COMPLETE_SKIFF_FURNACE_GLOW';
  completeSkiffGlow.position.set(0, 0.48, 0.2);
  completeSkiffGlow.scale.set(0.72, 1.45, 0.72);
  completeSkiff.add(completeSkiffGlow);
  completeSkiff.visible = false;
  skiff.add(completeSkiff);

  const escapeCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(0, 3.92, -0.24),
    new THREE.Vector3(-0.2, 2.5, 0.48),
    new THREE.Vector3(0.48, 1.5, 1.1),
    new THREE.Vector3(-0.42, 0.92, 1.82),
    new THREE.Vector3(0.34, 0.48, 2.58),
    new THREE.Vector3(0.02, -0.32, 4.22),
    new THREE.Vector3(0, -1.34, 6.35),
  ]);
  const escapePoints = escapeCurve.getPoints(56);
  const channelBed = createLavaRibbon(escapePoints, 0.26, materials.blackIron, 'ISLAND_20_GUIDED_ESCAPE_CHANNEL_CARVED_BED');
  const channel = createLavaRibbon(
    escapePoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.018, 0))),
    0.155,
    materials.magma,
    'ISLAND_20_GUIDED_MOLTEN_ESCAPE_CHANNEL',
  );
  const channelCore = createLavaRibbon(
    escapePoints.map((point) => point.clone().add(new THREE.Vector3(0, 0.032, 0))),
    0.055,
    materials.magmaCore,
    'ISLAND_20_GUIDED_MOLTEN_ESCAPE_CHANNEL_HOT_CORE',
  );
  channel.userData.flowDirection = 'summit-through-three-junctions-to-front-lavafall';

  const navigationGates = new THREE.Group();
  navigationGates.name = 'ISLAND_20_THREE_READABLE_NAVIGATION_JUNCTIONS';
  const beaconPositions: THREE.Vector3[] = [];
  [0.18, 0.31, 0.46].forEach((t, index) => {
    const point = escapeCurve.getPointAt(t);
    const tangent = escapeCurve.getTangentAt(t).normalize();
    const gate = new THREE.Group();
    gate.name = `ISLAND_20_NAVIGATION_GATE_${index + 1}`;
    for (const side of [-1, 1]) {
      const fin = box(0.12, 0.72 + index * 0.1, 0.18, materials.blackIron, `${gate.name}_${side < 0 ? 'LEFT' : 'RIGHT'}_FIN`, 3);
      fin.position.x = side * 0.5;
      gate.add(fin);
      beaconPositions.push(point.clone()
        .add(new THREE.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(side * 0.5))
        .add(new THREE.Vector3(0, 0.48 + index * 0.05, 0)));
    }
    const lintel = box(1.16, 0.1, 0.18, materials.agedBrass, `${gate.name}_LINTEL`, 4);
    lintel.position.y = 0.64 + index * 0.1;
    gate.add(lintel);
    gate.position.copy(point);
    gate.rotation.y = Math.atan2(tangent.x, tangent.z);
    navigationGates.add(gate);
  });
  batchStaticMeshes(navigationGates, 'ISLAND_20_NAVIGATION_GATE_BATCH');
  const beaconInstances = new THREE.InstancedMesh(
    new THREE.OctahedronGeometry(0.11, 0),
    materials.emberGlass,
    beaconPositions.length,
  );
  beaconInstances.name = 'ISLAND_20_NAVIGATION_GATE_CUE_INSTANCES';
  beaconInstances.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const beaconMatrixHelper = new THREE.Object3D();
  beaconPositions.forEach((position, index) => {
    beaconMatrixHelper.position.copy(position);
    beaconMatrixHelper.scale.setScalar(1);
    beaconMatrixHelper.updateMatrix();
    beaconInstances.setMatrixAt(index, beaconMatrixHelper.matrix);
  });
  beaconInstances.instanceMatrix.needsUpdate = true;
  navigationGates.add(beaconInstances);

  const extractionShip = new THREE.Group();
  extractionShip.name = 'ISLAND_20_EXPEDITION_EXTRACTION_SHIP';
  extractionShip.position.set(0, -1.48, 6.85);
  const shipHull = new THREE.Mesh(new THREE.SphereGeometry(0.92, 12, 7), materials.deepObsidian);
  shipHull.name = 'ISLAND_20_EXPEDITION_SHIP_HULL';
  shipHull.scale.set(1.82, 0.46, 0.82);
  const shipDeck = box(1.9, 0.16, 0.76, materials.blackIron, 'ISLAND_20_EXPEDITION_SHIP_DECK', 3);
  shipDeck.position.y = 0.28;
  for (const side of [-1, 1]) {
    const wing = box(0.92, 0.09, 0.32, materials.agedBrass, `ISLAND_20_EXPEDITION_SHIP_${side < 0 ? 'LEFT' : 'RIGHT'}_WING_STRUT`, 4);
    wing.position.set(side * 0.92, 0.18, 0.08);
    wing.rotation.z = side * -0.08;
    const pod = cylinder(0.22, 0.28, 0.72, materials.blackIron, `ISLAND_20_EXPEDITION_SHIP_${side < 0 ? 'LEFT' : 'RIGHT'}_ENGINE_POD`, 9, 4);
    pod.position.set(side * 1.34, 0.12, 0.08);
    pod.rotation.x = Math.PI / 2;
    extractionShip.add(wing, pod);
  }
  const cradle = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.09, 8, 20), materials.agedBrass);
  cradle.name = 'ISLAND_20_MAGNETIC_EXTRACTION_CRADLE';
  cradle.position.set(0, 0.56, -0.22);
  cradle.rotation.z = Math.PI;
  const tether = box(0.055, 1.8, 0.055, materials.emberGlass, 'ISLAND_20_MAGNETIC_EXTRACTION_TETHER', 4);
  tether.position.set(0, 1.25, -0.22);
  extractionShip.add(shipHull, shipDeck, cradle, tether);
  batchStaticMeshes(extractionShip, 'ISLAND_20_EXTRACTION_SHIP_BATCH', (mesh) => mesh.name.includes('TETHER'));

  skiff.position.copy(escapeCurve.getPointAt(0));
  skiff.scale.setScalar(0.72);
  root.add(channelBed, channel, channelCore, navigationGates, skiff, extractionShip);
  return { root, skiff, stageGroups, completeSkiff, beaconInstances, beaconPositions, beaconMatrixHelper, extractionShip, tether, escapeCurve };
}

function createVolcanicHorizon(quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_VOLCANIC_HORIZON';
  const peakCount = quality === 'high' ? 14 : quality === 'medium' ? 10 : 7;
  for (let index = 0; index < peakCount; index += 1) {
    const angle = index / peakCount * Math.PI * 2 + 0.18;
    // Keep the skyline outside every authored orbit camera. Earlier peaks sat
    // on the same radius as the phone camera and became giant black foreground
    // wedges instead of distant volcanoes.
    const radius = 46 + index % 4 * 4.2;
    const height = 5.2 + index % 5 * 0.98;
    const peak = new THREE.Mesh(new THREE.ConeGeometry(1.5 + index % 3 * 0.42, height, 7), materials.deepObsidian);
    peak.name = `ISLAND_20_DISTANT_VOLCANO_${index + 1}`;
    peak.position.set(Math.cos(angle) * radius, -3.4 + height * 0.5, Math.sin(angle) * radius);
    peak.rotation.y = angle + index * 0.31;
    root.add(peak);
    if (index % 2 === 0) {
      const fissure = new THREE.Mesh(new THREE.ConeGeometry(0.12, height * 0.72, 5), materials.magmaCore);
      fissure.name = `${peak.name}_LAVA_GROOVE`;
      fissure.position.copy(peak.position);
      fissure.position.y += 0.1;
      fissure.scale.z = 0.18;
      root.add(fissure);
    }
  }
  return root;
}

function createForgeLife(quality: Island3DQuality, materials: Island20LavaLabyrinthMaterials) {
  const root = new THREE.Group();
  root.name = 'ISLAND_20_FORGE_INHABITANTS';
  const count = quality === 'high' ? 7 : quality === 'medium' ? 5 : 3;
  for (let index = 0; index < count; index += 1) {
    const angle = index / count * Math.PI * 2 + Math.PI / 7;
    const radius = index % 2 ? 4.55 : 2.22;
    if (!isIsland20RouteCorridorClear(Math.cos(angle) * radius, Math.sin(angle) * radius, 0.14)) continue;
    const smith = new THREE.Group();
    smith.name = `ISLAND_20_FORGE_INHABITANT_${index + 1}`;
    const body = cylinder(0.08, 0.12, 0.32, materials.blackIron, `${smith.name}_BODY`, 7, 5);
    body.position.y = 0.22;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 7, 5), materials.agedBrass);
    head.position.y = 0.45;
    smith.add(body, head);
    smith.position.set(Math.cos(angle) * radius, 0.35, Math.sin(angle) * radius);
    smith.userData.phase = index * 0.83;
    batchStaticMeshes(smith, `ISLAND_20_FORGE_INHABITANT_${index + 1}_BATCH`);
    root.add(smith);
  }
  return root;
}

export function createIsland20LavaLabyrinthLivingAmbience(
  scene: THREE.Scene,
  profile: Island3DQualityProfile,
  materials: Island20LavaLabyrinthMaterials,
  buildLevel: BuildLevel = 3,
): Island20LavaLabyrinthAmbienceRuntime {
  const quality = profile.id;
  const root = new THREE.Group();
  root.name = 'ISLAND_20_LAVA_LABYRINTH_WORLD';
  const island = createFloatingIslandShell(quality, materials);
  const lava = createLavaNetwork(quality, materials);
  batchStaticMeshes(lava, 'ISLAND_20_LAVA_STATIC_BATCH');
  const route = createRouteContext(materials);
  const horizon = createVolcanicHorizon(quality, materials);
  const ironSkiffMission = createIronSkiffEscapeMission(materials);
  const life = createForgeLife(quality, materials);
  const stairs = new THREE.Group();
  stairs.name = 'ISLAND_20_STONE_CIRCULATION_NETWORK';
  for (let index = 0; index < 4; index += 1) {
    const angle = index / 4 * Math.PI * 2;
    const stair = new THREE.Group();
    stair.name = `ISLAND_20_RADIAL_STAIR_${index + 1}`;
    addStairs(stair, stair.name, 0.72, 0.72, 5, materials.cutBasalt, 0.22);
    stair.position.set(Math.cos(angle) * 2.18, 0.05, Math.sin(angle) * 2.18);
    stair.rotation.y = -angle + Math.PI / 2;
    stairs.add(stair);
  }
  const atmosphere = new THREE.Group();
  atmosphere.name = 'ISLAND_20_EMBER_ASH_ATMOSPHERE';
  const emberCount = quality === 'high' ? 96 : quality === 'medium' ? 58 : 32;
  const positions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index += 1) {
    const angle = index * 2.399963;
    const radius = 1.2 + (index % 31) / 31 * 10;
    positions[index * 3] = Math.cos(angle) * radius;
    positions[index * 3 + 1] = -1 + (index % 23) / 23 * 8;
    positions[index * 3 + 2] = Math.sin(angle) * radius;
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const embers = new THREE.Points(emberGeometry, new THREE.PointsMaterial({ color: 0xff6b24, size: quality === 'low' ? 0.08 : 0.055, transparent: true, opacity: 0.7, depthWrite: false, blending: THREE.AdditiveBlending }));
  embers.name = 'ISLAND_20_EMBER_DEPTH_FIELD';
  atmosphere.add(embers);
  const caretakerStation = new THREE.Group();
  caretakerStation.name = 'ISLAND_20_CARETAKER_AND_CONSTRUCTION_STATION';
  caretakerStation.position.set(-2.15, 0.4, -0.55);
  const anvil = box(0.4, 0.22, 0.24, materials.blackIron, 'ISLAND_20_CONSTRUCTION_ANVIL', 3);
  const banner = box(0.08, 0.82, 0.08, materials.agedBrass, 'ISLAND_20_CARETAKER_BANNER_POLE', 4);
  banner.position.set(-0.34, 0.42, 0);
  caretakerStation.add(anvil, banner);
  root.add(island, lava, route, horizon, ironSkiffMission.root, life, stairs, atmosphere, caretakerStation);
  batchStaticMeshes(island, 'ISLAND_20_SHELL_STATIC_BATCH');
  batchStaticMeshes(route, 'ISLAND_20_ROUTE_STATIC_BATCH');
  batchStaticMeshes(horizon, 'ISLAND_20_HORIZON_STATIC_BATCH');
  batchStaticMeshes(stairs, 'ISLAND_20_STAIRS_STATIC_BATCH');
  batchStaticMeshes(caretakerStation, 'ISLAND_20_STATION_STATIC_BATCH');

  const materialNode = new THREE.Object3D();
  materialNode.name = 'ISLAND_20_MATERIAL_NETWORK';
  materialNode.userData.heatLighting = 'shared-forge-key-plus-underglow-with-emissive-contact';
  const constructionNode = new THREE.Object3D();
  constructionNode.name = 'ISLAND_20_ADDITIVE_CONSTRUCTION_CONTRACT';
  const runtimeNode = new THREE.Object3D();
  runtimeNode.name = 'ISLAND_20_ACTION_READY_RUNTIME_CONTRACT';
  root.add(materialNode, constructionNode, runtimeNode);

  const parts: Island20RuntimePart[] = [
    registerIsland20RuntimePart('p01', island, 'world-shell'),
    registerIsland20RuntimePart('p02', horizon, 'horizon'),
    registerIsland20RuntimePart('p03', lava, 'lava-network'),
    registerIsland20RuntimePart('p04', stairs, 'circulation'),
    registerIsland20RuntimePart('p05', route, 'route-context'),
    registerIsland20RuntimePart('p06', atmosphere, 'atmosphere'),
    registerIsland20RuntimePart('p21', ironSkiffMission.stageGroups[1] ?? ironSkiffMission.root, 'mission-heatshields'),
    registerIsland20RuntimePart('p22', ironSkiffMission.beaconInstances, 'mission-navigation-beacons'),
    registerIsland20RuntimePart('p23', ironSkiffMission.skiff, 'mission-iron-skiff'),
    registerIsland20RuntimePart('p24', ironSkiffMission.root, 'mission-escape-channel'),
    registerIsland20RuntimePart('p25', ironSkiffMission.extractionShip, 'mission-extraction-finale'),
    registerIsland20RuntimePart('p26', caretakerStation, 'caretaker'),
    registerIsland20RuntimePart('p27', life, 'inhabitants'),
    registerIsland20RuntimePart('p28', embers, 'ambient-fx'),
    registerIsland20RuntimePart('p29', materialNode, 'materials'),
    registerIsland20RuntimePart('p30', constructionNode, 'construction-contract'),
    registerIsland20RuntimePart('p31', caretakerStation, 'construction-theatre'),
    registerIsland20RuntimePart('p32', runtimeNode, 'runtime-contract'),
  ];
  root.userData.representationFamily = ISLAND_20_AUTHORED_CITY_FAMILY;
  root.userData.environmentPlateAllowed = false;
  root.userData.weakViewProof = ['left-45', 'right-45', 'rear-180', 'top-clearance', 'front-cliff-low'];
  root.userData.macroIdentity = {
    terrain: 'irregular-closed-multi-lobed-volcanic-volume',
    labyrinth: 'deterministic-orthogonal-perfect-maze-with-keep-court',
    architecture: 'integrated-tiered-crucible-city-not-concentric-rails',
    escape: 'three-junction-carved-sluice-to-front-cliff-and-extraction-ship',
    lava: 'recessed-branching-ribbons-with-animated-hot-cores-and-local-heat-lights',
  };
  root.userData.sculptRuntime = {
    clickable: true,
    explodable: true,
    parts,
    sockets: { mission: 'ISLAND_20_IRON_SKIFF_ESCAPE_MISSION', construction: caretakerStation.name },
    colliders: [{ id: 'island-020-shell', type: 'cylinder', radius: 6.1, height: 4.8, isTrigger: false }],
    destructionGroups: [{ id: 'world', breakable: false, partIds: ISLAND_20_RUNTIME_PART_IDS }],
  };
  root.userData.performanceContract = { targetTriangles: 180000, maxDrawCalls: 175, quality };
  root.userData.ironSkiffNavigation = {
    controller: 'left-right-steering-plus-hold-forward-throttle',
    junctionCount: 3,
    autoForwardSafety: true,
    guaranteedExtraction: true,
  };
  scene.add(root);

  let currentStage = 0;
  let lastElapsed = 0;
  let skiffProgress = 0;
  let skiffSteering = 0;
  let skiffCompletionPending = false;
  let completedNavigationSequence = -1;
  let navigationPresentation: Island20SkiffNavigationPresentation = { active: false, steering: 0, throttle: 0, sequence: 0 };
  let authoredCity: THREE.Group | null = null;
  let authoredCityBatched = false;
  let authoredAssemblyStartElapsed = 0;
  let authoredLoadCancelled = false;
  const reducedMotion = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const forgeKey = scene.getObjectByName('ISLAND_20_CRUCIBLE_FORGE_KEY_LIGHT');
  const underglow = scene.getObjectByName('ISLAND_20_LAVA_UNDERGLOW_LIGHT');
  root.userData.lavaLookDevelopment = {
    flow: 'gravity-aware-domain-warped-macro-meso-micro-advection-on-physical-rivers-falls-and-sea',
    surface: 'cooled-crust-rafts-over-displaced-deep-molten-body-with-narrow-yellow-white-fissures-derived-wave-normals-and-view-dependent-glints',
    surfaceMotion: 'quality-scaled-two-frequency-vertex-displacement-on-authored-canals-falls-and-the-molten-sea',
    heatLighting: 'localized-drifting-canal-bounce-plus-live-forge-key-underglow-and-tonemapped-emissive-contact-response',
    shaderCost: `${lavaNoiseOctaves(quality)}-octave-fbm-${quality}`,
    surfaceMotionGeometryDelta: {
      drawCalls: 0,
      trianglesComparedToV11Sea: quality === 'high' ? 3136 : quality === 'medium' ? 1520 : 600,
      note: 'quality-scaled sea grid only; the complete scene remains below the existing 190k triangle test gate',
    },
    reducedMotion: 'deterministic-static-thermal-pose',
    performanceDeltaMaximum: {
      drawCalls: ISLAND_20_LAVA_VOLUME_ADDITIONAL_DRAW_CALLS_MAX,
      triangles: ISLAND_20_LAVA_VOLUME_ADDITIONAL_TRIANGLES_MAX,
      textureBytes: 0,
    },
  };
  root.userData.authoredCity = {
    asset: ISLAND_20_AUTHORED_CITY_GLB,
    scale: ISLAND_20_AUTHORED_CITY_SCALE,
    status: typeof window === 'undefined'
      ? 'server-fallback'
      : buildLevel >= 3
        ? 'loading'
        : 'awaiting-level-3',
    replacementScope: 'central-citadel-and-labyrinth-visuals-only',
  };
  if (typeof window !== 'undefined' && buildLevel >= 3) {
    void loadIsland20AuthoredCity(materials, quality).then((loadedCity) => {
      if (authoredLoadCancelled) {
        loadedCity.traverse((object) => {
          if (object instanceof THREE.Mesh) object.geometry.dispose();
        });
        const authoredLava = loadedCity.userData.authoredLavaMaterial;
        if (authoredLava instanceof THREE.Material) authoredLava.dispose();
        return;
      }
      authoredCity = loadedCity;
      authoredAssemblyStartElapsed = lastElapsed;
      loadedCity.children.forEach((part) => {
        if (!part.visible) return;
        part.position.y = Number(part.userData.assemblyRestY ?? part.position.y) - 0.62;
        part.scale.y = 0.08;
      });
      const heatLightPositions = [
        new THREE.Vector3(0, 0.76, 0.5),
        new THREE.Vector3(0, 0.68, 1.65),
        new THREE.Vector3(1.45, 0.68, -0.9),
        new THREE.Vector3(-1.45, 0.68, -0.9),
      ];
      heatLightPositions.forEach((position, index) => {
        const light = new THREE.PointLight(index === 0 ? 0xffa14a : 0xff3a0a, index === 0 ? 5.2 : 4.2, 4.4, 2.15);
        light.name = `ISLAND_20_AUTHORED_CANAL_HEAT_LIGHT_${index + 1}`;
        light.position.copy(position);
        light.userData.phase = index * 0.91;
        light.userData.basePosition = position.toArray();
        loadedCity.add(light);
      });
      root.add(loadedCity);
      const proceduralBoss = scene.getObjectByName('ISLAND_20_BOSS_ROOT');
      proceduralBoss?.traverse((object) => {
        if (
          object instanceof THREE.Mesh
          || object instanceof THREE.InstancedMesh
          || object instanceof THREE.Points
          || object instanceof THREE.LineSegments
        ) object.visible = false;
      });
      root.userData.authoredCity.status = 'loaded';
      root.userData.authoredCity.semanticPartCount = loadedCity.children.filter(
        (part) => part.visible && !(part instanceof THREE.Light),
      ).length;
      root.userData.representationFamily = ISLAND_20_AUTHORED_CITY_FAMILY;
    }).catch((error: unknown) => {
      if (authoredLoadCancelled) return;
      root.userData.authoredCity.status = 'fallback';
      root.userData.authoredCity.error = error instanceof Error ? error.message : String(error);
    });
  }
  const setStage = (stageValue: number, replay = false) => {
    const nextStage = THREE.MathUtils.clamp(Math.floor(stageValue), 0, ISLAND_20_IRON_SKIFF_MAX_STAGE);
    currentStage = nextStage;
    ironSkiffMission.stageGroups.forEach((group, index) => { group.visible = nextStage < 4 && index < nextStage; });
    ironSkiffMission.completeSkiff.visible = nextStage >= ISLAND_20_IRON_SKIFF_MAX_STAGE;
    ironSkiffMission.skiff.visible = nextStage > 0;
    ironSkiffMission.extractionShip.visible = nextStage >= ISLAND_20_IRON_SKIFF_MAX_STAGE;
    ironSkiffMission.tether.visible = false;
    if (replay && nextStage >= ISLAND_20_IRON_SKIFF_MAX_STAGE) {
      skiffProgress = 0;
      skiffSteering = 0;
      ironSkiffMission.skiff.position.copy(ironSkiffMission.escapeCurve.getPointAt(0));
    }
  };

  const updateNavigation = (presentation: Island20SkiffNavigationPresentation) => {
    if (presentation.active && presentation.sequence === completedNavigationSequence) {
      navigationPresentation = { ...presentation, active: false, steering: 0, throttle: 0 };
      return;
    }
    if (presentation.active && presentation.sequence !== navigationPresentation.sequence) {
      skiffProgress = 0;
      skiffSteering = 0;
      skiffCompletionPending = false;
      ironSkiffMission.tether.visible = false;
      ironSkiffMission.skiff.visible = true;
    }
    navigationPresentation = presentation;
  };

  setStage(0);

  return {
    root,
    setIronSkiffStage: setStage,
    updateIronSkiffNavigation: updateNavigation,
    consumeIronSkiffCompletion: () => {
      const completed = skiffCompletionPending;
      skiffCompletionPending = false;
      return completed;
    },
    animate: (elapsed) => {
      const delta = Math.min(0.1, Math.max(0, elapsed - lastElapsed));
      lastElapsed = elapsed;
      const slowThermal = 0.5 + 0.5 * (
        Math.sin(elapsed * 0.73) * 0.68
        + Math.sin(elapsed * 1.91 + 0.8) * 0.22
        + Math.sin(elapsed * 3.07 + 2.1) * 0.1
      );
      if (forgeKey instanceof THREE.PointLight) forgeKey.intensity = 8.8 + slowThermal * 1.6;
      if (underglow instanceof THREE.PointLight) underglow.intensity = 5.0 + slowThermal * 1.1;
      const magmaFlowOffset = -((elapsed * 0.16) % 1);
      if (materials.magma.map) materials.magma.map.offset.y = magmaFlowOffset;
      if (materials.magma.bumpMap) materials.magma.bumpMap.offset.y = magmaFlowOffset;
      if (materials.magmaCore.map) materials.magmaCore.map.offset.y = magmaFlowOffset * 1.18;
      if (materials.magmaCore.bumpMap) materials.magmaCore.bumpMap.offset.y = magmaFlowOffset * 1.18;
      const moltenSeaMaterial = lava.userData.moltenSeaMaterial;
      if (moltenSeaMaterial instanceof THREE.ShaderMaterial) {
        moltenSeaMaterial.uniforms.uElapsed.value = reducedMotion ? 0.8 : elapsed;
        moltenSeaMaterial.uniforms.uThermalPulse.value = slowThermal;
      }
      if (authoredCity) {
        const assemblyElapsed = Math.max(0, elapsed - authoredAssemblyStartElapsed);
        if (!authoredCityBatched) {
          authoredCity.children.forEach((part) => {
            if (!part.visible || part instanceof THREE.Light) return;
            const delay = Math.min(0.7, Number(part.userData.assemblyIndex ?? 0) * 0.055);
            const linear = reducedMotion ? 1 : THREE.MathUtils.clamp((assemblyElapsed - delay) / 1.15, 0, 1);
            const eased = 1 - Math.pow(1 - linear, 3);
            const restY = Number(part.userData.assemblyRestY ?? 0);
            part.position.y = THREE.MathUtils.lerp(restY - 0.62, restY, eased);
            part.scale.y = THREE.MathUtils.lerp(0.08, 1, eased);
          });
          if (reducedMotion || assemblyElapsed >= 2.05) {
            batchStaticMeshes(
              authoredCity,
              'ISLAND_20_AUTHORED_V10_RUNTIME_BATCH',
              (mesh) => {
                let cursor: THREE.Object3D | null = mesh.parent;
                while (cursor && cursor !== authoredCity) {
                  if (!cursor.visible) return true;
                  cursor = cursor.parent;
                }
                return false;
              },
            );
            authoredCityBatched = true;
            root.userData.authoredCity.runtimeBatched = true;
          }
        }
        authoredCity.traverse((object) => {
          if (!(object instanceof THREE.PointLight) || !object.name.includes('AUTHORED_CANAL_HEAT_LIGHT')) return;
          const phase = Number(object.userData.phase ?? 0);
          const thermalElapsed = reducedMotion ? 0.65 : elapsed;
          const basePosition = object.userData.basePosition;
          if (Array.isArray(basePosition) && basePosition.length === 3) {
            object.position.set(
              Number(basePosition[0]) + Math.sin(thermalElapsed * 0.23 + phase) * 0.08,
              Number(basePosition[1]) + Math.sin(thermalElapsed * 0.41 + phase) * 0.025,
              Number(basePosition[2]) + Math.cos(thermalElapsed * 0.19 + phase) * 0.1,
            );
          }
          object.intensity = 3.7 + Math.sin(thermalElapsed * 1.18 + phase) * 0.38;
        });
        const authoredLava = authoredCity.userData.authoredLavaMaterial;
        if (authoredLava instanceof THREE.ShaderMaterial) {
          authoredLava.uniforms.uElapsed.value = reducedMotion ? 0.65 : elapsed;
          authoredLava.uniforms.uThermalPulse.value = slowThermal;
        }
      }
      embers.rotation.y = elapsed * 0.018;
      embers.position.y = (elapsed * 0.07) % 1.5;
      lava.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || !object.name.includes('LAVA')) return;
        const material = object.material as THREE.MeshPhysicalMaterial;
        if ('emissiveIntensity' in material) material.emissiveIntensity = 1.05 + Math.sin(elapsed * 1.6 + Number(object.userData.phase ?? 0)) * 0.16;
      });
      root.traverse((object) => {
        if (!object.name.endsWith('_FLAME') && !object.name.includes('CROWN_FLAME') && !object.name.includes('FINALE_GATE_FLAME')) return;
        const phase = Number(object.userData.phase ?? object.id * 0.17);
        const pulse = 0.9 + Math.sin(elapsed * 3.2 + phase) * 0.1;
        object.scale.x *= pulse / Math.max(0.01, Number(object.userData.lastPulse ?? 1));
        object.scale.z *= pulse / Math.max(0.01, Number(object.userData.lastPulse ?? 1));
        object.userData.lastPulse = pulse;
      });
      life.children.forEach((inhabitant, index) => {
        inhabitant.rotation.y = Math.sin(elapsed * 0.8 + index) * 0.08;
      });
      ironSkiffMission.beaconPositions.forEach((position, index) => {
        const pulse = 0.82 + Math.sin(elapsed * 3.4 + index * 0.9) * 0.18;
        ironSkiffMission.beaconMatrixHelper.position.copy(position);
        ironSkiffMission.beaconMatrixHelper.scale.setScalar(reducedMotion ? 1 : pulse);
        ironSkiffMission.beaconMatrixHelper.updateMatrix();
        ironSkiffMission.beaconInstances.setMatrixAt(index, ironSkiffMission.beaconMatrixHelper.matrix);
      });
      ironSkiffMission.beaconInstances.instanceMatrix.needsUpdate = true;
      if (navigationPresentation.active && currentStage >= ISLAND_20_IRON_SKIFF_MAX_STAGE) {
        const speed = reducedMotion ? 1 : 0.035 + navigationPresentation.throttle * 0.085;
        skiffProgress = reducedMotion ? 1 : Math.min(1, skiffProgress + delta * speed);
        skiffSteering = reducedMotion
          ? 0
          : THREE.MathUtils.damp(skiffSteering, navigationPresentation.steering * 0.34, 6, delta);
        const point = ironSkiffMission.escapeCurve.getPointAt(skiffProgress);
        const tangent = ironSkiffMission.escapeCurve.getTangentAt(Math.min(0.999, skiffProgress)).normalize();
        const lateral = new THREE.Vector3(tangent.z, 0, -tangent.x).normalize().multiplyScalar(skiffSteering);
        ironSkiffMission.skiff.position.copy(point).add(lateral);
        const lookAt = ironSkiffMission.escapeCurve.getPointAt(Math.min(1, skiffProgress + 0.015)).add(lateral);
        ironSkiffMission.skiff.lookAt(lookAt);
        ironSkiffMission.skiff.rotation.z = -skiffSteering * 0.42;
        ironSkiffMission.tether.visible = skiffProgress > 0.84;
        if (skiffProgress >= 1 && !skiffCompletionPending) {
          skiffCompletionPending = true;
          completedNavigationSequence = navigationPresentation.sequence;
          navigationPresentation = { ...navigationPresentation, active: false, steering: 0, throttle: 0 };
        }
      }
      root.userData.missionPresentation = {
        missionId: ISLAND_20_IRON_SKIFF_MISSION_ID,
        activatedStages: currentStage,
        navigationActive: navigationPresentation.active,
        progress: skiffProgress,
        steering: skiffSteering,
      };
    },
    dispose: () => {
      authoredLoadCancelled = true;
      authoredCity = null;
    },
  };
}

export function collectIsland20EscapeRouteClearanceViolations(root: THREE.Object3D): string[] {
  const violations: string[] = [];
  root.traverse((object) => {
    if (!object.name.includes('NAVIGATION_GATE_') || !object.name.includes('_FIN')) return;
    const world = object.getWorldPosition(new THREE.Vector3());
    if (!isIsland20RouteCorridorClear(world.x, world.z, 0.12)) {
      violations.push(`${object.name}:radius=${Math.hypot(world.x, world.z).toFixed(3)}`);
    }
  });
  return violations;
}
