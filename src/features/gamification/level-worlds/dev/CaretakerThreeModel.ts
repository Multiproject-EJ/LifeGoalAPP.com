import * as THREE from 'three';
import { compactStaticGeometry } from './CrownCitadelThreeModel';

export type CaretakerQuality = 'low' | 'high';

export type CaretakerAnimationId =
  | 'idle'
  | 'walk'
  | 'greet'
  | 'talk-gentle'
  | 'point'
  | 'react'
  | 'celebrate';

export type CaretakerEmotionId =
  | 'calm'
  | 'curious'
  | 'delighted'
  | 'concerned'
  | 'surprised'
  | 'thoughtful'
  | 'urgent';

export interface CaretakerOutfitConfig {
  id: string;
  label: string;
  cloth: number;
  clothDeep: number;
  clothAccent: number;
  undercloth: number;
  metal: number;
  leather: number;
  crystal: number;
  eyeGlow: number;
  pearl: number;
  embroideryMotif: 'tide-crown';
  accessories: {
    staff: boolean;
    mantleCrystal: boolean;
    pearls: boolean;
    cape: boolean;
  };
}

export const CROWN_OF_TIDES_OUTFIT: CaretakerOutfitConfig = {
  id: 'island-005-crown-of-tides',
  label: 'Crown of Tides',
  cloth: 0x075ab8,
  clothDeep: 0x032b72,
  clothAccent: 0x0ac8e4,
  undercloth: 0xf0e4cf,
  metal: 0xe8ad38,
  leather: 0x5c321d,
  crystal: 0x16c9ff,
  eyeGlow: 0x55eaff,
  pearl: 0xfff3d8,
  embroideryMotif: 'tide-crown',
  accessories: {
    staff: true,
    mantleCrystal: true,
    pearls: true,
    cape: true,
  },
};

export const CARETAKER_ANIMATIONS: ReadonlyArray<{ id: CaretakerAnimationId; label: string }> = [
  { id: 'idle', label: 'Idle · breathe & observe' },
  { id: 'walk', label: 'Walk · board approach' },
  { id: 'greet', label: 'Greet · welcoming wave' },
  { id: 'talk-gentle', label: 'Talk · gentle explanation' },
  { id: 'point', label: 'Point · guide attention' },
  { id: 'react', label: 'React · surprised' },
  { id: 'celebrate', label: 'Celebrate · island progress' },
];

export const CARETAKER_EMOTIONS: ReadonlyArray<{ id: CaretakerEmotionId; label: string }> = [
  { id: 'calm', label: 'Calm / attentive' },
  { id: 'curious', label: 'Curious' },
  { id: 'delighted', label: 'Delighted' },
  { id: 'concerned', label: 'Concerned' },
  { id: 'surprised', label: 'Surprised' },
  { id: 'thoughtful', label: 'Wise / thoughtful' },
  { id: 'urgent', label: 'Urgent' },
];

export const CARETAKER_QUALITY_PROFILES = {
  low: {
    // Board-view LOD: the caretaker is only a small moving silhouette here.
    // Five-sided base tessellation keeps the embellished arm module inside the
    // 12k mobile ceiling; the close-up lab and encounters continue to use High.
    radialSegments: 4,
    sphereSegments: 4,
    ornamentCount: 0,
    pearlCount: 3,
    dynamicShadow: false,
  },
  high: {
    radialSegments: 32,
    sphereSegments: 30,
    ornamentCount: 12,
    pearlCount: 7,
    dynamicShadow: true,
  },
} as const;

interface CaretakerMaterials {
  cloth: THREE.MeshPhysicalMaterial;
  hoodCloth: THREE.MeshPhysicalMaterial;
  clothDeep: THREE.MeshPhysicalMaterial;
  accent: THREE.MeshStandardMaterial;
  undercloth: THREE.MeshStandardMaterial;
  gold: THREE.MeshPhysicalMaterial;
  leather: THREE.MeshStandardMaterial;
  bootLeather: THREE.MeshStandardMaterial;
  leatherEmboss: THREE.MeshStandardMaterial;
  shadow: THREE.MeshBasicMaterial;
  eye: THREE.MeshStandardMaterial;
  crystal: THREE.MeshPhysicalMaterial;
  pearl: THREE.MeshPhysicalMaterial;
  sole: THREE.MeshStandardMaterial;
  stitch: THREE.MeshStandardMaterial;
}

interface CaretakerRig {
  hips: THREE.Bone;
  spine: THREE.Bone;
  chest: THREE.Bone;
  neck: THREE.Bone;
  head: THREE.Bone;
  leftUpperArm: THREE.Bone;
  leftLowerArm: THREE.Bone;
  leftHand: THREE.Bone;
  rightUpperArm: THREE.Bone;
  rightLowerArm: THREE.Bone;
  rightHand: THREE.Bone;
  leftUpperLeg: THREE.Bone;
  leftLowerLeg: THREE.Bone;
  leftFoot: THREE.Bone;
  rightUpperLeg: THREE.Bone;
  rightLowerLeg: THREE.Bone;
  rightFoot: THREE.Bone;
}

export interface CaretakerModelMetrics {
  bones: number;
  meshes: number;
  triangles: number;
  materials: number;
  skinnedDrawCalls: number;
}

export interface CaretakerModel {
  root: THREE.Group;
  outfitRoot: THREE.Group;
  skeletonHelper: THREE.SkeletonHelper;
  rig: CaretakerRig;
  leftEye: THREE.Mesh;
  rightEye: THREE.Mesh;
  mouth: THREE.Mesh;
  surprisedMouth: THREE.Mesh;
  eyeMaterial: THREE.MeshStandardMaterial;
  metrics: CaretakerModelMetrics;
  quality: CaretakerQuality;
  outfit: CaretakerOutfitConfig;
  animation: CaretakerAnimationId;
  previousAnimation: CaretakerAnimationId;
  animationChangedAt: number;
  animationStartedAt: number;
  previousAnimationStartedAt: number;
  emotion: CaretakerEmotionId;
  setAnimation: (animation: CaretakerAnimationId, nowSeconds?: number, restart?: boolean) => void;
  setEmotion: (emotion: CaretakerEmotionId) => void;
  setWireframe: (enabled: boolean) => void;
  setSkeletonVisible: (visible: boolean) => void;
  update: (elapsedSeconds: number, deltaSeconds: number, reducedMotion?: boolean) => void;
  dispose: () => void;
}

const DEG = Math.PI / 180;

function createMaterials(outfit: CaretakerOutfitConfig, quality: CaretakerQuality): CaretakerMaterials {
  const clothTextureSize = quality === 'high' ? 512 : 128;
  const detailTextureSize = quality === 'high' ? 256 : 64;
  const leatherTextureSize = quality === 'high' ? 256 : 64;
  const clothAlbedo = createFabricAlbedoTexture(clothTextureSize, 'woven', outfit.cloth, outfit.metal, outfit.clothAccent, true);
  const hoodColor = new THREE.Color(outfit.cloth).lerp(new THREE.Color(outfit.clothDeep), 0.55).getHex();
  const hoodClothAlbedo = createFabricAlbedoTexture(detailTextureSize, 'woven', hoodColor);
  const clothDeepAlbedo = createFabricAlbedoTexture(detailTextureSize, 'woven', outfit.clothDeep);
  const quiltAlbedo = createFabricAlbedoTexture(detailTextureSize, 'quilted', outfit.undercloth);
  const clothNormal = createFabricNormalTexture(detailTextureSize, 'woven');
  const quiltNormal = createFabricNormalTexture(detailTextureSize, 'quilted');
  const clothRoughness = createFabricRoughnessTexture(detailTextureSize, 'woven');
  const quiltRoughness = createFabricRoughnessTexture(detailTextureSize, 'quilted');
  const leatherNormal = createLeatherNormalTexture(128);
  const leatherRoughness = createLeatherRoughnessTexture(128);
  const bootLeatherAlbedo = createBootLeatherAlbedoTexture(leatherTextureSize, outfit.leather);
  return {
    cloth: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.84,
      metalness: 0.02,
      clearcoat: 0.035,
      clearcoatRoughness: 0.9,
      map: clothAlbedo,
      normalMap: clothNormal,
      normalScale: new THREE.Vector2(0.32, 0.32),
      roughnessMap: clothRoughness,
    }),
    hoodCloth: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 1,
      metalness: 0.01,
      clearcoat: 0,
      specularIntensity: 0.18,
      sheen: 0.08,
      sheenRoughness: 1,
      sheenColor: new THREE.Color(hoodColor),
      map: hoodClothAlbedo,
      normalMap: clothNormal,
      normalScale: new THREE.Vector2(0.34, 0.34),
      roughnessMap: clothRoughness,
    }),
    clothDeep: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.86,
      metalness: 0.01,
      clearcoat: 0.02,
      map: clothDeepAlbedo,
      normalMap: clothNormal,
      normalScale: new THREE.Vector2(0.28, 0.28),
      roughnessMap: clothRoughness,
    }),
    accent: new THREE.MeshStandardMaterial({
      color: outfit.clothAccent,
      roughness: 0.38,
      metalness: 0.12,
      emissive: new THREE.Color(outfit.clothAccent).multiplyScalar(0.08),
      emissiveIntensity: 0.35,
    }),
    undercloth: new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0,
      map: quiltAlbedo,
      normalMap: quiltNormal,
      normalScale: new THREE.Vector2(0.5, 0.5),
      roughnessMap: quiltRoughness,
    }),
    gold: new THREE.MeshPhysicalMaterial({
      color: outfit.metal,
      roughness: 0.24,
      metalness: 0.82,
      clearcoat: 0.72,
      clearcoatRoughness: 0.18,
    }),
    leather: new THREE.MeshPhysicalMaterial({
      // Keep the leather visibly brown under the neutral lab key.  The old
      // 0.62 multiplier crushed the quarter and heel counter almost to black,
      // which made the upper read as an unfinished cut-out panel.
      color: new THREE.Color(outfit.leather).multiplyScalar(0.82),
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: 0.3,
      clearcoatRoughness: 0.46,
      normalMap: leatherNormal,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughnessMap: leatherRoughness,
    }),
    bootLeather: new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.48,
      metalness: 0.02,
      clearcoat: 0.3,
      clearcoatRoughness: 0.46,
      map: bootLeatherAlbedo,
      normalMap: leatherNormal,
      normalScale: new THREE.Vector2(0.2, 0.2),
      roughnessMap: leatherRoughness,
    }),
    leatherEmboss: new THREE.MeshStandardMaterial({
      color: new THREE.Color(outfit.leather).multiplyScalar(0.72),
      roughness: 0.58,
      metalness: 0,
    }),
    shadow: new THREE.MeshBasicMaterial({
      color: 0x00040c,
      toneMapped: false,
    }),
    eye: new THREE.MeshStandardMaterial({
      color: 0x003c5a,
      emissive: outfit.eyeGlow,
      emissiveIntensity: 0.32,
      roughness: 0.32,
    }),
    crystal: new THREE.MeshPhysicalMaterial({
      color: 0x007fbf,
      emissive: 0x003d68,
      emissiveIntensity: 0.3,
      roughness: 0.18,
      metalness: 0.02,
      clearcoat: 0.48,
      clearcoatRoughness: 0.2,
      flatShading: true,
    }),
    pearl: new THREE.MeshPhysicalMaterial({
      color: outfit.pearl,
      roughness: 0.16,
      metalness: 0.08,
      clearcoat: 0.88,
      iridescence: 0.45,
      iridescenceIOR: 1.3,
    }),
    sole: new THREE.MeshStandardMaterial({
      color: 0x25170f,
      roughness: 0.9,
      metalness: 0,
    }),
    stitch: new THREE.MeshStandardMaterial({
      color: 0xcdbf9e,
      roughness: 0.92,
      metalness: 0,
    }),
  };
}

function configureLeatherTexture(texture: THREE.Texture) {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4.6, 4.6);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function sampleLeatherHeight(x: number, y: number) {
  // Fine, irregular pores with only a restrained directional grain.  Large
  // sine bands made the previous boots look ribbed/rubber-like at phone scale.
  const broadGrain = Math.sin(x * 0.17 + Math.sin(y * 0.11) * 1.2) * 0.08;
  const crossGrain = Math.sin(y * 0.23 + Math.cos(x * 0.19) * 1.1) * 0.06;
  const poresA = Math.sin((x + y) * 1.73) * Math.cos((x - y) * 1.19) * 0.11;
  const poresB = Math.sin(x * 2.41 + y * 1.31) * Math.sin(y * 2.07 - x * 0.83) * 0.055;
  return broadGrain + crossGrain + poresA + poresB;
}

function createLeatherNormalTexture(size: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const dx = sampleLeatherHeight(x + 1, y) - sampleLeatherHeight(x - 1, y);
      const dy = sampleLeatherHeight(x, y + 1) - sampleLeatherHeight(x, y - 1);
      const normal = new THREE.Vector3(-dx * 0.72, -dy * 0.72, 1).normalize();
      const offset = (y * size + x) * 4;
      data[offset] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[offset + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[offset + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[offset + 3] = 255;
    }
  }
  return configureLeatherTexture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
}

function createLeatherRoughnessTexture(size: number) {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const grain = sampleLeatherHeight(x, y);
      const value = Math.round(THREE.MathUtils.clamp(174 + grain * 36, 132, 222));
      const offset = (y * size + x) * 4;
      data[offset] = value;
      data[offset + 1] = value;
      data[offset + 2] = value;
      data[offset + 3] = 255;
    }
  }
  return configureLeatherTexture(new THREE.DataTexture(data, size, size, THREE.RGBAFormat));
}

function createBootLeatherAlbedoTexture(size: number, baseColor: number) {
  const data = new Uint8Array(size * size * 4);
  const baseR = (baseColor >> 16) & 0xff;
  const baseG = (baseColor >> 8) & 0xff;
  const baseB = baseColor & 0xff;
  const distanceToScroll = (u: number, v: number) => {
    let minimum = 1;
    for (const center of [[0.165, 0.19, 1], [0.335, 0.19, -1]] as const) {
      for (let sample = 0; sample <= 64; sample += 1) {
        const progress = sample / 64;
        const angle = progress * Math.PI * 2.15 * center[2];
        const radius = THREE.MathUtils.lerp(0.088, 0.012, progress);
        const curveU = center[0] + Math.cos(angle) * radius;
        const curveV = center[1] + Math.sin(angle) * radius * 0.74;
        minimum = Math.min(minimum, Math.hypot(u - curveU, v - curveV));
      }
    }
    const waveV = 0.285 + Math.sin((u - 0.05) * Math.PI * 5) * 0.022;
    if (u > 0.055 && u < 0.445) minimum = Math.min(minimum, Math.abs(v - waveV) * 0.8);
    return minimum;
  };
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const u = x / Math.max(1, size - 1);
      const v = y / Math.max(1, size - 1);
      const grain = sampleLeatherHeight(x, y) * 7;
      const scrollDistance = distanceToScroll(u, v);
      const engraving = scrollDistance < 0.008
        ? -16
        : scrollDistance < 0.014
          ? 8
          : 0;
      const edgeWarmth = v < 0.48 ? Math.sin(v * Math.PI) * 4 : 0;
      const offset = (y * size + x) * 4;
      data[offset] = Math.round(THREE.MathUtils.clamp(baseR * 0.82 + grain + engraving + edgeWarmth, 0, 255));
      data[offset + 1] = Math.round(THREE.MathUtils.clamp(baseG * 0.82 + grain * 0.48 + engraving * 0.55, 0, 255));
      data[offset + 2] = Math.round(THREE.MathUtils.clamp(baseB * 0.82 + grain * 0.24 + engraving * 0.32, 0, 255));
      data[offset + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function sampleFabricHeight(x: number, y: number, size: number, pattern: 'woven' | 'quilted') {
  if (pattern === 'woven') {
    const warp = Math.pow(Math.max(0, Math.cos(x * Math.PI * 0.5)), 10) * 0.46;
    const weft = Math.pow(Math.max(0, Math.cos((y + 0.7) * Math.PI * 0.4)), 10) * 0.34;
    const crossing = Math.sin((x + y) * 0.42) * 0.035;
    return 0.48 + warp + weft + crossing;
  }
  const diagonalA = Math.abs(((x + y) % 24 + 24) % 24 - 12);
  const diagonalB = Math.abs(((x - y + size * 4) % 24 + 24) % 24 - 12);
  const seam = Math.min(diagonalA, diagonalB);
  return 0.25 + THREE.MathUtils.smoothstep(seam, 0, 7) * 0.72;
}

function configureFabricTexture(texture: THREE.Texture, pattern: 'woven' | 'quilted') {
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(pattern === 'woven' ? 9 : 2.7, pattern === 'woven' ? 9 : 2.7);
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
}

function createFabricNormalTexture(size: number, pattern: 'woven' | 'quilted') {
  const data = new Uint8Array(size * size * 4);
  const strength = pattern === 'woven' ? 1.4 : 2.2;
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const left = sampleFabricHeight(x - 1, y, size, pattern);
      const right = sampleFabricHeight(x + 1, y, size, pattern);
      const down = sampleFabricHeight(x, y - 1, size, pattern);
      const up = sampleFabricHeight(x, y + 1, size, pattern);
      const normal = new THREE.Vector3((left - right) * strength, (down - up) * strength, 1).normalize();
      const pixel = (y * size + x) * 4;
      data[pixel] = Math.round((normal.x * 0.5 + 0.5) * 255);
      data[pixel + 1] = Math.round((normal.y * 0.5 + 0.5) * 255);
      data[pixel + 2] = Math.round((normal.z * 0.5 + 0.5) * 255);
      data[pixel + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.NoColorSpace;
  return configureFabricTexture(texture, pattern);
}

function createFabricRoughnessTexture(size: number, pattern: 'woven' | 'quilted') {
  const data = new Uint8Array(size * size);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const height = sampleFabricHeight(x, y, size, pattern);
      const microVariation = ((x * 17 + y * 11) % 13) / 13;
      const roughness = pattern === 'woven'
        ? 0.73 + (1 - height) * 0.19 + microVariation * 0.035
        : 0.69 + (1 - height) * 0.22 + microVariation * 0.025;
      data[y * size + x] = Math.round(THREE.MathUtils.clamp(roughness, 0, 1) * 255);
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RedFormat);
  texture.colorSpace = THREE.NoColorSpace;
  return configureFabricTexture(texture, pattern);
}

function createFabricAlbedoTexture(
  size: number,
  pattern: 'woven' | 'quilted',
  baseColor: number,
  goldColor = 0xe8ad38,
  accentColor = 0x0ac8e4,
  embroidered = false,
) {
  const data = new Uint8Array(size * size * 4);
  const base = new THREE.Color(baseColor).convertLinearToSRGB();
  const gold = new THREE.Color(goldColor).convertLinearToSRGB();
  const accent = new THREE.Color(accentColor).convertLinearToSRGB();
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pixel = (y * size + x) * 4;
      let value: number;
      if (pattern === 'woven') {
        const warp = Math.sin(x * 0.72) * 3;
        const weft = Math.sin(y * 0.78 + Math.PI * 0.35) * 2.5;
        const diagonal = Math.sin((x + y) * 0.24) * 1.5;
        value = Math.round(226 + warp + weft + diagonal);
      } else {
        const diagonalA = Math.abs(((x + y) % 24) - 12);
        const diagonalB = Math.abs(((x - y + size * 4) % 24) - 12);
        const seam = Math.min(diagonalA, diagonalB);
        const pillow = THREE.MathUtils.smoothstep(seam, 0, 7);
        value = Math.round(224 + pillow * 24);
      }
      const clamped = THREE.MathUtils.clamp(value, 188, 255);
      const shade = clamped / 226;
      let red = base.r * shade;
      let green = base.g * shade;
      let blue = base.b * shade;
      if (embroidered) {
        const u = x / size;
        const v = y / size;
        // One seam-safe atlas tile per garment UV island: quiet woven cloth in
        // the centre, mirrored tide embroidery at intentional borders, and a
        // single crest. This prevents the premium filigree from becoming a
        // wallpaper repeat across hood, mantle and cape.
        const topWave = 0.11 + Math.sin(u * Math.PI * 2) * 0.022;
        const bottomWave = 0.89 - Math.sin(u * Math.PI * 2) * 0.022;
        const topBorder = Math.abs(v - topWave) < 0.009;
        const bottomBorder = Math.abs(v - bottomWave) < 0.009;
        const sideTarget = 0.055 + Math.sin(v * Math.PI * 5) * 0.012;
        const sideBorders = v > 0.2 && v < 0.8
          && (Math.abs(u - sideTarget) < 0.008 || Math.abs((1 - u) - sideTarget) < 0.008);
        const leftCurlRadius = Math.hypot(u - 0.19, v - 0.16);
        const rightCurlRadius = Math.hypot(u - 0.81, v - 0.16);
        const lowerLeftCurlRadius = Math.hypot(u - 0.19, v - 0.84);
        const lowerRightCurlRadius = Math.hypot(u - 0.81, v - 0.84);
        const cornerCurls = [leftCurlRadius, rightCurlRadius, lowerLeftCurlRadius, lowerRightCurlRadius]
          .some((radius) => Math.abs(radius - 0.07) < 0.008);
        const crestDistance = Math.abs(Math.abs(u - 0.5) + Math.abs(v - 0.62) - 0.075);
        const centeredCrest = crestDistance < 0.008;
        const centerBead = Math.hypot(u - 0.5, v - 0.72) < 0.016;
        const goldMask = topBorder || bottomBorder || sideBorders || cornerCurls || centeredCrest || centerBead;
        const cyanMask = Math.abs(v - (topWave + 0.026)) < 0.006
          || Math.abs(v - (bottomWave - 0.026)) < 0.006;
        if (goldMask) {
          red = THREE.MathUtils.lerp(red, gold.r, 0.78);
          green = THREE.MathUtils.lerp(green, gold.g, 0.78);
          blue = THREE.MathUtils.lerp(blue, gold.b, 0.78);
        } else if (cyanMask) {
          red = THREE.MathUtils.lerp(red, accent.r, 0.68);
          green = THREE.MathUtils.lerp(green, accent.g, 0.68);
          blue = THREE.MathUtils.lerp(blue, accent.b, 0.68);
        }
      }
      data[pixel] = Math.round(THREE.MathUtils.clamp(red, 0, 1) * 255);
      data[pixel + 1] = Math.round(THREE.MathUtils.clamp(green, 0, 1) * 255);
      data[pixel + 2] = Math.round(THREE.MathUtils.clamp(blue, 0, 1) * 255);
      data[pixel + 3] = 255;
    }
  }
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.colorSpace = THREE.SRGBColorSpace;
  configureFabricTexture(texture, pattern);
  if (embroidered) texture.repeat.set(1, 1);
  return texture;
}

function mesh(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  name: string,
  castShadow = false,
): THREE.Mesh {
  const result = new THREE.Mesh(geometry, material);
  result.name = name;
  result.castShadow = castShadow;
  result.receiveShadow = true;
  return result;
}

function makeBone(name: string, position: readonly [number, number, number]): THREE.Bone {
  const bone = new THREE.Bone();
  bone.name = name;
  bone.position.set(...position);
  return bone;
}

function createRig(): CaretakerRig {
  const hips = makeBone('CARETAKER_RIG_HIPS', [0, 0.58, 0]);
  const spine = makeBone('CARETAKER_RIG_SPINE', [0, 0.46, 0]);
  const chest = makeBone('CARETAKER_RIG_CHEST', [0, 0.54, 0]);
  const neck = makeBone('CARETAKER_RIG_NECK', [0, 0.38, 0]);
  const head = makeBone('CARETAKER_RIG_HEAD', [0, 0.19, 0]);
  hips.add(spine);
  spine.add(chest);
  chest.add(neck);
  neck.add(head);

  const leftUpperArm = makeBone('CARETAKER_RIG_LEFT_UPPER_ARM', [-0.69, 0.12, 0.18]);
  const leftLowerArm = makeBone('CARETAKER_RIG_LEFT_LOWER_ARM', [0, -0.45, 0]);
  const leftHand = makeBone('CARETAKER_RIG_LEFT_HAND', [0, -0.62, 0.13]);
  chest.add(leftUpperArm);
  leftUpperArm.add(leftLowerArm);
  leftLowerArm.add(leftHand);

  const rightUpperArm = makeBone('CARETAKER_RIG_RIGHT_UPPER_ARM', [0.69, 0.12, 0.18]);
  const rightLowerArm = makeBone('CARETAKER_RIG_RIGHT_LOWER_ARM', [0, -0.45, 0]);
  const rightHand = makeBone('CARETAKER_RIG_RIGHT_HAND', [0, -0.62, 0.13]);
  chest.add(rightUpperArm);
  rightUpperArm.add(rightLowerArm);
  rightLowerArm.add(rightHand);

  const leftUpperLeg = makeBone('CARETAKER_RIG_LEFT_UPPER_LEG', [-0.29, -0.02, 0]);
  const leftLowerLeg = makeBone('CARETAKER_RIG_LEFT_LOWER_LEG', [0, -0.35, 0]);
  const leftFoot = makeBone('CARETAKER_RIG_LEFT_FOOT', [0, -0.31, 0.14]);
  hips.add(leftUpperLeg);
  leftUpperLeg.add(leftLowerLeg);
  leftLowerLeg.add(leftFoot);

  const rightUpperLeg = makeBone('CARETAKER_RIG_RIGHT_UPPER_LEG', [0.29, -0.02, 0]);
  const rightLowerLeg = makeBone('CARETAKER_RIG_RIGHT_LOWER_LEG', [0, -0.35, 0]);
  const rightFoot = makeBone('CARETAKER_RIG_RIGHT_FOOT', [0, -0.31, 0.04]);
  hips.add(rightUpperLeg);
  rightUpperLeg.add(rightLowerLeg);
  rightLowerLeg.add(rightFoot);

  return {
    hips,
    spine,
    chest,
    neck,
    head,
    leftUpperArm,
    leftLowerArm,
    leftHand,
    rightUpperArm,
    rightLowerArm,
    rightHand,
    leftUpperLeg,
    leftLowerLeg,
    leftFoot,
    rightUpperLeg,
    rightLowerLeg,
    rightFoot,
  };
}

function addPearlChain(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  count: number,
  radius: number,
  y: number,
  z: number,
) {
  const geometry = new THREE.SphereGeometry(0.055, 10, 8);
  for (let index = 0; index < count; index += 1) {
    const angle = count === 1 ? 0 : THREE.MathUtils.lerp(-1.04, 1.04, index / (count - 1));
    const pearl = mesh(geometry, materials.pearl, `CARETAKER_OUTFIT_PEARL_${index}`);
    pearl.position.set(Math.sin(angle) * radius, y - Math.cos(angle * 1.3) * 0.04, z + Math.cos(angle) * radius * 0.14);
    pearl.scale.setScalar(index === Math.floor(count / 2) ? 1.18 : 1);
    parent.add(pearl);
  }
}

function createFiligreeStrokeGeometry(
  points: readonly (readonly [number, number, number])[],
  tubeRadius = 0.009,
  tubularSegments = 18,
  radialSegments = 5,
) {
  const curve = new THREE.CatmullRomCurve3(
    points.map(([x, y, z]) => new THREE.Vector3(x, y, z)),
    false,
    'centripetal',
  );
  return new THREE.TubeGeometry(curve, tubularSegments, tubeRadius, radialSegments, false);
}

function createPlanarTideStroke(
  originX: number,
  originY: number,
  z: number,
  direction: -1 | 1,
  scale = 1,
) {
  return createFiligreeStrokeGeometry([
    [originX, originY, z],
    [originX + direction * 0.07 * scale, originY + 0.055 * scale, z],
    [originX + direction * 0.15 * scale, originY + 0.035 * scale, z],
    [originX + direction * 0.19 * scale, originY - 0.035 * scale, z],
    [originX + direction * 0.13 * scale, originY - 0.1 * scale, z],
    [originX + direction * 0.045 * scale, originY - 0.08 * scale, z],
  ], 0.009, 20);
}

function addWaveEmbroidery(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  count: number,
  radius: number,
  y: number,
  z: number,
) {
  for (let index = 0; index < count; index += 1) {
    const progress = count === 1 ? 0.5 : index / (count - 1);
    const x = THREE.MathUtils.lerp(-radius, radius, progress);
    const direction = (index % 2 === 0 ? 1 : -1) as -1 | 1;
    const curl = mesh(
      createPlanarTideStroke(x, y + Math.sin(progress * Math.PI) * 0.035, z, direction, 0.68),
      index % 2 === 0 ? materials.gold : materials.accent,
      `CARETAKER_OUTFIT_WAVE_${index}`,
      false,
    );
    parent.add(curl);
  }
}

function addDiamondCrest(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  position: readonly [number, number, number],
  scale: number,
  name: string,
) {
  const crest = new THREE.Group();
  crest.name = name;
  crest.position.set(...position);
  crest.scale.setScalar(scale);
  const halo = mesh(createDiamondFrameGeometry(0.22, 0.3, 0.04), materials.gold, `${name}_FRAME`);
  const crystal = mesh(new THREE.OctahedronGeometry(0.19, 0), materials.crystal, `${name}_CRYSTAL`);
  crystal.scale.set(0.68, 1.2, 0.58);
  crystal.position.z = 0.045;
  const dropPearl = mesh(new THREE.SphereGeometry(0.045, 8, 6), materials.pearl, `${name}_DROP_PEARL`);
  dropPearl.position.set(0, -0.35, 0.02);
  crest.add(halo, crystal, dropPearl);
  parent.add(crest);
  return crest;
}

function createStaffCrownFrameGeometry(depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, 0.46);
  shape.lineTo(0.24, 0.18);
  shape.lineTo(0.29, -0.17);
  shape.lineTo(0.17, -0.34);
  shape.lineTo(0.08, -0.12);
  shape.lineTo(-0.08, -0.12);
  shape.lineTo(-0.17, -0.34);
  shape.lineTo(-0.29, -0.17);
  shape.lineTo(-0.24, 0.18);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(0, 0.37);
  hole.lineTo(-0.19, 0.14);
  hole.lineTo(-0.215, -0.145);
  hole.lineTo(-0.08, -0.055);
  hole.lineTo(0.08, -0.055);
  hole.lineTo(0.215, -0.145);
  hole.lineTo(0.19, 0.14);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.008,
    bevelThickness: 0.006,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createStaff(materials: CaretakerMaterials, quality: CaretakerQuality): THREE.Group {
  const segments = CARETAKER_QUALITY_PROFILES[quality].radialSegments;
  const staff = new THREE.Group();
  staff.name = 'CARETAKER_OUTFIT_STAFF';

  const shaft = mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.55, segments), materials.gold, 'CARETAKER_STAFF_SHAFT');
  shaft.castShadow = true;
  shaft.position.y = 1.28;
  const foot = mesh(new THREE.ConeGeometry(0.09, 0.25, segments), materials.gold, 'CARETAKER_STAFF_FOOT');
  foot.position.y = -0.35;
  const lowerShaft = mesh(new THREE.CylinderGeometry(0.055, 0.065, 0.25, segments), materials.gold, 'CARETAKER_STAFF_LOWER_SHAFT');
  lowerShaft.position.y = -0.12;
  const crownFrame = mesh(createStaffCrownFrameGeometry(0.055), materials.gold, 'CARETAKER_STAFF_CROWN_FRAME');
  crownFrame.position.y = 2.72;
  crownFrame.scale.setScalar(0.85);
  const crystal = mesh(new THREE.OctahedronGeometry(0.26, 0), materials.crystal, 'CARETAKER_STAFF_CRYSTAL');
  crystal.castShadow = true;
  crystal.position.y = 2.72;
  crystal.scale.set(0.7, 1.42, 0.5);
  const crystalFrame = mesh(createDiamondFrameGeometry(0.21, 0.35, 0.055), materials.gold, 'CARETAKER_STAFF_CRYSTAL_FRAME');
  crystalFrame.position.y = 2.72;
  crystalFrame.scale.setScalar(0.85);
  const topPearl = mesh(new THREE.SphereGeometry(0.072, Math.min(12, segments), 8), materials.pearl, 'CARETAKER_STAFF_TOP_PEARL');
  topPearl.position.y = 3.11;
  const charmChain = mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.38, 5), materials.gold, 'CARETAKER_STAFF_CHARM_CHAIN', false);
  charmChain.position.set(0.29, 2.35, 0);
  const charm = mesh(new THREE.OctahedronGeometry(0.1, 0), materials.crystal, 'CARETAKER_STAFF_CHARM');
  charm.position.set(0.29, 2.12, 0);
  charm.scale.set(0.65, 1.15, 0.52);
  staff.add(shaft, lowerShaft, foot, crownFrame, crystalFrame, crystal, topPearl, charmChain, charm);
  if (quality === 'high') {
    for (const side of [-1, 1] as const) {
      const scroll = mesh(
        new THREE.TorusGeometry(0.115, 0.018, 5, 16, Math.PI * 1.45),
        materials.gold,
        `CARETAKER_STAFF_CROWN_SCROLL_${side}`,
      );
      scroll.position.set(side * 0.245, 2.51, 0);
      scroll.rotation.z = side * -24 * DEG;
      scroll.scale.y = 0.72;
      const sidePearl = mesh(
        new THREE.SphereGeometry(0.048, 10, 7),
        materials.pearl,
        `CARETAKER_STAFF_CROWN_PEARL_${side}`,
      );
      sidePearl.position.set(side * 0.27, 2.91, 0);
      staff.add(scroll, sidePearl);
    }
    for (const [index, y] of [2.32, 2.43].entries()) {
      const collar = mesh(
        new THREE.TorusGeometry(0.083 + index * 0.012, 0.018, 5, 14),
        materials.gold,
        `CARETAKER_STAFF_CROWN_COLLAR_${index}`,
      );
      collar.position.y = y;
      collar.rotation.x = Math.PI / 2;
      staff.add(collar);
    }
    const finial = mesh(new THREE.ConeGeometry(0.055, 0.22, 8), materials.gold, 'CARETAKER_STAFF_CROWN_FINIAL');
    finial.position.y = 3.25;
    staff.add(finial);
  }
  compactStaticGeometry(staff, 'CARETAKER_STAFF');
  return staff;
}

interface IntegratedBootRing {
  centerY: number;
  centerZ: number;
  radiusX: number;
  radiusY: number;
  radiusZ: number;
  verticalBlend: number;
  phase?: number;
  fold?: number;
}

const BOOT_FOOTPRINT: readonly (readonly [number, number])[] = [
  [0, -0.31],
  [-0.19, -0.3],
  [-0.255, -0.2],
  [-0.25, 0.03],
  [-0.3, 0.25],
  [-0.34, 0.5],
  [-0.335, 0.68],
  [-0.24, 0.83],
  [0, 0.885],
  [0.24, 0.83],
  [0.335, 0.68],
  [0.34, 0.5],
  [0.3, 0.25],
  [0.25, 0.03],
  [0.255, -0.2],
  [0.19, -0.3],
];

function createBootUpperGeometry(segments: number) {
  // One bent loft owns toe, vamp, instep, quarters, heel counter and gathered
  // shaft.  Earlier versions joined a horizontal shoe shell to a vertical
  // cylinder; the intersection remained visible from every angle.  Here the
  // ring plane progressively turns from XY at the toe to XZ at the ankle, so
  // the complete boot is one continuous surface.
  const radialSegments = segments <= 4 ? 5 : 12;
  const rings: readonly IntegratedBootRing[] = [
    { centerY: -0.075, centerZ: 0.855, radiusX: 0.025, radiusY: 0.025, radiusZ: 0, verticalBlend: 0 },
    { centerY: -0.045, centerZ: 0.82, radiusX: 0.165, radiusY: 0.075, radiusZ: 0, verticalBlend: 0 },
    { centerY: 0.015, centerZ: 0.775, radiusX: 0.225, radiusY: 0.115, radiusZ: 0, verticalBlend: 0 },
    { centerY: 0.04, centerZ: 0.66, radiusX: 0.27, radiusY: 0.18, radiusZ: 0, verticalBlend: 0 },
    { centerY: 0.07, centerZ: 0.49, radiusX: 0.315, radiusY: 0.205, radiusZ: 0, verticalBlend: 0 },
    { centerY: 0.1, centerZ: 0.31, radiusX: 0.295, radiusY: 0.205, radiusZ: 0.06, verticalBlend: 0.12 },
    { centerY: 0.145, centerZ: 0.14, radiusX: 0.27, radiusY: 0.19, radiusZ: 0.13, verticalBlend: 0.34 },
    { centerY: -0.095, centerZ: -0.085, radiusX: 0.24, radiusY: 0, radiusZ: 0.215, verticalBlend: 1, phase: 1.1, fold: 0.006 },
    { centerY: -0.01, centerZ: -0.085, radiusX: 0.248, radiusY: 0, radiusZ: 0.22, verticalBlend: 1, phase: 2.4, fold: 0.009 },
    { centerY: 0.075, centerZ: -0.085, radiusX: 0.245, radiusY: 0, radiusZ: 0.215, verticalBlend: 1, phase: 0.4, fold: 0.01 },
    { centerY: 0.165, centerZ: -0.07, radiusX: 0.255, radiusY: 0, radiusZ: 0.205, verticalBlend: 1, phase: 1.8, fold: 0.018 },
    { centerY: 0.245, centerZ: -0.06, radiusX: 0.215, radiusY: 0, radiusZ: 0.172, verticalBlend: 1, phase: 0.7, fold: 0.022 },
    { centerY: 0.325, centerZ: -0.065, radiusX: 0.24, radiusY: 0, radiusZ: 0.188, verticalBlend: 1, phase: 2.2, fold: 0.021 },
    { centerY: 0.405, centerZ: -0.075, radiusX: 0.198, radiusY: 0, radiusZ: 0.155, verticalBlend: 1, phase: 0.3, fold: 0.018 },
    { centerY: 0.485, centerZ: -0.088, radiusX: 0.215, radiusY: 0, radiusZ: 0.166, verticalBlend: 1, phase: 1.9, fold: 0.014 },
    { centerY: 0.57, centerZ: -0.1, radiusX: 0.178, radiusY: 0, radiusZ: 0.14, verticalBlend: 1, phase: 1.1, fold: 0.008 },
  ];
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const [ringIndex, ring] of rings.entries()) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = segment / radialSegments * Math.PI * 2;
      const wave = ring.fold
        ? Math.sin(angle * 2 + (ring.phase ?? 0)) * ring.fold
        : 0;
      const x = Math.cos(angle) * ring.radiusX;
      const horizontalY = Math.max(-0.145, ring.centerY + Math.sin(angle) * ring.radiusY);
      const verticalY = ring.centerY + wave;
      const y = THREE.MathUtils.lerp(horizontalY, verticalY, ring.verticalBlend);
      const horizontalZ = ring.centerZ;
      const verticalZ = ring.centerZ + Math.sin(angle) * ring.radiusZ;
      const z = THREE.MathUtils.lerp(horizontalZ, verticalZ, ring.verticalBlend);
      positions.push(x, y, z);
      uvs.push(segment / radialSegments, ringIndex / (rings.length - 1));
    }
  }
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + segment;
      const d = (ring + 1) * radialSegments + next;
      indices.push(a, c, b, b, c, d);
    }
  }
  const toeCenter = positions.length / 3;
  positions.push(0, rings[0].centerY, rings[0].centerZ);
  uvs.push(0.5, 0);
  const topCenter = positions.length / 3;
  const top = rings[rings.length - 1];
  positions.push(0, top.centerY, top.centerZ);
  uvs.push(0.5, 1);
  const topStart = (rings.length - 1) * radialSegments;
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    indices.push(toeCenter, next, segment);
    indices.push(topCenter, topStart + segment, topStart + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createBootFootprintGeometry(height: number, scale = 1, detailed = true) {
  const shape = new THREE.Shape();
  const points = BOOT_FOOTPRINT.map(([x, z]) => new THREE.Vector2(x * scale, z * scale));
  shape.moveTo(points[0].x, points[0].y);
  shape.splineThru(points.slice(1));
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    curveSegments: detailed ? 2 : 1,
    // The separate round gold welt owns the visible edge softness. Beveling
    // the hidden dark outsole duplicated hundreds of triangles per boot.
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -height / 2);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function createBootPerimeterGeometry(y: number, scale: number, segments: number, tubeRadius: number) {
  const points = BOOT_FOOTPRINT.map(([x, z]) => new THREE.Vector3(x * scale, y, z * scale));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  return new THREE.TubeGeometry(
    curve,
    segments <= 4 ? 10 : 15,
    tubeRadius,
    3,
    true,
  );
}

function createBootWeltBandGeometry(yBottom: number, yTop: number, scale = 1) {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const [index, [x, z]] of BOOT_FOOTPRINT.entries()) {
    positions.push(x * scale, yBottom, z * scale, x * scale, yTop, z * scale);
    const u = index / BOOT_FOOTPRINT.length;
    uvs.push(u, 0, u, 1);
  }
  for (let index = 0; index < BOOT_FOOTPRINT.length; index += 1) {
    const next = (index + 1) % BOOT_FOOTPRINT.length;
    const lower = index * 2;
    const upper = lower + 1;
    const nextLower = next * 2;
    const nextUpper = nextLower + 1;
    indices.push(lower, upper, nextLower, nextLower, upper, nextUpper);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createSurfaceRibbonGeometry(
  points: readonly (readonly [number, number, number])[],
  width: number,
  surfaceNormal: THREE.Vector3,
) {
  const vertices: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const normal = surfaceNormal.clone().normalize();
  points.forEach(([x, y, z], index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = new THREE.Vector3(next[0] - previous[0], next[1] - previous[1], next[2] - previous[2]).normalize();
    const lateral = new THREE.Vector3().crossVectors(normal, tangent).normalize().multiplyScalar(width * 0.5);
    vertices.push(x + lateral.x, y + lateral.y, z + lateral.z);
    vertices.push(x - lateral.x, y - lateral.y, z - lateral.z);
    const u = points.length <= 1 ? 0 : index / (points.length - 1);
    uvs.push(u, 0, u, 1);
  });
  for (let index = 0; index < points.length - 1; index += 1) {
    const current = index * 2;
    const next = current + 2;
    indices.push(current, next, current + 1, current + 1, next, next + 1);
    indices.push(current + 1, next, current, next + 1, next, current + 1);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createBootHeelGeometry(height: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-0.205, -0.295);
  shape.quadraticCurveTo(-0.245, -0.245, -0.235, -0.1);
  shape.lineTo(-0.19, 0.005);
  shape.lineTo(0.19, 0.005);
  shape.lineTo(0.235, -0.1);
  shape.quadraticCurveTo(0.245, -0.245, 0.205, -0.295);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: height,
    steps: 1,
    curveSegments: 2,
    bevelEnabled: false,
  });
  geometry.translate(0, 0, -height / 2);
  geometry.rotateX(Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function addBootSurfaceDetails(
  boot: THREE.Group,
  materials: CaretakerMaterials,
  segments: number,
  name: string,
) {
  if (segments <= 6) return;
  const outerSide = name.includes('LEFT') ? -1 : 1;
  const outerX = outerSide * 0.334;
  const sideNormal = new THREE.Vector3(outerSide, 0, 0);

  // Two restrained enamel droplets sit inside the scroll instead of one
  // oversized oval.  Their small relief remains readable without looking
  // like a pasted-on fish badge.
  for (const [index, droplet] of [
    { y: 0.19, z: 0.225, sy: 0.05, sz: 0.095 },
    { y: 0.135, z: 0.355, sy: 0.035, sz: 0.065 },
  ].entries()) {
    const enamel = mesh(
      new THREE.SphereGeometry(0.08, 7, 4),
      materials.accent,
      `${name}_OUTER_VAMP_ENAMEL_${index}`,
    );
    enamel.scale.set(0.055, droplet.sy / 0.08, droplet.sz / 0.08);
    enamel.position.set(outerX + outerSide * 0.004, droplet.y, droplet.z);
    enamel.rotation.x = -14 * DEG;
    boot.add(enamel);
  }

  const sideScrolls: readonly (readonly (readonly [number, number, number])[])[] = [
    [[outerX, 0.09, 0.12], [outerX, 0.16, 0.2], [outerX, 0.18, 0.3], [outerX, 0.13, 0.4], [outerX, 0.08, 0.47]],
    [[outerX, 0.205, 0.18], [outerX, 0.25, 0.24], [outerX, 0.235, 0.31], [outerX, 0.19, 0.34]],
  ];
  for (const [index, path] of sideScrolls.entries()) {
    boot.add(mesh(
      createSurfaceRibbonGeometry(path, index === 0 ? 0.024 : 0.016, sideNormal),
      materials.gold,
      `${name}_OUTER_WAVE_${index}`,
    ));
  }

}

function createBoot(
  materials: CaretakerMaterials,
  segments: number,
  name: string,
): THREE.Group {
  const boot = new THREE.Group();
  boot.name = name;
  const detailed = segments > 6;
  const upper = mesh(createBootUpperGeometry(segments), materials.bootLeather, `${name}_INTEGRATED_LEATHER_BOOT`, true);
  const outsole = mesh(createBootFootprintGeometry(0.09, 1.02, detailed), materials.sole, `${name}_OUTSOLE`, true);
  outsole.position.y = -0.22;
  const goldWeltBand = mesh(
    createBootWeltBandGeometry(-0.18, -0.085, 1.011),
    materials.gold,
    `${name}_GOLD_WELT_BAND`,
  );
  const goldWeltEdge = mesh(createBootPerimeterGeometry(-0.085, 1.01, segments, 0.022), materials.gold, `${name}_GOLD_WELT_EDGE`);
  const heel = mesh(
    detailed ? createBootHeelGeometry(0.13) : new THREE.BoxGeometry(0.43, 0.13, 0.25),
    materials.sole,
    `${name}_LOW_HEEL`,
    true,
  );
  heel.position.y = -0.255;
  const heelCap = mesh(
    detailed ? createBootHeelGeometry(0.026) : new THREE.BoxGeometry(0.45, 0.026, 0.27),
    materials.gold,
    `${name}_HEEL_CAP`,
  );
  heelCap.position.y = -0.19;
  boot.add(upper, outsole, goldWeltBand, goldWeltEdge, heel, heelCap);
  if (detailed) {
    const shaftRim = mesh(
      createEllipticalRimGeometry(0.178, 0.14, 0.012, 12),
      materials.sole,
      `${name}_SHAFT_TOP_LINING`,
    );
    shaftRim.position.set(0, 0.57, -0.1);
    boot.add(shaftRim);
  }
  addBootSurfaceDetails(boot, materials, segments, name);
  compactStaticGeometry(boot, name);
  const sideId = name.includes('LEFT') ? 'left' : 'right';
  boot.userData.sculptRuntime = {
    moduleId: `${sideId}-boot-assembly`,
    ownerSocket: `CARETAKER_RIG_${sideId.toUpperCase()}_FOOT`,
    actionProfile: 'rigid-single-bone-footwear',
    logicalParts: [
      `${sideId}-boot-assembly`,
      `${sideId}-leather-upper`,
      `${sideId}-ankle-shaft`,
      `${sideId}-sole-heel`,
      `${sideId}-welt`,
      `${sideId}-outer-vamp-ornament`,
    ],
  };
  return boot;
}

function createEllipticalRimGeometry(
  radiusX: number,
  radiusZ: number,
  tubeRadius: number,
  segments: number,
) {
  const pathPoints = Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;
    return new THREE.Vector3(Math.cos(angle) * radiusX, 0, Math.sin(angle) * radiusZ);
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(pathPoints, true, 'centripetal'),
    segments * 2,
    tubeRadius,
    Math.min(6, Math.max(4, Math.round(segments / 3))),
    true,
  );
}

function createLoftedSleeveGeometry(segments: number) {
  const radialSegments = segments <= 4 ? 4 : Math.max(8, Math.min(20, segments));
  const rings = [
    { y: 0.075, radiusX: 0.205, radiusZ: 0.17, z: -0.005 },
    { y: -0.055, radiusX: 0.242, radiusZ: 0.198, z: 0.006 },
    { y: -0.23, radiusX: 0.252, radiusZ: 0.205, z: 0.014 },
    { y: -0.43, radiusX: 0.222, radiusZ: 0.181, z: 0.018 },
    { y: -0.62, radiusX: 0.185, radiusZ: 0.153, z: 0.02 },
  ] as const;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  rings.forEach((ring, ringIndex) => {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const shoulderSoftness = ringIndex === 1 || ringIndex === 2
        ? Math.max(0, Math.sin(angle)) * 0.012
        : 0;
      positions.push(
        Math.cos(angle) * (ring.radiusX + shoulderSoftness),
        ring.y,
        ring.z + Math.sin(angle) * (ring.radiusZ + shoulderSoftness * 0.65),
      );
      normals.push(Math.cos(angle), 0, Math.sin(angle));
      uvs.push(segment / radialSegments, ringIndex / (rings.length - 1));
    }
  });
  for (let ring = 0; ring < rings.length - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + next;
      const d = (ring + 1) * radialSegments + segment;
      indices.push(a, d, b, b, d, c);
    }
  }
  const addCap = (ringIndex: number, upward: boolean) => {
    const ring = rings[ringIndex];
    const centerIndex = positions.length / 3;
    positions.push(0, ring.y, ring.z);
    normals.push(0, upward ? 1 : -1, 0);
    uvs.push(0.5, 0.5);
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ringIndex * radialSegments + segment;
      const b = ringIndex * radialSegments + next;
      if (upward) indices.push(centerIndex, b, a);
      else indices.push(centerIndex, a, b);
    }
  };
  addCap(0, true);
  addCap(rings.length - 1, false);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

type BellCuffLayer = 'outer' | 'lining';

function resolveBellCuffPoint(
  ringIndex: number,
  angle: number,
  side: 'left' | 'right',
  layer: BellCuffLayer,
) {
  const sideSign = side === 'left' ? -1 : 1;
  const outerRings = [
    { y: -0.255, radiusX: 0.23, radiusZ: 0.185 },
    { y: -0.35, radiusX: 0.265, radiusZ: 0.21 },
    { y: -0.455, radiusX: 0.305, radiusZ: 0.238 },
    { y: -0.555, radiusX: 0.345, radiusZ: 0.265 },
  ] as const;
  const ring = outerRings[ringIndex];
  const liningInset = layer === 'lining' ? 0.026 : 0;
  const outward = Math.max(0, Math.cos(angle) * sideSign);
  const forward = Math.max(0, Math.sin(angle));
  const directionalPoint = Math.pow(outward, 1.75);
  const frontDrape = Math.pow(forward, 2);
  const distalDrop = ringIndex === outerRings.length - 1
    ? 0.23 * directionalPoint + 0.07 * frontDrape
    : 0.026 * directionalPoint * (ringIndex / (outerRings.length - 1));
  return new THREE.Vector3(
    Math.cos(angle) * Math.max(0.1, ring.radiusX - liningInset),
    ring.y - distalDrop + (layer === 'lining' ? 0.012 : 0),
    Math.sin(angle) * Math.max(0.1, ring.radiusZ - liningInset) + forward * 0.012,
  );
}

function createBellCuffSurfaceGeometry(
  segments: number,
  side: 'left' | 'right',
  layer: BellCuffLayer,
) {
  const radialSegments = segments <= 4 ? 4 : Math.max(8, Math.min(20, segments));
  const ringCount = 4;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < ringCount; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const angle = (segment / radialSegments) * Math.PI * 2;
      const point = resolveBellCuffPoint(ring, angle, side, layer);
      positions.push(point.x, point.y, point.z);
      uvs.push(segment / radialSegments, ring / (ringCount - 1));
    }
  }
  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const next = (segment + 1) % radialSegments;
      const a = ring * radialSegments + segment;
      const b = ring * radialSegments + next;
      const c = (ring + 1) * radialSegments + next;
      const d = (ring + 1) * radialSegments + segment;
      if (layer === 'outer') indices.push(a, d, b, b, d, c);
      else indices.push(a, b, d, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createBellCuffEdgeWallGeometry(segments: number, side: 'left' | 'right') {
  const radialSegments = segments <= 4 ? 4 : Math.max(8, Math.min(20, segments));
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const angle = (segment / radialSegments) * Math.PI * 2;
    const outer = resolveBellCuffPoint(3, angle, side, 'outer');
    const inner = resolveBellCuffPoint(3, angle, side, 'lining');
    positions.push(outer.x, outer.y, outer.z, inner.x, inner.y, inner.z);
    uvs.push(segment / radialSegments, 0, segment / radialSegments, 1);
  }
  for (let segment = 0; segment < radialSegments; segment += 1) {
    const next = (segment + 1) % radialSegments;
    const outer = segment * 2;
    const inner = outer + 1;
    const nextOuter = next * 2;
    const nextInner = nextOuter + 1;
    indices.push(outer, inner, nextOuter, nextOuter, inner, nextInner);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createBellCuffPerimeterGeometry(segments: number, side: 'left' | 'right', inset = 0) {
  const radialSegments = segments <= 4 ? 6 : Math.max(10, Math.min(24, segments + 4));
  const points = Array.from({ length: radialSegments }, (_, segment) => {
    const angle = (segment / radialSegments) * Math.PI * 2;
    const point = resolveBellCuffPoint(3, angle, side, 'outer');
    if (inset > 0) {
      point.multiplyScalar(1 - inset);
      point.y += inset * 0.34;
    }
    return point;
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, true, 'centripetal'),
    radialSegments * 2,
    inset > 0 ? 0.009 : 0.018,
    segments > 12 ? 5 : 3,
    true,
  );
}

function createSleeve(
  materials: CaretakerMaterials,
  segments: number,
  side: 'left' | 'right',
): THREE.Group {
  const sleeve = new THREE.Group();
  sleeve.name = `CARETAKER_OUTFIT_${side.toUpperCase()}_SLEEVE`;
  const profileSegments = Math.min(11, segments);
  const upper = mesh(
    createLoftedSleeveGeometry(profileSegments),
    materials.undercloth,
    `${sleeve.name}_QUILTED`,
  );
  const trim = mesh(
    createEllipticalRimGeometry(0.188, 0.154, 0.018, profileSegments),
    materials.gold,
    `${sleeve.name}_TRIM`,
  );
  trim.position.set(0, -0.622, 0.02);
  sleeve.add(upper, trim);
  if (segments > 12) {
    for (let row = 0; row < 3; row += 1) {
      const top = -0.09 - row * 0.17;
      const front = 0.205 - row * 0.012;
      addBarBetween(sleeve, materials.stitch, [-0.13, top, front], [0.13, top - 0.14, front], 0.0032, `${sleeve.name}_QUILT_${row}_A`);
      addBarBetween(sleeve, materials.stitch, [0.13, top, front], [-0.13, top - 0.14, front], 0.0032, `${sleeve.name}_QUILT_${row}_B`);
    }
  }
  upper.castShadow = true;
  compactStaticGeometry(sleeve, sleeve.name);
  return sleeve;
}

function createForearmSleeve(
  materials: CaretakerMaterials,
  segments: number,
  side: 'left' | 'right',
): THREE.Group {
  const sleeve = new THREE.Group();
  sleeve.name = `CARETAKER_OUTFIT_${side.toUpperCase()}_FOREARM_SLEEVE`;
  const profileSegments = Math.min(11, segments);
  const forearmBand = mesh(
    new THREE.LatheGeometry([
      new THREE.Vector2(0.184, 0.035),
      new THREE.Vector2(0.19, -0.07),
      new THREE.Vector2(0.205, -0.18),
      new THREE.Vector2(0.218, -0.325),
    ], profileSegments),
    materials.cloth,
    `${sleeve.name}_BLUE_FOREARM_BAND`,
  );
  forearmBand.castShadow = true;
  const bellOuter = mesh(
    createBellCuffSurfaceGeometry(profileSegments, side, 'outer'),
    materials.cloth,
    `${sleeve.name}_BELL_OUTER`,
  );
  bellOuter.castShadow = true;
  const detailedCuff = profileSegments > 4;
  const bellLining = detailedCuff
    ? mesh(
      createBellCuffSurfaceGeometry(profileSegments, side, 'lining'),
      materials.clothDeep,
      `${sleeve.name}_BELL_LINING`,
    )
    : null;
  const bellEdge = detailedCuff
    ? mesh(
      createBellCuffEdgeWallGeometry(profileSegments, side),
      materials.gold,
      `${sleeve.name}_BELL_EDGE_WALL`,
    )
    : null;
  const goldPerimeter = mesh(
    createBellCuffPerimeterGeometry(profileSegments, side),
    materials.gold,
    `${sleeve.name}_BELL_GOLD_PERIMETER`,
  );
  const elbowTrim = mesh(
    createEllipticalRimGeometry(0.224, 0.184, 0.015, profileSegments),
    materials.gold,
    `${sleeve.name}_ELBOW_TRIM`,
  );
  elbowTrim.position.y = -0.315;
  sleeve.add(
    forearmBand,
    bellOuter,
    goldPerimeter,
    elbowTrim,
  );
  if (bellLining && bellEdge) sleeve.add(bellLining, bellEdge);
  if (detailedCuff) {
    const flourishUpper = mesh(
      new THREE.TorusGeometry(0.082, 0.009, 4, Math.min(14, profileSegments), Math.PI * 1.45),
      materials.gold,
      `${sleeve.name}_TIDE_SCROLL_UPPER`,
      false,
    );
    flourishUpper.position.set(side === 'left' ? -0.19 : 0.19, -0.39, 0.222);
    flourishUpper.rotation.set(0, side === 'left' ? -9 * DEG : 9 * DEG, side === 'left' ? -21 * DEG : 21 * DEG);
    flourishUpper.scale.y = 0.62;
    const flourishLower = flourishUpper.clone();
    flourishLower.name = `${sleeve.name}_TIDE_SCROLL_LOWER`;
    flourishLower.scale.set(0.72, 0.48, 0.72);
    flourishLower.position.set(side === 'left' ? -0.225 : 0.225, -0.5, 0.238);
    flourishLower.rotation.z = side === 'left' ? 154 * DEG : -154 * DEG;
    const pearlAccent = mesh(
      new THREE.SphereGeometry(0.03, Math.max(6, Math.floor(profileSegments / 2)), 5),
      materials.pearl,
      `${sleeve.name}_TIDE_PEARL`,
    );
    pearlAccent.position.set(side === 'left' ? -0.245 : 0.245, -0.485, 0.247);
    addBarBetween(
      sleeve,
      materials.gold,
      [side === 'left' ? -0.13 : 0.13, -0.355, 0.224],
      [side === 'left' ? -0.255 : 0.255, -0.515, 0.246],
      0.007,
      `${sleeve.name}_TIDE_STEM`,
    );
    sleeve.add(flourishUpper, flourishLower, pearlAccent);
  }
  compactStaticGeometry(sleeve, sleeve.name);
  return sleeve;
}

function createHand(
  materials: CaretakerMaterials,
  segments: number,
  name: string,
  mode: 'open' | 'grip' | 'point' = 'open',
): THREE.Group {
  const hand = new THREE.Group();
  hand.name = name;
  const handSegments = Math.min(12, segments);
  const palm = mesh(new THREE.SphereGeometry(mode === 'grip' ? 0.18 : 0.175, handSegments, Math.max(6, handSegments / 2)), materials.clothDeep, `${name}_PALM`);
  palm.scale.set(mode === 'grip' ? 0.9 : 0.86, 1.05, 0.72);
  if (mode === 'grip') {
    palm.position.set(-0.045, 0, 0);
    for (let index = 0; index < 4; index += 1) {
      const finger = mesh(new THREE.CapsuleGeometry(0.027, 0.095, 2, 6), materials.clothDeep, `${name}_GRIP_FINGER_${index}`);
      finger.position.set(-0.045, 0.105 - index * 0.07, 0.12);
      finger.rotation.z = Math.PI / 2;
      hand.add(finger);
    }
    const thumb = mesh(new THREE.CapsuleGeometry(0.03, 0.11, 2, 6), materials.clothDeep, `${name}_THUMB`);
    thumb.position.set(-0.115, 0.08, 0.09);
    thumb.rotation.z = -48 * DEG;
    hand.add(thumb);
  } else {
    const spreads = [-18, -7, 7, 18];
    for (let index = 0; index < 4; index += 1) {
      const length = 0.17 - Math.abs(index - 1.5) * 0.012;
      const finger = mesh(new THREE.CapsuleGeometry(0.026, length, 2, 6), materials.clothDeep, `${name}_FINGER_${index}`);
      finger.position.set((index - 1.5) * 0.073, -0.12 - length / 2, 0.065);
      finger.rotation.set(-14 * DEG, 0, spreads[index] * DEG);
      hand.add(finger);
    }
    const thumb = mesh(new THREE.CapsuleGeometry(0.03, 0.11, 2, 6), materials.clothDeep, `${name}_THUMB`);
    thumb.position.set(-0.17, -0.005, 0.07);
    thumb.rotation.z = 61 * DEG;
    hand.add(thumb);
  }
  hand.add(palm);
  palm.castShadow = true;
  compactStaticGeometry(hand, name);
  if (mode === 'point') {
    // Kept outside the static batch so the guide pose can extend one clear
    // pointing finger without paying for a fully articulated hand rig.
    const pointFinger = mesh(
      new THREE.CapsuleGeometry(0.028, 0.24, 2, 5),
      materials.clothDeep,
      `${name}_POINT_FINGER`,
    );
    pointFinger.position.set(-0.028, -0.235, 0.055);
    pointFinger.rotation.x = -5 * DEG;
    pointFinger.visible = false;
    hand.add(pointFinger);
    hand.userData.pointFinger = pointFinger;
  }
  return hand;
}

function createHoodOpeningFrameGeometry(options: {
  outerWidth: number;
  outerTop: number;
  outerBottom: number;
  innerWidth: number;
  innerTop: number;
  innerBottom: number;
  depth: number;
  curveSegments: number;
}) {
  const shape = new THREE.Shape();
  shape.moveTo(-options.outerWidth, options.outerBottom);
  shape.lineTo(-options.outerWidth, 0.02);
  shape.quadraticCurveTo(-options.outerWidth * 0.94, options.outerTop * 0.82, 0, options.outerTop);
  shape.quadraticCurveTo(options.outerWidth * 0.94, options.outerTop * 0.82, options.outerWidth, 0.02);
  shape.lineTo(options.outerWidth, options.outerBottom);
  shape.lineTo(-options.outerWidth, options.outerBottom);

  const opening = new THREE.Path();
  opening.moveTo(-options.innerWidth, options.innerBottom);
  opening.lineTo(options.innerWidth, options.innerBottom);
  opening.lineTo(options.innerWidth, 0.01);
  opening.quadraticCurveTo(options.innerWidth * 0.9, options.innerTop * 0.8, 0, options.innerTop);
  opening.quadraticCurveTo(-options.innerWidth * 0.9, options.innerTop * 0.8, -options.innerWidth, 0.01);
  opening.lineTo(-options.innerWidth, options.innerBottom);
  shape.holes.push(opening);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: options.depth,
    steps: 1,
    curveSegments: options.curveSegments,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.01,
  });
  geometry.translate(0, 0, -options.depth / 2);
  return geometry;
}

function createGarmentPanelGeometry(
  points: ReadonlyArray<readonly [number, number]>,
  depth: number,
) {
  const shape = new THREE.Shape();
  points.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.012,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createCapeletPanelGeometry(side: -1 | 1, depth = 0.09, curveSegments = 10) {
  const shape = new THREE.Shape();
  // Each capelet leaf begins beside the clasp instead of meeting as a padded
  // bar across the entire chest. Its scalloped lower edge then wraps over the
  // shoulder, matching the layered open-front construction in the goal.
  shape.moveTo(side * 0.16, 0.24);
  shape.quadraticCurveTo(side * 0.4, 0.36, side * 0.67, 0.29);
  shape.quadraticCurveTo(side * 0.89, 0.23, side * 0.92, 0.07);
  shape.quadraticCurveTo(side * 0.89, -0.055, side * 0.77, -0.09);
  shape.quadraticCurveTo(side * 0.67, -0.045, side * 0.57, -0.15);
  shape.quadraticCurveTo(side * 0.45, -0.205, side * 0.33, -0.1);
  shape.quadraticCurveTo(side * 0.24, -0.035, side * 0.17, -0.065);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: Math.min(0.008, depth * 0.15),
    bevelThickness: Math.min(0.007, depth * 0.13),
  });
  geometry.translate(0, 0, -depth / 2);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const shoulderProgress = THREE.MathUtils.clamp(Math.abs(x) / 0.92, 0, 1);
    const shoulderWrap = Math.pow(shoulderProgress, 1.5) * 0.27;
    const softCrown = Math.sin(shoulderProgress * Math.PI) * 0.025
      * THREE.MathUtils.smoothstep(y, -0.2, 0.36);
    positions.setZ(index, z - shoulderWrap + softCrown);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function resolveCapeSurfacePoint(side: -1 | 1, horizontal: number, vertical: number): [number, number, number] {
  const innerWidth = THREE.MathUtils.lerp(0.09, 0.12, vertical);
  const outerWidth = THREE.MathUtils.lerp(0.62, 1.1, vertical * vertical * (3 - 2 * vertical));
  const wrapAngle = horizontal * Math.PI * 0.5;
  const x = side * (innerWidth + Math.sin(wrapAngle) * (outerWidth - innerWidth));
  const curvedHem = Math.pow(vertical, 5) * (
    Math.sin(horizontal * Math.PI) * 0.09
    + Math.cos(horizontal * Math.PI * 2) * 0.025
  );
  const y = THREE.MathUtils.lerp(1.64, 0.12, vertical) + curvedHem;
  const gravityDrape = Math.sin(vertical * Math.PI);
  const broadFolds = Math.cos(horizontal * Math.PI * 4) * 0.12 * gravityDrape;
  const secondaryFold = Math.sin(horizontal * Math.PI * 2) * 0.035 * gravityDrape;
  const rearDrape = -0.1 - gravityDrape * (0.1 + broadFolds + secondaryFold);
  const restrainedSideWrap = (1 - Math.cos(wrapAngle)) * 0.12;
  return [x, y, rearDrape + restrainedSideWrap];
}

function createCapePanelGeometry(side: -1 | 1, depth = 0.1, curveSegments = 10) {
  const columns = curveSegments >= 10 ? 6 : 4;
  const rows = curveSegments >= 10 ? 8 : 6;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const thickness = sheet === 0 ? -depth / 2 : depth / 2;
    for (let row = 0; row < rows; row += 1) {
      const vertical = row / (rows - 1);
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        const [x, y, z] = resolveCapeSurfacePoint(side, horizontal, vertical);
        positions.push(x, y, z + thickness);
        uvs.push(horizontal, 1 - vertical);
      }
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      const front = sheetSize;
      indices.push(front + a, front + b, front + c, front + b, front + d, front + c);
    }
  }

  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function resolveContinuousCapePoint(
  horizontal: number,
  vertical: number,
  inwardOffset = 0,
): [number, number, number] {
  // Trace one uninterrupted shell from the right front edge, around the back,
  // to the left front edge. The front remains open while the rear has no false
  // centre split. Radius increases toward the weighted hem.
  const easedVertical = vertical * vertical * (3 - 2 * vertical);
  const openAngle = THREE.MathUtils.lerp(18, 29, easedVertical);
  const angle = THREE.MathUtils.lerp(openAngle, 360 - openAngle, horizontal) * DEG;
  const foldEnvelope = 0.18 + THREE.MathUtils.smoothstep(vertical, 0.08, 1) * 0.82;
  const broadFold = Math.cos(horizontal * Math.PI * 6) * 0.068 * foldEnvelope;
  const secondaryFold = Math.sin(horizontal * Math.PI * 10 + 0.4) * 0.022 * foldEnvelope;
  const lowerFoldWeight = THREE.MathUtils.smoothstep(vertical, 0.48, 1)
    * Math.cos(horizontal * Math.PI * 6 + 0.28)
    * 0.024;
  const radiusX = THREE.MathUtils.lerp(0.58, 1.05, easedVertical)
    + broadFold + secondaryFold + lowerFoldWeight - inwardOffset;
  const radiusZ = THREE.MathUtils.lerp(0.43, 0.72, easedVertical)
    + broadFold * 0.45 + lowerFoldWeight * 0.35 - inwardOffset;
  const hemWeight = Math.pow(vertical, 5) * (
    Math.cos(horizontal * Math.PI * 6) * 0.052
    - Math.cos(horizontal * Math.PI * 2) * 0.022
  );
  const y = THREE.MathUtils.lerp(1.64, 0.13, vertical) + hemWeight;
  return [Math.sin(angle) * radiusX, y, Math.cos(angle) * radiusZ];
}

function createContinuousCapePerimeterGeometry(
  quality: CaretakerQuality,
  edge: 'left' | 'right' | 'hem',
) {
  const pointCount = edge === 'hem'
    ? (quality === 'high' ? 19 : 10)
    : (quality === 'high' ? 12 : 7);
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let index = 0; index < pointCount; index += 1) {
    const progress = index / (pointCount - 1);
    const horizontal = edge === 'hem' ? progress : (edge === 'left' ? 1 : 0);
    const vertical = edge === 'hem' ? 1 : progress;
    const outer = resolveContinuousCapePoint(horizontal, vertical, 0);
    const inner = resolveContinuousCapePoint(horizontal, vertical, 0.035);
    positions.push(...outer, ...inner);
    uvs.push(progress, 0, progress, 1);
    if (index < pointCount - 1) {
      const a = index * 2;
      const b = a + 1;
      const c = a + 2;
      const d = a + 3;
      indices.push(a, b, c, c, b, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCapeTideBandGeometry(
  quality: CaretakerQuality,
  kind: 'gold' | 'cyan',
) {
  const pointCount = quality === 'high' ? 28 : 14;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const horizontal = THREE.MathUtils.lerp(0.075, 0.925, progress);
    const wave = Math.sin(progress * Math.PI * 6 + (kind === 'cyan' ? 0 : 0.7));
    const vertical = (kind === 'cyan' ? 0.865 : 0.815) + wave * (kind === 'cyan' ? 0.035 : 0.018);
    return new THREE.Vector3(...resolveContinuousCapePoint(horizontal, vertical, -0.018));
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    quality === 'high' ? 48 : 22,
    kind === 'cyan' ? 0.016 : 0.012,
    quality === 'high' ? 4 : 3,
    false,
  );
}

function createCapeTideCurlGeometry(centerHorizontal: number, direction: -1 | 1) {
  const pointCount = 18;
  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const angle = progress * Math.PI * 1.72;
    const radius = THREE.MathUtils.lerp(0.072, 0.025, progress);
    const horizontal = centerHorizontal + Math.cos(angle) * radius * direction;
    const vertical = 0.855 + Math.sin(angle) * 0.052;
    return new THREE.Vector3(...resolveContinuousCapePoint(horizontal, vertical, -0.026));
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    28,
    0.012,
    4,
    false,
  );
}

function createContinuousCapeSurfaceGeometry(
  quality: CaretakerQuality,
  inwardOffset = 0,
  reverse = false,
) {
  const columns = quality === 'high' ? 19 : 10;
  const rows = quality === 'high' ? 12 : 7;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let row = 0; row < rows; row += 1) {
    const vertical = row / (rows - 1);
    for (let column = 0; column < columns; column += 1) {
      const horizontal = column / (columns - 1);
      const [x, y, z] = resolveContinuousCapePoint(horizontal, vertical, inwardOffset);
      positions.push(x, y, z);
      uvs.push(horizontal, 1 - vertical);
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      if (reverse) indices.push(a, b, c, b, d, c);
      else indices.push(a, c, b, b, c, d);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createContinuousCapeTrimGeometry(
  quality: CaretakerQuality,
  edge: 'left' | 'right' | 'hem',
) {
  const pointCount = edge === 'hem'
    ? (quality === 'high' ? 19 : 10)
    : (quality === 'high' ? 13 : 7);
  const points = Array.from({ length: pointCount }, (_, index) => {
    const progress = index / (pointCount - 1);
    const point = edge === 'hem'
      ? resolveContinuousCapePoint(progress, 1)
      : resolveContinuousCapePoint(edge === 'left' ? 1 : 0, progress);
    return new THREE.Vector3(...point);
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    quality === 'high' ? (edge === 'hem' ? 42 : 32) : (edge === 'hem' ? 20 : 14),
    quality === 'high' ? 0.022 : 0.024,
    quality === 'high' ? 5 : 3,
    false,
  );
}

function createCapeCollarCurve(quality: CaretakerQuality, edgeOffset = 0) {
  const segments = quality === 'high' ? 18 : 10;
  const points = Array.from({ length: segments }, (_, index) => {
    const progress = index / (segments - 1);
    const angle = THREE.MathUtils.lerp(38, 322, progress) * DEG;
    const frontWeight = Math.max(0, Math.cos(angle));
    return new THREE.Vector3(
      Math.sin(angle) * (0.43 + edgeOffset),
      0.27 - frontWeight * 0.08 + Math.max(0, -Math.cos(angle)) * 0.025,
      Math.cos(angle) * (0.33 + edgeOffset),
    );
  });
  return new THREE.CatmullRomCurve3(points, false, 'centripetal');
}

function addCapeFrontHardware(
  root: THREE.Object3D,
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  quality: CaretakerQuality,
  withPearls: boolean,
  withPendant: boolean,
) {
  const hardware = new THREE.Group();
  hardware.name = 'CARETAKER_OUTFIT_CAPE_FRONT_HARDWARE';
  const z = 0.755;
  for (const side of [-1, 1] as const) {
    const shell = mesh(
      new THREE.SphereGeometry(0.105, quality === 'high' ? 12 : 8, quality === 'high' ? 8 : 6),
      withPearls ? materials.pearl : materials.gold,
      `CARETAKER_OUTFIT_CAPE_SHELL_ANCHOR_${side < 0 ? 'LEFT' : 'RIGHT'}`,
    );
    shell.position.set(side * 0.33, 0.075, z);
    shell.scale.set(1.08, 0.78, 0.38);
    hardware.add(shell);
    addTrimBetween(
      hardware,
      materials,
      [side * 0.27, 0.055, z + 0.012],
      [side * 0.08, 0.015, z + 0.018],
      0.018,
      `CARETAKER_OUTFIT_CAPE_ANCHOR_CHAIN_${side}`,
    );
  }
  const claspFrame = mesh(
    createDiamondFrameGeometry(0.095, 0.12, 0.032),
    materials.gold,
    'CARETAKER_OUTFIT_CAPE_CENTRAL_CLASP_FRAME',
  );
  claspFrame.position.set(0, 0.005, z + 0.015);
  const claspPearl = mesh(
    new THREE.SphereGeometry(0.052, quality === 'high' ? 10 : 7, quality === 'high' ? 8 : 5),
    materials.pearl,
    'CARETAKER_OUTFIT_CAPE_CENTRAL_CLASP_PEARL',
  );
  claspPearl.position.set(0, 0.005, z + 0.05);
  hardware.add(claspFrame, claspPearl);
  if (withPendant) {
    const pendant = addDiamondCrest(
      hardware,
      materials,
      [0, -0.25, z + 0.02],
      0.88,
      'CARETAKER_OUTFIT_CAPE_PENDANT',
    );
    pendant.userData.baseRotationZ = 0;
    root.userData.caretakerCapePendant = pendant;
  }
  parent.add(hardware);
}

function createCoatSideGoreGeometry(side: -1 | 1, quality: CaretakerQuality) {
  const columns = quality === 'high' ? 7 : 4;
  const rows = quality === 'high' ? 10 : 6;
  const depth = quality === 'high' ? 0.075 : 0.055;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const thickness = sheet === 0 ? -depth / 2 : depth / 2;
    for (let row = 0; row < rows; row += 1) {
      const vertical = row / (rows - 1);
      const eased = vertical * vertical * (3 - 2 * vertical);
      const radius = THREE.MathUtils.lerp(0.58, 0.86, eased);
      const y = THREE.MathUtils.lerp(1.3, 0.13, vertical)
        - Math.sin(vertical * Math.PI) * 0.025;
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        const angle = THREE.MathUtils.lerp(40, 140, horizontal) * DEG;
        const fold = Math.sin(horizontal * Math.PI * 3) * 0.018 * eased;
        const radial = radius + fold + thickness;
        positions.push(side * Math.sin(angle) * radial, y, Math.cos(angle) * radial);
        uvs.push(horizontal, 1 - vertical);
      }
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
    }
  }

  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createMantleSideBridgeGeometry(side: -1 | 1, quality: CaretakerQuality) {
  const columns = quality === 'high' ? 8 : 5;
  const rows = quality === 'high' ? 5 : 3;
  const depth = quality === 'high' ? 0.075 : 0.055;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const thickness = sheet === 0 ? -depth / 2 : depth / 2;
    for (let row = 0; row < rows; row += 1) {
      const vertical = row / (rows - 1);
      const radius = THREE.MathUtils.lerp(0.66, 0.78, vertical) + thickness;
      const y = THREE.MathUtils.lerp(0.28, -0.08, vertical)
        - Math.sin(vertical * Math.PI) * 0.025;
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        const angle = THREE.MathUtils.lerp(46, 134, horizontal) * DEG;
        const shoulderCrown = Math.sin(horizontal * Math.PI) * 0.035 * (1 - vertical);
        positions.push(
          side * Math.sin(angle) * (radius + shoulderCrown),
          y,
          Math.cos(angle) * (radius + shoulderCrown),
        );
        uvs.push(horizontal, 1 - vertical);
      }
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
    }
  }

  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createTailoredFrontPanelGeometry(
  side: -1 | 1,
  kind: 'lining' | 'coat',
  depth: number,
) {
  if (kind === 'coat') {
    const columns = 7;
    const rows = 11;
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const sheetSize = columns * rows;
    for (let sheet = 0; sheet < 2; sheet += 1) {
      const thickness = sheet === 0 ? -depth / 2 : depth / 2;
      for (let row = 0; row < rows; row += 1) {
        const vertical = row / (rows - 1);
        const eased = vertical * vertical * (3 - 2 * vertical);
        const innerWidth = THREE.MathUtils.lerp(0.14, 0.3, eased) + Math.sin(vertical * Math.PI) * 0.025;
        const outerWidth = THREE.MathUtils.lerp(0.62, 0.84, eased) - Math.sin(vertical * Math.PI) * 0.105;
        for (let column = 0; column < columns; column += 1) {
          const horizontal = column / (columns - 1);
          const x = side * THREE.MathUtils.lerp(innerWidth, outerWidth, horizontal);
          const hemSweep = Math.pow(vertical, 7) * Math.sin(horizontal * Math.PI) * 0.12;
          const y = THREE.MathUtils.lerp(1.5, 0.02, vertical) - hemSweep;
          const [, , surfaceZ] = resolveFrontCoatSurfacePoint(x, y, 0);
          positions.push(x, y, surfaceZ + thickness);
          uvs.push(horizontal, 1 - vertical);
        }
      }
    }
    for (let row = 0; row < rows - 1; row += 1) {
      for (let column = 0; column < columns - 1; column += 1) {
        const a = row * columns + column;
        const b = a + 1;
        const c = a + columns;
        const d = c + 1;
        indices.push(a, c, b, b, c, d);
        indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
      }
    }
    const perimeter: number[] = [];
    for (let column = 0; column < columns; column += 1) perimeter.push(column);
    for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
    for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
    for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
    for (let index = 0; index < perimeter.length; index += 1) {
      const current = perimeter[index];
      const next = perimeter[(index + 1) % perimeter.length];
      indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    return geometry;
  }

  const shape = new THREE.Shape();
  shape.moveTo(side * 0.055, 1.42);
  shape.quadraticCurveTo(side * 0.25, 1.43, side * 0.34, 1.29);
  shape.quadraticCurveTo(side * 0.38, 0.72, side * 0.32, 0.08);
  shape.quadraticCurveTo(side * 0.18, 0.02, side * 0.055, 0.07);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 10,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.014,
    bevelThickness: 0.011,
  });
  geometry.translate(0, 0, -depth / 2);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const normalizedX = THREE.MathUtils.clamp(Math.abs(x) / 0.38, 0, 1);
    const vertical = THREE.MathUtils.clamp((y + 0.11) / 1.61, 0, 1);
    const hipFlare = 1 - THREE.MathUtils.smoothstep(vertical, 0.28, 0.72) * 0.16;
    const wrapDepth = Math.pow(normalizedX, 1.45) * 0.12 * hipFlare;
    const softCrown = (1 - normalizedX * normalizedX) * Math.sin(vertical * Math.PI) * 0.025;
    positions.setZ(index, z - wrapDepth + softCrown);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function resolveQuiltedTunicPanelPoint(
  side: -1 | 1,
  horizontal: number,
  vertical: number,
  depthInset = 0,
): [number, number, number] {
  const eased = vertical * vertical * (3 - 2 * vertical);
  const split = THREE.MathUtils.smoothstep(vertical, 0.25, 0.58);
  const innerWidth = THREE.MathUtils.lerp(0.006, 0.028, split);
  const outerWidth = THREE.MathUtils.lerp(0.395, 0.34, eased)
    + Math.sin(vertical * Math.PI) * 0.018;
  const x = side * THREE.MathUtils.lerp(innerWidth, outerWidth, horizontal);
  const y = THREE.MathUtils.lerp(1.5, 0.08, vertical)
    - Math.pow(vertical, 7) * Math.sin(horizontal * Math.PI) * 0.018;
  const normalizedX = THREE.MathUtils.clamp(Math.abs(x) / 0.43, 0, 0.99);
  const bodyCrown = Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX)) * 0.39;
  const weightedSkirtFold = Math.sin(horizontal * Math.PI) * 0.026
    * THREE.MathUtils.smoothstep(vertical, 0.2, 0.9);
  const beltCompression = Math.exp(-Math.pow((y - 1.24) / 0.105, 2)) * 0.022;
  const hemTurn = Math.pow(vertical, 6) * 0.014;
  return [x, y, 0.095 + bodyCrown + weightedSkirtFold - beltCompression - hemTurn - depthInset];
}

function createQuiltedTunicPanelGeometry(side: -1 | 1, quality: CaretakerQuality) {
  // Seven by thirteen is dense enough to preserve the soft waist-to-hem
  // curvature, while avoiding vertices whose movement is below a phone pixel.
  const columns = quality === 'high' ? 7 : 4;
  const rows = quality === 'high' ? 13 : 5;
  const depth = quality === 'high' ? 0.065 : 0.052;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const depthInset = sheet === 0 ? depth : 0;
    for (let row = 0; row < rows; row += 1) {
      const vertical = THREE.MathUtils.lerp(0.18, 1, row / (rows - 1));
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        const [x, y, z] = resolveQuiltedTunicPanelPoint(side, horizontal, vertical, depthInset);
        positions.push(x, y, z);
        uvs.push(horizontal, 1 - row / (rows - 1));
      }
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
    }
  }

  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createQuiltedTunicBodiceGeometry(quality: CaretakerQuality) {
  const columns = quality === 'high' ? 10 : 4;
  const rows = quality === 'high' ? 5 : 2;
  const depth = quality === 'high' ? 0.062 : 0.05;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const depthInset = sheet === 0 ? depth : 0;
    for (let row = 0; row < rows; row += 1) {
      const vertical = THREE.MathUtils.lerp(0, 0.235, row / (rows - 1));
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        const signed = horizontal * 2 - 1;
        const halfWidth = THREE.MathUtils.lerp(0.385, 0.365, vertical / 0.235);
        const x = signed * halfWidth;
        const y = THREE.MathUtils.lerp(1.5, 1.165, row / (rows - 1));
        const normalizedX = THREE.MathUtils.clamp(Math.abs(x) / 0.43, 0, 0.99);
        const crown = Math.sqrt(Math.max(0, 1 - normalizedX * normalizedX)) * 0.39;
        const beltCompression = Math.exp(-Math.pow((y - 1.24) / 0.105, 2)) * 0.022;
        positions.push(x, y, 0.095 + crown - beltCompression - depthInset);
        uvs.push(horizontal, 1 - row / (rows - 1));
      }
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
    }
  }

  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function addQuiltedUndergarment(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  quality: CaretakerQuality,
) {
  const undergarment = new THREE.Group();
  undergarment.name = 'CARETAKER_OUTFIT_UNDERGARMENT';

  const bodice = mesh(
    createQuiltedTunicBodiceGeometry(quality),
    materials.undercloth,
    'CARETAKER_OUTFIT_UNDERGARMENT_BODICE',
  );
  bodice.castShadow = true;
  bodice.userData.explodeWithParent = true;
  undergarment.add(bodice);

  for (const side of [-1, 1] as const) {
    const sideName = side < 0 ? 'LEFT' : 'RIGHT';
    const panel = mesh(
      createQuiltedTunicPanelGeometry(side, quality),
      materials.undercloth,
      `CARETAKER_OUTFIT_UNDERGARMENT_PANEL_${sideName}`,
    );
    panel.castShadow = true;
    panel.userData.explodeWithParent = true;
    undergarment.add(panel);

    if (quality !== 'high') continue;

    const addPiping = (
      samples: ReadonlyArray<readonly [number, number, number]>,
      name: string,
      radius = 0.011,
    ) => {
      const piping = mesh(
        // Eight longitudinal segments and a triangular cross-section preserve the
        // phone-scale piping read while keeping this repeated trim inside the
        // caretaker's approved close-up geometry budget.
        createFiligreeStrokeGeometry(samples, radius, 8, 3),
        materials.gold,
        name,
        false,
      );
      piping.userData.explodeWithParent = true;
      undergarment.add(piping);
    };

    const edgeStart = 0.24;
    const edgeSamples = 10;
    const innerEdge = Array.from({ length: edgeSamples }, (_, index) => {
      const vertical = THREE.MathUtils.lerp(edgeStart, 1, index / (edgeSamples - 1));
      const [x, y, z] = resolveQuiltedTunicPanelPoint(side, 0, vertical);
      return [x, y, z + 0.012] as const;
    });
    const outerEdge = Array.from({ length: edgeSamples }, (_, index) => {
      const vertical = THREE.MathUtils.lerp(edgeStart, 1, index / (edgeSamples - 1));
      const [x, y, z] = resolveQuiltedTunicPanelPoint(side, 1, vertical);
      return [x, y, z + 0.012] as const;
    });
    const hem = Array.from({ length: 9 }, (_, index) => {
      const horizontal = index / 8;
      const [x, y, z] = resolveQuiltedTunicPanelPoint(side, horizontal, 1);
      return [x, y, z + 0.012] as const;
    });
    addPiping(innerEdge, `CARETAKER_OUTFIT_UNDERGARMENT_TRIM_${sideName}_INNER`, 0.009);
    addPiping(outerEdge, `CARETAKER_OUTFIT_UNDERGARMENT_TRIM_${sideName}_OUTER`, 0.01);
    addPiping(hem, `CARETAKER_OUTFIT_UNDERGARMENT_TRIM_${sideName}_HEM`, 0.0105);

    for (let row = 0; row < 5; row += 1) {
      const vertical = THREE.MathUtils.lerp(0.29, 0.87, row / 4);
      for (let column = 0; column < 2; column += 1) {
        const horizontal = column === 0 ? 0.34 : 0.7;
        const halfHorizontal = 0.105;
        const halfVertical = 0.048;
        const diamondPaths = [
          [[horizontal - halfHorizontal, vertical], [horizontal, vertical - halfVertical], [horizontal + halfHorizontal, vertical]],
          [[horizontal - halfHorizontal, vertical], [horizontal, vertical + halfVertical], [horizontal + halfHorizontal, vertical]],
        ] as const;
        diamondPaths.forEach((path, pathIndex) => {
          const points = path.map(([u, v]) => {
            const [x, y, z] = resolveQuiltedTunicPanelPoint(side, u, v);
            return [x, y, z + 0.008] as const;
          });
          const seam = mesh(
            // The seam is only a few pixels wide in its closest supported view;
            // six longitudinal segments retain the diamond contour without
            // spending close-up triangles on sub-pixel curvature.
            createFiligreeStrokeGeometry(points, 0.0031, 6, 3),
            materials.stitch,
            `CARETAKER_OUTFIT_UNDERGARMENT_QUILT_${sideName}_${row}_${column}_${pathIndex}`,
            false,
          );
          seam.userData.explodeWithParent = true;
          undergarment.add(seam);
        });
      }
    }
  }

  parent.add(undergarment);
}

function createRectFrameGeometry(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(-width, -height);
  shape.lineTo(width, -height);
  shape.lineTo(width, height);
  shape.lineTo(-width, height);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(-width * 0.62, -height * 0.58);
  hole.lineTo(-width * 0.62, height * 0.58);
  hole.lineTo(width * 0.62, height * 0.58);
  hole.lineTo(width * 0.62, -height * 0.58);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 1,
    bevelSize: 0.008,
    bevelThickness: 0.006,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function createRoundedBeltPanelGeometry(width: number, height: number, depth: number) {
  const radius = Math.min(height * 0.7, 0.07);
  const shape = new THREE.Shape();
  shape.moveTo(-width + radius, -height);
  shape.lineTo(width - radius, -height);
  shape.quadraticCurveTo(width, -height, width, -height + radius);
  shape.lineTo(width, height - radius);
  shape.quadraticCurveTo(width, height, width - radius, height);
  shape.lineTo(-width + radius, height);
  shape.quadraticCurveTo(-width, height, -width, height - radius);
  shape.lineTo(-width, -height + radius);
  shape.quadraticCurveTo(-width, -height, -width + radius, -height);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    curveSegments: 8,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.01,
  });
  geometry.translate(0, 0, -depth / 2);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const z = positions.getZ(index);
    const normalized = THREE.MathUtils.clamp(Math.abs(x) / width, 0, 1);
    positions.setZ(index, z + (1 - normalized * normalized) * 0.07);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function addBarBetween(
  parent: THREE.Object3D,
  material: THREE.Material,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  name: string,
) {
  const start = new THREE.Vector3(...from);
  const end = new THREE.Vector3(...to);
  const midpoint = start.clone().add(end).multiplyScalar(0.5);
  const length = start.distanceTo(end);
  const trim = mesh(new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 3, 8), material, name);
  trim.position.copy(midpoint);
  trim.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.clone().sub(start).normalize());
  parent.add(trim);
  return trim;
}

function addTrimBetween(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  from: readonly [number, number, number],
  to: readonly [number, number, number],
  radius: number,
  name: string,
) {
  return addBarBetween(parent, materials.gold, from, to, radius, name);
}

function resolveFrontCoatSurfacePoint(x: number, y: number, baseZ: number): [number, number, number] {
  const normalizedX = THREE.MathUtils.clamp(Math.abs(x) / 0.84, 0, 1);
  const vertical = THREE.MathUtils.clamp((y + 0.11) / 1.61, 0, 1);
  const hipFlare = 1 - THREE.MathUtils.smoothstep(vertical, 0.28, 0.72) * 0.16;
  const wrapDepth = Math.pow(normalizedX, 1.45) * 0.32 * hipFlare;
  const softCrown = (1 - normalizedX * normalizedX) * Math.sin(vertical * Math.PI) * 0.035;
  return [x, y, baseZ - wrapDepth + softCrown];
}

function addCurvedFrontCoatTrim(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  from: readonly [number, number],
  to: readonly [number, number],
  baseZ: number,
  radius: number,
  name: string,
) {
  const points = Array.from({ length: 7 }, (_, index) => {
    const progress = index / 6;
    return resolveFrontCoatSurfacePoint(
      THREE.MathUtils.lerp(from[0], to[0], progress),
      THREE.MathUtils.lerp(from[1], to[1], progress),
      baseZ + 0.055,
    );
  });
  const trim = mesh(createFiligreeStrokeGeometry(points, radius, 18), materials.gold, name);
  parent.add(trim);
  return trim;
}

function deformBrimGeometry<T extends THREE.BufferGeometry>(geometry: T, radius: number): T {
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const lateral = Math.min(1, Math.abs(x) / radius);
    const foreAft = THREE.MathUtils.clamp(z / radius, -1, 1);
    // A broad fabric brim must sag visibly at phone scale. The stronger cubic
    // edge falloff preserves the crown seat while avoiding a rigid platter.
    positions.setY(index, y - Math.pow(lateral, 1.65) * 0.34 + foreAft * 0.09);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

interface HoodCrownRing {
  radius: number;
  y: number;
  depthScale: number;
  centerX: number;
  centerZ: number;
  sideDroop: number;
  foreTilt: number;
}

const HOOD_CROWN_RINGS: readonly HoodCrownRing[] = [
  { radius: 0.2, y: 1.65, depthScale: 0.8, centerX: -0.33, centerZ: -0.18, sideDroop: 0.07, foreTilt: 0 },
  { radius: 0.28, y: 1.57, depthScale: 0.82, centerX: -0.29, centerZ: -0.165, sideDroop: 0.045, foreTilt: 0 },
  { radius: 0.37, y: 1.47, depthScale: 0.85, centerX: -0.24, centerZ: -0.145, sideDroop: 0.026, foreTilt: 0.002 },
  { radius: 0.46, y: 1.35, depthScale: 0.88, centerX: -0.18, centerZ: -0.12, sideDroop: 0.016, foreTilt: 0.004 },
  { radius: 0.56, y: 1.17, depthScale: 0.92, centerX: -0.115, centerZ: -0.085, sideDroop: 0.018, foreTilt: 0.009 },
  { radius: 0.64, y: 0.96, depthScale: 0.95, centerX: -0.06, centerZ: -0.05, sideDroop: 0.027, foreTilt: 0.013 },
  { radius: 0.69, y: 0.73, depthScale: 0.98, centerX: -0.025, centerZ: -0.025, sideDroop: 0.036, foreTilt: 0.018 },
  { radius: 0.71, y: 0.53, depthScale: 0.99, centerX: -0.008, centerZ: -0.008, sideDroop: 0.045, foreTilt: 0.022 },
  { radius: 0.7, y: 0.4, depthScale: 1, centerX: 0, centerZ: 0, sideDroop: 0.052, foreTilt: 0.025 },
] as const;

function resolveHoodCrownPoint(ring: HoodCrownRing, angle: number, verticalProgress = 0) {
  const lateral = Math.cos(angle);
  const foreAft = Math.sin(angle);
  const verticalWeight = Math.sin(verticalProgress * Math.PI);
  const phaseIndex = verticalProgress * (HOOD_CROWN_RINGS.length - 1);
  const broadFold = (
    Math.sin(angle * 3 + phaseIndex * 0.42) * 0.016
    + Math.sin(angle * 5 - phaseIndex * 0.31) * 0.005
  ) * ring.radius * verticalWeight;
  const rearMass = Math.pow(Math.max(0, -foreAft), 1.6) * 0.025 * verticalWeight;
  const gaussian = (center: number, spread: number) => (
    Math.exp(-Math.pow((verticalProgress - center) / spread, 2))
  );
  const compressedRingFold = (
    gaussian(0.24, 0.075) * 0.028
    - gaussian(0.36, 0.06) * 0.04
    + gaussian(0.49, 0.075) * 0.032
    - gaussian(0.62, 0.065) * 0.036
    + gaussian(0.75, 0.08) * 0.024
  ) * verticalWeight;
  const radius = ring.radius + broadFold + rearMass + compressedRingFold;
  const crownPoint = new THREE.Vector3(
    ring.centerX + radius * lateral,
    ring.y - Math.pow(Math.abs(lateral), 1.65) * ring.sideDroop + foreAft * ring.foreTilt
      + Math.sin(angle * 3 + phaseIndex * 0.7) * 0.008 * verticalWeight,
    ring.centerZ + radius * ring.depthScale * foreAft,
  );
  return crownPoint;
}

function interpolateHoodCrownRing(progress: number): HoodCrownRing {
  const scaled = THREE.MathUtils.clamp(progress, 0, 1) * (HOOD_CROWN_RINGS.length - 1);
  const firstIndex = Math.floor(scaled);
  const secondIndex = Math.min(HOOD_CROWN_RINGS.length - 1, firstIndex + 1);
  const blend = scaled - firstIndex;
  const first = HOOD_CROWN_RINGS[firstIndex];
  const second = HOOD_CROWN_RINGS[secondIndex];
  return {
    radius: THREE.MathUtils.lerp(first.radius, second.radius, blend),
    y: THREE.MathUtils.lerp(first.y, second.y, blend),
    depthScale: THREE.MathUtils.lerp(first.depthScale, second.depthScale, blend),
    centerX: THREE.MathUtils.lerp(first.centerX, second.centerX, blend),
    centerZ: THREE.MathUtils.lerp(first.centerZ, second.centerZ, blend),
    sideDroop: THREE.MathUtils.lerp(first.sideDroop, second.sideDroop, blend),
    foreTilt: THREE.MathUtils.lerp(first.foreTilt, second.foreTilt, blend),
  };
}

function createHoodCrownGeometry(quality: CaretakerQuality) {
  const segments = quality === 'high' ? 28 : 12;
  const ringCount = quality === 'high' ? 21 : HOOD_CROWN_RINGS.length;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ringIndex = 0; ringIndex < ringCount; ringIndex += 1) {
    const verticalProgress = ringIndex / (ringCount - 1);
    const ring = interpolateHoodCrownRing(verticalProgress);
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const point = resolveHoodCrownPoint(ring, angle, verticalProgress);
      positions.push(point.x, point.y, point.z);
      uvs.push(segment / segments, verticalProgress);
    }
  }
  for (let ringIndex = 0; ringIndex < ringCount - 1; ringIndex += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const nextSegment = (segment + 1) % segments;
      const current = ringIndex * segments + segment;
      const next = (ringIndex + 1) * segments + segment;
      const currentSide = ringIndex * segments + nextSegment;
      const nextSide = (ringIndex + 1) * segments + nextSegment;
      indices.push(current, currentSide, next, currentSide, nextSide, next);
    }
  }
  // Continue the crown directly into the bent tail. Previous versions sealed
  // the crown and overlapped a separately closed tail inside it; their mesh
  // intersection looked like an oval hole from rear three-quarter views. This
  // shared-ring loft rotates the section frame gradually, so the whole hood is
  // one closed surface with no socket, cap, or coincident seam at the top.
  const tailCurve = createHoodTailCurve();
  const tailRingCount = quality === 'high' ? 26 : 9;
  const tailEnd = 0.965;
  const tailVertexStart = positions.length / 3;
  const crownRoot = HOOD_CROWN_RINGS[0];
  const crownCenter = new THREE.Vector3(crownRoot.centerX, crownRoot.y, crownRoot.centerZ);
  const appendTailRing = (
    center: THREE.Vector3,
    lateral: THREE.Vector3,
    depth: THREE.Vector3,
    lateralExtent: number,
    depthExtent: number,
    uvV: number,
  ) => {
    for (let side = 0; side < segments; side += 1) {
      const angle = (side / segments) * Math.PI * 2;
      const vertex = center.clone()
        .addScaledVector(lateral, Math.cos(angle) * lateralExtent)
        .addScaledVector(depth, Math.sin(angle) * depthExtent);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(side / segments, uvV);
    }
  };
  for (let tailRing = 0; tailRing < tailRingCount; tailRing += 1) {
    const localProgress = (tailRing + 1) / tailRingCount;
    const progress = THREE.MathUtils.lerp(0, tailEnd, localProgress);
    const transition = THREE.MathUtils.smoothstep(localProgress, 0, 0.32);
    const center = crownCenter.clone().lerp(tailCurve.getPoint(progress), transition);
    const tangent = tailCurve.getTangent(progress).normalize();
    const curvedLateral = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const curvedDepth = new THREE.Vector3().crossVectors(tangent, curvedLateral).normalize();
    const lateral = new THREE.Vector3(1, 0, 0).lerp(curvedLateral, transition).normalize();
    const depth = new THREE.Vector3(0, 0, 1).lerp(curvedDepth, transition).normalize();
    const envelope = THREE.MathUtils.lerp(crownRoot.radius, resolveHoodTailEnvelope(progress), transition);
    const broadFold = quality === 'high'
      ? 1 + Math.sin(progress * Math.PI * 5.2 + 0.35) * 0.025 * Math.sin(progress * Math.PI)
      : 1;
    const radius = envelope * broadFold;
    appendTailRing(
      center,
      lateral,
      depth,
      radius * THREE.MathUtils.lerp(1, 1.15, transition),
      radius * THREE.MathUtils.lerp(crownRoot.depthScale, 0.78, transition),
      -progress,
    );
  }
  for (let side = 0; side < segments; side += 1) {
    const nextSide = (side + 1) % segments;
    indices.push(
      side,
      tailVertexStart + side,
      nextSide,
      nextSide,
      tailVertexStart + side,
      tailVertexStart + nextSide,
    );
  }
  const totalTailRings = tailRingCount;
  for (let tailRing = 0; tailRing < totalTailRings - 1; tailRing += 1) {
    for (let side = 0; side < segments; side += 1) {
      const nextSide = (side + 1) % segments;
      const current = tailVertexStart + tailRing * segments + side;
      const currentNext = tailVertexStart + tailRing * segments + nextSide;
      const next = tailVertexStart + (tailRing + 1) * segments + side;
      const nextNext = tailVertexStart + (tailRing + 1) * segments + nextSide;
      indices.push(current, next, currentNext, currentNext, next, nextNext);
    }
  }
  const tailTip = tailCurve.getPoint(1);
  const tailTipIndex = positions.length / 3;
  positions.push(tailTip.x, tailTip.y, tailTip.z);
  uvs.push(0.5, -1);
  const lastTailRingStart = tailVertexStart + (totalTailRings - 1) * segments;
  for (let side = 0; side < segments; side += 1) {
    const nextSide = (side + 1) % segments;
    indices.push(tailTipIndex, lastTailRingStart + side, lastTailRingStart + nextSide);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function resolveHoodBrimPoint(radialProgress: number, angle: number, underside = false) {
  const lateral = Math.cos(angle);
  const foreAft = Math.sin(angle);
  const xRadius = THREE.MathUtils.lerp(0.63, 1.18, radialProgress);
  const zRadius = THREE.MathUtils.lerp(0.55, 0.9, radialProgress);
  const edgeWeight = Math.pow(radialProgress, 1.25);
  const sideSag = Math.pow(Math.abs(lateral), 1.55) * (0.04 + edgeWeight * 0.17);
  const softWave = Math.sin(angle * 2 - 0.55) * 0.034 * edgeWeight;
  const frontLift = foreAft * 0.065 * edgeWeight;
  const rearWeight = Math.pow(Math.max(0, -foreAft), 1.5) * 0.052 * edgeWeight;
  const topY = THREE.MathUtils.lerp(0.4, 0.14, radialProgress) - sideSag + softWave + frontLift - rearWeight;
  const thickness = THREE.MathUtils.lerp(0.078, 0.058, radialProgress);
  return new THREE.Vector3(
    xRadius * lateral,
    topY - (underside ? thickness : 0),
    zRadius * foreAft,
  );
}

function createHoodBrimSurfaceGeometry(quality: CaretakerQuality, underside: boolean) {
  const segments = quality === 'high' ? 32 : 16;
  const radialRings = quality === 'high' ? 4 : 3;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let radialRing = 0; radialRing < radialRings; radialRing += 1) {
    const radialProgress = radialRing / (radialRings - 1);
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const point = resolveHoodBrimPoint(radialProgress, angle, underside);
      positions.push(point.x, point.y, point.z);
      uvs.push(segment / segments, radialProgress);
    }
  }
  for (let radialRing = 0; radialRing < radialRings - 1; radialRing += 1) {
    for (let segment = 0; segment < segments; segment += 1) {
      const nextSegment = (segment + 1) % segments;
      const current = radialRing * segments + segment;
      const currentSide = radialRing * segments + nextSegment;
      const next = (radialRing + 1) * segments + segment;
      const nextSide = (radialRing + 1) * segments + nextSegment;
      if (underside) indices.push(current, next, currentSide, currentSide, next, nextSide);
      else indices.push(current, currentSide, next, currentSide, nextSide, next);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createHoodBrimWallGeometry(quality: CaretakerQuality, radialProgress: 0 | 1) {
  const segments = quality === 'high' ? 32 : 16;
  const points: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let segment = 0; segment < segments; segment += 1) {
    const angle = (segment / segments) * Math.PI * 2;
    for (const underside of [false, true]) {
      const point = resolveHoodBrimPoint(radialProgress, angle, underside);
      points.push(point.x, point.y, point.z);
      uvs.push(segment / segments, underside ? 1 : 0);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    const nextSegment = (segment + 1) % segments;
    const top = segment * 2;
    const bottom = top + 1;
    const nextTop = nextSegment * 2;
    const nextBottom = nextTop + 1;
    if (radialProgress === 1) indices.push(top, bottom, nextTop, nextTop, bottom, nextBottom);
    else indices.push(top, nextTop, bottom, nextTop, nextBottom, bottom);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createHoodBrimInsetGeometry(quality: CaretakerQuality) {
  const segments = quality === 'high' ? 32 : 16;
  const innerProgress = 0.54;
  const outerProgress = 0.86;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (const radialProgress of [innerProgress, outerProgress]) {
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      const point = resolveHoodBrimPoint(radialProgress, angle, false);
      point.y += 0.006;
      positions.push(point.x, point.y, point.z);
      uvs.push(segment / segments, radialProgress === innerProgress ? 0 : 1);
    }
  }
  for (let segment = 0; segment < segments; segment += 1) {
    const nextSegment = (segment + 1) % segments;
    indices.push(segment, nextSegment, segments + segment, nextSegment, segments + nextSegment, segments + segment);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createHoodEdgeTrimGeometry(quality: CaretakerQuality) {
  const segments = quality === 'high' ? 24 : 12;
  const points = Array.from({ length: segments }, (_, index) => (
    resolveHoodBrimPoint(1, (index / segments) * Math.PI * 2, false)
  ));
  const curve = new THREE.CatmullRomCurve3(points, true, 'centripetal');
  return new THREE.TubeGeometry(
    curve,
    quality === 'high' ? 48 : 24,
    quality === 'high' ? 0.022 : 0.019,
    quality === 'high' ? 4 : 3,
    true,
  );
}

function createHoodSeamBandGeometry(quality: CaretakerQuality) {
  const segments = quality === 'high' ? 24 : 12;
  const baseRing = HOOD_CROWN_RINGS[HOOD_CROWN_RINGS.length - 1];
  const points = Array.from({ length: segments }, (_, index) => (
    resolveHoodCrownPoint(baseRing, (index / segments) * Math.PI * 2, 1)
  ));
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, true, 'centripetal'),
    quality === 'high' ? 36 : 20,
    quality === 'high' ? 0.018 : 0.016,
    3,
    true,
  );
}

function createWrappedRobeGeometry(radialSegments: number) {
  const geometry = new THREE.LatheGeometry([
    new THREE.Vector2(0.5, 0.08),
    new THREE.Vector2(0.54, 0.28),
    new THREE.Vector2(0.52, 0.7),
    new THREE.Vector2(0.48, 1.08),
    new THREE.Vector2(0.44, 1.34),
    new THREE.Vector2(0.4, 1.48),
  ], radialSegments);
  const positions = geometry.getAttribute('position') as THREE.BufferAttribute;
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index);
    const y = positions.getY(index);
    const z = positions.getZ(index);
    const angle = Math.atan2(z, x);
    const drape = THREE.MathUtils.smoothstep(y, 0.03, 1.5);
    const fold = Math.cos(angle * 8) * 0.025 * drape;
    const radius = Math.hypot(x, z);
    const adjusted = radius + fold;
    positions.setXYZ(index, Math.cos(angle) * adjusted, y, Math.sin(angle) * adjusted * 0.74);
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  return geometry;
}

function resolveCapeYokePoint(horizontal: number, vertical: number, depthOffset = 0): [number, number, number] {
  const x = THREE.MathUtils.lerp(-0.52, 0.52, horizontal);
  const edgeProgress = Math.min(1, Math.abs(x) / 0.52);
  const topY = 1.86 + Math.cos(edgeProgress * Math.PI * 0.5) * 0.055 - edgeProgress * 0.045;
  const pointedBottom = 1.67 - Math.pow(1 - edgeProgress, 1.45) * 0.22;
  const y = THREE.MathUtils.lerp(topY, pointedBottom, vertical);
  const shoulderWrap = Math.pow(edgeProgress, 1.55) * 0.19;
  const clothCrown = Math.sin(vertical * Math.PI) * (0.024 + edgeProgress * 0.012);
  const z = -0.735 + shoulderWrap + clothCrown + depthOffset;
  return [x, y, z];
}

function createCapeYokeShellGeometry(quality: CaretakerQuality) {
  const columns = quality === 'high' ? 11 : 7;
  const rows = quality === 'high' ? 5 : 4;
  const depth = quality === 'high' ? 0.065 : 0.055;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;
  for (let sheet = 0; sheet < 2; sheet += 1) {
    const depthOffset = sheet === 0 ? -depth / 2 : depth / 2;
    for (let row = 0; row < rows; row += 1) {
      const vertical = row / (rows - 1);
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        positions.push(...resolveCapeYokePoint(horizontal, vertical, depthOffset));
        uvs.push(horizontal, 1 - vertical);
      }
    }
  }
  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
    }
  }
  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function createCapeYokeTrimGeometry(quality: CaretakerQuality) {
  const count = quality === 'high' ? 13 : 7;
  const points = Array.from({ length: count }, (_, index) => (
    new THREE.Vector3(...resolveCapeYokePoint(index / (count - 1), 1, -0.04))
  ));
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    quality === 'high' ? 36 : 18,
    0.022,
    quality === 'high' ? 6 : 4,
    false,
  );
}

function createCapeYokeTideGeometry(quality: CaretakerQuality) {
  const count = quality === 'high' ? 17 : 9;
  const points = Array.from({ length: count }, (_, index) => {
    const progress = index / (count - 1);
    const wave = Math.sin(progress * Math.PI * 4) * 0.045;
    const vertical = THREE.MathUtils.clamp(0.73 + wave, 0.64, 0.82);
    return new THREE.Vector3(...resolveCapeYokePoint(progress, vertical, -0.042));
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    quality === 'high' ? 30 : 10,
    quality === 'high' ? 0.014 : 0.016,
    quality === 'high' ? 4 : 3,
    false,
  );
}

function resolveRearMantleLeafPoint(side: -1 | 1, horizontal: number, vertical: number): [number, number, number] {
  const eased = horizontal * horizontal * (3 - 2 * horizontal);
  const innerX = THREE.MathUtils.lerp(0.08, 0.14, vertical);
  const outerX = THREE.MathUtils.lerp(0.72, 0.9, vertical);
  const x = side * THREE.MathUtils.lerp(innerX, outerX, eased);
  const topY = 1.81 - horizontal * 0.13 + Math.sin(horizontal * Math.PI) * 0.055;
  const bottomY = 1.49 - horizontal * 0.15 - Math.sin(horizontal * Math.PI) * 0.055;
  const y = THREE.MathUtils.lerp(topY, bottomY, vertical);
  // The leaf is sewn into the rear yoke, then cups around the shoulder. This
  // depth progression keeps it readable as draped cloth from rear, profile,
  // and three-quarter cameras instead of as a flat horizontal badge.
  const shoulderWrap = Math.pow(horizontal, 1.35) * 0.22;
  const fabricCrown = Math.sin(horizontal * Math.PI) * (0.045 - vertical * 0.02);
  const z = -0.72 + shoulderWrap + fabricCrown;
  return [x, y, z];
}

function createRearMantleLeafGeometry(side: -1 | 1, quality: CaretakerQuality) {
  const columns = quality === 'high' ? 8 : 5;
  const rows = quality === 'high' ? 5 : 3;
  const depth = quality === 'high' ? 0.075 : 0.055;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const sheetSize = columns * rows;

  for (let sheet = 0; sheet < 2; sheet += 1) {
    const thickness = sheet === 0 ? -depth / 2 : depth / 2;
    for (let row = 0; row < rows; row += 1) {
      const vertical = row / (rows - 1);
      for (let column = 0; column < columns; column += 1) {
        const horizontal = column / (columns - 1);
        const [x, y, z] = resolveRearMantleLeafPoint(side, horizontal, vertical);
        positions.push(x, y, z + thickness);
        uvs.push(horizontal, 1 - vertical);
      }
    }
  }

  for (let row = 0; row < rows - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + 1;
      const c = a + columns;
      const d = c + 1;
      indices.push(a, c, b, b, c, d);
      indices.push(sheetSize + a, sheetSize + b, sheetSize + c, sheetSize + b, sheetSize + d, sheetSize + c);
    }
  }

  const perimeter: number[] = [];
  for (let column = 0; column < columns; column += 1) perimeter.push(column);
  for (let row = 1; row < rows; row += 1) perimeter.push(row * columns + columns - 1);
  for (let column = columns - 2; column >= 0; column -= 1) perimeter.push((rows - 1) * columns + column);
  for (let row = rows - 2; row > 0; row -= 1) perimeter.push(row * columns);
  for (let index = 0; index < perimeter.length; index += 1) {
    const current = perimeter[index];
    const next = perimeter[(index + 1) % perimeter.length];
    indices.push(current, sheetSize + current, next, next, sheetSize + current, sheetSize + next);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function createRearMantleLeafTrimGeometry(side: -1 | 1, quality: CaretakerQuality) {
  const segments = quality === 'high' ? 12 : 7;
  const points = Array.from({ length: segments }, (_, index) => {
    const horizontal = index / (segments - 1);
    const [x, y, z] = resolveRearMantleLeafPoint(side, horizontal, 1);
    return new THREE.Vector3(x, y, z + 0.055);
  });
  return new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points, false, 'centripetal'),
    quality === 'high' ? 40 : 20,
    0.017,
    quality === 'high' ? 6 : 4,
    false,
  );
}

function createRoundedHoodCrownGeometry(radialSegments: number) {
  const profile = [
    new THREE.Vector2(0.74, -0.5),
    new THREE.Vector2(0.73, -0.39),
    new THREE.Vector2(0.69, -0.18),
    new THREE.Vector2(0.6, 0.08),
    new THREE.Vector2(0.47, 0.31),
    new THREE.Vector2(0.31, 0.49),
    new THREE.Vector2(0.17, 0.59),
  ];
  return new THREE.LatheGeometry(profile, radialSegments);
}

const HOOD_TAIL_CURVE_POINTS = [
  new THREE.Vector3(-0.33, 1.65, -0.18),
  new THREE.Vector3(-0.44, 1.72, -0.28),
  new THREE.Vector3(-0.57, 1.67, -0.4),
  new THREE.Vector3(-0.69, 1.55, -0.51),
  new THREE.Vector3(-0.78, 1.34, -0.58),
  new THREE.Vector3(-0.88, 1.22, -0.72),
  new THREE.Vector3(-0.96, 0.98, -0.9),
  new THREE.Vector3(-0.98, 0.8, -0.98),
] as const;

function createHoodTailCurve() {
  return new THREE.CatmullRomCurve3(HOOD_TAIL_CURVE_POINTS.map((point) => point.clone()));
}

function createHoodTailRootBridgeGeometry(quality: CaretakerQuality) {
  const segments = quality === 'high' ? 10 : 6;
  const bridgeRings = 5;
  const curve = createHoodTailCurve();
  // Begin on the actual crown aperture. The first capped bridge ring slightly
  // overlaps the crown perimeter to hide the unlike ring counts, then blends
  // into the tail without a collar, socket, or separate closure lump.
  const crownRing = HOOD_CROWN_RINGS[0];
  const crownCenter = new THREE.Vector3(crownRing.centerX, crownRing.y, crownRing.centerZ);
  crownCenter.y -= 0.008;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < bridgeRings; ring += 1) {
    const blend = ring / (bridgeRings - 1);
    const tailProgress = blend * 0.1;
    const tailCenter = curve.getPoint(tailProgress);
    const center = crownCenter.clone().lerp(tailCenter, blend);
    const tangent = curve.getTangent(Math.max(0.001, tailProgress)).normalize();
    const tailLateral = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const tailDepth = new THREE.Vector3().crossVectors(tangent, tailLateral).normalize();
    const lateralAxis = new THREE.Vector3(1, 0, 0).lerp(tailLateral, blend).normalize();
    const depthAxis = new THREE.Vector3(0, 0, 1).lerp(tailDepth, blend).normalize();
    const envelope = THREE.MathUtils.lerp(crownRing.radius, resolveHoodTailEnvelope(tailProgress), blend);
    const rootOverlap = THREE.MathUtils.lerp(
      quality === 'high' ? 1.06 : 1.16,
      1,
      THREE.MathUtils.smoothstep(blend, 0, 0.5),
    );
    const lateralExtent = envelope * THREE.MathUtils.lerp(1, 1.15, blend) * rootOverlap;
    const depthExtent = envelope * THREE.MathUtils.lerp(crownRing.depthScale, 0.78, blend) * rootOverlap;
    for (let side = 0; side < segments; side += 1) {
      const angle = (side / segments) * Math.PI * 2;
      const vertex = center.clone()
        .addScaledVector(lateralAxis, Math.cos(angle) * lateralExtent)
        .addScaledVector(depthAxis, Math.sin(angle) * depthExtent);
      positions.push(vertex.x, vertex.y, vertex.z);
      uvs.push(side / segments, blend);
    }
  }
  for (let ring = 0; ring < bridgeRings - 1; ring += 1) {
    for (let side = 0; side < segments; side += 1) {
      const nextSide = (side + 1) % segments;
      const current = ring * segments + side;
      const currentNext = ring * segments + nextSide;
      const next = (ring + 1) * segments + side;
      const nextNext = (ring + 1) * segments + nextSide;
      indices.push(current, next, currentNext, currentNext, next, nextNext);
    }
  }
  // Close the bridge inside the overlapping tail, not across the visible
  // crown aperture. A shallow cloth tunnel reads as a continuous fold; a cap
  // at the crown rim reads as a dark socket from front and three-quarter views.
  const innerFoldCenterIndex = positions.length / 3;
  const bridgeEndCenter = curve.getPoint(0.1);
  positions.push(bridgeEndCenter.x, bridgeEndCenter.y, bridgeEndCenter.z);
  uvs.push(0.5, 1);
  const lastBridgeRingStart = (bridgeRings - 1) * segments;
  for (let side = 0; side < segments; side += 1) {
    const nextSide = (side + 1) % segments;
    indices.push(innerFoldCenterIndex, lastBridgeRingStart + side, lastBridgeRingStart + nextSide);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function resolveHoodTailEnvelope(progress: number) {
  const base = progress < 0.16
    ? THREE.MathUtils.lerp(0.182, 0.208, progress / 0.16)
    : THREE.MathUtils.lerp(0.208, 0.038, Math.pow((progress - 0.16) / 0.84, 0.78));
  const compression = 1
    + Math.exp(-Math.pow((progress - 0.2) / 0.09, 2)) * 0.25
    - Math.exp(-Math.pow((progress - 0.34) / 0.065, 2)) * 0.29
    + Math.exp(-Math.pow((progress - 0.47) / 0.09, 2)) * 0.22
    - Math.exp(-Math.pow((progress - 0.63) / 0.07, 2)) * 0.24
    + Math.exp(-Math.pow((progress - 0.76) / 0.08, 2)) * 0.16;
  return base * compression;
}

function createTaperedHoodTailGeometry(quality: CaretakerQuality) {
  const curve = createHoodTailCurve();
  // Begin slightly inside the bridge so separate compacted meshes cannot
  // expose a dark coincident-boundary seam at oblique phone angles.
  const startProgress = 0.075;
  const ringCount = quality === 'high' ? 28 : 12;
  const radialSegments = quality === 'high' ? 10 : 6;
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  for (let ring = 0; ring < ringCount; ring += 1) {
    const localProgress = ring / (ringCount - 1);
    const progress = THREE.MathUtils.lerp(startProgress, 1, localProgress);
    const center = curve.getPoint(progress);
    const tangent = curve.getTangent(progress).normalize();
    const lateral = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const depth = new THREE.Vector3().crossVectors(tangent, lateral).normalize();
    const envelope = resolveHoodTailEnvelope(progress);
    const broadFold = quality === 'high'
      ? 1 + Math.sin(progress * Math.PI * 5.2 + 0.35) * 0.025 * Math.sin(progress * Math.PI)
      : 1;
    const radius = envelope * broadFold;
    for (let side = 0; side < radialSegments; side += 1) {
      const angle = (side / radialSegments) * Math.PI * 2;
      const lateralExtent = radius * 1.15;
      const depthExtent = radius * 0.78;
      const offset = lateral.clone().multiplyScalar(Math.cos(angle) * lateralExtent)
        .addScaledVector(depth, Math.sin(angle) * depthExtent);
      const normal = lateral.clone().multiplyScalar(Math.cos(angle) / Math.max(0.001, lateralExtent))
        .addScaledVector(depth, Math.sin(angle) / Math.max(0.001, depthExtent))
        .normalize();
      const vertex = center.clone().add(offset);
      positions.push(vertex.x, vertex.y, vertex.z);
      normals.push(normal.x, normal.y, normal.z);
      uvs.push(side / radialSegments, localProgress);
    }
  }
  for (let ring = 0; ring < ringCount - 1; ring += 1) {
    for (let side = 0; side < radialSegments; side += 1) {
      const nextSide = (side + 1) % radialSegments;
      const current = ring * radialSegments + side;
      const currentNext = ring * radialSegments + nextSide;
      const next = (ring + 1) * radialSegments + side;
      const nextNext = (ring + 1) * radialSegments + nextSide;
      indices.push(current, next, currentNext, currentNext, next, nextNext);
    }
  }
  // Seal the tail's own root inside the crown overlap. Without this fan, the
  // otherwise-correct curved tube exposes a dark polygonal aperture whenever
  // the camera can see along its tangent.
  // Pull the closure point forward along the cloth path so the seal is a
  // shallow convex fold, not a flat dark disk aimed at the camera.
  const rootCenter = curve.getPoint(0.025);
  const rootCenterIndex = positions.length / 3;
  const rootTangent = curve.getTangent(startProgress).normalize().multiplyScalar(-1);
  positions.push(rootCenter.x, rootCenter.y, rootCenter.z);
  normals.push(rootTangent.x, rootTangent.y, rootTangent.z);
  uvs.push(0.5, 0);
  for (let side = 0; side < radialSegments; side += 1) {
    const nextSide = (side + 1) % radialSegments;
    indices.push(rootCenterIndex, nextSide, side);
  }
  const tipCenter = curve.getPoint(1);
  const tipTangent = curve.getTangent(1).normalize();
  const tipCenterIndex = positions.length / 3;
  positions.push(tipCenter.x, tipCenter.y, tipCenter.z);
  normals.push(tipTangent.x, tipTangent.y, tipTangent.z);
  uvs.push(0.5, 1);
  const lastRingStart = (ringCount - 1) * radialSegments;
  for (let side = 0; side < radialSegments; side += 1) {
    const nextSide = (side + 1) % radialSegments;
    indices.push(tipCenterIndex, lastRingStart + side, lastRingStart + nextSide);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function resolveHoodTailTipPosition() {
  return createHoodTailCurve().getPoint(1);
}

function createShadowFaceGeometry(quality: CaretakerQuality) {
  // The reference never reveals a spherical head. It reads as a deep hood
  // cavity whose silhouette is owned by the brim and raised cowl. A tapered,
  // closed shadow volume preserves that ambiguity from front and orbit views
  // without exposing the contour of a black ball beneath the hat.
  const shape = new THREE.Shape();
  shape.moveTo(-0.54, 0.12);
  shape.quadraticCurveTo(-0.52, -0.14, -0.31, -0.32);
  shape.quadraticCurveTo(-0.16, -0.41, 0, -0.42);
  shape.quadraticCurveTo(0.16, -0.41, 0.31, -0.32);
  shape.quadraticCurveTo(0.52, -0.14, 0.54, 0.12);
  shape.quadraticCurveTo(0.27, 0.19, 0, 0.17);
  shape.quadraticCurveTo(-0.27, 0.19, -0.54, 0.12);
  shape.closePath();
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: quality === 'high' ? 0.19 : 0.15,
    steps: 1,
    // The board-view cavity is a tiny silhouette; three curve subdivisions
    // retain its taper while avoiding invisible low-LOD tessellation.
    curveSegments: quality === 'high' ? 10 : 3,
    bevelEnabled: quality === 'high',
    bevelSegments: 1,
    bevelSize: 0.018,
    bevelThickness: 0.014,
  });
  geometry.translate(0, 0, quality === 'high' ? -0.095 : -0.075);
  geometry.computeVertexNormals();
  return geometry;
}

function resolveHoodFrontSurfacePoint(x: number, y: number) {
  let lower = HOOD_CROWN_RINGS[HOOD_CROWN_RINGS.length - 1];
  let upper = HOOD_CROWN_RINGS[0];
  for (let index = 0; index < HOOD_CROWN_RINGS.length - 1; index += 1) {
    const first = HOOD_CROWN_RINGS[index];
    const second = HOOD_CROWN_RINGS[index + 1];
    if (y <= first.y && y >= second.y) {
      upper = first;
      lower = second;
      break;
    }
  }
  const span = Math.max(0.001, upper.y - lower.y);
  const blend = THREE.MathUtils.clamp((y - lower.y) / span, 0, 1);
  const radius = THREE.MathUtils.lerp(lower.radius, upper.radius, blend);
  const centerX = THREE.MathUtils.lerp(lower.centerX, upper.centerX, blend);
  const centerZ = THREE.MathUtils.lerp(lower.centerZ, upper.centerZ, blend);
  const depthScale = THREE.MathUtils.lerp(lower.depthScale, upper.depthScale, blend);
  const foreTilt = THREE.MathUtils.lerp(lower.foreTilt, upper.foreTilt, blend);
  const lateral = THREE.MathUtils.clamp((x - centerX) / Math.max(0.001, radius), -0.98, 0.98);
  const z = centerZ + Math.sqrt(Math.max(0.02, 1 - lateral * lateral)) * radius * depthScale + foreTilt + 0.012;
  return [x, y, z] as const;
}

function createHoodTideStroke(
  originX: number,
  originY: number,
  direction: -1 | 1,
  scale: number,
) {
  const planar = [
    [originX, originY],
    [originX + direction * 0.07 * scale, originY + 0.055 * scale],
    [originX + direction * 0.15 * scale, originY + 0.035 * scale],
    [originX + direction * 0.19 * scale, originY - 0.035 * scale],
    [originX + direction * 0.13 * scale, originY - 0.1 * scale],
    [originX + direction * 0.045 * scale, originY - 0.08 * scale],
  ] as const;
  return createFiligreeStrokeGeometry(
    planar.map(([x, y]) => resolveHoodFrontSurfacePoint(x, y)),
    0.008,
    20,
  );
}

function addHoodSurfaceEmbroidery(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  quality: CaretakerQuality,
) {
  if (quality !== 'high') return;
  const loopSegments = 24;
  const addBrimWave = (
    radialProgress: number,
    waveCount: number,
    phase: number,
    radius: number,
    material: THREE.Material,
    name: string,
  ) => {
    const points = Array.from({ length: loopSegments }, (_, index) => {
      const angle = (index / loopSegments) * Math.PI * 2;
      const point = resolveHoodBrimPoint(radialProgress, angle, false);
      point.y += 0.018 + Math.sin(angle * waveCount + phase) * 0.028;
      return point;
    });
    parent.add(mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points, true, 'centripetal'),
        36,
        radius,
        3,
        true,
      ),
      material,
      name,
      false,
    ));
  };
  addBrimWave(0.72, 4, 0.25, 0.012, materials.gold, 'CARETAKER_OUTFIT_HOOD_BRIM_GOLD_TIDE');
  addBrimWave(0.56, 4, Math.PI + 0.25, 0.01, materials.accent, 'CARETAKER_OUTFIT_HOOD_BRIM_CYAN_TIDE');

  for (let motif = 0; motif < 8; motif += 1) {
      const centerAngle = (motif / 8) * Math.PI * 2;
      const points = Array.from({ length: 7 }, (_, index) => {
        const progress = index / 6;
        const angle = centerAngle + THREE.MathUtils.lerp(-0.22, 0.22, progress);
        const radialProgress = 0.68
          + Math.sin(progress * Math.PI) * 0.13
          + Math.sin(progress * Math.PI * 2) * 0.025;
        const point = resolveHoodBrimPoint(radialProgress, angle, false);
        point.y += 0.019 + Math.sin(progress * Math.PI) * 0.018;
        return point;
      });
      parent.add(mesh(
        createFiligreeStrokeGeometry(points.map((point) => [point.x, point.y, point.z]), 0.009, 10, 3),
        motif % 2 === 0 ? materials.gold : materials.accent,
        `CARETAKER_OUTFIT_HOOD_BRIM_SCROLL_${motif}`,
        false,
      ));
  }
}

function addHoodCrestFiligree(parent: THREE.Object3D, materials: CaretakerMaterials, quality: CaretakerQuality) {
  if (quality !== 'high') return;
  parent.add(mesh(
    createHoodSeamBandGeometry(quality),
    materials.gold,
    'CARETAKER_OUTFIT_HOOD_CROWN_BOTANICAL_BAND',
    false,
  ));
  for (const side of [-1, 1] as const) {
    const surfaceStroke = (planar: ReadonlyArray<readonly [number, number]>, name: string, accent = false) => {
      const points = planar.map(([x, y]) => resolveHoodFrontSurfacePoint(x * side, y));
      parent.add(mesh(
        createFiligreeStrokeGeometry(points, accent ? 0.01 : 0.014, 12, 3),
        accent ? materials.accent : materials.gold,
        name,
        false,
      ));
    };
    surfaceStroke([[0.18, 0.46], [0.3, 0.5], [0.43, 0.58], [0.58, 0.57]], `CARETAKER_OUTFIT_HOOD_CREST_BRANCH_${side}_MAIN`);
    surfaceStroke([[0.32, 0.51], [0.36, 0.62], [0.34, 0.7]], `CARETAKER_OUTFIT_HOOD_CREST_BRANCH_${side}_UPPER`);
    surfaceStroke(
      [[0.14, 0.78], [0.23, 0.92], [0.2, 1.08], [0.09, 1.21]],
      `CARETAKER_OUTFIT_HOOD_CROWN_VINE_${side}`,
    );
  }
  const tailCurve = createHoodTailCurve();
  const tailVine = Array.from({ length: 9 }, (_, index) => {
    const progress = THREE.MathUtils.lerp(0.24, 0.78, index / 8);
    const center = tailCurve.getPoint(progress);
    const tangent = tailCurve.getTangent(progress).normalize();
    const lateral = new THREE.Vector3(-tangent.y, tangent.x, 0).normalize();
    const depth = new THREE.Vector3().crossVectors(tangent, lateral).normalize();
    const angle = THREE.MathUtils.lerp(0.35, 1.25, index / 8);
    const radius = resolveHoodTailEnvelope(progress) + 0.012;
    return center
      .addScaledVector(lateral, Math.cos(angle) * radius * 1.15)
      .addScaledVector(depth, Math.sin(angle) * radius * 0.78);
  });
  parent.add(mesh(
    createFiligreeStrokeGeometry(tailVine.map((point) => [point.x, point.y, point.z]), 0.011, 16, 3),
    materials.gold,
    'CARETAKER_OUTFIT_HOOD_TAIL_VINE',
    false,
  ));
}

function addHoodCrownCrest(parent: THREE.Object3D, materials: CaretakerMaterials) {
  const crest = new THREE.Group();
  crest.name = 'CARETAKER_OUTFIT_HOOD_CROWN_CREST';
  crest.position.set(0, 0.43, 0.72);
  crest.scale.setScalar(0.88);
  const crystal = mesh(new THREE.OctahedronGeometry(0.19, 0), materials.crystal, 'CARETAKER_OUTFIT_HOOD_CREST_CRYSTAL');
  crystal.scale.set(0.72, 1.26, 0.62);
  crystal.position.z = 0.04;
  const frame = mesh(createDiamondFrameGeometry(0.19, 0.29, 0.04), materials.gold, 'CARETAKER_OUTFIT_HOOD_CREST_FRAME');
  for (const [index, x] of [-0.18, 0, 0.18].entries()) {
    const finial = mesh(new THREE.ConeGeometry(0.035, index === 1 ? 0.28 : 0.2, 6), materials.gold, `CARETAKER_OUTFIT_HOOD_CREST_FINIAL_${index}`);
    finial.position.set(index === 1 ? x : x * 1.2, index === 1 ? 0.25 : 0.17, -0.015);
    crest.add(finial);
  }
  for (const [index, x] of [-0.3, 0.3].entries()) {
    const pearl = mesh(new THREE.SphereGeometry(0.042, 8, 6), materials.pearl, `CARETAKER_OUTFIT_HOOD_CREST_PEARL_${index}`);
    pearl.position.set(x, 0.015, 0.015);
    crest.add(pearl);
  }
  const dropPearl = mesh(new THREE.SphereGeometry(0.038, 8, 6), materials.pearl, 'CARETAKER_OUTFIT_HOOD_CREST_DROP_PEARL');
  // Keep the crest drop seated on the hat face. Hanging it below the brim
  // places a bright third dot inside the anonymous face cavity.
  dropPearl.position.set(0, -0.245, 0.02);
  crest.add(crystal, frame, dropPearl);
  parent.add(crest);
}

function createDiamondFrameGeometry(width: number, height: number, depth: number) {
  const shape = new THREE.Shape();
  shape.moveTo(0, height);
  shape.lineTo(width, 0);
  shape.lineTo(0, -height);
  shape.lineTo(-width, 0);
  shape.closePath();
  const hole = new THREE.Path();
  hole.moveTo(0, height * 0.72);
  hole.lineTo(-width * 0.72, 0);
  hole.lineTo(0, -height * 0.72);
  hole.lineTo(width * 0.72, 0);
  hole.closePath();
  shape.holes.push(hole);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    steps: 1,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.012,
    bevelThickness: 0.01,
  });
  geometry.translate(0, 0, -depth / 2);
  return geometry;
}

function addFrontGarmentLayers(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  _quality: CaretakerQuality,
) {
  const coatZ = 0.62;

  const leftCoat = mesh(createTailoredFrontPanelGeometry(-1, 'coat', 0.09), materials.cloth, 'CARETAKER_OUTFIT_COAT_FRONT_LEFT');
  const rightCoat = mesh(createTailoredFrontPanelGeometry(1, 'coat', 0.09), materials.cloth, 'CARETAKER_OUTFIT_COAT_FRONT_RIGHT');
  leftCoat.position.z = coatZ;
  rightCoat.position.z = coatZ;
  parent.add(leftCoat, rightCoat);

  addCurvedFrontCoatTrim(parent, materials, [-0.16, 1.46], [-0.3, 0.03], coatZ, 0.02, 'CARETAKER_OUTFIT_FRONT_TRIM_LEFT_INNER');
  addCurvedFrontCoatTrim(parent, materials, [0.16, 1.46], [0.3, 0.03], coatZ, 0.02, 'CARETAKER_OUTFIT_FRONT_TRIM_RIGHT_INNER');
  addCurvedFrontCoatTrim(parent, materials, [-0.61, 1.28], [-0.84, 0.04], coatZ, 0.02, 'CARETAKER_OUTFIT_FRONT_TRIM_LEFT_OUTER');
  addCurvedFrontCoatTrim(parent, materials, [0.61, 1.28], [0.84, 0.04], coatZ, 0.02, 'CARETAKER_OUTFIT_FRONT_TRIM_RIGHT_OUTER');
  addCurvedFrontCoatTrim(parent, materials, [-0.84, 0.04], [-0.63, -0.11], coatZ, 0.019, 'CARETAKER_OUTFIT_COAT_HEM_LEFT_A');
  addCurvedFrontCoatTrim(parent, materials, [-0.63, -0.11], [-0.3, 0.02], coatZ, 0.019, 'CARETAKER_OUTFIT_COAT_HEM_LEFT_B');
  addCurvedFrontCoatTrim(parent, materials, [0.84, 0.04], [0.63, -0.11], coatZ, 0.019, 'CARETAKER_OUTFIT_COAT_HEM_RIGHT_A');
  addCurvedFrontCoatTrim(parent, materials, [0.63, -0.11], [0.3, 0.02], coatZ, 0.019, 'CARETAKER_OUTFIT_COAT_HEM_RIGHT_B');

}

const CARETAKER_COWL = {
  centerZ: 0.38,
  lowerY: -0.34,
  upperY: 0.03,
  lowerRadius: 0.43,
  upperRadius: 0.56,
  thickness: 0.06,
  lowerGap: 0.12,
  upperGap: 0.92,
} as const;

type CaretakerCowlSurface = 'outer' | 'lining' | 'caps';

function resolveCowlPoint(
  vertical: number,
  around: number,
  radialInset = 0,
): [number, number, number] {
  const gap = THREE.MathUtils.lerp(CARETAKER_COWL.lowerGap, CARETAKER_COWL.upperGap, vertical);
  const angle = THREE.MathUtils.lerp(gap, Math.PI * 2 - gap, around);
  const radius = THREE.MathUtils.lerp(CARETAKER_COWL.lowerRadius, CARETAKER_COWL.upperRadius, vertical) - radialInset;
  return [
    Math.sin(angle) * radius,
    THREE.MathUtils.lerp(CARETAKER_COWL.lowerY, CARETAKER_COWL.upperY, vertical),
    CARETAKER_COWL.centerZ + Math.cos(angle) * radius,
  ];
}

/**
 * Builds the standing neck cowl as an open annular shell. Its angular opening
 * widens toward the brim, so the front edges form a real spatial V while the
 * same surface remains continuous around both cheeks, the sides and the rear.
 */
function createStandingCowlGeometry(
  quality: CaretakerQuality,
  surface: CaretakerCowlSurface,
) {
  // Thirty by four keeps the curved phone silhouette smooth while reserving
  // close-up triangles for the identity-defining hat and face treatment.
  const columns = quality === 'high' ? 30 : 14;
  const rows = quality === 'high' ? 4 : 2;
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const addVertex = (point: readonly [number, number, number], u: number, v: number) => {
    positions.push(...point);
    uvs.push(u, v);
    return positions.length / 3 - 1;
  };
  const addQuad = (
    a: readonly [number, number, number],
    b: readonly [number, number, number],
    c: readonly [number, number, number],
    d: readonly [number, number, number],
    reverse = false,
  ) => {
    const base = positions.length / 3;
    addVertex(a, 0, 0);
    addVertex(b, 1, 0);
    addVertex(c, 1, 1);
    addVertex(d, 0, 1);
    if (reverse) indices.push(base, base + 2, base + 1, base, base + 3, base + 2);
    else indices.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };

  if (surface === 'outer' || surface === 'lining') {
    const inset = surface === 'lining' ? CARETAKER_COWL.thickness : 0;
    for (let row = 0; row < rows; row += 1) {
      const vertical0 = row / rows;
      const vertical1 = (row + 1) / rows;
      for (let column = 0; column < columns; column += 1) {
        const around0 = column / columns;
        const around1 = (column + 1) / columns;
        addQuad(
          resolveCowlPoint(vertical0, around0, inset),
          resolveCowlPoint(vertical0, around1, inset),
          resolveCowlPoint(vertical1, around1, inset),
          resolveCowlPoint(vertical1, around0, inset),
          surface === 'lining',
        );
      }
    }
  } else {
    for (let column = 0; column < columns; column += 1) {
      const around0 = column / columns;
      const around1 = (column + 1) / columns;
      // The top closes upward; the lower rim closes downward into the mantle.
      addQuad(
        resolveCowlPoint(1, around0, CARETAKER_COWL.thickness),
        resolveCowlPoint(1, around0),
        resolveCowlPoint(1, around1),
        resolveCowlPoint(1, around1, CARETAKER_COWL.thickness),
      );
      addQuad(
        resolveCowlPoint(0, around0, CARETAKER_COWL.thickness),
        resolveCowlPoint(0, around1, CARETAKER_COWL.thickness),
        resolveCowlPoint(0, around1),
        resolveCowlPoint(0, around0),
      );
    }
    for (let row = 0; row < rows; row += 1) {
      const vertical0 = row / rows;
      const vertical1 = (row + 1) / rows;
      // Seal both front ends so oblique cameras never reveal paper-thin cards.
      addQuad(
        resolveCowlPoint(vertical0, 0, CARETAKER_COWL.thickness),
        resolveCowlPoint(vertical0, 0),
        resolveCowlPoint(vertical1, 0),
        resolveCowlPoint(vertical1, 0, CARETAKER_COWL.thickness),
      );
      addQuad(
        resolveCowlPoint(vertical0, 1),
        resolveCowlPoint(vertical0, 1, CARETAKER_COWL.thickness),
        resolveCowlPoint(vertical1, 1, CARETAKER_COWL.thickness),
        resolveCowlPoint(vertical1, 1),
      );
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  geometry.computeBoundingSphere();
  return geometry;
}

function addHoodWrap(
  parent: THREE.Object3D,
  materials: CaretakerMaterials,
  quality: CaretakerQuality,
) {
  const cowl = new THREE.Group();
  cowl.name = 'CARETAKER_MASTER_COWL_COLLAR';
  cowl.userData.sculptRuntime = {
    topology: 'continuous-open-annular-shell',
    logicalParts: ['outer-shell', 'inner-lining', 'sealed-rims', 'attached-gold-piping'],
    reviewAngles: [0, 45, 90, 135, 180, 225, 270, 315],
  };

  const shell = mesh(
    createStandingCowlGeometry(quality, 'outer'),
    materials.hoodCloth,
    'CARETAKER_MASTER_COWL_COLLAR_SHELL',
    true,
  );
  const lining = mesh(
    createStandingCowlGeometry(quality, 'lining'),
    materials.clothDeep,
    'CARETAKER_MASTER_COWL_COLLAR_LINING',
  );
  const caps = mesh(
    createStandingCowlGeometry(quality, 'caps'),
    materials.hoodCloth,
    'CARETAKER_MASTER_COWL_COLLAR_RIMS',
    true,
  );
  shell.userData.explodeWithParent = true;
  lining.userData.explodeWithParent = true;
  caps.userData.explodeWithParent = true;
  cowl.add(shell, lining, caps);

  const openingSamples = quality === 'high' ? 12 : 6;
  for (const around of [0, 1]) {
    const points = Array.from({ length: openingSamples }, (_, index) => {
      const vertical = index / (openingSamples - 1);
      const [x, y, z] = resolveCowlPoint(vertical, around);
      const radialX = x;
      const radialZ = z - CARETAKER_COWL.centerZ;
      const length = Math.hypot(radialX, radialZ);
      return [x + radialX / length * 0.012, y, z + radialZ / length * 0.012] as const;
    });
    const trim = mesh(
      createFiligreeStrokeGeometry(points, 0.013, quality === 'high' ? 16 : 7, quality === 'high' ? 4 : 3),
      materials.gold,
      `CARETAKER_OUTFIT_COWL_OPENING_TRIM_${around === 0 ? 'RIGHT' : 'LEFT'}`,
    );
    trim.userData.explodeWithParent = true;
    cowl.add(trim);
  }

  const upperSamples = quality === 'high' ? 34 : 14;
  const upperEdge = Array.from({ length: upperSamples }, (_, index) => {
    const [x, y, z] = resolveCowlPoint(1, index / (upperSamples - 1));
    const radialX = x;
    const radialZ = z - CARETAKER_COWL.centerZ;
    const length = Math.hypot(radialX, radialZ);
    return [x + radialX / length * 0.01, y + 0.006, z + radialZ / length * 0.01] as const;
  });
  const upperTrim = mesh(
    createFiligreeStrokeGeometry(upperEdge, 0.011, quality === 'high' ? 32 : 12, quality === 'high' ? 4 : 3),
    materials.gold,
    'CARETAKER_OUTFIT_COWL_UPPER_PERIMETER_TRIM',
  );
  upperTrim.userData.explodeWithParent = true;
  cowl.add(upperTrim);
  parent.add(cowl);
}

/**
 * Purpose-built board silhouette. This is deliberately not the High model
 * with lower tessellation: every retained mesh must still read at phone-board
 * scale and remain owned by the same semantic bone as the encounter master.
 */
function addBoardCharacterGeometry(
  root: THREE.Group,
  outfitRoot: THREE.Group,
  rig: CaretakerRig,
  materials: CaretakerMaterials,
  outfit: CaretakerOutfitConfig,
) {
  const robe = mesh(
    new THREE.CylinderGeometry(0.55, 0.88, 1.7, 8, 1, false),
    materials.clothDeep,
    'CARETAKER_BOARD_ROBE',
  );
  robe.position.set(0, 0.78, -0.08);
  robe.scale.z = 0.72;
  robe.castShadow = true;
  outfitRoot.add(robe);

  const frontShape = new THREE.Shape();
  frontShape.moveTo(-0.22, 0.64);
  frontShape.quadraticCurveTo(-0.3, 0.02, -0.4, -0.76);
  frontShape.quadraticCurveTo(0, -0.86, 0.4, -0.76);
  frontShape.quadraticCurveTo(0.3, 0.02, 0.22, 0.64);
  frontShape.closePath();
  const frontPanel = mesh(
    new THREE.ExtrudeGeometry(frontShape, { depth: 0.035, steps: 1, bevelEnabled: false, curveSegments: 2 }),
    materials.undercloth,
    'CARETAKER_BOARD_CREAM_FRONT',
  );
  frontPanel.position.set(0, 0.9, 0.56);
  outfitRoot.add(frontPanel);

  const torso = mesh(
    new THREE.SphereGeometry(0.68, 8, 5),
    materials.clothDeep,
    'CARETAKER_BOARD_TORSO',
  );
  torso.scale.set(0.88, 0.82, 0.52);
  torso.castShadow = true;
  rig.chest.add(torso);

  const mantle = new THREE.Group();
  mantle.name = 'CARETAKER_BOARD_MANTLE';
  const mantleBody = mesh(
    new THREE.SphereGeometry(0.86, 8, 5, 0, Math.PI * 2, 0, Math.PI * 0.62),
    materials.cloth,
    'CARETAKER_BOARD_MANTLE_BODY',
  );
  mantleBody.scale.set(1.18, 0.46, 0.66);
  mantleBody.position.set(0, 0.08, 0.08);
  mantleBody.castShadow = true;
  const mantleCrystal = mesh(
    new THREE.OctahedronGeometry(0.13, 0),
    materials.crystal,
    'CARETAKER_BOARD_MANTLE_CRYSTAL',
  );
  mantleCrystal.position.set(0, -0.06, 0.68);
  mantleCrystal.scale.set(0.76, 1.12, 0.42);
  mantle.add(mantleBody, mantleCrystal);
  compactStaticGeometry(mantle, 'CARETAKER_BOARD_MANTLE');
  rig.chest.add(mantle);

  if (outfit.accessories.cape) {
    const cape = mesh(
      new THREE.ConeGeometry(0.76, 1.72, 8, 1, true),
      materials.cloth,
      'CARETAKER_BOARD_CAPE',
    );
    cape.position.set(0, -0.72, -0.36);
    cape.scale.set(1.18, 1, 0.5);
    cape.rotation.x = -6 * DEG;
    cape.castShadow = true;
    rig.chest.add(cape);
  }

  const addBoardArm = (side: 'left' | 'right') => {
    const sideSign = side === 'left' ? -1 : 1;
    const upperBone = side === 'left' ? rig.leftUpperArm : rig.rightUpperArm;
    const lowerBone = side === 'left' ? rig.leftLowerArm : rig.rightLowerArm;
    const handBone = side === 'left' ? rig.leftHand : rig.rightHand;
    const upper = mesh(
      new THREE.CapsuleGeometry(0.2, 0.38, 2, 5),
      materials.undercloth,
      `CARETAKER_BOARD_${side.toUpperCase()}_UPPER_SLEEVE`,
    );
    upper.position.y = -0.31;
    upper.castShadow = true;
    upperBone.add(upper);

    const cuff = new THREE.Group();
    cuff.name = `CARETAKER_BOARD_${side.toUpperCase()}_CUFF`;
    const cuffBody = mesh(
      new THREE.ConeGeometry(0.34, 0.6, 6, 1, true),
      materials.cloth,
      `${cuff.name}_BODY`,
    );
    cuffBody.position.y = -0.31;
    cuffBody.rotation.z = sideSign * 4 * DEG;
    cuff.add(cuffBody);
    compactStaticGeometry(cuff, cuff.name);
    lowerBone.add(cuff);

    const hand = mesh(
      new THREE.SphereGeometry(0.17, 6, 4),
      materials.clothDeep,
      `CARETAKER_BOARD_${side.toUpperCase()}_HAND`,
    );
    hand.scale.set(0.86, 1.08, 0.72);
    handBone.add(hand);
  };
  addBoardArm('left');
  addBoardArm('right');

  for (const [side, foot] of [['LEFT', rig.leftFoot], ['RIGHT', rig.rightFoot]] as const) {
    const boot = new THREE.Group();
    boot.name = `CARETAKER_BOARD_${side}_BOOT`;
    const upper = mesh(
      new THREE.CapsuleGeometry(0.2, 0.24, 2, 5),
      materials.bootLeather,
      `${boot.name}_UPPER`,
    );
    upper.position.set(0, 0.12, 0.12);
    boot.add(upper);
    compactStaticGeometry(boot, boot.name);
    foot.add(boot);
  }

  const face = mesh(createShadowFaceGeometry('low'), materials.shadow, 'CARETAKER_BOARD_SHADOW_FACE');
  face.position.set(0, 0.025, 0.58);
  rig.head.add(face);

  const hood = new THREE.Group();
  hood.name = 'CARETAKER_BOARD_HOOD';
  hood.add(
    mesh(createHoodCrownGeometry('low'), materials.hoodCloth, 'CARETAKER_BOARD_HOOD_CROWN'),
    mesh(createHoodBrimSurfaceGeometry('low', false), materials.hoodCloth, 'CARETAKER_BOARD_HOOD_BRIM'),
    mesh(createHoodBrimSurfaceGeometry('low', true), materials.clothDeep, 'CARETAKER_BOARD_HOOD_UNDERSIDE'),
    mesh(createHoodBrimWallGeometry('low', 1), materials.hoodCloth, 'CARETAKER_BOARD_HOOD_OUTER_WALL'),
    mesh(createHoodEdgeTrimGeometry('low'), materials.gold, 'CARETAKER_BOARD_HOOD_TRIM'),
  );
  const hoodTail = createHoodTailCurve();
  const tip = hoodTail.getPoint(1);
  const pearl = mesh(new THREE.SphereGeometry(0.085, 6, 4), materials.pearl, 'CARETAKER_BOARD_HOOD_PEARL');
  pearl.position.copy(tip).addScaledVector(hoodTail.getTangent(1).normalize(), 0.1);
  hood.add(pearl);
  compactStaticGeometry(hood, 'CARETAKER_BOARD_HOOD');
  rig.head.add(hood);

  const eyeGeometry = new THREE.SphereGeometry(0.047, 6, 4);
  const leftEye = mesh(eyeGeometry, materials.eye, 'CARETAKER_FACE_LEFT_EYE', false);
  const rightEye = mesh(eyeGeometry, materials.eye, 'CARETAKER_FACE_RIGHT_EYE', false);
  leftEye.position.set(-0.24, -0.015, 0.77);
  rightEye.position.set(0.24, -0.015, 0.77);
  leftEye.scale.set(0.78, 1.08, 0.62);
  rightEye.scale.copy(leftEye.scale);
  rig.head.add(leftEye, rightEye);

  const mouth = mesh(new THREE.TorusGeometry(0.075, 0.013, 3, 8, Math.PI), materials.eye, 'CARETAKER_FACE_MOUTH_GLOW', false);
  mouth.position.set(0, -0.19, 0.825);
  mouth.rotation.z = Math.PI;
  mouth.visible = false;
  const surprisedMouth = mesh(new THREE.TorusGeometry(0.052, 0.013, 3, 8), materials.eye, 'CARETAKER_FACE_SURPRISED_MOUTH_GLOW', false);
  surprisedMouth.position.set(0, -0.2, 0.825);
  surprisedMouth.visible = false;
  // The Board LOD preserves the expression API without paying two invisible
  // draw-call/mesh objects. At this scale emotion is carried by the eyes.

  if (outfit.accessories.staff) {
    const staff = new THREE.Group();
    staff.name = 'CARETAKER_BOARD_STAFF';
    const shaft = mesh(new THREE.CylinderGeometry(0.045, 0.055, 2.55, 6), materials.leather, 'CARETAKER_BOARD_STAFF_SHAFT');
    shaft.position.y = 0.45;
    const crown = mesh(new THREE.TorusGeometry(0.23, 0.035, 4, 8, Math.PI * 1.7), materials.gold, 'CARETAKER_BOARD_STAFF_CROWN');
    crown.position.y = 1.78;
    crown.rotation.z = 15 * DEG;
    const crystal = mesh(new THREE.OctahedronGeometry(0.14, 0), materials.crystal, 'CARETAKER_BOARD_STAFF_CRYSTAL');
    crystal.position.set(0, 1.81, 0);
    crystal.scale.set(0.76, 1.2, 0.76);
    staff.add(shaft, crown, crystal);
    compactStaticGeometry(staff, staff.name);
    staff.position.set(-0.08, 0, 0.055);
    staff.rotation.z = 6 * DEG;
    rig.leftHand.add(staff);
  }

  root.userData.caretakerFace = { leftEye, rightEye, mouth, surprisedMouth };
  root.userData.caretakerLod = 'board';
  return { leftEye, rightEye, mouth, surprisedMouth };
}

function addCharacterGeometry(
  root: THREE.Group,
  outfitRoot: THREE.Group,
  rig: CaretakerRig,
  materials: CaretakerMaterials,
  quality: CaretakerQuality,
  outfit: CaretakerOutfitConfig,
) {
  if (quality === 'low') {
    return addBoardCharacterGeometry(root, outfitRoot, rig, materials, outfit);
  }
  const profile = CARETAKER_QUALITY_PROFILES[quality];
  const radial = profile.radialSegments;
  const sphere = profile.sphereSegments;

  const robe = mesh(createWrappedRobeGeometry(radial), materials.clothDeep, 'CARETAKER_OUTFIT_OUTER_ROBE');
  robe.castShadow = true;
  robe.position.z = -0.08;
  robe.scale.z = 0.68;
  outfitRoot.add(robe);

  addQuiltedUndergarment(outfitRoot, materials, quality);
  addFrontGarmentLayers(outfitRoot, materials, quality);
  for (const side of [-1, 1] as const) {
    const sideGore = mesh(
      createCoatSideGoreGeometry(side, quality),
      materials.clothDeep,
      `CARETAKER_OUTFIT_COAT_SIDE_GORE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
    );
    sideGore.castShadow = true;
    outfitRoot.add(sideGore);
  }

  // The visible coat and cape panels own their split hem trims. A full torus
  // around the hidden robe lining reads as a detached hoop from side cameras.

  const belt = mesh(
    new THREE.CylinderGeometry(0.57, 0.57, 0.12, radial, 1, true),
    materials.leather,
    'CARETAKER_OUTFIT_BELT',
  );
  belt.position.set(0, 1.24, 0.08);
  belt.scale.z = 0.8;
  outfitRoot.add(belt);
  for (const [index, x] of [-0.25, 0.25].entries()) {
    const buckle = mesh(createRectFrameGeometry(0.12, 0.085, 0.04), materials.gold, `CARETAKER_OUTFIT_BELT_BUCKLE_${index}`);
    buckle.position.set(x, 1.24, 0.55);
    buckle.scale.setScalar(0.86);
    outfitRoot.add(buckle);
  }
  const beltClasp = mesh(new THREE.OctahedronGeometry(0.1, 0), materials.gold, 'CARETAKER_OUTFIT_BELT_CLASP');
  beltClasp.position.set(0, 1.24, 0.58);
  beltClasp.scale.set(0.9, 0.7, 0.4);
  outfitRoot.add(beltClasp);

  const mantleAssembly = new THREE.Group();
  mantleAssembly.name = 'CARETAKER_OUTFIT_MANTLE_ASSEMBLY';
  rig.chest.add(mantleAssembly);
  let capeDrape: THREE.Group | null = null;
  for (const side of [-1, 1] as const) {
    const shoulderBridge = mesh(
      createMantleSideBridgeGeometry(side, quality),
      materials.cloth,
      `CARETAKER_OUTFIT_MANTLE_SIDE_BRIDGE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
    );
    shoulderBridge.castShadow = true;
    mantleAssembly.add(shoulderBridge);
  }

  if (outfit.accessories.cape) {
    const cape = new THREE.Group();
    cape.name = 'CARETAKER_OUTFIT_CAPE';
    capeDrape = cape;
    // The cape, collar, yoke and front hardware are one chest-owned garment.
    // Parenting the long drape to the hips allowed it to shear away from the
    // yoke whenever walk/greet rotated the chest.
    cape.position.y = -1.58;
    const rearMantleAssembly = new THREE.Group();
    rearMantleAssembly.name = 'CARETAKER_OUTFIT_REAR_MANTLE_ASSEMBLY';
    rearMantleAssembly.position.y = -1.58;
    mantleAssembly.add(rearMantleAssembly);
    const yoke = mesh(
      createCapeYokeShellGeometry(quality),
      materials.cloth,
      'CARETAKER_OUTFIT_CAPE_YOKE',
    );
    yoke.castShadow = true;
    const yokeTrim = mesh(createCapeYokeTrimGeometry(quality), materials.gold, 'CARETAKER_OUTFIT_CAPE_YOKE_TRIM');
    const yokeTide = mesh(createCapeYokeTideGeometry(quality), materials.accent, 'CARETAKER_OUTFIT_CAPE_YOKE_TIDE');
    rearMantleAssembly.add(yoke, yokeTrim, yokeTide);
    for (const side of [-1, 1] as const) {
      const rearMantleLeaf = mesh(
        createRearMantleLeafGeometry(side, quality),
        materials.cloth,
        `CARETAKER_OUTFIT_REAR_MANTLE_${side < 0 ? 'LEFT' : 'RIGHT'}`,
      );
      rearMantleLeaf.castShadow = true;
      rearMantleAssembly.add(rearMantleLeaf);
      if (quality === 'high') {
        const rearMantleTrim = mesh(
          createRearMantleLeafTrimGeometry(side, quality),
          materials.gold,
          `CARETAKER_OUTFIT_REAR_MANTLE_TRIM_${side}`,
        );
        rearMantleAssembly.add(rearMantleTrim);
      }
    }
    compactStaticGeometry(rearMantleAssembly, 'CARETAKER_REAR_MANTLE');
    const outerCape = mesh(
      createContinuousCapeSurfaceGeometry(quality),
      materials.cloth,
      'CARETAKER_OUTFIT_CAPE_OUTER_SHELL',
    );
    outerCape.castShadow = true;
    const capeLining = mesh(
      createContinuousCapeSurfaceGeometry(quality, 0.035, true),
      materials.clothDeep,
      'CARETAKER_OUTFIT_CAPE_INNER_LINING',
    );
    cape.add(outerCape, capeLining);

    for (const edge of ['left', 'right', 'hem'] as const) {
      cape.add(mesh(
        createContinuousCapePerimeterGeometry(quality, edge),
        materials.clothDeep,
        `CARETAKER_OUTFIT_CAPE_${edge.toUpperCase()}_EDGE_WALL`,
      ));
      cape.add(mesh(
        createContinuousCapeTrimGeometry(quality, edge),
        materials.gold,
        `CARETAKER_OUTFIT_CAPE_${edge.toUpperCase()}_PIPING`,
      ));
    }
    cape.add(
      mesh(createCapeTideBandGeometry(quality, 'gold'), materials.gold, 'CARETAKER_OUTFIT_CAPE_TIDE_BAND_GOLD'),
      mesh(createCapeTideBandGeometry(quality, 'cyan'), materials.accent, 'CARETAKER_OUTFIT_CAPE_TIDE_BAND_CYAN'),
    );
    if (quality === 'high') {
      for (const [index, center] of [0.16, 0.39, 0.61, 0.84].entries()) {
        cape.add(mesh(
          createCapeTideCurlGeometry(center, index % 2 === 0 ? -1 : 1),
          index === 1 || index === 2 ? materials.accent : materials.gold,
          `CARETAKER_OUTFIT_CAPE_TIDE_CURL_${index}`,
        ));
      }
    }
    compactStaticGeometry(cape, 'CARETAKER_CAPE_DRAPE');
    mantleAssembly.add(cape);
  }

  const chestVolume = mesh(new THREE.SphereGeometry(0.68, sphere, Math.max(10, sphere / 2)), materials.clothDeep, 'CARETAKER_MASTER_TORSO');
  chestVolume.castShadow = true;
  chestVolume.scale.set(0.84, 0.84, 0.5);
  chestVolume.position.y = 0.02;
  rig.chest.add(chestVolume);

  for (const side of [-1, 1] as const) {
    const underLayer = mesh(
      createCapeletPanelGeometry(side, quality === 'high' ? 0.045 : 0.038, quality === 'high' ? 10 : 4),
      materials.clothDeep,
      `CARETAKER_OUTFIT_MANTLE_UNDER_${side < 0 ? 'LEFT' : 'RIGHT'}`,
    );
    underLayer.position.set(0, 0.055, 0.55);
    underLayer.scale.set(1.045, 1.075, 1);
    const panel = mesh(
      createCapeletPanelGeometry(side, quality === 'high' ? 0.055 : 0.045, quality === 'high' ? 10 : 4),
      materials.cloth,
      `CARETAKER_OUTFIT_MANTLE_PANEL_${side < 0 ? 'LEFT' : 'RIGHT'}`,
    );
    panel.position.set(0, 0.105, 0.62);
    panel.castShadow = true;
    mantleAssembly.add(underLayer, panel);
    addTrimBetween(mantleAssembly, materials, [side * 0.89, 0.065, 0.36], [side * 0.76, 0.015, 0.42], 0.018, `CARETAKER_OUTFIT_MANTLE_EDGE_${side}_A`);
    addTrimBetween(mantleAssembly, materials, [side * 0.76, 0.015, 0.42], [side * 0.57, -0.045, 0.5], 0.018, `CARETAKER_OUTFIT_MANTLE_EDGE_${side}_B`);
    addTrimBetween(mantleAssembly, materials, [side * 0.57, -0.045, 0.5], [side * 0.33, 0.005, 0.57], 0.018, `CARETAKER_OUTFIT_MANTLE_EDGE_${side}_C`);
  }
  if (outfit.accessories.cape) {
    const collar = mesh(
      new THREE.TubeGeometry(
        createCapeCollarCurve(quality),
        quality === 'high' ? 28 : 16,
        quality === 'high' ? 0.075 : 0.065,
        quality === 'high' ? 6 : 4,
        false,
      ),
      materials.clothDeep,
      'CARETAKER_OUTFIT_CAPE_SOFT_COLLAR',
    );
    const collarPiping = mesh(
      new THREE.TubeGeometry(
        createCapeCollarCurve(quality, 0.035),
        quality === 'high' ? 28 : 16,
        quality === 'high' ? 0.014 : 0.012,
        quality === 'high' ? 4 : 3,
        false,
      ),
      materials.gold,
      'CARETAKER_OUTFIT_CAPE_COLLAR_PIPING',
    );
    mantleAssembly.add(collar, collarPiping);
  }
  if (capeDrape) mantleAssembly.remove(capeDrape);
  compactStaticGeometry(mantleAssembly, 'CARETAKER_MANTLE');
  if (capeDrape) mantleAssembly.add(capeDrape);
  if (outfit.accessories.cape) {
    addCapeFrontHardware(
      root,
      mantleAssembly,
      materials,
      quality,
      outfit.accessories.pearls,
      outfit.accessories.mantleCrystal,
    );
  }

  rig.leftUpperArm.add(createSleeve(materials, radial, 'left'));
  rig.rightUpperArm.add(createSleeve(materials, radial, 'right'));
  rig.leftLowerArm.add(createForearmSleeve(materials, radial, 'left'));
  rig.rightLowerArm.add(createForearmSleeve(materials, radial, 'right'));
  const leftHandModel = createHand(materials, radial, 'CARETAKER_MASTER_LEFT_HAND', 'grip');
  leftHandModel.scale.setScalar(1.1);
  rig.leftHand.add(leftHandModel);
  const rightHandModel = createHand(materials, radial, 'CARETAKER_MASTER_RIGHT_HAND', 'point');
  rightHandModel.scale.setScalar(1.15);
  rig.rightHand.add(rightHandModel);
  rig.rightHand.userData.pointFinger = rightHandModel.userData.pointFinger;

  const leftBoot = createBoot(materials, radial, 'CARETAKER_OUTFIT_LEFT_BOOT');
  const rightBoot = createBoot(materials, radial, 'CARETAKER_OUTFIT_RIGHT_BOOT');
  leftBoot.scale.setScalar(1.1);
  rightBoot.scale.setScalar(1.1);
  rig.leftFoot.add(leftBoot);
  rig.rightFoot.add(rightBoot);

  const face = mesh(createShadowFaceGeometry(quality), materials.shadow, 'CARETAKER_MASTER_SHADOW_FACE');
  // Seat the darkness behind the glowing eyes and the raised wrap. It is a
  // cavity/backdrop, never the frontmost facial surface.
  face.position.set(0, 0.025, 0.58);
  rig.head.add(face);

  const hoodAssembly = new THREE.Group();
  hoodAssembly.name = 'CARETAKER_MASTER_HOOD_ASSEMBLY';
  rig.head.add(hoodAssembly);
  const hoodShell = mesh(createHoodCrownGeometry(quality), materials.hoodCloth, 'CARETAKER_MASTER_HOOD_SHELL');
  hoodShell.castShadow = true;
  const brimTop = mesh(createHoodBrimSurfaceGeometry(quality, false), materials.hoodCloth, 'CARETAKER_MASTER_HOOD_BRIM_TOP');
  brimTop.castShadow = true;
  const brimUnderside = mesh(createHoodBrimSurfaceGeometry(quality, true), materials.clothDeep, 'CARETAKER_MASTER_HOOD_BRIM_UNDERSIDE');
  const brimOuterWall = mesh(createHoodBrimWallGeometry(quality, 1), materials.hoodCloth, 'CARETAKER_MASTER_HOOD_BRIM_OUTER_WALL');
  const brimInnerWall = mesh(createHoodBrimWallGeometry(quality, 0), materials.clothDeep, 'CARETAKER_MASTER_HOOD_BRIM_INNER_WALL');
  const brimTrim = mesh(createHoodEdgeTrimGeometry(quality), materials.gold, 'CARETAKER_OUTFIT_HOOD_TRIM');
  hoodAssembly.add(
    hoodShell,
    brimTop,
    brimUnderside,
    brimOuterWall,
    brimInnerWall,
    brimTrim,
  );
  const tailCurve = createHoodTailCurve();
  const tailTip = tailCurve.getPoint(1);
  const tailTipTangent = tailCurve.getTangent(1).normalize();
  const pearlCenter = tailTip.clone().addScaledVector(tailTipTangent, 0.115);
  addBarBetween(
    hoodAssembly,
    materials.gold,
    [tailTip.x, tailTip.y, tailTip.z],
    [pearlCenter.x, pearlCenter.y, pearlCenter.z],
    0.018,
    'CARETAKER_OUTFIT_HAT_PEARL_LINK',
  );
  const tipPearl = mesh(
    new THREE.SphereGeometry(0.085, quality === 'high' ? 12 : 8, quality === 'high' ? 8 : 6),
    materials.pearl,
    'CARETAKER_OUTFIT_HAT_PEARL',
  );
  tipPearl.position.copy(pearlCenter);
  hoodAssembly.add(tipPearl);
  addHoodCrownCrest(hoodAssembly, materials);
  addHoodCrestFiligree(hoodAssembly, materials, quality);
  addHoodSurfaceEmbroidery(hoodAssembly, materials, quality);
  addHoodWrap(hoodAssembly, materials, quality);
  compactStaticGeometry(hoodAssembly, 'CARETAKER_HOOD');

  const eyeGeometry = new THREE.SphereGeometry(0.041, radial, Math.max(8, radial / 2));
  const leftEye = mesh(eyeGeometry, materials.eye, 'CARETAKER_FACE_LEFT_EYE', false);
  const rightEye = mesh(eyeGeometry, materials.eye, 'CARETAKER_FACE_RIGHT_EYE', false);
  leftEye.position.set(-0.24, -0.015, 0.77);
  rightEye.position.set(0.24, -0.015, 0.77);
  leftEye.scale.set(0.7, 0.98, 0.62);
  rightEye.scale.copy(leftEye.scale);
  rig.head.add(leftEye, rightEye);

  const mouth = mesh(new THREE.TorusGeometry(0.075, 0.012, 5, 16, Math.PI), materials.eye, 'CARETAKER_FACE_MOUTH_GLOW', false);
  mouth.position.set(0, -0.19, 0.825);
  mouth.rotation.z = Math.PI;
  mouth.visible = false;
  const surprisedMouth = mesh(new THREE.TorusGeometry(0.052, 0.012, 5, 16), materials.eye, 'CARETAKER_FACE_SURPRISED_MOUTH_GLOW', false);
  surprisedMouth.position.set(0, -0.2, 0.825);
  surprisedMouth.scale.set(0.9, 1.12, 1);
  surprisedMouth.visible = false;
  rig.head.add(mouth, surprisedMouth);

  if (outfit.accessories.staff) {
    const staff = createStaff(materials, quality);
    // The approved Crown of Tides silhouette carries the staff on image-left.
    // Counter-rotate the prop against the relaxed arm so its shaft reads as a
    // grounded vertical support instead of an antenna leaning out of the hand.
    staff.position.set(-0.08, -0.88, 0.055);
    staff.rotation.z = 6 * DEG;
    rig.leftHand.add(staff);
  }

  root.userData.caretakerFace = { leftEye, rightEye, mouth, surprisedMouth };
  return { leftEye, rightEye, mouth, surprisedMouth };
}

function resetRigPose(rig: CaretakerRig) {
  const pointFinger = rig.rightHand.userData.pointFinger as THREE.Object3D | undefined;
  if (pointFinger) pointFinger.visible = false;
  rig.hips.position.set(0, 0.58, 0);
  rig.hips.rotation.set(0, 0, 0);
  rig.spine.rotation.set(0, 0, 0);
  rig.chest.rotation.set(0, 0, 0);
  rig.neck.rotation.set(0, 0, 0);
  rig.head.rotation.set(0, 0, 0);
  // Carry the friendly, broad A-shaped sleeve silhouette from the goal art.
  // The lower-arm counter-rotation preserves the approved hand/staff angle,
  // so this opens the elbows without reintroducing grip or cuff collisions.
  rig.leftUpperArm.rotation.set(0, 0, -20 * DEG);
  rig.leftUpperArm.position.set(-0.69, 0.12, 0.18);
  rig.leftLowerArm.rotation.set(0, 0, 14 * DEG);
  rig.leftHand.rotation.set(0, 0, 0);
  rig.rightUpperArm.rotation.set(0, 0, 22 * DEG);
  rig.rightUpperArm.position.set(0.69, 0.12, 0.18);
  rig.rightLowerArm.rotation.set(0, 0, -14 * DEG);
  rig.rightHand.rotation.set(0, 16 * DEG, 0);
  rig.leftUpperLeg.rotation.set(0, 0, 0);
  rig.leftLowerLeg.rotation.set(0, 0, 0);
  rig.leftFoot.rotation.set(0, 0, 0);
  rig.leftFoot.position.set(-0.045, -0.31, 0.14);
  rig.rightUpperLeg.rotation.set(0, 0, 0);
  rig.rightLowerLeg.rotation.set(0, 0, 0);
  rig.rightFoot.rotation.set(0, 0, 0);
  rig.rightFoot.position.set(0.045, -0.31, 0.04);
}

function applyBaseIdle(rig: CaretakerRig, elapsed: number, weight = 1) {
  const breath = Math.sin(elapsed * 1.52);
  const observe = Math.sin(elapsed * 0.37);
  rig.hips.position.y += breath * 0.012 * weight;
  rig.spine.rotation.x += breath * 0.008 * weight;
  rig.chest.rotation.y += observe * 0.025 * weight;
  rig.head.rotation.y += observe * 0.11 * weight;
  rig.head.rotation.z += Math.sin(elapsed * 0.51 + 0.7) * 0.018 * weight;
  rig.leftUpperArm.rotation.x += breath * 0.018 * weight;
  rig.rightUpperArm.rotation.x -= breath * 0.018 * weight;
}

function applyAnimationPose(
  rig: CaretakerRig,
  animation: CaretakerAnimationId,
  elapsed: number,
  weight: number,
) {
  if (weight <= 0) return;
  const wave = Math.sin(elapsed * 5.8);
  switch (animation) {
    case 'walk': {
      // A short, grounded gait works better for this broad, robe-heavy body
      // than a conventional long humanoid stride. Each half-cycle gives one
      // boot a clear swing while the opposite boot remains planted. The old
      // 0.32-radian thigh swing made the feet balloon toward the camera and
      // visibly hover above the board at phone size.
      const phase = elapsed * 4.55;
      const step = Math.sin(phase);
      const leftLift = Math.max(0, step);
      const rightLift = Math.max(0, -step);
      const doubleSupport = (1 - Math.cos(phase * 2)) * 0.5;
      rig.hips.position.y += doubleSupport * 0.018 * weight;
      rig.hips.position.x += Math.cos(phase) * 0.014 * weight;
      rig.hips.rotation.y += step * 0.022 * weight;
      rig.hips.rotation.z -= Math.cos(phase) * 0.012 * weight;

      rig.leftUpperLeg.rotation.x += step * 0.1 * weight;
      rig.rightUpperLeg.rotation.x -= step * 0.1 * weight;
      rig.leftLowerLeg.rotation.x += leftLift * 0.12 * weight;
      rig.rightLowerLeg.rotation.x += rightLift * 0.12 * weight;
      rig.leftFoot.position.z += step * 0.13 * weight;
      rig.rightFoot.position.z -= step * 0.13 * weight;
      rig.leftFoot.position.y += leftLift * 0.072 * weight;
      rig.rightFoot.position.y += rightLift * 0.072 * weight;
      rig.leftFoot.rotation.x -= leftLift * 0.055 * weight;
      rig.rightFoot.rotation.x -= rightLift * 0.055 * weight;

      // The staff hand behaves as a planted support hand. Only the free hand
      // counter-swings, and its z corridor stays outside the coat/cape volume.
      rig.leftUpperArm.rotation.x -= step * 0.018 * weight;
      rig.leftUpperArm.rotation.z -= 0.035 * weight;
      rig.rightUpperArm.rotation.x += step * 0.105 * weight;
      rig.rightUpperArm.rotation.z += 0.31 * weight;
      rig.rightLowerArm.rotation.z -= (0.09 + rightLift * 0.045) * weight;
      rig.rightHand.rotation.z += 0.06 * weight;
      rig.chest.rotation.y -= step * 0.04 * weight;
      rig.head.rotation.y += step * 0.018 * weight;
      break;
    }
    case 'greet':
      // Keep the wave outside and slightly in front of the widened hood brim.
      // Pulling the shoulder toward the head made the fingertips emerge
      // through the cyan brim surface in rear-side phone views.
      rig.rightUpperArm.position.x -= 0.28 * weight;
      rig.rightUpperArm.position.z += 0.16 * weight;
      rig.rightUpperArm.rotation.z += 1.02 * weight;
      rig.rightUpperArm.rotation.x -= 0.2 * weight;
      rig.rightLowerArm.rotation.z += 1.6 * weight;
      rig.rightLowerArm.rotation.x -= 0.18 * weight;
      rig.rightHand.rotation.y -= wave * 0.42 * weight;
      rig.rightHand.rotation.z -= 0.2 * weight;
      rig.head.rotation.z += 0.05 * weight;
      rig.chest.rotation.y -= 0.06 * weight;
      break;
    case 'talk-gentle': {
      const explain = Math.sin(elapsed * 2.45);
      rig.rightUpperArm.rotation.z += (0.33 + explain * 0.07) * weight;
      rig.rightLowerArm.rotation.x -= (0.22 + explain * 0.11) * weight;
      rig.rightLowerArm.rotation.z -= 0.18 * weight;
      rig.rightHand.rotation.x += 0.22 * weight;
      rig.rightHand.rotation.z += (0.2 + explain * 0.1) * weight;
      rig.head.rotation.y += Math.sin(elapsed * 1.3) * 0.08 * weight;
      rig.head.rotation.x += Math.sin(elapsed * 2.1) * 0.025 * weight;
      break;
    }
    case 'point':
      rig.rightUpperArm.rotation.z += 0.5 * weight;
      rig.rightUpperArm.rotation.x -= 0.3 * weight;
      rig.rightLowerArm.rotation.z += 0.18 * weight;
      rig.rightHand.rotation.z -= 0.28 * weight;
      if (rig.rightHand.userData.pointFinger instanceof THREE.Object3D) {
        rig.rightHand.userData.pointFinger.visible = weight > 0.52;
      }
      rig.head.rotation.y -= 0.22 * weight;
      rig.chest.rotation.y -= 0.12 * weight;
      break;
    case 'react': {
      const settle = Math.exp(-((elapsed * 1.7) % 6) * 0.62);
      const pulse = 0.72 + settle * 0.28;
      rig.hips.position.y += pulse * 0.08 * weight;
      rig.spine.rotation.x -= pulse * 0.12 * weight;
      rig.head.rotation.x -= pulse * 0.22 * weight;
      rig.leftUpperArm.rotation.z -= pulse * 0.2 * weight;
      rig.rightUpperArm.rotation.z += pulse * 0.7 * weight;
      rig.rightLowerArm.rotation.z -= pulse * 0.34 * weight;
      break;
    }
    case 'celebrate': {
      const bounce = Math.max(0, Math.sin(elapsed * 4.4));
      rig.rightUpperArm.position.x -= 0.45 * weight;
      rig.hips.position.y += bounce * 0.13 * weight;
      rig.leftUpperArm.rotation.z -= 0.08 * weight;
      rig.rightUpperArm.rotation.z += (1.05 + wave * 0.05) * weight;
      rig.rightUpperArm.rotation.x -= 0.22 * weight;
      rig.rightLowerArm.rotation.z += 1.55 * weight;
      rig.rightLowerArm.rotation.x -= 0.16 * weight;
      rig.chest.rotation.x -= 0.08 * weight;
      rig.head.rotation.x -= 0.08 * weight;
      rig.head.rotation.z += Math.sin(elapsed * 2.2) * 0.06 * weight;
      break;
    }
    case 'idle':
    default:
      break;
  }
}

const EMOTION_POSES: Record<CaretakerEmotionId, {
  leftScale: readonly [number, number];
  rightScale: readonly [number, number];
  leftRotation: number;
  rightRotation: number;
  intensity: number;
  tint: number;
  mouth: boolean;
}> = {
  calm: { leftScale: [0.72, 1.12], rightScale: [0.72, 1.12], leftRotation: 0, rightRotation: 0, intensity: 1.05, tint: 0x00aede, mouth: false },
  curious: { leftScale: [0.62, 1.02], rightScale: [0.84, 1.28], leftRotation: -0.12, rightRotation: 0.08, intensity: 1.15, tint: 0x00bfe9, mouth: false },
  delighted: { leftScale: [1.02, 0.38], rightScale: [1.02, 0.38], leftRotation: 0.2, rightRotation: -0.2, intensity: 1.25, tint: 0x12c9ed, mouth: true },
  concerned: { leftScale: [0.84, 0.54], rightScale: [0.84, 0.54], leftRotation: -0.34, rightRotation: 0.34, intensity: 0.9, tint: 0x167fb5, mouth: false },
  surprised: { leftScale: [0.88, 1.08], rightScale: [0.88, 1.08], leftRotation: 0, rightRotation: 0, intensity: 1.15, tint: 0x00bce8, mouth: false },
  thoughtful: { leftScale: [0.82, 0.48], rightScale: [0.66, 0.34], leftRotation: 0.08, rightRotation: -0.08, intensity: 1, tint: 0x1599c8, mouth: false },
  urgent: { leftScale: [0.98, 0.58], rightScale: [0.98, 0.58], leftRotation: 0.34, rightRotation: -0.34, intensity: 1.3, tint: 0x00cfe8, mouth: false },
};

function updateFace(model: CaretakerModel, elapsed: number, reducedMotion: boolean) {
  const pose = EMOTION_POSES[model.emotion];
  const blinkCycle = elapsed % 4.8;
  const blink = reducedMotion || blinkCycle > 0.13
    ? 1
    : Math.max(0.08, Math.abs(blinkCycle - 0.065) / 0.065);
  const flicker = reducedMotion ? 1 : 1 + Math.sin(elapsed * 2.1) * 0.035;
  model.leftEye.scale.set(pose.leftScale[0], pose.leftScale[1] * blink, 0.42);
  model.rightEye.scale.set(pose.rightScale[0], pose.rightScale[1] * blink, 0.42);
  model.leftEye.rotation.z = pose.leftRotation;
  model.rightEye.rotation.z = pose.rightRotation;
  model.eyeMaterial.color.setHex(pose.tint);
  model.eyeMaterial.emissive.setHex(pose.tint);
  model.eyeMaterial.emissiveIntensity = pose.intensity * flicker;
  const isSurprised = model.emotion === 'surprised';
  model.surprisedMouth.visible = isSurprised;
  model.mouth.visible = !isSurprised && (pose.mouth || model.animation === 'talk-gentle' || model.animation === 'celebrate');
  if (model.mouth.visible) {
    const talk = model.animation === 'talk-gentle' && !reducedMotion ? 0.8 + Math.abs(Math.sin(elapsed * 7.4)) * 0.45 : 1;
    model.mouth.scale.set(1, talk, 1);
  }
}

function computeMetrics(root: THREE.Object3D): CaretakerModelMetrics {
  const materials = new Set<THREE.Material>();
  let bones = 0;
  let meshes = 0;
  let triangles = 0;
  let skinnedDrawCalls = 0;
  root.traverse((object) => {
    if (object instanceof THREE.Bone) bones += 1;
    if (!(object instanceof THREE.Mesh)) return;
    meshes += 1;
    if (object instanceof THREE.SkinnedMesh) skinnedDrawCalls += Array.isArray(object.material) ? object.material.length : 1;
    const geometry = object.geometry;
    triangles += geometry.index ? geometry.index.count / 3 : geometry.getAttribute('position').count / 3;
    (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => materials.add(material));
  });
  return {
    bones,
    meshes,
    triangles: Math.round(triangles),
    materials: materials.size,
    skinnedDrawCalls,
  };
}

export function createCaretakerMaster(options: {
  quality?: CaretakerQuality;
  outfit?: CaretakerOutfitConfig;
  preservePartMeshes?: boolean;
} = {}): CaretakerModel {
  const quality = options.quality ?? 'high';
  const outfit = options.outfit ?? CROWN_OF_TIDES_OUTFIT;
  const materials = createMaterials(outfit, quality);
  const root = new THREE.Group();
  root.name = 'CARETAKER_MASTER_ROOT';
  const outfitRoot = new THREE.Group();
  outfitRoot.name = `CARETAKER_OUTFIT_ROOT_${outfit.id.toUpperCase().replace(/[^A-Z0-9]+/g, '_')}`;
  const rig = createRig();
  root.add(rig.hips);
  outfitRoot.position.y = -0.58;
  rig.hips.add(outfitRoot);
  const { leftEye, rightEye, mouth, surprisedMouth } = addCharacterGeometry(root, outfitRoot, rig, materials, quality, outfit);
  if (!options.preservePartMeshes) {
    compactStaticGeometry(outfitRoot, 'CARETAKER_OUTFIT_STATIC');
  }
  root.userData.sculptRuntime = {
    version: 1,
    domain: 'animated-character-outfit',
    rootPart: outfitRoot.name,
    primarySocket: rig.chest.name,
    interactionTarget: 'CARETAKER_MASTER_ROOT',
    animationStates: CARETAKER_ANIMATIONS.map((entry) => entry.id),
    emotionStates: CARETAKER_EMOTIONS.map((entry) => entry.id),
    capeModule: {
      id: outfit.id,
      ownerSocket: rig.chest.name,
      isolatedEvidenceQuery: 'part=cape',
      mapStrippedEvidenceQuery: 'part=cape&mapStripped=1',
    },
  };

  const skeletonHelper = new THREE.SkeletonHelper(rig.hips);
  skeletonHelper.name = 'CARETAKER_RIG_SKELETON_HELPER';
  skeletonHelper.visible = false;
  (skeletonHelper.material as THREE.LineBasicMaterial).color.set(0x7cf8ff);
  (skeletonHelper.material as THREE.LineBasicMaterial).depthTest = false;
  (skeletonHelper.material as THREE.LineBasicMaterial).transparent = true;
  (skeletonHelper.material as THREE.LineBasicMaterial).opacity = 0.92;
  root.add(skeletonHelper);

  const model = {
    root,
    outfitRoot,
    skeletonHelper,
    rig,
    leftEye,
    rightEye,
    mouth,
    surprisedMouth,
    eyeMaterial: materials.eye,
    metrics: computeMetrics(root),
    quality,
    outfit,
    animation: 'idle' as CaretakerAnimationId,
    previousAnimation: 'idle' as CaretakerAnimationId,
    animationChangedAt: 0,
    animationStartedAt: 0,
    previousAnimationStartedAt: 0,
    emotion: 'calm' as CaretakerEmotionId,
    setAnimation(animation: CaretakerAnimationId, nowSeconds = 0, restart = false) {
      if (model.animation === animation && !restart) return;
      model.previousAnimation = model.animation;
      model.previousAnimationStartedAt = model.animationStartedAt;
      model.animation = animation;
      model.animationChangedAt = nowSeconds;
      model.animationStartedAt = nowSeconds;
    },
    setEmotion(emotion: CaretakerEmotionId) {
      model.emotion = emotion;
    },
    setWireframe(enabled: boolean) {
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
        objectMaterials.forEach((material) => {
          if ('wireframe' in material) (material as THREE.MeshStandardMaterial).wireframe = enabled;
        });
      });
    },
    setSkeletonVisible(visible: boolean) {
      skeletonHelper.visible = visible;
    },
    update(elapsedSeconds: number, _deltaSeconds: number, reducedMotion = false) {
      resetRigPose(rig);
      // Reduced motion keeps the authored pose and expression but freezes the
      // looping gait/wave/bounce phase so the character never continuously
      // rocks in a board view after the user's accessibility preference wins.
      const poseElapsed = reducedMotion ? model.animationChangedAt + 0.5 : elapsedSeconds;
      applyBaseIdle(rig, poseElapsed, reducedMotion ? 0.16 : 1);
      const blendDuration = reducedMotion ? 0.01 : 0.34;
      const blend = THREE.MathUtils.smoothstep(
        Math.max(0, elapsedSeconds - model.animationChangedAt),
        0,
        blendDuration,
      );
      const previousClipElapsed = Math.max(0, poseElapsed - model.previousAnimationStartedAt);
      const currentClipElapsed = Math.max(0, poseElapsed - model.animationStartedAt);
      applyAnimationPose(rig, model.previousAnimation, previousClipElapsed, 1 - blend);
      applyAnimationPose(rig, model.animation, currentClipElapsed, blend);
      const capePendant = root.userData.caretakerCapePendant as THREE.Object3D | undefined;
      if (capePendant) {
        const swing = reducedMotion ? 0 : Math.sin(poseElapsed * 2.35) * 0.045;
        const motionWeight = model.animation === 'walk' ? 1.65 : model.animation === 'greet' ? 1.2 : 1;
        capePendant.rotation.z = swing * motionWeight;
        capePendant.rotation.x = Math.abs(swing) * -0.38;
      }
      updateFace(model, elapsedSeconds, reducedMotion);
      skeletonHelper.updateMatrixWorld(true);
    },
    dispose() {
      const geometries = new Set<THREE.BufferGeometry>();
      const disposableMaterials = new Set<THREE.Material>(Object.values(materials));
      geometries.add(mouth.geometry);
      geometries.add(surprisedMouth.geometry);
      root.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        geometries.add(object.geometry);
        (Array.isArray(object.material) ? object.material : [object.material]).forEach((material) => disposableMaterials.add(material));
      });
      geometries.forEach((geometry) => geometry.dispose());
      disposableMaterials.forEach((material) => material.dispose());
      disposableMaterials.forEach((material) => {
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) value.dispose();
        });
      });
      skeletonHelper.geometry.dispose();
      (skeletonHelper.material as THREE.Material).dispose();
    },
  } satisfies CaretakerModel;

  model.update(0, 0, false);
  return model;
}
