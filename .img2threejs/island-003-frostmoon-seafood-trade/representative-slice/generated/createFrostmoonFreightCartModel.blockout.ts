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

// bevelEnabled defaults to true on THREE.ExtrudeGeometry and rounds every
// corner — sharp/pointed profiles (blades, fork tines, spikes) need
// bevelEnabled: false plus lineTo()-only path segments near the tip, since a
// curve command cannot produce a true converging point.
function buildExtrudeShape(points: [number, number][], holes?: [number, number][][]): THREE.Shape {
  const shape = new THREE.Shape();
  if (points.length > 0) {
    shape.moveTo(points[0][0], points[0][1]);
    for (let i = 1; i < points.length; i += 1) {
      shape.lineTo(points[i][0], points[i][1]);
    }
  }
  // Cutouts (e.g. an oval wire-cutter hole) as THREE.Path added to shape.holes —
  // dep-free boolean subtraction via the tessellator, no CSG library needed.
  for (const loop of holes ?? []) {
    if (loop.length < 3) continue;
    const path = new THREE.Path();
    path.moveTo(loop[0][0], loop[0][1]);
    for (let i = 1; i < loop.length; i += 1) path.lineTo(loop[i][0], loop[i][1]);
    path.closePath();
    shape.holes.push(path);
  }
  return shape;
}

// Build an N-gon oval loop (for hole authoring from a compact {cx,cy,rx,ry} descriptor).
function ovalLoop(cx: number, cy: number, rx: number, ry: number, seg = 24): [number, number][] {
  const loop: [number, number][] = [];
  for (let i = 0; i < seg; i += 1) {
    const a = (i / seg) * Math.PI * 2;
    loop.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return loop;
}

function buildExtrudeGeometry(profile: { points: [number, number][]; depth: number; holes?: [number, number][][]; ovalHoles?: { cx: number; cy: number; rx: number; ry: number }[] }): THREE.ExtrudeGeometry {
  const holes = [...(profile.holes ?? []), ...((profile.ovalHoles ?? []).map((o) => ovalLoop(o.cx, o.cy, o.rx, o.ry)))];
  const shape = buildExtrudeShape(profile.points, holes);
  return new THREE.ExtrudeGeometry(shape, {
    depth: profile.depth,
    bevelEnabled: false,
    steps: 1,
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

// Generated from ObjectSculptSpec target: Frostmoon Wind-Sail Seafood Freight Cart
// Sculpt build pass: blockout
// This factory is intentionally pass-gated. Finish browser screenshot review before unlocking deeper passes.
export function createFrostmoonWindSailSeafoodFreightCartModel(options: ProceduralModelOptions = {}): THREE.Group {
  const root = new THREE.Group();
  root.name = "Frostmoon Wind-Sail Seafood Freight Cart";
  root.userData.reconstructionEvidence = {"itemFamily": null, "subtype": null, "componentAdapter": null, "route": null, "exactnessTier": null, "referenceCamera": null, "approximationNotes": []};
  root.userData.materialPipeline = {};
  root.userData.materialReferenceRegistry = null;

  const materialMap: Record<string, THREE.Material> = {};
  materialMap["timber"] = createSculptMaterial(
    "timber",
    {"id": "timber", "name": "Dark winter timber", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#3a261e", "albedo": {"dominant": "#3a261e", "secondary": ["#251914", "#684231"]}, "colorVariation": {"palette": ["#251914", "#3a261e", "#684231"], "pattern": "directional grain", "amplitude": 0.12}, "roughness": {"base": 0.84, "variation": 0.1, "map": "independent procedural wood grain"}, "metalness": {"base": 0}, "normal": {"pattern": "directional grain", "strength": 0.22}, "ambientOcclusion": {"cavityStrength": 0.28, "contactShadowBias": 0.35}, "localOverrides": [{"id": "timber-edge-wear", "region": "runner tips and deck edges", "roughness": 0.7, "color": "#79503a"}], "wear": {"edgeWear": 0.18, "scratches": ["longitudinal runner wear"], "chips": []}},
    options
  );
  materialMap["copper"] = createSculptMaterial(
    "copper",
    {"id": "copper", "name": "Hammered copper bronze", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#95502f", "albedo": {"dominant": "#95502f", "secondary": ["#60311f", "#c77b45"]}, "colorVariation": {"palette": ["#60311f", "#95502f", "#c77b45"], "pattern": "hammered", "amplitude": 0.09}, "roughness": {"base": 0.38, "variation": 0.12, "map": "independent hammered field"}, "metalness": {"base": 0.86}, "normal": {"pattern": "hammered dimples", "strength": 0.16}, "ambientOcclusion": {"cavityStrength": 0.22, "contactShadowBias": 0.25}, "localOverrides": [{"id": "copper-contact-patina", "region": "fastener collars", "roughness": 0.5, "color": "#6f3825"}], "wear": {"edgeWear": 0.24, "scratches": ["rim shoe scuffs"], "chips": []}},
    options
  );
  materialMap["cloth"] = createSculptMaterial(
    "cloth",
    {"id": "cloth", "name": "Warm cream winter sail", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#e0d5ba", "doubleSided": true, "albedo": {"dominant": "#e0d5ba", "secondary": ["#c9b991", "#f0e7d2"]}, "colorVariation": {"palette": ["#c9b991", "#e0d5ba", "#f0e7d2"], "pattern": "woven", "amplitude": 0.06}, "roughness": {"base": 0.84, "variation": 0.06, "map": "independent weave field"}, "metalness": {"base": 0}, "normal": {"pattern": "cross weave", "strength": 0.13}, "ambientOcclusion": {"cavityStrength": 0.08, "contactShadowBias": 0.12}, "localOverrides": [{"id": "sail-edge-weathering", "region": "perimeter near bindings", "roughness": 0.9, "color": "#bcae8d"}]},
    options
  );
  materialMap["ice"] = createSculptMaterial(
    "ice",
    {"id": "ice", "name": "Packed clean ice", "type": "physical", "shaderModel": "MeshPhysicalMaterial", "baseColor": "#d5e9ef", "albedo": {"dominant": "#d5e9ef", "secondary": ["#a8cfdc", "#f5fbff"]}, "colorVariation": {"palette": ["#a8cfdc", "#d5e9ef", "#f5fbff"], "pattern": "faceted", "amplitude": 0.12}, "roughness": {"base": 0.24, "variation": 0.18, "map": "independent facet field"}, "metalness": {"base": 0}, "normal": {"pattern": "faceted chips", "strength": 0.28}, "ambientOcclusion": {"cavityStrength": 0.18, "contactShadowBias": 0.25}, "localOverrides": [{"id": "ice-cavity-shadow", "region": "crate ice beds", "roughness": 0.32, "color": "#a7c9d4"}]},
    options
  );
  materialMap["seafood"] = createSculptMaterial(
    "seafood",
    {"id": "seafood", "name": "Silver fish and crab accents", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#83929a", "albedo": {"dominant": "#83929a", "secondary": ["#43515a", "#d26d36"]}, "colorVariation": {"palette": ["#43515a", "#83929a", "#d26d36"], "pattern": "species accents", "amplitude": 0.18}, "roughness": {"base": 0.48, "variation": 0.14, "map": "independent scale and shell field"}, "metalness": {"base": 0.08}, "normal": {"pattern": "large readable scale and shell facets", "strength": 0.18}, "ambientOcclusion": {"cavityStrength": 0.2, "contactShadowBias": 0.28}, "localOverrides": [{"id": "crab-shell-accent", "region": "crab baskets", "roughness": 0.42, "color": "#d26d36"}]},
    options
  );
  materialMap["rope"] = createSculptMaterial(
    "rope",
    {"id": "rope", "name": "Dark hemp rope", "type": "standard", "shaderModel": "MeshStandardMaterial", "baseColor": "#594431", "qualityTier": "utility", "albedo": {"dominant": "#594431", "secondary": ["#35281e", "#796046"]}, "roughness": {"base": 0.92, "variation": 0.05, "map": "independent twist field"}, "metalness": {"base": 0}, "normal": {"pattern": "helical twist", "strength": 0.12}, "ambientOcclusion": {"cavityStrength": 0.16, "contactShadowBias": 0.2}, "localOverrides": []},
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
  node_root_0.name = "Freight cart assembly__pivot";
  node_root_0.scale.set(1, 1, 1);
  if (endpoint_root_0) {
    node_root_0.position.copy(endpoint_root_0.start);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_root_0.position.set(0.0, 0.0, 0.0);
    node_root_0.rotation.set(0.0, 0.0, 0.0);
  }
  node_root_0.userData.sculptComponent = {"id": "root", "name": "Freight cart assembly", "level": "macro", "role": "vehicle assembly", "importance": 1, "confidence": 0.98, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "The complete vehicle is a scene-graph container for separately moving mechanical solids.", "geometryDescriptor": {"topologyIntent": "non-rendered action-ready assembly container", "uvStrategy": "none", "normalStrategy": "child geometry normals"}, "parent": null, "dimensions": {"width": 4.8, "height": 3.25, "depth": 1.55, "units": "world", "confidence": 0.85}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "timber", "materialLayers": ["timber"], "localFeatures": [{"id": "loading-socket", "description": "Stable cargo-loading socket above the deck"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(55, 34, 27, 1.0)", "secondaryAlbedo": "rgba(111, 56, 37, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.94}, "evidenceRefs": ["full-turnaround"]};
  node_root_0.userData.actionProfile = {};
  (nodes["root"] ?? root).add(node_root_0);
  nodes["root"] = node_root_0;
  const mesh_root_0Geometry = endpoint_root_0
    ? new THREE.CylinderGeometry(endpoint_root_0.endRadius, endpoint_root_0.baseRadius, endpoint_root_0.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_root_0) {
    mesh_root_0Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_root_0 = new THREE.Mesh(
    mesh_root_0Geometry,
    materialMap["timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_root_0.name = "Freight cart assembly";
  if (endpoint_root_0) {
    mesh_root_0.position.copy(endpoint_root_0.midpoint);
    mesh_root_0.quaternion.copy(endpoint_root_0.quaternion);
  }
  mesh_root_0.castShadow = options.castShadow ?? true;
  mesh_root_0.receiveShadow = options.receiveShadow ?? true;
  mesh_root_0.userData.sculptComponent = {"id": "root", "name": "Freight cart assembly", "level": "macro", "role": "vehicle assembly", "importance": 1, "confidence": 0.98, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "The complete vehicle is a scene-graph container for separately moving mechanical solids.", "geometryDescriptor": {"topologyIntent": "non-rendered action-ready assembly container", "uvStrategy": "none", "normalStrategy": "child geometry normals"}, "parent": null, "dimensions": {"width": 4.8, "height": 3.25, "depth": 1.55, "units": "world", "confidence": 0.85}, "transform": {"position": [0, 0, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "timber", "materialLayers": ["timber"], "localFeatures": [{"id": "loading-socket", "description": "Stable cargo-loading socket above the deck"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(55, 34, 27, 1.0)", "secondaryAlbedo": "rgba(111, 56, 37, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.94}, "evidenceRefs": ["full-turnaround"]};
  node_root_0.add(mesh_root_0);
  meshes["root"] = mesh_root_0;
  colliders["root"] = {};

  const attachment_chassis_1 = {"parentId": "root", "parentSocket": "vehicle-origin", "localStart": [0, 0, 0], "localEnd": [0, 0.65, 0], "contactType": "overlap", "overlap": 0.05, "gapTolerance": 0.01, "evidenceRefs": ["underside-view"]};
  const endpoint_chassis_1 = makeAttachmentEndpoint(attachment_chassis_1);
  const node_chassis_1 = new THREE.Group();
  node_chassis_1.name = "Deck chassis__pivot";
  node_chassis_1.scale.set(1, 1, 1);
  if (endpoint_chassis_1) {
    node_chassis_1.position.copy(endpoint_chassis_1.start);
    node_chassis_1.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_chassis_1.position.set(0.0, 0.75, 0.0);
    node_chassis_1.rotation.set(0.0, 0.0, 0.0);
  }
  node_chassis_1.userData.sculptComponent = {"id": "chassis", "name": "Deck chassis", "level": "macro", "role": "deck assembly", "importance": 1, "confidence": 0.96, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "The reference shows a continuous timber deck reinforced by separate transverse copper-banded rails.", "geometryDescriptor": {"topologyIntent": "bevelled deck and frame rails", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.035, "segments": 2}, "uvStrategy": "procedural wood grain", "normalStrategy": "geometry normals plus grain normal"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "vehicle-origin", "localStart": [0, 0, 0], "localEnd": [0, 0.65, 0], "contactType": "overlap", "overlap": 0.05, "gapTolerance": 0.01, "evidenceRefs": ["underside-view"]}, "dimensions": {"width": 3.7, "height": 0.42, "depth": 1.28, "units": "world", "confidence": 0.92}, "transform": {"position": [0, 0.75, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "timber", "materialLayers": ["timber", "copper"], "localFeatures": [{"id": "underframe-brackets", "description": "Transverse rail and runner-mount system"}, {"id": "deck-rails", "description": "Raised cargo side rails"}, {"id": "tow-point", "description": "Forward service/tow socket"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(55, 34, 27, 1.0)", "secondaryAlbedo": "rgba(111, 56, 37, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.95}, "evidenceRefs": ["primary-crop", "underside-view"]};
  node_chassis_1.userData.actionProfile = {};
  (nodes["root"] ?? root).add(node_chassis_1);
  nodes["chassis"] = node_chassis_1;
  const mesh_chassis_1Geometry = endpoint_chassis_1
    ? new THREE.CylinderGeometry(endpoint_chassis_1.endRadius, endpoint_chassis_1.baseRadius, endpoint_chassis_1.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_chassis_1) {
    mesh_chassis_1Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_chassis_1 = new THREE.Mesh(
    mesh_chassis_1Geometry,
    materialMap["timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_chassis_1.name = "Deck chassis";
  if (endpoint_chassis_1) {
    mesh_chassis_1.position.copy(endpoint_chassis_1.midpoint);
    mesh_chassis_1.quaternion.copy(endpoint_chassis_1.quaternion);
  }
  mesh_chassis_1.castShadow = options.castShadow ?? true;
  mesh_chassis_1.receiveShadow = options.receiveShadow ?? true;
  mesh_chassis_1.userData.sculptComponent = {"id": "chassis", "name": "Deck chassis", "level": "macro", "role": "deck assembly", "importance": 1, "confidence": 0.96, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "The reference shows a continuous timber deck reinforced by separate transverse copper-banded rails.", "geometryDescriptor": {"topologyIntent": "bevelled deck and frame rails", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.035, "segments": 2}, "uvStrategy": "procedural wood grain", "normalStrategy": "geometry normals plus grain normal"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "vehicle-origin", "localStart": [0, 0, 0], "localEnd": [0, 0.65, 0], "contactType": "overlap", "overlap": 0.05, "gapTolerance": 0.01, "evidenceRefs": ["underside-view"]}, "dimensions": {"width": 3.7, "height": 0.42, "depth": 1.28, "units": "world", "confidence": 0.92}, "transform": {"position": [0, 0.75, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "timber", "materialLayers": ["timber", "copper"], "localFeatures": [{"id": "underframe-brackets", "description": "Transverse rail and runner-mount system"}, {"id": "deck-rails", "description": "Raised cargo side rails"}, {"id": "tow-point", "description": "Forward service/tow socket"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(55, 34, 27, 1.0)", "secondaryAlbedo": "rgba(111, 56, 37, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.95}, "evidenceRefs": ["primary-crop", "underside-view"]};
  node_chassis_1.add(mesh_chassis_1);
  meshes["chassis"] = mesh_chassis_1;
  colliders["chassis"] = {};

  const attachment_running_gear_2 = {"parentId": "root", "parentSocket": "underframe", "localStart": [0, 0, 0], "localEnd": [0, 0.52, 0], "contactType": "socket", "embedDepth": 0.06, "gapTolerance": 0.01, "evidenceRefs": ["underside-view"]};
  const endpoint_running_gear_2 = makeAttachmentEndpoint(attachment_running_gear_2);
  const node_running_gear_2 = new THREE.Group();
  node_running_gear_2.name = "Wheel and ski running gear__pivot";
  node_running_gear_2.scale.set(1, 1, 1);
  if (endpoint_running_gear_2) {
    node_running_gear_2.position.copy(endpoint_running_gear_2.start);
    node_running_gear_2.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_running_gear_2.position.set(0.0, 0.35, 0.0);
    node_running_gear_2.rotation.set(0.0, 0.0, 0.0);
  }
  node_running_gear_2.userData.sculptComponent = {"id": "running-gear", "name": "Wheel and ski running gear", "level": "macro", "role": "paired running gear assembly", "importance": 1, "confidence": 0.93, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Four discrete wheels, paired axles, suspension struts and two long runners form one coupled motion unit.", "geometryDescriptor": {"topologyIntent": "separate wheel pivots and runner solids", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.025, "segments": 2}, "uvStrategy": "procedural", "normalStrategy": "geometry normals"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "underframe", "localStart": [0, 0, 0], "localEnd": [0, 0.52, 0], "contactType": "socket", "embedDepth": 0.06, "gapTolerance": 0.01, "evidenceRefs": ["underside-view"]}, "dimensions": {"width": 4.55, "height": 1.08, "depth": 1.48, "units": "world", "confidence": 0.9}, "transform": {"position": [0, 0.35, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "timber", "materialLayers": ["timber", "copper"], "localFeatures": [{"id": "rim-bands", "description": "Copper-banded wheel rims"}, {"id": "spokes", "description": "Eight timber spokes per wheel"}, {"id": "hub-rivets", "description": "Radial fastener system"}, {"id": "upturned-tips", "description": "Raised copper-capped ski noses"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(45, 30, 25, 1.0)", "secondaryAlbedo": "rgba(149, 76, 43, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.93}, "evidenceRefs": ["primary-crop", "full-turnaround", "underside-view"]};
  node_running_gear_2.userData.actionProfile = {};
  (nodes["root"] ?? root).add(node_running_gear_2);
  nodes["running-gear"] = node_running_gear_2;
  const mesh_running_gear_2Geometry = endpoint_running_gear_2
    ? new THREE.CylinderGeometry(endpoint_running_gear_2.endRadius, endpoint_running_gear_2.baseRadius, endpoint_running_gear_2.length, 16, 6)
    : new THREE.BoxGeometry(1, 1, 1, 4, 4, 4);
  if (!endpoint_running_gear_2) {
    mesh_running_gear_2Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_running_gear_2 = new THREE.Mesh(
    mesh_running_gear_2Geometry,
    materialMap["timber"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_running_gear_2.name = "Wheel and ski running gear";
  if (endpoint_running_gear_2) {
    mesh_running_gear_2.position.copy(endpoint_running_gear_2.midpoint);
    mesh_running_gear_2.quaternion.copy(endpoint_running_gear_2.quaternion);
  }
  mesh_running_gear_2.castShadow = options.castShadow ?? true;
  mesh_running_gear_2.receiveShadow = options.receiveShadow ?? true;
  mesh_running_gear_2.userData.sculptComponent = {"id": "running-gear", "name": "Wheel and ski running gear", "level": "macro", "role": "paired running gear assembly", "importance": 1, "confidence": 0.93, "primitive": "box", "topologyClass": "assembled-solid", "topologyRationale": "Four discrete wheels, paired axles, suspension struts and two long runners form one coupled motion unit.", "geometryDescriptor": {"topologyIntent": "separate wheel pivots and runner solids", "edgeTreatment": {"type": "bevel", "bevelRadius": 0.025, "segments": 2}, "uvStrategy": "procedural", "normalStrategy": "geometry normals"}, "parent": "root", "attachment": {"parentId": "root", "parentSocket": "underframe", "localStart": [0, 0, 0], "localEnd": [0, 0.52, 0], "contactType": "socket", "embedDepth": 0.06, "gapTolerance": 0.01, "evidenceRefs": ["underside-view"]}, "dimensions": {"width": 4.55, "height": 1.08, "depth": 1.48, "units": "world", "confidence": 0.9}, "transform": {"position": [0, 0.35, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "timber", "materialLayers": ["timber", "copper"], "localFeatures": [{"id": "rim-bands", "description": "Copper-banded wheel rims"}, {"id": "spokes", "description": "Eight timber spokes per wheel"}, {"id": "hub-rivets", "description": "Radial fastener system"}, {"id": "upturned-tips", "description": "Raised copper-capped ski noses"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(45, 30, 25, 1.0)", "secondaryAlbedo": "rgba(149, 76, 43, 1.0)", "materialClass": "wood", "materialClassConfidence": 0.93}, "evidenceRefs": ["primary-crop", "full-turnaround", "underside-view"]};
  node_running_gear_2.add(mesh_running_gear_2);
  meshes["running-gear"] = mesh_running_gear_2;
  colliders["running-gear"] = {};

  const attachment_sail_rig_3 = {"parentId": "chassis", "parentSocket": "mast-step", "localStart": [-1.05, 0, 0], "localEnd": [-1.05, 2.82, 0], "contactType": "socket", "embedDepth": 0.08, "gapTolerance": 0.01, "evidenceRefs": ["primary-crop"]};
  const endpoint_sail_rig_3 = makeAttachmentEndpoint(attachment_sail_rig_3);
  const node_sail_rig_3 = new THREE.Group();
  node_sail_rig_3.name = "Mast boom and sail__pivot";
  node_sail_rig_3.scale.set(1, 1, 1);
  if (endpoint_sail_rig_3) {
    node_sail_rig_3.position.copy(endpoint_sail_rig_3.start);
    node_sail_rig_3.rotation.set(0.0, 0.0, 0.0);
  } else {
    node_sail_rig_3.position.set(-0.9, 0.86, 0.0);
    node_sail_rig_3.rotation.set(0.0, 0.0, 0.0);
  }
  node_sail_rig_3.userData.sculptComponent = {"id": "sail-rig", "name": "Mast boom and sail", "level": "meso", "role": "sail assembly", "importance": 1, "confidence": 0.91, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "The visible sail has a narrow but nonzero double-sided cloth thickness held between solid timber and copper spars.", "geometryDescriptor": {"topologyIntent": "double-sided triangular cloth solid with separate spars", "edgeTreatment": {"type": "rounded", "bevelRadius": 0.012, "segments": 2}, "deformationStack": ["bounded wind bow"], "uvStrategy": "planar cloth weave", "normalStrategy": "geometry normals plus cloth normal"}, "parent": "chassis", "attachment": {"parentId": "chassis", "parentSocket": "mast-step", "localStart": [-1.05, 0, 0], "localEnd": [-1.05, 2.82, 0], "contactType": "socket", "embedDepth": 0.08, "gapTolerance": 0.01, "evidenceRefs": ["primary-crop"]}, "dimensions": {"width": 2.45, "height": 2.82, "depth": 0.08, "units": "world", "confidence": 0.88}, "transform": {"position": [-0.9, 0.86, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "cloth", "materialLayers": ["cloth", "timber", "copper"], "localFeatures": [{"id": "copper-perimeter", "description": "Copper-edged triangular silhouette"}, {"id": "mast-bands", "description": "Repeated collars on the mast"}, {"id": "sail-bow", "description": "Subtle animated wind camber"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(224, 213, 185, 1.0)", "secondaryAlbedo": "rgba(164, 118, 78, 1.0)", "materialClass": "fabric", "materialClassConfidence": 0.93}, "evidenceRefs": ["primary-crop", "full-turnaround"]};
  node_sail_rig_3.userData.actionProfile = {};
  (nodes["chassis"] ?? root).add(node_sail_rig_3);
  nodes["sail-rig"] = node_sail_rig_3;
  const mesh_sail_rig_3Geometry = endpoint_sail_rig_3
    ? new THREE.CylinderGeometry(endpoint_sail_rig_3.endRadius, endpoint_sail_rig_3.baseRadius, endpoint_sail_rig_3.length, 16, 6)
    : buildExtrudeGeometry({"points": [[-0.3, -0.3], [0.3, -0.3], [0.3, 0.3], [-0.3, 0.3]], "depth": 0.1});
  if (!endpoint_sail_rig_3) {
    mesh_sail_rig_3Geometry.scale(1.0, 1.0, 1.0);
  }
  const mesh_sail_rig_3 = new THREE.Mesh(
    mesh_sail_rig_3Geometry,
    materialMap["cloth"] ?? new THREE.MeshStandardMaterial({ color: 0x888888 })
  );
  mesh_sail_rig_3.name = "Mast boom and sail";
  if (endpoint_sail_rig_3) {
    mesh_sail_rig_3.position.copy(endpoint_sail_rig_3.midpoint);
    mesh_sail_rig_3.quaternion.copy(endpoint_sail_rig_3.quaternion);
  }
  mesh_sail_rig_3.castShadow = options.castShadow ?? true;
  mesh_sail_rig_3.receiveShadow = options.receiveShadow ?? true;
  mesh_sail_rig_3.userData.sculptComponent = {"id": "sail-rig", "name": "Mast boom and sail", "level": "meso", "role": "sail assembly", "importance": 1, "confidence": 0.91, "primitive": "extrude", "topologyClass": "assembled-solid", "topologyRationale": "The visible sail has a narrow but nonzero double-sided cloth thickness held between solid timber and copper spars.", "geometryDescriptor": {"topologyIntent": "double-sided triangular cloth solid with separate spars", "edgeTreatment": {"type": "rounded", "bevelRadius": 0.012, "segments": 2}, "deformationStack": ["bounded wind bow"], "uvStrategy": "planar cloth weave", "normalStrategy": "geometry normals plus cloth normal"}, "parent": "chassis", "attachment": {"parentId": "chassis", "parentSocket": "mast-step", "localStart": [-1.05, 0, 0], "localEnd": [-1.05, 2.82, 0], "contactType": "socket", "embedDepth": 0.08, "gapTolerance": 0.01, "evidenceRefs": ["primary-crop"]}, "dimensions": {"width": 2.45, "height": 2.82, "depth": 0.08, "units": "world", "confidence": 0.88}, "transform": {"position": [-0.9, 0.86, 0], "rotation": [0, 0, 0], "scale": [1, 1, 1]}, "material": "cloth", "materialLayers": ["cloth", "timber", "copper"], "localFeatures": [{"id": "copper-perimeter", "description": "Copper-edged triangular silhouette"}, {"id": "mast-bands", "description": "Repeated collars on the mast"}, {"id": "sail-bow", "description": "Subtle animated wind camber"}], "colorMaterialRecipe": {"dominantAlbedo": "rgba(224, 213, 185, 1.0)", "secondaryAlbedo": "rgba(164, 118, 78, 1.0)", "materialClass": "fabric", "materialClassConfidence": 0.93}, "evidenceRefs": ["primary-crop", "full-turnaround"]};
  node_sail_rig_3.add(mesh_sail_rig_3);
  meshes["sail-rig"] = mesh_sail_rig_3;
  colliders["sail-rig"] = {};

  root.userData.sculptRuntime = { nodes, meshes, sockets, colliders, destructionGroups } satisfies ProceduralModelRuntime;
  root.userData.lookDevTargets = {"qualityPriority": "runtime-stylized", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "referencePbrExtraction": {"requiredWhenSourceImagePresent": false, "acceptedLimitation": "The reference is a secondary concept study; production reuses the live Frostmoon material response rather than baking studio pixels."}}, "lightingPass": {"requiredTerms": ["key light", "hemisphere fill", "moon rim", "exposure", "tone mapping", "contact shadow"]}, "screenshotReview": ["Compare silhouette first.", "Review least flattering rear and underside surveys.", "Verify day, blizzard and night material separation."]};
  root.userData.actionReadiness = {
    note: 'Use root.userData.sculptRuntime.nodes for transforms, sockets for attachments, colliders for physics proxies, and destructionGroups for breakable sets.',
  };
  return root;
}

export function createFrostmoonWindSailSeafoodFreightCartLookDevLights(
  mode: 'neutral' | 'grazing' | 'reference' = 'neutral',
): THREE.Group {
  const lights = new THREE.Group();
  lights.name = "Frostmoon Wind-Sail Seafood Freight Cart look-dev lights";
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
  lights.userData.lightingFromPhoto = ["Upper-left key light, ACES filmic tone mapping and exposure matched to the existing Frostmoon world.", "Cool hemisphere fill and ordinary moon rim preserve runner and sail thickness at night.", "Soft contact shadows and ambient occlusion ground both runners and all four wheels without hiding the underframe."];
  lights.userData.lookDevTargets = {"qualityPriority": "runtime-stylized", "materialPass": {"albedoPaletteRequired": true, "roughnessVariationRequired": true, "normalOrBumpRequired": true, "localOverridesRequired": true, "independentMapChannels": ["albedo", "roughness", "height", "normal", "ambient-occlusion"], "referencePbrExtraction": {"requiredWhenSourceImagePresent": false, "acceptedLimitation": "The reference is a secondary concept study; production reuses the live Frostmoon material response rather than baking studio pixels."}}, "lightingPass": {"requiredTerms": ["key light", "hemisphere fill", "moon rim", "exposure", "tone mapping", "contact shadow"]}, "screenshotReview": ["Compare silhouette first.", "Review least flattering rear and underside surveys.", "Verify day, blizzard and night material separation."]};
  return lights;
}

// PBR materials (clearcoat/iridescence/transmission/anisotropy) need an environment
// map to visually behave as intended — call this once per renderer and assign the
// result to scene.environment before rendering. No external HDR asset required.
export function createFrostmoonWindSailSeafoodFreightCartEnvironment(renderer: THREE.WebGLRenderer): THREE.Texture {
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
export function frameFrostmoonWindSailSeafoodFreightCartCamera(
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
export function createFrostmoonWindSailSeafoodFreightCartPresentationComposer(
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

export function configureFrostmoonWindSailSeafoodFreightCartRenderer(renderer: THREE.WebGLRenderer): void {
  // Load-bearing for view-dependent finishes (anodized / Doppler): without ACES + sRGB
  // the environment reflection reads flat/washed instead of a believable metal response.
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
}

export function createFrostmoonWindSailSeafoodFreightCartInspectControls(
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
