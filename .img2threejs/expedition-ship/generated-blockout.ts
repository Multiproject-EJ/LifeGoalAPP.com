import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { BokehPass } from 'three/examples/jsm/postprocessing/BokehPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export type ProceduralModelOptions = {
  wireframe?: boolean;
  castShadow?: boolean;
  receiveShadow?: boolean;
  textureSize?: number;
  textureAnisotropy?: number;
  qualityPriority?: 'reference-fidelity' | 'balanced';
};

export type ProceduralModelRuntime = {
  nodes: Record<string, THREE.Object3D>;
  meshes: Record<string, THREE.Mesh>;
  sockets: Record<string, THREE.Object3D>;
  colliders: Record<string, unknown>;
  destructionGroups: Record<string, THREE.Object3D[]>;
};

type SculptMaterialSpec = Record<string, any>;

function buildLatheGeometry(profile: { points: [number, number][]; segments?: number }): THREE.LatheGeometry {
  const points = profile.points.map(([x, y]) => new THREE.Vector2(Math.max(0.0001, x), y));
  return new THREE.LatheGeometry(points, profile.segments ?? 24);
}

// Plan 1.3 F.6 — sweep a thin 2D cross-section along a 3D spine so a curved
// form (hooked blade, handle) reads correctly from EVERY camera angle, not just
// the reference angle a flat extrude happens to match. Uses ExtrudeGeometry's
// native extrudePath; bevelEnabled: false keeps sharp tips (same rule as F.5).
function buildCurveSweepGeometry(
  sweep: { spine: [number, number, number][]; crossSection: { points: [number, number][] }; closed?: boolean },
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const cs = sweep.crossSection.points;
  if (cs.length > 0) {
    shape.moveTo(cs[0][0], cs[0][1]);
    for (let i = 1; i < cs.length; i += 1) shape.lineTo(cs[i][0], cs[i][1]);
    shape.closePath();
  }
  const spine = sweep.spine.map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const path = new THREE.CatmullRomCurve3(spine, sweep.closed ?? false);
  return new THREE.ExtrudeGeometry(shape, {
    extrudePath: path,
    steps: Math.max(24, spine.length * 8),
    bevelEnabled: false,
  });
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function readLayerNumber(value: unknown, keys: string[], fallback: number): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of keys) {
      if (typeof record[key] === 'number') return record[key] as number;
    }
  }
  return fallback;
}

function hexToRgb(hex: string): [number, number, number] {
  const normalized = /^#[0-9a-f]{3}$/i.test(hex)
    ? '#' + hex.slice(1).split('').map((part) => part + part).join('')
    : hex;
  const value = /^#[0-9a-f]{6}$/i.test(normalized) ? Number.parseInt(normalized.slice(1), 16) : 0x8a7a5f;
  return [clampAlbedoChannel((value >> 16) & 255), clampAlbedoChannel((value >> 8) & 255), clampAlbedoChannel(value & 255)];
}

function materialPalette(spec: SculptMaterialSpec): string[] {
  const palette = spec.colorVariation?.palette;
  if (Array.isArray(palette) && palette.length > 0) return palette.filter((value) => typeof value === 'string');
  const secondary = spec.albedo?.secondary;
  const colors = [spec.baseColor ?? spec.color ?? spec.albedo?.dominant, ...(Array.isArray(secondary) ? secondary : [])];
  return colors.filter((value): value is string => typeof value === 'string' && value.startsWith('#'));
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function clampAlbedoChannel(value: number): number {
  return Math.max(30, Math.min(240, Math.round(value)));
}

function clampPbrF0(value: number): number {
  return Math.max(0.02, Math.min(1, value));
}

function clampPbrIor(value: number): number {
  return Math.max(1, Math.min(2.5, value));
}

function clampPbrMetalness(value: number): number {
  return value >= 0.5 ? 1 : 0;
}

function clampedAlbedoColor(spec: SculptMaterialSpec): THREE.Color {
  const source = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const [red, green, blue] = hexToRgb(source);
  return new THREE.Color(red / 255, green / 255, blue / 255);
}

function smoothCurve(value: number): number {
  return value * value * (3 - 2 * value);
}

function periodicHash(x: number, y: number, seed: number, periodX: number, periodY: number): number {
  const wrappedX = ((x % periodX) + periodX) % periodX;
  const wrappedY = ((y % periodY) + periodY) % periodY;
  let value = Math.imul(wrappedX + seed * 17, 374761393) ^ Math.imul(wrappedY + seed * 31, 668265263);
  value = Math.imul(value ^ (value >>> 13), 1274126177);
  return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
}

function periodicValueNoise(u: number, v: number, seed: number, periodX: number, periodY: number): number {
  const x = u * periodX;
  const y = v * periodY;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const tx = smoothCurve(x - x0);
  const ty = smoothCurve(y - y0);
  const a = periodicHash(x0, y0, seed, periodX, periodY);
  const b = periodicHash(x0 + 1, y0, seed, periodX, periodY);
  const c = periodicHash(x0, y0 + 1, seed, periodX, periodY);
  const d = periodicHash(x0 + 1, y0 + 1, seed, periodX, periodY);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, tx), THREE.MathUtils.lerp(c, d, tx), ty);
}

type SurfaceBand = {
  frequency: number;
  amplitude: number;
  stretchX: number;
  stretchY: number;
  ridge: boolean;
};

function surfaceBands(spec: SculptMaterialSpec): SurfaceBand[] {
  const source = Array.isArray(spec.surfaceFrequencyBands) ? spec.surfaceFrequencyBands : [];
  const parsed = source.flatMap((item: unknown) => {
    if (!item || typeof item !== 'object') return [];
    const band = item as Record<string, unknown>;
    const frequency = typeof band.frequency === 'number' ? band.frequency : 0;
    const amplitude = typeof band.amplitude === 'number' ? band.amplitude : 0;
    if (frequency <= 0 || amplitude <= 0) return [];
    const stretch = Array.isArray(band.stretch) ? band.stretch : [1, 1];
    const description = `${String(band.pattern ?? '')} ${String(band.role ?? '')}`.toLowerCase();
    return [{
      frequency,
      amplitude,
      stretchX: typeof stretch[0] === 'number' ? Math.max(0.1, stretch[0]) : 1,
      stretchY: typeof stretch[1] === 'number' ? Math.max(0.1, stretch[1]) : 1,
      ridge: /(ridge|groove|grain|fiber|striated|crack)/.test(description),
    }];
  });
  return parsed.length > 0 ? parsed : [
    { frequency: 2, amplitude: 0.42, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 12, amplitude: 0.22, stretchX: 1, stretchY: 1, ridge: false },
    { frequency: 56, amplitude: 0.08, stretchX: 1, stretchY: 1, ridge: false },
  ];
}

function sampleSurface(u: number, v: number, bands: SurfaceBand[], seed: number): number {
  let value = 0;
  let weight = 0;
  for (let index = 0; index < bands.length; index += 1) {
    const band = bands[index];
    const periodX = Math.max(1, Math.round(band.frequency * band.stretchX));
    const periodY = Math.max(1, Math.round(band.frequency * band.stretchY));
    let sample = periodicValueNoise(u, v, seed + index * 1013, periodX, periodY);
    if (band.ridge) sample = 1 - Math.abs(sample * 2 - 1);
    value += sample * band.amplitude;
    weight += band.amplitude;
  }
  return weight > 0 ? clamp01(value / weight) : 0.5;
}

function mixPalette(colors: [number, number, number][], value: number): [number, number, number] {
  if (colors.length === 1) return colors[0];
  const scaled = clamp01(value) * (colors.length - 1);
  const index = Math.min(colors.length - 2, Math.floor(scaled));
  const mix = scaled - index;
  const a = colors[index];
  const b = colors[index + 1];
  return [
    Math.round(THREE.MathUtils.lerp(a[0], b[0], mix)),
    Math.round(THREE.MathUtils.lerp(a[1], b[1], mix)),
    Math.round(THREE.MathUtils.lerp(a[2], b[2], mix)),
  ];
}

type ColorGradientStop = { offset: number; color: string };
type ColorGradientSpec = {
  type: 'linear' | 'radial';
  axis: [number, number];
  stops: ColorGradientStop[];
};

function parseRgba(value: string): [number, number, number] {
  const match = /rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/.exec(value);
  if (!match) return [138, 122, 95];
  return [clampAlbedoChannel(Number(match[1])), clampAlbedoChannel(Number(match[2])), clampAlbedoChannel(Number(match[3]))];
}

// Analytical per-pixel gradient sample. The extraction schema's colorGradient carries
// exact rgba(...) stop colors (see extract_part_color_recipe.py), so this samples the
// same trend directly in JS math rather than round-tripping through a Canvas 2D
// createLinearGradient/createRadialGradient object — same visual result, and it composes
// directly with the existing noise/height-correlated colorVariation blend below.
function sampleColorGradient(gradient: ColorGradientSpec, u: number, v: number): [number, number, number] {
  const stops = gradient.stops.length >= 2 ? gradient.stops : [{ offset: 0, color: 'rgba(138,122,95,1)' }, { offset: 1, color: 'rgba(138,122,95,1)' }];
  let t: number;
  if (gradient.type === 'radial') {
    const [cx, cy] = gradient.axis;
    const dx = u - cx;
    const dy = v - cy;
    const maxRadius = Math.max(0.001, Math.hypot(Math.max(cx, 1 - cx), Math.max(cy, 1 - cy)));
    t = clamp01(Math.hypot(dx, dy) / maxRadius);
  } else {
    const [ax, ay] = gradient.axis;
    const projection = (u - 0.5) * ax + (v - 0.5) * ay;
    const maxProjection = 0.5 * (Math.abs(ax) + Math.abs(ay)) || 0.5;
    t = clamp01(projection / maxProjection + 0.5);
  }
  const scaled = t * (stops.length - 1);
  const index = Math.min(stops.length - 2, Math.max(0, Math.floor(scaled)));
  const mix = scaled - index;
  const a = parseRgba(stops[index].color);
  const b = parseRgba(stops[index + 1].color);
  return [
    THREE.MathUtils.lerp(a[0], b[0], mix),
    THREE.MathUtils.lerp(a[1], b[1], mix),
    THREE.MathUtils.lerp(a[2], b[2], mix),
  ];
}

function writePixel(data: Uint8ClampedArray, offset: number, red: number, green: number, blue: number): void {
  data[offset] = Math.max(0, Math.min(255, Math.round(red)));
  data[offset + 1] = Math.max(0, Math.min(255, Math.round(green)));
  data[offset + 2] = Math.max(0, Math.min(255, Math.round(blue)));
  data[offset + 3] = 255;
}

function makeCanvas(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  return canvas;
}

function createMapTexture(
  canvas: HTMLCanvasElement,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [2, 2];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 2,
    typeof repeat[1] === 'number' ? repeat[1] : 2,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

type ProceduralTextureSet = {
  albedo: THREE.Texture;
  roughness: THREE.Texture;
  height: THREE.Texture;
  normal: THREE.Texture;
  ao: THREE.Texture;
  source: 'reference-pixel-extraction' | 'procedural';
};

function referenceMapUrl(spec: SculptMaterialSpec, channel: string): string | null {
  const reference = spec.referencePbr;
  if (!reference || typeof reference !== 'object') return null;
  if (reference.usable === false) return null;
  const confidence = typeof reference.confidence === 'number'
    ? reference.confidence
    : (typeof reference.estimatedFidelity === 'number' ? reference.estimatedFidelity : 0);
  const threshold = typeof reference.targetThreshold === 'number' ? reference.targetThreshold : 0.7;
  if (confidence < threshold) return null;
  const maps = reference.maps;
  if (!maps || typeof maps !== 'object') return null;
  const map = (maps as Record<string, unknown>)[channel];
  if (!map || typeof map !== 'object') return null;
  const record = map as Record<string, unknown>;
  const url = typeof record.url === 'string' && record.url.trim() ? record.url : record.path;
  return typeof url === 'string' && url.trim() ? url : null;
}

function createLoadedMapTexture(
  url: string,
  colorSpace: THREE.ColorSpace,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): THREE.Texture {
  const texture = new THREE.TextureLoader().load(url);
  const projection = spec.textureProjection && typeof spec.textureProjection === 'object' ? spec.textureProjection : {};
  const repeat = Array.isArray(projection.repeat) ? projection.repeat : [1, 1];
  texture.colorSpace = colorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(
    typeof repeat[0] === 'number' ? repeat[0] : 1,
    typeof repeat[1] === 'number' ? repeat[1] : 1,
  );
  texture.anisotropy = Math.max(1, Math.round(options.textureAnisotropy ?? projection.anisotropy ?? 8));
  texture.needsUpdate = true;
  return texture;
}

function makeReferenceTextureSet(spec: SculptMaterialSpec, options: ProceduralModelOptions): ProceduralTextureSet | null {
  const albedo = referenceMapUrl(spec, 'albedo');
  const roughness = referenceMapUrl(spec, 'roughness');
  const height = referenceMapUrl(spec, 'height');
  const normal = referenceMapUrl(spec, 'normal');
  const ao = referenceMapUrl(spec, 'ao');
  if (!albedo || !roughness || !height || !normal || !ao) return null;
  return {
    albedo: createLoadedMapTexture(albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createLoadedMapTexture(roughness, THREE.NoColorSpace, spec, options),
    height: createLoadedMapTexture(height, THREE.NoColorSpace, spec, options),
    normal: createLoadedMapTexture(normal, THREE.NoColorSpace, spec, options),
    ao: createLoadedMapTexture(ao, THREE.NoColorSpace, spec, options),
    source: 'reference-pixel-extraction',
  };
}

function makeProceduralTextureSet(
  id: string,
  spec: SculptMaterialSpec,
  options: ProceduralModelOptions,
): ProceduralTextureSet | null {
  if (typeof document === 'undefined') return null;
  const qualityFirst = (options.qualityPriority ?? 'reference-fidelity') === 'reference-fidelity';
  const requested = options.textureSize ?? spec.textureResolution;
  const requestedSize = typeof requested === 'number' && Number.isFinite(requested)
    ? requested
    : (qualityFirst ? 1024 : 512);
  const size = Math.max(256, Math.min(2048, 2 ** Math.round(Math.log2(requestedSize))));
  const canvases = {
    albedo: makeCanvas(size),
    roughness: makeCanvas(size),
    height: makeCanvas(size),
    normal: makeCanvas(size),
    ao: makeCanvas(size),
  };
  const contexts = {
    albedo: canvases.albedo.getContext('2d'),
    roughness: canvases.roughness.getContext('2d'),
    height: canvases.height.getContext('2d'),
    normal: canvases.normal.getContext('2d'),
    ao: canvases.ao.getContext('2d'),
  };
  if (!contexts.albedo || !contexts.roughness || !contexts.height || !contexts.normal || !contexts.ao) return null;
  const images = {
    albedo: contexts.albedo.createImageData(size, size),
    roughness: contexts.roughness.createImageData(size, size),
    height: contexts.height.createImageData(size, size),
    normal: contexts.normal.createImageData(size, size),
    ao: contexts.ao.createImageData(size, size),
  };
  const seed = hashString(id);
  const bands = surfaceBands(spec);
  const heightField = new Float32Array(size * size);
  const roughnessField = new Float32Array(size * size);
  const palette = materialPalette(spec);
  const fallback = typeof spec.baseColor === 'string' ? spec.baseColor : '#8A7A5F';
  const colors = (palette.length >= 2 ? palette : [fallback, '#6E614B', '#A08F70']).map(hexToRgb);
  const baseRoughness = clamp01(readLayerNumber(spec.roughness, ['base'], 0.76));
  const roughnessVariation = clamp01(readLayerNumber(spec.roughness, ['variation'], 0.18));
  const colorAmplitude = clamp01(readLayerNumber(spec.colorVariation, ['amplitude', 'variation'], 0.18));
  const heightCorrelation = clamp01(readLayerNumber(spec.colorVariation, ['heightCorrelation'], 0.3));
  const colorGradient: ColorGradientSpec | undefined = spec.colorGradient;
  for (let y = 0; y < size; y += 1) {
    const v = y / size;
    for (let x = 0; x < size; x += 1) {
      const u = x / size;
      const index = y * size + x;
      const height = sampleSurface(u, v, bands, seed + 101);
      const roughNoise = sampleSurface(u, v, bands, seed + 7001);
      const colorNoise = sampleSurface(u, v, bands, seed + 15013);
      heightField[index] = height;
      roughnessField[index] = clamp01(baseRoughness + (roughNoise - 0.5) * roughnessVariation * 2);
      let color: [number, number, number];
      if (colorGradient) {
        // Evidence-derived spatial gradient (Plan 1.3 Workstream C) takes priority
        // over the noise-based palette blend below — it is a measured trend, not a guess.
        color = sampleColorGradient(colorGradient, u, v);
      } else {
        const paletteValue = clamp01(
          0.5 + (colorNoise - 0.5) * colorAmplitude * 2 + (height - 0.5) * heightCorrelation
        );
        color = mixPalette(colors, paletteValue);
      }
      writePixel(images.albedo.data, index * 4, color[0], color[1], color[2]);
    }
  }
  const normalStrength = Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35));
  const aoStrength = clamp01(readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35));
  for (let y = 0; y < size; y += 1) {
    const up = ((y - 1 + size) % size) * size;
    const down = ((y + 1) % size) * size;
    for (let x = 0; x < size; x += 1) {
      const left = (x - 1 + size) % size;
      const right = (x + 1) % size;
      const index = y * size + x;
      const center = heightField[index];
      const dx = (heightField[y * size + right] - heightField[y * size + left]) * normalStrength * 6;
      const dy = (heightField[down + x] - heightField[up + x]) * normalStrength * 6;
      const inverseLength = 1 / Math.sqrt(dx * dx + dy * dy + 1);
      const normalX = -dx * inverseLength;
      const normalY = -dy * inverseLength;
      const normalZ = inverseLength;
      const neighborAverage = (
        heightField[y * size + left] + heightField[y * size + right]
        + heightField[up + x] + heightField[down + x]
      ) * 0.25;
      const cavity = Math.max(0, neighborAverage - center);
      const ao = clamp01(1 - aoStrength * (cavity * 12 + (1 - center) * 0.16));
      const offset = index * 4;
      const heightByte = center * 255;
      const roughnessByte = roughnessField[index] * 255;
      writePixel(images.height.data, offset, heightByte, heightByte, heightByte);
      writePixel(images.roughness.data, offset, roughnessByte, roughnessByte, roughnessByte);
      writePixel(
        images.normal.data, offset,
        (normalX * 0.5 + 0.5) * 255,
        (normalY * 0.5 + 0.5) * 255,
        (normalZ * 0.5 + 0.5) * 255,
      );
      writePixel(images.ao.data, offset, ao * 255, ao * 255, ao * 255);
    }
  }
  contexts.albedo.putImageData(images.albedo, 0, 0);
  contexts.roughness.putImageData(images.roughness, 0, 0);
  contexts.height.putImageData(images.height, 0, 0);
  contexts.normal.putImageData(images.normal, 0, 0);
  contexts.ao.putImageData(images.ao, 0, 0);
  return {
    albedo: createMapTexture(canvases.albedo, THREE.SRGBColorSpace, spec, options),
    roughness: createMapTexture(canvases.roughness, THREE.NoColorSpace, spec, options),
    height: createMapTexture(canvases.height, THREE.NoColorSpace, spec, options),
    normal: createMapTexture(canvases.normal, THREE.NoColorSpace, spec, options),
    ao: createMapTexture(canvases.ao, THREE.NoColorSpace, spec, options),
    source: 'procedural',
  };
}

function createSculptMaterial(id: string, spec: SculptMaterialSpec, options: ProceduralModelOptions, denseComponent = false): THREE.MeshPhysicalMaterial {
  const textures = makeReferenceTextureSet(spec, options) ?? makeProceduralTextureSet(id, spec, options);
  const material = new THREE.MeshPhysicalMaterial({
    color: textures ? 0xffffff : clampedAlbedoColor(spec),
    roughness: textures ? 1 : clamp01(readLayerNumber(spec.roughness, ['base'], 0.76)),
    metalness: clampPbrMetalness(readLayerNumber(spec.metalness, ['base'], 0.0)),
    clearcoat: clamp01(readLayerNumber(spec.clearcoat, ['base', 'amount'], 0)),
    clearcoatRoughness: clamp01(readLayerNumber(spec.clearcoatRoughness, ['base'], 0.25)),
    transmission: clamp01(readLayerNumber(spec.transmission, ['base', 'amount'], 0)),
    ior: clampPbrIor(readLayerNumber(spec.ior, ['base', 'value'], 1.5)),
    thickness: Math.max(0, readLayerNumber(spec.thickness, ['base', 'amount'], 0)),
    attenuationDistance: Math.max(0.001, readLayerNumber(spec.attenuationDistance, ['base', 'value'], Infinity)),
    attenuationColor: new THREE.Color(typeof spec.attenuationColor === 'string' ? spec.attenuationColor : '#ffffff'),
    sheen: clamp01(readLayerNumber(spec.sheen, ['base', 'amount'], 0)),
    sheenColor: new THREE.Color(typeof spec.sheenColor === 'string' ? spec.sheenColor : '#ffffff'),
    sheenRoughness: clamp01(readLayerNumber(spec.sheenRoughness, ['base'], 1.0)),
    iridescence: clamp01(readLayerNumber(spec.iridescence, ['base', 'amount'], 0)),
    iridescenceIOR: clampPbrIor(readLayerNumber(spec.iridescenceIOR, ['base', 'value'], 1.3)),
    anisotropy: clamp01(readLayerNumber(spec.anisotropy, ['base', 'amount'], 0)),
    anisotropyRotation: readLayerNumber(spec.anisotropy, ['rotation'], 0),
    specularIntensity: clampPbrF0(readLayerNumber(spec.specularF0 ?? spec.f0 ?? spec.specularIntensity, ['base', 'value'], 1.0)),
    specularColor: new THREE.Color(typeof spec.specularColor === 'string' ? spec.specularColor : '#ffffff'),
    emissive: new THREE.Color(typeof spec.emissive === 'string' ? spec.emissive : '#000000'),
    emissiveIntensity: Math.max(0, readLayerNumber(spec.emissiveIntensity, ['base'], 1.0)),
    opacity: clamp01(readLayerNumber(spec.opacity, ['base'], 1)),
    transparent: readLayerNumber(spec.transmission, ['base', 'amount'], 0) > 0 || readLayerNumber(spec.opacity, ['base'], 1) < 1,
    alphaTest: Math.max(0, readLayerNumber(spec.alpha, ['cutoff', 'alphaTest'], 0)),
    wireframe: options.wireframe ?? false,
    side: spec.doubleSided === true ? THREE.DoubleSide : THREE.FrontSide,
    flatShading: spec.flatShading === true,
  });
  if (textures) {
    material.map = textures.albedo;
    material.roughnessMap = textures.roughness;
    material.normalMap = textures.normal;
    material.normalScale.setScalar(Math.max(0.05, readLayerNumber(spec.normal, ['strength', 'amplitude'], 0.35)));
    material.aoMap = textures.ao;
    material.aoMap.channel = 0;
    material.aoMapIntensity = readLayerNumber(spec.ambientOcclusion, ['cavityStrength', 'strength'], 0.35);
    const denseMesh = denseComponent || spec.denseMesh === true || spec.geometryDensity === 'dense' || spec.topologyClass === 'dense';
    const bumpScale = Math.max(0, readLayerNumber(spec.bump, ['amplitude', 'strength'], 0));
    const effectiveBumpScale = denseMesh ? Math.max(0.05, bumpScale) : bumpScale;
    if (effectiveBumpScale > 0) {
      material.bumpMap = textures.height;
      material.bumpScale = effectiveBumpScale;
    }
    const displacementScale = Math.max(0, readLayerNumber(spec.displacement, ['amplitude', 'strength'], 0));
    const effectiveDisplacementScale = denseMesh ? Math.max(0.005, displacementScale) : displacementScale;
    if (effectiveDisplacementScale > 0) {
      material.displacementMap = textures.height;
      material.displacementScale = effectiveDisplacementScale;
      material.displacementBias = -effectiveDisplacementScale * 0.5;
    }
  }
  material.envMapIntensity = readLayerNumber(spec, ['envMapIntensity'], 0.8);
  material.userData.sculptMaterial = spec;
  material.userData.proceduralMapsIndependent = true;
  material.userData.pbrConstraints = { albedoRange: [30, 240], binaryMetalness: true, f0Range: [0.02, 1], iorRange: [1, 2.5] };
  material.userData.pbrTextureSource = textures?.source ?? 'flat-fallback';
  material.userData.referencePbr = spec.referencePbr ?? null;
  material.userData.referenceMaterialId = spec.referenceMaterialId ?? spec.materialReference?.profileId ?? null;
  material.userData.materialEvidence = spec.materialEvidence ?? null;
  material.userData.validationViews = spec.materialReference?.validationViews ?? [];
  material.needsUpdate = true;
  return material;
}

type AttachmentEndpoint = {
  start: THREE.Vector3;
  midpoint: THREE.Vector3;
  quaternion: THREE.Quaternion;
  length: number;
  baseRadius: number;
  endRadius: number;
};

function readVector3(value: unknown, fallback: [number, number, number]): THREE.Vector3 {
  if (Array.isArray(value) && value.length === 3 && value.every((item) => typeof item === 'number')) {
    return new THREE.Vector3(value[0], value[1], value[2]);
  }
  return new THREE.Vector3(fallback[0], fallback[1], fallback[2]);
}

function readNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function makeAttachmentEndpoint(attachment: unknown): AttachmentEndpoint | null {
  if (!attachment || typeof attachment !== 'object') return null;
  const record = attachment as Record<string, unknown>;
  const start = readVector3(record.localStart, [0, 0, 0]);
  const end = readVector3(record.localEnd, [0, 1, 0]);
  const delta = end.clone().sub(start);
  const length = delta.length();
  if (length <= 0.0001) return null;
  const direction = delta.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  const baseRadius = Math.max(0.005, readNumber(record.baseRadius, 0.06));
  const endRadius = Math.max(0.003, readNumber(record.endRadius, baseRadius * 0.55));
  return {
    start,
    midpoint: delta.multiplyScalar(0.5),
    quaternion,
    length,
    baseRadius,
    endRadius,
  };
}

// Generated from ObjectSculptSpec target: HabitGame Expedition Ship
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createHabitGameExpeditionShipModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "HabitGame Expedition Ship";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": {"solved": false, "fovDegrees": 40, "aspect": 1, "orientation": {"yaw": 0, "pitch": 0, "roll": 0}, "positionHint": [0, 0, 3], "note": "For likeness work, solve the reference camera (forge/stage1_intake/solve_camera_pose.py) so the review render aligns with the photo and the reference can be projected. Confirm by overlay review."}, "approximationNotes": []};
  root.userData.materialPipeline = {};
  root.userData.materialReferenceRegistry = null;

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["white-ceramic-shell"] = createSculptMaterial(
    "white-ceramic-shell",
    {"id": "white-ceramic-shell", "name": "Warm white ceramic composite shell", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#DEDCD6", "color": "#DEDCD6", "albedo": {"dominant": "#DEDCD6", "secondary": ["#AEB5BA"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#DEDCD6", "#AEB5BA"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.32, "variation": 0.06, "map": "white-ceramic-shell-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.08, "variation": 0.02}, "normal": {"pattern": "white-ceramic-shell-independent-normal", "strength": 0.12, "scale": 28, "space": "tangent"}, "bump": {"pattern": "white-ceramic-shell-independent-height", "amplitude": 0.012, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "clearcoat-response", "region": "broad shell crowns and chamfer highlights", "roughness": 0.28, "strength": 0.45, "evidenceRefs": ["full-object"]}, {"id": "service-panel-lines", "region": "sparse shell service seams", "roughness": 0.52, "strength": 0.22, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.55, "clearcoatRoughness": 0.18, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45},
    options
  );
  materialMap["dark-structural-frame"] = createSculptMaterial(
    "dark-structural-frame",
    {"id": "dark-structural-frame", "name": "Charcoal coated structural frame", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#18212A", "color": "#18212A", "albedo": {"dominant": "#18212A", "secondary": ["#3B4854"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#18212A", "#3B4854"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.48, "variation": 0.06, "map": "dark-structural-frame-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.72, "variation": 0.02}, "normal": {"pattern": "dark-structural-frame-independent-normal", "strength": 0.09, "scale": 28, "space": "tangent"}, "bump": {"pattern": "dark-structural-frame-independent-height", "amplitude": 0.012, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.025, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "dark-structural-frame-local-response", "region": "component seams, protected cavities and exposed service edges", "roughness": 0.54, "strength": 0.18, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.08, "clearcoatRoughness": 0.22, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45},
    options
  );
  materialMap["smoked-bridge-glass"] = createSculptMaterial(
    "smoked-bridge-glass",
    {"id": "smoked-bridge-glass", "name": "Smoked panoramic bridge glass", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#132A38", "color": "#132A38", "albedo": {"dominant": "#132A38", "secondary": ["#3E819E"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#132A38", "#3E819E"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.08, "variation": 0.06, "map": "smoked-bridge-glass-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.05, "variation": 0.02}, "normal": {"pattern": "smoked-bridge-glass-independent-normal", "strength": 0.12, "scale": 28, "space": "tangent"}, "bump": {"pattern": "smoked-bridge-glass-independent-height", "amplitude": 0.002, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "forward-visor", "region": "forward bridge crown", "roughness": 0.06, "strength": 0.5, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 1, "clearcoatRoughness": 0.04, "emissive": "#000000", "emissiveIntensity": 0, "transparent": true, "opacity": 0.76, "transmission": 0.22, "ior": 1.45},
    options
  );
  materialMap["garden-shield-glass"] = createSculptMaterial(
    "garden-shield-glass",
    {"id": "garden-shield-glass", "name": "Retractable garden shield glazing", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#315D69", "color": "#315D69", "albedo": {"dominant": "#315D69", "secondary": ["#75C8D7"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#315D69", "#75C8D7"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.1, "variation": 0.06, "map": "garden-shield-glass-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.02, "variation": 0.02}, "normal": {"pattern": "garden-shield-glass-independent-normal", "strength": 0.12, "scale": 28, "space": "tangent"}, "bump": {"pattern": "garden-shield-glass-independent-height", "amplitude": 0.002, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "garden-shield-glass-local-response", "region": "component seams, protected cavities and exposed service edges", "roughness": 0.16, "strength": 0.18, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 1, "clearcoatRoughness": 0.05, "emissive": "#000000", "emissiveIntensity": 0, "transparent": true, "opacity": 0.34, "transmission": 0.65, "ior": 1.45},
    options
  );
  materialMap["warm-window-glass"] = createSculptMaterial(
    "warm-window-glass",
    {"id": "warm-window-glass", "name": "Warm inhabited deck window glass", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#2B221E", "color": "#2B221E", "albedo": {"dominant": "#2B221E", "secondary": ["#FFB45B"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#2B221E", "#FFB45B"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.24, "variation": 0.06, "map": "warm-window-glass-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.05, "variation": 0.02}, "normal": {"pattern": "warm-window-glass-independent-normal", "strength": 0.12, "scale": 28, "space": "tangent"}, "bump": {"pattern": "warm-window-glass-independent-height", "amplitude": 0.012, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "deck-window-bands", "region": "three occupied deck bands per wing and centre spine", "roughness": 0.2, "strength": 0.72, "evidenceRefs": ["full-object"]}, {"id": "guide-light-family", "region": "keel, garage and lower-shell approach lights", "roughness": 0.16, "strength": 0.8, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.08, "clearcoatRoughness": 0.22, "emissive": "#FF8B35", "emissiveIntensity": 1.25, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45},
    options
  );
  materialMap["blue-power-glass"] = createSculptMaterial(
    "blue-power-glass",
    {"id": "blue-power-glass", "name": "Cyan power and propulsion glass", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#154B6A", "color": "#154B6A", "albedo": {"dominant": "#154B6A", "secondary": ["#6DD8FF"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#154B6A", "#6DD8FF"], "pattern": "subtle object-space manufacturing variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.16, "variation": 0.06, "map": "blue-power-glass-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0.12, "variation": 0.02}, "normal": {"pattern": "blue-power-glass-independent-normal", "strength": 0.12, "scale": 28, "space": "tangent"}, "bump": {"pattern": "blue-power-glass-independent-height", "amplitude": 0.012, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "power-node-family", "region": "tower caps, hinge nodes, keel locks, thrusters and lift emitters", "roughness": 0.12, "strength": 0.9, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.8, "clearcoatRoughness": 0.08, "emissive": "#2EAFFF", "emissiveIntensity": 1.4, "transparent": true, "opacity": 0.82, "transmission": 0, "ior": 1.45},
    options
  );
  materialMap["garden-foliage"] = createSculptMaterial(
    "garden-foliage",
    {"id": "garden-foliage", "name": "Living garden foliage", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#356934", "color": "#356934", "albedo": {"dominant": "#356934", "secondary": ["#91B75C"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#356934", "#91B75C"], "pattern": "leaf-cluster and moss variation", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.78, "variation": 0.06, "map": "garden-foliage-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0, "variation": 0.02}, "normal": {"pattern": "garden-foliage-independent-normal", "strength": 0.22, "scale": 28, "space": "tangent"}, "bump": {"pattern": "garden-foliage-independent-height", "amplitude": 0.03, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.04, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "garden-foliage-local-response", "region": "component seams, protected cavities and exposed service edges", "roughness": 0.8400000000000001, "strength": 0.18, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.05, "clearcoatRoughness": 0.22, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45},
    options
  );
  materialMap["great-tree-bark"] = createSculptMaterial(
    "great-tree-bark",
    {"id": "great-tree-bark", "name": "Great Tree bark", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#493320", "color": "#493320", "albedo": {"dominant": "#493320", "secondary": ["#895F35"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#493320", "#895F35"], "pattern": "vertical bark furrows and root plates", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.86, "variation": 0.06, "map": "great-tree-bark-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0, "variation": 0.02}, "normal": {"pattern": "great-tree-bark-independent-normal", "strength": 0.28, "scale": 28, "space": "tangent"}, "bump": {"pattern": "great-tree-bark-independent-height", "amplitude": 0.06, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.08, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "great-tree-bark-local-response", "region": "component seams, protected cavities and exposed service edges", "roughness": 0.9199999999999999, "strength": 0.18, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 0.08, "clearcoatRoughness": 0.22, "emissive": "#000000", "emissiveIntensity": 0, "transparent": false, "opacity": 1, "transmission": 0, "ior": 1.45},
    options
  );
  materialMap["atrium-water"] = createSculptMaterial(
    "atrium-water",
    {"id": "atrium-water", "name": "Garden stream water", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#238E9F", "color": "#238E9F", "albedo": {"dominant": "#238E9F", "secondary": ["#7BD9DA"], "samplingNotes": "Reference-guided de-lit intent; cinematic lighting is not baked into albedo."}, "colorVariation": {"palette": ["#238E9F", "#7BD9DA"], "pattern": "slow coherent stream ripples", "amplitude": 0.035, "heightCorrelation": 0.1}, "textureResolution": 1024, "textureProjection": {"mode": "object-space-procedural", "repeat": [3, 3], "anisotropy": 8, "texelDensityIntent": "Stable metre-scale detail; phone overview keeps broad surfaces clean."}, "surfaceFrequencyBands": [{"id": "macro", "frequency": 0.8, "amplitude": 0.035, "role": "broad manufactured or organic color response"}, {"id": "meso", "frequency": 8, "amplitude": 0.018, "role": "panel, grain, bark, leaf, or glazing breakup"}, {"id": "micro", "frequency": 42, "amplitude": 0.006, "role": "grazing highlight breakup only"}], "roughness": {"base": 0.06, "variation": 0.06, "map": "atrium-water-independent-roughness", "localResponse": "cavities rougher; handled edges slightly smoother"}, "metalness": {"base": 0, "variation": 0.02}, "normal": {"pattern": "atrium-water-independent-normal", "strength": 0.1, "scale": 28, "space": "tangent"}, "bump": {"pattern": "atrium-water-independent-height", "amplitude": 0.004, "scale": 18}, "displacement": {"pattern": "none", "amplitude": 0, "scale": 1, "silhouetteAffects": false}, "ambientOcclusion": {"cavityStrength": 0.24, "contactShadowBias": 0.32, "notes": "Concentrate only in true seams, sockets, overlaps, bark and foliage cavities."}, "wear": {"edgeWear": 0.015, "scratches": ["restrained maintenance-direction marks"], "chips": []}, "dirt": {"amount": 0.018, "cavityBias": 0.65, "color": "#12171B"}, "localOverrides": [{"id": "atrium-water-local-response", "region": "component seams, protected cavities and exposed service edges", "roughness": 0.12, "strength": 0.18, "evidenceRefs": ["full-object"]}], "shaderNotes": ["Independent albedo, roughness, normal/height and AO fields.", "No baked cinematic highlights in albedo."], "notes": "Procedural PBR built from observed material family; hidden-side response remains inferred.", "clearcoat": 1, "clearcoatRoughness": 0.03, "emissive": "#000000", "emissiveIntensity": 0, "transparent": true, "opacity": 0.72, "transmission": 0.45, "ior": 1.45},
    options
  );

  const nodes: Record<string, THREE.Object3D> = { root };
  const meshes: Record<string, THREE.Mesh> = {};
  const sockets: Record<string, THREE.Object3D> = {};
  const colliders: Record<string, unknown> = {};
  const destructionGroups: Record<string, THREE.Object3D[]> = {};

  const attachment_root_0 = null;
  const endpoint_root_0 = makeAttachmentEndpoint(attachment_root_0);
  const node_root_0 = new THREE.Group();
  node_root_0.name = "Expedition Ship root__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_root_0.position.set(0.0, 0.0, 0.0);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Expedition Ship root", "level": "macro", "role": "transform-root", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": null, "attachment": null, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_root_0.userData.actionProfile = {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0
    ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_root_0.name = "Expedition Ship root";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Expedition Ship root", "level": "macro", "role": "transform-root", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": null, "attachment": null, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "transform-root", "pivot": {"mode": "center", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": false, "rotate": false, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"}, {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"}], "collider": {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {"type": "compound", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_root_0);
  const socket_root_camera_exterior_0 = new THREE.Object3D();
  socket_root_camera_exterior_0.name = "camera-exterior";
  socket_root_camera_exterior_0.position.set(0.0, 0.0, 0.0);
  socket_root_camera_exterior_0.rotation.set(0, 0, 0);
  socket_root_camera_exterior_0.userData.socket = {"id": "camera-exterior", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "camera-exterior"};
  node_root_0.add(socket_root_camera_exterior_0);
  sockets["root:camera-exterior"] = socket_root_camera_exterior_0;
  const socket_root_environment_downwash_origin_1 = new THREE.Object3D();
  socket_root_environment_downwash_origin_1.name = "environment-downwash-origin";
  socket_root_environment_downwash_origin_1.position.set(0.0, 0.0, 0.0);
  socket_root_environment_downwash_origin_1.rotation.set(0, 0, 0);
  socket_root_environment_downwash_origin_1.userData.socket = {"id": "environment-downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "environment-downwash-origin"};
  node_root_0.add(socket_root_environment_downwash_origin_1);
  sockets["root:environment-downwash-origin"] = socket_root_environment_downwash_origin_1;

  const attachment_center_spine_1 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_center_spine_1 = makeAttachmentEndpoint(attachment_center_spine_1);
  const node_center_spine_1 = new THREE.Group();
  node_center_spine_1.name = "Fixed inhabited centre spine__pivot";
  node_center_spine_1.scale.set(1, 1, 1);
  if (endpoint_center_spine_1) {
    node_center_spine_1.position.copy(endpoint_center_spine_1.start);
    node_center_spine_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_center_spine_1.position.set(0.0, 0.0, 0.0);
    node_center_spine_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_center_spine_1.userData.sculptComponent = {"id": "center-spine", "name": "Fixed inhabited centre spine", "level": "macro", "role": "fixed-occupied-spine", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "fixed-occupied-spine", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-atrium-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-atrium-socket"}, {"id": "garage-belly-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-belly-socket"}, {"id": "landing-keel-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "landing-keel-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_center_spine_1.userData.actionProfile = {"animationRole": "fixed-occupied-spine", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-atrium-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-atrium-socket"}, {"id": "garage-belly-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-belly-socket"}, {"id": "landing-keel-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "landing-keel-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_center_spine_1);
  nodes["center-spine"] = node_center_spine_1;
  const mesh_center_spine_1Geometry = endpoint_center_spine_1
    ? new THREE.CylinderGeometry(endpoint_center_spine_1.endRadius, endpoint_center_spine_1.baseRadius, endpoint_center_spine_1.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_center_spine_1) {
    mesh_center_spine_1Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_center_spine_1 = new THREE.Mesh(
    mesh_center_spine_1Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_center_spine_1.name = "Fixed inhabited centre spine";
  if (endpoint_center_spine_1) {
    mesh_center_spine_1.position.copy(endpoint_center_spine_1.midpoint);
    mesh_center_spine_1.quaternion.copy(endpoint_center_spine_1.quaternion);
  }
  mesh_center_spine_1.castShadow = options.castShadow ?? true;
  mesh_center_spine_1.receiveShadow = options.receiveShadow ?? true;
  mesh_center_spine_1.userData.sculptComponent = {"id": "center-spine", "name": "Fixed inhabited centre spine", "level": "macro", "role": "fixed-occupied-spine", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "fixed-occupied-spine", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-atrium-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-atrium-socket"}, {"id": "garage-belly-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-belly-socket"}, {"id": "landing-keel-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "landing-keel-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_center_spine_1.add(mesh_center_spine_1);
  meshes["center-spine"] = mesh_center_spine_1;
  colliders["center-spine"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_center_spine_1);
  const socket_center_spine_garden_atrium_socket_0 = new THREE.Object3D();
  socket_center_spine_garden_atrium_socket_0.name = "garden-atrium-socket";
  socket_center_spine_garden_atrium_socket_0.position.set(0.0, 0.0, 0.0);
  socket_center_spine_garden_atrium_socket_0.rotation.set(0, 0, 0);
  socket_center_spine_garden_atrium_socket_0.userData.socket = {"id": "garden-atrium-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-atrium-socket"};
  node_center_spine_1.add(socket_center_spine_garden_atrium_socket_0);
  sockets["center-spine:garden-atrium-socket"] = socket_center_spine_garden_atrium_socket_0;
  const socket_center_spine_garage_belly_socket_1 = new THREE.Object3D();
  socket_center_spine_garage_belly_socket_1.name = "garage-belly-socket";
  socket_center_spine_garage_belly_socket_1.position.set(0.0, 0.0, 0.0);
  socket_center_spine_garage_belly_socket_1.rotation.set(0, 0, 0);
  socket_center_spine_garage_belly_socket_1.userData.socket = {"id": "garage-belly-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-belly-socket"};
  node_center_spine_1.add(socket_center_spine_garage_belly_socket_1);
  sockets["center-spine:garage-belly-socket"] = socket_center_spine_garage_belly_socket_1;
  const socket_center_spine_landing_keel_socket_2 = new THREE.Object3D();
  socket_center_spine_landing_keel_socket_2.name = "landing-keel-socket";
  socket_center_spine_landing_keel_socket_2.position.set(0.0, 0.0, 0.0);
  socket_center_spine_landing_keel_socket_2.rotation.set(0, 0, 0);
  socket_center_spine_landing_keel_socket_2.userData.socket = {"id": "landing-keel-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "landing-keel-socket"};
  node_center_spine_1.add(socket_center_spine_landing_keel_socket_2);
  sockets["center-spine:landing-keel-socket"] = socket_center_spine_landing_keel_socket_2;

  const attachment_left_wing_pivot_2 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_left_wing_pivot_2 = makeAttachmentEndpoint(attachment_left_wing_pivot_2);
  const node_left_wing_pivot_2 = new THREE.Group();
  node_left_wing_pivot_2.name = "Left controller wing pivot__pivot";
  node_left_wing_pivot_2.scale.set(1, 1, 1);
  if (endpoint_left_wing_pivot_2) {
    node_left_wing_pivot_2.position.copy(endpoint_left_wing_pivot_2.start);
    node_left_wing_pivot_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_left_wing_pivot_2.position.set(0.0, 0.0, 0.0);
    node_left_wing_pivot_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_left_wing_pivot_2.userData.sculptComponent = {"id": "left-wing-pivot", "name": "Left controller wing pivot", "level": "macro", "role": "primary-transform-pivot", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "left-wing-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-wing-shell-socket"}, {"id": "left-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-engine-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_wing_pivot_2.userData.actionProfile = {"animationRole": "left-wing-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-wing-shell-socket"}, {"id": "left-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-engine-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_left_wing_pivot_2);
  nodes["left-wing-pivot"] = node_left_wing_pivot_2;
  const mesh_left_wing_pivot_2Geometry = endpoint_left_wing_pivot_2
    ? new THREE.CylinderGeometry(endpoint_left_wing_pivot_2.endRadius, endpoint_left_wing_pivot_2.baseRadius, endpoint_left_wing_pivot_2.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_left_wing_pivot_2) {
    mesh_left_wing_pivot_2Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_left_wing_pivot_2 = new THREE.Mesh(
    mesh_left_wing_pivot_2Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_left_wing_pivot_2.name = "Left controller wing pivot";
  if (endpoint_left_wing_pivot_2) {
    mesh_left_wing_pivot_2.position.copy(endpoint_left_wing_pivot_2.midpoint);
    mesh_left_wing_pivot_2.quaternion.copy(endpoint_left_wing_pivot_2.quaternion);
  }
  mesh_left_wing_pivot_2.castShadow = options.castShadow ?? true;
  mesh_left_wing_pivot_2.receiveShadow = options.receiveShadow ?? true;
  mesh_left_wing_pivot_2.userData.sculptComponent = {"id": "left-wing-pivot", "name": "Left controller wing pivot", "level": "macro", "role": "primary-transform-pivot", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "left-wing-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-wing-shell-socket"}, {"id": "left-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-engine-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_wing_pivot_2.add(mesh_left_wing_pivot_2);
  meshes["left-wing-pivot"] = mesh_left_wing_pivot_2;
  colliders["left-wing-pivot"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_left_wing_pivot_2);
  const socket_left_wing_pivot_left_wing_shell_socket_0 = new THREE.Object3D();
  socket_left_wing_pivot_left_wing_shell_socket_0.name = "left-wing-shell-socket";
  socket_left_wing_pivot_left_wing_shell_socket_0.position.set(0.0, 0.0, 0.0);
  socket_left_wing_pivot_left_wing_shell_socket_0.rotation.set(0, 0, 0);
  socket_left_wing_pivot_left_wing_shell_socket_0.userData.socket = {"id": "left-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-wing-shell-socket"};
  node_left_wing_pivot_2.add(socket_left_wing_pivot_left_wing_shell_socket_0);
  sockets["left-wing-pivot:left-wing-shell-socket"] = socket_left_wing_pivot_left_wing_shell_socket_0;
  const socket_left_wing_pivot_left_engine_socket_1 = new THREE.Object3D();
  socket_left_wing_pivot_left_engine_socket_1.name = "left-engine-socket";
  socket_left_wing_pivot_left_engine_socket_1.position.set(0.0, 0.0, 0.0);
  socket_left_wing_pivot_left_engine_socket_1.rotation.set(0, 0, 0);
  socket_left_wing_pivot_left_engine_socket_1.userData.socket = {"id": "left-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-engine-socket"};
  node_left_wing_pivot_2.add(socket_left_wing_pivot_left_engine_socket_1);
  sockets["left-wing-pivot:left-engine-socket"] = socket_left_wing_pivot_left_engine_socket_1;

  const attachment_right_wing_pivot_3 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_right_wing_pivot_3 = makeAttachmentEndpoint(attachment_right_wing_pivot_3);
  const node_right_wing_pivot_3 = new THREE.Group();
  node_right_wing_pivot_3.name = "Right controller wing pivot__pivot";
  node_right_wing_pivot_3.scale.set(1, 1, 1);
  if (endpoint_right_wing_pivot_3) {
    node_right_wing_pivot_3.position.copy(endpoint_right_wing_pivot_3.start);
    node_right_wing_pivot_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_right_wing_pivot_3.position.set(0.0, 0.0, 0.0);
    node_right_wing_pivot_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_right_wing_pivot_3.userData.sculptComponent = {"id": "right-wing-pivot", "name": "Right controller wing pivot", "level": "macro", "role": "primary-transform-pivot", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "right-wing-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "right-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-wing-shell-socket"}, {"id": "right-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-engine-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_wing_pivot_3.userData.actionProfile = {"animationRole": "right-wing-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "right-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-wing-shell-socket"}, {"id": "right-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-engine-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_right_wing_pivot_3);
  nodes["right-wing-pivot"] = node_right_wing_pivot_3;
  const mesh_right_wing_pivot_3Geometry = endpoint_right_wing_pivot_3
    ? new THREE.CylinderGeometry(endpoint_right_wing_pivot_3.endRadius, endpoint_right_wing_pivot_3.baseRadius, endpoint_right_wing_pivot_3.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_right_wing_pivot_3) {
    mesh_right_wing_pivot_3Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_right_wing_pivot_3 = new THREE.Mesh(
    mesh_right_wing_pivot_3Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_right_wing_pivot_3.name = "Right controller wing pivot";
  if (endpoint_right_wing_pivot_3) {
    mesh_right_wing_pivot_3.position.copy(endpoint_right_wing_pivot_3.midpoint);
    mesh_right_wing_pivot_3.quaternion.copy(endpoint_right_wing_pivot_3.quaternion);
  }
  mesh_right_wing_pivot_3.castShadow = options.castShadow ?? true;
  mesh_right_wing_pivot_3.receiveShadow = options.receiveShadow ?? true;
  mesh_right_wing_pivot_3.userData.sculptComponent = {"id": "right-wing-pivot", "name": "Right controller wing pivot", "level": "macro", "role": "primary-transform-pivot", "importance": 1, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "right-wing-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "right-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-wing-shell-socket"}, {"id": "right-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-engine-socket"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_wing_pivot_3.add(mesh_right_wing_pivot_3);
  meshes["right-wing-pivot"] = mesh_right_wing_pivot_3;
  colliders["right-wing-pivot"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_right_wing_pivot_3);
  const socket_right_wing_pivot_right_wing_shell_socket_0 = new THREE.Object3D();
  socket_right_wing_pivot_right_wing_shell_socket_0.name = "right-wing-shell-socket";
  socket_right_wing_pivot_right_wing_shell_socket_0.position.set(0.0, 0.0, 0.0);
  socket_right_wing_pivot_right_wing_shell_socket_0.rotation.set(0, 0, 0);
  socket_right_wing_pivot_right_wing_shell_socket_0.userData.socket = {"id": "right-wing-shell-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-wing-shell-socket"};
  node_right_wing_pivot_3.add(socket_right_wing_pivot_right_wing_shell_socket_0);
  sockets["right-wing-pivot:right-wing-shell-socket"] = socket_right_wing_pivot_right_wing_shell_socket_0;
  const socket_right_wing_pivot_right_engine_socket_1 = new THREE.Object3D();
  socket_right_wing_pivot_right_engine_socket_1.name = "right-engine-socket";
  socket_right_wing_pivot_right_engine_socket_1.position.set(0.0, 0.0, 0.0);
  socket_right_wing_pivot_right_engine_socket_1.rotation.set(0, 0, 0);
  socket_right_wing_pivot_right_engine_socket_1.userData.socket = {"id": "right-engine-socket", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-engine-socket"};
  node_right_wing_pivot_3.add(socket_right_wing_pivot_right_engine_socket_1);
  sockets["right-wing-pivot:right-engine-socket"] = socket_right_wing_pivot_right_engine_socket_1;

  const attachment_garden_atrium_4 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_garden_atrium_4 = makeAttachmentEndpoint(attachment_garden_atrium_4);
  const node_garden_atrium_4 = new THREE.Group();
  node_garden_atrium_4.name = "Protected Great Tree garden atrium__pivot";
  node_garden_atrium_4.scale.set(1, 1, 1);
  if (endpoint_garden_atrium_4) {
    node_garden_atrium_4.position.copy(endpoint_garden_atrium_4.start);
    node_garden_atrium_4.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_garden_atrium_4.position.set(0.0, 0.0, 0.0);
    node_garden_atrium_4.rotation.set(0.0, 0.0, 0.0);
  }
  node_garden_atrium_4.userData.sculptComponent = {"id": "garden-atrium", "name": "Protected Great Tree garden atrium", "level": "macro", "role": "protected-occupied-volume", "importance": 1, "confidence": 0.86, "primitive": "lathe", "topologyClass": "continuous-sculpt", "topologyRationale": "The planted atrium and Great Tree require a continuous protected interior volume.", "geometryDescriptor": {"topologyIntent": "continuous curved volume with controlled vertex deformation", "edgeTreatment": {"type": "rounded-profile", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protected-occupied-volume", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"}, {"id": "sky-terrace-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-foliage"}}, "material": "garden-foliage", "materialLayers": ["garden-foliage"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "garden-foliage-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(54, 105, 48, 1)", "secondaryAlbedo": "rgba(147, 183, 86, 1)", "materialClass": "unknown", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(54, 105, 48, 1)"}, {"at": 1, "color": "rgba(147, 183, 86, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_garden_atrium_4.userData.actionProfile = {"animationRole": "protected-occupied-volume", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"}, {"id": "sky-terrace-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-foliage"}};
  (nodes["center-spine"] ?? root).add(node_garden_atrium_4);
  nodes["garden-atrium"] = node_garden_atrium_4;
  const mesh_garden_atrium_4Geometry = endpoint_garden_atrium_4
    ? new THREE.CylinderGeometry(endpoint_garden_atrium_4.endRadius, endpoint_garden_atrium_4.baseRadius, endpoint_garden_atrium_4.length, 32, 12)
    : buildLatheGeometry({"points": [[0.3, -0.5], [0.15, 0.0], [0.3, 0.5]], "segments": 24});
  if (!endpoint_garden_atrium_4) {
    mesh_garden_atrium_4Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_garden_atrium_4 = new THREE.Mesh(
    mesh_garden_atrium_4Geometry,
    materialMap["garden-foliage"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_garden_atrium_4.name = "Protected Great Tree garden atrium";
  if (endpoint_garden_atrium_4) {
    mesh_garden_atrium_4.position.copy(endpoint_garden_atrium_4.midpoint);
    mesh_garden_atrium_4.quaternion.copy(endpoint_garden_atrium_4.quaternion);
  }
  mesh_garden_atrium_4.castShadow = options.castShadow ?? true;
  mesh_garden_atrium_4.receiveShadow = options.receiveShadow ?? true;
  mesh_garden_atrium_4.userData.sculptComponent = {"id": "garden-atrium", "name": "Protected Great Tree garden atrium", "level": "macro", "role": "protected-occupied-volume", "importance": 1, "confidence": 0.86, "primitive": "lathe", "topologyClass": "continuous-sculpt", "topologyRationale": "The planted atrium and Great Tree require a continuous protected interior volume.", "geometryDescriptor": {"topologyIntent": "continuous curved volume with controlled vertex deformation", "edgeTreatment": {"type": "rounded-profile", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protected-occupied-volume", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"}, {"id": "sky-terrace-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-foliage"}}, "material": "garden-foliage", "materialLayers": ["garden-foliage"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "garden-foliage-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(54, 105, 48, 1)", "secondaryAlbedo": "rgba(147, 183, 86, 1)", "materialClass": "unknown", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(54, 105, 48, 1)"}, {"at": 1, "color": "rgba(147, 183, 86, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_garden_atrium_4.add(mesh_garden_atrium_4);
  meshes["garden-atrium"] = mesh_garden_atrium_4;
  colliders["garden-atrium"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_garden_atrium_4);
  const socket_garden_atrium_garden_entry_0 = new THREE.Object3D();
  socket_garden_atrium_garden_entry_0.name = "garden-entry";
  socket_garden_atrium_garden_entry_0.position.set(0.0, 0.0, 0.0);
  socket_garden_atrium_garden_entry_0.rotation.set(0, 0, 0);
  socket_garden_atrium_garden_entry_0.userData.socket = {"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"};
  node_garden_atrium_4.add(socket_garden_atrium_garden_entry_0);
  sockets["garden-atrium:garden-entry"] = socket_garden_atrium_garden_entry_0;
  const socket_garden_atrium_sky_terrace_camera_1 = new THREE.Object3D();
  socket_garden_atrium_sky_terrace_camera_1.name = "sky-terrace-camera";
  socket_garden_atrium_sky_terrace_camera_1.position.set(0.0, 0.0, 0.0);
  socket_garden_atrium_sky_terrace_camera_1.rotation.set(0, 0, 0);
  socket_garden_atrium_sky_terrace_camera_1.userData.socket = {"id": "sky-terrace-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-camera"};
  node_garden_atrium_4.add(socket_garden_atrium_sky_terrace_camera_1);
  sockets["garden-atrium:sky-terrace-camera"] = socket_garden_atrium_sky_terrace_camera_1;

  const attachment_garage_belly_5 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_garage_belly_5 = makeAttachmentEndpoint(attachment_garage_belly_5);
  const node_garage_belly_5 = new THREE.Group();
  node_garage_belly_5.name = "Fabrication and garage belly reserve__pivot";
  node_garage_belly_5.scale.set(1, 1, 1);
  if (endpoint_garage_belly_5) {
    node_garage_belly_5.position.copy(endpoint_garage_belly_5.start);
    node_garage_belly_5.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_garage_belly_5.position.set(0.0, 0.0, 0.0);
    node_garage_belly_5.rotation.set(0.0, 0.0, 0.0);
  }
  node_garage_belly_5.userData.sculptComponent = {"id": "garage-belly", "name": "Fabrication and garage belly reserve", "level": "macro", "role": "protected-occupied-volume", "importance": 0.95, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protected-occupied-volume", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garage-entry-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "garage-door-seam", "placement": "Large belly clamshell service opening with reserved traversal clearance.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_garage_belly_5.userData.actionProfile = {"animationRole": "protected-occupied-volume", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garage-entry-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_garage_belly_5);
  nodes["garage-belly"] = node_garage_belly_5;
  const mesh_garage_belly_5Geometry = endpoint_garage_belly_5
    ? new THREE.CylinderGeometry(endpoint_garage_belly_5.endRadius, endpoint_garage_belly_5.baseRadius, endpoint_garage_belly_5.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_garage_belly_5) {
    mesh_garage_belly_5Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_garage_belly_5 = new THREE.Mesh(
    mesh_garage_belly_5Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_garage_belly_5.name = "Fabrication and garage belly reserve";
  if (endpoint_garage_belly_5) {
    mesh_garage_belly_5.position.copy(endpoint_garage_belly_5.midpoint);
    mesh_garage_belly_5.quaternion.copy(endpoint_garage_belly_5.quaternion);
  }
  mesh_garage_belly_5.castShadow = options.castShadow ?? true;
  mesh_garage_belly_5.receiveShadow = options.receiveShadow ?? true;
  mesh_garage_belly_5.userData.sculptComponent = {"id": "garage-belly", "name": "Fabrication and garage belly reserve", "level": "macro", "role": "protected-occupied-volume", "importance": 0.95, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protected-occupied-volume", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garage-entry-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "garage-door-seam", "placement": "Large belly clamshell service opening with reserved traversal clearance.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "blockout", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_garage_belly_5.add(mesh_garage_belly_5);
  meshes["garage-belly"] = mesh_garage_belly_5;
  colliders["garage-belly"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_garage_belly_5);
  const socket_garage_belly_garage_entry_camera_0 = new THREE.Object3D();
  socket_garage_belly_garage_entry_camera_0.name = "garage-entry-camera";
  socket_garage_belly_garage_entry_camera_0.position.set(0.0, 0.0, 0.0);
  socket_garage_belly_garage_entry_camera_0.rotation.set(0, 0, 0);
  socket_garage_belly_garage_entry_camera_0.userData.socket = {"id": "garage-entry-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry-camera"};
  node_garage_belly_5.add(socket_garage_belly_garage_entry_camera_0);
  sockets["garage-belly:garage-entry-camera"] = socket_garage_belly_garage_entry_camera_0;

  const attachment_left_outer_shell_6 = {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_left_outer_shell_6 = makeAttachmentEndpoint(attachment_left_outer_shell_6);
  const node_left_outer_shell_6 = new THREE.Group();
  node_left_outer_shell_6.name = "Left white ceramic controller shell__pivot";
  node_left_outer_shell_6.scale.set(1, 1, 1);
  if (endpoint_left_outer_shell_6) {
    node_left_outer_shell_6.position.copy(endpoint_left_outer_shell_6.start);
    node_left_outer_shell_6.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_left_outer_shell_6.position.set(0.0, 0.0, 0.0);
    node_left_outer_shell_6.rotation.set(0.0, 0.0, 0.0);
  }
  node_left_outer_shell_6.userData.sculptComponent = {"id": "left-outer-shell", "name": "Left white ceramic controller shell", "level": "meso", "role": "articulated-shell", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "articulated-shell", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}}, "material": "white-ceramic-shell", "materialLayers": ["white-ceramic-shell"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "crown-bevel", "placement": "Broad real crown chamfer.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "split-seam", "placement": "Recessed charcoal shell/frame separation seam.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "white-ceramic-shell-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(227, 224, 217, 1)", "secondaryAlbedo": "rgba(179, 184, 188, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(227, 224, 217, 1)"}, {"at": 1, "color": "rgba(179, 184, 188, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_outer_shell_6.userData.actionProfile = {"animationRole": "articulated-shell", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}};
  (nodes["left-wing-pivot"] ?? root).add(node_left_outer_shell_6);
  nodes["left-outer-shell"] = node_left_outer_shell_6;
  const mesh_left_outer_shell_6Geometry = endpoint_left_outer_shell_6
    ? new THREE.CylinderGeometry(endpoint_left_outer_shell_6.endRadius, endpoint_left_outer_shell_6.baseRadius, endpoint_left_outer_shell_6.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_left_outer_shell_6) {
    mesh_left_outer_shell_6Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_left_outer_shell_6 = new THREE.Mesh(
    mesh_left_outer_shell_6Geometry,
    materialMap["white-ceramic-shell"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_left_outer_shell_6.name = "Left white ceramic controller shell";
  if (endpoint_left_outer_shell_6) {
    mesh_left_outer_shell_6.position.copy(endpoint_left_outer_shell_6.midpoint);
    mesh_left_outer_shell_6.quaternion.copy(endpoint_left_outer_shell_6.quaternion);
  }
  mesh_left_outer_shell_6.castShadow = options.castShadow ?? true;
  mesh_left_outer_shell_6.receiveShadow = options.receiveShadow ?? true;
  mesh_left_outer_shell_6.userData.sculptComponent = {"id": "left-outer-shell", "name": "Left white ceramic controller shell", "level": "meso", "role": "articulated-shell", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "articulated-shell", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}}, "material": "white-ceramic-shell", "materialLayers": ["white-ceramic-shell"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "crown-bevel", "placement": "Broad real crown chamfer.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "split-seam", "placement": "Recessed charcoal shell/frame separation seam.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "white-ceramic-shell-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(227, 224, 217, 1)", "secondaryAlbedo": "rgba(179, 184, 188, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(227, 224, 217, 1)"}, {"at": 1, "color": "rgba(179, 184, 188, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_outer_shell_6.add(mesh_left_outer_shell_6);
  meshes["left-outer-shell"] = mesh_left_outer_shell_6;
  colliders["left-outer-shell"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_left_outer_shell_6);

  const attachment_right_outer_shell_7 = {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_right_outer_shell_7 = makeAttachmentEndpoint(attachment_right_outer_shell_7);
  const node_right_outer_shell_7 = new THREE.Group();
  node_right_outer_shell_7.name = "Right white ceramic controller shell__pivot";
  node_right_outer_shell_7.scale.set(1, 1, 1);
  if (endpoint_right_outer_shell_7) {
    node_right_outer_shell_7.position.copy(endpoint_right_outer_shell_7.start);
    node_right_outer_shell_7.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_right_outer_shell_7.position.set(0.0, 0.0, 0.0);
    node_right_outer_shell_7.rotation.set(0.0, 0.0, 0.0);
  }
  node_right_outer_shell_7.userData.sculptComponent = {"id": "right-outer-shell", "name": "Right white ceramic controller shell", "level": "meso", "role": "articulated-shell", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "articulated-shell", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}}, "material": "white-ceramic-shell", "materialLayers": ["white-ceramic-shell"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "crown-bevel", "placement": "Broad real crown chamfer.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "split-seam", "placement": "Recessed charcoal shell/frame separation seam.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "white-ceramic-shell-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(227, 224, 217, 1)", "secondaryAlbedo": "rgba(179, 184, 188, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(227, 224, 217, 1)"}, {"at": 1, "color": "rgba(179, 184, 188, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_outer_shell_7.userData.actionProfile = {"animationRole": "articulated-shell", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}};
  (nodes["right-wing-pivot"] ?? root).add(node_right_outer_shell_7);
  nodes["right-outer-shell"] = node_right_outer_shell_7;
  const mesh_right_outer_shell_7Geometry = endpoint_right_outer_shell_7
    ? new THREE.CylinderGeometry(endpoint_right_outer_shell_7.endRadius, endpoint_right_outer_shell_7.baseRadius, endpoint_right_outer_shell_7.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_right_outer_shell_7) {
    mesh_right_outer_shell_7Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_right_outer_shell_7 = new THREE.Mesh(
    mesh_right_outer_shell_7Geometry,
    materialMap["white-ceramic-shell"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_right_outer_shell_7.name = "Right white ceramic controller shell";
  if (endpoint_right_outer_shell_7) {
    mesh_right_outer_shell_7.position.copy(endpoint_right_outer_shell_7.midpoint);
    mesh_right_outer_shell_7.quaternion.copy(endpoint_right_outer_shell_7.quaternion);
  }
  mesh_right_outer_shell_7.castShadow = options.castShadow ?? true;
  mesh_right_outer_shell_7.receiveShadow = options.receiveShadow ?? true;
  mesh_right_outer_shell_7.userData.sculptComponent = {"id": "right-outer-shell", "name": "Right white ceramic controller shell", "level": "meso", "role": "articulated-shell", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "articulated-shell", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}}, "material": "white-ceramic-shell", "materialLayers": ["white-ceramic-shell"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "crown-bevel", "placement": "Broad real crown chamfer.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "split-seam", "placement": "Recessed charcoal shell/frame separation seam.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "white-ceramic-shell-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(227, 224, 217, 1)", "secondaryAlbedo": "rgba(179, 184, 188, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(227, 224, 217, 1)"}, {"at": 1, "color": "rgba(179, 184, 188, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_outer_shell_7.add(mesh_right_outer_shell_7);
  meshes["right-outer-shell"] = mesh_right_outer_shell_7;
  colliders["right-outer-shell"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_right_outer_shell_7);

  const attachment_left_underframe_8 = {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_left_underframe_8 = makeAttachmentEndpoint(attachment_left_underframe_8);
  const node_left_underframe_8 = new THREE.Group();
  node_left_underframe_8.name = "Left charcoal structural underframe__pivot";
  node_left_underframe_8.scale.set(1, 1, 1);
  if (endpoint_left_underframe_8) {
    node_left_underframe_8.position.copy(endpoint_left_underframe_8.start);
    node_left_underframe_8.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_left_underframe_8.position.set(0.0, 0.0, 0.0);
    node_left_underframe_8.rotation.set(0.0, 0.0, 0.0);
  }
  node_left_underframe_8.userData.sculptComponent = {"id": "left-underframe", "name": "Left charcoal structural underframe", "level": "meso", "role": "wing-structure", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "wing-structure", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_underframe_8.userData.actionProfile = {"animationRole": "wing-structure", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["left-wing-pivot"] ?? root).add(node_left_underframe_8);
  nodes["left-underframe"] = node_left_underframe_8;
  const mesh_left_underframe_8Geometry = endpoint_left_underframe_8
    ? new THREE.CylinderGeometry(endpoint_left_underframe_8.endRadius, endpoint_left_underframe_8.baseRadius, endpoint_left_underframe_8.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_left_underframe_8) {
    mesh_left_underframe_8Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_left_underframe_8 = new THREE.Mesh(
    mesh_left_underframe_8Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_left_underframe_8.name = "Left charcoal structural underframe";
  if (endpoint_left_underframe_8) {
    mesh_left_underframe_8.position.copy(endpoint_left_underframe_8.midpoint);
    mesh_left_underframe_8.quaternion.copy(endpoint_left_underframe_8.quaternion);
  }
  mesh_left_underframe_8.castShadow = options.castShadow ?? true;
  mesh_left_underframe_8.receiveShadow = options.receiveShadow ?? true;
  mesh_left_underframe_8.userData.sculptComponent = {"id": "left-underframe", "name": "Left charcoal structural underframe", "level": "meso", "role": "wing-structure", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "wing-structure", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_underframe_8.add(mesh_left_underframe_8);
  meshes["left-underframe"] = mesh_left_underframe_8;
  colliders["left-underframe"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_left_underframe_8);

  const attachment_right_underframe_9 = {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_right_underframe_9 = makeAttachmentEndpoint(attachment_right_underframe_9);
  const node_right_underframe_9 = new THREE.Group();
  node_right_underframe_9.name = "Right charcoal structural underframe__pivot";
  node_right_underframe_9.scale.set(1, 1, 1);
  if (endpoint_right_underframe_9) {
    node_right_underframe_9.position.copy(endpoint_right_underframe_9.start);
    node_right_underframe_9.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_right_underframe_9.position.set(0.0, 0.0, 0.0);
    node_right_underframe_9.rotation.set(0.0, 0.0, 0.0);
  }
  node_right_underframe_9.userData.sculptComponent = {"id": "right-underframe", "name": "Right charcoal structural underframe", "level": "meso", "role": "wing-structure", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "wing-structure", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_underframe_9.userData.actionProfile = {"animationRole": "wing-structure", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["right-wing-pivot"] ?? root).add(node_right_underframe_9);
  nodes["right-underframe"] = node_right_underframe_9;
  const mesh_right_underframe_9Geometry = endpoint_right_underframe_9
    ? new THREE.CylinderGeometry(endpoint_right_underframe_9.endRadius, endpoint_right_underframe_9.baseRadius, endpoint_right_underframe_9.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_right_underframe_9) {
    mesh_right_underframe_9Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_right_underframe_9 = new THREE.Mesh(
    mesh_right_underframe_9Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_right_underframe_9.name = "Right charcoal structural underframe";
  if (endpoint_right_underframe_9) {
    mesh_right_underframe_9.position.copy(endpoint_right_underframe_9.midpoint);
    mesh_right_underframe_9.quaternion.copy(endpoint_right_underframe_9.quaternion);
  }
  mesh_right_underframe_9.castShadow = options.castShadow ?? true;
  mesh_right_underframe_9.receiveShadow = options.receiveShadow ?? true;
  mesh_right_underframe_9.userData.sculptComponent = {"id": "right-underframe", "name": "Right charcoal structural underframe", "level": "meso", "role": "wing-structure", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "wing-structure", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_underframe_9.add(mesh_right_underframe_9);
  meshes["right-underframe"] = mesh_right_underframe_9;
  colliders["right-underframe"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_right_underframe_9);

  const attachment_left_engine_housing_10 = {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_left_engine_housing_10 = makeAttachmentEndpoint(attachment_left_engine_housing_10);
  const node_left_engine_housing_10 = new THREE.Group();
  node_left_engine_housing_10.name = "Left aft engine housing__pivot";
  node_left_engine_housing_10.scale.set(1, 1, 1);
  if (endpoint_left_engine_housing_10) {
    node_left_engine_housing_10.position.copy(endpoint_left_engine_housing_10.start);
    node_left_engine_housing_10.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_left_engine_housing_10.position.set(0.0, 0.0, 0.0);
    node_left_engine_housing_10.rotation.set(0.0, 0.0, 0.0);
  }
  node_left_engine_housing_10.userData.sculptComponent = {"id": "left-engine-housing", "name": "Left aft engine housing", "level": "meso", "role": "travel-propulsion", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "travel-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-a"}, {"id": "left-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-b"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "recessed-vent-banks", "placement": "Three real vent cavities.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "main-thruster-sockets", "placement": "Two annular vectored travel-thruster sockets.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_engine_housing_10.userData.actionProfile = {"animationRole": "travel-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-a"}, {"id": "left-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-b"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["left-wing-pivot"] ?? root).add(node_left_engine_housing_10);
  nodes["left-engine-housing"] = node_left_engine_housing_10;
  const mesh_left_engine_housing_10Geometry = endpoint_left_engine_housing_10
    ? new THREE.CylinderGeometry(endpoint_left_engine_housing_10.endRadius, endpoint_left_engine_housing_10.baseRadius, endpoint_left_engine_housing_10.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_left_engine_housing_10) {
    mesh_left_engine_housing_10Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_left_engine_housing_10 = new THREE.Mesh(
    mesh_left_engine_housing_10Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_left_engine_housing_10.name = "Left aft engine housing";
  if (endpoint_left_engine_housing_10) {
    mesh_left_engine_housing_10.position.copy(endpoint_left_engine_housing_10.midpoint);
    mesh_left_engine_housing_10.quaternion.copy(endpoint_left_engine_housing_10.quaternion);
  }
  mesh_left_engine_housing_10.castShadow = options.castShadow ?? true;
  mesh_left_engine_housing_10.receiveShadow = options.receiveShadow ?? true;
  mesh_left_engine_housing_10.userData.sculptComponent = {"id": "left-engine-housing", "name": "Left aft engine housing", "level": "meso", "role": "travel-propulsion", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "travel-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-a"}, {"id": "left-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-b"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "recessed-vent-banks", "placement": "Three real vent cavities.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "main-thruster-sockets", "placement": "Two annular vectored travel-thruster sockets.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_engine_housing_10.add(mesh_left_engine_housing_10);
  meshes["left-engine-housing"] = mesh_left_engine_housing_10;
  colliders["left-engine-housing"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_left_engine_housing_10);
  const socket_left_engine_housing_left_main_thruster_a_0 = new THREE.Object3D();
  socket_left_engine_housing_left_main_thruster_a_0.name = "left-main-thruster-a";
  socket_left_engine_housing_left_main_thruster_a_0.position.set(0.0, 0.0, 0.0);
  socket_left_engine_housing_left_main_thruster_a_0.rotation.set(0, 0, 0);
  socket_left_engine_housing_left_main_thruster_a_0.userData.socket = {"id": "left-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-a"};
  node_left_engine_housing_10.add(socket_left_engine_housing_left_main_thruster_a_0);
  sockets["left-engine-housing:left-main-thruster-a"] = socket_left_engine_housing_left_main_thruster_a_0;
  const socket_left_engine_housing_left_main_thruster_b_1 = new THREE.Object3D();
  socket_left_engine_housing_left_main_thruster_b_1.name = "left-main-thruster-b";
  socket_left_engine_housing_left_main_thruster_b_1.position.set(0.0, 0.0, 0.0);
  socket_left_engine_housing_left_main_thruster_b_1.rotation.set(0, 0, 0);
  socket_left_engine_housing_left_main_thruster_b_1.userData.socket = {"id": "left-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-main-thruster-b"};
  node_left_engine_housing_10.add(socket_left_engine_housing_left_main_thruster_b_1);
  sockets["left-engine-housing:left-main-thruster-b"] = socket_left_engine_housing_left_main_thruster_b_1;

  const attachment_right_engine_housing_11 = {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_right_engine_housing_11 = makeAttachmentEndpoint(attachment_right_engine_housing_11);
  const node_right_engine_housing_11 = new THREE.Group();
  node_right_engine_housing_11.name = "Right aft engine housing__pivot";
  node_right_engine_housing_11.scale.set(1, 1, 1);
  if (endpoint_right_engine_housing_11) {
    node_right_engine_housing_11.position.copy(endpoint_right_engine_housing_11.start);
    node_right_engine_housing_11.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_right_engine_housing_11.position.set(0.0, 0.0, 0.0);
    node_right_engine_housing_11.rotation.set(0.0, 0.0, 0.0);
  }
  node_right_engine_housing_11.userData.sculptComponent = {"id": "right-engine-housing", "name": "Right aft engine housing", "level": "meso", "role": "travel-propulsion", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "travel-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "right-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-a"}, {"id": "right-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-b"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "recessed-vent-banks", "placement": "Three real vent cavities.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "main-thruster-sockets", "placement": "Two annular vectored travel-thruster sockets.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_engine_housing_11.userData.actionProfile = {"animationRole": "travel-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "right-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-a"}, {"id": "right-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-b"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["right-wing-pivot"] ?? root).add(node_right_engine_housing_11);
  nodes["right-engine-housing"] = node_right_engine_housing_11;
  const mesh_right_engine_housing_11Geometry = endpoint_right_engine_housing_11
    ? new THREE.CylinderGeometry(endpoint_right_engine_housing_11.endRadius, endpoint_right_engine_housing_11.baseRadius, endpoint_right_engine_housing_11.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_right_engine_housing_11) {
    mesh_right_engine_housing_11Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_right_engine_housing_11 = new THREE.Mesh(
    mesh_right_engine_housing_11Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_right_engine_housing_11.name = "Right aft engine housing";
  if (endpoint_right_engine_housing_11) {
    mesh_right_engine_housing_11.position.copy(endpoint_right_engine_housing_11.midpoint);
    mesh_right_engine_housing_11.quaternion.copy(endpoint_right_engine_housing_11.quaternion);
  }
  mesh_right_engine_housing_11.castShadow = options.castShadow ?? true;
  mesh_right_engine_housing_11.receiveShadow = options.receiveShadow ?? true;
  mesh_right_engine_housing_11.userData.sculptComponent = {"id": "right-engine-housing", "name": "Right aft engine housing", "level": "meso", "role": "travel-propulsion", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "travel-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "right-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-a"}, {"id": "right-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-b"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "recessed-vent-banks", "placement": "Three real vent cavities.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "main-thruster-sockets", "placement": "Two annular vectored travel-thruster sockets.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_engine_housing_11.add(mesh_right_engine_housing_11);
  meshes["right-engine-housing"] = mesh_right_engine_housing_11;
  colliders["right-engine-housing"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_right_engine_housing_11);
  const socket_right_engine_housing_right_main_thruster_a_0 = new THREE.Object3D();
  socket_right_engine_housing_right_main_thruster_a_0.name = "right-main-thruster-a";
  socket_right_engine_housing_right_main_thruster_a_0.position.set(0.0, 0.0, 0.0);
  socket_right_engine_housing_right_main_thruster_a_0.rotation.set(0, 0, 0);
  socket_right_engine_housing_right_main_thruster_a_0.userData.socket = {"id": "right-main-thruster-a", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-a"};
  node_right_engine_housing_11.add(socket_right_engine_housing_right_main_thruster_a_0);
  sockets["right-engine-housing:right-main-thruster-a"] = socket_right_engine_housing_right_main_thruster_a_0;
  const socket_right_engine_housing_right_main_thruster_b_1 = new THREE.Object3D();
  socket_right_engine_housing_right_main_thruster_b_1.name = "right-main-thruster-b";
  socket_right_engine_housing_right_main_thruster_b_1.position.set(0.0, 0.0, 0.0);
  socket_right_engine_housing_right_main_thruster_b_1.rotation.set(0, 0, 0);
  socket_right_engine_housing_right_main_thruster_b_1.userData.socket = {"id": "right-main-thruster-b", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-main-thruster-b"};
  node_right_engine_housing_11.add(socket_right_engine_housing_right_main_thruster_b_1);
  sockets["right-engine-housing:right-main-thruster-b"] = socket_right_engine_housing_right_main_thruster_b_1;

  const attachment_garden_shield_frame_12 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_garden_shield_frame_12 = makeAttachmentEndpoint(attachment_garden_shield_frame_12);
  const node_garden_shield_frame_12 = new THREE.Group();
  node_garden_shield_frame_12.name = "Garden shield aperture and shutters__pivot";
  node_garden_shield_frame_12.scale.set(1, 1, 1);
  if (endpoint_garden_shield_frame_12) {
    node_garden_shield_frame_12.position.copy(endpoint_garden_shield_frame_12.start);
    node_garden_shield_frame_12.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_garden_shield_frame_12.position.set(0.0, 0.0, 0.0);
    node_garden_shield_frame_12.rotation.set(0.0, 0.0, 0.0);
  }
  node_garden_shield_frame_12.userData.sculptComponent = {"id": "garden-shield-frame", "name": "Garden shield aperture and shutters", "level": "meso", "role": "protective-transform-system", "importance": 0.8, "confidence": 0.86, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protective-transform-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-shield-glass"}}, "material": "garden-shield-glass", "materialLayers": ["garden-shield-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "aperture-rim", "placement": "Continuous structural garden aperture rim.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "shutter-seams", "placement": "Four shield shutters retract into the frame without entering the garden clearance volume.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "garden-shield-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 42, 55, 0.78)", "secondaryAlbedo": "rgba(68, 165, 214, 0.42)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 42, 55, 0.78)"}, {"at": 1, "color": "rgba(68, 165, 214, 0.42)"}]}, "evidenceRefs": ["full-object"]}};
  node_garden_shield_frame_12.userData.actionProfile = {"animationRole": "protective-transform-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-shield-glass"}};
  (nodes["center-spine"] ?? root).add(node_garden_shield_frame_12);
  nodes["garden-shield-frame"] = node_garden_shield_frame_12;
  const mesh_garden_shield_frame_12Geometry = endpoint_garden_shield_frame_12
    ? new THREE.CylinderGeometry(endpoint_garden_shield_frame_12.endRadius, endpoint_garden_shield_frame_12.baseRadius, endpoint_garden_shield_frame_12.length, 32, 12)
    : new THREE.TorusGeometry(0.45, 0.08, 24, 96);
  if (!endpoint_garden_shield_frame_12) {
    mesh_garden_shield_frame_12Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_garden_shield_frame_12 = new THREE.Mesh(
    mesh_garden_shield_frame_12Geometry,
    materialMap["garden-shield-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_garden_shield_frame_12.name = "Garden shield aperture and shutters";
  if (endpoint_garden_shield_frame_12) {
    mesh_garden_shield_frame_12.position.copy(endpoint_garden_shield_frame_12.midpoint);
    mesh_garden_shield_frame_12.quaternion.copy(endpoint_garden_shield_frame_12.quaternion);
  }
  mesh_garden_shield_frame_12.castShadow = options.castShadow ?? true;
  mesh_garden_shield_frame_12.receiveShadow = options.receiveShadow ?? true;
  mesh_garden_shield_frame_12.userData.sculptComponent = {"id": "garden-shield-frame", "name": "Garden shield aperture and shutters", "level": "meso", "role": "protective-transform-system", "importance": 0.8, "confidence": 0.86, "primitive": "torus", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "protective-transform-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-shield-glass"}}, "material": "garden-shield-glass", "materialLayers": ["garden-shield-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "aperture-rim", "placement": "Continuous structural garden aperture rim.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}, {"id": "shutter-seams", "placement": "Four shield shutters retract into the frame without entering the garden clearance volume.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "garden-shield-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 42, 55, 0.78)", "secondaryAlbedo": "rgba(68, 165, 214, 0.42)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 42, 55, 0.78)"}, {"at": 1, "color": "rgba(68, 165, 214, 0.42)"}]}, "evidenceRefs": ["full-object"]}};
  node_garden_shield_frame_12.add(mesh_garden_shield_frame_12);
  meshes["garden-shield-frame"] = mesh_garden_shield_frame_12;
  colliders["garden-shield-frame"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_garden_shield_frame_12);

  const attachment_power_towers_13 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_power_towers_13 = makeAttachmentEndpoint(attachment_power_towers_13);
  const node_power_towers_13 = new THREE.Group();
  node_power_towers_13.name = "Twin telescoping power towers__pivot";
  node_power_towers_13.scale.set(1, 1, 1);
  if (endpoint_power_towers_13) {
    node_power_towers_13.position.copy(endpoint_power_towers_13.start);
    node_power_towers_13.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_power_towers_13.position.set(0.0, 0.0, 0.0);
    node_power_towers_13.rotation.set(0.0, 0.0, 0.0);
  }
  node_power_towers_13.userData.sculptComponent = {"id": "power-towers", "name": "Twin telescoping power towers", "level": "meso", "role": "telescoping-power-system", "importance": 0.8, "confidence": 0.86, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "telescoping-power-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-tower-cap"}, {"id": "right-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-tower-cap"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "blue-power-glass"}}, "material": "blue-power-glass", "materialLayers": ["blue-power-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "telescoping-collars", "placement": "Four nested locking collars per tower.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "blue-power-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(43, 161, 255, 1)", "secondaryAlbedo": "rgba(173, 232, 255, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(43, 161, 255, 1)"}, {"at": 1, "color": "rgba(173, 232, 255, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_power_towers_13.userData.actionProfile = {"animationRole": "telescoping-power-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-tower-cap"}, {"id": "right-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-tower-cap"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "blue-power-glass"}};
  (nodes["center-spine"] ?? root).add(node_power_towers_13);
  nodes["power-towers"] = node_power_towers_13;
  const mesh_power_towers_13Geometry = endpoint_power_towers_13
    ? new THREE.CylinderGeometry(endpoint_power_towers_13.endRadius, endpoint_power_towers_13.baseRadius, endpoint_power_towers_13.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_power_towers_13) {
    mesh_power_towers_13Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_power_towers_13 = new THREE.Mesh(
    mesh_power_towers_13Geometry,
    materialMap["blue-power-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_power_towers_13.name = "Twin telescoping power towers";
  if (endpoint_power_towers_13) {
    mesh_power_towers_13.position.copy(endpoint_power_towers_13.midpoint);
    mesh_power_towers_13.quaternion.copy(endpoint_power_towers_13.quaternion);
  }
  mesh_power_towers_13.castShadow = options.castShadow ?? true;
  mesh_power_towers_13.receiveShadow = options.receiveShadow ?? true;
  mesh_power_towers_13.userData.sculptComponent = {"id": "power-towers", "name": "Twin telescoping power towers", "level": "meso", "role": "telescoping-power-system", "importance": 0.8, "confidence": 0.86, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "telescoping-power-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "left-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-tower-cap"}, {"id": "right-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-tower-cap"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "blue-power-glass"}}, "material": "blue-power-glass", "materialLayers": ["blue-power-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "telescoping-collars", "placement": "Four nested locking collars per tower.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "blue-power-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(43, 161, 255, 1)", "secondaryAlbedo": "rgba(173, 232, 255, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(43, 161, 255, 1)"}, {"at": 1, "color": "rgba(173, 232, 255, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_power_towers_13.add(mesh_power_towers_13);
  meshes["power-towers"] = mesh_power_towers_13;
  colliders["power-towers"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_power_towers_13);
  const socket_power_towers_left_tower_cap_0 = new THREE.Object3D();
  socket_power_towers_left_tower_cap_0.name = "left-tower-cap";
  socket_power_towers_left_tower_cap_0.position.set(0.0, 0.0, 0.0);
  socket_power_towers_left_tower_cap_0.rotation.set(0, 0, 0);
  socket_power_towers_left_tower_cap_0.userData.socket = {"id": "left-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "left-tower-cap"};
  node_power_towers_13.add(socket_power_towers_left_tower_cap_0);
  sockets["power-towers:left-tower-cap"] = socket_power_towers_left_tower_cap_0;
  const socket_power_towers_right_tower_cap_1 = new THREE.Object3D();
  socket_power_towers_right_tower_cap_1.name = "right-tower-cap";
  socket_power_towers_right_tower_cap_1.position.set(0.0, 0.0, 0.0);
  socket_power_towers_right_tower_cap_1.rotation.set(0, 0, 0);
  socket_power_towers_right_tower_cap_1.userData.socket = {"id": "right-tower-cap", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "right-tower-cap"};
  node_power_towers_13.add(socket_power_towers_right_tower_cap_1);
  sockets["power-towers:right-tower-cap"] = socket_power_towers_right_tower_cap_1;

  const attachment_landing_keel_14 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_landing_keel_14 = makeAttachmentEndpoint(attachment_landing_keel_14);
  const node_landing_keel_14 = new THREE.Group();
  node_landing_keel_14.name = "Telescoping landing and service keel__pivot";
  node_landing_keel_14.scale.set(1, 1, 1);
  if (endpoint_landing_keel_14) {
    node_landing_keel_14.position.copy(endpoint_landing_keel_14.start);
    node_landing_keel_14.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_landing_keel_14.position.set(0.0, 0.0, 0.0);
    node_landing_keel_14.rotation.set(0.0, 0.0, 0.0);
  }
  node_landing_keel_14.userData.sculptComponent = {"id": "landing-keel", "name": "Telescoping landing and service keel", "level": "meso", "role": "landing-support", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "landing-support", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "keel-foot", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-foot"}, {"id": "keel-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "telescoping-lock", "placement": "Three nested rails and one annular keel lock.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_landing_keel_14.userData.actionProfile = {"animationRole": "landing-support", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "keel-foot", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-foot"}, {"id": "keel-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_landing_keel_14);
  nodes["landing-keel"] = node_landing_keel_14;
  const mesh_landing_keel_14Geometry = endpoint_landing_keel_14
    ? new THREE.CylinderGeometry(endpoint_landing_keel_14.endRadius, endpoint_landing_keel_14.baseRadius, endpoint_landing_keel_14.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_landing_keel_14) {
    mesh_landing_keel_14Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_landing_keel_14 = new THREE.Mesh(
    mesh_landing_keel_14Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_landing_keel_14.name = "Telescoping landing and service keel";
  if (endpoint_landing_keel_14) {
    mesh_landing_keel_14.position.copy(endpoint_landing_keel_14.midpoint);
    mesh_landing_keel_14.quaternion.copy(endpoint_landing_keel_14.quaternion);
  }
  mesh_landing_keel_14.castShadow = options.castShadow ?? true;
  mesh_landing_keel_14.receiveShadow = options.receiveShadow ?? true;
  mesh_landing_keel_14.userData.sculptComponent = {"id": "landing-keel", "name": "Telescoping landing and service keel", "level": "meso", "role": "landing-support", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "landing-support", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "keel-foot", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-foot"}, {"id": "keel-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "telescoping-lock", "placement": "Three nested rails and one annular keel lock.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_landing_keel_14.add(mesh_landing_keel_14);
  meshes["landing-keel"] = mesh_landing_keel_14;
  colliders["landing-keel"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_landing_keel_14);
  const socket_landing_keel_keel_foot_0 = new THREE.Object3D();
  socket_landing_keel_keel_foot_0.name = "keel-foot";
  socket_landing_keel_keel_foot_0.position.set(0.0, 0.0, 0.0);
  socket_landing_keel_keel_foot_0.rotation.set(0, 0, 0);
  socket_landing_keel_keel_foot_0.userData.socket = {"id": "keel-foot", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-foot"};
  node_landing_keel_14.add(socket_landing_keel_keel_foot_0);
  sockets["landing-keel:keel-foot"] = socket_landing_keel_keel_foot_0;
  const socket_landing_keel_keel_camera_1 = new THREE.Object3D();
  socket_landing_keel_keel_camera_1.name = "keel-camera";
  socket_landing_keel_keel_camera_1.position.set(0.0, 0.0, 0.0);
  socket_landing_keel_keel_camera_1.rotation.set(0, 0, 0);
  socket_landing_keel_keel_camera_1.userData.socket = {"id": "keel-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "keel-camera"};
  node_landing_keel_14.add(socket_landing_keel_keel_camera_1);
  sockets["landing-keel:keel-camera"] = socket_landing_keel_keel_camera_1;

  const attachment_hover_lift_array_15 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_hover_lift_array_15 = makeAttachmentEndpoint(attachment_hover_lift_array_15);
  const node_hover_lift_array_15 = new THREE.Group();
  node_hover_lift_array_15.name = "Distributed belly hover-lift array__pivot";
  node_hover_lift_array_15.scale.set(1, 1, 1);
  if (endpoint_hover_lift_array_15) {
    node_hover_lift_array_15.position.copy(endpoint_hover_lift_array_15.start);
    node_hover_lift_array_15.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_hover_lift_array_15.position.set(0.0, 0.0, 0.0);
    node_hover_lift_array_15.rotation.set(0.0, 0.0, 0.0);
  }
  node_hover_lift_array_15.userData.sculptComponent = {"id": "hover-lift-array", "name": "Distributed belly hover-lift array", "level": "meso", "role": "hover-propulsion", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "hover-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "downwash-origin"}, {"id": "hover-emitter-ring", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "hover-emitter-ring"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "downwash-emitters", "placement": "Eight recessed lift emitters around the fixed centre spine.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_hover_lift_array_15.userData.actionProfile = {"animationRole": "hover-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "downwash-origin"}, {"id": "hover-emitter-ring", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "hover-emitter-ring"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_hover_lift_array_15);
  nodes["hover-lift-array"] = node_hover_lift_array_15;
  const mesh_hover_lift_array_15Geometry = endpoint_hover_lift_array_15
    ? new THREE.CylinderGeometry(endpoint_hover_lift_array_15.endRadius, endpoint_hover_lift_array_15.baseRadius, endpoint_hover_lift_array_15.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_hover_lift_array_15) {
    mesh_hover_lift_array_15Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_hover_lift_array_15 = new THREE.Mesh(
    mesh_hover_lift_array_15Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_hover_lift_array_15.name = "Distributed belly hover-lift array";
  if (endpoint_hover_lift_array_15) {
    mesh_hover_lift_array_15.position.copy(endpoint_hover_lift_array_15.midpoint);
    mesh_hover_lift_array_15.quaternion.copy(endpoint_hover_lift_array_15.quaternion);
  }
  mesh_hover_lift_array_15.castShadow = options.castShadow ?? true;
  mesh_hover_lift_array_15.receiveShadow = options.receiveShadow ?? true;
  mesh_hover_lift_array_15.userData.sculptComponent = {"id": "hover-lift-array", "name": "Distributed belly hover-lift array", "level": "meso", "role": "hover-propulsion", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "hover-propulsion", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "downwash-origin"}, {"id": "hover-emitter-ring", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "hover-emitter-ring"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "downwash-emitters", "placement": "Eight recessed lift emitters around the fixed centre spine.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_hover_lift_array_15.add(mesh_hover_lift_array_15);
  meshes["hover-lift-array"] = mesh_hover_lift_array_15;
  colliders["hover-lift-array"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_hover_lift_array_15);
  const socket_hover_lift_array_downwash_origin_0 = new THREE.Object3D();
  socket_hover_lift_array_downwash_origin_0.name = "downwash-origin";
  socket_hover_lift_array_downwash_origin_0.position.set(0.0, 0.0, 0.0);
  socket_hover_lift_array_downwash_origin_0.rotation.set(0, 0, 0);
  socket_hover_lift_array_downwash_origin_0.userData.socket = {"id": "downwash-origin", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "downwash-origin"};
  node_hover_lift_array_15.add(socket_hover_lift_array_downwash_origin_0);
  sockets["hover-lift-array:downwash-origin"] = socket_hover_lift_array_downwash_origin_0;
  const socket_hover_lift_array_hover_emitter_ring_1 = new THREE.Object3D();
  socket_hover_lift_array_hover_emitter_ring_1.name = "hover-emitter-ring";
  socket_hover_lift_array_hover_emitter_ring_1.position.set(0.0, 0.0, 0.0);
  socket_hover_lift_array_hover_emitter_ring_1.rotation.set(0, 0, 0);
  socket_hover_lift_array_hover_emitter_ring_1.userData.socket = {"id": "hover-emitter-ring", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "hover-emitter-ring"};
  node_hover_lift_array_15.add(socket_hover_lift_array_hover_emitter_ring_1);
  sockets["hover-lift-array:hover-emitter-ring"] = socket_hover_lift_array_hover_emitter_ring_1;

  const attachment_interior_volume_reservations_16 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_interior_volume_reservations_16 = makeAttachmentEndpoint(attachment_interior_volume_reservations_16);
  const node_interior_volume_reservations_16 = new THREE.Group();
  node_interior_volume_reservations_16.name = "Named occupied deck reservations__pivot";
  node_interior_volume_reservations_16.scale.set(1, 1, 1);
  if (endpoint_interior_volume_reservations_16) {
    node_interior_volume_reservations_16.position.copy(endpoint_interior_volume_reservations_16.start);
    node_interior_volume_reservations_16.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_interior_volume_reservations_16.position.set(0.0, 0.0, 0.0);
    node_interior_volume_reservations_16.rotation.set(0.0, 0.0, 0.0);
  }
  node_interior_volume_reservations_16.userData.sculptComponent = {"id": "interior-volume-reservations", "name": "Named occupied deck reservations", "level": "meso", "role": "clearance-volume-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "clearance-volume-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"}, {"id": "garage-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry"}, {"id": "creature-deck-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-deck-entry"}, {"id": "bridge-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "bridge-entry"}, {"id": "sky-terrace-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-entry"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "room-entry-sockets", "placement": "Garden, garage, creature habitat, bridge and sky-terrace room camera portals.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_interior_volume_reservations_16.userData.actionProfile = {"animationRole": "clearance-volume-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"}, {"id": "garage-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry"}, {"id": "creature-deck-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-deck-entry"}, {"id": "bridge-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "bridge-entry"}, {"id": "sky-terrace-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-entry"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_interior_volume_reservations_16);
  nodes["interior-volume-reservations"] = node_interior_volume_reservations_16;
  const mesh_interior_volume_reservations_16Geometry = endpoint_interior_volume_reservations_16
    ? new THREE.CylinderGeometry(endpoint_interior_volume_reservations_16.endRadius, endpoint_interior_volume_reservations_16.baseRadius, endpoint_interior_volume_reservations_16.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_interior_volume_reservations_16) {
    mesh_interior_volume_reservations_16Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_interior_volume_reservations_16 = new THREE.Mesh(
    mesh_interior_volume_reservations_16Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_interior_volume_reservations_16.name = "Named occupied deck reservations";
  if (endpoint_interior_volume_reservations_16) {
    mesh_interior_volume_reservations_16.position.copy(endpoint_interior_volume_reservations_16.midpoint);
    mesh_interior_volume_reservations_16.quaternion.copy(endpoint_interior_volume_reservations_16.quaternion);
  }
  mesh_interior_volume_reservations_16.castShadow = options.castShadow ?? true;
  mesh_interior_volume_reservations_16.receiveShadow = options.receiveShadow ?? true;
  mesh_interior_volume_reservations_16.userData.sculptComponent = {"id": "interior-volume-reservations", "name": "Named occupied deck reservations", "level": "meso", "role": "clearance-volume-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "clearance-volume-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"}, {"id": "garage-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry"}, {"id": "creature-deck-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-deck-entry"}, {"id": "bridge-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "bridge-entry"}, {"id": "sky-terrace-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-entry"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "room-entry-sockets", "placement": "Garden, garage, creature habitat, bridge and sky-terrace room camera portals.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_interior_volume_reservations_16.add(mesh_interior_volume_reservations_16);
  meshes["interior-volume-reservations"] = mesh_interior_volume_reservations_16;
  colliders["interior-volume-reservations"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_interior_volume_reservations_16);
  const socket_interior_volume_reservations_garden_entry_0 = new THREE.Object3D();
  socket_interior_volume_reservations_garden_entry_0.name = "garden-entry";
  socket_interior_volume_reservations_garden_entry_0.position.set(0.0, 0.0, 0.0);
  socket_interior_volume_reservations_garden_entry_0.rotation.set(0, 0, 0);
  socket_interior_volume_reservations_garden_entry_0.userData.socket = {"id": "garden-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garden-entry"};
  node_interior_volume_reservations_16.add(socket_interior_volume_reservations_garden_entry_0);
  sockets["interior-volume-reservations:garden-entry"] = socket_interior_volume_reservations_garden_entry_0;
  const socket_interior_volume_reservations_garage_entry_1 = new THREE.Object3D();
  socket_interior_volume_reservations_garage_entry_1.name = "garage-entry";
  socket_interior_volume_reservations_garage_entry_1.position.set(0.0, 0.0, 0.0);
  socket_interior_volume_reservations_garage_entry_1.rotation.set(0, 0, 0);
  socket_interior_volume_reservations_garage_entry_1.userData.socket = {"id": "garage-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "garage-entry"};
  node_interior_volume_reservations_16.add(socket_interior_volume_reservations_garage_entry_1);
  sockets["interior-volume-reservations:garage-entry"] = socket_interior_volume_reservations_garage_entry_1;
  const socket_interior_volume_reservations_creature_deck_entry_2 = new THREE.Object3D();
  socket_interior_volume_reservations_creature_deck_entry_2.name = "creature-deck-entry";
  socket_interior_volume_reservations_creature_deck_entry_2.position.set(0.0, 0.0, 0.0);
  socket_interior_volume_reservations_creature_deck_entry_2.rotation.set(0, 0, 0);
  socket_interior_volume_reservations_creature_deck_entry_2.userData.socket = {"id": "creature-deck-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-deck-entry"};
  node_interior_volume_reservations_16.add(socket_interior_volume_reservations_creature_deck_entry_2);
  sockets["interior-volume-reservations:creature-deck-entry"] = socket_interior_volume_reservations_creature_deck_entry_2;
  const socket_interior_volume_reservations_bridge_entry_3 = new THREE.Object3D();
  socket_interior_volume_reservations_bridge_entry_3.name = "bridge-entry";
  socket_interior_volume_reservations_bridge_entry_3.position.set(0.0, 0.0, 0.0);
  socket_interior_volume_reservations_bridge_entry_3.rotation.set(0, 0, 0);
  socket_interior_volume_reservations_bridge_entry_3.userData.socket = {"id": "bridge-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "bridge-entry"};
  node_interior_volume_reservations_16.add(socket_interior_volume_reservations_bridge_entry_3);
  sockets["interior-volume-reservations:bridge-entry"] = socket_interior_volume_reservations_bridge_entry_3;
  const socket_interior_volume_reservations_sky_terrace_entry_4 = new THREE.Object3D();
  socket_interior_volume_reservations_sky_terrace_entry_4.name = "sky-terrace-entry";
  socket_interior_volume_reservations_sky_terrace_entry_4.position.set(0.0, 0.0, 0.0);
  socket_interior_volume_reservations_sky_terrace_entry_4.rotation.set(0, 0, 0);
  socket_interior_volume_reservations_sky_terrace_entry_4.userData.socket = {"id": "sky-terrace-entry", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-entry"};
  node_interior_volume_reservations_16.add(socket_interior_volume_reservations_sky_terrace_entry_4);
  sockets["interior-volume-reservations:sky-terrace-entry"] = socket_interior_volume_reservations_sky_terrace_entry_4;

  const attachment_bridge_crown_17 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_bridge_crown_17 = makeAttachmentEndpoint(attachment_bridge_crown_17);
  const node_bridge_crown_17 = new THREE.Group();
  node_bridge_crown_17.name = "Forward command bridge crown__pivot";
  node_bridge_crown_17.scale.set(1, 1, 1);
  if (endpoint_bridge_crown_17) {
    node_bridge_crown_17.position.copy(endpoint_bridge_crown_17.start);
    node_bridge_crown_17.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_bridge_crown_17.position.set(0.0, 0.0, 0.0);
    node_bridge_crown_17.rotation.set(0.0, 0.0, 0.0);
  }
  node_bridge_crown_17.userData.sculptComponent = {"id": "bridge-crown", "name": "Forward command bridge crown", "level": "meso", "role": "command-deck", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "command-deck", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "travel-pov-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "travel-pov-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "smoked-bridge-glass"}}, "material": "smoked-bridge-glass", "materialLayers": ["smoked-bridge-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "smoked-bridge-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 42, 55, 0.78)", "secondaryAlbedo": "rgba(68, 165, 214, 0.42)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 42, 55, 0.78)"}, {"at": 1, "color": "rgba(68, 165, 214, 0.42)"}]}, "evidenceRefs": ["full-object"]}};
  node_bridge_crown_17.userData.actionProfile = {"animationRole": "command-deck", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "travel-pov-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "travel-pov-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "smoked-bridge-glass"}};
  (nodes["center-spine"] ?? root).add(node_bridge_crown_17);
  nodes["bridge-crown"] = node_bridge_crown_17;
  const mesh_bridge_crown_17Geometry = endpoint_bridge_crown_17
    ? new THREE.CylinderGeometry(endpoint_bridge_crown_17.endRadius, endpoint_bridge_crown_17.baseRadius, endpoint_bridge_crown_17.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_bridge_crown_17) {
    mesh_bridge_crown_17Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_bridge_crown_17 = new THREE.Mesh(
    mesh_bridge_crown_17Geometry,
    materialMap["smoked-bridge-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_bridge_crown_17.name = "Forward command bridge crown";
  if (endpoint_bridge_crown_17) {
    mesh_bridge_crown_17.position.copy(endpoint_bridge_crown_17.midpoint);
    mesh_bridge_crown_17.quaternion.copy(endpoint_bridge_crown_17.quaternion);
  }
  mesh_bridge_crown_17.castShadow = options.castShadow ?? true;
  mesh_bridge_crown_17.receiveShadow = options.receiveShadow ?? true;
  mesh_bridge_crown_17.userData.sculptComponent = {"id": "bridge-crown", "name": "Forward command bridge crown", "level": "meso", "role": "command-deck", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "command-deck", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "travel-pov-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "travel-pov-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "smoked-bridge-glass"}}, "material": "smoked-bridge-glass", "materialLayers": ["smoked-bridge-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "smoked-bridge-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 42, 55, 0.78)", "secondaryAlbedo": "rgba(68, 165, 214, 0.42)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 42, 55, 0.78)"}, {"at": 1, "color": "rgba(68, 165, 214, 0.42)"}]}, "evidenceRefs": ["full-object"]}};
  node_bridge_crown_17.add(mesh_bridge_crown_17);
  meshes["bridge-crown"] = mesh_bridge_crown_17;
  colliders["bridge-crown"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_bridge_crown_17);
  const socket_bridge_crown_travel_pov_camera_0 = new THREE.Object3D();
  socket_bridge_crown_travel_pov_camera_0.name = "travel-pov-camera";
  socket_bridge_crown_travel_pov_camera_0.position.set(0.0, 0.0, 0.0);
  socket_bridge_crown_travel_pov_camera_0.rotation.set(0, 0, 0);
  socket_bridge_crown_travel_pov_camera_0.userData.socket = {"id": "travel-pov-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "travel-pov-camera"};
  node_bridge_crown_17.add(socket_bridge_crown_travel_pov_camera_0);
  sockets["bridge-crown:travel-pov-camera"] = socket_bridge_crown_travel_pov_camera_0;

  const attachment_central_deck_stack_18 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_central_deck_stack_18 = makeAttachmentEndpoint(attachment_central_deck_stack_18);
  const node_central_deck_stack_18 = new THREE.Group();
  node_central_deck_stack_18.name = "Central inhabited deck stack__pivot";
  node_central_deck_stack_18.scale.set(1, 1, 1);
  if (endpoint_central_deck_stack_18) {
    node_central_deck_stack_18.position.copy(endpoint_central_deck_stack_18.start);
    node_central_deck_stack_18.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_central_deck_stack_18.position.set(0.0, 0.0, 0.0);
    node_central_deck_stack_18.rotation.set(0.0, 0.0, 0.0);
  }
  node_central_deck_stack_18.userData.sculptComponent = {"id": "central-deck-stack", "name": "Central inhabited deck stack", "level": "meso", "role": "occupied-decks", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_central_deck_stack_18.userData.actionProfile = {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}};
  (nodes["center-spine"] ?? root).add(node_central_deck_stack_18);
  nodes["central-deck-stack"] = node_central_deck_stack_18;
  const mesh_central_deck_stack_18Geometry = endpoint_central_deck_stack_18
    ? new THREE.CylinderGeometry(endpoint_central_deck_stack_18.endRadius, endpoint_central_deck_stack_18.baseRadius, endpoint_central_deck_stack_18.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_central_deck_stack_18) {
    mesh_central_deck_stack_18Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_central_deck_stack_18 = new THREE.Mesh(
    mesh_central_deck_stack_18Geometry,
    materialMap["warm-window-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_central_deck_stack_18.name = "Central inhabited deck stack";
  if (endpoint_central_deck_stack_18) {
    mesh_central_deck_stack_18.position.copy(endpoint_central_deck_stack_18.midpoint);
    mesh_central_deck_stack_18.quaternion.copy(endpoint_central_deck_stack_18.quaternion);
  }
  mesh_central_deck_stack_18.castShadow = options.castShadow ?? true;
  mesh_central_deck_stack_18.receiveShadow = options.receiveShadow ?? true;
  mesh_central_deck_stack_18.userData.sculptComponent = {"id": "central-deck-stack", "name": "Central inhabited deck stack", "level": "meso", "role": "occupied-decks", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_central_deck_stack_18.add(mesh_central_deck_stack_18);
  meshes["central-deck-stack"] = mesh_central_deck_stack_18;
  colliders["central-deck-stack"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_central_deck_stack_18);

  const attachment_left_occupied_decks_19 = {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_left_occupied_decks_19 = makeAttachmentEndpoint(attachment_left_occupied_decks_19);
  const node_left_occupied_decks_19 = new THREE.Group();
  node_left_occupied_decks_19.name = "Left offices and homes deck cassette__pivot";
  node_left_occupied_decks_19.scale.set(1, 1, 1);
  if (endpoint_left_occupied_decks_19) {
    node_left_occupied_decks_19.position.copy(endpoint_left_occupied_decks_19.start);
    node_left_occupied_decks_19.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_left_occupied_decks_19.position.set(0.0, 0.0, 0.0);
    node_left_occupied_decks_19.rotation.set(0.0, 0.0, 0.0);
  }
  node_left_occupied_decks_19.userData.sculptComponent = {"id": "left-occupied-decks", "name": "Left offices and homes deck cassette", "level": "meso", "role": "occupied-decks", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_occupied_decks_19.userData.actionProfile = {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}};
  (nodes["left-wing-pivot"] ?? root).add(node_left_occupied_decks_19);
  nodes["left-occupied-decks"] = node_left_occupied_decks_19;
  const mesh_left_occupied_decks_19Geometry = endpoint_left_occupied_decks_19
    ? new THREE.CylinderGeometry(endpoint_left_occupied_decks_19.endRadius, endpoint_left_occupied_decks_19.baseRadius, endpoint_left_occupied_decks_19.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_left_occupied_decks_19) {
    mesh_left_occupied_decks_19Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_left_occupied_decks_19 = new THREE.Mesh(
    mesh_left_occupied_decks_19Geometry,
    materialMap["warm-window-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_left_occupied_decks_19.name = "Left offices and homes deck cassette";
  if (endpoint_left_occupied_decks_19) {
    mesh_left_occupied_decks_19.position.copy(endpoint_left_occupied_decks_19.midpoint);
    mesh_left_occupied_decks_19.quaternion.copy(endpoint_left_occupied_decks_19.quaternion);
  }
  mesh_left_occupied_decks_19.castShadow = options.castShadow ?? true;
  mesh_left_occupied_decks_19.receiveShadow = options.receiveShadow ?? true;
  mesh_left_occupied_decks_19.userData.sculptComponent = {"id": "left-occupied-decks", "name": "Left offices and homes deck cassette", "level": "meso", "role": "occupied-decks", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "left-wing-pivot", "attachment": {"parentId": "left-wing-pivot", "parentSocket": "left-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_left_occupied_decks_19.add(mesh_left_occupied_decks_19);
  meshes["left-occupied-decks"] = mesh_left_occupied_decks_19;
  colliders["left-occupied-decks"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_left_occupied_decks_19);

  const attachment_right_occupied_decks_20 = {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_right_occupied_decks_20 = makeAttachmentEndpoint(attachment_right_occupied_decks_20);
  const node_right_occupied_decks_20 = new THREE.Group();
  node_right_occupied_decks_20.name = "Right creature habitat and offices cassette__pivot";
  node_right_occupied_decks_20.scale.set(1, 1, 1);
  if (endpoint_right_occupied_decks_20) {
    node_right_occupied_decks_20.position.copy(endpoint_right_occupied_decks_20.start);
    node_right_occupied_decks_20.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_right_occupied_decks_20.position.set(0.0, 0.0, 0.0);
    node_right_occupied_decks_20.rotation.set(0.0, 0.0, 0.0);
  }
  node_right_occupied_decks_20.userData.sculptComponent = {"id": "right-occupied-decks", "name": "Right creature habitat and offices cassette", "level": "meso", "role": "occupied-decks", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_occupied_decks_20.userData.actionProfile = {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}};
  (nodes["right-wing-pivot"] ?? root).add(node_right_occupied_decks_20);
  nodes["right-occupied-decks"] = node_right_occupied_decks_20;
  const mesh_right_occupied_decks_20Geometry = endpoint_right_occupied_decks_20
    ? new THREE.CylinderGeometry(endpoint_right_occupied_decks_20.endRadius, endpoint_right_occupied_decks_20.baseRadius, endpoint_right_occupied_decks_20.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_right_occupied_decks_20) {
    mesh_right_occupied_decks_20Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_right_occupied_decks_20 = new THREE.Mesh(
    mesh_right_occupied_decks_20Geometry,
    materialMap["warm-window-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_right_occupied_decks_20.name = "Right creature habitat and offices cassette";
  if (endpoint_right_occupied_decks_20) {
    mesh_right_occupied_decks_20.position.copy(endpoint_right_occupied_decks_20.midpoint);
    mesh_right_occupied_decks_20.quaternion.copy(endpoint_right_occupied_decks_20.quaternion);
  }
  mesh_right_occupied_decks_20.castShadow = options.castShadow ?? true;
  mesh_right_occupied_decks_20.receiveShadow = options.receiveShadow ?? true;
  mesh_right_occupied_decks_20.userData.sculptComponent = {"id": "right-occupied-decks", "name": "Right creature habitat and offices cassette", "level": "meso", "role": "occupied-decks", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-wing-pivot", "attachment": {"parentId": "right-wing-pivot", "parentSocket": "right-wing-pivot-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-decks", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_right_occupied_decks_20.add(mesh_right_occupied_decks_20);
  meshes["right-occupied-decks"] = mesh_right_occupied_decks_20;
  colliders["right-occupied-decks"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_right_occupied_decks_20);

  const attachment_garage_door_21 = {"parentId": "garage-belly", "parentSocket": "garage-belly-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_garage_door_21 = makeAttachmentEndpoint(attachment_garage_door_21);
  const node_garage_door_21 = new THREE.Group();
  node_garage_door_21.name = "Garage clamshell door pair__pivot";
  node_garage_door_21.scale.set(1, 1, 1);
  if (endpoint_garage_door_21) {
    node_garage_door_21.position.copy(endpoint_garage_door_21.start);
    node_garage_door_21.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_garage_door_21.position.set(0.0, 0.0, 0.0);
    node_garage_door_21.rotation.set(0.0, 0.0, 0.0);
  }
  node_garage_door_21.userData.sculptComponent = {"id": "garage-door", "name": "Garage clamshell door pair", "level": "meso", "role": "room-entry-mechanism", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garage-belly", "attachment": {"parentId": "garage-belly", "parentSocket": "garage-belly-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "garage-door-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_garage_door_21.userData.actionProfile = {"animationRole": "garage-door-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["garage-belly"] ?? root).add(node_garage_door_21);
  nodes["garage-door"] = node_garage_door_21;
  const mesh_garage_door_21Geometry = endpoint_garage_door_21
    ? new THREE.CylinderGeometry(endpoint_garage_door_21.endRadius, endpoint_garage_door_21.baseRadius, endpoint_garage_door_21.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_garage_door_21) {
    mesh_garage_door_21Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_garage_door_21 = new THREE.Mesh(
    mesh_garage_door_21Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_garage_door_21.name = "Garage clamshell door pair";
  if (endpoint_garage_door_21) {
    mesh_garage_door_21.position.copy(endpoint_garage_door_21.midpoint);
    mesh_garage_door_21.quaternion.copy(endpoint_garage_door_21.quaternion);
  }
  mesh_garage_door_21.castShadow = options.castShadow ?? true;
  mesh_garage_door_21.receiveShadow = options.receiveShadow ?? true;
  mesh_garage_door_21.userData.sculptComponent = {"id": "garage-door", "name": "Garage clamshell door pair", "level": "meso", "role": "room-entry-mechanism", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garage-belly", "attachment": {"parentId": "garage-belly", "parentSocket": "garage-belly-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "garage-door-hinge", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_garage_door_21.add(mesh_garage_door_21);
  meshes["garage-door"] = mesh_garage_door_21;
  colliders["garage-door"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_garage_door_21);

  const attachment_sky_terrace_22 = {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_sky_terrace_22 = makeAttachmentEndpoint(attachment_sky_terrace_22);
  const node_sky_terrace_22 = new THREE.Group();
  node_sky_terrace_22.name = "Great Tree sky terrace__pivot";
  node_sky_terrace_22.scale.set(1, 1, 1);
  if (endpoint_sky_terrace_22) {
    node_sky_terrace_22.position.copy(endpoint_sky_terrace_22.start);
    node_sky_terrace_22.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_sky_terrace_22.position.set(0.0, 0.0, 0.0);
    node_sky_terrace_22.rotation.set(0.0, 0.0, 0.0);
  }
  node_sky_terrace_22.userData.sculptComponent = {"id": "sky-terrace", "name": "Great Tree sky terrace", "level": "meso", "role": "social-story-deck", "importance": 0.8, "confidence": 0.86, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garden-atrium", "attachment": {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "social-story-deck", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "sky-terrace-seat", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-seat"}, {"id": "mission-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "mission-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-foliage"}}, "material": "garden-foliage", "materialLayers": ["garden-foliage"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "garden-foliage-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(54, 105, 48, 1)", "secondaryAlbedo": "rgba(147, 183, 86, 1)", "materialClass": "unknown", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(54, 105, 48, 1)"}, {"at": 1, "color": "rgba(147, 183, 86, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_sky_terrace_22.userData.actionProfile = {"animationRole": "social-story-deck", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "sky-terrace-seat", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-seat"}, {"id": "mission-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "mission-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-foliage"}};
  (nodes["garden-atrium"] ?? root).add(node_sky_terrace_22);
  nodes["sky-terrace"] = node_sky_terrace_22;
  const mesh_sky_terrace_22Geometry = endpoint_sky_terrace_22
    ? new THREE.CylinderGeometry(endpoint_sky_terrace_22.endRadius, endpoint_sky_terrace_22.baseRadius, endpoint_sky_terrace_22.length, 32, 12)
    : new THREE.CylinderGeometry(0.5, 0.5, 1, 48, 16);
  if (!endpoint_sky_terrace_22) {
    mesh_sky_terrace_22Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_sky_terrace_22 = new THREE.Mesh(
    mesh_sky_terrace_22Geometry,
    materialMap["garden-foliage"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_sky_terrace_22.name = "Great Tree sky terrace";
  if (endpoint_sky_terrace_22) {
    mesh_sky_terrace_22.position.copy(endpoint_sky_terrace_22.midpoint);
    mesh_sky_terrace_22.quaternion.copy(endpoint_sky_terrace_22.quaternion);
  }
  mesh_sky_terrace_22.castShadow = options.castShadow ?? true;
  mesh_sky_terrace_22.receiveShadow = options.receiveShadow ?? true;
  mesh_sky_terrace_22.userData.sculptComponent = {"id": "sky-terrace", "name": "Great Tree sky terrace", "level": "meso", "role": "social-story-deck", "importance": 0.8, "confidence": 0.86, "primitive": "cylinder", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garden-atrium", "attachment": {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "social-story-deck", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "sky-terrace-seat", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-seat"}, {"id": "mission-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "mission-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "garden-foliage"}}, "material": "garden-foliage", "materialLayers": ["garden-foliage"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "garden-foliage-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(54, 105, 48, 1)", "secondaryAlbedo": "rgba(147, 183, 86, 1)", "materialClass": "unknown", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(54, 105, 48, 1)"}, {"at": 1, "color": "rgba(147, 183, 86, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_sky_terrace_22.add(mesh_sky_terrace_22);
  meshes["sky-terrace"] = mesh_sky_terrace_22;
  colliders["sky-terrace"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_sky_terrace_22);
  const socket_sky_terrace_sky_terrace_seat_0 = new THREE.Object3D();
  socket_sky_terrace_sky_terrace_seat_0.name = "sky-terrace-seat";
  socket_sky_terrace_sky_terrace_seat_0.position.set(0.0, 0.0, 0.0);
  socket_sky_terrace_sky_terrace_seat_0.rotation.set(0, 0, 0);
  socket_sky_terrace_sky_terrace_seat_0.userData.socket = {"id": "sky-terrace-seat", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "sky-terrace-seat"};
  node_sky_terrace_22.add(socket_sky_terrace_sky_terrace_seat_0);
  sockets["sky-terrace:sky-terrace-seat"] = socket_sky_terrace_sky_terrace_seat_0;
  const socket_sky_terrace_mission_camera_1 = new THREE.Object3D();
  socket_sky_terrace_mission_camera_1.name = "mission-camera";
  socket_sky_terrace_mission_camera_1.position.set(0.0, 0.0, 0.0);
  socket_sky_terrace_mission_camera_1.rotation.set(0, 0, 0);
  socket_sky_terrace_mission_camera_1.userData.socket = {"id": "mission-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "mission-camera"};
  node_sky_terrace_22.add(socket_sky_terrace_mission_camera_1);
  sockets["sky-terrace:mission-camera"] = socket_sky_terrace_mission_camera_1;

  const attachment_great_tree_23 = {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_great_tree_23 = makeAttachmentEndpoint(attachment_great_tree_23);
  const node_great_tree_23 = new THREE.Group();
  node_great_tree_23.name = "Central living Great Tree__pivot";
  node_great_tree_23.scale.set(1, 1, 1);
  if (endpoint_great_tree_23) {
    node_great_tree_23.position.copy(endpoint_great_tree_23.start);
    node_great_tree_23.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_great_tree_23.position.set(0.0, 0.0, 0.0);
    node_great_tree_23.rotation.set(0.0, 0.0, 0.0);
  }
  node_great_tree_23.userData.sculptComponent = {"id": "great-tree", "name": "Central living Great Tree", "level": "meso", "role": "botanical-heart", "importance": 0.8, "confidence": 0.86, "primitive": "curve-sweep", "topologyClass": "continuous-sculpt", "topologyRationale": "A rooted tapering trunk and branching canopy require continuous curves and organic deformation.", "geometryDescriptor": {"topologyIntent": "continuous curved volume with controlled vertex deformation", "edgeTreatment": {"type": "rounded-profile", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garden-atrium", "attachment": {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "botanical-heart", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "great-tree-bark"}}, "material": "great-tree-bark", "materialLayers": ["great-tree-bark"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "great-tree-bark-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(73, 49, 32, 1)", "secondaryAlbedo": "rgba(137, 95, 50, 1)", "materialClass": "wood", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(73, 49, 32, 1)"}, {"at": 1, "color": "rgba(137, 95, 50, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_great_tree_23.userData.actionProfile = {"animationRole": "botanical-heart", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "great-tree-bark"}};
  (nodes["garden-atrium"] ?? root).add(node_great_tree_23);
  nodes["great-tree"] = node_great_tree_23;
  const mesh_great_tree_23Geometry = endpoint_great_tree_23
    ? new THREE.CylinderGeometry(endpoint_great_tree_23.endRadius, endpoint_great_tree_23.baseRadius, endpoint_great_tree_23.length, 32, 12)
    : buildCurveSweepGeometry({"spine": [[-0.5, -0.4, 0.0], [-0.1, 0.1, 0.0], [0.3, 0.2, 0.0], [0.6, -0.1, 0.0]], "crossSection": {"points": [[-0.04, -0.02], [0.04, -0.02], [0.04, 0.02], [-0.04, 0.02]]}, "closed": false});
  if (!endpoint_great_tree_23) {
    mesh_great_tree_23Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_great_tree_23 = new THREE.Mesh(
    mesh_great_tree_23Geometry,
    materialMap["great-tree-bark"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_great_tree_23.name = "Central living Great Tree";
  if (endpoint_great_tree_23) {
    mesh_great_tree_23.position.copy(endpoint_great_tree_23.midpoint);
    mesh_great_tree_23.quaternion.copy(endpoint_great_tree_23.quaternion);
  }
  mesh_great_tree_23.castShadow = options.castShadow ?? true;
  mesh_great_tree_23.receiveShadow = options.receiveShadow ?? true;
  mesh_great_tree_23.userData.sculptComponent = {"id": "great-tree", "name": "Central living Great Tree", "level": "meso", "role": "botanical-heart", "importance": 0.8, "confidence": 0.86, "primitive": "curve-sweep", "topologyClass": "continuous-sculpt", "topologyRationale": "A rooted tapering trunk and branching canopy require continuous curves and organic deformation.", "geometryDescriptor": {"topologyIntent": "continuous curved volume with controlled vertex deformation", "edgeTreatment": {"type": "rounded-profile", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garden-atrium", "attachment": {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "botanical-heart", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "great-tree-bark"}}, "material": "great-tree-bark", "materialLayers": ["great-tree-bark"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "great-tree-bark-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(73, 49, 32, 1)", "secondaryAlbedo": "rgba(137, 95, 50, 1)", "materialClass": "wood", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(73, 49, 32, 1)"}, {"at": 1, "color": "rgba(137, 95, 50, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_great_tree_23.add(mesh_great_tree_23);
  meshes["great-tree"] = mesh_great_tree_23;
  colliders["great-tree"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_great_tree_23);

  const attachment_atrium_water_24 = {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_atrium_water_24 = makeAttachmentEndpoint(attachment_atrium_water_24);
  const node_atrium_water_24 = new THREE.Group();
  node_atrium_water_24.name = "Central garden stream and pools__pivot";
  node_atrium_water_24.scale.set(1, 1, 1);
  if (endpoint_atrium_water_24) {
    node_atrium_water_24.position.copy(endpoint_atrium_water_24.start);
    node_atrium_water_24.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_atrium_water_24.position.set(0.0, 0.0, 0.0);
    node_atrium_water_24.rotation.set(0.0, 0.0, 0.0);
  }
  node_atrium_water_24.userData.sculptComponent = {"id": "atrium-water", "name": "Central garden stream and pools", "level": "meso", "role": "botanical-water-system", "importance": 0.8, "confidence": 0.86, "primitive": "plane-card", "topologyClass": "material-only", "topologyRationale": "Thin water is a layered visual surface owned by the protected garden volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garden-atrium", "attachment": {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "botanical-water-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "atrium-water"}}, "material": "atrium-water", "materialLayers": ["atrium-water"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "atrium-water-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(35, 149, 169, 0.72)", "secondaryAlbedo": "rgba(126, 227, 226, 0.62)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(35, 149, 169, 0.72)"}, {"at": 1, "color": "rgba(126, 227, 226, 0.62)"}]}, "evidenceRefs": ["full-object"]}};
  node_atrium_water_24.userData.actionProfile = {"animationRole": "botanical-water-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "atrium-water"}};
  (nodes["garden-atrium"] ?? root).add(node_atrium_water_24);
  nodes["atrium-water"] = node_atrium_water_24;
  const mesh_atrium_water_24Geometry = endpoint_atrium_water_24
    ? new THREE.CylinderGeometry(endpoint_atrium_water_24.endRadius, endpoint_atrium_water_24.baseRadius, endpoint_atrium_water_24.length, 32, 12)
    : new THREE.PlaneGeometry(1, 1, 24, 24);
  if (!endpoint_atrium_water_24) {
    mesh_atrium_water_24Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_atrium_water_24 = new THREE.Mesh(
    mesh_atrium_water_24Geometry,
    materialMap["atrium-water"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_atrium_water_24.name = "Central garden stream and pools";
  if (endpoint_atrium_water_24) {
    mesh_atrium_water_24.position.copy(endpoint_atrium_water_24.midpoint);
    mesh_atrium_water_24.quaternion.copy(endpoint_atrium_water_24.quaternion);
  }
  mesh_atrium_water_24.castShadow = options.castShadow ?? true;
  mesh_atrium_water_24.receiveShadow = options.receiveShadow ?? true;
  mesh_atrium_water_24.userData.sculptComponent = {"id": "atrium-water", "name": "Central garden stream and pools", "level": "meso", "role": "botanical-water-system", "importance": 0.8, "confidence": 0.86, "primitive": "plane-card", "topologyClass": "material-only", "topologyRationale": "Thin water is a layered visual surface owned by the protected garden volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garden-atrium", "attachment": {"parentId": "garden-atrium", "parentSocket": "garden-atrium-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "botanical-water-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "atrium-water"}}, "material": "atrium-water", "materialLayers": ["atrium-water"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "atrium-water-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(35, 149, 169, 0.72)", "secondaryAlbedo": "rgba(126, 227, 226, 0.62)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(35, 149, 169, 0.72)"}, {"at": 1, "color": "rgba(126, 227, 226, 0.62)"}]}, "evidenceRefs": ["full-object"]}};
  node_atrium_water_24.add(mesh_atrium_water_24);
  meshes["atrium-water"] = mesh_atrium_water_24;
  colliders["atrium-water"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_atrium_water_24);

  const attachment_fabrication_deck_25 = {"parentId": "garage-belly", "parentSocket": "garage-belly-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_fabrication_deck_25 = makeAttachmentEndpoint(attachment_fabrication_deck_25);
  const node_fabrication_deck_25 = new THREE.Group();
  node_fabrication_deck_25.name = "Fabrication builders deck reserve__pivot";
  node_fabrication_deck_25.scale.set(1, 1, 1);
  if (endpoint_fabrication_deck_25) {
    node_fabrication_deck_25.position.copy(endpoint_fabrication_deck_25.start);
    node_fabrication_deck_25.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_fabrication_deck_25.position.set(0.0, 0.0, 0.0);
    node_fabrication_deck_25.rotation.set(0.0, 0.0, 0.0);
  }
  node_fabrication_deck_25.userData.sculptComponent = {"id": "fabrication-deck", "name": "Fabrication builders deck reserve", "level": "meso", "role": "occupied-workshop", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garage-belly", "attachment": {"parentId": "garage-belly", "parentSocket": "garage-belly-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-workshop", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "fabrication-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "fabrication-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_fabrication_deck_25.userData.actionProfile = {"animationRole": "occupied-workshop", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "fabrication-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "fabrication-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["garage-belly"] ?? root).add(node_fabrication_deck_25);
  nodes["fabrication-deck"] = node_fabrication_deck_25;
  const mesh_fabrication_deck_25Geometry = endpoint_fabrication_deck_25
    ? new THREE.CylinderGeometry(endpoint_fabrication_deck_25.endRadius, endpoint_fabrication_deck_25.baseRadius, endpoint_fabrication_deck_25.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_fabrication_deck_25) {
    mesh_fabrication_deck_25Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_fabrication_deck_25 = new THREE.Mesh(
    mesh_fabrication_deck_25Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_fabrication_deck_25.name = "Fabrication builders deck reserve";
  if (endpoint_fabrication_deck_25) {
    mesh_fabrication_deck_25.position.copy(endpoint_fabrication_deck_25.midpoint);
    mesh_fabrication_deck_25.quaternion.copy(endpoint_fabrication_deck_25.quaternion);
  }
  mesh_fabrication_deck_25.castShadow = options.castShadow ?? true;
  mesh_fabrication_deck_25.receiveShadow = options.receiveShadow ?? true;
  mesh_fabrication_deck_25.userData.sculptComponent = {"id": "fabrication-deck", "name": "Fabrication builders deck reserve", "level": "meso", "role": "occupied-workshop", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "garage-belly", "attachment": {"parentId": "garage-belly", "parentSocket": "garage-belly-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-workshop", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "fabrication-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "fabrication-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_fabrication_deck_25.add(mesh_fabrication_deck_25);
  meshes["fabrication-deck"] = mesh_fabrication_deck_25;
  colliders["fabrication-deck"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_fabrication_deck_25);
  const socket_fabrication_deck_fabrication_camera_0 = new THREE.Object3D();
  socket_fabrication_deck_fabrication_camera_0.name = "fabrication-camera";
  socket_fabrication_deck_fabrication_camera_0.position.set(0.0, 0.0, 0.0);
  socket_fabrication_deck_fabrication_camera_0.rotation.set(0, 0, 0);
  socket_fabrication_deck_fabrication_camera_0.userData.socket = {"id": "fabrication-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "fabrication-camera"};
  node_fabrication_deck_25.add(socket_fabrication_deck_fabrication_camera_0);
  sockets["fabrication-deck:fabrication-camera"] = socket_fabrication_deck_fabrication_camera_0;

  const attachment_creature_deck_26 = {"parentId": "right-occupied-decks", "parentSocket": "right-occupied-decks-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_creature_deck_26 = makeAttachmentEndpoint(attachment_creature_deck_26);
  const node_creature_deck_26 = new THREE.Group();
  node_creature_deck_26.name = "Creature habitat deck reserve__pivot";
  node_creature_deck_26.scale.set(1, 1, 1);
  if (endpoint_creature_deck_26) {
    node_creature_deck_26.position.copy(endpoint_creature_deck_26.start);
    node_creature_deck_26.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_creature_deck_26.position.set(0.0, 0.0, 0.0);
    node_creature_deck_26.rotation.set(0.0, 0.0, 0.0);
  }
  node_creature_deck_26.userData.sculptComponent = {"id": "creature-deck", "name": "Creature habitat deck reserve", "level": "meso", "role": "occupied-habitat", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-occupied-decks", "attachment": {"parentId": "right-occupied-decks", "parentSocket": "right-occupied-decks-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-habitat", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "creature-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_creature_deck_26.userData.actionProfile = {"animationRole": "occupied-habitat", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "creature-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["right-occupied-decks"] ?? root).add(node_creature_deck_26);
  nodes["creature-deck"] = node_creature_deck_26;
  const mesh_creature_deck_26Geometry = endpoint_creature_deck_26
    ? new THREE.CylinderGeometry(endpoint_creature_deck_26.endRadius, endpoint_creature_deck_26.baseRadius, endpoint_creature_deck_26.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_creature_deck_26) {
    mesh_creature_deck_26Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_creature_deck_26 = new THREE.Mesh(
    mesh_creature_deck_26Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_creature_deck_26.name = "Creature habitat deck reserve";
  if (endpoint_creature_deck_26) {
    mesh_creature_deck_26.position.copy(endpoint_creature_deck_26.midpoint);
    mesh_creature_deck_26.quaternion.copy(endpoint_creature_deck_26.quaternion);
  }
  mesh_creature_deck_26.castShadow = options.castShadow ?? true;
  mesh_creature_deck_26.receiveShadow = options.receiveShadow ?? true;
  mesh_creature_deck_26.userData.sculptComponent = {"id": "creature-deck", "name": "Creature habitat deck reserve", "level": "meso", "role": "occupied-habitat", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "right-occupied-decks", "attachment": {"parentId": "right-occupied-decks", "parentSocket": "right-occupied-decks-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "occupied-habitat", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "creature-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-camera"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "structural", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_creature_deck_26.add(mesh_creature_deck_26);
  meshes["creature-deck"] = mesh_creature_deck_26;
  colliders["creature-deck"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_creature_deck_26);
  const socket_creature_deck_creature_camera_0 = new THREE.Object3D();
  socket_creature_deck_creature_camera_0.name = "creature-camera";
  socket_creature_deck_creature_camera_0.position.set(0.0, 0.0, 0.0);
  socket_creature_deck_creature_camera_0.rotation.set(0, 0, 0);
  socket_creature_deck_creature_camera_0.userData.socket = {"id": "creature-camera", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "creature-camera"};
  node_creature_deck_26.add(socket_creature_deck_creature_camera_0);
  sockets["creature-deck:creature-camera"] = socket_creature_deck_creature_camera_0;

  const attachment_window_band_system_27 = {"parentId": "central-deck-stack", "parentSocket": "central-deck-stack-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_window_band_system_27 = makeAttachmentEndpoint(attachment_window_band_system_27);
  const node_window_band_system_27 = new THREE.Group();
  node_window_band_system_27.name = "Warm inhabited window bands__pivot";
  node_window_band_system_27.scale.set(1, 1, 1);
  if (endpoint_window_band_system_27) {
    node_window_band_system_27.position.copy(endpoint_window_band_system_27.start);
    node_window_band_system_27.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_window_band_system_27.position.set(0.0, 0.0, 0.0);
    node_window_band_system_27.rotation.set(0.0, 0.0, 0.0);
  }
  node_window_band_system_27.userData.sculptComponent = {"id": "window-band-system", "name": "Warm inhabited window bands", "level": "micro", "role": "repeated-window-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "central-deck-stack", "attachment": {"parentId": "central-deck-stack", "parentSocket": "central-deck-stack-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "repeated-window-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_window_band_system_27.userData.actionProfile = {"animationRole": "repeated-window-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}};
  (nodes["central-deck-stack"] ?? root).add(node_window_band_system_27);
  nodes["window-band-system"] = node_window_band_system_27;
  const mesh_window_band_system_27Geometry = endpoint_window_band_system_27
    ? new THREE.CylinderGeometry(endpoint_window_band_system_27.endRadius, endpoint_window_band_system_27.baseRadius, endpoint_window_band_system_27.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_window_band_system_27) {
    mesh_window_band_system_27Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_window_band_system_27 = new THREE.Mesh(
    mesh_window_band_system_27Geometry,
    materialMap["warm-window-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_window_band_system_27.name = "Warm inhabited window bands";
  if (endpoint_window_band_system_27) {
    mesh_window_band_system_27.position.copy(endpoint_window_band_system_27.midpoint);
    mesh_window_band_system_27.quaternion.copy(endpoint_window_band_system_27.quaternion);
  }
  mesh_window_band_system_27.castShadow = options.castShadow ?? true;
  mesh_window_band_system_27.receiveShadow = options.receiveShadow ?? true;
  mesh_window_band_system_27.userData.sculptComponent = {"id": "window-band-system", "name": "Warm inhabited window bands", "level": "micro", "role": "repeated-window-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "central-deck-stack", "attachment": {"parentId": "central-deck-stack", "parentSocket": "central-deck-stack-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "repeated-window-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_window_band_system_27.add(mesh_window_band_system_27);
  meshes["window-band-system"] = mesh_window_band_system_27;
  colliders["window-band-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_window_band_system_27);

  const attachment_service_seam_system_28 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_service_seam_system_28 = makeAttachmentEndpoint(attachment_service_seam_system_28);
  const node_service_seam_system_28 = new THREE.Group();
  node_service_seam_system_28.name = "Sparse shell service panel lines__pivot";
  node_service_seam_system_28.scale.set(1, 1, 1);
  if (endpoint_service_seam_system_28) {
    node_service_seam_system_28.position.copy(endpoint_service_seam_system_28.start);
    node_service_seam_system_28.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_service_seam_system_28.position.set(0.0, 0.0, 0.0);
    node_service_seam_system_28.rotation.set(0.0, 0.0, 0.0);
  }
  node_service_seam_system_28.userData.sculptComponent = {"id": "service-seam-system", "name": "Sparse shell service panel lines", "level": "micro", "role": "panel-line-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "panel-line-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}}, "material": "white-ceramic-shell", "materialLayers": ["white-ceramic-shell"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "white-ceramic-shell-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(227, 224, 217, 1)", "secondaryAlbedo": "rgba(179, 184, 188, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(227, 224, 217, 1)"}, {"at": 1, "color": "rgba(179, 184, 188, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_service_seam_system_28.userData.actionProfile = {"animationRole": "panel-line-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}};
  (nodes["root"] ?? root).add(node_service_seam_system_28);
  nodes["service-seam-system"] = node_service_seam_system_28;
  const mesh_service_seam_system_28Geometry = endpoint_service_seam_system_28
    ? new THREE.CylinderGeometry(endpoint_service_seam_system_28.endRadius, endpoint_service_seam_system_28.baseRadius, endpoint_service_seam_system_28.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_service_seam_system_28) {
    mesh_service_seam_system_28Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_service_seam_system_28 = new THREE.Mesh(
    mesh_service_seam_system_28Geometry,
    materialMap["white-ceramic-shell"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_service_seam_system_28.name = "Sparse shell service panel lines";
  if (endpoint_service_seam_system_28) {
    mesh_service_seam_system_28.position.copy(endpoint_service_seam_system_28.midpoint);
    mesh_service_seam_system_28.quaternion.copy(endpoint_service_seam_system_28.quaternion);
  }
  mesh_service_seam_system_28.castShadow = options.castShadow ?? true;
  mesh_service_seam_system_28.receiveShadow = options.receiveShadow ?? true;
  mesh_service_seam_system_28.userData.sculptComponent = {"id": "service-seam-system", "name": "Sparse shell service panel lines", "level": "micro", "role": "panel-line-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "panel-line-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "white-ceramic-shell"}}, "material": "white-ceramic-shell", "materialLayers": ["white-ceramic-shell"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "white-ceramic-shell-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(227, 224, 217, 1)", "secondaryAlbedo": "rgba(179, 184, 188, 1)", "materialClass": "ceramic", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(227, 224, 217, 1)"}, {"at": 1, "color": "rgba(179, 184, 188, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_service_seam_system_28.add(mesh_service_seam_system_28);
  meshes["service-seam-system"] = mesh_service_seam_system_28;
  colliders["service-seam-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_service_seam_system_28);

  const attachment_hinge_lock_system_29 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_hinge_lock_system_29 = makeAttachmentEndpoint(attachment_hinge_lock_system_29);
  const node_hinge_lock_system_29 = new THREE.Group();
  node_hinge_lock_system_29.name = "Shoulder hinge collar locks__pivot";
  node_hinge_lock_system_29.scale.set(1, 1, 1);
  if (endpoint_hinge_lock_system_29) {
    node_hinge_lock_system_29.position.copy(endpoint_hinge_lock_system_29.start);
    node_hinge_lock_system_29.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_hinge_lock_system_29.position.set(0.0, 0.0, 0.0);
    node_hinge_lock_system_29.rotation.set(0.0, 0.0, 0.0);
  }
  node_hinge_lock_system_29.userData.sculptComponent = {"id": "hinge-lock-system", "name": "Shoulder hinge collar locks", "level": "micro", "role": "fastener-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "fastener-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "radial-locks", "placement": "Twelve locking heads around each primary wing hinge.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_hinge_lock_system_29.userData.actionProfile = {"animationRole": "fastener-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["center-spine"] ?? root).add(node_hinge_lock_system_29);
  nodes["hinge-lock-system"] = node_hinge_lock_system_29;
  const mesh_hinge_lock_system_29Geometry = endpoint_hinge_lock_system_29
    ? new THREE.CylinderGeometry(endpoint_hinge_lock_system_29.endRadius, endpoint_hinge_lock_system_29.baseRadius, endpoint_hinge_lock_system_29.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_hinge_lock_system_29) {
    mesh_hinge_lock_system_29Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_hinge_lock_system_29 = new THREE.Mesh(
    mesh_hinge_lock_system_29Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_hinge_lock_system_29.name = "Shoulder hinge collar locks";
  if (endpoint_hinge_lock_system_29) {
    mesh_hinge_lock_system_29.position.copy(endpoint_hinge_lock_system_29.midpoint);
    mesh_hinge_lock_system_29.quaternion.copy(endpoint_hinge_lock_system_29.quaternion);
  }
  mesh_hinge_lock_system_29.castShadow = options.castShadow ?? true;
  mesh_hinge_lock_system_29.receiveShadow = options.receiveShadow ?? true;
  mesh_hinge_lock_system_29.userData.sculptComponent = {"id": "hinge-lock-system", "name": "Shoulder hinge collar locks", "level": "micro", "role": "fastener-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "fastener-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [{"id": "radial-locks", "placement": "Twelve locking heads around each primary wing hinge.", "size": "phone-readable meso feature or silhouette-changing macro feature", "orientation": "local to the owning transform pivot and preserved in all three ship poses", "materialEffect": "independent albedo, roughness, normal/AO or emissive response as observed", "geometryEffect": "real procedural geometry whenever the detail affects silhouette, aperture, socket, or seam relief", "confidence": 0.86, "evidenceRefs": ["full-object"]}], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_hinge_lock_system_29.add(mesh_hinge_lock_system_29);
  meshes["hinge-lock-system"] = mesh_hinge_lock_system_29;
  colliders["hinge-lock-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_hinge_lock_system_29);

  const attachment_tower_collar_system_30 = {"parentId": "power-towers", "parentSocket": "power-towers-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_tower_collar_system_30 = makeAttachmentEndpoint(attachment_tower_collar_system_30);
  const node_tower_collar_system_30 = new THREE.Group();
  node_tower_collar_system_30.name = "Power tower collar rings__pivot";
  node_tower_collar_system_30.scale.set(1, 1, 1);
  if (endpoint_tower_collar_system_30) {
    node_tower_collar_system_30.position.copy(endpoint_tower_collar_system_30.start);
    node_tower_collar_system_30.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_tower_collar_system_30.position.set(0.0, 0.0, 0.0);
    node_tower_collar_system_30.rotation.set(0.0, 0.0, 0.0);
  }
  node_tower_collar_system_30.userData.sculptComponent = {"id": "tower-collar-system", "name": "Power tower collar rings", "level": "micro", "role": "repeated-collar-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "power-towers", "attachment": {"parentId": "power-towers", "parentSocket": "power-towers-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "repeated-collar-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_tower_collar_system_30.userData.actionProfile = {"animationRole": "repeated-collar-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["power-towers"] ?? root).add(node_tower_collar_system_30);
  nodes["tower-collar-system"] = node_tower_collar_system_30;
  const mesh_tower_collar_system_30Geometry = endpoint_tower_collar_system_30
    ? new THREE.CylinderGeometry(endpoint_tower_collar_system_30.endRadius, endpoint_tower_collar_system_30.baseRadius, endpoint_tower_collar_system_30.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_tower_collar_system_30) {
    mesh_tower_collar_system_30Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_tower_collar_system_30 = new THREE.Mesh(
    mesh_tower_collar_system_30Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_tower_collar_system_30.name = "Power tower collar rings";
  if (endpoint_tower_collar_system_30) {
    mesh_tower_collar_system_30.position.copy(endpoint_tower_collar_system_30.midpoint);
    mesh_tower_collar_system_30.quaternion.copy(endpoint_tower_collar_system_30.quaternion);
  }
  mesh_tower_collar_system_30.castShadow = options.castShadow ?? true;
  mesh_tower_collar_system_30.receiveShadow = options.receiveShadow ?? true;
  mesh_tower_collar_system_30.userData.sculptComponent = {"id": "tower-collar-system", "name": "Power tower collar rings", "level": "micro", "role": "repeated-collar-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "power-towers", "attachment": {"parentId": "power-towers", "parentSocket": "power-towers-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "repeated-collar-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_tower_collar_system_30.add(mesh_tower_collar_system_30);
  meshes["tower-collar-system"] = mesh_tower_collar_system_30;
  colliders["tower-collar-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_tower_collar_system_30);

  const attachment_vent_bank_system_31 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_vent_bank_system_31 = makeAttachmentEndpoint(attachment_vent_bank_system_31);
  const node_vent_bank_system_31 = new THREE.Group();
  node_vent_bank_system_31.name = "Engine vent bank inserts__pivot";
  node_vent_bank_system_31.scale.set(1, 1, 1);
  if (endpoint_vent_bank_system_31) {
    node_vent_bank_system_31.position.copy(endpoint_vent_bank_system_31.start);
    node_vent_bank_system_31.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_vent_bank_system_31.position.set(0.0, 0.0, 0.0);
    node_vent_bank_system_31.rotation.set(0.0, 0.0, 0.0);
  }
  node_vent_bank_system_31.userData.sculptComponent = {"id": "vent-bank-system", "name": "Engine vent bank inserts", "level": "micro", "role": "repeated-vent-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "repeated-vent-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_vent_bank_system_31.userData.actionProfile = {"animationRole": "repeated-vent-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_vent_bank_system_31);
  nodes["vent-bank-system"] = node_vent_bank_system_31;
  const mesh_vent_bank_system_31Geometry = endpoint_vent_bank_system_31
    ? new THREE.CylinderGeometry(endpoint_vent_bank_system_31.endRadius, endpoint_vent_bank_system_31.baseRadius, endpoint_vent_bank_system_31.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_vent_bank_system_31) {
    mesh_vent_bank_system_31Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_vent_bank_system_31 = new THREE.Mesh(
    mesh_vent_bank_system_31Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_vent_bank_system_31.name = "Engine vent bank inserts";
  if (endpoint_vent_bank_system_31) {
    mesh_vent_bank_system_31.position.copy(endpoint_vent_bank_system_31.midpoint);
    mesh_vent_bank_system_31.quaternion.copy(endpoint_vent_bank_system_31.quaternion);
  }
  mesh_vent_bank_system_31.castShadow = options.castShadow ?? true;
  mesh_vent_bank_system_31.receiveShadow = options.receiveShadow ?? true;
  mesh_vent_bank_system_31.userData.sculptComponent = {"id": "vent-bank-system", "name": "Engine vent bank inserts", "level": "micro", "role": "repeated-vent-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "repeated-vent-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_vent_bank_system_31.add(mesh_vent_bank_system_31);
  meshes["vent-bank-system"] = mesh_vent_bank_system_31;
  colliders["vent-bank-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_vent_bank_system_31);

  const attachment_thruster_socket_system_32 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_thruster_socket_system_32 = makeAttachmentEndpoint(attachment_thruster_socket_system_32);
  const node_thruster_socket_system_32 = new THREE.Group();
  node_thruster_socket_system_32.name = "Travel thruster nozzle inserts__pivot";
  node_thruster_socket_system_32.scale.set(1, 1, 1);
  if (endpoint_thruster_socket_system_32) {
    node_thruster_socket_system_32.position.copy(endpoint_thruster_socket_system_32.start);
    node_thruster_socket_system_32.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_thruster_socket_system_32.position.set(0.0, 0.0, 0.0);
    node_thruster_socket_system_32.rotation.set(0.0, 0.0, 0.0);
  }
  node_thruster_socket_system_32.userData.sculptComponent = {"id": "thruster-socket-system", "name": "Travel thruster nozzle inserts", "level": "micro", "role": "thrust-effect-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "thrust-effect-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "thrust-effect-left", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-left"}, {"id": "thrust-effect-right", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-right"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "blue-power-glass"}}, "material": "blue-power-glass", "materialLayers": ["blue-power-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "blue-power-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(43, 161, 255, 1)", "secondaryAlbedo": "rgba(173, 232, 255, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(43, 161, 255, 1)"}, {"at": 1, "color": "rgba(173, 232, 255, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_thruster_socket_system_32.userData.actionProfile = {"animationRole": "thrust-effect-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "thrust-effect-left", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-left"}, {"id": "thrust-effect-right", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-right"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "blue-power-glass"}};
  (nodes["root"] ?? root).add(node_thruster_socket_system_32);
  nodes["thruster-socket-system"] = node_thruster_socket_system_32;
  const mesh_thruster_socket_system_32Geometry = endpoint_thruster_socket_system_32
    ? new THREE.CylinderGeometry(endpoint_thruster_socket_system_32.endRadius, endpoint_thruster_socket_system_32.baseRadius, endpoint_thruster_socket_system_32.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_thruster_socket_system_32) {
    mesh_thruster_socket_system_32Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_thruster_socket_system_32 = new THREE.Mesh(
    mesh_thruster_socket_system_32Geometry,
    materialMap["blue-power-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_thruster_socket_system_32.name = "Travel thruster nozzle inserts";
  if (endpoint_thruster_socket_system_32) {
    mesh_thruster_socket_system_32.position.copy(endpoint_thruster_socket_system_32.midpoint);
    mesh_thruster_socket_system_32.quaternion.copy(endpoint_thruster_socket_system_32.quaternion);
  }
  mesh_thruster_socket_system_32.castShadow = options.castShadow ?? true;
  mesh_thruster_socket_system_32.receiveShadow = options.receiveShadow ?? true;
  mesh_thruster_socket_system_32.userData.sculptComponent = {"id": "thruster-socket-system", "name": "Travel thruster nozzle inserts", "level": "micro", "role": "thrust-effect-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "thrust-effect-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [{"id": "thrust-effect-left", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-left"}, {"id": "thrust-effect-right", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-right"}], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "blue-power-glass"}}, "material": "blue-power-glass", "materialLayers": ["blue-power-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "blue-power-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(43, 161, 255, 1)", "secondaryAlbedo": "rgba(173, 232, 255, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(43, 161, 255, 1)"}, {"at": 1, "color": "rgba(173, 232, 255, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_thruster_socket_system_32.add(mesh_thruster_socket_system_32);
  meshes["thruster-socket-system"] = mesh_thruster_socket_system_32;
  colliders["thruster-socket-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_thruster_socket_system_32);
  const socket_thruster_socket_system_thrust_effect_left_0 = new THREE.Object3D();
  socket_thruster_socket_system_thrust_effect_left_0.name = "thrust-effect-left";
  socket_thruster_socket_system_thrust_effect_left_0.position.set(0.0, 0.0, 0.0);
  socket_thruster_socket_system_thrust_effect_left_0.rotation.set(0, 0, 0);
  socket_thruster_socket_system_thrust_effect_left_0.userData.socket = {"id": "thrust-effect-left", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-left"};
  node_thruster_socket_system_32.add(socket_thruster_socket_system_thrust_effect_left_0);
  sockets["thruster-socket-system:thrust-effect-left"] = socket_thruster_socket_system_thrust_effect_left_0;
  const socket_thruster_socket_system_thrust_effect_right_1 = new THREE.Object3D();
  socket_thruster_socket_system_thrust_effect_right_1.name = "thrust-effect-right";
  socket_thruster_socket_system_thrust_effect_right_1.position.set(0.0, 0.0, 0.0);
  socket_thruster_socket_system_thrust_effect_right_1.rotation.set(0, 0, 0);
  socket_thruster_socket_system_thrust_effect_right_1.userData.socket = {"id": "thrust-effect-right", "localPosition": [0, 0, 0], "localDirection": [0, 0, 1], "purpose": "thrust-effect-right"};
  node_thruster_socket_system_32.add(socket_thruster_socket_system_thrust_effect_right_1);
  sockets["thruster-socket-system:thrust-effect-right"] = socket_thruster_socket_system_thrust_effect_right_1;

  const attachment_landing_guide_lights_33 = {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_landing_guide_lights_33 = makeAttachmentEndpoint(attachment_landing_guide_lights_33);
  const node_landing_guide_lights_33 = new THREE.Group();
  node_landing_guide_lights_33.name = "Landing and service guide lights__pivot";
  node_landing_guide_lights_33.scale.set(1, 1, 1);
  if (endpoint_landing_guide_lights_33) {
    node_landing_guide_lights_33.position.copy(endpoint_landing_guide_lights_33.start);
    node_landing_guide_lights_33.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_landing_guide_lights_33.position.set(0.0, 0.0, 0.0);
    node_landing_guide_lights_33.rotation.set(0.0, 0.0, 0.0);
  }
  node_landing_guide_lights_33.userData.sculptComponent = {"id": "landing-guide-lights", "name": "Landing and service guide lights", "level": "micro", "role": "landing-light-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "landing-light-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_landing_guide_lights_33.userData.actionProfile = {"animationRole": "landing-light-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}};
  (nodes["center-spine"] ?? root).add(node_landing_guide_lights_33);
  nodes["landing-guide-lights"] = node_landing_guide_lights_33;
  const mesh_landing_guide_lights_33Geometry = endpoint_landing_guide_lights_33
    ? new THREE.CylinderGeometry(endpoint_landing_guide_lights_33.endRadius, endpoint_landing_guide_lights_33.baseRadius, endpoint_landing_guide_lights_33.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_landing_guide_lights_33) {
    mesh_landing_guide_lights_33Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_landing_guide_lights_33 = new THREE.Mesh(
    mesh_landing_guide_lights_33Geometry,
    materialMap["warm-window-glass"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_landing_guide_lights_33.name = "Landing and service guide lights";
  if (endpoint_landing_guide_lights_33) {
    mesh_landing_guide_lights_33.position.copy(endpoint_landing_guide_lights_33.midpoint);
    mesh_landing_guide_lights_33.quaternion.copy(endpoint_landing_guide_lights_33.quaternion);
  }
  mesh_landing_guide_lights_33.castShadow = options.castShadow ?? true;
  mesh_landing_guide_lights_33.receiveShadow = options.receiveShadow ?? true;
  mesh_landing_guide_lights_33.userData.sculptComponent = {"id": "landing-guide-lights", "name": "Landing and service guide lights", "level": "micro", "role": "landing-light-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "center-spine", "attachment": {"parentId": "center-spine", "parentSocket": "center-spine-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "landing-light-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "warm-window-glass"}}, "material": "warm-window-glass", "materialLayers": ["warm-window-glass"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "warm-window-glass-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(255, 170, 74, 1)", "secondaryAlbedo": "rgba(255, 226, 164, 1)", "materialClass": "glass", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(255, 170, 74, 1)"}, {"at": 1, "color": "rgba(255, 226, 164, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_landing_guide_lights_33.add(mesh_landing_guide_lights_33);
  meshes["landing-guide-lights"] = mesh_landing_guide_lights_33;
  colliders["landing-guide-lights"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_landing_guide_lights_33);

  const attachment_room_portal_system_34 = {"parentId": "interior-volume-reservations", "parentSocket": "interior-volume-reservations-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_room_portal_system_34 = makeAttachmentEndpoint(attachment_room_portal_system_34);
  const node_room_portal_system_34 = new THREE.Group();
  node_room_portal_system_34.name = "Room entry portal markers__pivot";
  node_room_portal_system_34.scale.set(1, 1, 1);
  if (endpoint_room_portal_system_34) {
    node_room_portal_system_34.position.copy(endpoint_room_portal_system_34.start);
    node_room_portal_system_34.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_room_portal_system_34.position.set(0.0, 0.0, 0.0);
    node_room_portal_system_34.rotation.set(0.0, 0.0, 0.0);
  }
  node_room_portal_system_34.userData.sculptComponent = {"id": "room-portal-system", "name": "Room entry portal markers", "level": "micro", "role": "camera-entry-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "interior-volume-reservations", "attachment": {"parentId": "interior-volume-reservations", "parentSocket": "interior-volume-reservations-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "camera-entry-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_room_portal_system_34.userData.actionProfile = {"animationRole": "camera-entry-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["interior-volume-reservations"] ?? root).add(node_room_portal_system_34);
  nodes["room-portal-system"] = node_room_portal_system_34;
  const mesh_room_portal_system_34Geometry = endpoint_room_portal_system_34
    ? new THREE.CylinderGeometry(endpoint_room_portal_system_34.endRadius, endpoint_room_portal_system_34.baseRadius, endpoint_room_portal_system_34.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_room_portal_system_34) {
    mesh_room_portal_system_34Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_room_portal_system_34 = new THREE.Mesh(
    mesh_room_portal_system_34Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_room_portal_system_34.name = "Room entry portal markers";
  if (endpoint_room_portal_system_34) {
    mesh_room_portal_system_34.position.copy(endpoint_room_portal_system_34.midpoint);
    mesh_room_portal_system_34.quaternion.copy(endpoint_room_portal_system_34.quaternion);
  }
  mesh_room_portal_system_34.castShadow = options.castShadow ?? true;
  mesh_room_portal_system_34.receiveShadow = options.receiveShadow ?? true;
  mesh_room_portal_system_34.userData.sculptComponent = {"id": "room-portal-system", "name": "Room entry portal markers", "level": "micro", "role": "camera-entry-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "interior-volume-reservations", "attachment": {"parentId": "interior-volume-reservations", "parentSocket": "interior-volume-reservations-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "camera-entry-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_room_portal_system_34.add(mesh_room_portal_system_34);
  meshes["room-portal-system"] = mesh_room_portal_system_34;
  colliders["room-portal-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_room_portal_system_34);

  const attachment_panel_fastener_system_35 = {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]};
  const endpoint_panel_fastener_system_35 = makeAttachmentEndpoint(attachment_panel_fastener_system_35);
  const node_panel_fastener_system_35 = new THREE.Group();
  node_panel_fastener_system_35.name = "Instanced service fasteners__pivot";
  node_panel_fastener_system_35.scale.set(1, 1, 1);
  if (endpoint_panel_fastener_system_35) {
    node_panel_fastener_system_35.position.copy(endpoint_panel_fastener_system_35.start);
    node_panel_fastener_system_35.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_panel_fastener_system_35.position.set(0.0, 0.0, 0.0);
    node_panel_fastener_system_35.rotation.set(0.0, 0.0, 0.0);
  }
  node_panel_fastener_system_35.userData.sculptComponent = {"id": "panel-fastener-system", "name": "Instanced service fasteners", "level": "micro", "role": "fastener-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "fastener-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_panel_fastener_system_35.userData.actionProfile = {"animationRole": "fastener-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}};
  (nodes["root"] ?? root).add(node_panel_fastener_system_35);
  nodes["panel-fastener-system"] = node_panel_fastener_system_35;
  const mesh_panel_fastener_system_35Geometry = endpoint_panel_fastener_system_35
    ? new THREE.CylinderGeometry(endpoint_panel_fastener_system_35.endRadius, endpoint_panel_fastener_system_35.baseRadius, endpoint_panel_fastener_system_35.length, 32, 12)
    : new THREE.BoxGeometry(1, 1, 1, 12, 12, 12);
  if (!endpoint_panel_fastener_system_35) {
    mesh_panel_fastener_system_35Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_panel_fastener_system_35 = new THREE.Mesh(
    mesh_panel_fastener_system_35Geometry,
    materialMap["dark-structural-frame"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_panel_fastener_system_35.name = "Instanced service fasteners";
  if (endpoint_panel_fastener_system_35) {
    mesh_panel_fastener_system_35.position.copy(endpoint_panel_fastener_system_35.midpoint);
    mesh_panel_fastener_system_35.quaternion.copy(endpoint_panel_fastener_system_35.quaternion);
  }
  mesh_panel_fastener_system_35.castShadow = options.castShadow ?? true;
  mesh_panel_fastener_system_35.receiveShadow = options.receiveShadow ?? true;
  mesh_panel_fastener_system_35.userData.sculptComponent = {"id": "panel-fastener-system", "name": "Instanced service fasteners", "level": "micro", "role": "fastener-system", "importance": 0.8, "confidence": 0.86, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Manufactured hard-surface component with explicit seams and occupied volume.", "geometryDescriptor": {"topologyIntent": "bevel-ready modular hard-surface volume", "edgeTreatment": {"type": "chamfer", "bevelRadius": 0.025, "segments": 3}, "deformationStack": [], "uvStrategy": "generated object-space coordinates", "normalStrategy": "recomputed vertex normals with weighted hard-surface edges"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "root-socket", "localStart": [0, 0, 0], "localEnd": [0, 0.08, 0], "baseRadius": 0.1, "endRadius": 0.08, "overlap": 0.04, "embedDepth": 0.035, "contactType": "embedded", "gapTolerance": 0.008, "evidenceRefs": ["full-object"]}, "dimensions": {"width": 1, "height": 1, "depth": 1, "units": "relative-to-58m-ship-width", "confidence": 0.78}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "actionProfile": {"animationRole": "fastener-system", "pivot": {"mode": "authored-hinge-or-socket", "localPosition": [0, 0, 0], "axis": [0, 1, 0], "confidence": 0.88}, "transformChannels": {"translate": true, "rotate": true, "scale": false, "bend": false, "twist": false, "detach": false, "visibility": true, "materialState": true}, "sockets": [], "collider": {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."}, "constraints": ["preserve occupied-volume clearance", "preserve hinge/socket overlap in docked, expedition, and flight poses"], "destruction": {"breakable": false, "fractureGroup": "expedition-ship", "seamRefs": [], "detachableFragments": [], "breakImpulse": 0, "debrisMaterial": "dark-structural-frame"}}, "material": "dark-structural-frame", "materialLayers": ["dark-structural-frame"], "deformations": [], "joints": [], "seams": [], "localFeatures": [], "surfaceDetail": {"macroRoughness": 0.12, "microRoughness": 0.055, "bumpAmplitude": 0.015, "normalPattern": "dark-structural-frame-independent-normal", "displacementPattern": "macro shape owned by geometry", "occlusionPattern": "hinge collars, panel seams, deck recesses, sockets and component overlaps", "edgeWearPattern": "restrained service-edge wear only", "notes": "Broad clean office-building-scale surfaces; micro detail remains subordinate at phone distance."}, "evidenceRefs": ["full-object"], "details": [], "fidelityTier": "detail", "colorMaterialRecipe": {"dominantAlbedo": "rgba(20, 27, 35, 1)", "secondaryAlbedo": "rgba(53, 65, 77, 1)", "materialClass": "metal", "materialClassConfidence": 0.88, "colorGradient": {"type": "linear", "stops": [{"at": 0, "color": "rgba(20, 27, 35, 1)"}, {"at": 1, "color": "rgba(53, 65, 77, 1)"}]}, "evidenceRefs": ["full-object"]}};
  node_panel_fastener_system_35.add(mesh_panel_fastener_system_35);
  meshes["panel-fastener-system"] = mesh_panel_fastener_system_35;
  colliders["panel-fastener-system"] = {"type": "box", "offset": [0, 0, 0], "scale": [1, 1, 1], "isTrigger": false, "notes": "Presentation collider; occupied deck and hinge sweep clearance remain separate trigger proxies."};
  destructionGroups["expedition-ship"] ??= [];
  destructionGroups["expedition-ship"].push(node_panel_fastener_system_35);

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "phone-runtime-balanced", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": false, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createHabitGameExpeditionShipLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "HabitGame Expedition Ship look-dev lights";
  const hemi = new THREE.HemisphereLight(
    mode === 'reference' ? 0xfff0d6 : 0xf2f4ff,
    0x363b42,
    mode === 'grazing' ? 0.28 : mode === 'reference' ? 0.72 : 0.85,
  );
  lights.add(hemi);
  const key = new THREE.DirectionalLight(
    mode === 'reference' ? 0xffcf8a : 0xfff4e8,
    mode === 'grazing' ? 4.2 : mode === 'reference' ? 2.6 : 2.15,
  );
  if (mode === 'grazing') key.position.set(7.5, 1.1, 4.0);
  else if (mode === 'reference') key.position.set(-4.5, 7.5, 5.0);
  else key.position.set(-4.0, 6.0, 5.5);
  key.castShadow = true;
  key.shadow.mapSize.set(4096, 4096);
  key.shadow.bias = -0.00025;
  key.shadow.normalBias = 0.018;
  key.shadow.radius = 7;
  key.shadow.blurSamples = 24;
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 30;
  key.shadow.camera.left = -2.6;
  key.shadow.camera.right = 2.6;
  key.shadow.camera.top = 2.6;
  key.shadow.camera.bottom = -2.6;
  key.shadow.camera.updateProjectionMatrix();
  lights.add(key);
  const fill = new THREE.DirectionalLight(0xa8c4ff, mode === 'grazing' ? 0.12 : 0.42);
  fill.position.set(4.0, 3.0, 3.5);
  lights.add(fill);
  const rim = new THREE.DirectionalLight(0xfff1c4, mode === 'grazing' ? 0.28 : 0.85);
  rim.position.set(0.5, 4.5, -6.0);
  lights.add(rim);
  lights.userData.reviewMode = mode;
  lights.userData.lightingFromPhoto = ["Neutral warm-white key from upper front-left at intensity 2.4 with soft shadows.", "Cool blue fill from lower front-right at intensity 0.9 separates charcoal underframes.", "Restrained cool rim at intensity 1.2 outlines the white controller shell and towers.", "Warm practical window lights and cyan power nodes remain local emissive accents, not global exposure sources.", "ACES filmic tone mapping at exposure 0.98; neutral studio background for comparison and separate water-hover environment for interaction review.", "Soft contact shadows and a broad receiver shadow ground keel, hover emitters and landed service pose without hiding the belly silhouette."];
  lights.userData.lookDevTargets = {"qualityPriority": "phone-runtime-balanced", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "minimumTextureResolution": 1024, "preferredTextureResolution": 2048, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "requiredSurfaceFrequencyBands": ["macro", "meso", "micro"], "geometryReliefRequiredWhenSilhouetteAffected": true, "referencePbrExtraction": {"requiredWhenSourceImagePresent": false, "targetThreshold": 0.7, "stopOnLowConfidence": true, "script": "forge/stage1_intake/extract_pbr_evidence.py", "acceptedLimitation": "single-image extraction is reference-derived inference, not exact photogrammetry"}, "mustAvoid": ["single flat albedo per material", "uniform roughness", "albedo texture reused as roughness/height/normal/AO", "single-frequency random noise", "plastic-looking smooth bark, stone, cloth, foliage, or aged material", "local color/detail described only in prose without material masks", "claiming exact PBR recovery when confidence is below the target threshold"]}, "lightingPass": {"requiredTerms": ["key light", "fill light", "rim or environment light", "exposure", "tone mapping", "background", "contact shadow"], "mustAvoid": ["ambient-only lighting", "flat value range", "missing contact shadow", "reference lighting copied without separating material readability"]}, "screenshotReview": ["Compare albedo palette and local color zones.", "Compare roughness/normal/bump response under light.", "Compare cavity dirt, edge wear, stains, moss, scratches, or other local masks.", "Compare key/fill/rim structure, exposure, tone mapping, background, and contact shadows.", "Capture a neutral-light render to verify material readability without reference lighting.", "Capture a grazing-light close-up to expose flat normals, uniform roughness, tiling, and plastic highlights.", "Capture a reference-matched render from the same camera framing as the source."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createHabitGameExpeditionShipEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const texture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();
  return texture;
}

// Plan 1.3 §3.2 — auto-framing by bounding box. The Divine Eye can only compare a
// render to the reference if the object is FRAMED consistently (an object framed
// differently scores as wrong even when its shape is right). This positions the camera
// deterministically from the object's bounding box so it fills the frame at a stable
// margin, and sets near/far to the object scale. Call after adding the model to the
// scene, and again on resize (after updating camera.aspect).
export function frameHabitGameExpeditionShipCamera(
  camera: THREE.PerspectiveCamera,
  object: THREE.Object3D,
  options: { margin?: number; azimuthDeg?: number; elevationDeg?: number } = {},
): void {
  const box = new THREE.Box3().setFromObject(object);
  if (box.isEmpty()) return;
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const margin = options.margin ?? 1.15;
  const maxDim = Math.max(size.x, size.y, size.z) * margin;
  const fov = (camera.fov * Math.PI) / 180;
  // distance so the largest object dimension fits vertically in the frame
  const distance = (maxDim / 2) / Math.tan(fov / 2);
  const az = ((options.azimuthDeg ?? 0) * Math.PI) / 180;
  const el = ((options.elevationDeg ?? 0) * Math.PI) / 180;
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    Math.cos(az) * Math.cos(el),
  );
  camera.position.copy(center).addScaledVector(dir, distance);
  camera.near = Math.max(0.01, distance - maxDim);
  camera.far = distance + maxDim * 2;
  camera.lookAt(center);
  camera.updateProjectionMatrix();
}

// Plan 1.3 §3.2c — PRESENTATION composer (DOF + bloom). CRITICAL (R-POSTFX): this is
// for the showcase/hero render ONLY. The Divine Eye's EVALUATION render MUST use a
// plain renderer with NO composer — bloom blows highlights and DOF blurs edges, which
// would corrupt the deterministic IoU/DCD/edge/blowout signals. Enable dof/bloom ONLY
// when the reference photo actually exhibits them (detect_reference_effects.py authorizes).
export function createHabitGameExpeditionShipPresentationComposer(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
  options: { dof?: boolean; bloom?: boolean; bloomStrength?: number; dofFocus?: number; dofAperture?: number } = {},
): EffectComposer {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  if (options.dof) {
    composer.addPass(new BokehPass(scene, camera, {
      focus: options.dofFocus ?? 10.0,
      aperture: options.dofAperture ?? 0.0002,
      maxblur: 0.01,
    }));
  }
  if (options.bloom) {
    const size = new THREE.Vector2();
    renderer.getSize(size);
    composer.addPass(new UnrealBloomPass(size, options.bloomStrength ?? 0.4, 0.4, 0.85));
  }
  return composer;
}

export function configureHabitGameExpeditionShipRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createHabitGameExpeditionShipInspectControls(
  camera: THREE.Camera,
  domElement: HTMLElement,
): OrbitControls {
  // View-dependent finishes only read correctly once the user orbits — their color
  // comes from the environment reflection, not albedo, so free rotation matters here.
  const controls = new OrbitControls(camera, domElement);
  controls.enableDamping = true;
  controls.minDistance = 1.0;
  controls.maxDistance = 8.0;
  controls.autoRotate = false;
  return controls;
}
